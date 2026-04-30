"""
Export FootMeasurementNet als ONNX-Modell für Production-Deployment.

Verwendung:
  python export.py                              # Exportiert checkpoints/best_model.pt
  python export.py --checkpoint checkpoints/final_model.pt
  python export.py --validate                  # Vergleicht PyTorch vs ONNX Output

Output:
  checkpoints/foot_model.onnx   — ONNX-Modell (für onnxruntime-node im Backend)
  checkpoints/foot_model.json   — Label-Stats (mean/std) für Denormalisierung

Im Backend (Node.js) einbinden:
  npm install onnxruntime-node
  Dann: const model = await ort.InferenceSession.create('foot_model.onnx')
"""

import argparse
import json
from pathlib import Path

import torch
import numpy as np

from model import FootMeasurementNet

try:
    import onnx
    import onnxruntime as ort
    HAS_ONNX = True
except ImportError:
    HAS_ONNX = False
    print('[WARNING] onnx/onnxruntime nicht installiert. Bitte: pip install onnx onnxruntime')


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument('--checkpoint', default='checkpoints/best_model.pt')
    p.add_argument('--out_dir',    default='checkpoints')
    p.add_argument('--img_size',   type=int, default=224)
    p.add_argument('--validate',   action='store_true', help='PyTorch vs ONNX vergleichen')
    p.add_argument('--opset',      type=int, default=17)
    return p.parse_args()


def load_model(checkpoint_path: str) -> tuple[FootMeasurementNet, dict]:
    ckpt = torch.load(checkpoint_path, map_location='cpu', weights_only=False)
    model = FootMeasurementNet(pretrained=False)

    if 'label_mean' in ckpt:
        model.set_label_stats(ckpt['label_mean'], ckpt['label_std'])

    model.load_state_dict(ckpt.get('model_state', ckpt))
    model.eval()
    return model, ckpt


def export_onnx(model, img_size: int, out_path: str, opset: int = 17):
    """Exportiert Modell nach ONNX."""
    B = 1
    dummy_inputs = tuple(torch.randn(B, 3, img_size, img_size) for _ in range(4))
    input_names  = ['right_top', 'right_side', 'left_top', 'left_side']
    output_names = ['measurements']
    dynamic_axes = {n: {0: 'batch'} for n in input_names}
    dynamic_axes['measurements'] = {0: 'batch'}

    torch.onnx.export(
        model,
        dummy_inputs,
        out_path,
        input_names=input_names,
        output_names=output_names,
        dynamic_axes=dynamic_axes,
        opset_version=opset,
        export_params=True,
        do_constant_folding=True,
        verbose=False,
        dynamo=False,   # Legacy-Exporter: stabiler für onnxruntime-Kompatibilität
    )
    print(f'✓ ONNX exportiert: {out_path}')


def validate_onnx(model, onnx_path: str, img_size: int):
    """Vergleicht PyTorch- und ONNX-Ausgaben."""
    if not HAS_ONNX:
        print('[SKIP] onnxruntime nicht installiert')
        return

    session = ort.InferenceSession(onnx_path, providers=['CPUExecutionProvider'])
    dummy   = [torch.randn(1, 3, img_size, img_size) for _ in range(4)]

    # PyTorch
    with torch.no_grad():
        pt_out = model(*dummy).numpy()

    # ONNX
    ort_inputs = {
        'right_top':  dummy[0].numpy(),
        'right_side': dummy[1].numpy(),
        'left_top':   dummy[2].numpy(),
        'left_side':  dummy[3].numpy(),
    }
    onnx_out = session.run(None, ort_inputs)[0]

    max_diff = np.abs(pt_out - onnx_out).max()
    print(f'  Max. Abweichung PyTorch vs ONNX: {max_diff:.6f} mm')
    if max_diff < 0.01:
        print('  ✓ ONNX-Export korrekt (< 0.01mm Abweichung)')
    else:
        print(f'  ⚠️  Größere Abweichung ({max_diff:.4f}mm) — prüfe Export')


def export_metadata(ckpt: dict, out_path: str):
    """Exportiert Label-Stats als JSON (für Node.js-Integration)."""
    meta = {
        'label_names': ['right_length', 'right_width', 'right_arch_height',
                        'left_length',  'left_width',  'left_arch_height'],
        'label_units': 'mm',
        'label_mean':  ckpt.get('label_mean', torch.zeros(6)).tolist(),
        'label_std':   ckpt.get('label_std',  torch.ones(6)).tolist(),
        'img_size':    224,
        'val_mae_mm':  ckpt.get('val_mae', None),
        'epoch':       ckpt.get('epoch', None),
    }
    with open(out_path, 'w') as f:
        json.dump(meta, f, indent=2)
    print(f'✓ Metadaten exportiert: {out_path}')


def main():
    args = parse_args()
    out_dir = Path(args.out_dir)
    out_dir.mkdir(exist_ok=True)

    ckpt_path = Path(args.checkpoint)
    if not ckpt_path.exists():
        print(f'✗ Checkpoint nicht gefunden: {ckpt_path}')
        print('  Zuerst trainieren: python train.py')
        return

    print(f'Lade Checkpoint: {ckpt_path}')
    model, ckpt = load_model(str(ckpt_path))

    # ONNX Export
    if HAS_ONNX:
        onnx_path = str(out_dir / 'foot_model.onnx')
        export_onnx(model, args.img_size, onnx_path, args.opset)

        if args.validate:
            print('Validiere ONNX-Export…')
            validate_onnx(model, onnx_path, args.img_size)
    else:
        print('[SKIP] ONNX-Export: onnx-Paket fehlt (pip install onnx onnxruntime)')

    # Metadata JSON
    meta_path = str(out_dir / 'foot_model.json')
    export_metadata(ckpt, meta_path)

    print('\n── Node.js Integration ─────────────────────────────────────')
    print('npm install onnxruntime-node sharp')
    print('')
    print('// In scans.js (ersetze Claude-API-Call):')
    print("// const ort = require('onnxruntime-node')")
    print("// const session = await ort.InferenceSession.create('foot_model.onnx')")
    print("// const output  = await session.run({ right_top: tensor, ... })")


if __name__ == '__main__':
    main()

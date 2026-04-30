"""
FootPhotoNet — A4-kalibriertes Fußvermessungs-Modell für 2D-Fotos.

Architektur:
  A4-Erkennung (CV) → normalisierter Fußausschnitt (px/mm bekannt)
  4 × EfficientNet-B0 Encoder → Feature-Fusion
  Scalar-Embedding (px_per_mm) → zusammengeführt mit Features
  → 18 Maße (9 je Fuß)

Outputs (18 Maße = 9 je Fuß × 2):
  length, width, foot_height, ball_girth, waist_girth,
  instep_girth, heel_girth, ankle_girth, arch_height

Genauigkeitsziele nach Training auf synthetischen + echten Daten:
  length/width:  ±0.5–1.0 mm  (A4-kalibriert, direkt messbar)
  girths:        ±1.5–3.0 mm  (3D aus 2D geschätzt)
  arch_height:   ±1.0–2.0 mm
"""

import torch
import torch.nn as nn
import numpy as np

try:
    import timm
    HAS_TIMM = True
except ImportError:
    HAS_TIMM = False
    print('[WARNING] timm nicht installiert: pip install timm')


# ── Measurement-Layout ─────────────────────────────────────────────────────────
MEAS_NAMES = [
    'right_length', 'right_width', 'right_foot_height',
    'right_ball_girth', 'right_waist_girth', 'right_instep_girth',
    'right_heel_girth', 'right_ankle_girth', 'right_arch_height',
    'left_length',  'left_width',  'left_foot_height',
    'left_ball_girth',  'left_waist_girth',  'left_instep_girth',
    'left_heel_girth',  'left_ankle_girth',  'left_arch_height',
]
N_MEASUREMENTS = len(MEAS_NAMES)  # 18

# Normalisierungswerte (aus girths.csv + measurements.csv)
LABEL_MEAN = torch.tensor([
    271.7,  91.6, 74.8, 175.1, 168.2, 149.3, 109.5, 103.4, 14.0,   # right
    271.7,  91.6, 74.8, 175.1, 168.2, 149.3, 109.5, 103.4, 14.0,   # left
], dtype=torch.float32)

LABEL_STD = torch.tensor([
    22.9, 8.2, 7.8, 13.9, 13.9, 11.2, 9.7, 7.3, 5.0,   # right
    22.9, 8.2, 7.8, 13.9, 13.9, 11.2, 9.7, 7.3, 5.0,   # left
], dtype=torch.float32)

IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD  = [0.229, 0.224, 0.225]


# ── Encoder ───────────────────────────────────────────────────────────────────

class _Encoder(nn.Module):
    """EfficientNet-B0 ohne Klassifikations-Head, output_dim=1280."""

    def __init__(self, pretrained: bool = True, drop_rate: float = 0.2):
        super().__init__()
        if not HAS_TIMM:
            raise ImportError('pip install timm')
        self.net = timm.create_model(
            'efficientnet_b0',
            pretrained=pretrained,
            num_classes=0,
            global_pool='avg',
            drop_rate=drop_rate,
        )
        self.out_dim = self.net.num_features  # 1280

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)  # (B, 1280)


# ── Haupt-Modell ──────────────────────────────────────────────────────────────

class FootPhotoNet(nn.Module):
    """
    Inputs:
      right_top, right_side, left_top, left_side  — (B, 3, 224, 224)
      px_per_mm                                    — (B, 1) optional, 0 wenn unbekannt

    Output:
      measurements — (B, 18) normalisierte Werte (denormalisiert mit label_stats)
    """

    def __init__(self, pretrained: bool = True, drop_rate: float = 0.3):
        super().__init__()

        # 4 geteilte Encoder (gleiche Gewichte für top/side sind suboptimal,
        # separate Encoder lernen view-spezifische Features)
        self.enc_right_top  = _Encoder(pretrained, drop_rate=0.2)
        self.enc_right_side = _Encoder(pretrained, drop_rate=0.2)
        self.enc_left_top   = _Encoder(pretrained, drop_rate=0.2)
        self.enc_left_side  = _Encoder(pretrained, drop_rate=0.2)

        feat_dim = self.enc_right_top.out_dim  # 1280
        fused_dim = feat_dim * 4 + 16          # 4×1280 + 16 (px_per_mm embedding)

        # px_per_mm embedding (robust gegen fehlende A4-Erkennung)
        self.scale_embed = nn.Sequential(
            nn.Linear(1, 16),
            nn.SiLU(),
        )

        # Regression Head
        self.head = nn.Sequential(
            nn.LayerNorm(fused_dim),
            nn.Linear(fused_dim, 512),
            nn.SiLU(),
            nn.Dropout(drop_rate),
            nn.Linear(512, 256),
            nn.SiLU(),
            nn.Dropout(drop_rate * 0.5),
            nn.Linear(256, N_MEASUREMENTS),
        )

        # Label-Statistiken (für De-Normalisierung bei Inference)
        self.register_buffer('label_mean', LABEL_MEAN.clone())
        self.register_buffer('label_std',  LABEL_STD.clone())

    def forward(
        self,
        right_top:  torch.Tensor,
        right_side: torch.Tensor,
        left_top:   torch.Tensor,
        left_side:  torch.Tensor,
        px_per_mm:  torch.Tensor | None = None,
    ) -> torch.Tensor:
        """Gibt normalisierte Messungen zurück (B, 18)."""
        f_rt = self.enc_right_top(right_top)
        f_rs = self.enc_right_side(right_side)
        f_lt = self.enc_left_top(left_top)
        f_ls = self.enc_left_side(left_side)

        if px_per_mm is None:
            px_per_mm = torch.zeros(right_top.shape[0], 1, device=right_top.device)
        scale_feat = self.scale_embed(px_per_mm)

        fused = torch.cat([f_rt, f_rs, f_lt, f_ls, scale_feat], dim=1)
        return self.head(fused)

    @torch.no_grad()
    def predict_mm(
        self,
        right_top:  torch.Tensor,
        right_side: torch.Tensor,
        left_top:   torch.Tensor,
        left_side:  torch.Tensor,
        px_per_mm:  float = 0.0,
    ) -> dict[str, float]:
        """Inference-Hilfsmethode: gibt Messungen in mm zurück."""
        self.eval()
        dev = next(self.parameters()).device
        ppm = torch.tensor([[px_per_mm]], dtype=torch.float32, device=dev)

        out_norm = self(right_top.to(dev), right_side.to(dev),
                        left_top.to(dev), left_side.to(dev), ppm)
        out_mm = out_norm * self.label_std.to(dev) + self.label_mean.to(dev)
        vals = out_mm[0].cpu().tolist()
        return {name: round(val, 1) for name, val in zip(MEAS_NAMES, vals)}

    def set_label_stats(self, mean: torch.Tensor, std: torch.Tensor):
        self.label_mean.copy_(mean)
        self.label_std.copy_(std)


# ── ONNX Export Hilfsfunktion ─────────────────────────────────────────────────

def export_onnx(model: FootPhotoNet, out_path: str, img_size: int = 224, opset: int = 17):
    """Exportiert Modell als ONNX (ohne px_per_mm für maximale Kompatibilität)."""
    import onnx
    import onnxruntime as ort

    model.eval()
    B = 1
    dummy = torch.zeros(B, 3, img_size, img_size)
    dummy_ppm = torch.zeros(B, 1)

    torch.onnx.export(
        model,
        (dummy, dummy, dummy, dummy, dummy_ppm),
        out_path,
        input_names=['right_top', 'right_side', 'left_top', 'left_side', 'px_per_mm'],
        output_names=['measurements_norm'],
        dynamic_axes={
            'right_top':  {0: 'batch'},
            'right_side': {0: 'batch'},
            'left_top':   {0: 'batch'},
            'left_side':  {0: 'batch'},
            'px_per_mm':  {0: 'batch'},
        },
        opset_version=opset,
        do_constant_folding=True,
    )

    # Validierung
    sess = ort.InferenceSession(out_path, providers=['CPUExecutionProvider'])
    arr = np.zeros((1, 3, img_size, img_size), dtype=np.float32)
    ppm_arr = np.zeros((1, 1), dtype=np.float32)
    out = sess.run(None, {
        'right_top': arr, 'right_side': arr,
        'left_top': arr, 'left_side': arr,
        'px_per_mm': ppm_arr,
    })
    assert out[0].shape == (1, N_MEASUREMENTS), f'Shape mismatch: {out[0].shape}'
    print(f'✓ ONNX exportiert + validiert: {out_path}')
    return out_path


if __name__ == '__main__':
    print(f'FootPhotoNet — {N_MEASUREMENTS} Outputs: {MEAS_NAMES}')
    net = FootPhotoNet(pretrained=False)
    total_params = sum(p.numel() for p in net.parameters())
    print(f'Parameter: {total_params:,} (~{total_params/1e6:.1f}M)')
    dummy = torch.zeros(2, 3, 224, 224)
    out = net(dummy, dummy, dummy, dummy)
    print(f'Output shape: {out.shape}')

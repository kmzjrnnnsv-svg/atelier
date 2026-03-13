"""
train_photo.py — Trainiert FootPhotoNet auf synthetischen + echten Fußfotos.

Verwendung:
  python3 train_photo.py                          # Standard (50 Epochen)
  python3 train_photo.py --epochs 100 --batch 8
  python3 train_photo.py --real_weight 3.0        # echte Scans 3× stärker gewichten
  python3 train_photo.py --resume checkpoints/photo_best.pt

Outputs:
  checkpoints/photo_best.pt    — bestes Modell (Val-MAE)
  checkpoints/photo_final.pt
  checkpoints/photo_model.onnx — ONNX für Backend-Deployment
  checkpoints/photo_model.json — Label-Stats für Denormalisierung

Strategie für maximale Genauigkeit:
  1. Freeze Encoder 10 Epochen → Head lernt
  2. Unfreeze → Fine-tune alles mit kleinerem LR
  3. Real-scan fine-tuning sobald echte Daten vorhanden
"""

import argparse
import csv
import json
import os
import sys
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Dataset, WeightedRandomSampler
from torchvision import transforms
from PIL import Image

ML_DIR = Path(__file__).parent
sys.path.insert(0, str(ML_DIR))

from model_photo import FootPhotoNet, MEAS_NAMES, N_MEASUREMENTS, LABEL_MEAN, LABEL_STD, export_onnx

DATA_DIR = ML_DIR / 'data'

# ── Konfiguration ─────────────────────────────────────────────────────────────

def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument('--index',       default=str(DATA_DIR / 'dataset' / 'index_v2.csv'))
    p.add_argument('--real_index',  default=str(DATA_DIR / 'real' / 'index.csv'),
                   help='CSV mit echten Scans (optional)')
    p.add_argument('--real_weight', type=float, default=5.0,
                   help='Gewichtungsfaktor für echte Scans beim Sampling')
    p.add_argument('--epochs',      type=int, default=60)
    p.add_argument('--batch',       type=int, default=16)
    p.add_argument('--lr',          type=float, default=3e-4)
    p.add_argument('--img_size',    type=int, default=224)
    p.add_argument('--freeze_epochs', type=int, default=10,
                   help='Encoder einfrieren für erste N Epochen')
    p.add_argument('--resume',      default='', help='Checkpoint fortsetzen')
    p.add_argument('--out_dir',     default=str(ML_DIR / 'checkpoints'))
    p.add_argument('--workers',     type=int, default=4)
    return p.parse_args()


# ── Dataset ───────────────────────────────────────────────────────────────────

LABEL_COLS = [
    'right_length', 'right_width', 'right_foot_height',
    'right_ball_girth', 'right_waist_girth', 'right_instep_girth',
    'right_heel_girth', 'right_ankle_girth', 'right_arch',
    'left_length',  'left_width',  'left_foot_height',
    'left_ball_girth',  'left_waist_girth',  'left_instep_girth',
    'left_heel_girth',  'left_ankle_girth',  'left_arch',
]

# Mapping index_v2.csv column names → LABEL_COLS
COL_MAP = {
    'right_arch_height': 'right_arch',
    'left_arch_height':  'left_arch',
}


def get_transforms(split: str, img_size: int = 224):
    if split == 'train':
        return transforms.Compose([
            transforms.Resize((img_size + 32, img_size + 32)),
            transforms.RandomCrop(img_size),
            transforms.RandomHorizontalFlip(p=0.2),
            transforms.ColorJitter(brightness=0.35, contrast=0.30, saturation=0.25, hue=0.05),
            transforms.RandomGrayscale(p=0.05),
            transforms.RandomApply([transforms.GaussianBlur(3, sigma=(0.1, 1.5))], p=0.2),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ])
    return transforms.Compose([
        transforms.Resize((img_size, img_size)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])


def _load_img(path: str, tfm) -> torch.Tensor:
    img = Image.open(path).convert('RGB')
    return tfm(img)


class FootPhotoDataset(Dataset):
    """Lädt synthetische + echte Fußfotos aus index_v2.csv."""

    def __init__(self, records: list[dict], split: str, img_size: int = 224):
        self.records = records
        self.tfm = get_transforms(split, img_size)
        self.label_mean = LABEL_MEAN
        self.label_std  = LABEL_STD

    def __len__(self):
        return len(self.records)

    def __getitem__(self, idx: int):
        r = self.records[idx]
        imgs = {}
        for view in ('right_top', 'right_side', 'left_top', 'left_side'):
            imgs[view] = _load_img(r[view], self.tfm)

        # px_per_mm (0 wenn nicht verfügbar)
        ppm = float(r.get('px_per_mm', 0) or 0)

        # Labels: 18 Maße normalisiert
        labels = []
        for col in LABEL_COLS:
            val = float(r.get(col, 0) or r.get(COL_MAP.get(col, col), 0) or 0)
            labels.append(val)
        labels_t = torch.tensor(labels, dtype=torch.float32)
        labels_norm = (labels_t - self.label_mean) / self.label_std

        return (
            imgs['right_top'], imgs['right_side'],
            imgs['left_top'], imgs['left_side'],
            torch.tensor([[ppm]], dtype=torch.float32),
            labels_norm,
            torch.tensor(1.0 if r.get('source') == 'real' else 0.5, dtype=torch.float32),
        )


def load_records(index_path: str, split_filter: str | None = None) -> list[dict]:
    import pandas as pd
    if not Path(index_path).exists():
        return []
    df = pd.read_csv(index_path)
    if split_filter and 'split' in df.columns:
        df = df[df['split'] == split_filter]
    return df.to_dict('records')


# ── Training Loop ─────────────────────────────────────────────────────────────

def run_epoch(model, loader, optimizer, device, is_train: bool):
    model.train(is_train)
    total_loss = 0.0
    total_mae_mm = 0.0
    n = 0

    criterion = nn.SmoothL1Loss(beta=0.5)
    label_std = model.label_std.to(device)

    with torch.set_grad_enabled(is_train):
        for batch in loader:
            rt, rs, lt, ls, ppm, labels_norm, weights = [x.to(device) for x in batch]
            ppm = ppm.squeeze(1)  # (B, 1)

            pred_norm = model(rt, rs, lt, ls, ppm)
            loss = (criterion(pred_norm, labels_norm) * weights.mean()).mean()

            if is_train:
                optimizer.zero_grad()
                loss.backward()
                nn.utils.clip_grad_norm_(model.parameters(), 1.0)
                optimizer.step()

            # MAE in mm (denormalisiert)
            pred_mm = pred_norm.detach() * label_std + model.label_mean.to(device)
            gt_mm   = labels_norm.detach() * label_std + model.label_mean.to(device)
            mae_mm  = (pred_mm - gt_mm).abs().mean().item()

            total_loss   += loss.item() * len(rt)
            total_mae_mm += mae_mm      * len(rt)
            n += len(rt)

    return total_loss / n, total_mae_mm / n


def main():
    args = parse_args()
    out_dir = Path(args.out_dir)
    out_dir.mkdir(exist_ok=True)

    # ── Daten laden ──────────────────────────────────────────────────────────
    syn_train = load_records(args.index, 'train')
    syn_val   = load_records(args.index, 'val')
    real_all  = load_records(args.real_index)  # leer wenn kein real_index

    for r in real_all:
        r['source'] = 'real'

    # Real-Scans in Train/Val aufteilen (80/20)
    n_real_val = max(1, len(real_all) // 5) if real_all else 0
    real_val   = real_all[:n_real_val]
    real_train = real_all[n_real_val:]

    train_records = syn_train + real_train
    val_records   = syn_val   + real_val

    print(f'Daten: {len(train_records)} Train, {len(val_records)} Val '
          f'(davon real: {len(real_train)} / {len(real_val)})')

    if not train_records:
        sys.exit('[ERROR] Keine Trainingsdaten — index_v2.csv vorhanden?')

    train_ds = FootPhotoDataset(train_records, 'train',   args.img_size)
    val_ds   = FootPhotoDataset(val_records,   'val',     args.img_size)

    # Gewichtetes Sampling: echte Scans häufiger
    sample_weights = [
        args.real_weight if r.get('source') == 'real' else 1.0
        for r in train_records
    ]
    sampler = WeightedRandomSampler(sample_weights, num_samples=len(train_records), replacement=True)

    train_loader = DataLoader(train_ds, batch_size=args.batch, sampler=sampler,
                              num_workers=args.workers, pin_memory=True, drop_last=True)
    val_loader   = DataLoader(val_ds,   batch_size=args.batch, shuffle=False,
                              num_workers=args.workers, pin_memory=True)

    # ── Modell ───────────────────────────────────────────────────────────────
    device = torch.device('mps' if torch.backends.mps.is_available()
                          else 'cuda' if torch.cuda.is_available()
                          else 'cpu')
    print(f'Device: {device}')

    model = FootPhotoNet(pretrained=True).to(device)

    start_epoch = 0
    best_val_mae = float('inf')

    if args.resume and Path(args.resume).exists():
        ckpt = torch.load(args.resume, map_location=device, weights_only=False)
        model.load_state_dict(ckpt['model_state'])
        start_epoch = ckpt.get('epoch', 0)
        best_val_mae = ckpt.get('val_mae', float('inf'))
        print(f'Fortgesetzt von {args.resume} (Epoche {start_epoch}, Val-MAE {best_val_mae:.2f} mm)')

    # Encoder-Parameter für selektives Einfrieren
    encoder_params = list(model.enc_right_top.parameters()) + \
                     list(model.enc_right_side.parameters()) + \
                     list(model.enc_left_top.parameters()) + \
                     list(model.enc_left_side.parameters())
    head_params    = list(model.head.parameters()) + list(model.scale_embed.parameters())

    optimizer = torch.optim.AdamW([
        {'params': encoder_params, 'lr': args.lr * 0.1},
        {'params': head_params,    'lr': args.lr},
    ], weight_decay=1e-4)

    scheduler = torch.optim.lr_scheduler.OneCycleLR(
        optimizer,
        max_lr=[args.lr * 0.1, args.lr],
        steps_per_epoch=len(train_loader),
        epochs=args.epochs,
        pct_start=0.1,
    )

    log_path = out_dir / 'photo_training_log.csv'
    log_file = open(log_path, 'w', newline='')
    log_writer = csv.writer(log_file)
    log_writer.writerow(['epoch', 'phase', 'train_loss', 'val_loss', 'val_mae_mm', 'lr'])

    print(f'\n{"Epoche":>6}  {"Train-MAE":>9}  {"Val-MAE":>9}  {"LR":>10}')
    print('─' * 45)

    for epoch in range(start_epoch, args.epochs):
        # Encoder einfrieren/auftauen
        freeze = epoch < args.freeze_epochs
        for p in encoder_params:
            p.requires_grad_(not freeze)
        phase = 'head_only' if freeze else 'full'

        train_loss, train_mae = run_epoch(model, train_loader, optimizer, device, is_train=True)
        val_loss,   val_mae   = run_epoch(model, val_loader,   optimizer, device, is_train=False)

        scheduler.step()
        current_lr = optimizer.param_groups[1]['lr']

        print(f'{epoch+1:>6}  {train_mae:>8.2f}mm  {val_mae:>8.2f}mm  {current_lr:>10.2e}')
        log_writer.writerow([epoch+1, phase, f'{train_loss:.6f}', f'{val_loss:.6f}',
                             f'{val_mae:.4f}', f'{current_lr:.2e}'])
        log_file.flush()

        ckpt = {
            'epoch': epoch + 1,
            'model_state': model.state_dict(),
            'val_mae': val_mae,
            'label_mean': model.label_mean,
            'label_std':  model.label_std,
            'meas_names': MEAS_NAMES,
            'img_size': args.img_size,
        }

        if val_mae < best_val_mae:
            best_val_mae = val_mae
            torch.save(ckpt, out_dir / 'photo_best.pt')
            print(f'  ✓ Bestes Modell gespeichert (Val-MAE {val_mae:.2f} mm)')

    torch.save(ckpt, out_dir / 'photo_final.pt')
    log_file.close()

    print(f'\n✓ Training abgeschlossen. Bestes Val-MAE: {best_val_mae:.2f} mm')

    # ── ONNX Export ──────────────────────────────────────────────────────────
    best_ckpt = torch.load(out_dir / 'photo_best.pt', map_location='cpu', weights_only=False)
    export_model = FootPhotoNet(pretrained=False)
    export_model.load_state_dict(best_ckpt['model_state'])
    export_model.eval()

    onnx_path = str(out_dir / 'photo_model.onnx')
    export_onnx(export_model, onnx_path, img_size=args.img_size)

    json_path = out_dir / 'photo_model.json'
    with open(json_path, 'w') as f:
        json.dump({
            'label_names': MEAS_NAMES,
            'label_units': 'mm',
            'label_mean': model.label_mean.tolist(),
            'label_std':  model.label_std.tolist(),
            'img_size': args.img_size,
            'val_mae_mm': round(best_val_mae, 3),
        }, f, indent=2)

    print(f'✓ ONNX + JSON → {out_dir}')
    print('\nNächste Schritte:')
    print('  1. Echte Scans sammeln in data/real/')
    print('  2. python3 train_photo.py --resume checkpoints/photo_best.pt  (Fine-tuning)')
    print('  3. Backend aktualisieren: process_photos.py nutzt photo_model.onnx')


if __name__ == '__main__':
    main()

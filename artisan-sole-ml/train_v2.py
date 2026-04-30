"""
train_v2.py — Training für FootShapeNet mit PCA Shape Model.

Verwendung:
  python3 train_v2.py                           # Default: 50 Epochs
  python3 train_v2.py --epochs 60 --batch 8
  python3 train_v2.py --shape_model data/shape_model

Output:
  checkpoints/best_model_v2.pt   — Bestes Modell (nach Val-MAE)
  checkpoints/final_model_v2.pt  — Finales Modell
  checkpoints/training_log_v2.csv

Dual-Loss:
  L = λ₁·L1(pca_pred, pca_gt) + λ₂·L1(mm_pred, mm_gt)
  λ₁ = 1.0, λ₂ = 0.1
"""

import argparse
import csv
import time
from pathlib import Path

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from PIL import Image
from torch.utils.data import DataLoader, Dataset
import torchvision.transforms as T

from model_v2 import FootShapeNet, MEAS_NAMES, N_MEASUREMENTS

# ─── Config ──────────────────────────────────────────────────────────────────
ROOT       = Path(__file__).parent
DATA_DIR   = ROOT / 'data'
SHAPE_DIR  = DATA_DIR / 'shape_model'
CKPT_DIR   = ROOT / 'checkpoints'

PHASE1_EPOCHS = 20   # Encoder frozen
IMG_SIZE      = 224

# Dual-loss weights
LAMBDA_PCA = 1.0
LAMBDA_MM  = 0.1

device = (
    'mps'  if torch.backends.mps.is_available()  else
    'cuda' if torch.cuda.is_available()           else
    'cpu'
)


# ─── Dataset ─────────────────────────────────────────────────────────────────

class FootDatasetV2(Dataset):
    """
    Lädt Renderings + PCA-Labels + mm-Labels für FootShapeNet.

    Ordner-Struktur (wie von 03_render_views.py erzeugt):
      data/renders/<sample_id>/right_top.jpg
      data/renders/<sample_id>/right_side.jpg
      data/renders/<sample_id>/left_top.jpg
      data/renders/<sample_id>/left_side.jpg
      data/renders/<sample_id>/meta.json

    PCA-Labels: data/shape_model/pca_labels.csv
    Dataset-Split: data/dataset/index.csv
    """

    VIEWS = ['right_top', 'right_side', 'left_top', 'left_side']

    def __init__(self, split: str, img_size: int = IMG_SIZE, augment: bool = True):
        self.augment = augment and split == 'train'

        # Lade dataset index
        index_csv = DATA_DIR / 'dataset' / 'index.csv'
        if not index_csv.exists():
            index_csv = DATA_DIR / 'dataset 2' / 'index.csv'
        if not index_csv.exists():
            raise FileNotFoundError(f'index.csv nicht gefunden in {DATA_DIR}/dataset/')

        df = pd.read_csv(index_csv)
        df = df[df['split'] == split].reset_index(drop=True)

        # PCA Labels
        pca_csv = SHAPE_DIR / 'pca_labels.csv'
        if not pca_csv.exists():
            raise FileNotFoundError(f'pca_labels.csv nicht gefunden. Zuerst: python3 scripts/05_build_shape_model.py')

        pca_df = pd.read_csv(pca_csv)
        self.pca_cols = [c for c in pca_df.columns if c.startswith('pca_')]
        self.mm_cols  = ['length', 'ball_width', 'ball_girth', 'instep_girth',
                         'heel_girth', 'arch_height', 'waist_girth', 'ankle_girth']

        # Merge: dataset index uses 'foot_id' (base foot without aug suffix)
        if 'foot_id' not in df.columns and 'sample_id' in df.columns:
            df['foot_id'] = df['sample_id'].str.rsplit('_aug', n=1).str[0]

        # pca_labels hat foot_id wie 'foot_0042', dataset hat 'synthetic_0042' etc
        # Versuche direktes merge, dann fuzzy
        merged = df.merge(pca_df, on='foot_id', how='left')
        if merged[self.pca_cols[0]].isna().all() if self.pca_cols else True:
            # Versuche über sample_id Basisname
            pca_df_copy = pca_df.copy()
            # Falls pca foot_id kein Präfix hat, füge 'synthetic_' hinzu
            df['foot_id_try'] = df.get('foot_id', df['sample_id'])
            merged = df.merge(pca_df_copy.rename(columns={'foot_id': 'foot_id_try'}),
                              on='foot_id_try', how='left')

        self.df = merged
        self.render_dir = DATA_DIR / 'renders'

        # Transforms
        mean = [0.485, 0.456, 0.406]
        std  = [0.229, 0.224, 0.225]
        if self.augment:
            self.tf = T.Compose([
                T.RandomResizedCrop(img_size, scale=(0.85, 1.0)),
                T.RandomHorizontalFlip(p=0.3),
                T.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.1),
                T.ToTensor(),
                T.Normalize(mean, std),
            ])
        else:
            self.tf = T.Compose([
                T.Resize((img_size, img_size)),
                T.ToTensor(),
                T.Normalize(mean, std),
            ])

        print(f'[Dataset V2] {split}: {len(self.df)} Samples, {len(self.pca_cols)} PCA-Komponenten')

    def __len__(self):
        return len(self.df)

    def __getitem__(self, idx):
        row = self.df.iloc[idx]
        sample_id = row['sample_id']
        sample_dir = self.render_dir / sample_id

        imgs = []
        for view in self.VIEWS:
            img_path = sample_dir / f'{view}.jpg'
            if img_path.exists():
                img = Image.open(img_path).convert('RGB')
            else:
                img = Image.new('RGB', (IMG_SIZE, IMG_SIZE), color=(200, 200, 200))
            imgs.append(self.tf(img))

        # PCA labels
        if self.pca_cols and not pd.isna(row.get(self.pca_cols[0], float('nan'))):
            pca_gt = torch.tensor([row[c] for c in self.pca_cols], dtype=torch.float32)
        else:
            pca_gt = torch.zeros(len(self.pca_cols) if self.pca_cols else 32, dtype=torch.float32)

        # MM labels (8 values per foot — use same for both since synthetic data is symmetric)
        mm_vals = []
        for col in self.mm_cols:
            val = row.get(col, 0.0)
            if pd.isna(val):
                val = 0.0
            mm_vals.append(float(val))
        # Right + Left (symmetric for synthetic data)
        mm_gt = torch.tensor(mm_vals + mm_vals, dtype=torch.float32)  # (16,)

        return imgs[0], imgs[1], imgs[2], imgs[3], pca_gt, mm_gt


# ─── Training ─────────────────────────────────────────────────────────────────

def train_one_epoch(model, loader, optimizer, device, n_pca):
    model.train()
    total_loss = total_mae = n_batches = 0

    for rt, rs, lt, ls, pca_gt, mm_gt in loader:
        rt, rs, lt, ls  = rt.to(device), rs.to(device), lt.to(device), ls.to(device)
        pca_gt = pca_gt.to(device)
        mm_gt  = mm_gt.to(device)

        # Forward
        pca_pred = model.get_pca_coefficients(rt, rs, lt, ls)  # (B, k)
        mm_pred  = model(rt, rs, lt, ls)                        # (B, 16)

        # Dual loss
        l_pca = nn.functional.l1_loss(pca_pred, pca_gt[:, :n_pca])
        l_mm  = nn.functional.l1_loss(mm_pred,  mm_gt)
        loss  = LAMBDA_PCA * l_pca + LAMBDA_MM * l_mm

        optimizer.zero_grad()
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=5.0)
        optimizer.step()

        total_loss += loss.item()
        total_mae  += l_mm.item()
        n_batches  += 1

    return total_loss / max(n_batches, 1), total_mae / max(n_batches, 1)


@torch.no_grad()
def validate(model, loader, device, n_pca):
    model.eval()
    total_mae = n_batches = 0

    for rt, rs, lt, ls, pca_gt, mm_gt in loader:
        rt, rs, lt, ls = rt.to(device), rs.to(device), lt.to(device), ls.to(device)
        mm_gt = mm_gt.to(device)

        mm_pred = model(rt, rs, lt, ls)
        total_mae  += nn.functional.l1_loss(mm_pred, mm_gt).item()
        n_batches  += 1

    return total_mae / max(n_batches, 1)


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--epochs',      type=int,   default=50)
    p.add_argument('--batch',       type=int,   default=8)
    p.add_argument('--lr',          type=float, default=3e-4)
    p.add_argument('--lr_ft',       type=float, default=5e-5)
    p.add_argument('--workers',     type=int,   default=0)
    p.add_argument('--n_pca',       type=int,   default=32)
    p.add_argument('--shape_model', type=str,   default=str(SHAPE_DIR))
    p.add_argument('--pretrained',  action='store_true', default=True)
    args = p.parse_args()

    CKPT_DIR.mkdir(exist_ok=True)

    print(f'[Train V2] Device: {device}')
    print(f'[Train V2] Epochs: {args.epochs} | Batch: {args.batch} | LR: {args.lr}')

    # Lade Shape Model
    shape_dir = Path(args.shape_model)
    if not (shape_dir / 'mean_shape.npy').exists():
        print(f'[WARN] Shape Model nicht gefunden in {shape_dir}')
        print('  Zuerst: python3 scripts/05_build_shape_model.py')
        print('  Fahre fort ohne Shape Model (direkter mm-Regression)…')
        shape_dir_arg = None
    else:
        # Bestimme tatsächliche n_pca aus Dateien
        comp = np.load(shape_dir / 'components.npy')
        actual_k = min(args.n_pca, comp.shape[0])
        args.n_pca = actual_k
        print(f'[Train V2] PCA: {actual_k} Komponenten')
        shape_dir_arg = str(shape_dir)

    # Datasets
    train_ds = FootDatasetV2('train', augment=True)
    val_ds   = FootDatasetV2('val',   augment=False)
    train_dl = DataLoader(train_ds, batch_size=args.batch, shuffle=True,
                          num_workers=args.workers, pin_memory=(device == 'cuda'))
    val_dl   = DataLoader(val_ds,   batch_size=args.batch, shuffle=False,
                          num_workers=args.workers, pin_memory=(device == 'cuda'))

    # Model
    model = FootShapeNet(
        n_pca_components=args.n_pca,
        pretrained=args.pretrained,
        shape_model_dir=shape_dir_arg,
    ).to(device)

    print(f'[Train V2] Parameter: {model.n_params:,}')

    # ── Phase 1: Encoder frozen ──────────────────────────────────────────────
    model.freeze_encoders()
    optimizer = torch.optim.AdamW(
        filter(lambda p: p.requires_grad, model.parameters()),
        lr=args.lr, weight_decay=1e-4
    )
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=PHASE1_EPOCHS)

    log_path = CKPT_DIR / 'training_log_v2.csv'
    with open(log_path, 'w', newline='') as f:
        csv.writer(f).writerow(['epoch', 'phase', 'train_loss', 'train_mae_mm', 'val_mae_mm', 'lr'])

    best_mae = float('inf')

    for epoch in range(1, args.epochs + 1):
        if epoch == PHASE1_EPOCHS + 1:
            print('\n── Phase 2: Fine-Tuning (alle Layer) ────────────────────')
            model.unfreeze_all()
            optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr_ft, weight_decay=1e-4)
            scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
                optimizer, T_max=args.epochs - PHASE1_EPOCHS
            )

        phase = 1 if epoch <= PHASE1_EPOCHS else 2
        t0 = time.time()

        train_loss, train_mae = train_one_epoch(model, train_dl, optimizer, device, args.n_pca)
        val_mae = validate(model, val_dl, device, args.n_pca)
        scheduler.step()

        lr_now = scheduler.get_last_lr()[0]
        elapsed = time.time() - t0

        print(f'Epoch {epoch:3d}/{args.epochs} | Phase {phase} | '
              f'Loss {train_loss:.4f} | Train MAE {train_mae*1000:.1f}mm | '
              f'Val MAE {val_mae*1000:.1f}mm | LR {lr_now:.2e} | {elapsed:.0f}s')

        with open(log_path, 'a', newline='') as f:
            csv.writer(f).writerow([epoch, phase, f'{train_loss:.6f}',
                                    f'{train_mae*1000:.3f}', f'{val_mae*1000:.3f}', f'{lr_now:.2e}'])

        # Checkpoint
        state = {
            'epoch': epoch,
            'model_state': model.state_dict(),
            'val_mae': val_mae * 1000,
            'n_pca': args.n_pca,
            'optimizer_state': optimizer.state_dict(),
        }
        torch.save(state, CKPT_DIR / 'last_model_v2.pt')

        if val_mae < best_mae:
            best_mae = val_mae
            torch.save(state, CKPT_DIR / 'best_model_v2.pt')
            print(f'  ★ Neues Best-Modell: Val MAE = {val_mae*1000:.2f}mm')

    torch.save(state, CKPT_DIR / 'final_model_v2.pt')
    print(f'\n✓ Training abgeschlossen. Bestes Modell: {best_mae*1000:.2f}mm MAE')
    print(f'  Checkpoint: {CKPT_DIR}/best_model_v2.pt')


if __name__ == '__main__':
    main()

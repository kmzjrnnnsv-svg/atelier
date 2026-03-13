"""
Training-Skript für FootMeasurementNet.

Verwendung:
  python train.py                               # Standard-Training
  python train.py --db ../atelier-backend/atelier.db
  python train.py --epochs 50 --batch 8 --lr 1e-3

Strategie:
  Phase 1 (Epochs 1–20):  Encoder frozen, Fusion-MLP lernt
  Phase 2 (Epochs 21–50): Alle Parameter, kleinere LR (Fine-Tuning)

Output:
  checkpoints/best_model.pt    — bestes Modell (kleinster Val-Loss)
  checkpoints/final_model.pt   — finales Modell nach Training
  training_log.csv             — Loss-Kurve pro Epoch
"""

import argparse
import csv
import time
from pathlib import Path

import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from tqdm import tqdm

from dataset import FootDataset, LABEL_MEAN, LABEL_STD
from model import FootMeasurementNet


# ── Config ───────────────────────────────────────────────────────────────────
def parse_args():
    p = argparse.ArgumentParser(description='Foot Measurement Model Training')
    p.add_argument('--db',        default='../atelier-backend/atelier.db')
    p.add_argument('--epochs',    type=int,   default=50)
    p.add_argument('--batch',     type=int,   default=4)
    p.add_argument('--lr',        type=float, default=1e-3)
    p.add_argument('--lr_ft',     type=float, default=1e-4,   help='LR für Phase 2 Fine-Tuning')
    p.add_argument('--phase2_at', type=int,   default=20,     help='Ab welcher Epoch Fine-Tuning startet')
    p.add_argument('--img_size',  type=int,   default=224)
    p.add_argument('--workers',   type=int,   default=2)
    p.add_argument('--out_dir',   default='checkpoints')
    p.add_argument('--seed',      type=int,   default=42)
    p.add_argument('--no_pretrain', action='store_true', help='Keine ImageNet Weights')
    return p.parse_args()


# ── Loss: MAE in mm ──────────────────────────────────────────────────────────
class FootLoss(nn.Module):
    """
    Gewichteter MAE-Loss.
    Länge und Breite sind wichtiger als Gewölbehöhe.
    Gewichte: [length×2, width×2, arch×1, length×2, width×2, arch×1]
    """
    WEIGHTS = torch.tensor([2., 2., 1., 2., 2., 1.])

    def forward(self, pred: torch.Tensor, target: torch.Tensor) -> torch.Tensor:
        w = self.WEIGHTS.to(pred.device)
        mae = (pred - target).abs()
        return (mae * w).mean()


# ── Metrics ──────────────────────────────────────────────────────────────────
def compute_metrics(pred: torch.Tensor, target: torch.Tensor) -> dict:
    """Gibt MAE pro Messwert und gesamt zurück."""
    mae = (pred - target).abs().mean(0)
    names = ['R-Länge', 'R-Breite', 'R-Gewölbe', 'L-Länge', 'L-Breite', 'L-Gewölbe']
    metrics = {n: float(mae[i]) for i, n in enumerate(names)}
    metrics['gesamt_mae'] = float(mae.mean())
    return metrics


# ── Epoch loop ────────────────────────────────────────────────────────────────
def run_epoch(model, loader, optimizer, loss_fn, device, is_train: bool):
    model.train(is_train)
    total_loss = 0.0
    all_pred, all_target = [], []

    with torch.set_grad_enabled(is_train):
        for batch in tqdm(loader, leave=False, desc='Train' if is_train else 'Val'):
            rt, rs, lt, ls, labels = [x.to(device) for x in batch]
            pred = model(rt, rs, lt, ls)
            loss = loss_fn(pred, labels)

            if is_train:
                optimizer.zero_grad()
                loss.backward()
                nn.utils.clip_grad_norm_(model.parameters(), 2.0)
                optimizer.step()

            total_loss += loss.item() * labels.size(0)
            all_pred.append(pred.detach().cpu())
            all_target.append(labels.cpu())

    n = len(loader.dataset)
    avg_loss = total_loss / n
    metrics = compute_metrics(torch.cat(all_pred), torch.cat(all_target))
    return avg_loss, metrics


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    args = parse_args()
    torch.manual_seed(args.seed)
    device = 'cuda' if torch.cuda.is_available() else 'mps' if torch.backends.mps.is_available() else 'cpu'
    print(f'Device: {device}')

    # ── Datasets ──
    print('Lade Trainingsdaten…')
    index_csv = Path(args.db).parent.parent / 'atelier-ml/data/dataset/index.csv'
    use_csv = index_csv.exists()
    if use_csv:
        print(f'  → index.csv gefunden: {index_csv}')
    else:
        print(f'  → Nur SQLite-Modus (keine synthetischen Daten)')

    train_ds = FootDataset(
        index_csv=str(index_csv) if use_csv else None,
        db_path=args.db, split='train', img_size=args.img_size, seed=args.seed)
    val_ds   = FootDataset(
        index_csv=str(index_csv) if use_csv else None,
        db_path=args.db, split='val',   img_size=args.img_size, seed=args.seed)
    print(f'  Train: {len(train_ds)} | Val: {len(val_ds)}')

    if len(train_ds) < 4:
        print(f'\n⚠️  Nur {len(train_ds)} validierte Samples in der Datenbank.')
        print('   Sammle mehr Scans und validiere sie im Admin-Panel.')
        print('   Empfehlung: min. 50 Samples für gute Ergebnisse.')
        if len(train_ds) == 0:
            return

    # ── Label Stats (für Normalisierung) ──
    label_mean, label_std = train_ds.label_stats
    print(f'Label mean: {label_mean.tolist()}')
    print(f'Label std:  {label_std.tolist()}')

    # ── DataLoaders ──
    train_loader = DataLoader(train_ds, batch_size=args.batch, shuffle=True,
                              num_workers=args.workers, pin_memory=True, drop_last=len(train_ds) > args.batch)
    val_loader   = DataLoader(val_ds,   batch_size=args.batch, shuffle=False,
                              num_workers=args.workers, pin_memory=True)

    # ── Model ──
    model = FootMeasurementNet(pretrained=not args.no_pretrain)
    model.set_label_stats(label_mean, label_std)
    model = model.to(device)
    print(f'Modell: {model.n_params:,} Parameter')

    # Phase 1: Encoder einfrieren
    model.freeze_encoders()
    print(f'Phase 1 trainierbar: {model.n_trainable:,} Parameter')

    loss_fn   = FootLoss()
    optimizer = torch.optim.AdamW(
        filter(lambda p: p.requires_grad, model.parameters()),
        lr=args.lr, weight_decay=1e-4,
    )
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.phase2_at)

    # ── Output dir ──
    out_dir = Path(args.out_dir)
    out_dir.mkdir(exist_ok=True)
    log_path = out_dir / 'training_log.csv'
    best_val_loss = float('inf')

    with open(log_path, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['epoch', 'phase', 'train_loss', 'val_loss', 'val_mae_mm', 'lr'])

    # ── Training Loop ──
    for epoch in range(1, args.epochs + 1):
        # Phase 2: Fine-Tuning ab args.phase2_at
        if epoch == args.phase2_at + 1:
            model.unfreeze_all()
            optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr_ft, weight_decay=1e-4)
            scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
                optimizer, T_max=args.epochs - args.phase2_at
            )
            print(f'\n→ Phase 2 Fine-Tuning gestartet (LR={args.lr_ft})')
            print(f'  Trainierbar: {model.n_trainable:,} Parameter')

        phase = 'ft' if epoch > args.phase2_at else 'frozen'
        t0 = time.time()

        train_loss, train_metrics = run_epoch(model, train_loader, optimizer, loss_fn, device, is_train=True)
        val_loss,   val_metrics   = run_epoch(model, val_loader,   optimizer, loss_fn, device, is_train=False)
        scheduler.step()

        current_lr = optimizer.param_groups[0]['lr']
        elapsed    = time.time() - t0

        print(
            f'Epoch {epoch:3d}/{args.epochs} [{phase}] '
            f'Loss train={train_loss:.4f} val={val_loss:.4f} '
            f'MAE={val_metrics["gesamt_mae"]:.1f}mm '
            f'(R-L: {val_metrics["R-Länge"]:.1f}/{val_metrics["L-Länge"]:.1f} mm) '
            f'LR={current_lr:.2e}  {elapsed:.1f}s'
        )

        # Checkpoint — bestes Modell
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            torch.save({
                'epoch': epoch,
                'model_state': model.state_dict(),
                'label_mean': label_mean,
                'label_std':  label_std,
                'val_loss':   val_loss,
                'val_mae':    val_metrics['gesamt_mae'],
            }, out_dir / 'best_model.pt')
            print(f'  ✓ Bestes Modell gespeichert (Val-Loss={val_loss:.4f})')

        # Log
        with open(log_path, 'a', newline='') as f:
            writer = csv.writer(f)
            writer.writerow([epoch, phase, f'{train_loss:.6f}', f'{val_loss:.6f}',
                             f'{val_metrics["gesamt_mae"]:.2f}', f'{current_lr:.6e}'])

    # Finales Modell
    torch.save({
        'epoch': args.epochs,
        'model_state': model.state_dict(),
        'label_mean': label_mean,
        'label_std':  label_std,
    }, out_dir / 'final_model.pt')
    print(f'\n✓ Training abgeschlossen. Bestes Val-Loss: {best_val_loss:.4f}')
    print(f'  → {out_dir}/best_model.pt')
    print(f'  → Jetzt exportieren: python export.py')


if __name__ == '__main__':
    main()

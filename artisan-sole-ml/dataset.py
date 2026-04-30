"""
FootDataset — unterstützt 3 Datenquellen:

  1. data/dataset/index.csv  (aus 04_build_dataset.py)
     Synthetische Renders (Foot3D) + echte App-Scans kombiniert
     → empfohlen, sobald synthetische Daten vorhanden

  2. atelier.db SQLite
     Nur echte App-Scans (validiert durch Admin)
     → Fallback wenn noch keine synthetischen Daten existieren

Verwendung:
  # Mit index.csv (nach Dataset-Pipeline):
  ds = FootDataset(index_csv='data/dataset/index.csv', split='train')

  # Nur SQLite (frühe Phase ohne Foot3D-Daten):
  ds = FootDataset(db_path='../atelier-backend/atelier.db', split='train')

  # Kombiniert:
  ds = FootDataset(index_csv='data/dataset/index.csv',
                   db_path='../atelier-backend/atelier.db',
                   split='train')
"""

import base64
import io
import json
import sqlite3
from pathlib import Path

import numpy as np
import pandas as pd
import torch
from PIL import Image
from torch.utils.data import Dataset
from torchvision import transforms


# ── Label-Normalisierung ──────────────────────────────────────────────────────
# [right_length, right_width, right_arch, left_length, left_width, left_arch]
LABEL_MEAN = torch.tensor([260.0,  95.0, 14.0, 258.0,  94.0, 13.0])
LABEL_STD  = torch.tensor([ 25.0,  10.0,  5.0,  25.0,  10.0,  5.0])

# ── ImageNet-Normalisierung ───────────────────────────────────────────────────
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD  = [0.229, 0.224, 0.225]


def get_transforms(split: str, img_size: int = 224):
    if split == 'train':
        return transforms.Compose([
            transforms.Resize((img_size + 32, img_size + 32)),
            transforms.RandomCrop(img_size),
            transforms.RandomHorizontalFlip(p=0.3),
            transforms.ColorJitter(brightness=0.3, contrast=0.25, saturation=0.2, hue=0.05),
            transforms.RandomGrayscale(p=0.05),
            transforms.ToTensor(),
            transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
        ])
    else:
        return transforms.Compose([
            transforms.Resize((img_size, img_size)),
            transforms.ToTensor(),
            transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
        ])


# ── Bild-Lade-Hilfsfunktionen ─────────────────────────────────────────────────

def _load_jpg(path: str) -> Image.Image:
    return Image.open(path).convert('RGB')


def _b64_to_pil(b64_str: str) -> Image.Image:
    if b64_str.startswith('data:'):
        b64_str = b64_str.split(',', 1)[1]
    data = base64.b64decode(b64_str)
    return Image.open(io.BytesIO(data)).convert('RGB')


# ── Dataset ───────────────────────────────────────────────────────────────────

class FootDataset(Dataset):
    """
    Kombiniertes Dataset für Fußvermessungs-Training.

    Args:
        index_csv:  Pfad zu data/dataset/index.csv (synthetisch + echt)
        db_path:    Pfad zu atelier.db (nur echte Scans)
        split:      'train' | 'val' | 'test'
        img_size:   Bildgröße (default: 224)
        seed:       Für reproduzierbaren Split (nur bei db_path-only)
        val_frac:   Validierungsanteil (nur bei db_path-only)
        test_frac:  Test-Anteil (nur bei db_path-only)
    """

    def __init__(
        self,
        index_csv:  str | None = None,
        db_path:    str | None = None,
        split:      str = 'train',
        img_size:   int = 224,
        seed:       int = 42,
        val_frac:   float = 0.15,
        test_frac:  float = 0.10,
    ):
        self.transform = get_transforms(split, img_size)
        self.rows = []

        # Quelle 1: index.csv (synthetisch + echt)
        if index_csv and Path(index_csv).exists():
            df = pd.read_csv(index_csv)
            split_df = df[df['split'] == split]
            for _, row in split_df.iterrows():
                self.rows.append({
                    'type': 'file',
                    'right_top':  row['right_top'],
                    'right_side': row['right_side'],
                    'left_top':   row['left_top'],
                    'left_side':  row['left_side'],
                    'labels': [
                        row['right_length'], row['right_width'], row['right_arch'],
                        row['left_length'],  row['left_width'],  row['left_arch'],
                    ],
                })
            print(f'[Dataset] {len(self.rows)} Samples aus index.csv ({split})')

        # Quelle 2: SQLite (echte App-Scans)
        if db_path and Path(db_path).exists():
            db_rows = self._load_from_db(db_path)

            # Split-Logik
            rng = np.random.default_rng(seed)
            idx = rng.permutation(len(db_rows))
            n = len(idx)
            n_test = max(0, int(n * test_frac))
            n_val  = max(0, int(n * val_frac))

            if split == 'test':
                idx = idx[:n_test]
            elif split == 'val':
                idx = idx[n_test:n_test + n_val]
            else:
                idx = idx[n_test + n_val:]

            selected = [db_rows[i] for i in idx]
            self.rows.extend(selected)

            if selected:
                print(f'[Dataset] +{len(selected)} echte Scans aus SQLite ({split})')

        if not self.rows:
            print(f'[Dataset WARNING] Keine Samples für Split "{split}" gefunden!')
            print('  → Führe die Setup-Scripts aus: siehe atelier-ml/scripts/')

    @staticmethod
    def _load_from_db(db_path: str) -> list[dict]:
        con = sqlite3.connect(db_path)
        con.row_factory = sqlite3.Row
        rows = con.execute("""
            SELECT td.right_top_img, td.right_side_img, td.left_top_img, td.left_side_img,
                   fs.right_length, fs.right_width, fs.right_arch,
                   fs.left_length,  fs.left_width,  fs.left_arch
            FROM scan_training_data td
            JOIN foot_scans fs ON fs.id = td.scan_id
            WHERE td.validated = 1
              AND td.right_top_img  IS NOT NULL
              AND td.right_side_img IS NOT NULL
              AND td.left_top_img   IS NOT NULL
              AND td.left_side_img  IS NOT NULL
        """).fetchall()
        con.close()
        return [{
            'type': 'b64',
            'right_top':  row['right_top_img'],
            'right_side': row['right_side_img'],
            'left_top':   row['left_top_img'],
            'left_side':  row['left_side_img'],
            'labels': [
                row['right_length'], row['right_width'], row['right_arch'],
                row['left_length'],  row['left_width'],  row['left_arch'],
            ],
        } for row in rows]

    def __len__(self):
        return len(self.rows)

    def __getitem__(self, idx):
        row = self.rows[idx]

        if row['type'] == 'file':
            imgs = [self.transform(_load_jpg(row[k]))
                    for k in ['right_top', 'right_side', 'left_top', 'left_side']]
        else:
            imgs = [self.transform(_b64_to_pil(row[k]))
                    for k in ['right_top', 'right_side', 'left_top', 'left_side']]

        labels = torch.tensor(row['labels'], dtype=torch.float32)
        return *imgs, labels

    @property
    def label_stats(self) -> tuple[torch.Tensor, torch.Tensor]:
        if not self.rows:
            return LABEL_MEAN.clone(), LABEL_STD.clone()
        all_labels = torch.stack([torch.tensor(r['labels'], dtype=torch.float32) for r in self.rows])
        return all_labels.mean(0), all_labels.std(0).clamp(min=1.0)

    def summary(self) -> str:
        n = len(self)
        n_file = sum(1 for r in self.rows if r['type'] == 'file')
        n_b64  = sum(1 for r in self.rows if r['type'] == 'b64')
        return (f'FootDataset: {n} samples '
                f'({n_file} synthetisch aus Datei, {n_b64} echt aus SQLite)')


if __name__ == '__main__':
    # Teste beide Modi
    print('── Test: SQLite-Modus ──')
    ds_db = FootDataset(db_path='../atelier-backend/atelier.db', split='train')
    print(ds_db.summary())

    print('\n── Test: index.csv-Modus ──')
    ds_csv = FootDataset(index_csv='data/dataset/index.csv', split='train')
    print(ds_csv.summary())

    # Kombiniert
    if len(ds_csv) > 0 or len(ds_db) > 0:
        ds = FootDataset(
            index_csv='data/dataset/index.csv',
            db_path='../atelier-backend/atelier.db',
            split='train',
        )
        print(f'\n── Kombiniert: {ds.summary()} ──')
        if len(ds) > 0:
            *imgs, labels = ds[0]
            print(f'Image shapes: {[img.shape for img in imgs]}')
            print(f'Labels (mm):  {labels.tolist()}')
            mean, std = ds.label_stats
            print(f'Label mean:   {mean.tolist()}')
            print(f'Label std:    {std.tolist()}')

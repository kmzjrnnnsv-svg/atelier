"""
07_rebuild_dataset.py — Erweitert alle meta.json Dateien im dataset um Girth-Daten.

Liest:
  data/girths.csv         — 5 Girth-Maße je Fuß
  data/dataset/*/meta.json

Schreibt:
  data/dataset/*/meta.json  — ergänzt um ball_girth, waist_girth, instep_girth,
                               heel_girth, ankle_girth, foot_height
  data/dataset/index_v2.csv — neuer Index mit allen 13 Maßen (8 je Fuß)

Verwendung:
  python3 scripts/07_rebuild_dataset.py
"""

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ML_DIR = Path(__file__).parent.parent
DATA_DIR = ML_DIR / 'data'


def main():
    girths_csv = DATA_DIR / 'girths.csv'
    if not girths_csv.exists():
        sys.exit('[ERROR] data/girths.csv nicht gefunden. Zuerst 06_compute_girths.py ausführen.')

    girths_df = pd.read_csv(girths_csv)
    # Erstelle Lookup: foot_id → girth dict
    girths_map: dict[str, dict] = {}
    for _, row in girths_df.iterrows():
        girths_map[row['foot_id']] = row.to_dict()

    print(f'✓ Girth-Daten geladen: {len(girths_map)} Füße')

    # Alle meta.json in train/val/test
    all_meta_paths = []
    for split in ('train', 'val', 'test'):
        split_dir = DATA_DIR / 'dataset' / split
        if split_dir.exists():
            for sample_dir in sorted(split_dir.iterdir()):
                meta_path = sample_dir / 'meta.json'
                if meta_path.exists():
                    all_meta_paths.append((split, meta_path))

    print(f'→ {len(all_meta_paths)} meta.json Dateien werden aktualisiert ...')

    records = []
    skipped = 0

    for split, meta_path in all_meta_paths:
        with open(meta_path) as f:
            meta = json.load(f)

        sample_id = meta.get('sample_id', '')
        # foot_id extrahieren: "synthetic_0001_aug02" → "synthetic_0001"
        parts = sample_id.rsplit('_aug', 1)
        foot_id = parts[0] if len(parts) == 2 else sample_id

        if foot_id not in girths_map:
            skipped += 1
            continue

        g = girths_map[foot_id]

        # Ergänze meta.json
        meta['right_ball_girth']   = round(g['ball_girth'], 1)
        meta['right_waist_girth']  = round(g['waist_girth'], 1)
        meta['right_instep_girth'] = round(g['instep_girth'], 1)
        meta['right_heel_girth']   = round(g['heel_girth'], 1)
        meta['right_ankle_girth']  = round(g['ankle_girth'], 1)
        meta['right_foot_height']  = round(g['foot_height'], 1)

        meta['left_ball_girth']    = round(g['ball_girth'], 1)
        meta['left_waist_girth']   = round(g['waist_girth'], 1)
        meta['left_instep_girth']  = round(g['instep_girth'], 1)
        meta['left_heel_girth']    = round(g['heel_girth'], 1)
        meta['left_ankle_girth']   = round(g['ankle_girth'], 1)
        meta['left_foot_height']   = round(g['foot_height'], 1)

        with open(meta_path, 'w') as f:
            json.dump(meta, f, indent=2)

        # Für Index sammeln
        records.append({
            'sample_id': sample_id,
            'split': split,
            'right_top':    meta.get('right_top', ''),
            'right_side':   meta.get('right_side', ''),
            'left_top':     meta.get('left_top', ''),
            'left_side':    meta.get('left_side', ''),
            # 8 Maße je Fuß
            'right_length':       meta.get('right_length', 0),
            'right_width':        meta.get('right_width', 0),
            'right_foot_height':  meta.get('right_foot_height', 0),
            'right_arch':         meta.get('right_arch', 0),
            'right_ball_girth':   meta.get('right_ball_girth', 0),
            'right_waist_girth':  meta.get('right_waist_girth', 0),
            'right_instep_girth': meta.get('right_instep_girth', 0),
            'right_heel_girth':   meta.get('right_heel_girth', 0),
            'right_ankle_girth':  meta.get('right_ankle_girth', 0),
            'left_length':        meta.get('left_length', 0),
            'left_width':         meta.get('left_width', 0),
            'left_foot_height':   meta.get('left_foot_height', 0),
            'left_arch':          meta.get('left_arch', 0),
            'left_ball_girth':    meta.get('left_ball_girth', 0),
            'left_waist_girth':   meta.get('left_waist_girth', 0),
            'left_instep_girth':  meta.get('left_instep_girth', 0),
            'left_heel_girth':    meta.get('left_heel_girth', 0),
            'left_ankle_girth':   meta.get('left_ankle_girth', 0),
        })

    out_csv = DATA_DIR / 'dataset' / 'index_v2.csv'
    pd.DataFrame(records).to_csv(out_csv, index=False)

    print(f'✓ {len(records)} meta.json aktualisiert ({skipped} übersprungen)')
    print(f'✓ Index gespeichert → {out_csv}')


if __name__ == '__main__':
    main()

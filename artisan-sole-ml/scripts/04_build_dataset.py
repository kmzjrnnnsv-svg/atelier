"""
04_build_dataset.py
Kombiniert synthetische Renders (aus Foot3D) + echte App-Scans (aus SQLite)
zu einem einheitlichen Trainings-Dataset.

Workflow:
  1. Liest alle meta.json aus data/renders/ (synthetische Daten)
  2. Liest validierte echte Scans aus atelier.db (echte Daten)
  3. Erstellt data/dataset/ mit einheitlicher Struktur:
     data/dataset/
       index.csv              ← alle Samples + Labels + Pfade
       train/
         sample_0001/
           right_top.jpg
           right_side.jpg
           left_top.jpg
           left_side.jpg
           meta.json
       val/
         ...
       test/
         ...

  4. Aktualisiert dataset.py um diese Dateistruktur zu lesen

Verwendung:
  python scripts/04_build_dataset.py
  python scripts/04_build_dataset.py --db ../atelier-backend/atelier.db

Abhängigkeiten:
  pip install pandas tqdm Pillow
"""

import argparse
import base64
import io
import json
import shutil
import sqlite3
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from PIL import Image

try:
    from tqdm import tqdm
except ImportError:
    tqdm = lambda x, **kw: x  # noqa: E731


# ── Konstanten ────────────────────────────────────────────────────────────────
SPLIT_SEED     = 42
VAL_FRAC       = 0.15
TEST_FRAC      = 0.10
TARGET_IMG_W   = 1024   # Zielgröße beim Kopieren
TARGET_IMG_H   = 768


def b64_to_pil(b64_str: str) -> Image.Image | None:
    """Konvertiert base64-JPEG zu PIL-Bild."""
    try:
        if b64_str.startswith('data:'):
            b64_str = b64_str.split(',', 1)[1]
        data = base64.b64decode(b64_str)
        return Image.open(io.BytesIO(data)).convert('RGB')
    except Exception:
        return None


def load_synthetic_samples(renders_dir: Path) -> list[dict]:
    """Liest alle synthetischen Render-Samples."""
    print(f'\n[Synthetic] Lade Renders aus: {renders_dir}')
    samples = []

    if not renders_dir.exists():
        print('  ⚠  Renders-Ordner nicht gefunden.')
        print('     Zuerst ausführen: python scripts/03_render_views.py')
        return []

    meta_files = sorted(renders_dir.rglob('meta.json'))
    print(f'  Gefunden: {len(meta_files)} meta.json Dateien')

    for meta_path in tqdm(meta_files, desc='Lade synthetische Samples'):
        try:
            with open(meta_path) as f:
                meta = json.load(f)

            sample_dir = meta_path.parent
            required = ['right_top.jpg', 'right_side.jpg', 'left_top.jpg', 'left_side.jpg']
            if not all((sample_dir / f).exists() for f in required):
                continue

            # Plausibilitäts-Check der Maße
            ml = meta.get('right_length', 0)
            mw = meta.get('right_width',  0)
            if not (180 < ml < 340 and 70 < mw < 130):
                continue

            samples.append({
                'sample_id':      meta['sample_id'],
                'source':         'synthetic',
                'right_top':      str(sample_dir / 'right_top.jpg'),
                'right_side':     str(sample_dir / 'right_side.jpg'),
                'left_top':       str(sample_dir / 'left_top.jpg'),
                'left_side':      str(sample_dir / 'left_side.jpg'),
                'right_length':   meta['right_length'],
                'right_width':    meta['right_width'],
                'right_arch':     meta.get('right_arch_height', 14.0),
                'left_length':    meta['left_length'],
                'left_width':     meta['left_width'],
                'left_arch':      meta.get('left_arch_height', 13.0),
            })
        except Exception as e:
            print(f'  [WARN] {meta_path}: {e}')

    print(f'  ✓ {len(samples)} synthetische Samples geladen')
    return samples


def load_real_samples(db_path: Path, out_tmp: Path) -> list[dict]:
    """
    Liest echte Scans + Trainingsbilder aus der atelier.db.
    Extrahiert base64-Bilder als JPEG-Dateien.
    """
    print(f'\n[Real] Lade echte Scans aus: {db_path}')
    samples = []

    if not db_path.exists():
        print(f'  ⚠  Datenbank nicht gefunden: {db_path}')
        return []

    try:
        con = sqlite3.connect(str(db_path))
        con.row_factory = sqlite3.Row
        rows = con.execute("""
            SELECT
                td.id AS training_id,
                td.scan_id,
                td.right_top_img,
                td.right_side_img,
                td.left_top_img,
                td.left_side_img,
                fs.right_length,
                fs.right_width,
                fs.right_arch,
                fs.left_length,
                fs.left_width,
                fs.left_arch,
                fs.accuracy
            FROM scan_training_data td
            JOIN foot_scans fs ON fs.id = td.scan_id
            WHERE td.validated = 1
              AND td.right_top_img  IS NOT NULL
              AND td.right_side_img IS NOT NULL
              AND td.left_top_img   IS NOT NULL
              AND td.left_side_img  IS NOT NULL
        """).fetchall()
        con.close()
    except Exception as e:
        print(f'  [ERROR] DB-Fehler: {e}')
        return []

    print(f'  Validierte Scans: {len(rows)}')

    out_tmp.mkdir(exist_ok=True, parents=True)

    for row in tqdm(rows, desc='Extrahiere echte Bilder'):
        sample_id = f'real_{row["scan_id"]:05d}'
        sample_dir = out_tmp / sample_id
        sample_dir.mkdir(exist_ok=True)

        imgs = {
            'right_top':  row['right_top_img'],
            'right_side': row['right_side_img'],
            'left_top':   row['left_top_img'],
            'left_side':  row['left_side_img'],
        }

        # Base64 → JPEG speichern
        ok = True
        paths = {}
        for name, b64 in imgs.items():
            pil = b64_to_pil(b64)
            if pil is None:
                ok = False
                break
            p = sample_dir / f'{name}.jpg'
            pil.save(str(p), quality=90)
            paths[name] = str(p)

        if not ok:
            shutil.rmtree(sample_dir, ignore_errors=True)
            continue

        # Plausibilitäts-Check
        rl = row['right_length']
        rw = row['right_width']
        if not (180 < rl < 340 and 70 < rw < 130):
            shutil.rmtree(sample_dir, ignore_errors=True)
            continue

        samples.append({
            'sample_id':   sample_id,
            'source':      'real',
            'right_top':   paths['right_top'],
            'right_side':  paths['right_side'],
            'left_top':    paths['left_top'],
            'left_side':   paths['left_side'],
            'right_length': float(rl),
            'right_width':  float(rw),
            'right_arch':   float(row['right_arch']),
            'left_length':  float(row['left_length']),
            'left_width':   float(row['left_width']),
            'left_arch':    float(row['left_arch']),
        })

    print(f'  ✓ {len(samples)} echte Samples extrahiert')
    return samples


def split_dataset(samples: list[dict], seed: int = SPLIT_SEED) -> dict:
    """
    Teilt Samples nach FOOT_ID auf, nicht nach augmentierten Samples.
    Verhindert Data-Leakage: Derselbe Fuß kann nicht in Train UND Val/Test sein.
    """
    rng = np.random.default_rng(seed)

    # Eindeutige Fuß-IDs sammeln (ohne aug-Suffix)
    def get_foot_id(sample_id: str) -> str:
        # z.B. 'synthetic_0042_aug03' → 'synthetic_0042'
        # oder 'real_00042' → 'real_00042' (keine Augmentierungen)
        parts = sample_id.rsplit('_aug', 1)
        return parts[0]

    # Samples nach foot_id gruppieren
    from collections import defaultdict
    foot_groups: dict[str, list] = defaultdict(list)
    for s in samples:
        fid = get_foot_id(s['sample_id'])
        foot_groups[fid].append(s)

    foot_ids = sorted(foot_groups.keys())
    foot_ids_shuffled = rng.permutation(foot_ids).tolist()
    n = len(foot_ids_shuffled)
    n_test = max(1, int(n * TEST_FRAC))
    n_val  = max(1, int(n * VAL_FRAC))

    test_ids  = set(foot_ids_shuffled[:n_test])
    val_ids   = set(foot_ids_shuffled[n_test:n_test + n_val])

    result = {'train': [], 'val': [], 'test': []}
    for fid, group in foot_groups.items():
        if fid in test_ids:
            result['test'].extend(group)
        elif fid in val_ids:
            result['val'].extend(group)
        else:
            result['train'].extend(group)

    print(f'  Split nach foot_id: {len(test_ids)} Test-Füße | {len(val_ids)} Val-Füße | '
          f'{n - len(test_ids) - len(val_ids)} Train-Füße')
    return result


def build_split(samples: list[dict], split_name: str, out_dir: Path):
    """Kopiert Bilder + erstellt meta.json für einen Split."""
    split_dir = out_dir / split_name
    split_dir.mkdir(exist_ok=True, parents=True)

    records = []
    for i, sample in enumerate(tqdm(samples, desc=f'Baue {split_name}')):
        dest_dir = split_dir / f'sample_{i:05d}'
        dest_dir.mkdir(exist_ok=True)

        img_keys = ['right_top', 'right_side', 'left_top', 'left_side']
        new_paths = {}

        for key in img_keys:
            src = Path(sample[key])
            dst = dest_dir / f'{key}.jpg'
            if src.exists():
                shutil.copy2(str(src), str(dst))
                new_paths[key] = str(dst)
            else:
                break
        else:
            meta = {k: v for k, v in sample.items() if k not in img_keys}
            meta.update({k: str(v) for k, v in new_paths.items()})
            meta['split'] = split_name
            meta['idx'] = i

            with open(dest_dir / 'meta.json', 'w') as f:
                json.dump(meta, f, indent=2)

            records.append({
                'idx':          i,
                'sample_id':    sample['sample_id'],
                'source':       sample['source'],
                'split':        split_name,
                'right_top':    new_paths.get('right_top', ''),
                'right_side':   new_paths.get('right_side', ''),
                'left_top':     new_paths.get('left_top', ''),
                'left_side':    new_paths.get('left_side', ''),
                'right_length': sample['right_length'],
                'right_width':  sample['right_width'],
                'right_arch':   sample['right_arch'],
                'left_length':  sample['left_length'],
                'left_width':   sample['left_width'],
                'left_arch':    sample['left_arch'],
            })

    return records


def print_stats(df: pd.DataFrame):
    """Druckt Dataset-Statistiken."""
    print('\n══════════════ Dataset-Statistiken ══════════════')
    print(f'Gesamt:     {len(df)} Samples')
    for split in ['train', 'val', 'test']:
        n = (df['split'] == split).sum()
        print(f'  {split:5s}: {n:4d} ({n/len(df)*100:.0f}%)')
    print(f'\nQuellen:')
    for src, grp in df.groupby('source'):
        print(f'  {src:12s}: {len(grp):4d}')
    print(f'\nMaße (alle Samples):')
    for col in ['right_length', 'right_width', 'right_arch']:
        print(f'  {col:15s}: {df[col].mean():.1f} ± {df[col].std():.1f} mm '
              f'(min={df[col].min():.0f}, max={df[col].max():.0f})')
    print('═════════════════════════════════════════════════')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--renders_dir', default='data/renders')
    parser.add_argument('--db',          default='../atelier-backend/atelier.db')
    parser.add_argument('--out_dir',     default='data/dataset')
    parser.add_argument('--seed',        type=int, default=SPLIT_SEED)
    args = parser.parse_args()

    script_dir   = Path(__file__).parent
    renders_dir  = (script_dir / '..' / args.renders_dir).resolve()
    db_path      = (script_dir / '..' / args.db).resolve()
    out_dir      = (script_dir / '..' / args.out_dir).resolve()
    tmp_real_dir = out_dir / '_real_tmp'

    out_dir.mkdir(exist_ok=True, parents=True)

    # ── Alle Samples laden ──
    synthetic = load_synthetic_samples(renders_dir)
    real      = load_real_samples(db_path, tmp_real_dir)
    all_samples = synthetic + real

    if not all_samples:
        print('\n✗ Keine Samples gefunden!')
        print('  1. Führe 01_download_data.sh aus')
        print('  2. Führe 02_extract_measurements.py aus')
        print('  3. Führe 03_render_views.py aus')
        print('  4. Dann erneut dieses Script')
        sys.exit(1)

    print(f'\nGesamt: {len(all_samples)} Samples '
          f'({len(synthetic)} synthetisch + {len(real)} echt)')

    # ── Aufteilen ──
    splits = split_dataset(all_samples, seed=args.seed)
    print(f'Split: train={len(splits["train"])} | val={len(splits["val"])} | test={len(splits["test"])}')

    # ── Dataset bauen ──
    all_records = []
    for split_name, samples in splits.items():
        records = build_split(samples, split_name, out_dir)
        all_records.extend(records)

    # ── Index CSV ──
    index_df = pd.DataFrame(all_records)
    index_path = out_dir / 'index.csv'
    index_df.to_csv(index_path, index=False)

    print_stats(index_df)

    print(f'\n✓ Dataset bereit: {out_dir}')
    print(f'  Index: {index_path}')
    print('\nNächster Schritt: python train.py --data_dir data/dataset')


if __name__ == '__main__':
    main()

"""
save_real_scan.py — Speichert einen echten Scan aus der App in data/real/.

Wird vom Backend aufgerufen wenn ein Scan LiDAR-Grundwahrheit hat:
  python3 save_real_scan.py --data '{"scan_id":"...", "rightTopImg":"...", ...}'

Eingabe (JSON):
  scan_id         — unique ID
  rightTopImg     — base64 JPEG (Draufsicht rechts)
  rightSideImg    — base64 JPEG (Seitenansicht rechts)
  leftTopImg      — base64 JPEG (Draufsicht links)
  leftSideImg     — base64 JPEG (Seitenansicht links)
  lidar           — LiDAR-Messungen als JSON-Objekt (Grundwahrheit)

Ausgabe:
  data/real/scans/<scan_id>/  — 4 JPEG-Bilder + meta.json
  data/real/index.csv         — Zeile hinzugefügt

Hinweis: lidar-Messungen dienen als Ground-Truth Label.
"""

import argparse
import base64
import csv
import io
import json
import os
import sys
from pathlib import Path

ML_DIR = Path(__file__).parent.parent
DATA_DIR = ML_DIR / 'data' / 'real'
SCANS_DIR = DATA_DIR / 'scans'
INDEX_CSV = DATA_DIR / 'index.csv'

FIELDNAMES = [
    'sample_id', 'source',
    'right_top', 'right_side', 'left_top', 'left_side', 'px_per_mm',
    'right_length', 'right_width', 'right_foot_height', 'right_arch',
    'right_ball_girth', 'right_waist_girth', 'right_instep_girth',
    'right_heel_girth', 'right_ankle_girth',
    'left_length', 'left_width', 'left_foot_height', 'left_arch',
    'left_ball_girth', 'left_waist_girth', 'left_instep_girth',
    'left_heel_girth', 'left_ankle_girth',
]


def b64_to_jpeg(b64_str: str) -> bytes:
    if b64_str.startswith('data:'):
        b64_str = b64_str.split(',', 1)[1]
    return base64.b64decode(b64_str)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--data', required=True, help='JSON-String mit Scan-Daten')
    parser.add_argument('--min_quality', type=float, default=0.0,
                        help='Mindest-Qualitätsscore (0–1), sonst übersprungen')
    args = parser.parse_args()

    try:
        data = json.loads(args.data)
    except json.JSONDecodeError as e:
        sys.exit(f'[ERROR] Ungültiger JSON-Input: {e}')

    scan_id = data.get('scan_id') or data.get('id', '')
    if not scan_id:
        sys.exit('[ERROR] scan_id fehlt')

    lidar = data.get('lidar', {})
    if not lidar:
        sys.exit('[ERROR] Keine LiDAR-Daten — nur Scans mit Grundwahrheit speichern')

    # Scan-Verzeichnis anlegen
    SCANS_DIR.mkdir(parents=True, exist_ok=True)
    scan_dir = SCANS_DIR / scan_id
    scan_dir.mkdir(exist_ok=True)

    # Bilder speichern
    img_paths = {}
    for view, key in [('right_top', 'rightTopImg'), ('right_side', 'rightSideImg'),
                      ('left_top', 'leftTopImg'),   ('left_side', 'leftSideImg')]:
        b64 = data.get(key, '')
        if not b64:
            print(f'[WARN] {key} fehlt — leeres Bild verwendet')
            img_paths[view] = ''
            continue
        jpg_bytes = b64_to_jpeg(b64)
        out_path = scan_dir / f'{view}.jpg'
        out_path.write_bytes(jpg_bytes)
        img_paths[view] = str(out_path)

    # px_per_mm aus den Bilddaten extrahieren (wenn CV-Pipeline verfügbar)
    px_per_mm = float(data.get('px_per_mm', 0) or 0)

    # Meta.json speichern
    meta = {
        'sample_id': scan_id,
        'source': 'real',
        **img_paths,
        'px_per_mm': px_per_mm,
        'lidar': lidar,
    }
    (scan_dir / 'meta.json').write_text(json.dumps(meta, indent=2))

    # LiDAR-Messungen → Label-Spalten
    def g(key, fallback=0.0):
        return float(lidar.get(key, fallback) or fallback)

    row = {
        'sample_id': scan_id,
        'source': 'real',
        'right_top':   img_paths.get('right_top', ''),
        'right_side':  img_paths.get('right_side', ''),
        'left_top':    img_paths.get('left_top', ''),
        'left_side':   img_paths.get('left_side', ''),
        'px_per_mm':   px_per_mm,
        # Ground truth aus LiDAR
        'right_length':       g('right_length'),
        'right_width':        g('right_width'),
        'right_foot_height':  g('right_foot_height', g('right_arch_height', 0) * 4),
        'right_arch':         g('right_arch_height'),
        'right_ball_girth':   g('right_ball_girth'),
        'right_waist_girth':  g('right_waist_girth'),
        'right_instep_girth': g('right_instep_girth'),
        'right_heel_girth':   g('right_heel_girth'),
        'right_ankle_girth':  g('right_ankle_girth'),
        'left_length':        g('left_length'),
        'left_width':         g('left_width'),
        'left_foot_height':   g('left_foot_height', g('left_arch_height', 0) * 4),
        'left_arch':          g('left_arch_height'),
        'left_ball_girth':    g('left_ball_girth'),
        'left_waist_girth':   g('left_waist_girth'),
        'left_instep_girth':  g('left_instep_girth'),
        'left_heel_girth':    g('left_heel_girth'),
        'left_ankle_girth':   g('left_ankle_girth'),
    }

    # Index aktualisieren (append)
    file_exists = INDEX_CSV.exists() and INDEX_CSV.stat().st_size > 10
    with open(INDEX_CSV, 'a', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=FIELDNAMES)
        if not file_exists:
            writer.writeheader()
        writer.writerow(row)

    print(json.dumps({'ok': True, 'scan_id': scan_id, 'scan_dir': str(scan_dir)}))


if __name__ == '__main__':
    main()

"""
validate_with_lidar.py — Use LiDAR scans as ground-truth to validate regressions.

Processes LiDAR point cloud JSON files and compares the directly-measured
girths (alpha-hull from 3D) against regression-predicted girths.
This shows the real-world accuracy gap that additional datasets could close.

LiDAR accuracy: ±0.5-1.5mm (single-pass iPhone 14 Pro+)
This is our best available ground truth for girth measurements.

Usage:
  # Validate against existing LiDAR scans in the database:
  python scripts/validate_with_lidar.py

  # Validate against a specific LiDAR JSON file:
  python scripts/validate_with_lidar.py --cloud scan.json

  # Validate against all JSON files in a directory:
  python scripts/validate_with_lidar.py --scan_dir data/lidar_scans/
"""

import argparse
import json
import sqlite3
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ML_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(ML_DIR / 'scripts'))

from anthro_stats import estimate_girths, GIRTH_REGRESSIONS, GIRTH_REGRESSIONS_V2
from process_lidar import measure_foot


GIRTH_KEYS = ['ball_girth', 'instep_girth', 'waist_girth', 'heel_girth', 'ankle_girth']


def validate_single_scan(point_cloud: list[dict], label: str = "") -> dict | None:
    """Process a single LiDAR scan and compare against regression predictions."""
    try:
        lidar = measure_foot(point_cloud)
    except Exception as e:
        print(f"  [WARN] LiDAR processing failed{f' ({label})' if label else ''}: {e}")
        return None

    length = lidar['length']
    width = lidar['width']

    # Predict girths using legacy regression (length + width only)
    legacy_pred = {}
    for key, coefs in GIRTH_REGRESSIONS.items():
        legacy_pred[key] = coefs['width'] * width + coefs['length'] * length + coefs['intercept']

    # Predict girths using V2 regression (cross-feature)
    v2_pred = estimate_girths(length, width)

    # Compare
    result = {
        'label': label,
        'length': length,
        'width': width,
        'height': lidar.get('height'),
        'arch_height': lidar.get('arch_height'),
        'point_count': lidar.get('point_count'),
    }

    for key in GIRTH_KEYS:
        gt = lidar.get(key)
        if gt is None:
            continue
        result[f'{key}_lidar'] = round(gt, 1)
        result[f'{key}_legacy'] = round(legacy_pred.get(key, legacy_pred.get(f'long_{key}', 0)), 1)
        result[f'{key}_v2'] = round(v2_pred.get(key, 0), 1)
        result[f'{key}_err_legacy'] = round(abs(gt - legacy_pred.get(key, legacy_pred.get(f'long_{key}', 0))), 1)
        result[f'{key}_err_v2'] = round(abs(gt - v2_pred.get(key, 0)), 1)

    return result


def load_scans_from_db(db_path: Path) -> list[dict]:
    """Load LiDAR scans from the backend database."""
    if not db_path.exists():
        return []

    con = sqlite3.connect(str(db_path))
    con.row_factory = sqlite3.Row

    # Check if foot_scans has LiDAR data
    try:
        rows = con.execute("""
            SELECT id, right_length, right_width, right_ball_girth,
                   right_heel_girth, right_ankle_girth,
                   right_instep_girth, right_waist_girth,
                   source, scan_data
            FROM foot_scans
            WHERE source = 'lidar'
              AND scan_data IS NOT NULL
        """).fetchall()
    except Exception:
        rows = []

    scans = []
    for row in rows:
        try:
            scan_data = json.loads(row['scan_data'])
            if 'point_cloud' in scan_data:
                scans.append({
                    'id': row['id'],
                    'point_cloud': scan_data['point_cloud'],
                    'db_measurements': {
                        'length': row['right_length'],
                        'width': row['right_width'],
                        'ball_girth': row['right_ball_girth'],
                        'heel_girth': row['right_heel_girth'],
                        'ankle_girth': row['right_ankle_girth'],
                    },
                })
        except Exception:
            pass

    con.close()
    return scans


def load_scans_from_dir(scan_dir: Path) -> list[dict]:
    """Load LiDAR scans from JSON files in a directory."""
    scans = []
    for json_file in sorted(scan_dir.glob('*.json')):
        try:
            with open(json_file) as f:
                data = json.load(f)
            # Support both raw point cloud and wrapped format
            if isinstance(data, list):
                scans.append({'id': json_file.stem, 'point_cloud': data})
            elif 'point_cloud' in data:
                scans.append({'id': json_file.stem, 'point_cloud': data['point_cloud']})
            elif 'points' in data:
                scans.append({'id': json_file.stem, 'point_cloud': data['points']})
        except Exception as e:
            print(f"  [WARN] {json_file.name}: {e}")
    return scans


def validate_with_synthetic_lidar():
    """Generate synthetic LiDAR-quality measurements from 3D meshes as ground truth.

    Uses the existing Foot3D OBJ meshes and computes girths via the same
    alpha-hull method as the LiDAR pipeline. This gives us ground truth
    for evaluating the regression accuracy.
    """
    print("\n  Generating ground truth from Foot3D OBJ meshes (alpha-hull girths)...")

    girths_path = ML_DIR / 'data' / 'girths.csv'
    meas_path = ML_DIR / 'data' / 'measurements.csv'

    if girths_path.exists():
        girths_df = pd.read_csv(girths_path)
        print(f"  → Loaded {len(girths_df)} entries from girths.csv")
    elif meas_path.exists():
        # Compute girths from OBJ meshes
        print("  → Computing girths from OBJ meshes (this may take a few minutes)...")
        from compute_girths_lib import compute_girths_for_obj
        meas_df = pd.read_csv(meas_path)
        results = []
        for _, row in meas_df.iterrows():
            obj_path = row.get('obj_path')
            if obj_path and Path(obj_path).exists():
                r = compute_girths_for_obj(obj_path)
                if r:
                    r['foot_id'] = row['foot_id']
                    results.append(r)
        girths_df = pd.DataFrame(results)
        print(f"  → Computed girths for {len(girths_df)} meshes")
    else:
        return None

    if len(girths_df) == 0:
        return None

    # Rename columns to standard names
    rename = {'foot_length': 'length', 'foot_width': 'width', 'foot_height': 'height'}
    girths_df = girths_df.rename(columns=rename)

    return girths_df


def print_validation_report(results: list[dict], source_name: str = "LiDAR"):
    """Print accuracy comparison table."""
    if not results:
        print(f"\n  No {source_name} results to report.")
        return

    print(f"\n{'='*75}")
    print(f"  VALIDATION REPORT — {source_name} Ground Truth ({len(results)} scans)")
    print(f"{'='*75}")

    print(f"\n  {'Girth':<20} {'Legacy MAE':>12} {'V2 MAE':>12} {'Verbesserung':>14} {'N':>5}")
    print(f"  {'-'*65}")

    for key in GIRTH_KEYS:
        err_legacy = [r[f'{key}_err_legacy'] for r in results if f'{key}_err_legacy' in r]
        err_v2 = [r[f'{key}_err_v2'] for r in results if f'{key}_err_v2' in r]

        if not err_legacy:
            continue

        mae_legacy = np.mean(err_legacy)
        mae_v2 = np.mean(err_v2)
        improvement = (mae_legacy - mae_v2) / mae_legacy * 100 if mae_legacy > 0 else 0

        print(f"  {key:<20} {mae_legacy:>10.2f}mm {mae_v2:>10.2f}mm "
              f"{improvement:>+12.1f}% {len(err_legacy):>5}")

    # Overall
    all_legacy = [r[f'{k}_err_legacy'] for r in results for k in GIRTH_KEYS
                  if f'{k}_err_legacy' in r]
    all_v2 = [r[f'{k}_err_v2'] for r in results for k in GIRTH_KEYS
              if f'{k}_err_v2' in r]

    if all_legacy:
        print(f"  {'-'*65}")
        mae_l = np.mean(all_legacy)
        mae_v = np.mean(all_v2)
        imp = (mae_l - mae_v) / mae_l * 100
        print(f"  {'OVERALL':<20} {mae_l:>10.2f}mm {mae_v:>10.2f}mm "
              f"{imp:>+12.1f}% {len(all_legacy):>5}")

    # Per-scan detail table
    print(f"\n  Per-scan details:")
    print(f"  {'Scan':<15} {'Length':>8} {'Width':>8} ", end='')
    for key in GIRTH_KEYS:
        short = key.replace('_girth', '')[:6]
        print(f"{'GT':>6} {'Err':>6} ", end='')
    print()
    print(f"  {'-'*90}")

    for r in results[:20]:  # max 20 rows
        print(f"  {r.get('label','?'):<15} {r.get('length',0):>8.1f} {r.get('width',0):>8.1f} ", end='')
        for key in GIRTH_KEYS:
            gt = r.get(f'{key}_lidar', 0)
            err = r.get(f'{key}_err_v2', 0)
            print(f"{gt:>6.0f} {err:>+5.1f} ", end='')
        print()


def main():
    parser = argparse.ArgumentParser(description='Validate girth regressions against LiDAR ground truth')
    parser.add_argument('--cloud', help='Single LiDAR JSON file')
    parser.add_argument('--scan_dir', help='Directory with LiDAR JSON files')
    parser.add_argument('--db', default=str(ML_DIR / '..' / 'atelier-backend' / 'atelier.db'))
    parser.add_argument('--use_meshes', action='store_true', default=True,
                        help='Use Foot3D mesh girths as ground truth (default: True)')
    args = parser.parse_args()

    print('=' * 75)
    print('  LIDAR GROUND-TRUTH VALIDATION')
    print('  Compares regression-predicted girths against direct 3D measurements')
    print('=' * 75)

    all_results = []

    # Source 1: Single file
    if args.cloud:
        cloud_path = Path(args.cloud)
        if cloud_path.exists():
            with open(cloud_path) as f:
                data = json.load(f)
            pc = data if isinstance(data, list) else data.get('point_cloud', data.get('points', []))
            r = validate_single_scan(pc, label=cloud_path.stem)
            if r:
                all_results.append(r)

    # Source 2: Directory of scans
    if args.scan_dir:
        scan_dir = Path(args.scan_dir)
        if scan_dir.exists():
            scans = load_scans_from_dir(scan_dir)
            print(f"\n  Found {len(scans)} LiDAR JSON files in {scan_dir}")
            for scan in scans:
                r = validate_single_scan(scan['point_cloud'], label=str(scan['id']))
                if r:
                    all_results.append(r)

    # Source 3: Database
    db_path = Path(args.db)
    if db_path.exists():
        scans = load_scans_from_db(db_path)
        if scans:
            print(f"\n  Found {len(scans)} LiDAR scans in database")
            for scan in scans:
                r = validate_single_scan(scan['point_cloud'], label=f"db_{scan['id']}")
                if r:
                    all_results.append(r)

    if all_results:
        print_validation_report(all_results, "LiDAR")

    # Source 4: Foot3D meshes as ground truth (always available)
    if args.use_meshes:
        girths_df = validate_with_synthetic_lidar()
        if girths_df is not None and len(girths_df) > 0:
            mesh_results = []
            for _, row in girths_df.iterrows():
                length = row.get('length', 0)
                width = row.get('width', 0)
                if length < 150 or width < 50:
                    continue

                # Legacy prediction
                legacy = {}
                for key, coefs in GIRTH_REGRESSIONS.items():
                    legacy[key] = coefs['width'] * width + coefs['length'] * length + coefs['intercept']

                # V2 prediction
                v2 = estimate_girths(length, width)

                r = {
                    'label': str(row.get('foot_id', '?')),
                    'length': length,
                    'width': width,
                }

                for key in GIRTH_KEYS:
                    gt = row.get(key, None)
                    if gt is None or gt < 50:
                        continue
                    r[f'{key}_lidar'] = round(float(gt), 1)
                    r[f'{key}_legacy'] = round(legacy.get(key, legacy.get(f'long_{key}', 0)), 1)
                    r[f'{key}_v2'] = round(v2.get(key, 0), 1)
                    r[f'{key}_err_legacy'] = round(abs(float(gt) - legacy.get(key, legacy.get(f'long_{key}', 0))), 1)
                    r[f'{key}_err_v2'] = round(abs(float(gt) - v2.get(key, 0)), 1)

                mesh_results.append(r)

            if mesh_results:
                print_validation_report(mesh_results, "Foot3D Mesh (alpha-hull)")

    if not all_results and not (args.use_meshes):
        print("\n  No LiDAR data found. Options:")
        print("  1. Process a scan:    python validate_with_lidar.py --cloud scan.json")
        print("  2. Scan directory:    python validate_with_lidar.py --scan_dir data/lidar_scans/")
        print("  3. Use mesh girths:   python validate_with_lidar.py --use_meshes")


if __name__ == '__main__':
    main()

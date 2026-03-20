"""
import_dryad_foot.py — Import Dryad Foot Shape dataset (100 PLY meshes).

Processes PLY meshes from the Dryad Foot Shape dataset, extracts precise
measurements including girths via alpha-hull computation. Provides independent
validation data with CC0 license.

Source: Dryad Digital Repository (search "foot shape 3D scan")
License: CC0
Format: PLY meshes (~100 subjects)

Usage:
  python scripts/import_dryad_foot.py
  python scripts/import_dryad_foot.py --data_dir data/dryad_foot

Output:
  data/dryad_foot_measurements.csv — ground-truth measurements from PLY scans
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ML_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(ML_DIR / 'scripts'))

try:
    import trimesh
except ImportError:
    sys.exit('[ERROR] trimesh nicht installiert: pip install trimesh')


def _alpha_hull_perimeter(pts_2d: np.ndarray, alpha: float = 10.0) -> float:
    """Alpha-hull perimeter of 2D point cloud (mm)."""
    from scipy.spatial import Delaunay, ConvexHull

    if len(pts_2d) < 4:
        try:
            return float(ConvexHull(pts_2d).area)
        except Exception:
            return 0.0

    try:
        tri = Delaunay(pts_2d)
        edge_count = {}
        for simplex in tri.simplices:
            ax, ay = pts_2d[simplex[0]]
            bx, by = pts_2d[simplex[1]]
            cx, cy = pts_2d[simplex[2]]
            D = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by))
            if abs(D) < 1e-10:
                continue
            ux = ((ax**2 + ay**2) * (by - cy) + (bx**2 + by**2) * (cy - ay) +
                  (cx**2 + cy**2) * (ay - by)) / D
            uy = ((ax**2 + ay**2) * (cx - bx) + (bx**2 + by**2) * (ax - cx) +
                  (cx**2 + cy**2) * (bx - ax)) / D
            R = np.hypot(ax - ux, ay - uy)
            if R > alpha:
                continue
            for i in range(3):
                a, b = int(simplex[i]), int(simplex[(i + 1) % 3])
                key = (min(a, b), max(a, b))
                edge_count[key] = edge_count.get(key, 0) + 1

        boundary = [k for k, c in edge_count.items() if c == 1]
        if not boundary:
            raise ValueError('no boundary')
        return sum(np.linalg.norm(pts_2d[e[0]] - pts_2d[e[1]]) for e in boundary)

    except Exception:
        try:
            return float(ConvexHull(pts_2d).area)
        except Exception:
            return 0.0


def extract_measurements_from_ply(mesh_path: Path) -> dict | None:
    """Extract all foot measurements from a PLY mesh."""
    try:
        mesh = trimesh.load(str(mesh_path), force='mesh', process=True)
        if not hasattr(mesh, 'vertices') or len(mesh.vertices) < 100:
            return None

        verts = np.array(mesh.vertices, dtype=np.float64)

        # Auto-detect unit
        extent = max(verts.max(axis=0) - verts.min(axis=0))
        if extent < 1.0:
            verts *= 1000.0
        elif extent < 10.0:
            verts *= 10.0

        # PCA orientation
        centered = verts - verts.mean(axis=0)
        cov = np.cov(centered.T)
        eigenvalues, eigenvectors = np.linalg.eigh(cov)
        order = np.argsort(eigenvalues)[::-1]
        rotated = centered @ eigenvectors[:, order]

        # Sort axes by extent: Z=longest(length), X=mid(width), Y=shortest(height)
        extents = rotated.max(axis=0) - rotated.min(axis=0)
        axis_order = np.argsort(extents)
        rotated = rotated[:, [axis_order[1], axis_order[0], axis_order[2]]]

        rotated[:, 1] -= rotated[:, 1].min()
        rotated[:, 2] -= rotated[:, 2].min()

        # Voxel normalization
        vox_idx = np.floor(rotated / 0.5).astype(np.int64)
        _, unique_idx = np.unique(vox_idx, axis=0, return_index=True)
        verts_norm = rotated[unique_idx]

        foot_length = float(np.percentile(verts_norm[:, 2], 99.5) -
                           np.percentile(verts_norm[:, 2], 0.5))
        foot_width = float(np.percentile(verts_norm[:, 0], 99.5) -
                          np.percentile(verts_norm[:, 0], 0.5))
        foot_height = float(np.percentile(verts_norm[:, 1], 99.5) -
                           np.percentile(verts_norm[:, 1], 0.5))

        if not (150 < foot_length < 350) or not (50 < foot_width < 140):
            return None

        # Arch height
        z_30 = foot_length * 0.30
        z_65 = foot_length * 0.65
        midfoot = verts_norm[(verts_norm[:, 2] >= z_30) & (verts_norm[:, 2] <= z_65)]
        if len(midfoot) > 10:
            x_median = np.median(midfoot[:, 0])
            medial = midfoot[midfoot[:, 0] < x_median]
            arch_height = float(medial[:, 1].min()) if len(medial) > 5 else 14.0
        else:
            arch_height = 14.0

        result = {
            'length': round(foot_length, 1),
            'width': round(foot_width, 1),
            'foot_height': round(foot_height, 1),
            'arch_height': round(max(arch_height, 0), 1),
        }

        # Girths
        girth_fracs = {
            'ball_girth':   0.40,
            'waist_girth':  0.45,
            'instep_girth': 0.60,
            'heel_girth':   0.85,
            'ankle_girth':  0.88,
        }

        for girth_name, frac in girth_fracs.items():
            z_pos = frac * foot_length
            mask = np.abs(verts_norm[:, 2] - z_pos) < 5.0
            pts = verts_norm[mask]
            if len(pts) < 6:
                result[girth_name] = None
                continue
            perimeter = _alpha_hull_perimeter(pts[:, :2], alpha=10.0)
            result[girth_name] = round(perimeter, 1) if perimeter > 50 else None

        result['long_heel_girth'] = result.get('heel_girth')
        result['short_heel_girth'] = (round(result['heel_girth'] * 0.90, 1)
                                      if result.get('heel_girth') else None)
        result['n_vertices'] = len(verts)
        return result

    except Exception as e:
        print(f'  [WARN] {mesh_path.name}: {e}')
        return None


def import_dryad(data_dir: Path) -> pd.DataFrame:
    """Import all PLY/OBJ meshes from Dryad directory."""
    print(f'[Dryad Foot Shape] Scanning {data_dir} for mesh files...')

    mesh_files = []
    for ext in ('*.ply', '*.obj', '*.stl'):
        mesh_files.extend(data_dir.rglob(ext))
    mesh_files = sorted(mesh_files)

    print(f'  Found {len(mesh_files)} mesh files')

    if not mesh_files:
        print(f'  [INFO] No mesh files found in {data_dir}')
        print(f'  Download from Dryad Digital Repository')
        print(f'  Place PLY files in: {data_dir}/')
        return pd.DataFrame()

    records = []
    for i, mesh_path in enumerate(mesh_files, 1):
        meas = extract_measurements_from_ply(mesh_path)
        if meas is None:
            continue

        name_lower = mesh_path.stem.lower()
        side = 'unknown'
        if 'left' in name_lower or '_l' in name_lower:
            side = 'left'
        elif 'right' in name_lower or '_r' in name_lower:
            side = 'right'

        record = {
            'source': 'dryad_foot',
            'foot_id': f'dryad_{i:04d}',
            'mesh_path': str(mesh_path),
            'side': side,
            **meas,
        }
        records.append(record)

        if i % 20 == 0 or i == len(mesh_files):
            print(f'  [{i:>4}/{len(mesh_files)}] processed ({len(records)} OK)')

    return pd.DataFrame(records)


def main():
    parser = argparse.ArgumentParser(description='Import Dryad Foot Shape dataset')
    parser.add_argument('--data_dir', default=str(ML_DIR / 'data' / 'dryad_foot'))
    parser.add_argument('--out', default=str(ML_DIR / 'data' / 'dryad_foot_measurements.csv'))
    args = parser.parse_args()

    data_dir = Path(args.data_dir)
    data_dir.mkdir(parents=True, exist_ok=True)

    df = import_dryad(data_dir)

    if len(df) == 0:
        print('\n[Dryad] No data processed.')
        print('To use this script:')
        print(f'  1. Download Dryad Foot Shape dataset (CC0)')
        print(f'  2. Place PLY files in: {data_dir}/')
        print(f'  3. Re-run: python scripts/import_dryad_foot.py')
        return

    df.to_csv(args.out, index=False)
    print(f'\n[Dryad] {len(df)} measurements saved → {args.out}')

    print(f'\n  Statistics:')
    for col in ['length', 'width', 'ball_girth', 'heel_girth', 'ankle_girth',
                'instep_girth', 'waist_girth', 'arch_height']:
        if col in df.columns:
            vals = df[col].dropna()
            if len(vals) > 0:
                print(f'    {col:<22} {vals.mean():7.1f} +/- {vals.std():5.1f} mm  '
                      f'[{vals.min():.0f}-{vals.max():.0f}]  N={len(vals)}')


if __name__ == '__main__':
    main()

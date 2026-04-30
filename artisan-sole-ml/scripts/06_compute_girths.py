"""
06_compute_girths.py — Berechnet Girth-Maße aus 3D OBJ-Meshes.

Für jeden synthetischen Fuß:
  - Lädt das OBJ mit trimesh
  - Schneidet das Mesh bei 5 Girth-Positionen (alpha-hull wie in process_lidar.py)
  - Speichert Ergebnisse in data/girths.csv

Verwendung:
  python3 scripts/06_compute_girths.py
  python3 scripts/06_compute_girths.py --workers 8

Output:
  data/girths.csv  — foot_id, ball_girth, waist_girth, instep_girth, heel_girth, ankle_girth (mm)
"""

import argparse
import csv
import sys
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path

import numpy as np

ML_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(ML_DIR / 'scripts'))

try:
    import trimesh
except ImportError:
    sys.exit('[ERROR] trimesh nicht installiert: pip install trimesh')

# ── Girth-Positionen (gleich wie process_lidar.py) ───────────────────────────
GIRTH_FRACS = {
    'ball_girth':   0.40,  # 0 = Zehe, 1 = Ferse
    'waist_girth':  0.45,
    'instep_girth': 0.60,
    'heel_girth':   0.85,
    'ankle_girth':  0.88,
}
BAND_M = 0.005  # ±5 mm cross-section band
ALPHA_M = 0.010  # alpha-hull radius (10 mm)


# ── Hilfsfunktionen ───────────────────────────────────────────────────────────

def align_mesh(mesh: trimesh.Trimesh) -> tuple[np.ndarray, float, float]:
    """Gibt Vertex-Array (N,3) zurück, ausgerichtet: X=Breite, Y=Höhe, Z=Länge.
    Gibt auch foot_length und foot_height in mm zurück.
    """
    verts = np.array(mesh.vertices, dtype=np.float32)
    # OBJ Koordinaten: X=width, Y=height, Z=length (toe→heel)
    # Z-Bereich = Fußlänge
    z_min, z_max = verts[:, 2].min(), verts[:, 2].max()
    foot_length = float(z_max - z_min)
    foot_height = float(verts[:, 1].max() - verts[:, 1].min())
    # Verschieben sodass Zehe bei 0
    verts[:, 2] -= z_min
    return verts, foot_length, foot_height


def alpha_hull_perimeter(pts_2d: np.ndarray, alpha: float = ALPHA_M * 1000) -> float:
    """Alpha-Hull-Umfang einer 2D Punktwolke (in mm).
    Fällt auf ConvexHull zurück wenn zu wenige Punkte.
    """
    from scipy.spatial import Delaunay
    pts = pts_2d
    if len(pts) < 4:
        from scipy.spatial import ConvexHull
        try:
            hull = ConvexHull(pts)
            return float(hull.area)  # 2D → .area = perimeter
        except Exception:
            return 0.0

    try:
        tri = Delaunay(pts)
        edge_count: dict[tuple, int] = {}
        for simplex in tri.simplices:
            for i in range(3):
                a, b = int(simplex[i]), int(simplex[(i + 1) % 3])
                pa, pb = pts[a], pts[b]
                # Umkreisradius des Dreiecks
                ax, ay = pts[simplex[0]]
                bx, by = pts[simplex[1]]
                cx, cy = pts[simplex[2]]
                D = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by))
                if abs(D) < 1e-10:
                    continue
                ux = ((ax**2 + ay**2) * (by - cy) + (bx**2 + by**2) * (cy - ay) + (cx**2 + cy**2) * (ay - by)) / D
                uy = ((ax**2 + ay**2) * (cx - bx) + (bx**2 + by**2) * (ax - cx) + (cx**2 + cy**2) * (bx - ax)) / D
                R = np.hypot(ax - ux, ay - uy)
                if R > alpha:
                    continue
                key = (min(a, b), max(a, b))
                edge_count[key] = edge_count.get(key, 0) + 1

        boundary = [k for k, c in edge_count.items() if c == 1]
        if not boundary:
            raise ValueError('no boundary')
        return sum(np.linalg.norm(pts[e[0]] - pts[e[1]]) for e in boundary)

    except Exception:
        from scipy.spatial import ConvexHull
        try:
            hull = ConvexHull(pts)
            return float(hull.area)
        except Exception:
            return 0.0


def girth_at_fraction(verts: np.ndarray, foot_length: float,
                      frac: float, band_mm: float = BAND_M * 1000) -> float:
    """Schneidet Mesh bei frac×length und berechnet Alpha-Hull-Umfang (mm)."""
    z_pos = frac * foot_length
    mask = np.abs(verts[:, 2] - z_pos) < band_mm
    pts = verts[mask]
    if len(pts) < 6:
        return 0.0
    # XY-Ebene (Breite × Höhe) für Girth
    pts_2d = pts[:, :2]  # (X=width, Y=height)
    return alpha_hull_perimeter(pts_2d, alpha=ALPHA_M * 1000)


def compute_girths_for_obj(obj_path: str) -> dict | None:
    """Lädt OBJ und berechnet alle 5 Girths + Länge + Breite + Höhe."""
    try:
        mesh = trimesh.load(obj_path, force='mesh', process=False)
        if not hasattr(mesh, 'vertices') or len(mesh.vertices) < 100:
            return None

        verts, foot_length, foot_height = align_mesh(mesh)

        # Voxel-Normalisierung: 0.5mm Voxel → gleichmäßige Punktdichte
        vox = 0.5
        vox_idx = np.floor(verts / vox).astype(np.int64)
        # Pack zu unique keys
        scale = np.array([1, vox_idx[:, 1].max() + 2, (vox_idx[:, 1].max() + 2) * (vox_idx[:, 2].max() + 2)], dtype=np.int64)
        keys = vox_idx @ scale
        order = np.argsort(keys)
        keys_sorted = keys[order]
        _, first = np.unique(keys_sorted, return_index=True)
        verts = verts[order[first]]

        # Bounding box (percentile)
        foot_width = float(np.percentile(verts[:, 0], 99.5) - np.percentile(verts[:, 0], 0.5))

        result = {
            'foot_length': round(foot_length, 2),
            'foot_width': round(foot_width, 2),
            'foot_height': round(foot_height, 2),
        }
        for name, frac in GIRTH_FRACS.items():
            g = girth_at_fraction(verts, foot_length, frac)
            result[name] = round(g, 2)

        return result

    except Exception as e:
        print(f'[WARN] {obj_path}: {e}')
        return None


def process_one(row: dict) -> dict | None:
    obj_path = row['obj_path']
    if not Path(obj_path).exists():
        print(f'[SKIP] not found: {obj_path}')
        return None
    girths = compute_girths_for_obj(obj_path)
    if girths is None:
        return None
    return {
        'foot_id': row['foot_id'],
        'side': row['side'],
        **girths,
    }


# ── Hauptskript ───────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--workers', type=int, default=4, help='Parallelisierung')
    parser.add_argument('--out', default=str(ML_DIR / 'data' / 'girths.csv'))
    args = parser.parse_args()

    import pandas as pd
    meas_csv = ML_DIR / 'data' / 'measurements.csv'
    if not meas_csv.exists():
        sys.exit(f'[ERROR] {meas_csv} nicht gefunden. Zuerst 02_extract_measurements.py ausführen.')

    df = pd.read_csv(meas_csv)
    rows = df.to_dict('records')
    print(f'→ {len(rows)} OBJ-Meshes werden verarbeitet ...')

    results = []
    if args.workers == 1:
        for i, row in enumerate(rows):
            r = process_one(row)
            if r:
                results.append(r)
            if (i + 1) % 50 == 0:
                print(f'  {i+1}/{len(rows)} ({len(results)} OK)')
    else:
        with ProcessPoolExecutor(max_workers=args.workers) as ex:
            futures = {ex.submit(process_one, r): r for r in rows}
            for i, fut in enumerate(as_completed(futures)):
                r = fut.result()
                if r:
                    results.append(r)
                if (i + 1) % 50 == 0:
                    print(f'  {i+1}/{len(rows)} ({len(results)} OK)')

    if not results:
        sys.exit('[ERROR] Keine Ergebnisse – OBJ-Dateien korrekt?')

    out_df = pd.DataFrame(results)
    out_df.to_csv(args.out, index=False)
    print(f'\n✓ {len(out_df)} Einträge gespeichert → {args.out}')
    print(out_df.describe().round(1).to_string())


if __name__ == '__main__':
    main()

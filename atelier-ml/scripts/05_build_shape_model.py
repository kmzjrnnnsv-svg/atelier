"""
05_build_shape_model.py — PCA Statistical Shape Model aus 600 Fuß-Meshes.

Verwendung:
  python3 scripts/05_build_shape_model.py

Output (in data/shape_model/):
  mean_shape.npy        (6400, 3)    — Mittlere Fußform
  components.npy        (k, 19200)   — PCA-Komponenten (k = bis 95% Varianz)
  explained_variance.npy (k,)        — Erklärte Varianz je Komponente
  scale_factors.npy     (2,)         — [mean_scale, std_scale] für Normalisierung
  pca_labels.csv                     — foot_id + pca_0..pca_{k-1} + mm-Labels

Voraussetzungen:
  pip install trimesh scikit-learn numpy pandas
"""

import sys
import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.decomposition import PCA

try:
    import trimesh
    HAS_TRIMESH = True
except ImportError:
    HAS_TRIMESH = False
    print('[ERROR] trimesh nicht installiert: pip install trimesh')
    sys.exit(1)

# ── Pfade ────────────────────────────────────────────────────────────────────
ROOT       = Path(__file__).parent.parent
DATA_DIR   = ROOT / 'data'
FOOT3D_DIR = DATA_DIR / 'foot3d'
OUT_DIR    = DATA_DIR / 'shape_model'
MEAS_CSV   = DATA_DIR / 'measurements.csv'

N_COMPONENTS_MAX = 80     # Obergrenze PCA-Komponenten
VARIANCE_THRESH  = 0.95   # 95% erklärte Varianz behalten
EXPECTED_VERTS   = 6400   # 80×40 Grid


def orient_mesh(verts: np.ndarray) -> np.ndarray:
    """
    Orientiert Mesh-Vertices: Z=Länge, X=Breite, Y=Höhe.
    Y_min → 0 (Boden).
    Gibt (N, 3) zurück.
    """
    # PCA der Vertices um die Hauptachse zu bestimmen
    center = verts.mean(axis=0)
    v = verts - center

    # Kovarianzmatrix
    cov = np.cov(v.T)
    eigvals, eigvecs = np.linalg.eigh(cov)
    order = np.argsort(eigvals)[::-1]
    axes  = eigvecs[:, order]  # Spalten sind Achsen, absteigend nach Varianz

    # Hauptachse (größte Varianz) = Länge → Z
    # Mittlere Varianz = Breite → X
    # Kleinste Varianz = Höhe → Y
    rot = axes.T  # (3,3): jede Zeile ist eine neue Achse
    v_rot = v @ rot.T

    # Stelle sicher: längste Ausdehnung ist Z (Achse 0 nach sort)
    extents = v_rot.max(axis=0) - v_rot.min(axis=0)
    # Z sollte größte Ausdehnung haben; falls nicht, vertausche
    if extents[2] < extents[0]:
        v_rot = v_rot[:, [2, 1, 0]]  # tausche Z↔X
    if extents[2] < extents[1]:
        v_rot = v_rot[:, [0, 2, 1]]  # tausche Z↔Y

    # Boden auf Y=0
    v_rot[:, 1] -= v_rot[:, 1].min()

    # Ferse auf Z=0 (kleinerer Z-Wert)
    v_rot[:, 2] -= v_rot[:, 2].min()

    return v_rot


def load_mesh_vertices(obj_path: Path) -> np.ndarray | None:
    """Lädt OBJ und gibt (N, 3) Vertices zurück. Vertex-Reihenfolge bleibt erhalten."""
    try:
        mesh = trimesh.load(str(obj_path), process=False, force='mesh')
        if not hasattr(mesh, 'vertices'):
            return None
        verts = np.array(mesh.vertices, dtype=np.float32)
        return verts
    except Exception as e:
        print(f'  [WARN] {obj_path.name}: {e}')
        return None


def extract_measurements_from_verts(verts: np.ndarray) -> dict:
    """
    Berechnet alle 8 Fußmaße analytisch aus Vertex-Positionen.
    verts: (N, 3) orientiert — X=Breite, Y=Höhe, Z=Länge
    Returns dict mit mm-Werten.
    """
    x, y, z = verts[:, 0], verts[:, 1], verts[:, 2]
    length = z.max() - z.min()

    # Ball width at ~28% of length (Ballenbereich)
    z_ball = z.min() + 0.28 * length
    z_tol  = length * 0.05
    ball_mask = np.abs(z - z_ball) < z_tol
    if ball_mask.sum() > 3:
        ball_width = x[ball_mask].max() - x[ball_mask].min()
    else:
        ball_width = x.max() - x.min()

    # Arch height: min Y in medial midfoot (30–65% Z, medial half)
    mid_mask = (z >= z.min() + 0.30 * length) & (z <= z.min() + 0.65 * length)
    mid_verts = verts[mid_mask]
    if len(mid_verts) > 5:
        median_x    = np.median(mid_verts[:, 0])
        medial_mask = mid_verts[:, 0] < median_x
        if medial_mask.sum() > 3:
            arch_height = mid_verts[medial_mask, 1].min()
        else:
            arch_height = y.min()
    else:
        arch_height = 0.0

    # Girth measurements via cross-section perimeter
    def cross_section_perimeter(z_frac: float) -> float:
        z_target = z.min() + z_frac * length
        z_t      = length * 0.04
        mask     = np.abs(z - z_target) < z_t
        if mask.sum() < 4:
            return 0.0
        pts = verts[mask][:, :2]  # XY slice
        try:
            from scipy.spatial import ConvexHull
            hull = ConvexHull(pts)
            # Perimeter of convex hull
            verts_hull = pts[hull.vertices]
            perim = 0.0
            n = len(verts_hull)
            for i in range(n):
                p1, p2 = verts_hull[i], verts_hull[(i + 1) % n]
                perim += np.linalg.norm(p2 - p1)
            return float(perim)
        except Exception:
            # Fallback: estimate from bounding box
            return 2.0 * (pts[:, 0].max() - pts[:, 0].min() + pts[:, 1].max() - pts[:, 1].min())

    ball_girth   = cross_section_perimeter(0.28)
    instep_girth = cross_section_perimeter(0.45)
    heel_girth   = cross_section_perimeter(0.08)
    waist_girth  = cross_section_perimeter(0.50)

    # Ankle girth: slightly above the foot (estimated from upper vertices)
    ankle_girth = cross_section_perimeter(0.10) * 1.05  # approx

    return {
        'length':       float(length),
        'ball_width':   float(ball_width),
        'ball_girth':   float(ball_girth),
        'instep_girth': float(instep_girth),
        'heel_girth':   float(heel_girth),
        'arch_height':  float(arch_height),
        'waist_girth':  float(waist_girth),
        'ankle_girth':  float(ankle_girth),
    }


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f'[ShapeModel] Lade Meshes aus {FOOT3D_DIR}')

    # Finde alle OBJ-Dateien
    obj_files = sorted(FOOT3D_DIR.glob('**/*.obj'))
    if not obj_files:
        # Versuche .off oder andere Formate
        obj_files = sorted(FOOT3D_DIR.glob('**/*.off'))
    print(f'[ShapeModel] {len(obj_files)} Mesh-Dateien gefunden')

    if len(obj_files) == 0:
        print('[ERROR] Keine OBJ-Dateien in data/foot3d/ gefunden.')
        print('  Bitte zuerst: python3 scripts/00_generate_feet.py')
        return

    # Lade measurements.csv für mm-Labels
    meas_df = None
    if MEAS_CSV.exists():
        meas_df = pd.read_csv(MEAS_CSV)
        print(f'[ShapeModel] measurements.csv: {len(meas_df)} Einträge')

    # ── Lade alle Meshes ──────────────────────────────────────────────────────
    shapes    = []  # Liste von (N, 3) orientiert
    foot_ids  = []
    n_verts_counts = {}
    errors    = 0

    for obj_path in obj_files:
        verts = load_mesh_vertices(obj_path)
        if verts is None:
            errors += 1
            continue

        n = len(verts)
        n_verts_counts[n] = n_verts_counts.get(n, 0) + 1

        verts_oriented = orient_mesh(verts)
        shapes.append(verts_oriented)
        foot_ids.append(obj_path.stem)

    print(f'[ShapeModel] Geladen: {len(shapes)} Meshes ({errors} Fehler)')
    print(f'[ShapeModel] Vertex-Anzahl-Verteilung: {dict(sorted(n_verts_counts.items()))}')

    if len(shapes) < 5:
        print('[ERROR] Zu wenige Meshes für PCA.')
        return

    # ── Normalize vertex count ────────────────────────────────────────────────
    # Most common vertex count wins
    most_common_n = max(n_verts_counts, key=n_verts_counts.get)
    print(f'[ShapeModel] Verwende Meshes mit {most_common_n} Vertices')

    # Filter shapes to most common vertex count
    filtered = [(s, fid) for s, fid in zip(shapes, foot_ids) if len(s) == most_common_n]
    print(f'[ShapeModel] Nach Filter: {len(filtered)} Meshes')

    if len(filtered) < 5:
        print('[WARN] Zu wenige gleichartige Meshes. Versuche alle Meshes mit Padding.')
        # Use all meshes, pad/truncate to most_common_n
        filtered_shapes = []
        filtered_ids = []
        for s, fid in zip(shapes, foot_ids):
            if len(s) >= most_common_n:
                filtered_shapes.append(s[:most_common_n])
                filtered_ids.append(fid)
            else:
                # Pad with last vertex
                pad = np.tile(s[-1:], (most_common_n - len(s), 1))
                filtered_shapes.append(np.vstack([s, pad]))
                filtered_ids.append(fid)
        shapes_arr = np.array(filtered_shapes, dtype=np.float32)
        foot_ids   = filtered_ids
    else:
        shapes_arr = np.array([s for s, _ in filtered], dtype=np.float32)
        foot_ids   = [fid for _, fid in filtered]

    n_meshes, n_verts, n_dims = shapes_arr.shape
    print(f'[ShapeModel] Shape-Matrix: {shapes_arr.shape} → Flatten zu ({n_meshes}, {n_verts * n_dims})')

    # ── Normalisiere Maßstab ──────────────────────────────────────────────────
    # Skaliere alle Meshes auf einheitliche Fußlänge (z.B. 260mm)
    lengths = shapes_arr[:, :, 2].max(axis=1) - shapes_arr[:, :, 2].min(axis=1)
    mean_scale = float(lengths.mean())
    std_scale  = float(lengths.std())
    print(f'[ShapeModel] Fußlängen: {lengths.min():.0f}–{lengths.max():.0f}mm (Ø {mean_scale:.0f}mm)')

    # ── PCA ──────────────────────────────────────────────────────────────────
    X = shapes_arr.reshape(n_meshes, -1)  # (N, 19200)

    n_comp = min(N_COMPONENTS_MAX, n_meshes - 1, X.shape[1])
    print(f'[ShapeModel] PCA mit {n_comp} Komponenten (max)…')
    pca = PCA(n_components=n_comp, random_state=42)
    pca.fit(X)

    # Bestimme k für 95% Varianz
    cumvar = np.cumsum(pca.explained_variance_ratio_)
    k = int(np.searchsorted(cumvar, VARIANCE_THRESH)) + 1
    k = min(k, n_comp)
    print(f'[ShapeModel] k = {k} Komponenten erklären {cumvar[k-1]*100:.1f}% Varianz')

    # Transformiere alle Meshes
    X_centered  = X - pca.mean_
    coefficients = X_centered @ pca.components_[:k].T  # (N, k)
    print(f'[ShapeModel] PCA-Koeffizienten-Matrix: {coefficients.shape}')

    # ── Berechne mm-Labels für alle Meshes ───────────────────────────────────
    print('[ShapeModel] Berechne Maße aus Vertices…')
    records = []
    for i, (s, fid) in enumerate(zip(shapes_arr, foot_ids)):
        m = extract_measurements_from_verts(s)
        row = {'foot_id': fid}
        for j in range(k):
            row[f'pca_{j}'] = float(coefficients[i, j])
        row.update(m)
        records.append(row)

    labels_df = pd.DataFrame(records)

    # Merge ground-truth measurements from measurements.csv
    if meas_df is not None and 'foot_id' in meas_df.columns:
        # Columns to merge from ground-truth (rename to avoid collision with extracted)
        gt_cols = ['foot_id']
        rename_map = {}
        for col in ['length', 'width', 'foot_height', 'arch_height',
                     'ball_girth', 'instep_girth', 'waist_girth',
                     'heel_girth', 'long_heel_girth', 'short_heel_girth',
                     'ankle_girth']:
            if col in meas_df.columns:
                gt_cols.append(col)
                # Use ground-truth values (overwrite mesh-extracted)
        gt_df = meas_df[gt_cols].copy()
        # Drop mesh-extracted columns that exist in ground truth
        for col in gt_df.columns:
            if col != 'foot_id' and col in labels_df.columns:
                labels_df = labels_df.drop(columns=[col])
        labels_df = labels_df.merge(gt_df, on='foot_id', how='left')
        print(f'[ShapeModel] Ground-truth Maße aus measurements.csv gemergt')

    # ── Append ANSUR II real measurements (no PCA coefficients, but adds
    #    measurement statistics for the regression in fit_pca_from_measurements)
    ansur_path = DATA_DIR / 'ansur2_measurements.csv'
    if ansur_path.exists():
        ansur_df = pd.read_csv(ansur_path)
        # Create matching rows with NaN PCA coefficients
        pca_col_names = [f'pca_{j}' for j in range(k)]
        meas_col_names = [c for c in labels_df.columns
                          if c != 'foot_id' and not c.startswith('pca_')]

        ansur_rows = []
        for _, arow in ansur_df.iterrows():
            row = {'foot_id': arow.get('foot_id', '')}
            for pc in pca_col_names:
                row[pc] = np.nan
            for mc in meas_col_names:
                row[mc] = arow.get(mc, np.nan)
            ansur_rows.append(row)

        ansur_labels = pd.DataFrame(ansur_rows)
        # Only include ANSUR rows that have required measurement columns
        required = ['length', 'width', 'ball_girth']
        has_req = ansur_labels[required].notna().all(axis=1)
        ansur_labels = ansur_labels[has_req]

        labels_df = pd.concat([labels_df, ansur_labels], ignore_index=True)
        print(f'[ShapeModel] +{len(ansur_labels)} ANSUR II Messungen angehängt → {len(labels_df)} total')

    # ── Speichere Outputs ─────────────────────────────────────────────────────
    mean_shape = pca.mean_.reshape(most_common_n, n_dims)
    components = pca.components_[:k]  # (k, 19200)
    expl_var   = pca.explained_variance_[:k]

    np.save(OUT_DIR / 'mean_shape.npy',          mean_shape.astype(np.float32))
    np.save(OUT_DIR / 'components.npy',           components.astype(np.float32))
    np.save(OUT_DIR / 'explained_variance.npy',   expl_var.astype(np.float32))
    np.save(OUT_DIR / 'scale_factors.npy',        np.array([mean_scale, std_scale], dtype=np.float32))
    labels_df.to_csv(OUT_DIR / 'pca_labels.csv', index=False)

    # Speichere Metadaten
    meta = {
        'n_meshes':         n_meshes,
        'n_vertices':       most_common_n,
        'n_components':     k,
        'variance_explained': float(cumvar[k-1]),
        'mean_foot_length_mm': mean_scale,
        'std_foot_length_mm':  std_scale,
        'label_columns':    [c for c in labels_df.columns if c not in ['foot_id'] and not c.startswith('pca_')],
    }
    with open(OUT_DIR / 'meta.json', 'w') as f:
        import json
        json.dump(meta, f, indent=2)

    print(f'\n✓ Shape Model gespeichert in {OUT_DIR}/')
    print(f'  mean_shape.npy:        {mean_shape.shape}')
    print(f'  components.npy:        {components.shape}')
    print(f'  explained_variance.npy:{expl_var.shape}')
    print(f'  pca_labels.csv:        {len(labels_df)} Zeilen, {len(labels_df.columns)} Spalten')
    print(f'\nNächste Schritte:')
    print(f'  python3 train_v2.py --epochs 50 --batch 8')


if __name__ == '__main__':
    main()

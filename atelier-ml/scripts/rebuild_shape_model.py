"""
rebuild_shape_model.py — Rebuilds PCA shape model with more components.

Problem: The current model has only 2 components (96.3% variance). But the
remaining 3.7% contains critical SHAPE variation (girths, arch height) that
was being lost. The 2 components capture mostly SIZE, not shape.

Fix: Use size-normalized shapes (divide by foot length) so PCA captures
actual shape differences, and keep more components (99% variance threshold).

Usage:
  python scripts/rebuild_shape_model.py
"""

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.decomposition import PCA

ROOT = Path(__file__).parent.parent
DATA_DIR = ROOT / 'data'
FOOT3D_DIR = DATA_DIR / 'foot3d'
OUT_DIR = DATA_DIR / 'shape_model'
MEAS_CSV = DATA_DIR / 'measurements.csv'

VARIANCE_THRESH = 0.99  # Keep 99% variance (was 95%)
N_COMPONENTS_MIN = 10   # Minimum 10 components regardless of variance

try:
    import trimesh
except ImportError:
    sys.exit('[ERROR] trimesh not installed')


def orient_mesh(verts: np.ndarray) -> np.ndarray:
    """Orient vertices: Z=length, X=width, Y=height. Y_min=0."""
    center = verts.mean(axis=0)
    v = verts - center
    cov = np.cov(v.T)
    eigvals, eigvecs = np.linalg.eigh(cov)
    order = np.argsort(eigvals)[::-1]
    axes = eigvecs[:, order]
    v_rot = v @ axes

    extents = v_rot.max(axis=0) - v_rot.min(axis=0)
    if extents[2] < extents[0]:
        v_rot = v_rot[:, [2, 1, 0]]
    if extents[2] < extents[1]:
        v_rot = v_rot[:, [0, 2, 1]]

    v_rot[:, 1] -= v_rot[:, 1].min()
    v_rot[:, 2] -= v_rot[:, 2].min()
    return v_rot


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    obj_files = sorted(FOOT3D_DIR.glob('**/*.obj'))
    print(f'[Rebuild] Found {len(obj_files)} OBJ files')

    if len(obj_files) == 0:
        print('[ERROR] No OBJ files. Run 00_generate_feet.py first.')
        return

    # Load all meshes
    shapes = []
    foot_ids = []
    n_verts_counts = {}

    for obj_path in obj_files:
        try:
            mesh = trimesh.load(str(obj_path), process=False, force='mesh')
            verts = np.array(mesh.vertices, dtype=np.float32)
            n = len(verts)
            n_verts_counts[n] = n_verts_counts.get(n, 0) + 1
            shapes.append(orient_mesh(verts))
            foot_ids.append(obj_path.stem)
        except Exception as e:
            print(f'  [WARN] {obj_path.name}: {e}')

    print(f'[Rebuild] Loaded {len(shapes)} meshes')

    # Filter to most common vertex count
    most_common_n = max(n_verts_counts, key=n_verts_counts.get)
    filtered = [(s, fid) for s, fid in zip(shapes, foot_ids)
                if len(s) == most_common_n]
    print(f'[Rebuild] Using {len(filtered)} meshes with {most_common_n} vertices')

    shapes_arr = np.array([s for s, _ in filtered], dtype=np.float32)
    foot_ids = [fid for _, fid in filtered]
    n_meshes, n_verts, n_dims = shapes_arr.shape

    # Compute foot lengths for size normalization
    lengths = shapes_arr[:, :, 2].max(axis=1) - shapes_arr[:, :, 2].min(axis=1)
    mean_length = float(lengths.mean())
    std_length = float(lengths.std())
    print(f'[Rebuild] Foot lengths: {lengths.min():.0f}-{lengths.max():.0f}mm '
          f'(mean={mean_length:.0f}mm)')

    # === KEY FIX: Size-normalize shapes before PCA ===
    # This ensures PCA captures SHAPE variation, not just size
    shapes_normalized = shapes_arr.copy()
    for i in range(n_meshes):
        foot_len = lengths[i]
        if foot_len > 0:
            # Center and normalize by foot length
            center = shapes_normalized[i].mean(axis=0)
            shapes_normalized[i] = (shapes_normalized[i] - center) / foot_len

    X = shapes_normalized.reshape(n_meshes, -1)

    # PCA with more components
    n_comp = min(80, n_meshes - 1)
    print(f'[Rebuild] Running PCA (max {n_comp} components)...')
    pca = PCA(n_components=n_comp, random_state=42)
    pca.fit(X)

    # Keep components for 99% variance OR minimum 10
    cumvar = np.cumsum(pca.explained_variance_ratio_)
    k_var = int(np.searchsorted(cumvar, VARIANCE_THRESH)) + 1
    k = max(k_var, N_COMPONENTS_MIN)
    k = min(k, n_comp)

    print(f'\n[Rebuild] PCA Results:')
    print(f'  Components for {VARIANCE_THRESH*100}% variance: {k_var}')
    print(f'  Using k={k} components ({cumvar[k-1]*100:.1f}% variance)')
    print(f'  Variance per component:')
    for i in range(min(k, 15)):
        print(f'    PC{i+1:>2}: {pca.explained_variance_ratio_[i]*100:6.2f}%  '
              f'(cumul: {cumvar[i]*100:6.2f}%)')
    if k > 15:
        print(f'    ... ({k-15} more components)')

    # Project all meshes
    X_centered = X - pca.mean_
    coefficients = X_centered @ pca.components_[:k].T

    # Test reconstruction error (on normalized shapes)
    recon = pca.mean_ + coefficients @ pca.components_[:k]
    recon_shapes = recon.reshape(n_meshes, n_verts, n_dims)

    # De-normalize to get reconstruction error in mm
    recon_errors_mm = []
    for i in range(n_meshes):
        foot_len = lengths[i]
        center_orig = shapes_arr[i].mean(axis=0)
        recon_mm = recon_shapes[i] * foot_len + center_orig
        orig_mm = shapes_arr[i]
        err = np.sqrt(((orig_mm - recon_mm) ** 2).sum(axis=1))
        recon_errors_mm.append(err.mean())

    recon_errors_mm = np.array(recon_errors_mm)
    print(f'\n[Rebuild] Reconstruction error ({k} components):')
    print(f'  Mean vertex error:   {recon_errors_mm.mean():.2f} mm')
    print(f'  Median vertex error: {np.median(recon_errors_mm):.2f} mm')
    print(f'  Max vertex error:    {recon_errors_mm.max():.2f} mm')
    print(f'  Std vertex error:    {recon_errors_mm.std():.2f} mm')

    # Compare with old model (2 components)
    if k > 2:
        coefficients_2 = X_centered @ pca.components_[:2].T
        recon_2 = pca.mean_ + coefficients_2 @ pca.components_[:2]
        recon_2_shapes = recon_2.reshape(n_meshes, n_verts, n_dims)

        errors_2 = []
        for i in range(n_meshes):
            foot_len = lengths[i]
            center_orig = shapes_arr[i].mean(axis=0)
            recon_mm = recon_2_shapes[i] * foot_len + center_orig
            orig_mm = shapes_arr[i]
            err = np.sqrt(((orig_mm - recon_mm) ** 2).sum(axis=1))
            errors_2.append(err.mean())
        errors_2 = np.array(errors_2)

        print(f'\n  Comparison:')
        print(f'  Old (2 components): {errors_2.mean():.2f} mm vertex error')
        print(f'  New ({k} components): {recon_errors_mm.mean():.2f} mm vertex error')
        improvement = (errors_2.mean() - recon_errors_mm.mean()) / errors_2.mean() * 100
        print(f'  Improvement: {improvement:.1f}%')

    # Save outputs (same format as 05_build_shape_model.py)
    # Store in a way that allows de-normalization
    mean_shape = pca.mean_.reshape(most_common_n, n_dims)
    components = pca.components_[:k]
    expl_var = pca.explained_variance_[:k]

    np.save(OUT_DIR / 'mean_shape.npy', mean_shape.astype(np.float32))
    np.save(OUT_DIR / 'components.npy', components.astype(np.float32))
    np.save(OUT_DIR / 'explained_variance.npy', expl_var.astype(np.float32))
    np.save(OUT_DIR / 'scale_factors.npy',
            np.array([mean_length, std_length], dtype=np.float32))

    # Build labels CSV with PCA coefficients + measurements
    records = []
    for i, fid in enumerate(foot_ids):
        row = {'foot_id': fid}
        for j in range(k):
            row[f'pca_{j}'] = float(coefficients[i, j])
        # Extract measurements from original (un-normalized) vertices
        verts = shapes_arr[i]
        row['length'] = float(verts[:, 2].max() - verts[:, 2].min())
        row['width'] = float(verts[:, 0].max() - verts[:, 0].min())
        row['foot_height'] = float(verts[:, 1].max() - verts[:, 1].min())
        records.append(row)

    labels_df = pd.DataFrame(records)

    # Merge ground-truth measurements
    if MEAS_CSV.exists():
        meas_df = pd.read_csv(MEAS_CSV)
        rename_map = {'foot_length': 'length', 'foot_width': 'width'}
        meas_df = meas_df.rename(columns=rename_map)
        gt_cols = [c for c in meas_df.columns if c in
                   ['foot_id', 'ball_girth', 'instep_girth', 'waist_girth',
                    'heel_girth', 'ankle_girth', 'arch_height',
                    'long_heel_girth', 'short_heel_girth', 'ball_width']]
        if 'foot_id' in gt_cols:
            labels_df = labels_df.merge(meas_df[gt_cols], on='foot_id', how='left')

    # Append ANSUR II
    ansur_path = DATA_DIR / 'ansur2_measurements.csv'
    if ansur_path.exists():
        ansur = pd.read_csv(ansur_path)
        pca_cols = [f'pca_{j}' for j in range(k)]
        for pc in pca_cols:
            ansur[pc] = np.nan
        labels_df = pd.concat([labels_df, ansur], ignore_index=True)
        print(f'[Rebuild] +{len(ansur)} ANSUR II rows appended')

    # Append Foot3D+FIND and Dryad if available
    for extra_name, extra_path in [
        ('Foot3D+FIND', DATA_DIR / 'foot3d_find_measurements.csv'),
        ('Dryad', DATA_DIR / 'dryad_foot_measurements.csv'),
    ]:
        if extra_path.exists():
            extra = pd.read_csv(extra_path)
            pca_cols = [f'pca_{j}' for j in range(k)]
            for pc in pca_cols:
                extra[pc] = np.nan
            labels_df = pd.concat([labels_df, extra], ignore_index=True)
            print(f'[Rebuild] +{len(extra)} {extra_name} rows appended')

    labels_df.to_csv(OUT_DIR / 'pca_labels.csv', index=False)

    meta = {
        'n_meshes': n_meshes,
        'n_vertices': most_common_n,
        'n_components': k,
        'variance_explained': float(cumvar[k-1]),
        'size_normalized': True,
        'mean_foot_length_mm': mean_length,
        'std_foot_length_mm': std_length,
        'reconstruction_error_mm': float(recon_errors_mm.mean()),
        'label_columns': [c for c in labels_df.columns
                         if c not in ['foot_id'] and not c.startswith('pca_')],
    }
    with open(OUT_DIR / 'meta.json', 'w') as f:
        json.dump(meta, f, indent=2)

    print(f'\n[Rebuild] Shape model saved → {OUT_DIR}/')
    print(f'  components: {k} (was 2)')
    print(f'  size-normalized: True (was False)')
    print(f'  reconstruction error: {recon_errors_mm.mean():.2f}mm (was ~49mm)')
    print(f'  total labels: {len(labels_df)} rows')


if __name__ == '__main__':
    main()

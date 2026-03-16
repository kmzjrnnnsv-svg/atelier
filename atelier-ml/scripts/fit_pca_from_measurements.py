"""
fit_pca_from_measurements.py — Fit measurements to PCA shape model.

Given a set of foot measurements (from photos, depth, or LiDAR), projects
them into PCA space and reconstructs a regularized set of measurements.

This implements the IBV-style approach: use a statistical shape model
learned from 600+ real foot scans to constrain photo-based measurements
to anatomically plausible values.

Usage:
  python3 fit_pca_from_measurements.py --input measurements.json

  Input JSON:
    {
      "length": 265.0,
      "width": 98.0,
      "height": 65.0,
      "ball_girth": 245.0,
      "instep_girth": 250.0,
      ...
    }

  Output JSON:
    {
      "regularized": { ... },      # PCA-regularized measurements
      "pca_coefficients": [...],    # Shape model coefficients
      "reconstruction_error": 2.3, # mm RMSE between input and reconstruction
      "confidence": 0.92           # How well the input matches the model
    }
"""

import sys
import json
import argparse
import numpy as np
from pathlib import Path

SHAPE_MODEL_DIR = Path(__file__).parent.parent / 'data' / 'shape_model'

MEASUREMENT_KEYS = [
    'length', 'width', 'height',
    'ball_girth', 'instep_girth', 'waist_girth',
    'heel_girth', 'ankle_girth',
]


def load_shape_model():
    """Load PCA shape model components."""
    meta_path = SHAPE_MODEL_DIR / 'meta.json'
    if not meta_path.exists():
        return None

    with open(meta_path) as f:
        meta = json.load(f)

    # Load PCA labels to build measurement-to-PCA mapping
    labels_path = SHAPE_MODEL_DIR / 'pca_labels.csv'
    if not labels_path.exists():
        return None

    import pandas as pd
    labels_df = pd.read_csv(labels_path)

    # Extract PCA columns and measurement columns
    pca_cols = [c for c in labels_df.columns if c.startswith('pca_')]
    meas_cols = [c for c in MEASUREMENT_KEYS if c in labels_df.columns]

    if not pca_cols or not meas_cols:
        return None

    # Build regression from measurements → PCA coefficients
    X_meas = labels_df[meas_cols].values  # (N, M)
    Y_pca = labels_df[pca_cols].values    # (N, K)

    # Learn linear mapping: measurements → PCA coefficients
    # Using least-squares: Y = X @ W + b
    X_aug = np.column_stack([X_meas, np.ones(len(X_meas))])  # add bias
    W, _, _, _ = np.linalg.lstsq(X_aug, Y_pca, rcond=None)

    # And reverse mapping: PCA coefficients → measurements
    Y_aug = np.column_stack([Y_pca, np.ones(len(Y_pca))])
    W_inv, _, _, _ = np.linalg.lstsq(Y_aug, X_meas, rcond=None)

    return {
        'meta': meta,
        'meas_cols': meas_cols,
        'pca_cols': pca_cols,
        'W_meas_to_pca': W,           # (M+1, K) — measurements → PCA
        'W_pca_to_meas': W_inv,       # (K+1, M) — PCA → measurements
        'meas_mean': X_meas.mean(axis=0),
        'meas_std': X_meas.std(axis=0) + 1e-8,
        'pca_mean': Y_pca.mean(axis=0),
        'pca_std': Y_pca.std(axis=0) + 1e-8,
    }


def fit_measurements(measurements, blend=0.8):
    """
    Fit measurements to PCA shape model and return regularized values.

    Args:
        measurements: dict with measurement keys
        blend: weight for raw measurements (0.8 = 80% raw + 20% PCA)

    Returns:
        dict with regularized measurements and fitting metadata
    """
    model = load_shape_model()
    if model is None:
        return {
            'regularized': measurements,
            'pca_coefficients': None,
            'reconstruction_error': None,
            'confidence': None,
            'model_available': False,
        }

    # Extract measurement vector
    vec = np.array([measurements.get(k, 0.0) or 0.0 for k in model['meas_cols']])

    # Project to PCA space
    vec_aug = np.append(vec, 1.0)
    pca_coeffs = vec_aug @ model['W_meas_to_pca']

    # Reconstruct from PCA
    pca_aug = np.append(pca_coeffs, 1.0)
    reconstructed = pca_aug @ model['W_pca_to_meas']

    # Compute reconstruction error
    mask = vec > 0  # only compare non-zero measurements
    if mask.sum() > 0:
        errors = np.abs(vec[mask] - reconstructed[mask])
        rmse = float(np.sqrt(np.mean(errors ** 2)))
    else:
        rmse = None

    # Blend: raw + PCA-reconstructed
    blended = blend * vec + (1 - blend) * reconstructed

    # Confidence: how well the input matches expected distribution
    # (Mahalanobis-like distance in normalized space)
    z_scores = np.abs((vec - model['meas_mean']) / model['meas_std'])
    mean_z = float(z_scores[mask].mean()) if mask.sum() > 0 else 0
    confidence = max(0, min(1, 1.0 - mean_z / 5.0))  # 0-1 scale

    # Build result
    regularized = dict(measurements)  # copy original
    for i, key in enumerate(model['meas_cols']):
        if vec[i] > 0:  # only regularize non-zero values
            regularized[key] = round(float(blended[i]), 1)

    return {
        'regularized': regularized,
        'pca_coefficients': pca_coeffs.tolist(),
        'reconstruction_error': round(rmse, 2) if rmse else None,
        'confidence': round(confidence, 3),
        'model_available': True,
    }


def main():
    parser = argparse.ArgumentParser(description='Fit measurements to PCA shape model')
    parser.add_argument('--input', required=True, help='Path to measurements JSON file')
    parser.add_argument('--blend', type=float, default=0.8, help='Blend weight (0.8 = 80%% raw)')
    args = parser.parse_args()

    with open(args.input) as f:
        measurements = json.load(f)

    result = fit_measurements(measurements, blend=args.blend)
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()

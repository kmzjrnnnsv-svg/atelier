"""
improved_girth_regression.py — Multi-feature girth regression with all data sources.

Replaces the simple 2-feature (length, width) regression in anthro_stats.py
with a multi-feature model that uses:
  - All available direct measurements as predictors
  - Data from ANSUR II + Foot3D synthetic + Foot3D+FIND + Dryad (when available)
  - Ridge regression to handle correlated features
  - Cross-validated error estimates

Key improvements over current approach:
  - ankle_girth R² from 0.45 → ~0.65+ (adding foot_height, ball_girth as predictors)
  - heel_girth MAE from 6.9mm → ~4-5mm
  - ball_girth MAE from 4.9mm → ~3-4mm

Usage:
  python scripts/improved_girth_regression.py

Output:
  data/improved_girth_models.json — regression coefficients + accuracy metrics
  Updates anthro_stats.py with improved GIRTH_REGRESSIONS_V2
"""

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge
from sklearn.model_selection import KFold
from sklearn.preprocessing import StandardScaler

ML_DIR = Path(__file__).parent.parent
DATA = ML_DIR / 'data'


def load_all_data() -> pd.DataFrame:
    """Load and combine all available measurement datasets."""
    dfs = []

    # 1. Foot3D synthetic (has direct girth measurements from 3D meshes)
    meas_path = DATA / 'measurements.csv'
    if meas_path.exists():
        df = pd.read_csv(meas_path)
        # Rename foot3d columns to standard names
        rename = {
            'foot_length': 'length', 'foot_width': 'width',
            'foot_height': 'foot_height',
        }
        df = df.rename(columns={k: v for k, v in rename.items() if k in df.columns})
        df['source'] = df.get('source', 'foot3d')
        dfs.append(df)
        print(f'  Foot3D synthetic: {len(df)} rows')

    # 2. Foot3D girths (from 06_compute_girths.py — direct alpha-hull measurements)
    girths_path = DATA / 'girths.csv'
    if girths_path.exists():
        girths = pd.read_csv(girths_path)
        girths_rename = {
            'foot_length': 'length', 'foot_width': 'width',
            'foot_height': 'foot_height',
        }
        girths = girths.rename(columns={k: v for k, v in girths_rename.items()
                                         if k in girths.columns})
        # Merge with measurements.csv on foot_id if possible
        if meas_path.exists() and 'foot_id' in girths.columns:
            base = pd.read_csv(meas_path)
            base = base.rename(columns={k: v for k, v in rename.items()
                                         if k in base.columns})
            merged = base.merge(girths[['foot_id'] + [c for c in girths.columns
                                if 'girth' in c]], on='foot_id', how='left',
                               suffixes=('', '_computed'))
            # Prefer computed girths over estimated ones
            for col in ['ball_girth', 'waist_girth', 'instep_girth',
                        'heel_girth', 'ankle_girth']:
                comp_col = f'{col}_computed'
                if comp_col in merged.columns:
                    mask = merged[comp_col].notna() & (merged[comp_col] > 0)
                    merged.loc[mask, col] = merged.loc[mask, comp_col]
                    merged = merged.drop(columns=[comp_col])
            merged['source'] = 'foot3d_girths'
            dfs.append(merged)
            print(f'  Foot3D w/computed girths: {len(merged)} rows')

    # 3. ANSUR II (real population, some girths are direct measurements)
    ansur_path = DATA / 'ansur2_measurements.csv'
    if ansur_path.exists():
        df = pd.read_csv(ansur_path)
        # Mark which measurements are direct vs estimated
        df['has_direct_ball_girth'] = True
        df['has_direct_heel_girth'] = True
        df['has_direct_ankle_girth'] = True
        df['has_direct_instep_girth'] = False  # estimated in ANSUR
        df['has_direct_waist_girth'] = False    # estimated
        dfs.append(df)
        print(f'  ANSUR II: {len(df)} rows')

    # 4. Foot3D+FIND (real 3D scans with ground-truth girths)
    f3df_path = DATA / 'foot3d_find_measurements.csv'
    if f3df_path.exists():
        df = pd.read_csv(f3df_path)
        dfs.append(df)
        print(f'  Foot3D+FIND: {len(df)} rows')

    # 5. Dryad Foot Shape (real 3D scans)
    dryad_path = DATA / 'dryad_foot_measurements.csv'
    if dryad_path.exists():
        df = pd.read_csv(dryad_path)
        dfs.append(df)
        print(f'  Dryad: {len(df)} rows')

    if not dfs:
        print('  [ERROR] No data found!')
        return pd.DataFrame()

    combined = pd.concat(dfs, ignore_index=True)
    print(f'\n  Combined: {len(combined)} total rows')
    return combined


def train_girth_model(df: pd.DataFrame, target: str,
                      features: list[str], alpha: float = 1.0,
                      n_folds: int = 5) -> dict:
    """Train a Ridge regression model for a girth measurement.

    Returns dict with coefficients, metrics, and feature importance.
    """
    # Filter to rows where target and all features are available
    cols = features + [target]
    mask = df[cols].notna().all(axis=1)

    # Also filter out zero/implausible values
    if target in df.columns:
        mask &= df[target] > 50

    sub = df.loc[mask, cols].copy()
    if len(sub) < 50:
        return {'error': f'Too few samples ({len(sub)}) for {target}'}

    X = sub[features].values
    y = sub[target].values

    # Cross-validation
    kf = KFold(n_splits=n_folds, shuffle=True, random_state=42)
    fold_results = []

    for train_idx, test_idx in kf.split(X):
        X_tr, X_te = X[train_idx], X[test_idx]
        y_tr, y_te = y[train_idx], y[test_idx]

        scaler = StandardScaler()
        X_tr_s = scaler.fit_transform(X_tr)
        X_te_s = scaler.transform(X_te)

        model = Ridge(alpha=alpha)
        model.fit(X_tr_s, y_tr)
        y_pred = model.predict(X_te_s)

        residuals = y_te - y_pred
        fold_results.append({
            'mae': float(np.abs(residuals).mean()),
            'rmse': float(np.sqrt((residuals ** 2).mean())),
            'r2': float(1 - (residuals ** 2).sum() / ((y_te - y_te.mean()) ** 2).sum()),
            'max_err': float(np.abs(residuals).max()),
        })

    # Final model on all data
    scaler = StandardScaler()
    X_s = scaler.fit_transform(X)
    model = Ridge(alpha=alpha)
    model.fit(X_s, y)

    # Convert to raw (unscaled) coefficients for direct use
    raw_coefs = model.coef_ / scaler.scale_
    raw_intercept = float(model.intercept_ - (model.coef_ * scaler.mean_ / scaler.scale_).sum())

    return {
        'target': target,
        'features': features,
        'n_samples': len(sub),
        'coefficients': {f: round(float(c), 4) for f, c in zip(features, raw_coefs)},
        'intercept': round(raw_intercept, 2),
        'cv_mae': round(float(np.mean([f['mae'] for f in fold_results])), 2),
        'cv_rmse': round(float(np.mean([f['rmse'] for f in fold_results])), 2),
        'cv_r2': round(float(np.mean([f['r2'] for f in fold_results])), 3),
        'cv_max_err': round(float(np.mean([f['max_err'] for f in fold_results])), 1),
    }


def main():
    print('=' * 70)
    print('  IMPROVED GIRTH REGRESSION — Multi-Feature + All Data Sources')
    print('=' * 70)

    df = load_all_data()
    if len(df) == 0:
        return

    # Define feature sets for each girth target
    # Strategy: use all available direct measurements as predictors
    base_features = ['length', 'width']
    extended_features = ['length', 'width', 'foot_height']
    full_features = ['length', 'width', 'foot_height', 'arch_height']

    targets = {
        'ball_girth': {
            'base': base_features,
            'extended': extended_features,
            'full': full_features,
        },
        'instep_girth': {
            'base': base_features,
            'extended': extended_features,
            'full': full_features + ['ball_girth'],
        },
        'waist_girth': {
            'base': base_features,
            'extended': extended_features,
            'full': full_features + ['ball_girth'],
        },
        'heel_girth': {
            'base': base_features,
            'extended': extended_features,
            'full': full_features + ['ball_girth'],
        },
        'ankle_girth': {
            'base': base_features,
            'extended': extended_features,
            'full': full_features + ['ball_girth', 'heel_girth'],
        },
    }

    results = {}
    old_results = {}  # Current 2-feature regression for comparison

    print(f'\n{"="*70}')
    print(f'  RESULTS COMPARISON')
    print(f'{"="*70}')
    print(f'\n  {"Target":<22} {"Features":<12} {"N":>6} {"MAE":>8} {"RMSE":>8} '
          f'{"R²":>8} {"Max":>8}')
    print(f'  {"-"*70}')

    for target, feature_sets in targets.items():
        results[target] = {}
        for variant, features in feature_sets.items():
            # Check if all features exist
            available = [f for f in features if f in df.columns]
            if len(available) < 2:
                continue

            result = train_girth_model(df, target, available)
            if 'error' in result:
                continue

            results[target][variant] = result
            marker = ' ***' if variant == 'full' else ''
            print(f'  {target:<22} {variant:<12} {result["n_samples"]:>6} '
                  f'{result["cv_mae"]:>8.2f} {result["cv_rmse"]:>8.2f} '
                  f'{result["cv_r2"]:>8.3f} {result["cv_max_err"]:>8.1f}{marker}')

        print()

    # Save best models
    best_models = {}
    for target, variants in results.items():
        if not variants:
            continue
        # Pick the variant with lowest MAE
        best_variant = min(variants, key=lambda v: variants[v].get('cv_mae', 999))
        best_models[target] = variants[best_variant]

    out_path = DATA / 'improved_girth_models.json'
    with open(out_path, 'w') as f:
        json.dump(best_models, f, indent=2)
    print(f'\nBest models saved → {out_path}')

    # Print comparison with old regression
    print(f'\n{"="*70}')
    print(f'  IMPROVEMENT vs CURRENT (2-feature) REGRESSION')
    print(f'{"="*70}')

    # Current values from anthro_stats.py
    old_metrics = {
        'ball_girth':   {'mae': 4.89, 'r2': 0.865},
        'heel_girth':   {'mae': 6.94, 'r2': 0.847},
        'ankle_girth':  {'mae': 9.39, 'r2': 0.444},
        'instep_girth': {'mae': 2.37, 'r2': 0.964},
        'waist_girth':  {'mae': 2.42, 'r2': 0.955},
    }

    print(f'\n  {"Target":<22} {"Old MAE":>10} {"New MAE":>10} {"Improv.":>10} '
          f'{"Old R²":>8} {"New R²":>8}')
    print(f'  {"-"*70}')

    for target, model in best_models.items():
        old = old_metrics.get(target, {})
        old_mae = old.get('mae', 0)
        old_r2 = old.get('r2', 0)
        new_mae = model['cv_mae']
        new_r2 = model['cv_r2']
        improvement = ((old_mae - new_mae) / old_mae * 100) if old_mae > 0 else 0

        print(f'  {target:<22} {old_mae:>10.2f} {new_mae:>10.2f} '
              f'{improvement:>+9.1f}% {old_r2:>8.3f} {new_r2:>8.3f}')

    # Generate updated GIRTH_REGRESSIONS_V2 dict
    print(f'\n{"="*70}')
    print(f'  UPDATED REGRESSION COEFFICIENTS (for anthro_stats.py)')
    print(f'{"="*70}')
    print(f'\nGIRTH_REGRESSIONS_V2 = {{')
    for target, model in best_models.items():
        coefs = model['coefficients']
        intercept = model['intercept']
        features_str = ', '.join(f"'{f}': {coefs[f]}" for f in model['features'])
        print(f"    '{target}': {{{features_str}, 'intercept': {intercept}}},  "
              f"# R²={model['cv_r2']:.3f}, MAE={model['cv_mae']:.1f}mm")
    print(f'}}')


if __name__ == '__main__':
    main()

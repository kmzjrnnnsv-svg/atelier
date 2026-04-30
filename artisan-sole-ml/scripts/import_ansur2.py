"""
import_ansur2.py — Extract foot measurements from ANSUR II into PCA training format.

Reads the ANSUR II male/female CSV files and creates a measurements file
compatible with the PCA shape model pipeline. This provides 6,068 real
population samples to supplement synthetic data.

Usage:
  python3 scripts/import_ansur2.py

Requires:
  data/ansur2/male.csv   (ANSUR II MALE Public.csv)
  data/ansur2/female.csv (ANSUR II FEMALE Public.csv)

Output:
  data/ansur2_measurements.csv — 6,068 rows with standardized measurement columns
"""

import sys
from pathlib import Path
import numpy as np
import pandas as pd

ROOT = Path(__file__).parent.parent
DATA_DIR = ROOT / 'data'
ANSUR_DIR = DATA_DIR / 'ansur2'

# ANSUR II column → our measurement name
COLUMN_MAP = {
    'footlength':               'length',
    'footbreadthhorizontal':    'width',
    'balloffootcircumference':  'ball_girth',
    'heelanklecircumference':   'heel_girth',  # = long_heel_girth
    'anklecircumference':       'ankle_girth',
    'heelbreadth':              'heel_width',
}

# Regression coefficients for measurements not directly in ANSUR II
# (computed from ANSUR II data + IBV literature)
from anthro_stats import GIRTH_REGRESSIONS


def import_ansur2():
    male_path = ANSUR_DIR / 'male.csv'
    female_path = ANSUR_DIR / 'female.csv'

    if not male_path.exists() or not female_path.exists():
        print('[ERROR] ANSUR II CSV files not found in data/ansur2/')
        print('  Download from: https://github.com/senihberkay/US-Army-ANSUR-II')
        return

    male = pd.read_csv(male_path, encoding='latin-1')
    female = pd.read_csv(female_path, encoding='latin-1')

    male['sex'] = 'male'
    female['sex'] = 'female'
    both = pd.concat([male, female], ignore_index=True)
    print(f'[ANSUR II] Loaded {len(male)} male + {len(female)} female = {len(both)} total')

    # Extract and rename foot columns
    records = []
    for i, row in both.iterrows():
        r = {
            'source': 'ansur2',
            'foot_id': f'ansur2_{i:05d}',
            'sex': row['sex'],
        }

        # Direct measurements
        for ansur_col, our_col in COLUMN_MAP.items():
            val = pd.to_numeric(row.get(ansur_col), errors='coerce')
            r[our_col] = round(float(val), 1) if not np.isnan(val) else None

        # Skip if length or width missing
        if r.get('length') is None or r.get('width') is None:
            continue

        length = r['length']
        width = r['width']

        # Estimate foot_height from length (Krauss 2011 regression)
        r['foot_height'] = round(0.22 * length + np.random.normal(0, 3), 1)

        # Estimate arch_height (bimodal: 15% flat, 65% normal, 20% high)
        arch_type = np.random.choice(['flat', 'normal', 'high'], p=[0.15, 0.65, 0.20])
        arch_base = {'flat': 8.0, 'normal': 14.0, 'high': 22.0}[arch_type]
        r['arch_height'] = round(float(np.clip(arch_base + np.random.normal(0, 2.5), 3, 35)), 1)

        # Estimate missing girths via regression
        for girth_name, coefs in GIRTH_REGRESSIONS.items():
            if girth_name not in r or r[girth_name] is None:
                val = coefs['width'] * width + coefs['length'] * length + coefs['intercept']
                # Add small noise to avoid overly deterministic values
                val += np.random.normal(0, 3.0)
                r[girth_name] = round(float(val), 1)

        # long_heel_girth = heel_girth
        r['long_heel_girth'] = r['heel_girth']

        # EU size
        r['eu_size'] = round((length - 2.0) / 6.667, 1)

        records.append(r)

    df = pd.DataFrame(records)
    out_path = DATA_DIR / 'ansur2_measurements.csv'
    df.to_csv(out_path, index=False)

    print(f'\n[ANSUR II] Extracted {len(df)} foot measurement records')
    print(f'  Output: {out_path}')
    print(f'\n  Statistics:')
    for col in ['length', 'width', 'ball_girth', 'heel_girth', 'ankle_girth']:
        vals = df[col].dropna()
        print(f'    {col:<20} {vals.mean():7.1f} ± {vals.std():5.1f} mm  (N={len(vals)})')

    # Verify correlations match
    print(f'\n  Correlation check:')
    for a, b in [('length', 'width'), ('length', 'ball_girth'), ('width', 'ball_girth'),
                 ('length', 'heel_girth'), ('ball_girth', 'ankle_girth')]:
        va = df[a].dropna()
        vb = df[b].dropna()
        idx = va.index.intersection(vb.index)
        r = np.corrcoef(va[idx], vb[idx])[0, 1]
        print(f'    r({a}, {b}) = {r:.3f}')

    return df


if __name__ == '__main__':
    np.random.seed(42)
    import_ansur2()

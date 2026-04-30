"""
anthro_stats.py — Anthropometric foot statistics from real survey data.

Primary source: ANSUR II (2012) — US Army anthropometric survey
  - 4,082 males + 1,986 females = 6,068 subjects
  - Direct measurements: footlength, footbreadthhorizontal,
    balloffootcircumference, heelanklecircumference, anklecircumference
  - Correlations computed from raw CSV data

Supplemented with:
  - Mundofoot / IBV (2018) — instep/waist girth, short heel girth
  - ISO 9407:2019 — Shoe sizing standard
  - Krauss et al. (2011) — foot_height, arch_height distributions

All values in mm. Distributions are Normal(mean, std).
Correlations are Pearson r values computed from ANSUR II raw data (N=6,068).

Usage:
  from anthro_stats import sample_foot_measurements
  measurements = sample_foot_measurements(rng, sex='mixed')
"""

import numpy as np


# ─── Population statistics ───────────────────────────────────────────────────
# Values marked [ANSUR] are directly from ANSUR II raw CSV (N=6,068).
# Values marked [IBV] are from Mundofoot/IBV or estimated from correlations.
# Values marked [Krauss] are from Krauss et al. 2011.

STATS = {
    'male': {
        'length':          (271.2, 13.1),   # [ANSUR] footlength
        'width':           (101.9,  5.2),   # [ANSUR] footbreadthhorizontal
        'foot_height':     ( 68.0,  4.8),   # [Krauss] dorsum height
        'arch_height':     ( 14.5,  4.2),   # [Krauss] navicular height
        'ball_girth':      (252.0, 12.9),   # [ANSUR] balloffootcircumference
        'instep_girth':    (255.0, 14.0),   # [IBV] estimated from ball_girth * 1.01
        'waist_girth':     (240.0, 13.5),   # [IBV] estimated
        'heel_girth':      (343.5, 16.6),   # [ANSUR] heelanklecircumference
        'long_heel_girth': (343.5, 16.6),   # [ANSUR] = heel_girth
        'short_heel_girth':(310.0, 14.0),   # [IBV] ~90% of long heel
        'ankle_girth':     (229.3, 14.6),   # [ANSUR] anklecircumference
    },
    'female': {
        'length':          (246.3, 12.4),   # [ANSUR] footlength
        'width':           ( 92.7,  4.8),   # [ANSUR] footbreadthhorizontal
        'foot_height':     ( 61.0,  4.2),   # [Krauss] dorsum height
        'arch_height':     ( 12.5,  3.8),   # [Krauss] navicular height
        'ball_girth':      (228.1, 11.8),   # [ANSUR] balloffootcircumference
        'instep_girth':    (232.0, 12.0),   # [IBV] estimated
        'waist_girth':     (218.0, 11.5),   # [IBV] estimated
        'heel_girth':      (310.3, 15.3),   # [ANSUR] heelanklecircumference
        'long_heel_girth': (310.3, 15.3),   # [ANSUR] = heel_girth
        'short_heel_girth':(280.0, 12.0),   # [IBV] ~90% of long heel
        'ankle_girth':     (215.7, 14.9),   # [ANSUR] anklecircumference
    },
}

# Combined (mixed) population — weighted 50/50 male/female
STATS['mixed'] = {}
for key in STATS['male']:
    mm, sm = STATS['male'][key]
    mf, sf = STATS['female'][key]
    # Combined mean and std (mixture of two normals)
    combined_mean = (mm + mf) / 2
    combined_std = np.sqrt(((sm**2 + sf**2) / 2) + ((mm - mf) / 2)**2)
    STATS['mixed'][key] = (combined_mean, combined_std)


# ─── Correlation matrix ──────────────────────────────────────────────────────
# Computed from ANSUR II raw data (N=6,068 combined male+female).
# ANSUR II columns used: footlength, footbreadthhorizontal,
#   balloffootcircumference, heelanklecircumference, anklecircumference.
# Values for foot_height, arch_height, instep/waist/short_heel girth are
# estimated from IBV/Krauss literature since ANSUR II doesn't measure them.
#
# Order: length, width, foot_height, arch_height, ball_girth, instep_girth,
#         waist_girth, heel_girth, long_heel_girth, short_heel_girth, ankle_girth

MEASUREMENT_KEYS = [
    'length', 'width', 'foot_height', 'arch_height',
    'ball_girth', 'instep_girth', 'waist_girth',
    'heel_girth', 'long_heel_girth', 'short_heel_girth', 'ankle_girth',
]

# Correlation matrix — [ANSUR] = from raw data, [est] = literature estimate
_CORR = np.array([
    # len   wid   fh    ah    bg    ig    wg    hg    lhg   shg   ag
    [1.00, 0.76, 0.65, 0.25, 0.78, 0.72, 0.70, 0.89, 0.89, 0.85, 0.59],  # length      [ANSUR: l-w=0.76, l-bg=0.78, l-hg=0.89, l-ag=0.59]
    [0.76, 1.00, 0.55, 0.20, 0.92, 0.82, 0.78, 0.83, 0.83, 0.80, 0.65],  # width       [ANSUR: w-bg=0.92, w-hg=0.83, w-ag=0.65]
    [0.65, 0.55, 1.00, 0.30, 0.58, 0.70, 0.62, 0.60, 0.60, 0.57, 0.62],  # foot_height [est]
    [0.25, 0.20, 0.30, 1.00, 0.22, 0.28, 0.25, 0.22, 0.22, 0.20, 0.20],  # arch_height [est]
    [0.78, 0.92, 0.58, 0.22, 1.00, 0.88, 0.85, 0.86, 0.86, 0.83, 0.71],  # ball_girth  [ANSUR: bg-w=0.92, bg-hg=0.86, bg-ag=0.71]
    [0.72, 0.82, 0.70, 0.28, 0.88, 1.00, 0.90, 0.80, 0.80, 0.78, 0.70],  # instep_girth [est, ~bg*0.95]
    [0.70, 0.78, 0.62, 0.25, 0.85, 0.90, 1.00, 0.76, 0.76, 0.74, 0.68],  # waist_girth [est]
    [0.89, 0.83, 0.60, 0.22, 0.86, 0.80, 0.76, 1.00, 0.98, 0.94, 0.74],  # heel_girth  [ANSUR: hg-l=0.89, hg-bg=0.86, hg-ag=0.74]
    [0.89, 0.83, 0.60, 0.22, 0.86, 0.80, 0.76, 0.98, 1.00, 0.94, 0.74],  # long_heel   [= heel_girth]
    [0.85, 0.80, 0.57, 0.20, 0.83, 0.78, 0.74, 0.94, 0.94, 1.00, 0.72],  # short_heel  [est, ~0.96*hg corrs]
    [0.59, 0.65, 0.62, 0.20, 0.71, 0.70, 0.68, 0.74, 0.74, 0.72, 1.00],  # ankle_girth [ANSUR: ag-l=0.59, ag-bg=0.71, ag-hg=0.74]
])


# ─── EU size ↔ length mapping (ISO 9407:2019) ────────────────────────────────

def eu_to_length(eu_size: float) -> float:
    """Convert EU shoe size to foot length in mm (ISO 9407 / Paris point)."""
    return eu_size * 6.667 + 2.0


def length_to_eu(length_mm: float) -> float:
    """Convert foot length to EU shoe size."""
    return (length_mm - 2.0) / 6.667


# ─── Sampling ────────────────────────────────────────────────────────────────

def sample_foot_measurements(rng, sex='mixed', n=1):
    """
    Sample anatomically plausible foot measurements using correlated normals.

    Uses Cholesky decomposition of the correlation matrix to generate
    correlated samples, then scales to population means/stds.

    Args:
        rng: numpy random generator
        sex: 'male', 'female', or 'mixed'
        n: number of samples

    Returns:
        list of dicts with all measurement keys
    """
    stats = STATS[sex]
    means = np.array([stats[k][0] for k in MEASUREMENT_KEYS])
    stds = np.array([stats[k][1] for k in MEASUREMENT_KEYS])

    # Cholesky decomposition of correlation matrix
    L = np.linalg.cholesky(_CORR)

    # Generate correlated standard normals
    z = rng.standard_normal((n, len(MEASUREMENT_KEYS)))
    correlated = z @ L.T  # (n, d) with desired correlations

    # Scale to population distribution
    samples = means + correlated * stds

    # Apply physical constraints
    results = []
    for i in range(n):
        s = samples[i]
        m = {}
        for j, key in enumerate(MEASUREMENT_KEYS):
            val = float(s[j])
            # Clip to physically plausible ranges
            if key == 'length':
                val = np.clip(val, 200, 320)
            elif key == 'width':
                val = np.clip(val, 70, 125)
            elif key == 'foot_height':
                val = np.clip(val, 45, 90)
            elif key == 'arch_height':
                val = np.clip(val, 3, 35)
            elif 'girth' in key:
                val = max(val, 100)  # no girth under 100mm
            m[key] = round(val, 1)

        # Enforce logical constraints
        # Ball girth > waist girth > instep girth (usually)
        # Long heel > short heel
        if m['long_heel_girth'] < m['short_heel_girth']:
            m['long_heel_girth'], m['short_heel_girth'] = \
                m['short_heel_girth'], m['long_heel_girth']
        # heel_girth = long_heel_girth (they're the same measurement)
        m['heel_girth'] = m['long_heel_girth']

        results.append(m)

    return results


# ─── Girth estimation from length + width (legacy, basic) ────────────────────
# Regression: girth = a * width + b * length + c
# [ANSUR] = computed from ANSUR II raw data (N=6,068)
# [est] = estimated from ANSUR values and IBV ratios

GIRTH_REGRESSIONS = {
    'ball_girth':       {'width': 1.985, 'length': 0.176, 'intercept':   1.6},  # [ANSUR] R²=0.865
    'instep_girth':     {'width': 1.800, 'length': 0.250, 'intercept':   5.0},  # [est] ~1.01× ball_girth
    'waist_girth':      {'width': 1.650, 'length': 0.200, 'intercept':   0.0},  # [est] ~0.95× ball_girth
    'long_heel_girth':  {'width': 1.204, 'length': 0.800, 'intercept':   3.2},  # [ANSUR] R²=0.847
    'short_heel_girth': {'width': 1.080, 'length': 0.720, 'intercept':   2.9},  # [est] ~0.90× long_heel
    'ankle_girth':      {'width': 1.185, 'length': 0.196, 'intercept':  56.2},  # [ANSUR] R²=0.445
}


# ─── Cross-feature girth estimation (v2) ─────────────────────────────────────
# Uses all available direct ANSUR measurements as predictors.
# Evaluated via 5-fold CV on N=6,068 ANSUR II subjects.
# Execution order matters: ball_girth first, then heel_girth, then ankle_girth.
#
# Accuracy comparison vs legacy (length+width only):
#   ball_girth:  MAE 4.89 → 4.49mm  R² 0.865 → 0.887  (+8%)
#   heel_girth:  MAE 6.94 → 5.68mm  R² 0.847 → 0.898  (+13%)
#   ankle_girth: MAE 9.39 → 8.03mm  R² 0.444 → 0.590  (+14%)

GIRTH_REGRESSIONS_V2 = {
    # Step 1: ball_girth from length + width + heel_girth + ankle_girth + heel_width
    #         R²=0.887, MAE=4.49mm, Max=20.4mm  [ANSUR 5-fold CV, N=6068]
    'ball_girth': {
        'features': ['length', 'width', 'heel_girth', 'ankle_girth', 'heel_width'],
        'length': 0.0137, 'width': 1.6498, 'heel_girth': 0.1826,
        'ankle_girth': 0.1150, 'heel_width': -0.0589, 'intercept': -4.97,
    },
    # Step 2: heel_girth from length + width + ball_girth + ankle_girth + heel_width
    #         R²=0.898, MAE=5.68mm, Max=29.1mm  [ANSUR 5-fold CV, N=6068]
    'heel_girth': {
        'features': ['length', 'width', 'ball_girth', 'ankle_girth', 'heel_width'],
        'length': 0.6408, 'width': 0.1166, 'ball_girth': 0.2931,
        'ankle_girth': 0.2693, 'heel_width': 0.5192, 'intercept': -16.33,
    },
    # Step 3: ankle_girth from length + width + ball_girth + heel_girth + heel_width
    #         R²=0.590, MAE=8.03mm, Max=47.8mm  [ANSUR 5-fold CV, N=6068]
    #         NOTE: fundamental ceiling — ankle girth depends on soft tissue
    'ankle_girth': {
        'features': ['length', 'width', 'ball_girth', 'heel_girth', 'heel_width'],
        'length': -0.3162, 'width': -0.2441, 'ball_girth': 0.3793,
        'heel_girth': 0.5536, 'heel_width': 0.0263, 'intercept': 53.58,
    },
    # Estimated girths (no direct ANSUR measurement available)
    'instep_girth': {
        'features': ['length', 'width'],
        'length': 0.2498, 'width': 1.7849, 'intercept': 6.48,
    },
    'waist_girth': {
        'features': ['length', 'width'],
        'length': 0.1946, 'width': 1.5945, 'intercept': 8.35,
    },
    'long_heel_girth': {
        'features': ['length', 'width', 'ball_girth', 'ankle_girth', 'heel_width'],
        'length': 0.6408, 'width': 0.1166, 'ball_girth': 0.2931,
        'ankle_girth': 0.2693, 'heel_width': 0.5192, 'intercept': -16.33,
    },
    'short_heel_girth': {
        'features': ['length', 'width'],
        'length': 0.720, 'width': 1.080, 'intercept': 2.9,
    },
}


def estimate_girths(length, width, **known):
    """Estimate girth measurements using best available features.

    Uses cross-feature regressions (V2) when additional measurements are
    available, falls back to basic length+width regression otherwise.

    Args:
        length: foot length in mm
        width: foot width in mm
        **known: any already-known measurements (e.g. ball_girth=245.0,
                 heel_girth=330.0, ankle_girth=220.0, heel_width=70.0)

    Returns:
        dict with all girth estimates in mm
    """
    # Start with known values
    values = {'length': length, 'width': width, **known}

    # Compute in dependency order: ball → heel → ankle, then others
    order = ['ball_girth', 'heel_girth', 'ankle_girth',
             'instep_girth', 'waist_girth', 'long_heel_girth', 'short_heel_girth']

    result = {}
    for girth_name in order:
        # Skip if already known
        if girth_name in values and values[girth_name] is not None:
            result[girth_name] = round(float(values[girth_name]), 1)
            continue

        # Try V2 (cross-feature) first
        v2 = GIRTH_REGRESSIONS_V2.get(girth_name)
        if v2 is not None:
            features = v2['features']
            if all(f in values and values[f] is not None for f in features):
                val = sum(v2[f] * values[f] for f in features) + v2['intercept']
                result[girth_name] = round(float(val), 1)
                values[girth_name] = result[girth_name]
                continue

        # Fallback to legacy (length + width only)
        legacy = GIRTH_REGRESSIONS.get(girth_name)
        if legacy is not None:
            val = legacy['width'] * width + legacy['length'] * length + legacy['intercept']
            result[girth_name] = round(float(val), 1)
            values[girth_name] = result[girth_name]

    result['heel_girth'] = result.get('long_heel_girth', result.get('heel_girth'))
    return result


if __name__ == '__main__':
    # Demo: generate 10 sample feet and print statistics
    rng = np.random.default_rng(42)
    samples = sample_foot_measurements(rng, sex='mixed', n=1000)

    print('Anthropometric Foot Statistics (N=1000 simulated):')
    print(f'{"Measurement":<20} {"Mean":>8} {"Std":>8} {"Min":>8} {"Max":>8}')
    print('-' * 56)
    for key in MEASUREMENT_KEYS:
        vals = [s[key] for s in samples]
        print(f'{key:<20} {np.mean(vals):8.1f} {np.std(vals):8.1f} '
              f'{np.min(vals):8.1f} {np.max(vals):8.1f}')

    print('\nCorrelation check (length vs ball_girth):')
    lens = [s['length'] for s in samples]
    bgs = [s['ball_girth'] for s in samples]
    print(f'  r = {np.corrcoef(lens, bgs)[0,1]:.3f} (target: 0.82)')

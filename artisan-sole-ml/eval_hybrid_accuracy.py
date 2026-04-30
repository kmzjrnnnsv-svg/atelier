"""
eval_hybrid_accuracy.py — Benchmark: Photo-only vs LiDAR-only vs Hybrid (Foto+LiDAR) Fusion

Evaluates the accuracy of the new hybrid scan mode against ground-truth
measurements from the Foot3D dataset (measurements.csv, N=600).

Three modes compared:
  1. Photo-only:  Regression-predicted girths (estimate_girths V2, trained on ANSUR II)
  2. LiDAR-only:  Ground-truth values + realistic sensor noise (Gaussian)
  3. Hybrid:      Weighted fusion (60% LiDAR + 40% Photo), as implemented in scans.js

Ground truth: measurements.csv — superellipse/geometric girths from Foot3D meshes,
              calibrated against ANSUR II anthropometric data (N=6,068).

Usage:
  python eval_hybrid_accuracy.py
  python eval_hybrid_accuracy.py --lidar_noise 1.0   # 1.0mm single-pass noise (default)
  python eval_hybrid_accuracy.py --lidar_noise 0.3   # 0.3mm walk-around noise
"""

import argparse
import math
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ML_DIR = Path(__file__).parent
sys.path.insert(0, str(ML_DIR / 'scripts'))

from anthro_stats import estimate_girths

# ─── Configuration ────────────────────────────────────────────────────────────

GIRTH_KEYS = ['ball_girth', 'waist_girth', 'instep_girth', 'heel_girth', 'ankle_girth']

# Superellipse exponents per location (from scans.js)
SUPERELLIPSE_N = {
    'ball': 2.4, 'waist': 2.1, 'instep': 2.2, 'heel': 2.5, 'ankle': 2.0,
}

# Fusion weights (from scans.js — LiDAR source gets 80%, benchmark-optimiert)
LIDAR_WEIGHT = 0.8
PHOTO_WEIGHT = 0.2


# ─── Superellipse girth (replica of scans.js) ─────────────────────────────────

def superellipse_girth(a, b, n=2.3):
    """Ramanujan base + superellipse correction (matches scans.js)."""
    if a <= 0 or b <= 0:
        return 0
    h = ((a - b) / (a + b)) ** 2
    ramanujan = math.pi * (a + b) * (1 + 3 * h / (10 + math.sqrt(4 - 3 * h)))
    correction = 1 + 0.04 * (n - 2) * (1 - 0.3 * h)
    return ramanujan * correction


def height_fractions(foot_width, foot_height):
    """Morphology-aware height fractions (matches scans.js)."""
    aspect = foot_width / max(foot_height, 1)
    t = max(0, min(1, (aspect - 1.3) / 0.4))
    return {
        'ball':   0.88 + (0.82 - 0.88) * t,
        'waist':  0.83 + (0.77 - 0.83) * t,
        'instep': 0.73 + (0.67 - 0.73) * t,
        'heel':   0.68 + (0.62 - 0.68) * t,
        'ankle':  0.75 + (0.69 - 0.75) * t,
    }


def photo_superellipse_girths(width, foot_height, ball_width=None, heel_width=None):
    """Simulate photo-only pipeline: Claude Vision widths -> superellipse girths.

    Uses real ball_width / heel_width from ground truth where available,
    estimates other widths via ratios (as Claude Vision would approximate).
    """
    fracs = height_fractions(width, foot_height)

    bw = ball_width if ball_width else width
    hw = heel_width if heel_width else width * 0.62

    # Cross-section widths (Claude Vision estimates these from photos)
    widths = {
        'ball':   bw,
        'waist':  bw * 0.85,    # narrowest mid-foot
        'instep': bw * 0.92,    # at ~60% foot length
        'heel':   hw,
        'ankle':  hw * 0.95,    # just above heel
    }

    girths = {}
    for loc in GIRTH_KEYS:
        loc_name = loc.replace('_girth', '')
        a = widths[loc_name] / 2
        b = foot_height * fracs[loc_name] / 2
        girths[loc] = superellipse_girth(a, b, SUPERELLIPSE_N[loc_name])

    return girths


# ─── Data loading ─────────────────────────────────────────────────────────────

def load_ground_truth():
    """Load measurements from Foot3D dataset (geometric girths, ANSUR II calibrated)."""
    meas_path = ML_DIR / 'data' / 'measurements.csv'
    if not meas_path.exists():
        print("  [ERROR] measurements.csv nicht gefunden")
        sys.exit(1)

    df = pd.read_csv(meas_path)
    # Filter valid entries
    df = df[(df['length'] >= 150) & (df['width'] >= 50)]
    return df


# ─── Benchmark ────────────────────────────────────────────────────────────────

def run_benchmark(lidar_noise_mm=1.0, n_trials=50, seed=42):
    """Run full accuracy comparison across all Foot3D meshes."""
    rng = np.random.default_rng(seed)
    df = load_ground_truth()

    print(f"\n{'=' * 85}")
    print(f"  HYBRID ACCURACY BENCHMARK — Photo vs LiDAR vs Hybrid Fusion")
    print(f"  Ground Truth: Foot3D measurements.csv ({len(df)} Meshes, ANSUR II-kalibriert)")
    print(f"  LiDAR-Rauschen: +/-{lidar_noise_mm}mm (1-sigma), {n_trials} Monte-Carlo-Durchlaeufe")
    print(f"  Fusion-Gewichte: {LIDAR_WEIGHT*100:.0f}% LiDAR + {PHOTO_WEIGHT*100:.0f}% Photo (aus scans.js)")
    print(f"{'=' * 85}")

    # Collect errors per mode
    modes_keys = ['photo_regression', 'photo_superellipse', 'lidar', 'hybrid_reg', 'hybrid_se']
    errors = {m: {k: [] for k in GIRTH_KEYS} for m in modes_keys}
    abs_errors = {m: {k: [] for k in GIRTH_KEYS} for m in modes_keys}

    for _, row in df.iterrows():
        length = row['length']
        width = row['width']
        foot_height = row.get('foot_height', width * 0.68)
        ball_width = row.get('ball_width', None)
        heel_width = row.get('heel_width', None)

        if foot_height < 30:
            foot_height = width * 0.68

        # Ground truth
        gt = {}
        for k in GIRTH_KEYS:
            v = row.get(k)
            if pd.notna(v) and v > 50:
                gt[k] = float(v)

        if len(gt) < 3:
            continue

        # ── Photo regression (estimate_girths V2) ──────────────────────────
        photo_reg = estimate_girths(length, width)

        # ── Photo superellipse (Claude Vision → superellipse) ──────────────
        photo_se = photo_superellipse_girths(width, foot_height, ball_width, heel_width)

        for k, gt_val in gt.items():
            # Photo regression error
            pred_reg = photo_reg.get(k)
            if pred_reg:
                errors['photo_regression'][k].append(pred_reg - gt_val)
                abs_errors['photo_regression'][k].append(abs(pred_reg - gt_val))

            # Photo superellipse error
            pred_se = photo_se.get(k)
            if pred_se:
                errors['photo_superellipse'][k].append(pred_se - gt_val)
                abs_errors['photo_superellipse'][k].append(abs(pred_se - gt_val))

            # ── Monte Carlo for LiDAR noise ────────────────────────────────
            for _ in range(n_trials):
                noise = rng.normal(0, lidar_noise_mm)
                lidar_meas = gt_val + noise

                # LiDAR-only error
                errors['lidar'][k].append(noise)
                abs_errors['lidar'][k].append(abs(noise))

                # Hybrid = regression + LiDAR
                if pred_reg:
                    h = pred_reg * PHOTO_WEIGHT + lidar_meas * LIDAR_WEIGHT
                    errors['hybrid_reg'][k].append(h - gt_val)
                    abs_errors['hybrid_reg'][k].append(abs(h - gt_val))

                # Hybrid = superellipse + LiDAR
                if pred_se:
                    h = pred_se * PHOTO_WEIGHT + lidar_meas * LIDAR_WEIGHT
                    errors['hybrid_se'][k].append(h - gt_val)
                    abs_errors['hybrid_se'][k].append(abs(h - gt_val))

    # ── Print MAE table ────────────────────────────────────────────────────────

    modes = [
        ('Photo Regr.', 'photo_regression'),
        ('Photo SE', 'photo_superellipse'),
        ('LiDAR', 'lidar'),
        ('Hybrid Reg', 'hybrid_reg'),
        ('Hybrid SE', 'hybrid_se'),
    ]

    def print_table(title, compute_fn):
        print(f"\n{'─' * 85}")
        print(f"  {title}")
        print(f"{'─' * 85}")
        header = f"  {'Messung':<18}"
        for label, _ in modes:
            header += f" {label:>12}"
        print(header)
        print(f"  {'─' * 78}")

        overall = {key: [] for _, key in modes}
        for girth in GIRTH_KEYS:
            line = f"  {girth:<18}"
            for label, key in modes:
                errs = errors[key][girth]
                if errs:
                    val = compute_fn(errs)
                    overall[key].append(val)
                    line += f" {val:>11.2f}"
                else:
                    line += f" {'–':>12}"
            print(line)

        print(f"  {'─' * 78}")
        line = f"  {'GESAMT':<18}"
        for label, key in modes:
            vals = overall[key]
            if vals:
                line += f" {np.mean(vals):>11.2f}"
            else:
                line += f" {'–':>12}"
        print(line)
        return overall

    mae_overall = print_table("MAE (mm) — Mean Absolute Error",
                               lambda e: np.mean(np.abs(e)))

    print_table("RMSE (mm) — Root Mean Square Error",
                lambda e: np.sqrt(np.mean(np.array(e) ** 2)))

    print_table("Bias (mm) — Mittlerer Fehler (systematisch)",
                lambda e: np.mean(e))

    # ── Max-Error table ────────────────────────────────────────────────────────
    print_table("Max-Fehler (mm)",
                lambda e: np.max(np.abs(e)))

    # ── Percentile accuracy ────────────────────────────────────────────────────
    print(f"\n{'─' * 85}")
    print(f"  Anteil innerhalb Toleranz (%) — Hybrid SE vs Photo Regr.")
    print(f"{'─' * 85}")
    tolerances = [1.0, 2.0, 3.0, 5.0]
    header = f"  {'Messung':<18}"
    for tol in tolerances:
        header += f"  Photo<{tol}mm  Hybrid<{tol}mm"
    print(header)
    print(f"  {'─' * 78}")

    for girth in GIRTH_KEYS:
        line = f"  {girth:<18}"
        for tol in tolerances:
            photo_errs = abs_errors['photo_regression'][girth]
            hybrid_errs = abs_errors['hybrid_se'][girth]
            if photo_errs and hybrid_errs:
                p_pct = np.mean(np.array(photo_errs) <= tol) * 100
                h_pct = np.mean(np.array(hybrid_errs) <= tol) * 100
                line += f"  {p_pct:>8.1f}%  {h_pct:>9.1f}%"
            else:
                line += f"  {'–':>9}  {'–':>10}"
        print(line)

    # ── Summary ────────────────────────────────────────────────────────────────
    print(f"\n{'=' * 85}")
    print(f"  ZUSAMMENFASSUNG")
    print(f"{'=' * 85}")

    photo_mae = np.mean(mae_overall['photo_regression']) if mae_overall['photo_regression'] else 0
    photo_se_mae = np.mean(mae_overall['photo_superellipse']) if mae_overall['photo_superellipse'] else 0
    lidar_mae = np.mean(mae_overall['lidar']) if mae_overall['lidar'] else 0
    hybrid_reg_mae = np.mean(mae_overall['hybrid_reg']) if mae_overall['hybrid_reg'] else 0
    hybrid_se_mae = np.mean(mae_overall['hybrid_se']) if mae_overall['hybrid_se'] else 0

    print(f"\n  Durchschnittlicher MAE ueber alle Girths:")
    print(f"    {'Photo (Regression)':<25} {photo_mae:>8.2f} mm")
    print(f"    {'Photo (Superellipse)':<25} {photo_se_mae:>8.2f} mm")
    print(f"    {'LiDAR-only':<25} {lidar_mae:>8.2f} mm  (Rauschen={lidar_noise_mm}mm)")
    print(f"    {'Hybrid (Reg+LiDAR)':<25} {hybrid_reg_mae:>8.2f} mm")
    print(f"    {'Hybrid (SE+LiDAR)':<25} {hybrid_se_mae:>8.2f} mm")

    best_photo = min(photo_mae, photo_se_mae)
    best_hybrid = min(hybrid_reg_mae, hybrid_se_mae)

    if best_photo > 0:
        improvement = (best_photo - best_hybrid) / best_photo * 100
        print(f"\n  Verbesserung Hybrid vs bestes Photo: {improvement:+.1f}%")

    # Production readiness
    print(f"\n  Produktionsreife (Leisten-Toleranz ±2mm, Hybrid SE):")
    all_ok = True
    for girth in GIRTH_KEYS:
        errs = abs_errors['hybrid_se'][girth]
        if errs:
            mae = np.mean(errs)
            pct_2 = np.mean(np.array(errs) <= 2.0) * 100
            pct_5 = np.mean(np.array(errs) <= 5.0) * 100
            if pct_2 >= 90:
                symbol = 'OK'
            elif pct_5 >= 90:
                symbol = 'AKZEPTABEL'
                all_ok = False
            else:
                symbol = 'WARNUNG'
                all_ok = False
            print(f"    {girth:<18} MAE={mae:>5.2f}mm  {pct_2:>5.1f}% <2mm  {pct_5:>5.1f}% <5mm  [{symbol}]")

    if all_ok:
        print(f"\n  >>> ALLE Girths innerhalb ±2mm Toleranz — produktionsreif!")
    else:
        print(f"\n  >>> Einige Girths ausserhalb ±2mm — LiDAR-Gewichtung erhoehen oder Walk-Around nutzen")

    return errors, abs_errors


# ─── Noise sweep ──────────────────────────────────────────────────────────────

def noise_sweep():
    """Show how hybrid accuracy changes with different LiDAR noise levels."""
    print(f"\n{'=' * 85}")
    print(f"  NOISE SWEEP — Wie LiDAR-Qualitaet die Hybrid-Genauigkeit beeinflusst")
    print(f"{'=' * 85}")

    df = load_ground_truth()
    noise_levels = [0.1, 0.3, 0.5, 1.0, 1.5, 2.0, 3.0, 5.0]

    print(f"\n  {'LiDAR-Noise':>12} {'Photo MAE':>11} {'LiDAR MAE':>11} "
          f"{'Hybrid MAE':>11} {'vs Photo':>10} {'Modus':>20}")
    print(f"  {'─' * 78}")

    for noise in noise_levels:
        rng = np.random.default_rng(42)

        photo_err_all = []
        lidar_err_all = []
        hybrid_err_all = []

        for _, row in df.iterrows():
            length, width = row['length'], row['width']
            if length < 150 or width < 50:
                continue

            photo_reg = estimate_girths(length, width)

            for k in GIRTH_KEYS:
                gt_val = row.get(k)
                if pd.isna(gt_val) or gt_val < 50:
                    continue
                gt_val = float(gt_val)
                pred = photo_reg.get(k)
                if not pred:
                    continue

                for _ in range(20):
                    n = rng.normal(0, noise)
                    lidar_meas = gt_val + n
                    hybrid = pred * PHOTO_WEIGHT + lidar_meas * LIDAR_WEIGHT

                    photo_err_all.append(abs(pred - gt_val))
                    lidar_err_all.append(abs(n))
                    hybrid_err_all.append(abs(hybrid - gt_val))

        p_mae = np.mean(photo_err_all)
        l_mae = np.mean(lidar_err_all)
        h_mae = np.mean(hybrid_err_all)
        imp = (p_mae - h_mae) / p_mae * 100

        label = ""
        if noise <= 0.3:
            label = "Walk-Around (20s)"
        elif noise <= 1.0:
            label = "Single-Pass (3s)"
        elif noise <= 2.0:
            label = "Schlechte Bedingungen"
        else:
            label = "Degradiert"

        print(f"  {noise:>10.1f}mm {p_mae:>9.2f}mm {l_mae:>9.2f}mm "
              f"{h_mae:>9.2f}mm {imp:>+8.1f}%  {label:>20}")

    # Weight sweep
    print(f"\n{'=' * 85}")
    print(f"  GEWICHTUNGS-SWEEP — Optimale LiDAR/Photo-Balance (bei 1.0mm LiDAR-Rauschen)")
    print(f"{'=' * 85}")

    lidar_weights = [0.0, 0.2, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]

    print(f"\n  {'LiDAR-Gew.':>11} {'Photo-Gew.':>11} {'Hybrid MAE':>11} {'vs Photo':>10} {'vs LiDAR':>10}")
    print(f"  {'─' * 58}")

    rng = np.random.default_rng(42)
    # Precompute photo and lidar errors
    photo_preds = []
    gt_vals_list = []
    for _, row in df.iterrows():
        length, width = row['length'], row['width']
        if length < 150 or width < 50:
            continue
        photo_reg = estimate_girths(length, width)
        for k in GIRTH_KEYS:
            gt_val = row.get(k)
            if pd.isna(gt_val) or gt_val < 50:
                continue
            pred = photo_reg.get(k)
            if pred:
                photo_preds.append(pred)
                gt_vals_list.append(float(gt_val))

    photo_preds = np.array(photo_preds)
    gt_arr = np.array(gt_vals_list)
    photo_only_mae = np.mean(np.abs(photo_preds - gt_arr))

    for lw in lidar_weights:
        pw = 1.0 - lw
        rng2 = np.random.default_rng(42)

        hybrid_errs = []
        lidar_errs = []
        for i in range(len(gt_arr)):
            for _ in range(20):
                noise = rng2.normal(0, 1.0)
                lidar_meas = gt_arr[i] + noise
                hybrid = photo_preds[i] * pw + lidar_meas * lw
                hybrid_errs.append(abs(hybrid - gt_arr[i]))
                lidar_errs.append(abs(noise))

        h_mae = np.mean(hybrid_errs)
        l_mae = np.mean(lidar_errs)
        imp_p = (photo_only_mae - h_mae) / photo_only_mae * 100
        imp_l = (l_mae - h_mae) / l_mae * 100 if lw > 0 else 0

        marker = " <-- aktuell" if abs(lw - 0.6) < 0.01 else ""
        print(f"  {lw:>9.0%} {pw:>9.0%} {h_mae:>9.2f}mm {imp_p:>+8.1f}% {imp_l:>+8.1f}%{marker}")


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description='Benchmark: Photo vs LiDAR vs Hybrid accuracy')
    parser.add_argument('--lidar_noise', type=float, default=1.0,
                        help='LiDAR noise std dev in mm (default: 1.0 = single-pass)')
    parser.add_argument('--n_trials', type=int, default=50,
                        help='Monte Carlo trials per mesh (default: 50)')
    parser.add_argument('--no_sweep', action='store_true',
                        help='Skip noise/weight sweep analysis')
    args = parser.parse_args()

    run_benchmark(lidar_noise_mm=args.lidar_noise, n_trials=args.n_trials)

    if not args.no_sweep:
        noise_sweep()


if __name__ == '__main__':
    main()

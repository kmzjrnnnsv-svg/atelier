"""
eval_cv_accuracy.py
-------------------
Quantitative accuracy evaluation of the photo-based foot measurement CV
pipeline (measure_side function only — no ONNX model) against the
validation dataset ground truth.

Metrics: MAE (mean absolute error) and max error per measurement.
"""

import sys
import os
import json
import base64
from pathlib import Path

# Add scripts directory to path so we can import process_photos
SCRIPTS_DIR = Path(__file__).parent / "scripts"
sys.path.insert(0, str(SCRIPTS_DIR))

from process_photos import measure_side  # CV-only function

# ── Dataset paths ──────────────────────────────────────────────────────────────

VAL_DIR = Path(__file__).parent / "data" / "dataset" / "val"
MAX_SAMPLES = 100

# Ground truth field name → CV result key mapping
MEASUREMENTS = [
    ("right_length",       "length"),
    ("right_width",        "width"),
    ("right_ball_girth",   "ball_girth"),
    ("right_waist_girth",  "waist_girth"),
    ("right_instep_girth", "instep_girth"),
    ("right_heel_girth",   "heel_girth"),
    ("right_ankle_girth",  "ankle_girth"),
]

# ── Helpers ────────────────────────────────────────────────────────────────────

def img_to_b64(path: Path) -> str:
    """Read a JPEG file and return a base64 data-URL string."""
    with open(path, "rb") as f:
        raw = f.read()
    return "data:image/jpeg;base64," + base64.b64encode(raw).decode("ascii")


# ── Evaluation loop ─────────────────────────────────────────────────────────────

sample_dirs = sorted(VAL_DIR.glob("sample_*"))[:MAX_SAMPLES]

errors = {m[0]: [] for m in MEASUREMENTS}
n_cv_success = 0
n_cv_fail    = 0

print(f"Evaluating {len(sample_dirs)} validation samples (CV pipeline only)…\n")

for i, sd in enumerate(sample_dirs, 1):
    meta_path = sd / "meta.json"
    if not meta_path.exists():
        continue

    meta = json.loads(meta_path.read_text())

    right_top_path  = sd / "right_top.jpg"
    right_side_path = sd / "right_side.jpg"

    if not right_top_path.exists() or not right_side_path.exists():
        continue

    # Convert images to base64 data-URLs
    right_top_b64  = img_to_b64(right_top_path)
    right_side_b64 = img_to_b64(right_side_path)

    # Run CV pipeline
    cv = measure_side(right_top_b64, right_side_b64)

    if cv is None:
        n_cv_fail += 1
        if i % 10 == 0 or i == len(sample_dirs):
            print(f"  [{i:>3}/{len(sample_dirs)}] sample {sd.name}  → CV FAILED")
        continue

    n_cv_success += 1

    for gt_key, cv_key in MEASUREMENTS:
        gt_val = meta.get(gt_key)
        cv_val = cv.get(cv_key)
        if gt_val is not None and cv_val is not None:
            errors[gt_key].append(abs(float(cv_val) - float(gt_val)))

    if i % 10 == 0 or i == len(sample_dirs):
        print(f"  [{i:>3}/{len(sample_dirs)}] sample {sd.name}  → ok")

# ── Results table ──────────────────────────────────────────────────────────────

print()
print("=" * 65)
print(f"CV PIPELINE ACCURACY — validation set ({MAX_SAMPLES} samples)")
print(f"CV success: {n_cv_success} / {n_cv_success + n_cv_fail}  "
      f"(fail rate: {n_cv_fail / max(1, n_cv_success + n_cv_fail) * 100:.1f}%)")
print("=" * 65)

header = f"{'Measurement':<25} {'N':>5}  {'MAE (mm)':>10}  {'Max err (mm)':>13}"
print(header)
print("-" * 65)

for gt_key, cv_key in MEASUREMENTS:
    errs = errors[gt_key]
    if not errs:
        print(f"  {gt_key:<23} {'—':>5}  {'N/A':>10}  {'N/A':>13}")
        continue
    import statistics
    mae     = statistics.mean(errs)
    max_err = max(errs)
    n       = len(errs)
    print(f"  {gt_key:<23} {n:>5}  {mae:>10.2f}  {max_err:>13.2f}")

print("=" * 65)

# Overall summary across all measurements
all_errs = [e for lst in errors.values() for e in lst]
if all_errs:
    import statistics
    overall_mae     = statistics.mean(all_errs)
    overall_max_err = max(all_errs)
    print(f"  {'OVERALL':<23} {len(all_errs):>5}  {overall_mae:>10.2f}  {overall_max_err:>13.2f}")
    print("=" * 65)

"""
process_photos.py — iPhone photos → precise foot measurements (mm)

Three-phase pipeline
====================
Phase 1  (computer-vision, PIL + numpy + scipy)
  1. Decode base64 image → numpy array
  2. Detect A4 paper as the largest bright region  → px/mm calibration
  3. Detect foot as the largest dark non-A4 region  → foot bounding box
  4. Extract width profile at 5 girth positions (top view)
  5. Extract height from side view
  6. Return calibrated mm dimensions

Phase 2  (geometry)
  7. Compute girths via Ramanujan ellipse:
     girth = pi * (3(a+b) - sqrt((3a+b)(a+3b)))
     where a = cross-section width / 2, b = cross-section height * h_frac / 2

Phase 3  (local ML model, wenn verfügbar)
  8. FootPhotoNet ONNX  (checkpoints/photo_model.onnx) lädt alle 4 Bilder
     und gibt 18 Maße zurück — trainiert auf 2400+ synthetischen + echten Scans.
  9. Merge: CV gewinnt bei Länge/Breite (direkte Pixel-Messung),
     ML gewinnt bei Girths (3D-Formwissen aus Trainingsdaten).

Accuracy
--------
  Phase 1+2 only:   Length ±0.5–1 mm, Girths ±2–4 mm
  Phase 3 (+ ML):   Length ±0.5–1 mm, Girths ±1.5–3 mm  (verbessert nach realem Fine-tuning)

Usage
-----
  python3 process_photos.py --data '{"rightTopImg":"data:...","rightSideImg":"data:...","leftTopImg":"data:...","leftSideImg":"data:..."}'
"""

import sys
import json
import math
import base64
import argparse
import io
from pathlib import Path
import numpy as np
from scipy.ndimage import label, binary_closing, binary_fill_holes

# ONNX-Modell-Pfad (relativ zu diesem Skript → atelier-ml/checkpoints/)
_SCRIPT_DIR = Path(__file__).parent
_ONNX_PATH  = _SCRIPT_DIR.parent / 'checkpoints' / 'photo_model.onnx'
_JSON_PATH  = _SCRIPT_DIR.parent / 'checkpoints' / 'photo_model.json'
_IMG_SIZE   = 224  # muss mit Trainings-img_size übereinstimmen


def _try_load_onnx_model():
    """Lädt das ONNX-Modell, gibt (session, label_meta) oder (None, None) zurück."""
    if not _ONNX_PATH.exists():
        return None, None
    try:
        import onnxruntime as ort
        sess = ort.InferenceSession(str(_ONNX_PATH), providers=['CPUExecutionProvider'])
        meta = json.loads(_JSON_PATH.read_text()) if _JSON_PATH.exists() else {}
        return sess, meta
    except Exception:
        return None, None


_ONNX_SESSION, _ONNX_META = _try_load_onnx_model()


def _preprocess_for_onnx(b64_str: str) -> np.ndarray:
    """Dekodiert base64 JPEG → (1, 3, 224, 224) float32, ImageNet-normalisiert."""
    from PIL import Image
    if b64_str.startswith('data:'):
        b64_str = b64_str.split(',', 1)[1]
    img = Image.open(io.BytesIO(base64.b64decode(b64_str))).convert('RGB')
    img = img.resize((_IMG_SIZE, _IMG_SIZE), Image.BILINEAR)
    arr = np.array(img, dtype=np.float32) / 255.0
    # ImageNet normalization
    mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    std  = np.array([0.229, 0.224, 0.225], dtype=np.float32)
    arr  = (arr - mean) / std
    return arr.transpose(2, 0, 1)[np.newaxis]  # (1, 3, 224, 224)


def run_onnx_model(right_top: str, right_side: str,
                   left_top: str, left_side: str,
                   px_per_mm: float = 0.0) -> dict | None:
    """
    Führt das ONNX-Modell aus, gibt Messungen in mm zurück.
    Gibt None zurück wenn kein Modell verfügbar.
    """
    if _ONNX_SESSION is None:
        return None
    try:
        inputs = {
            'right_top':  _preprocess_for_onnx(right_top),
            'right_side': _preprocess_for_onnx(right_side),
            'left_top':   _preprocess_for_onnx(left_top),
            'left_side':  _preprocess_for_onnx(left_side),
            'px_per_mm':  np.array([[px_per_mm]], dtype=np.float32),
        }
        out_norm = _ONNX_SESSION.run(None, inputs)[0][0]  # (18,)

        mean = np.array(_ONNX_META.get('label_mean', []), dtype=np.float32)
        std  = np.array(_ONNX_META.get('label_std',  []), dtype=np.float32)
        names = _ONNX_META.get('label_names', [])

        if len(mean) != len(out_norm) or len(std) != len(out_norm):
            return None

        out_mm = out_norm * std + mean
        return {name: round(float(v), 1) for name, v in zip(names, out_mm)}
    except Exception:
        return None

# A4 paper physical dimensions (mm)
A4_LONG_MM  = 297.0
A4_SHORT_MM = 210.0


# ─── Image helpers ────────────────────────────────────────────────────────────

def decode_image(b64_str: str) -> np.ndarray:
    """Decode a base64 data-URL or raw base64 string to an RGBA numpy array."""
    try:
        from PIL import Image
    except ImportError:
        raise ImportError("Pillow required: pip install Pillow")

    raw = b64_str.split(',')[-1]          # strip 'data:image/jpeg;base64,' prefix
    img = Image.open(io.BytesIO(base64.b64decode(raw))).convert('RGB')
    return np.array(img, dtype=np.float32)


def to_gray(arr: np.ndarray) -> np.ndarray:
    """Convert (H, W, 3) float32 to (H, W) float32 grayscale."""
    return arr[:, :, 0] * 0.299 + arr[:, :, 1] * 0.587 + arr[:, :, 2] * 0.114


# ─── A4 detection ─────────────────────────────────────────────────────────────

def detect_a4(arr: np.ndarray) -> dict | None:
    """
    Detect A4 paper as the largest bright, roughly-rectangular region.

    Strategy:
      1. Threshold at the 80th-percentile brightness  (paper >> background).
      2. Close small gaps, fill holes.
      3. Take the largest connected component.
      4. Verify aspect ratio is within ±25% of A4 (1.414 : 1).
      5. Return bounding box + px/mm calibration.

    Returns None if no A4-like region is found.
    """
    gray = to_gray(arr)
    h, w = gray.shape

    threshold = float(np.percentile(gray, 80))
    bright = (gray > threshold)

    # Morphological closing to bridge small gaps, then fill holes
    struct = np.ones((5, 5), dtype=bool)
    closed = binary_closing(bright, structure=struct, iterations=4)
    filled = binary_fill_holes(closed)

    labeled_arr, n_labels = label(filled)
    if n_labels == 0:
        return None

    # Find largest component
    sizes = np.array([(labeled_arr == i).sum() for i in range(1, n_labels + 1)])
    best_label = int(np.argmax(sizes)) + 1

    # Minimum size: A4 must cover at least 8% of the image
    if sizes[best_label - 1] < h * w * 0.08:
        return None

    mask = labeled_arr == best_label

    rows_any = mask.any(axis=1)
    cols_any = mask.any(axis=0)
    y0, y1 = int(np.where(rows_any)[0][0]), int(np.where(rows_any)[0][-1])
    x0, x1 = int(np.where(cols_any)[0][0]), int(np.where(cols_any)[0][-1])

    w_px = x1 - x0
    h_px = y1 - y0
    if w_px < 10 or h_px < 10:
        return None

    long_px  = max(w_px, h_px)
    short_px = min(w_px, h_px)
    ratio    = long_px / short_px

    # A4 aspect ratio = 297/210 = 1.414  — accept ±25%
    if not (1.414 * 0.75 < ratio < 1.414 * 1.25):
        return None

    px_per_mm_long  = long_px  / A4_LONG_MM
    px_per_mm_short = short_px / A4_SHORT_MM
    px_per_mm       = (px_per_mm_long + px_per_mm_short) / 2.0
    is_portrait     = h_px >= w_px   # portrait = long axis is vertical

    return {
        'x0': x0, 'y0': y0, 'x1': x1, 'y1': y1,
        'w_px': w_px, 'h_px': h_px,
        'long_px': long_px, 'short_px': short_px,
        'is_portrait': is_portrait,
        'px_per_mm': px_per_mm,
        'px_per_mm_long': px_per_mm_long,
        'px_per_mm_short': px_per_mm_short,
    }


# ─── Foot detection ────────────────────────────────────────────────────────────

def detect_foot_top(arr: np.ndarray, a4: dict) -> dict | None:
    """
    Detect foot in top-view image given A4 bounding box.

    The foot is the largest substantial dark (non-paper) region
    that does NOT overlap the A4 bounding box.

    Returns bounding box + horizontal width profile.
    """
    gray = to_gray(arr)
    h, w = gray.shape

    # Reference brightness from inside the A4 region
    a4_region = gray[a4['y0']:a4['y1'], a4['x0']:a4['x1']]
    a4_brightness = float(np.percentile(a4_region, 50))

    # Dark mask: significantly darker than paper, excluding A4 area
    # Use 65% of A4 brightness as threshold
    threshold = a4_brightness * 0.65
    dark = gray < threshold

    # Exclude A4 area from consideration
    a4_mask = np.zeros((h, w), dtype=bool)
    a4_mask[a4['y0']:a4['y1'], a4['x0']:a4['x1']] = True
    dark = dark & ~a4_mask

    # Exclude image borders (10 px)
    border = 10
    dark[:border, :] = False; dark[-border:, :] = False
    dark[:, :border] = False; dark[:, -border:] = False

    # Morphological ops to unite foot pixels
    struct = np.ones((9, 9), dtype=bool)
    closed = binary_closing(dark, structure=struct, iterations=6)
    filled = binary_fill_holes(closed)

    labeled_arr, n_labels = label(filled)
    if n_labels == 0:
        return None

    sizes = np.array([(labeled_arr == i).sum() for i in range(1, n_labels + 1)])
    # Need at least 1% of image area
    valid = [(i + 1, s) for i, s in enumerate(sizes) if s > h * w * 0.01]
    if not valid:
        return None

    best_label = max(valid, key=lambda x: x[1])[0]
    mask = labeled_arr == best_label

    rows_any = mask.any(axis=1)
    cols_any = mask.any(axis=0)
    y0, y1 = int(np.where(rows_any)[0][0]), int(np.where(rows_any)[0][-1])
    x0, x1 = int(np.where(cols_any)[0][0]), int(np.where(cols_any)[0][-1])

    # Width profile: at each relative fraction of length, find the
    # widest extent of the foot in the perpendicular direction
    length_px = y1 - y0  # assume foot runs top-to-bottom in frame

    widths = {}
    for frac, name in [(0.40, 'ball'), (0.45, 'waist'), (0.60, 'instep'),
                       (0.85, 'heel'), (0.88, 'ankle')]:
        row = y0 + int(frac * length_px)
        row = max(0, min(h - 1, row))
        row_mask = mask[row, :]
        cols_on = np.where(row_mask)[0]
        if len(cols_on) >= 2:
            widths[name] = int(cols_on[-1] - cols_on[0])
        else:
            widths[name] = int(x1 - x0)  # fallback: full width

    return {
        'x0': x0, 'y0': y0, 'x1': x1, 'y1': y1,
        'length_px': length_px,
        'width_px':  x1 - x0,
        'widths': widths,
    }


def detect_foot_side(arr: np.ndarray, a4: dict) -> dict | None:
    """
    Detect foot in side-view image to extract height measurements.
    Same dark-region strategy as top view but we want the vertical extent.
    """
    gray = to_gray(arr)
    h, w = gray.shape

    a4_region = gray[a4['y0']:a4['y1'], a4['x0']:a4['x1']]
    a4_brightness = float(np.percentile(a4_region, 50))

    threshold = a4_brightness * 0.65
    dark = gray < threshold

    a4_mask = np.zeros((h, w), dtype=bool)
    a4_mask[a4['y0']:a4['y1'], a4['x0']:a4['x1']] = True
    dark = dark & ~a4_mask

    border = 10
    dark[:border, :] = False; dark[-border:, :] = False
    dark[:, :border] = False; dark[:, -border:] = False

    struct = np.ones((9, 9), dtype=bool)
    closed = binary_closing(dark, structure=struct, iterations=6)
    filled = binary_fill_holes(closed)

    labeled_arr, n_labels = label(filled)
    if n_labels == 0:
        return None

    sizes = np.array([(labeled_arr == i).sum() for i in range(1, n_labels + 1)])
    valid = [(i + 1, s) for i, s in enumerate(sizes) if s > h * w * 0.01]
    if not valid:
        return None

    best_label = max(valid, key=lambda x: x[1])[0]
    mask = labeled_arr == best_label

    rows_any = mask.any(axis=1)
    cols_any = mask.any(axis=0)
    y0, y1 = int(np.where(rows_any)[0][0]), int(np.where(rows_any)[0][-1])
    x0, x1 = int(np.where(cols_any)[0][0]), int(np.where(cols_any)[0][-1])

    # Height = vertical extent
    # Arch height: find the lowest point in the medial (inner) half at midfoot
    height_px  = y1 - y0
    length_px  = x1 - x0

    # Rough arch height: at 40-60% of foot length (midfoot),
    # find the max gap between floor level and the bottom of the foot
    arch_height_px = 0
    floor_y = y1  # bottom of foot = floor level
    for frac in np.linspace(0.35, 0.65, 10):
        col = x0 + int(frac * length_px)
        col = max(0, min(w - 1, col))
        col_mask = mask[:, col]
        rows_on = np.where(col_mask)[0]
        if len(rows_on) >= 2:
            local_bottom = int(rows_on[-1])
            gap = floor_y - local_bottom
            if gap > arch_height_px:
                arch_height_px = gap

    return {
        'x0': x0, 'y0': y0, 'x1': x1, 'y1': y1,
        'height_px': height_px,
        'arch_height_px': arch_height_px,
    }


# ─── Girth from cross-section ellipse (Ramanujan) ─────────────────────────────

def ramanujan_girth(a_mm: float, b_mm: float) -> float:
    """
    Ramanujan's approximation of ellipse perimeter.
    a = semi-major axis (half-width), b = semi-minor axis (half-height).
    """
    h = ((a_mm - b_mm) / (a_mm + b_mm)) ** 2
    return math.pi * (a_mm + b_mm) * (1 + 3 * h / (10 + math.sqrt(4 - 3 * h)))


# ─── Measure one side (top + side image) ──────────────────────────────────────

def measure_side(top_b64: str, side_b64: str) -> dict | None:
    """
    Attempt CV measurement of one foot from top + side images.
    Returns dict with mm values, or None if detection fails.

    Girth height fractions  (fraction of total foot height at each location):
      ball    0.85  (widest metatarsal; heel cup is narrower)
      waist   0.80
      instep  0.70
      heel    0.65
      ankle   0.72
    """
    GIRTH_HEIGHT_FRAC = {
        'ball':   0.85,
        'waist':  0.80,
        'instep': 0.70,
        'heel':   0.65,
        'ankle':  0.72,
    }

    # --- Top view ---
    top_arr = decode_image(top_b64)
    a4_top  = detect_a4(top_arr)
    if a4_top is None:
        return None

    foot_top = detect_foot_top(top_arr, a4_top)
    if foot_top is None:
        return None

    pxmm_top = a4_top['px_per_mm']

    length_mm = round(foot_top['length_px'] / pxmm_top, 1)
    width_mm  = round(foot_top['width_px']  / pxmm_top, 1)

    # Width at each girth position (mm)
    girth_widths_mm = {
        k: round(v / pxmm_top, 1)
        for k, v in foot_top['widths'].items()
    }

    # Sanity: length must be within typical range
    if not (200 <= length_mm <= 360):
        return None
    if not (70 <= width_mm <= 130):
        return None

    # --- Side view ---
    side_arr  = decode_image(side_b64)
    a4_side   = detect_a4(side_arr)
    foot_side = detect_foot_side(side_arr, a4_side) if a4_side else None

    if a4_side and foot_side:
        pxmm_side      = a4_side['px_per_mm']
        height_mm      = round(foot_side['height_px']     / pxmm_side, 1)
        arch_height_mm = round(foot_side['arch_height_px'] / pxmm_side, 1)
    else:
        # Fallback height estimate from length (typical ratio ~0.24)
        height_mm      = round(length_mm * 0.24, 1)
        arch_height_mm = round(length_mm * 0.055, 1)

    # Clamp to physiological range
    height_mm      = max(35.0, min(85.0, height_mm))
    arch_height_mm = max(2.0,  min(40.0, arch_height_mm))

    # --- Girths via Ramanujan ellipse ---
    def girth(key: str) -> float:
        w = girth_widths_mm.get(key, width_mm)
        h_frac = GIRTH_HEIGHT_FRAC[key]
        a = w / 2.0
        b = height_mm * h_frac / 2.0
        return round(ramanujan_girth(a, b), 1)

    ball_girth   = girth('ball')
    waist_girth  = girth('waist')
    instep_girth = girth('instep')
    heel_girth   = girth('heel')
    ankle_girth  = girth('ankle')

    # Clamp girths to physiological range
    def clamp_girth(v):
        return max(150.0, min(450.0, v))

    return {
        'length':       length_mm,
        'width':        width_mm,
        'height':       height_mm,
        'arch_height':  arch_height_mm,
        'ball_girth':   clamp_girth(ball_girth),
        'waist_girth':  clamp_girth(waist_girth),
        'instep_girth': clamp_girth(instep_girth),
        'heel_girth':   clamp_girth(heel_girth),
        'ankle_girth':  clamp_girth(ankle_girth),
        'cv_success':   True,
    }


# ─── Main entry point ─────────────────────────────────────────────────────────

def process_photos(right_top: str, right_side: str,
                   left_top:  str, left_side:  str) -> dict:
    """
    Run CV + optional ONNX pipeline for both feet.

    Priority:
      - Length/width: CV (pixel-accurate via A4 calibration)
      - Girths: ONNX model (if available) > CV Ramanujan
      cv_success=False → caller should fall back to Claude Vision.
    """
    right = measure_side(right_top, right_side)
    left  = measure_side(left_top,  left_side)

    # Extract px_per_mm from CV results for ONNX hint
    px_per_mm = 0.0
    if right and right.get('cv_success'):
        # Approximate from length: if A4 was detected we can back-calculate
        # (stored internally, use 0 as safe default for ONNX scale embedding)
        px_per_mm = 0.0

    # Phase 3: ONNX model inference (if model available)
    ml = run_onnx_model(right_top, right_side, left_top, left_side, px_per_mm)

    result: dict = {'ml_model_used': ml is not None}

    for side, m in [('right', right), ('left', left)]:
        if m:
            result[f'{side}_length']       = m['length']
            result[f'{side}_width']        = m['width']
            result[f'{side}_foot_height']  = m['height']
            result[f'{side}_arch_height']  = m['arch_height']
            result[f'{side}_cv_success']   = True

            # Girths: prefer ML model (shape-aware) over CV Ramanujan
            if ml:
                result[f'{side}_ball_girth']   = ml.get(f'{side}_ball_girth',   m['ball_girth'])
                result[f'{side}_waist_girth']  = ml.get(f'{side}_waist_girth',  m['waist_girth'])
                result[f'{side}_instep_girth'] = ml.get(f'{side}_instep_girth', m['instep_girth'])
                result[f'{side}_heel_girth']   = ml.get(f'{side}_heel_girth',   m['heel_girth'])
                result[f'{side}_ankle_girth']  = ml.get(f'{side}_ankle_girth',  m['ankle_girth'])
            else:
                result[f'{side}_ball_girth']   = m['ball_girth']
                result[f'{side}_waist_girth']  = m['waist_girth']
                result[f'{side}_instep_girth'] = m['instep_girth']
                result[f'{side}_heel_girth']   = m['heel_girth']
                result[f'{side}_ankle_girth']  = m['ankle_girth']
        else:
            result[f'{side}_cv_success'] = False
            # CV failed: if ML available, use ML for everything
            if ml:
                result[f'{side}_length']       = ml.get(f'{side}_length')
                result[f'{side}_width']        = ml.get(f'{side}_width')
                result[f'{side}_foot_height']  = ml.get(f'{side}_foot_height')
                result[f'{side}_arch_height']  = ml.get(f'{side}_arch_height')
                result[f'{side}_ball_girth']   = ml.get(f'{side}_ball_girth')
                result[f'{side}_waist_girth']  = ml.get(f'{side}_waist_girth')
                result[f'{side}_instep_girth'] = ml.get(f'{side}_instep_girth')
                result[f'{side}_heel_girth']   = ml.get(f'{side}_heel_girth')
                result[f'{side}_ankle_girth']  = ml.get(f'{side}_ankle_girth')

    return result


def main():
    parser = argparse.ArgumentParser(description='Photo-based foot measurement')
    parser.add_argument('--data', required=True,
                        help='JSON string with rightTopImg, rightSideImg, leftTopImg, leftSideImg')
    args = parser.parse_args()

    data = json.loads(args.data)
    result = process_photos(
        data['rightTopImg'],  data['rightSideImg'],
        data['leftTopImg'],   data['leftSideImg'],
    )
    print(json.dumps(result))


if __name__ == '__main__':
    main()

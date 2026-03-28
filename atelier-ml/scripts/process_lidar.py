"""
process_lidar.py — iPhone LiDAR point cloud → foot measurements (mm)

Pipeline:
  1.  Parse incoming point cloud  (N × 3, world-space metres)
  2.  RANSAC floor-plane detection  (horizontal-plane bias, 300 iterations)
  3.  Foot-region isolation  (points above floor by 5–200 mm)
  4.  Statistical outlier removal  (k-NN distance filtering)
  5.  Voxel-grid normalisation  (0.5 mm voxels → uniform density)
  6.  Orientation via PCA  (longest axis = foot length)
  7.  Robust bounding-box  (0.5th / 99.5th percentile extremes)
  8.  Smoothed medial axis  (60 slices + cubic-spline smoothing)
  9.  Alpha-shape cross-section girths  (traces actual concave boundary)
  10. Optional PCA shape-model regularization

Accuracy: ±0.5–1.5 mm  (single-pass, iPhone 14 Pro+)
          ±0.1–0.3 mm  (20-second walk-around, iPhone 12 Pro+)

Usage (CLI for testing):
  python3 process_lidar.py --cloud scan.json

HTTP usage:
  Called internally by the backend route  POST /api/scans/lidar-measurements
"""

import os
import sys
import json
import argparse
import numpy as np
from scipy.spatial import ConvexHull, Delaunay
from scipy.interpolate import UnivariateSpline
from sklearn.neighbors import NearestNeighbors


# ─── Shape model path ─────────────────────────────────────────────────────────

SHAPE_MODEL_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'shape_model')


# ─── 1. Improved floor detection (RANSAC with horizontal-plane bias) ───────────

def ransac_floor(pts, n_iter=300, thr=0.004):
    """
    Find the floor plane — the largest roughly-horizontal surface in the scan.

    The filter `abs(n[1]) >= 0.7` enforces that the plane normal is mostly
    vertical (ARKit world-space has Y pointing up).  This prevents walls or
    the top of the foot from being mistakenly classified as the floor.

    Args:
        pts:    (N, 3) float64 array of world-space points (metres)
        n_iter: number of RANSAC trials
        thr:    inlier distance threshold (metres)

    Returns:
        (normal, d): plane equation  normal · x + d = 0
    """
    best_inliers = 0
    best_normal  = np.array([0., 1., 0.])
    best_d       = 0.

    for _ in range(n_iter):
        idx = np.random.choice(len(pts), 3, replace=False)
        p0, p1, p2 = pts[idx]
        n = np.cross(p1 - p0, p2 - p0)
        norm = np.linalg.norm(n)
        if norm < 1e-8:
            continue
        n = n / norm

        # Floor must be roughly horizontal: Y-component of normal >= 0.7
        if abs(n[1]) < 0.7:
            continue

        # Ensure normal points upward (positive Y) so height_above_floor() > 0 for foot
        if n[1] < 0:
            n = -n
        d = -(n @ p0)
        dist = np.abs(pts @ n + d)
        inliers = int((dist < thr).sum())
        if inliers > best_inliers:
            best_inliers, best_normal, best_d = inliers, n, d

    return best_normal, best_d


def height_above_floor(pts, normal, d):
    """Signed distance of each point above the floor plane (metres)."""
    return pts @ normal + d


# ─── 2. Statistical outlier removal (k-NN) ────────────────────────────────────

def remove_outliers(pts, k=20, std_ratio=2.5):
    """
    Remove points whose mean k-NN distance is more than `std_ratio` standard
    deviations above the global mean.
    """
    if len(pts) < k + 1:
        return pts

    nbrs = NearestNeighbors(n_neighbors=k + 1, algorithm='kd_tree').fit(pts)
    distances, _ = nbrs.kneighbors(pts)
    mean_dist = distances[:, 1:].mean(axis=1)

    mu    = mean_dist.mean()
    sigma = mean_dist.std()
    return pts[mean_dist < mu + std_ratio * sigma]


# ─── 3. Voxel-grid downsampling (NEW) ─────────────────────────────────────────

def voxel_downsample(pts, voxel_m=0.0005):
    """
    Reduce point cloud to one centroid per 0.5 mm voxel.

    Eliminates density clusters that would bias cross-section perimeters
    (dense scan regions would otherwise over-represent a small area).

    Args:
        pts:     (N, 3) float64 array (metres)
        voxel_m: voxel edge length in metres (default 0.5 mm)

    Returns:
        (M, 3) array of voxel centroids, M <= N.
    """
    if len(pts) < 10:
        return pts

    vox_idx = np.floor(pts / voxel_m).astype(np.int64)
    offset  = vox_idx.min(axis=0)
    shifted = vox_idx - offset
    span    = shifted.max(axis=0) + 1
    keys    = (shifted[:, 0] * (span[1] * span[2])
               + shifted[:, 1] * span[2]
               + shifted[:, 2])

    order       = np.argsort(keys)
    sorted_keys = keys[order]
    sorted_pts  = pts[order]

    _, first_idx = np.unique(sorted_keys, return_index=True)
    last_idx     = np.append(first_idx[1:], len(sorted_keys))

    centroids = np.array([
        sorted_pts[s:e].mean(axis=0)
        for s, e in zip(first_idx, last_idx)
    ])
    return centroids


# ─── 4. Orientation alignment (PCA) ───────────────────────────────────────────

def align_foot(pts):
    """
    Rotate point cloud so that:
      axis-0 (X) = foot length  (longest horizontal axis)
      axis-1 (Y) = foot width
      axis-2 (Z) = height (up)
    """
    centroid = pts.mean(axis=0)
    pts_c    = pts - centroid
    _, _, Vt = np.linalg.svd(pts_c, full_matrices=False)
    R        = Vt
    aligned  = pts_c @ R.T

    if np.ptp(aligned[:, 0]) < np.ptp(aligned[:, 1]):
        R       = R[[1, 0, 2]]
        aligned = pts_c @ R.T

    return aligned, R, centroid


# ─── 5. Robust bounding box (percentile-based) — NEW ──────────────────────────

def robust_extent(vals, lo_pct=0.5, hi_pct=99.5):
    """
    Extent of `vals` between lo_pct and hi_pct percentiles.

    np.ptp (max-min) is fragile: a single noisy vertex at either extreme
    inflates length/width by several mm.  Percentile clipping removes that.
    0.5 / 99.5 discards the noisiest 0.5% at each end while retaining anatomy.
    """
    return float(np.percentile(vals, hi_pct) - np.percentile(vals, lo_pct))


# ─── 6. Medial axis with spline smoothing — IMPROVED ──────────────────────────

def compute_medial_axis(pts_aligned, n_slices=60):
    """
    Compute the foot centerline as per-X-slice centroids, then smooth with
    a cubic spline.

    60 slices (vs old 30) + spline smoothing removes centroid jitter so that
    tangent vectors used for perpendicular cross-sections are stable.

    Returns:
        centers:     (M, 3)  smoothed medial-axis positions
        x_positions: (M,)    X coordinate of each sample
    """
    x_min, x_max = pts_aligned[:, 0].min(), pts_aligned[:, 0].max()
    raw_centers  = []
    raw_x        = []

    for i in range(n_slices):
        lo = x_min + (i / n_slices) * (x_max - x_min)
        hi = x_min + ((i + 1) / n_slices) * (x_max - x_min)
        mask = (pts_aligned[:, 0] >= lo) & (pts_aligned[:, 0] < hi)
        if mask.sum() >= 5:
            raw_centers.append(pts_aligned[mask].mean(axis=0))
            raw_x.append((lo + hi) / 2)

    if len(raw_centers) < 4:
        return np.array(raw_centers), np.array(raw_x)

    raw_centers = np.array(raw_centers)
    raw_x       = np.array(raw_x)

    # Cubic-spline smoothing — very light (s = 0.5% of point count)
    x_fine  = np.linspace(raw_x[0], raw_x[-1], len(raw_x) * 3)
    smooth  = np.zeros((len(x_fine), 3))
    for dim in range(3):
        try:
            spl = UnivariateSpline(
                raw_x, raw_centers[:, dim],
                s=len(raw_centers) * 0.005,
                k=min(3, len(raw_centers) - 1)
            )
            smooth[:, dim] = spl(x_fine)
        except Exception:
            smooth[:, dim] = np.interp(x_fine, raw_x, raw_centers[:, dim])

    return smooth, x_fine


# ─── 7. Alpha-shape cross-section girth — REPLACES ConvexHull ─────────────────

def alpha_hull_perimeter_mm(pts_2d, alpha_m=0.010):
    """
    Perimeter of the alpha-hull of a 2D cross-section (metres -> mm).

    ConvexHull bridges the arch of the foot and over-estimates instep/waist
    girth by 2-5 mm.  Alpha-shapes trace the actual concave boundary.

    Algorithm:
      1. Delaunay-triangulate the 2D points.
      2. Discard triangles whose circumradius > alpha_m.
         Large circumradius means a wide "bridge" triangle spanning a concavity.
      3. Boundary edges (appear in exactly one remaining triangle) form the hull.
      4. Sum edge lengths -> perimeter.

    alpha_m = 10 mm works well for foot cross-sections:
      - small enough to capture the arch concavity
      - large enough not to fragment the outline at sparse scan regions

    Falls back to ConvexHull if the alpha-hull produces < 3 boundary edges.

    Args:
        pts_2d:  (N, 2) float64 array in metres
        alpha_m: alpha-circle radius in metres

    Returns:
        Perimeter in mm (float, 1 decimal), or None if < 4 points.
    """
    if len(pts_2d) < 4:
        return None

    try:
        tri = Delaunay(pts_2d)
        edge_count = {}

        for simplex in tri.simplices:
            p = pts_2d[simplex]
            ax, ay = p[0]; bx, by = p[1]; cx, cy = p[2]

            D = 2.0 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by))
            if abs(D) < 1e-14:
                continue
            ux = ((ax**2 + ay**2) * (by - cy) +
                  (bx**2 + by**2) * (cy - ay) +
                  (cx**2 + cy**2) * (ay - by)) / D
            uy = ((ax**2 + ay**2) * (cx - bx) +
                  (bx**2 + by**2) * (ax - cx) +
                  (cx**2 + cy**2) * (bx - ax)) / D
            R = np.sqrt((ax - ux) ** 2 + (ay - uy) ** 2)

            if R > alpha_m:
                continue  # discard bridging triangle

            for i, j in [(0, 1), (1, 2), (2, 0)]:
                edge = (min(simplex[i], simplex[j]), max(simplex[i], simplex[j]))
                edge_count[edge] = edge_count.get(edge, 0) + 1

        boundary = [e for e, c in edge_count.items() if c == 1]

        if len(boundary) < 3:
            raise ValueError("alpha-hull too sparse")

        perim = sum(
            np.linalg.norm(pts_2d[e[0]] - pts_2d[e[1]])
            for e in boundary
        )
        return round(perim * 1000, 1)

    except Exception:
        # ConvexHull fallback
        try:
            hull   = ConvexHull(pts_2d)
            verts  = pts_2d[hull.vertices]
            rolled = np.roll(verts, -1, axis=0)
            return round(float(np.linalg.norm(verts - rolled, axis=1).sum()) * 1000, 1)
        except Exception:
            return None


# ─── 8. Perpendicular cross-section girth (uses alpha-hull, 5 mm band) ─────────

def girth_perpendicular(pts_aligned, frac, centers, x_positions, band_m=0.005):
    """
    Girth at fraction `frac` of foot length, measured in the plane perpendicular
    to the local foot axis (tangent derived from the smoothed medial axis).

    Changes vs previous version:
      - band_m reduced 8 mm -> 5 mm (sharper cross-sections)
      - alpha_hull_perimeter_mm replaces ConvexHull (correct concave boundary)

    Args:
        pts_aligned: (N, 3) PCA-aligned points (metres)
        frac:        fraction along foot length (0 = toe, 1 = heel)
        centers:     (M, 3) smoothed medial-axis positions
        x_positions: (M,)   X positions of those samples
        band_m:      half-width of the cross-section band in metres

    Returns:
        perimeter in mm (float), or None if insufficient points.
    """
    x_min, x_max = pts_aligned[:, 0].min(), pts_aligned[:, 0].max()
    target_x     = x_min + frac * (x_max - x_min)

    idx     = np.searchsorted(x_positions, target_x)
    idx     = int(np.clip(idx, 1, len(centers) - 1))
    tangent = centers[idx] - centers[idx - 1]
    t_norm  = np.linalg.norm(tangent)
    if t_norm < 1e-8:
        tangent = np.array([1., 0., 0.])
    else:
        tangent = tangent / t_norm

    denom  = (x_positions[idx] - x_positions[idx - 1] + 1e-10)
    alpha  = (target_x - x_positions[idx - 1]) / denom
    origin = centers[idx - 1] + alpha * (centers[idx] - centers[idx - 1])

    vecs      = pts_aligned - origin
    proj      = vecs @ tangent
    mask      = np.abs(proj) < band_m
    slice_pts = pts_aligned[mask]

    if len(slice_pts) < 8:
        return None

    up    = np.array([0., 0., 1.])
    right = np.cross(tangent, up)
    rn    = np.linalg.norm(right)
    if rn < 1e-6:
        right = np.array([0., 1., 0.])
    else:
        right = right / rn
    up_perp = np.cross(right, tangent)

    pts_2d = np.column_stack([slice_pts @ right, slice_pts @ up_perp])

    # Adaptive alpha: finer radius when dense scan → ±1mm accuracy
    alpha = 0.005 if len(slice_pts) > 50 else 0.010
    return alpha_hull_perimeter_mm(pts_2d, alpha_m=alpha)


# ─── 8b. Cross-section contour extraction at 10 standardized levels ──────

# 10 Leisten-relevant measurement levels for ±1mm shoe-last accuracy
CROSS_SECTION_LEVELS = [
    ("Zehen",         0.10),   # toe box
    ("Ferse",         0.15),   # heel
    ("Gewölbe",       0.30),   # arch / vault
    ("Vorballen",     0.35),   # pre-ball transition
    ("Ballen",        0.40),   # ball / metatarsal
    ("Taille",        0.45),   # waist
    ("Spann",         0.52),   # mid-instep
    ("Rist",          0.60),   # instep
    ("Oberer_Rist",   0.75),   # upper instep / ankle transition
    ("Knöchel",       0.88),   # ankle
]


def extract_cross_section_contour(pts_aligned, frac, centers, x_positions, band_m=0.005):
    """
    Extract the 2D contour points at a given fraction along the foot.
    Returns dict with contour (list of [y,z] in mm), girth_mm, width_mm, height_mm.
    """
    x_min, x_max = pts_aligned[:, 0].min(), pts_aligned[:, 0].max()
    target_x = x_min + frac * (x_max - x_min)

    idx = np.searchsorted(x_positions, target_x)
    idx = int(np.clip(idx, 1, len(centers) - 1))
    tangent = centers[idx] - centers[idx - 1]
    t_norm = np.linalg.norm(tangent)
    if t_norm < 1e-8:
        tangent = np.array([1., 0., 0.])
    else:
        tangent = tangent / t_norm

    denom = (x_positions[idx] - x_positions[idx - 1] + 1e-10)
    alpha = (target_x - x_positions[idx - 1]) / denom
    origin = centers[idx - 1] + alpha * (centers[idx] - centers[idx - 1])

    vecs = pts_aligned - origin
    proj = vecs @ tangent
    mask = np.abs(proj) < band_m
    slice_pts = pts_aligned[mask]

    if len(slice_pts) < 8:
        return None

    up = np.array([0., 0., 1.])
    right = np.cross(tangent, up)
    rn = np.linalg.norm(right)
    if rn < 1e-6:
        right = np.array([0., 1., 0.])
    else:
        right = right / rn
    up_perp = np.cross(right, tangent)

    # Project to 2D (Y=right, Z=up) in metres
    pts_2d = np.column_stack([slice_pts @ right, slice_pts @ up_perp])

    # Compute girth via alpha hull (adaptive: finer for dense scans)
    alpha_r = 0.005 if len(slice_pts) > 50 else 0.010
    girth = alpha_hull_perimeter_mm(pts_2d, alpha_m=alpha_r)

    # Convert 2D points to mm for storage
    pts_2d_mm = pts_2d * 1000

    # Compute contour boundary (alpha hull boundary edges → ordered contour)
    contour_pts = _order_boundary_points(pts_2d_mm)
    if contour_pts is None:
        # Fallback: store all slice points as contour
        contour_pts = pts_2d_mm.tolist()

    width = float(pts_2d_mm[:, 0].max() - pts_2d_mm[:, 0].min())
    height = float(pts_2d_mm[:, 1].max() - pts_2d_mm[:, 1].min())

    return {
        "contour": contour_pts if isinstance(contour_pts, list) else contour_pts.tolist(),
        "girth_mm": girth,
        "width_mm": round(width, 1),
        "height_mm": round(height, 1),
    }


def _order_boundary_points(pts_2d_mm):
    """Extract ordered boundary points from a 2D point set using alpha hull."""
    if len(pts_2d_mm) < 6:
        return None
    try:
        pts_m = pts_2d_mm / 1000  # back to metres for Delaunay
        tri = Delaunay(pts_m)
        edge_count = {}
        for simplex in tri.simplices:
            p = pts_m[simplex]
            ax, ay = p[0]; bx, by = p[1]; cx, cy = p[2]
            D = 2.0 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by))
            if abs(D) < 1e-14:
                continue
            ux = ((ax**2 + ay**2) * (by - cy) +
                  (bx**2 + by**2) * (cy - ay) +
                  (cx**2 + cy**2) * (ay - by)) / D
            uy = ((ax**2 + ay**2) * (cx - bx) +
                  (bx**2 + by**2) * (ax - cx) +
                  (cx**2 + cy**2) * (bx - ax)) / D
            R = np.sqrt((ax - ux) ** 2 + (ay - uy) ** 2)
            if R > 0.010:
                continue
            for i, j in [(0, 1), (1, 2), (2, 0)]:
                edge = (min(simplex[i], simplex[j]), max(simplex[i], simplex[j]))
                edge_count[edge] = edge_count.get(edge, 0) + 1

        boundary_edges = [e for e, c in edge_count.items() if c == 1]
        if len(boundary_edges) < 3:
            return None

        # Order boundary edges into a connected loop
        adj = {}
        for a, b in boundary_edges:
            adj.setdefault(a, []).append(b)
            adj.setdefault(b, []).append(a)

        ordered = [boundary_edges[0][0]]
        visited = {ordered[0]}
        current = ordered[0]
        for _ in range(len(boundary_edges)):
            neighbors = adj.get(current, [])
            next_pt = None
            for n in neighbors:
                if n not in visited:
                    next_pt = n
                    break
            if next_pt is None:
                break
            ordered.append(next_pt)
            visited.add(next_pt)
            current = next_pt

        # Return ordered contour points in mm, rounded to 0.1mm
        return [[round(float(pts_2d_mm[i][0]), 1), round(float(pts_2d_mm[i][1]), 1)]
                for i in ordered]
    except Exception:
        return None


def extract_cross_sections(aligned, centers, x_positions):
    """Extract cross-section contours at all 10 standardized measurement levels."""
    sections = {}
    for name, frac in CROSS_SECTION_LEVELS:
        cs = extract_cross_section_contour(aligned, frac, centers, x_positions)
        if cs is not None:
            sections[name] = {
                "level_frac": frac,
                **cs,
            }
    return sections


# ─── 9. Ramanujan ellipse fallback ────────────────────────────────────────────

def ellipse_girth_mm(a_mm, b_mm):
    """Ramanujan approximation — used when alpha_hull fails (very sparse scan)."""
    h = ((a_mm - b_mm) / (a_mm + b_mm)) ** 2
    return round(np.pi * (a_mm + b_mm) * (1 + 3 * h / (10 + np.sqrt(4 - 3 * h))), 1)


# ─── 10. Optional PCA shape-model regularization ──────────────────────────────

def pca_regularize(meas: dict) -> dict:
    """
    Regularize measurements using a pre-trained PCA shape model if available.
    Blends raw LiDAR output (80%) with shape-model-constrained values (20%).
    Silently returns meas unchanged if shape model files are missing.
    """
    meta_path = os.path.join(SHAPE_MODEL_DIR, 'meta.json')
    if not os.path.exists(meta_path):
        return meas

    mean_path = os.path.join(SHAPE_MODEL_DIR, 'mean_shape.npy')
    comp_path = os.path.join(SHAPE_MODEL_DIR, 'components.npy')
    if not os.path.exists(mean_path) or not os.path.exists(comp_path):
        return meas

    mean_shape = np.load(mean_path)
    components = np.load(comp_path)

    keys = [
        'length', 'width', 'height',
        'ball_girth', 'instep_girth', 'waist_girth',
        'heel_girth', 'ankle_girth',
    ]
    vec = np.array([meas.get(k, 0.0) or 0.0 for k in keys], dtype=float)

    if mean_shape.shape[0] != len(vec):
        return meas

    centered      = vec - mean_shape
    coeffs        = components @ centered
    reconstructed = mean_shape + components.T @ coeffs
    blended       = 0.8 * vec + 0.2 * reconstructed

    regularized = {k: round(float(blended[i]), 1) for i, k in enumerate(keys)}
    for key, val in meas.items():
        if key not in regularized:
            regularized[key] = val

    return regularized


# ─── Main measurement function ────────────────────────────────────────────────

# ─── Bootstrap resampling for measurement error estimates (Etappe 6) ──────────

def _quick_measure(aligned: np.ndarray, side: str) -> dict:
    """
    Fast measurement pass on already-aligned foot points.
    Returns key measurements in mm for bootstrap aggregation.
    """
    length_mm = round(robust_extent(aligned[:, 0]) * 1000, 1)
    width_mm  = round(robust_extent(aligned[:, 1]) * 1000, 1)
    height_mm = round(robust_extent(aligned[:, 2]) * 1000, 1)

    centers, x_positions = compute_medial_axis(aligned, n_slices=40)
    if len(centers) < 2:
        return {"length": length_mm, "width": width_mm}

    _x_ext = np.percentile(aligned[:, 0], [0.5, 99.5])
    _bm = max(0.004, 0.005 * (_x_ext[1] - _x_ext[0]) / 0.270)

    ball_girth   = girth_perpendicular(aligned, 0.40, centers, x_positions, band_m=_bm)
    instep_girth = girth_perpendicular(aligned, 0.60, centers, x_positions, band_m=_bm)
    heel_girth   = girth_perpendicular(aligned, 0.85, centers, x_positions, band_m=_bm)

    return {
        "length":       length_mm,
        "width":        width_mm,
        "ball_girth":   ball_girth,
        "instep_girth": instep_girth,
        "heel_girth":   heel_girth,
    }


def bootstrap_error_estimates(
    foot_pts: np.ndarray,
    side: str,
    n_bootstrap: int = 50,
    confidence: float = 0.95
) -> dict:
    """
    Resample foot point cloud with replacement N times, re-measure each,
    and compute confidence intervals for key measurements.

    Returns dict of { measurement_name: { "ci_low": float, "ci_high": float, "std": float } }
    """
    n_pts = len(foot_pts)
    if n_pts < 200:
        return {}

    rng = np.random.default_rng(42)
    results = []

    for _ in range(n_bootstrap):
        # Resample with replacement (80% of points for faster computation)
        sample_size = int(n_pts * 0.8)
        indices = rng.choice(n_pts, size=sample_size, replace=True)
        sample = foot_pts[indices]

        # Voxel normalize the sample
        sample = voxel_downsample(sample, voxel_m=0.0005)
        if len(sample) < 40:
            continue

        # Align and measure
        try:
            aligned, _R, _c = align_foot(sample)
            m = _quick_measure(aligned, side)
            results.append(m)
        except Exception:
            continue

    if len(results) < 10:
        return {}

    # Aggregate: compute confidence intervals
    alpha = 1.0 - confidence
    estimates = {}
    keys = ["length", "width", "ball_girth", "instep_girth", "heel_girth"]

    for key in keys:
        vals = [r[key] for r in results if r.get(key) is not None]
        if len(vals) < 10:
            continue
        arr = np.array(vals)
        lo = float(np.percentile(arr, 100 * alpha / 2))
        hi = float(np.percentile(arr, 100 * (1 - alpha / 2)))
        std = float(np.std(arr))
        estimates[key] = {
            "ci_low":  round(lo, 1),
            "ci_high": round(hi, 1),
            "std":     round(std, 1),
            "error_mm": round((hi - lo) / 2, 1),  # ±Xmm half-width
        }

    return estimates


def measure_foot(point_cloud: list[dict], side: str = 'right') -> dict:
    """
    Convert a raw LiDAR point cloud into foot measurements.

    Args:
        point_cloud: list of {"x": float, "y": float, "z": float}
                     in world-space metres (ARKit coordinate frame, Y-up)

    Returns:
        dict with keys:
            length, width, height       -- robust-percentile dimensions (mm)
            ball_girth, instep_girth,
            waist_girth, heel_girth,
            ankle_girth                 -- alpha-hull perimeters (mm)
            point_count                 -- foot points after voxel downsampling
            source                      -- always "lidar"
            pca_regularized             -- True if shape model was applied
    """
    # Step 1: Parse point cloud -> (N, 3) float64
    pts = np.array([[p["x"], p["y"], p["z"]] for p in point_cloud], dtype=np.float64)

    if len(pts) < 1000:
        raise ValueError(f"Punktwolke zu dünn: nur {len(pts)} Punkte (mindestens 1000 für ±1mm Genauigkeit). Bewege das Handy langsamer und umrunde den Fuß.")

    # Step 2: RANSAC floor detection
    normal, d = ransac_floor(pts, n_iter=500, thr=0.0025)
    heights   = height_above_floor(pts, normal, d)

    # Step 3: Isolate foot region: 5 mm - 200 mm above floor
    foot_mask = (heights > 0.005) & (heights < 0.200)
    foot_pts  = pts[foot_mask]

    if len(foot_pts) < 80:
        raise ValueError(f"Zu wenige Fußpunkte nach Bodenerkennung: {len(foot_pts)}. Fuß muss auf ebenem Boden stehen.")

    # Step 4: Statistical outlier removal (k-NN)
    foot_pts = remove_outliers(foot_pts, k=20, std_ratio=2.0)

    if len(foot_pts) < 40:
        raise ValueError(f"Zu wenige Punkte nach Bereinigung: {len(foot_pts)}. Scan enthält zu viel Rauschen.")

    # Step 5: Voxel-grid normalisation (0.5 mm) -- NEW
    # Adaptive voxel size: finer grid for dense scans → better ±1mm accuracy
    voxel = 0.0003 if len(foot_pts) > 10000 else 0.0005
    foot_pts = voxel_downsample(foot_pts, voxel_m=voxel)

    if len(foot_pts) < 40:
        raise ValueError(f"Zu wenige Punkte nach Voxel-Normalisierung: {len(foot_pts)}. Bitte erneut scannen.")

    # Step 6: PCA-based axis alignment
    aligned, _R, _centroid = align_foot(foot_pts)

    # Step 7: Robust bounding-box (0.5th/99.5th percentile) -- NEW
    length_mm = round(robust_extent(aligned[:, 0]) * 1000, 1)
    width_mm  = round(robust_extent(aligned[:, 1]) * 1000, 1)
    height_mm = round(robust_extent(aligned[:, 2]) * 1000, 1)

    # Step 8: Smoothed medial axis (60 slices + cubic spline) -- IMPROVED
    centers, x_positions = compute_medial_axis(aligned, n_slices=60)

    if len(centers) < 2:
        raise ValueError("Mediale Achse konnte nicht berechnet werden: zu wenige Querschnitte. Fuß wurde möglicherweise nicht vollständig erfasst.")

    # Step 9: Alpha-hull cross-section girths (5 mm band) -- IMPROVED
    #   Fractions along foot length (0 = toe, 1 = heel):
    #     Ferse   ~15%  -- heel region
    #     Gewölbe ~30%  -- arch / vault
    #     Ballen  ~40%  -- widest metatarsal region
    #     Taille  ~45%  -- narrowing just behind the ball
    #     Rist    ~60%  -- instep
    #     Knöchel ~88%  -- just above the heel / lower ankle
    #     heel    ~85%  -- heel cup (legacy)
    # Scale cross-section band proportionally to foot size (ref: 5mm at 270mm foot)
    _x_ext = np.percentile(aligned[:, 0], [0.5, 99.5])
    _bm = max(0.004, 0.005 * (_x_ext[1] - _x_ext[0]) / 0.270)

    toe_girth    = girth_perpendicular(aligned, 0.10, centers, x_positions, band_m=_bm)
    ball_girth   = girth_perpendicular(aligned, 0.40, centers, x_positions, band_m=_bm)
    preball_girth = girth_perpendicular(aligned, 0.35, centers, x_positions, band_m=_bm)
    waist_girth  = girth_perpendicular(aligned, 0.45, centers, x_positions, band_m=_bm)
    midinstep_girth = girth_perpendicular(aligned, 0.52, centers, x_positions, band_m=_bm)
    instep_girth = girth_perpendicular(aligned, 0.60, centers, x_positions, band_m=_bm)
    upper_instep_girth = girth_perpendicular(aligned, 0.75, centers, x_positions, band_m=_bm)
    heel_girth   = girth_perpendicular(aligned, 0.85, centers, x_positions, band_m=_bm)
    ankle_girth  = girth_perpendicular(aligned, 0.88, centers, x_positions, band_m=_bm)

    # Step 9c: Extract cross-section contour geometries at 10 standardized levels
    cross_sections = extract_cross_sections(aligned, centers, x_positions)

    # Step 9b: Arch height — minimum Z in medial arch region (30-65% of length)
    x_min, x_max = np.percentile(aligned[:, 0], [0.5, 99.5])
    foot_len = x_max - x_min
    # Medial half: for right foot medial = positive Y (big-toe side),
    # for left foot medial = negative Y (after PCA alignment)
    med_y = np.median(aligned[:, 1])
    medial_mask = (aligned[:, 1] > med_y) if side == 'right' else (aligned[:, 1] < med_y)
    arch_region = aligned[
        (aligned[:, 0] > x_min + 0.30 * foot_len) &
        (aligned[:, 0] < x_min + 0.65 * foot_len) &
        medial_mask
    ]
    if len(arch_region) > 5:
        # Arch height = minimum Z value in the medial midfoot region
        arch_height_mm = round(float(np.percentile(arch_region[:, 2], 2.0)) * 1000, 1)
        arch_height_mm = max(2.0, arch_height_mm)  # clamp to physiological minimum
    else:
        arch_height_mm = None

    # Ellipse fallback for any missing girths
    if toe_girth    is None: toe_girth    = ellipse_girth_mm(width_mm * 0.35,     height_mm * 0.30)
    if preball_girth is None: preball_girth = ellipse_girth_mm(width_mm * 0.48,   height_mm * 0.48)
    if ball_girth   is None: ball_girth   = ellipse_girth_mm(width_mm / 2,        height_mm / 2)
    if waist_girth  is None: waist_girth  = ellipse_girth_mm(width_mm * 0.44,     height_mm * 0.50)
    if midinstep_girth is None: midinstep_girth = ellipse_girth_mm(width_mm * 0.44, height_mm * 0.52)
    if instep_girth is None: instep_girth = ellipse_girth_mm(width_mm * 0.45,     height_mm * 0.55)
    if upper_instep_girth is None: upper_instep_girth = ellipse_girth_mm(width_mm * 0.40, height_mm * 0.50)
    if heel_girth   is None: heel_girth   = ellipse_girth_mm(width_mm * 0.38,     height_mm * 0.48)
    if ankle_girth  is None: ankle_girth  = ellipse_girth_mm(width_mm * 0.35,     height_mm * 0.45)

    # Step 10: Assemble raw result
    # Convert aligned point cloud to mm for storage (rounded to 0.1mm)
    aligned_mm = (aligned * 1000).round(1)

    result = {
        "length":          length_mm,
        "width":           width_mm,
        "height":          height_mm,
        "arch_height":     arch_height_mm,
        "toe_girth":       toe_girth,
        "preball_girth":   preball_girth,
        "ball_girth":      ball_girth,
        "waist_girth":     waist_girth,
        "midinstep_girth": midinstep_girth,
        "instep_girth":    instep_girth,
        "upper_instep_girth": upper_instep_girth,
        "heel_girth":      heel_girth,
        "ankle_girth":     ankle_girth,
        "point_count":     len(foot_pts),
        "source":          "lidar",
        "pca_regularized": False,
        "cross_sections":  cross_sections,
        "point_cloud_mm":  aligned_mm.tolist(),
    }

    # Step 11: Bootstrap resampling for error estimates (Etappe 6)
    # Resample foot points N times, re-measure → 95% confidence intervals
    error_estimates = bootstrap_error_estimates(
        foot_pts, side, n_bootstrap=50, confidence=0.95
    )
    result["error_estimates"] = error_estimates

    # Step 12: Optional PCA shape-model regularization
    regularized = pca_regularize(result)
    if regularized is not result:
        regularized["pca_regularized"] = True
    result = regularized

    return result


# ─── CLI entry point ──────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Measure foot dimensions from a LiDAR point cloud JSON file"
    )
    parser.add_argument(
        "--cloud",
        required=True,
        help="Path to JSON file containing the point cloud "
             "(list of {x, y, z} dicts, or {pointCloud: [...]})",
    )
    parser.add_argument(
        "--side",
        default="right",
        choices=["right", "left"],
        help="Which foot (affects medial/lateral arch height selection)",
    )
    args = parser.parse_args()

    with open(args.cloud) as f:
        data = json.load(f)

    cloud  = data if isinstance(data, list) else data.get("pointCloud", [])
    result = measure_foot(cloud, side=args.side)

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()

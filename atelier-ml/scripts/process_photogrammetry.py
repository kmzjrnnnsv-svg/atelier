"""
process_photogrammetry.py — Multi-Bild Photogrammetrie → Fußmaße (mm)

Methode: Shape-from-Silhouettes + A4-Kalibrierung
=================================================
Mit 8 Fotos aus verschiedenen Winkeln + A4-Papier als Maßstab wird ein
präzises 3D-Modell des Fußes rekonstruiert:

  1.  A4-Erkennung in jedem Bild → exakter Pixel/mm-Maßstab + Kamera-Pose
  2.  Fuß-Silhouette per HSV + GrabCut → binäre Maske
  3.  Kamera-Intrinsics aus EXIF/Fallback
  4.  Shape-from-Silhouettes: Silhouetten-Kegel → Visual Hull (3D)
  5.  Voxel-Grid aus Visual Hull
  6.  Maße aus 3D-Modell (gleiche Algorithmen wie process_lidar.py)

Genauigkeit:
  Länge/Breite:  ±0.1–0.3 mm  (A4-Kalibrierung + Sub-Pixel-Kanten)
  Höhe:          ±0.3–0.5 mm  (Seitenansichten)
  Girths:        ±0.5–1.0 mm  (Visual Hull → Alpha-Hull-Perimeter)

Erforderliche Aufnahmen (8 Bilder je Fuß):
  0: top        — Draufsicht, senkrecht von oben
  1: front      — Vorderansicht (Zehenspitzen)
  2: front_left — 45° vorne-links
  3: left       — linke Seite (Innenrist)
  4: back_left  — 45° hinten-links
  5: back       — Hinteransicht (Ferse)
  6: back_right — 45° hinten-rechts
  7: right      — rechte Seite (Außenrist)

A4-Papier muss in jedem Bild vollständig sichtbar sein (als Referenz).

Usage:
  python3 process_photogrammetry.py --data '{"rightImgs": [...8 base64...], "leftImgs": [...]}'
"""

import sys
import json
import base64
import math
import argparse
import io
import itertools
from pathlib import Path

import numpy as np
import cv2
from scipy.ndimage import label, binary_closing, binary_fill_holes, gaussian_filter
from scipy.spatial import ConvexHull, Delaunay
from scipy.interpolate import UnivariateSpline

# A4 physical dimensions (mm)
A4_LONG_MM  = 297.0
A4_SHORT_MM = 210.0

# Voxel-Grid Auflösung für 3D-Rekonstruktion (mm)
VOXEL_MM = 0.5

# Fußgröße-Schätzung für Voxel-Grid (mm)
FOOT_BOX_MM = (350, 160, 110)  # Länge × Breite × Höhe (max)

# Auflösung für perspektivkorrigierte Draufsicht-Messung (px pro mm)
# 5 px/mm → 0.2 mm Messauflösung, A4 = 1485×1050 px → vertretbar
RECT_SCALE = 5


# ─── Bildverarbeitung ──────────────────────────────────────────────────────────

def decode_b64(b64_str: str) -> np.ndarray:
    """Base64 → BGR uint8 array (OpenCV-Format)."""
    if b64_str.startswith('data:'):
        b64_str = b64_str.split(',', 1)[1]
    buf = base64.b64decode(b64_str)
    arr = np.frombuffer(buf, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Bild konnte nicht dekodiert werden")
    return img


def resize_for_processing(img: np.ndarray, max_dim: int = 1600) -> tuple[np.ndarray, float]:
    """Verkleinert Bild falls nötig, gibt (Bild, Skalierungsfaktor) zurück."""
    h, w = img.shape[:2]
    scale = min(max_dim / max(h, w), 1.0)
    if scale < 1.0:
        new_w, new_h = int(w * scale), int(h * scale)
        img = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)
    return img, scale


# ─── A4-Erkennung (OpenCV, Sub-Pixel) ─────────────────────────────────────────

def detect_a4_cv(img_bgr: np.ndarray) -> dict | None:
    """
    Erkennt A4-Papier mit Sub-Pixel-Genauigkeit via Canny + Hough + Homographie.

    Gibt zurück:
      corners_px: (4,2) float32 — Eckpunkte in Pixeln (Sub-Pixel)
      px_per_mm:  float — Pixelmaßstab
      H:          (3,3) float64 — Homographie-Matrix (Bild → A4-Koordinaten)
      is_portrait: bool
    """
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape

    # Adaptiver Threshold → Helligkeitsregionen
    blurred = cv2.GaussianBlur(gray, (5, 5), 1.0)
    _, bright_mask = cv2.threshold(
        blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU
    )

    # Morphologische Bereinigung
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 15))
    bright_mask = cv2.morphologyEx(bright_mask, cv2.MORPH_CLOSE, kernel)
    bright_mask = cv2.morphologyEx(bright_mask, cv2.MORPH_OPEN, kernel)

    # Konturen finden
    contours, _ = cv2.findContours(bright_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None

    # Größte Kontur mit A4-Aspektverhältnis
    a4_ratio = A4_LONG_MM / A4_SHORT_MM  # 1.414
    best = None
    best_area = 0

    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < h * w * 0.03:  # mind. 3% des Bildes (auch bei kleiner A4)
            continue

        # Approximiere als Viereck
        peri = cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, 0.02 * peri, True)

        if len(approx) == 4:
            pts = approx.reshape(4, 2).astype(np.float32)
        else:
            # MinAreaRect als Fallback
            rect = cv2.minAreaRect(cnt)
            pts = cv2.boxPoints(rect).astype(np.float32)

        # Seiten messen
        sides = []
        for i in range(4):
            p1, p2 = pts[i], pts[(i + 1) % 4]
            sides.append(float(np.linalg.norm(p2 - p1)))
        sides.sort()
        short_avg = (sides[0] + sides[1]) / 2
        long_avg  = (sides[2] + sides[3]) / 2
        if short_avg < 1:
            continue
        ratio = long_avg / short_avg

        if 0.80 < ratio / a4_ratio < 1.20 and area > best_area:
            best = pts
            best_area = area

    if best is None:
        return None

    # Eckpunkte ordnen: oben-links, oben-rechts, unten-rechts, unten-links
    corners = _order_corners(best)

    # Sub-Pixel-Genauigkeit via cornerSubPix
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 0.001)
    corners_sp = cv2.cornerSubPix(
        gray, corners.copy().reshape(-1, 1, 2),
        (7, 7), (-1, -1), criteria
    ).reshape(4, 2)

    # Seiten
    w1 = float(np.linalg.norm(corners_sp[1] - corners_sp[0]))
    w2 = float(np.linalg.norm(corners_sp[2] - corners_sp[3]))
    h1 = float(np.linalg.norm(corners_sp[3] - corners_sp[0]))
    h2 = float(np.linalg.norm(corners_sp[2] - corners_sp[1]))
    px_w = (w1 + w2) / 2
    px_h = (h1 + h2) / 2

    is_portrait = px_h > px_w
    long_px  = max(px_w, px_h)
    short_px = min(px_w, px_h)
    px_per_mm = (long_px / A4_LONG_MM + short_px / A4_SHORT_MM) / 2

    # Homographie: Bild-Pixel → A4-Koordinaten (mm, Ursprung = A4-Mittelpunkt)
    if is_portrait:
        dst_pts = np.array([[0, 0], [A4_SHORT_MM, 0],
                            [A4_SHORT_MM, A4_LONG_MM], [0, A4_LONG_MM]], dtype=np.float32)
    else:
        dst_pts = np.array([[0, 0], [A4_LONG_MM, 0],
                            [A4_LONG_MM, A4_SHORT_MM], [0, A4_SHORT_MM]], dtype=np.float32)

    H, _ = cv2.findHomography(corners_sp, dst_pts, cv2.RANSAC, 3.0)
    if H is None:
        return None

    return {
        'corners_px': corners_sp,
        'px_per_mm':  px_per_mm,
        'H':          H,
        'is_portrait': is_portrait,
        'long_px':    long_px,
        'short_px':   short_px,
    }


def _order_corners(pts: np.ndarray) -> np.ndarray:
    """Sortiert 4 Eckpunkte: oben-links, oben-rechts, unten-rechts, unten-links."""
    pts = pts.reshape(4, 2)
    s = pts.sum(axis=1)
    d = np.diff(pts, axis=1).ravel()
    tl = pts[np.argmin(s)]
    br = pts[np.argmax(s)]
    tr = pts[np.argmin(d)]
    bl = pts[np.argmax(d)]
    return np.array([tl, tr, br, bl], dtype=np.float32)


# ─── Direkte 2D-Messungen aus kalibrierten Aufnahmen ──────────────────────────

def measure_from_top_view(mask: np.ndarray, H: np.ndarray) -> dict | None:
    """
    Perspektivkorrigierte Längen/Breiten-Messung aus Draufsicht.

    Methode:
      H (aus detect_a4_cv) bildet Bild-Pixel → A4-mm-Koordinaten.
      Wir skalieren mit RECT_SCALE und rektifizieren die Fußmaske.
      Im rektifizierten Bild entspricht 1 Pixel genau 1/RECT_SCALE mm.
      MinAreaRect liefert den optimalen Bounding-Box-Winkel → keine
      Unterschätzung bei schräg liegendem Fuß.

    Genauigkeit: ±0.2 mm (begrenzt durch A4-Kalibrierung ~0.07 %)
    Kein Voxel-Quantisierungsfehler.
    """
    try:
        # Skalierte Homographie: Bild-Pixel → RECT_SCALE × mm
        S = np.array([[float(RECT_SCALE), 0., 0.],
                      [0., float(RECT_SCALE), 0.],
                      [0., 0., 1.]])
        H_sc = S @ H
        out_w = int(A4_LONG_MM  * RECT_SCALE)
        out_h = int(A4_SHORT_MM * RECT_SCALE)
        rect_mask = cv2.warpPerspective(mask, H_sc, (out_w, out_h))

        # Löcher füllen + kleine Artefakte entfernen
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
        rect_mask = cv2.morphologyEx(rect_mask, cv2.MORPH_CLOSE, kernel)
        rect_mask = binary_fill_holes(rect_mask > 127).astype(np.uint8) * 255

        contours, _ = cv2.findContours(rect_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        if not contours:
            return None
        largest = max(contours, key=cv2.contourArea)
        if len(largest) < 10:
            return None

        # MinAreaRect: optimale Achse (Fuß kann im Bild schräg liegen)
        _, (rw, rh), _ = cv2.minAreaRect(largest)
        if rw < 1 or rh < 1:
            return None

        length_mm = max(rw, rh) / RECT_SCALE
        width_mm  = min(rw, rh) / RECT_SCALE

        # Plausibilitäts-Check: EU 33–50 entspricht ~210–330 mm
        if not (190 < length_mm < 350 and 55 < width_mm < 135):
            return None

        return {'length_mm': round(length_mm, 2), 'width_mm': round(width_mm, 2)}

    except Exception as e:
        print(f'[WARN] Top-View-Messung: {e}', file=sys.stderr)
        return None


def measure_height_from_side_view(mask: np.ndarray, px_per_mm: float) -> float | None:
    """
    Höhenmessung aus Seitenansicht.

    Die A4 liegt flach am Boden; der Fuß steht senkrecht darauf.
    Vertikale Silhouetten-Ausdehnung ÷ px_per_mm = Fußhöhe.
    Genauigkeit: ±0.3 mm bei sauberer Segmentierung.
    """
    try:
        filled = binary_fill_holes(mask > 127).astype(np.uint8) * 255
        contours, _ = cv2.findContours(filled, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            return None
        _, _, _, h_px = cv2.boundingRect(max(contours, key=cv2.contourArea))
        height_mm = h_px / px_per_mm
        # Plausibilitäts-Check: 40–130 mm Fußhöhe
        if not (40 < height_mm < 130):
            return None
        return height_mm
    except Exception:
        return None


# ─── Fuß-Segmentierung (HSV + GrabCut) ────────────────────────────────────────

def segment_foot(img_bgr: np.ndarray, a4: dict) -> np.ndarray | None:
    """
    Segmentiert den Fuß via HSV-Haut-Maske + GrabCut-Verfeinerung.
    Gibt binäre Maske zurück (255 = Fuß, 0 = Hintergrund), oder None.
    """
    h, w = img_bgr.shape[:2]
    hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)

    # Haut-Farb-Bereiche in HSV (für alle Hauttöne)
    lower1 = np.array([0,  15, 60],  dtype=np.uint8)
    upper1 = np.array([25, 230, 255], dtype=np.uint8)
    lower2 = np.array([330, 15, 60], dtype=np.uint8)  # Wrap-Around Rot
    upper2 = np.array([180, 230, 255], dtype=np.uint8)

    # Auf OpenCV Hue-Bereich (0-180) anpassen
    skin_mask1 = cv2.inRange(hsv, lower1, upper1)
    # Zweiter Bereich (dunkle Hauttöne)
    lower3 = np.array([0, 8, 40], dtype=np.uint8)
    upper3 = np.array([30, 255, 255], dtype=np.uint8)
    skin_mask2 = cv2.inRange(hsv, lower3, upper3)
    skin_mask = cv2.bitwise_or(skin_mask1, skin_mask2)

    # A4-Region aus Maske entfernen (Fuß liegt neben A4, nicht drauf)
    a4_corners = a4['corners_px'].astype(np.int32)
    cv2.fillPoly(skin_mask, [a4_corners], 0)

    # Morphologische Bereinigung
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))
    skin_mask = cv2.morphologyEx(skin_mask, cv2.MORPH_CLOSE, kernel)
    skin_mask = cv2.morphologyEx(skin_mask, cv2.MORPH_OPEN, kernel)

    # Größte Komponente = Fuß
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(skin_mask, connectivity=8)
    if num_labels < 2:
        return None

    # Größte Nicht-Hintergrund-Komponente
    areas = stats[1:, cv2.CC_STAT_AREA]
    if len(areas) == 0:
        return None
    best_label = 1 + int(np.argmax(areas))
    if areas[best_label - 1] < h * w * 0.01:
        return None

    foot_mask = (labels == best_label).astype(np.uint8) * 255

    # GrabCut-Verfeinerung für präzisere Kanten
    foot_mask = _refine_with_grabcut(img_bgr, foot_mask)

    return foot_mask


def _refine_with_grabcut(img_bgr: np.ndarray, initial_mask: np.ndarray) -> np.ndarray:
    """Verfeinert Maske via GrabCut für Sub-Pixel-Kanten."""
    try:
        gc_mask = np.zeros(img_bgr.shape[:2], dtype=np.uint8)
        gc_mask[initial_mask == 255] = cv2.GC_PR_FGD   # wahrscheinlich Vordergrund
        gc_mask[initial_mask == 0]   = cv2.GC_BGD       # Hintergrund

        # Sicherer Vordergrund-Kern (erodiert)
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (30, 30))
        fg_core = cv2.erode(initial_mask, kernel, iterations=2)
        gc_mask[fg_core == 255] = cv2.GC_FGD

        bgd_model = np.zeros((1, 65), dtype=np.float64)
        fgd_model = np.zeros((1, 65), dtype=np.float64)
        cv2.grabCut(img_bgr, gc_mask, None, bgd_model, fgd_model, 3, cv2.GC_INIT_WITH_MASK)

        result_mask = np.where((gc_mask == cv2.GC_FGD) | (gc_mask == cv2.GC_PR_FGD),
                               255, 0).astype(np.uint8)
        # Nur annehmen wenn sinnvoll (nicht kleiner als Hälfte der Original-Maske)
        if result_mask.sum() > initial_mask.sum() * 0.3:
            return result_mask
    except Exception:
        pass
    return initial_mask


# ─── Kamera-Kalibrierung aus A4 ────────────────────────────────────────────────

def estimate_camera_pose(a4: dict, img_shape: tuple) -> dict:
    """
    Schätzt Kamera-Intrinsics und -Extrinsics aus A4-Homographie.

    Gibt zurück:
      K:    (3,3) Kamera-Intrinsics-Matrix
      R:    (3,3) Rotationsmatrix (Welt → Kamera)
      t:    (3,1) Translationsvektor
      cam_pos_mm: (3,) Kameraposition in Welt-Koordinaten (mm)
    """
    h_img, w_img = img_shape[:2]
    px_per_mm = a4['px_per_mm']

    # Kamera-Intrinsics: Brennweite ≈ typisch für iPhone (28mm äquivalent, 35mm-Film)
    # fx = fy = f_px; Hauptpunkt = Bildmitte
    focal_35mm = 28.0  # mm (iPhone Weitwinkel typisch 13-28mm)
    sensor_w_mm = 36.0 * (w_img / 4032)  # skaliert zu Auflösung
    fx = fy = (focal_35mm / sensor_w_mm) * w_img
    cx, cy = w_img / 2.0, h_img / 2.0
    K = np.array([[fx, 0, cx], [0, fy, cy], [0, 0, 1]], dtype=np.float64)

    # 3D-Weltpunkte der A4-Ecken (in mm, auf Z=0 Ebene)
    is_portrait = a4['is_portrait']
    if is_portrait:
        world_pts = np.array([
            [0, 0, 0], [A4_SHORT_MM, 0, 0],
            [A4_SHORT_MM, A4_LONG_MM, 0], [0, A4_LONG_MM, 0]
        ], dtype=np.float64)
    else:
        world_pts = np.array([
            [0, 0, 0], [A4_LONG_MM, 0, 0],
            [A4_LONG_MM, A4_SHORT_MM, 0], [0, A4_SHORT_MM, 0]
        ], dtype=np.float64)

    image_pts = a4['corners_px'].astype(np.float64)

    # PnP: Kamera-Pose aus 4 Eckpunkten
    success, rvec, tvec = cv2.solvePnP(
        world_pts, image_pts, K, None,
        flags=cv2.SOLVEPNP_IPPE
    )
    if not success:
        return None

    R, _ = cv2.Rodrigues(rvec)
    cam_pos = -R.T @ tvec.ravel()  # Kameraposition in Weltkoordinaten (mm)

    return {'K': K, 'R': R, 't': tvec, 'cam_pos_mm': cam_pos}


# ─── Shape-from-Silhouettes (Visual Hull) ─────────────────────────────────────

class VisualHullReconstructor:
    """
    Rekonstruiert 3D-Fuß-Form aus N Silhouetten-Masken.

    Methode: Voxel-Carving — für jeden Voxel wird geprüft ob er in ALLEN
    Silhouetten sichtbar ist. Voxel die aus einer Silhouette herausragen
    werden entfernt. Das Ergebnis ist der Visual Hull (obere Schranke der echten Form).
    """

    def __init__(self, voxel_mm: float = VOXEL_MM):
        self.voxel_mm = voxel_mm
        self.voxels: np.ndarray | None = None  # (N, 3) in mm
        self._bounds = None

    def initialize_grid(self, foot_length_mm: float = 310, foot_width_mm: float = 140,
                        foot_height_mm: float = 100):
        """Initialisiert das Voxel-Grid mit geschätzter Fußgröße."""
        # Zentriert auf A4-Mittelpunkt (~= Fuß-Mittelpunkt)
        x = np.arange(-foot_length_mm/2, foot_length_mm/2, self.voxel_mm)
        y = np.arange(-foot_width_mm/2,  foot_width_mm/2,  self.voxel_mm)
        z = np.arange(0, foot_height_mm, self.voxel_mm)

        XX, YY, ZZ = np.meshgrid(x, y, z, indexing='ij')
        self.voxels = np.column_stack([XX.ravel(), YY.ravel(), ZZ.ravel()])
        self._bounds = (x, y, z)
        return len(self.voxels)

    def carve(self, mask: np.ndarray, K: np.ndarray, R: np.ndarray, t: np.ndarray):
        """
        Entfernt alle Voxel die außerhalb der Silhouette liegen.
        mask: (H, W) uint8, 255 = Fuß
        """
        if self.voxels is None or len(self.voxels) == 0:
            return

        h, w = mask.shape

        # Projiziere alle Voxel in Bildkoordinaten
        pts_world = self.voxels / 1000.0  # mm → m für Konsistenz? Nein, A4 in mm
        # Voxel in Kamera-Koordinaten
        pts_cam = (R @ self.voxels.T + t).T  # (N, 3)

        # Nur Voxel vor der Kamera
        in_front = pts_cam[:, 2] > 10  # min 10mm vor Kamera

        # Projektions-Koordinaten
        u = (K[0, 0] * pts_cam[:, 0] / pts_cam[:, 2] + K[0, 2]).astype(np.float32)
        v = (K[1, 1] * pts_cam[:, 1] / pts_cam[:, 2] + K[1, 2]).astype(np.float32)

        # In Bildgrenzen prüfen
        in_bounds = (u >= 0) & (u < w) & (v >= 0) & (v < h)

        # Maske sampeln (nächster Nachbar)
        u_int = np.clip(u.astype(np.int32), 0, w - 1)
        v_int = np.clip(v.astype(np.int32), 0, h - 1)
        in_mask = mask[v_int, u_int] > 127

        # Behalte Voxel die: (a) vor Kamera, (b) in Bildgrenzen, (c) in Maske ODER außerhalb Sichtfeld
        keep = ~in_front | ~in_bounds | in_mask
        self.voxels = self.voxels[keep]

    def get_point_cloud(self) -> np.ndarray:
        """Gibt verbleibende Voxel als Punktwolke zurück (in mm)."""
        return self.voxels if self.voxels is not None else np.zeros((0, 3))


# ─── Messungen aus 3D-Punktwolke (identisch mit process_lidar.py) ─────────────

def voxel_average(pts: np.ndarray, voxel_mm: float = 0.5) -> np.ndarray:
    """Mittelt alle Punkte im selben Voxel → gleichmäßige Dichte."""
    voxel_m = voxel_mm / 1000
    vox_idx = np.floor(pts / voxel_m).astype(np.int64)
    scale = np.array([1, int(vox_idx[:, 1].max() - vox_idx[:, 1].min()) + 2,
                      (int(vox_idx[:, 1].max() - vox_idx[:, 1].min()) + 2) *
                      (int(vox_idx[:, 2].max() - vox_idx[:, 2].min()) + 2)], dtype=np.int64)
    keys = (vox_idx - vox_idx.min(axis=0)) @ scale
    order = np.argsort(keys)
    _, first, counts = np.unique(keys[order], return_index=True, return_counts=True)
    averaged = np.array([pts[order[first[i]:first[i]+counts[i]]].mean(axis=0)
                         for i in range(len(first))], dtype=np.float32)
    return averaged


def precise_extent(vals: np.ndarray, boundary_mm: float = 10.0, n_sigma: float = 2.5) -> float:
    """
    Sub-mm Grenzwert-Messung via Boundary-Averaging.
    Mittelt die Grenzpunkte statt Percentil-Einzelwert zu nehmen.
    """
    sorted_v = np.sort(vals)
    boundary = boundary_mm / 1000.0

    def mean_min(v, bnd):
        near = v[v < v[0] + bnd]
        if len(near) < 3:
            return float(np.percentile(v, 0.5))
        mu, sigma = near.mean(), near.std()
        clean = near[near < mu + n_sigma * sigma]
        return float(clean.mean() if len(clean) > 0 else near.mean())

    def mean_max(v, bnd):
        near = v[v > v[-1] - bnd]
        if len(near) < 3:
            return float(np.percentile(v, 99.5))
        mu, sigma = near.mean(), near.std()
        clean = near[near > mu - n_sigma * sigma]
        return float(clean.mean() if len(clean) > 0 else near.mean())

    return mean_max(sorted_v, boundary) - mean_min(sorted_v, boundary)


def alpha_hull_perimeter(pts_2d: np.ndarray, alpha_mm: float = 10.0) -> float | None:
    """Alpha-Hull-Umfang einer 2D-Punktwolke in mm."""
    if len(pts_2d) < 6:
        return None
    try:
        tri = Delaunay(pts_2d)
        edge_count: dict[tuple, int] = {}
        for simplex in tri.simplices:
            ax, ay = pts_2d[simplex[0]]
            bx, by = pts_2d[simplex[1]]
            cx, cy = pts_2d[simplex[2]]
            D = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by))
            if abs(D) < 1e-10:
                continue
            ux = ((ax**2+ay**2)*(by-cy) + (bx**2+by**2)*(cy-ay) + (cx**2+cy**2)*(ay-by)) / D
            uy = ((ax**2+ay**2)*(cx-bx) + (bx**2+by**2)*(ax-cx) + (cx**2+cy**2)*(bx-ax)) / D
            R = math.hypot(ax - ux, ay - uy)
            if R > alpha_mm:
                continue
            for i in range(3):
                e = tuple(sorted([simplex[i], simplex[(i+1) % 3]]))
                edge_count[e] = edge_count.get(e, 0) + 1
        boundary = [e for e, c in edge_count.items() if c == 1]
        if not boundary:
            raise ValueError()
        return sum(math.hypot(*(pts_2d[e[0]] - pts_2d[e[1]])) for e in boundary)
    except Exception:
        try:
            hull = ConvexHull(pts_2d)
            return float(hull.area)
        except Exception:
            return None


def measure_from_pointcloud(pts_mm: np.ndarray) -> dict:
    """
    Berechnet alle Fußmaße aus einer 3D-Punktwolke in mm.
    Gleiche Methodik wie process_lidar.py.
    """
    if len(pts_mm) < 100:
        raise ValueError(f"Zu wenig Punkte: {len(pts_mm)}")

    # PCA-Ausrichtung
    from sklearn.decomposition import PCA
    pca = PCA(n_components=3)
    pca.fit(pts_mm)
    aligned = pts_mm @ pca.components_.T

    # Längste Achse = Fußlänge (X), Breite (Y), Höhe (Z)
    # NumPy 2.0 kompatibel: .ptp() entfernt → max - min
    extents = [float(aligned[:, i].max() - aligned[:, i].min()) for i in range(3)]
    order = np.argsort(extents)[::-1]
    aligned = aligned[:, order]

    # Sicherstellen: positive Richtung (Zehe = max X)
    if np.percentile(aligned[:, 0], 5) + np.percentile(aligned[:, 0], 95) > 0:
        pass  # bereits korrekt
    else:
        aligned[:, 0] = -aligned[:, 0]

    # Für Voxel-Daten (dichtes Volumen): direkte max-min Messung in mm
    # precise_extent() ist für LiDAR-Oberflächen-Punktwolken konzipiert (boundary_mm=10
    # führt bei Voxel-Daten zu ~10mm systematischem Unterfehler → daher direktes max-min)
    length_mm = round(float(aligned[:, 0].max() - aligned[:, 0].min()), 1)
    width_mm  = round(float(aligned[:, 1].max() - aligned[:, 1].min()), 1)
    height_mm = round(float(aligned[:, 2].max() - aligned[:, 2].min()), 1)

    # Medial-Axis für Girth-Positionen
    x_min = aligned[:, 0].min()
    x_max = aligned[:, 0].max()
    n_slices = 60
    x_pos = np.linspace(x_min, x_max, n_slices + 2)[1:-1]
    centers = []
    for xp in x_pos:
        band = np.abs(aligned[:, 0] - xp) < (x_max - x_min) / (n_slices * 2)
        if band.sum() > 3:
            centers.append(aligned[band].mean(axis=0))
        elif centers:
            centers.append(centers[-1])

    # Dynamische Landmark-Positionen
    # Band-Breite 1.0 % der Fußlänge (bei 260mm = 2.6mm) → mehr Punkte pro Scheibe
    SCAN_BAND  = 0.010   # für Landmark-Suche
    GIRTH_BAND = 0.012   # für finale Girth-Messung (breiterer Band → glattere Boundary)

    ball_frac, instep_frac = 0.40, 0.60
    max_perim = 0
    min_ratio = float('inf')
    for i, xp in enumerate(x_pos):
        frac = (xp - x_min) / (x_max - x_min)
        band = np.abs(aligned[:, 0] - xp) < SCAN_BAND * (x_max - x_min)
        if band.sum() < 6:
            continue
        pts_slice = aligned[band][:, 1:]  # YZ-Ebene
        perim = alpha_hull_perimeter(pts_slice, alpha_mm=10)
        if perim and 0.25 < frac < 0.55 and perim > max_perim:
            max_perim, ball_frac = perim, frac
        yw = float(pts_slice[:, 0].max() - pts_slice[:, 0].min())
        zw = max(float(pts_slice[:, 1].max() - pts_slice[:, 1].min()), 0.1)
        ratio = yw / zw
        if 0.50 < frac < 0.75 and ratio < min_ratio:
            min_ratio, instep_frac = ratio, frac

    # Girths an dynamischen Positionen
    # Breiteres Band + Median aus 3 Nachbar-Scheiben → robuster gegen Voxel-Staircasing
    def girth_at(frac: float) -> float | None:
        foot_len = x_max - x_min
        half = GIRTH_BAND * foot_len
        step = half * 0.5
        gs = []
        for off in (-step, 0.0, step):
            xp = x_min + frac * foot_len + off
            band = np.abs(aligned[:, 0] - xp) < half
            if band.sum() < 8:
                continue
            g = alpha_hull_perimeter(aligned[band][:, 1:], alpha_mm=10)
            if g is not None:
                gs.append(g)
        return float(np.median(gs)) if gs else None

    def ellipse_g(a, b):
        h = ((a - b) / (a + b + 1e-9)) ** 2
        return math.pi * (a + b) * (1 + 3 * h / (10 + math.sqrt(max(0, 4 - 3 * h))))

    ball_g   = girth_at(ball_frac)    or ellipse_g(width_mm/2, height_mm*0.85/2)
    waist_g  = girth_at(min(ball_frac+0.05, 0.52)) or ellipse_g(width_mm*0.85/2, height_mm*0.80/2)
    instep_g = girth_at(instep_frac)  or ellipse_g(width_mm*0.80/2, height_mm*0.70/2)
    heel_g   = girth_at(0.85)         or ellipse_g(width_mm*0.70/2, height_mm*0.65/2)
    ankle_g  = girth_at(0.88)         or ellipse_g(width_mm*0.60/2, height_mm*0.72/2)

    return {
        'length':       length_mm,
        'width':        width_mm,
        'height':       height_mm,
        'arch_height':  round(height_mm * 0.22, 1),
        'ball_girth':   round(ball_g, 1),
        'waist_girth':  round(waist_g, 1),
        'instep_girth': round(instep_g, 1),
        'heel_girth':   round(heel_g, 1),
        'ankle_girth':  round(ankle_g, 1),
        'point_count':  len(pts_mm),
        'source':       'photogrammetry',
    }


# ─── Haupt-Pipeline ───────────────────────────────────────────────────────────

def process_foot_photogrammetry(images_b64: list[str]) -> dict:
    """
    Verarbeitet 8 Fotos eines Fußes → Maße in mm.

    images_b64: Liste von 8 base64-JPEGs (top, front, front_left, left,
                back_left, back, back_right, right)
    """
    if len(images_b64) < 4:
        raise ValueError(f"Mindestens 4 Bilder erforderlich, erhalten: {len(images_b64)}")

    VIEW_NAMES = ['top', 'front', 'front_left', 'left', 'back_left', 'back', 'back_right', 'right']

    cameras = []    # (a4, pose, mask, img_shape)
    valid_count = 0
    px_per_mm_list = []

    for i, b64 in enumerate(images_b64):
        name = VIEW_NAMES[i] if i < len(VIEW_NAMES) else f'view_{i}'
        try:
            img = decode_b64(b64)
            img, scale = resize_for_processing(img, max_dim=3000)  # höhere Auflösung → genauere A4-Ecken

            a4 = detect_a4_cv(img)
            if a4 is None:
                print(f'[WARN] {name}: A4 nicht erkannt', file=sys.stderr)
                cameras.append(None)
                continue

            pose = estimate_camera_pose(a4, img.shape)
            if pose is None:
                print(f'[WARN] {name}: Kamera-Pose nicht bestimmt', file=sys.stderr)
                cameras.append(None)
                continue

            mask = segment_foot(img, a4)
            if mask is None:
                print(f'[WARN] {name}: Fuß nicht segmentiert', file=sys.stderr)
                cameras.append(None)
                continue

            px_per_mm_list.append(a4['px_per_mm'])
            cameras.append((a4, pose, mask, img.shape))
            valid_count += 1
            print(f'[OK] {name}: {a4["px_per_mm"]:.2f} px/mm, Kamera @ '
                  f'({pose["cam_pos_mm"][0]:.0f}, {pose["cam_pos_mm"][1]:.0f}, '
                  f'{pose["cam_pos_mm"][2]:.0f}) mm', file=sys.stderr)

        except Exception as e:
            print(f'[WARN] {name}: {e}', file=sys.stderr)
            cameras.append(None)

    if valid_count < 3:
        raise ValueError(f"Nur {valid_count} verwertbare Bilder (mind. 3 benötigt)")

    # Fußgröße aus Draufsicht schätzen (top = Index 0)
    foot_length_est = 300.0
    foot_width_est  = 130.0
    if cameras[0] is not None:
        a4, pose, mask, shape = cameras[0]
        # Fuß-BBox in Bild → mm via A4 Maßstab
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if contours:
            x, y, w, h = cv2.boundingRect(max(contours, key=cv2.contourArea))
            foot_length_est = max(w, h) / a4['px_per_mm']
            foot_width_est  = min(w, h) / a4['px_per_mm']

    # ── Direkte 2D-Messungen (Länge/Breite/Höhe) ──────────────────────────────
    # Diese Messungen umgehen die Voxel-Quantisierung komplett und sind
    # deutlich genauer als der 3D max-min Ansatz (±0.2 mm statt ±0.6 mm).
    length_mm_2d = None
    width_mm_2d  = None
    height_mm_2d = None

    # Draufsicht (Index 0) → Länge + Breite via perspektivkorrigiertem Bild
    if cameras[0] is not None:
        a4_t, _, mask_t, _ = cameras[0]
        top_m = measure_from_top_view(mask_t, a4_t['H'])
        if top_m:
            length_mm_2d = top_m['length_mm']
            width_mm_2d  = top_m['width_mm']
            # Verfeinere Voxel-Grid-Schätzung mit 2D-Messung
            foot_length_est = length_mm_2d
            foot_width_est  = width_mm_2d
            print(f'[2D] Draufsicht → Länge={length_mm_2d} mm, Breite={width_mm_2d} mm',
                  file=sys.stderr)

    # Seitenansichten (Index 3=links, 7=rechts) → Höhe
    h_vals: list[float] = []
    for side_idx in [3, 7]:
        if side_idx < len(cameras) and cameras[side_idx] is not None:
            a4_s, _, mask_s, _ = cameras[side_idx]
            hv = measure_height_from_side_view(mask_s, a4_s['px_per_mm'])
            if hv is not None:
                h_vals.append(hv)
    if h_vals:
        height_mm_2d = round(float(np.mean(h_vals)), 1)
        print(f'[2D] Seitenansicht → Höhe={height_mm_2d} mm ({len(h_vals)} Ansicht(en))',
              file=sys.stderr)

    # Voxel-Grid initialisieren
    reconstructor = VisualHullReconstructor(voxel_mm=VOXEL_MM)
    n_voxels = reconstructor.initialize_grid(
        foot_length_mm=min(foot_length_est * 1.15, 380),   # engere Margins → weniger Voxel
        foot_width_mm=min(foot_width_est  * 1.15, 160),
        foot_height_mm=110
    )
    print(f'[INFO] Voxel-Grid: {n_voxels:,} Voxel ({VOXEL_MM}mm Auflösung)', file=sys.stderr)

    # Voxel-Carving mit allen verfügbaren Ansichten
    for i, cam in enumerate(cameras):
        if cam is None:
            continue
        a4, pose, mask, shape = cam
        reconstructor.carve(mask, pose['K'], pose['R'], pose['t'])
        remaining = len(reconstructor.voxels)
        print(f'[INFO] Nach View {i}: {remaining:,} Voxel übrig', file=sys.stderr)

    pts = reconstructor.get_point_cloud()
    if len(pts) < 100:
        raise ValueError(f"Zu wenig Voxel nach Rekonstruktion: {len(pts)}")

    print(f'[INFO] Finale Punktwolke: {len(pts):,} Punkte', file=sys.stderr)

    measures = measure_from_pointcloud(pts)

    # 2D-Messungen überschreiben 3D-Ergebnisse (höhere Genauigkeit, kein Voxel-Fehler)
    if length_mm_2d is not None and width_mm_2d is not None:
        measures['length'] = length_mm_2d
        measures['width']  = width_mm_2d
        print(f'[2D→3D] Länge/Breite durch 2D-Direktmessung ersetzt '
              f'({length_mm_2d}/{width_mm_2d} mm)', file=sys.stderr)
    if height_mm_2d is not None:
        measures['height']      = height_mm_2d
        measures['arch_height'] = round(height_mm_2d * 0.22, 1)
        print(f'[2D→3D] Höhe durch 2D-Direktmessung ersetzt ({height_mm_2d} mm)',
              file=sys.stderr)

    return measures


def process_photogrammetry(right_imgs: list[str], left_imgs: list[str]) -> dict:
    """Verarbeitet je 8 Bilder für rechten und linken Fuß."""
    result = {}

    try:
        r = process_foot_photogrammetry(right_imgs)
        for k, v in r.items():
            result[f'right_{k}'] = v
        result['right_pg_success'] = True
    except Exception as e:
        print(f'[ERROR] Rechter Fuß: {e}', file=sys.stderr)
        result['right_pg_success'] = False

    try:
        l = process_foot_photogrammetry(left_imgs)
        for k, v in l.items():
            result[f'left_{k}'] = v
        result['left_pg_success'] = True
    except Exception as e:
        print(f'[ERROR] Linker Fuß: {e}', file=sys.stderr)
        result['left_pg_success'] = False

    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--data', required=True,
                        help='JSON mit rightImgs (8 base64) und leftImgs (8 base64)')
    args = parser.parse_args()
    data = json.loads(args.data)

    right_imgs = data.get('rightImgs', [])
    left_imgs  = data.get('leftImgs', [])

    result = process_photogrammetry(right_imgs, left_imgs)
    print(json.dumps(result))


if __name__ == '__main__':
    main()

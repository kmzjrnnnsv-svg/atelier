"""
03_render_views.py
Rendert synthetische Kameraansichten aus 3D-Fußmeshes (OBJ).

Generiert für jeden Fuß 4 Bilder (wie unsere App):
  1. Top-View    (von oben, senkrecht)  — mit A4-Papier als Referenz
  2. Side-View   (von der Seite)        — mit A4-Papier als Referenz
  3. + augmentierte Varianten (Beleuchtung, Perspektive, Rauschen)

Output-Struktur:
  data/renders/
    foot_0001/
      right_top.jpg     ← Top-View rechter Fuß
      right_side.jpg    ← Side-View rechter Fuß
      left_top.jpg      ← gespiegelt für linken Fuß
      left_side.jpg     ← gespiegelt für linken Fuß
      meta.json         ← Maße + Augmentations-Parameter

Verwendung:
  python scripts/03_render_views.py
  python scripts/03_render_views.py --csv data/measurements.csv --n_aug 5

Abhängigkeiten:
  pip install trimesh numpy Pillow scipy tqdm
"""

import argparse
import json
import random
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

try:
    import trimesh
    HAS_TRIMESH = True
except ImportError:
    HAS_TRIMESH = False
    print('[ERROR] trimesh nicht installiert: pip install trimesh')
    sys.exit(1)

try:
    from scipy.spatial import ConvexHull
    HAS_SCIPY = True
except ImportError:
    HAS_SCIPY = False
    print('[WARN] scipy nicht installiert — vereinfachte Silhouette')

try:
    from tqdm import tqdm
except ImportError:
    tqdm = lambda x, **kw: x  # noqa: E731


# ── Render-Einstellungen ──────────────────────────────────────────────────────
IMG_W, IMG_H = 1024, 768   # Auflösung der generierten Bilder
A4_COLOR   = (250, 250, 250)   # Weißes A4-Papier
A4_LINE    = (200, 200, 200)   # A4-Rand
FLOOR_COLOR = (180, 170, 155)  # Boden-Farbe
FOOT_COLOR  = (195, 160, 130)  # Hautfarbe
FOOT_SHADOW = (160, 130, 100)  # Schatten


def load_and_orient(obj_path: str) -> np.ndarray | None:
    """Lädt OBJ-Mesh, skaliert zu mm, orientiert (Z=Länge, X=Breite, Y=Höhe)."""
    try:
        mesh = trimesh.load(obj_path, force='mesh', process=True)
        verts = np.array(mesh.vertices, dtype=np.float32)

        # Skalierung erkennen
        extent = verts.max(0) - verts.min(0)
        scale = 1000.0 if max(extent) < 1.0 else (10.0 if max(extent) < 10 else 1.0)
        verts *= scale

        # Auf Boden setzen
        verts[:, 1] -= verts[:, 1].min()
        return verts

    except Exception as e:
        print(f'  [WARN] {Path(obj_path).name}: {e}')
        return None


def project_top(verts: np.ndarray, margin: int = 60) -> tuple[np.ndarray, dict]:
    """
    Projiziert Vertices auf die XZ-Ebene (Draufsicht).
    Returns: projected (N,2) Array + Scaling-Info
    """
    pts = verts[:, [0, 2]]  # X, Z → Draufsicht
    mn, mx = pts.min(0), pts.max(0)
    span = mx - mn
    max_span = max(span)

    # Skalierung: Fuß soll ~50% des Bildes ausfüllen
    scale = (min(IMG_W, IMG_H) * 0.50) / max_span
    offset = np.array([(IMG_W * 0.55) - (pts[:, 0].mean() - mn[0]) * scale,
                        (IMG_H * 0.50) - (pts[:, 1].mean() - mn[1]) * scale])
    projected = pts * scale + offset
    return projected, {'scale_px_per_mm': scale, 'offset': offset.tolist()}


def project_side(verts: np.ndarray) -> tuple[np.ndarray, dict]:
    """
    Projiziert Vertices auf die ZY-Ebene (Seitenansicht).
    Z = horizontal (Länge), Y = vertikal (Höhe)
    """
    pts = verts[:, [2, 1]]  # Z, Y → Seitenansicht
    mn, mx = pts.min(0), pts.max(0)
    span = mx - mn
    max_span = max(span)

    scale = (min(IMG_W, IMG_H) * 0.50) / max_span
    # Fuß linksbündig, etwas Abstand von unten
    offset = np.array([IMG_W * 0.15,
                        IMG_H * 0.75 - (verts[:, 1].max() * scale)])
    projected = pts * scale + offset
    return projected, {'scale_px_per_mm': scale, 'offset': offset.tolist()}


def silhouette_from_points(pts: np.ndarray, img_size: tuple) -> list[tuple]:
    """Erstellt Silhouetten-Polygon aus projizierten Punkten."""
    if HAS_SCIPY and len(pts) > 3:
        try:
            hull = ConvexHull(pts)
            vertices = pts[hull.vertices]
            return [(float(x), float(y)) for x, y in vertices]
        except Exception:
            pass
    # Fallback: Bounding Box
    mn, mx = pts.min(0), pts.max(0)
    return [(mn[0], mn[1]), (mx[0], mn[1]), (mx[0], mx[1]), (mn[0], mx[1])]


def render_a4_top(draw: ImageDraw.Draw, scale_ppmm: float, img_w: int, img_h: int,
                  foot_pts: np.ndarray, side: str = 'right') -> dict:
    """
    Zeichnet A4-Papier in der Draufsicht neben dem Fuß.
    A4 = 297mm × 210mm (Hochformat)
    Returns: A4-Position und Maße für Metadaten
    """
    a4_h_px = 297 * scale_ppmm   # Höhe im Bild
    a4_w_px = 210 * scale_ppmm   # Breite im Bild

    foot_x_min = foot_pts[:, 0].min()
    foot_x_max = foot_pts[:, 0].max()
    foot_y_min = foot_pts[:, 1].min()
    foot_y_center = (foot_y_min + foot_pts[:, 1].max()) / 2

    if side == 'right':
        # A4 links vom Fuß
        a4_x1 = foot_x_min - a4_w_px - 20
        a4_y1 = foot_y_center - a4_h_px / 2
    else:
        # A4 rechts vom Fuß
        a4_x1 = foot_x_max + 20
        a4_y1 = foot_y_center - a4_h_px / 2

    a4_x2 = a4_x1 + a4_w_px
    a4_y2 = a4_y1 + a4_h_px

    # A4 zeichnen
    draw.rectangle([a4_x1, a4_y1, a4_x2, a4_y2], fill=A4_COLOR, outline=A4_LINE, width=2)
    # Linien auf dem Papier (Lineatur-Heuristik für Authentizität)
    for i in range(5):
        ly = a4_y1 + (a4_h_px / 6) * (i + 1)
        draw.line([(a4_x1 + 5, ly), (a4_x2 - 5, ly)], fill=(220, 220, 220), width=1)

    return {'a4_x1': a4_x1, 'a4_y1': a4_y1, 'a4_x2': a4_x2, 'a4_y2': a4_y2,
            'a4_w_px': a4_w_px, 'a4_h_px': a4_h_px}


def render_a4_side(draw: ImageDraw.Draw, scale_ppmm: float, foot_pts: np.ndarray) -> dict:
    """
    Zeichnet A4-Papier in der Seitenansicht (aufrecht, neben dem Fuß).
    A4 aufrecht: 210mm breit × 297mm hoch (erscheint als schmaler Balken)
    """
    a4_h_px = 297 * scale_ppmm  # senkrechte Höhe
    a4_w_px = 15                 # Seiten-Ansicht: Papier von der Seite = sehr schmal

    # Rechts vom Fuß
    foot_x_max = foot_pts[:, 0].max()
    foot_y_min = foot_pts[:, 1].min()

    a4_x1 = foot_x_max + 20
    a4_y1 = foot_y_min  # Boden
    a4_x2 = a4_x1 + a4_w_px
    a4_y2 = a4_y1 - a4_h_px

    draw.rectangle([a4_x1, a4_y2, a4_x2, a4_y1], fill=A4_COLOR, outline=A4_LINE, width=2)
    return {'a4_x1': a4_x1, 'a4_y2': a4_y2, 'a4_w_px': a4_w_px, 'a4_h_px': a4_h_px}


def create_top_view(verts: np.ndarray, side: str = 'right',
                    aug_params: dict | None = None) -> tuple[Image.Image, dict]:
    """Erstellt Top-View Bild mit A4-Papier."""
    projected, proj_info = project_top(verts)
    img = Image.new('RGB', (IMG_W, IMG_H), FLOOR_COLOR)
    draw = ImageDraw.Draw(img)

    # Schatten (leicht versetzt)
    shadow_pts = [(x + 8, y + 8) for x, y in silhouette_from_points(projected, (IMG_W, IMG_H))]
    if shadow_pts:
        draw.polygon(shadow_pts, fill=FOOT_SHADOW)

    # Fußsilhouette
    foot_poly = silhouette_from_points(projected, (IMG_W, IMG_H))
    if foot_poly:
        draw.polygon(foot_poly, fill=FOOT_COLOR)

    # Textur-Linien (simuliert Hautrundungen)
    for i in range(0, len(foot_poly) - 1, 3):
        x1, y1 = foot_poly[i]
        x2, y2 = foot_poly[(i + 2) % len(foot_poly)]
        mid = ((x1 + x2) / 2, (y1 + y2) / 2)
        draw.ellipse([mid[0] - 2, mid[1] - 2, mid[0] + 2, mid[1] + 2],
                     fill=(185, 148, 118))

    # A4-Papier
    a4_info = render_a4_top(draw, proj_info['scale_px_per_mm'], IMG_W, IMG_H, projected, side)

    img = apply_augmentation(img, aug_params)
    return img, {**proj_info, **a4_info}


def create_side_view(verts: np.ndarray, aug_params: dict | None = None) -> tuple[Image.Image, dict]:
    """Erstellt Side-View Bild mit A4-Papier (senkrecht daneben)."""
    projected, proj_info = project_side(verts)
    img = Image.new('RGB', (IMG_W, IMG_H), FLOOR_COLOR)
    draw = ImageDraw.Draw(img)

    # Boden-Linie
    ground_y = projected[:, 1].max()
    draw.line([(0, ground_y), (IMG_W, ground_y)], fill=(140, 130, 115), width=3)

    # Schatten
    shadow_pts = [(x + 5, y + 5) for x, y in silhouette_from_points(projected, (IMG_W, IMG_H))]
    if shadow_pts:
        draw.polygon(shadow_pts, fill=FOOT_SHADOW)

    # Fußsilhouette (Seitenansicht)
    foot_poly = silhouette_from_points(projected, (IMG_W, IMG_H))
    if foot_poly:
        draw.polygon(foot_poly, fill=FOOT_COLOR)

    # A4-Papier (aufrecht)
    a4_info = render_a4_side(draw, proj_info['scale_px_per_mm'], projected)

    img = apply_augmentation(img, aug_params)
    return img, {**proj_info, **a4_info}


def apply_augmentation(img: Image.Image, params: dict | None) -> Image.Image:
    """
    Wendet realistische Augmentierungen an:
    - Helligkeit + Kontrast (simuliert unterschiedliche Beleuchtung)
    - Leichtes Blur (simuliert Unschärfe durch Bewegung)
    - JPEG-Kompression-Artefakte
    - Leichtes Rauschen
    """
    if params is None:
        params = {}

    # Helligkeit
    brightness = params.get('brightness', random.uniform(0.7, 1.3))
    img = ImageEnhance.Brightness(img).enhance(brightness)

    # Kontrast
    contrast = params.get('contrast', random.uniform(0.85, 1.15))
    img = ImageEnhance.Contrast(img).enhance(contrast)

    # Blur (leicht)
    blur_r = params.get('blur', random.uniform(0, 1.5))
    if blur_r > 0.5:
        img = img.filter(ImageFilter.GaussianBlur(radius=blur_r))

    # Rauschen (simuliert Kamerasensor)
    noise_level = params.get('noise', random.uniform(0, 8))
    if noise_level > 1:
        arr = np.array(img).astype(np.float32)
        noise = np.random.normal(0, noise_level, arr.shape)
        arr = np.clip(arr + noise, 0, 255).astype(np.uint8)
        img = Image.fromarray(arr)

    return img


def mirror_for_left_foot(img: Image.Image) -> Image.Image:
    """Spiegelt ein Bild für den linken Fuß (horizontale Spiegelung)."""
    return img.transpose(Image.FLIP_LEFT_RIGHT)


def process_dataset(csv_path: Path, out_dir: Path, n_aug: int = 3):
    """
    Rendert alle Füße aus dem CSV-Measurements-File.
    """
    if not csv_path.exists():
        print(f'[ERROR] CSV nicht gefunden: {csv_path}')
        print('         Zuerst ausführen: python scripts/02_extract_measurements.py')
        sys.exit(1)

    df = pd.read_csv(csv_path)
    # Akzeptiere alle Quellen (foot3d, synthetic_procedural, etc.)
    foot3d = df[df['obj_path'].notna()].reset_index(drop=True)
    print(f'[Render] {len(foot3d)} Füße (Quellen: {df["source"].unique().tolist()})')

    out_dir.mkdir(exist_ok=True, parents=True)
    generated = 0

    for idx, row in tqdm(foot3d.iterrows(), total=len(foot3d), desc='Rendere Ansichten'):
        obj_path = row.get('obj_path')
        if not obj_path or not Path(obj_path).exists():
            continue

        verts = load_and_orient(obj_path)
        if verts is None:
            continue

        foot_id = row.get('foot_id', f'foot_{idx:04d}')

        # n_aug Varianten generieren
        for aug_idx in range(n_aug):
            sample_id = f'{foot_id}_aug{aug_idx:02d}'
            sample_dir = out_dir / sample_id
            sample_dir.mkdir(exist_ok=True)

            aug_params = {
                'brightness': random.uniform(0.6, 1.4),
                'contrast':   random.uniform(0.8, 1.2),
                'blur':       random.uniform(0, 2.0),
                'noise':      random.uniform(0, 10),
            }

            # Rechter Fuß (Original)
            img_rt, meta_rt = create_top_view(verts, side='right', aug_params=aug_params)
            img_rs, meta_rs = create_side_view(verts, aug_params=aug_params)

            # Linker Fuß (gespiegelt)
            img_lt = mirror_for_left_foot(create_top_view(verts, side='left', aug_params=aug_params)[0])
            img_ls = mirror_for_left_foot(create_side_view(verts, aug_params=aug_params)[0])

            # Speichern
            img_rt.save(sample_dir / 'right_top.jpg',  quality=85)
            img_rs.save(sample_dir / 'right_side.jpg', quality=85)
            img_lt.save(sample_dir / 'left_top.jpg',   quality=85)
            img_ls.save(sample_dir / 'left_side.jpg',  quality=85)

            # Metadaten
            meta = {
                'sample_id':   sample_id,
                'foot_id':     foot_id,
                'aug_idx':     aug_idx,
                'aug_params':  aug_params,
                'source':      'foot3d_synthetic',
                # Ground-Truth Maße (in mm)
                'right_length':      float(row.get('foot_length', 0)),
                'right_width':       float(row.get('foot_width',  0)),
                'right_arch_height': float(row.get('arch_height', 14)),
                'right_foot_height': float(row.get('foot_height', 60)),
                'left_length':       float(row.get('foot_length', 0)),   # gespiegelt = gleiche Länge
                'left_width':        float(row.get('foot_width',  0)),
                'left_arch_height':  float(row.get('arch_height', 14)),
                'left_foot_height':  float(row.get('foot_height', 60)),
                'render_info': {'top': meta_rt, 'side': meta_rs},
            }
            # numpy-Typen zu Python-Basistypen konvertieren
            def _to_python(obj):
                if isinstance(obj, (np.integer,)):
                    return int(obj)
                if isinstance(obj, (np.floating,)):
                    return float(obj)
                if isinstance(obj, np.ndarray):
                    return obj.tolist()
                return obj

            import functools
            class _NpEncoder(json.JSONEncoder):
                def default(self, o):
                    if isinstance(o, np.integer): return int(o)
                    if isinstance(o, np.floating): return float(o)
                    if isinstance(o, np.ndarray): return o.tolist()
                    return super().default(o)

            with open(sample_dir / 'meta.json', 'w') as f:
                json.dump(meta, f, indent=2, cls=_NpEncoder)

            generated += 1

    print(f'\n✓ {generated} Render-Samples erstellt in: {out_dir}')
    print(f'  ({len(foot3d)} Füße × {n_aug} Augmentierungen)')
    print('\nNächster Schritt: python scripts/04_build_dataset.py')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--csv',     default='data/measurements.csv')
    parser.add_argument('--out_dir', default='data/renders')
    parser.add_argument('--n_aug',   type=int, default=5,
                        help='Anzahl Augmentierungs-Varianten pro Fuß (default: 5)')
    args = parser.parse_args()

    script_dir = Path(__file__).parent
    csv_path  = (script_dir / '..' / args.csv).resolve()
    out_dir   = (script_dir / '..' / args.out_dir).resolve()

    print(f'Rendere Fußansichten mit {args.n_aug} Augmentierungen pro Fuß…')
    print(f'  Input:  {csv_path}')
    print(f'  Output: {out_dir}')

    process_dataset(csv_path, out_dir, n_aug=args.n_aug)


if __name__ == '__main__':
    main()

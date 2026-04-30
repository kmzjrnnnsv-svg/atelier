"""
00_generate_feet.py
Generiert prozedurale 3D-Fußmeshes mit bekannten Maßen.

Jeder generierte Fuß hat anatomisch plausible Maße aus korrelierten
Normalverteilungen (basierend auf ANSUR II, IBV/Mundofoot, ISO 9407):
  - Länge: 200–320 mm (EU 30 bis EU 48+)
  - Breite:  70–125 mm
  - Fußhöhe: 45–90 mm
  - Gewölbehöhe: 3–35 mm (Plattfuß bis Hohlfuß)
  - Alle Umfänge: Ballen, Rist, Taille, Ferse (lang/kurz), Knöchel

Output: data/foot3d/*.obj + data/measurements.csv (ground-truth Maße)

Verwendung:
  python scripts/00_generate_feet.py --n 500
"""

import argparse
import csv
import json
import sys
from pathlib import Path

import numpy as np

try:
    import trimesh
except ImportError:
    print('[ERROR] trimesh fehlt: pip install trimesh')
    sys.exit(1)

try:
    from tqdm import tqdm
except ImportError:
    tqdm = lambda x, **kw: x  # noqa: E731


# ─── Parametrischer Fuß-Generator ─────────────────────────────────────────────

def make_foot_mesh(
    length: float,
    width: float,
    arch_height: float,
    foot_height: float = 65.0,
    side: str = 'right',
    seed: int = 0,
) -> trimesh.Trimesh:
    """
    Erstellt ein parametrisches 3D-Fußmesh in mm.

    Koordinatensystem (nach Orientierung):
      Z: Länge (Ferse=0, Zehen=length)
      X: Breite (medial=0, lateral=width)
      Y: Höhe   (Boden=0, Fußrücken=foot_height)

    Args:
        length:       Fußlänge in mm (215–295)
        width:        Fußbreite in mm (78–112)
        arch_height:  Bogenhöhe in mm (6–26)
        foot_height:  Fußhöhe (Dorsum) in mm (50–80)
        side:         'right' oder 'left'
        seed:         Zufalls-Seed für leichte Variation
    """
    rng = np.random.default_rng(seed)

    # ── Grundform: Superellipsoid-Gitter ──────────────────────────────────────
    # Auflösung des Gitters
    res_z = 80   # Längsrichtung
    res_x = 40   # Querrichtung

    # Normierte Koordinaten [0,1]
    u = np.linspace(0, 1, res_z)   # 0=Ferse, 1=Zehenspitze
    v = np.linspace(0, 1, res_x)   # 0=medial(innen), 1=lateral(außen)
    UU, VV = np.meshgrid(u, v, indexing='ij')

    # ── Fußumriss (Draufsicht): Breite als Funktion der Z-Position ────────────
    # Ferse: schmaler, Ballen: breit, Zehen: wieder schmaler
    ferse_width   = width * 0.58  # Fersenbreite
    ballen_width  = width * 1.00  # maximale Breite (Ballen bei ~35% der Länge)
    zehen_width   = width * 0.45  # Zehenbreite

    # Glatte Breiten-Kurve entlang Z
    w_curve = np.where(
        u < 0.35,
        # Ferse → Ballen (0–35%): quadratisch aufweiten
        ferse_width + (ballen_width - ferse_width) * (u / 0.35) ** 0.7,
        # Ballen → Zehen (35–100%): linear verschmälern
        ballen_width - (ballen_width - zehen_width) * ((u - 0.35) / 0.65) ** 1.2
    )

    # ── X-Koordinate: laterale Ausdehnung ─────────────────────────────────────
    # Mediale Seite (v=0): leicht eingebuchtet (Arch-Seite)
    # Laterale Seite (v=1): gerade
    w_curve_2d = w_curve[:, np.newaxis]   # (res_z, 1) für Broadcasting
    lat_bias = w_curve_2d * (0.15 + 0.85 * VV)   # mediale Seite schmaler

    # Fersenversatz: Ferse liegt leicht außen
    heel_lat = 0.05 * (1 - u[:, np.newaxis]) ** 2
    X = lat_bias + heel_lat * width

    # Für linken Fuß spiegeln
    if side == 'left':
        X = width - X

    # Z-Koordinate: lineare Streckung (res_z, res_x)
    Z = (u[:, np.newaxis] * length) * np.ones_like(VV)

    # ── Y-Koordinate: Höhenprofil (Draufsicht + Seitenansicht) ───────────────
    # Fußrücken-Kurve (höchster Punkt bei ~40% der Länge) — 1D entlang u
    dorsum_1d = foot_height * np.where(
        u < 0.40,
        (u / 0.40) ** 0.8,
        1.0 - ((u - 0.40) / 0.60) ** 1.5 * 0.6
    )
    dorsum = dorsum_1d[:, np.newaxis]  # broadcast zu (res_z, res_x)

    # Gewölbe-Einschnürung: Innenseite hebt sich in der Mitte
    medial_factor = 1 - VV   # 1 = medial, 0 = lateral   (res_z, res_x)
    arch_u = np.where(
        (u >= 0.25) & (u <= 0.70),
        np.sin(np.pi * (u - 0.25) / 0.45) ** 1.5,
        0.0
    )[:, np.newaxis]  # (res_z, 1)
    arch_lift = arch_height * medial_factor * arch_u

    # Gesamt-Höhe
    Y = dorsum + arch_lift

    # ── Kleine zufällige Perturbation (simuliert individuelle Variation) ──────
    noise = rng.normal(0, 0.5, Y.shape)
    Y = Y + noise
    X = X + rng.normal(0, 0.3, X.shape)

    # ── Mesh aufbauen ─────────────────────────────────────────────────────────
    verts = np.stack([X.ravel(), Y.ravel(), Z.ravel()], axis=1)

    # Triangulation des Gitters
    faces = []
    for i in range(res_z - 1):
        for j in range(res_x - 1):
            a = i * res_x + j
            b = a + 1
            c = a + res_x
            d = c + 1
            faces.append([a, b, c])
            faces.append([b, d, c])

    faces = np.array(faces, dtype=np.int32)

    # Boden-Fläche hinzufügen (Fußsohle) – alle Y auf 0 setzen
    sole_verts = verts.copy()
    sole_verts[:, 1] = 0.0  # Y=0 für Sohle
    sole_idx_start = len(verts)
    verts = np.vstack([verts, sole_verts])

    # Seiten-Dreiecke (Sohle ↔ Oberseite)
    # Vorderrand (Zehen): i = res_z-1
    toe_top  = [(res_z - 1) * res_x + j for j in range(res_x)]
    toe_bot  = [sole_idx_start + (res_z - 1) * res_x + j for j in range(res_x)]
    # Hinterrand (Ferse): i = 0
    heel_top = [j for j in range(res_x)]
    heel_bot = [sole_idx_start + j for j in range(res_x)]

    for j in range(res_x - 1):
        faces = np.vstack([faces,
            [[toe_top[j], toe_top[j+1], toe_bot[j]]],
            [[toe_top[j+1], toe_bot[j+1], toe_bot[j]]],
            [[heel_top[j], heel_bot[j], heel_top[j+1]]],
            [[heel_bot[j], heel_bot[j+1], heel_top[j+1]]],
        ])

    # Mediale Seite (j=0)
    for i in range(res_z - 1):
        t0 = i * res_x; t1 = (i+1) * res_x
        b0 = sole_idx_start + t0; b1 = sole_idx_start + t1
        faces = np.vstack([faces, [[t0, b0, t1]], [[b0, b1, t1]]])

    # Laterale Seite (j=res_x-1)
    for i in range(res_z - 1):
        t0 = i * res_x + res_x - 1; t1 = (i+1) * res_x + res_x - 1
        b0 = sole_idx_start + t0; b1 = sole_idx_start + t1
        faces = np.vstack([faces, [[t0, t1, b0]], [[t1, b1, b0]]])

    mesh = trimesh.Trimesh(vertices=verts, faces=faces, process=True)
    mesh.fix_normals()

    # Auf Boden setzen
    mesh.vertices[:, 1] -= mesh.vertices[:, 1].min()

    return mesh


def eu_to_length(eu_size: float) -> float:
    """Konvertiert EU-Größe zu Fußlänge in mm (Stobel-Methode)."""
    return eu_size * 6.667 + 2.0   # Näherung: EU 40 ≈ 267mm


def generate_dataset(
    n: int = 500,
    out_dir: Path = Path('data/foot3d'),
    csv_path: Path = Path('data/measurements.csv'),
):
    """Generiert n synthetische Fußmeshes mit anatomisch korrelierten Maßen."""
    from anthro_stats import sample_foot_measurements, length_to_eu, estimate_girths

    out_dir.mkdir(parents=True, exist_ok=True)
    csv_path.parent.mkdir(parents=True, exist_ok=True)

    rng = np.random.default_rng(42)

    # Sample correlated measurements from anthropometric distributions
    all_measurements = sample_foot_measurements(rng, sex='mixed', n=n)

    records = []
    print(f'Generiere {n} synthetische Fußmeshes (anthropometrisch korreliert)…')

    for i, meas in enumerate(tqdm(all_measurements, total=n)):
        seed = i * 31 + 7

        length = meas['length']
        width  = meas['width']
        arch_h = meas['arch_height']
        foot_h = meas['foot_height']

        # Mesh generieren
        mesh = make_foot_mesh(
            length=length, width=width,
            arch_height=arch_h, foot_height=foot_h,
            seed=seed,
        )

        # OBJ speichern
        foot_id  = f'synthetic_{i:04d}'
        obj_path = out_dir / f'{foot_id}.obj'
        mesh.export(str(obj_path))

        eu_size = round(length_to_eu(length), 1)

        records.append({
            'source':           'synthetic_anthropometric',
            'foot_id':          foot_id,
            'obj_path':         str(obj_path),
            'side':             'right',
            'eu_size':          eu_size,
            'length':           round(length, 1),
            'width':            round(width, 1),
            'foot_height':      round(foot_h, 1),
            'arch_height':      round(arch_h, 1),
            'ball_girth':       meas['ball_girth'],
            'instep_girth':     meas['instep_girth'],
            'waist_girth':      meas['waist_girth'],
            'heel_girth':       meas['heel_girth'],
            'long_heel_girth':  meas['long_heel_girth'],
            'short_heel_girth': meas['short_heel_girth'],
            'ankle_girth':      meas['ankle_girth'],
            'ball_width':       round(width * 0.95, 1),
            'heel_width':       round(width * 0.60, 1),
            'n_vertices':       len(mesh.vertices),
        })

    # CSV speichern
    with open(csv_path, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=records[0].keys())
        writer.writeheader()
        writer.writerows(records)

    # Statistiken
    print(f'\n✓ {n} Meshes generiert in: {out_dir}')
    for key in ['length', 'width', 'foot_height', 'arch_height',
                'ball_girth', 'instep_girth', 'heel_girth',
                'long_heel_girth', 'short_heel_girth', 'ankle_girth']:
        vals = [r[key] for r in records]
        print(f'  {key:<20} {np.mean(vals):7.1f} ± {np.std(vals):5.1f} mm')
    print(f'  CSV:     {csv_path}')
    print(f'\nNächster Schritt: python scripts/03_render_views.py')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--n',       type=int, default=500,             help='Anzahl zu generierender Füße')
    parser.add_argument('--out_dir', default='data/foot3d',             help='Output OBJ-Ordner')
    parser.add_argument('--csv',     default='data/measurements.csv',   help='Output CSV')
    args = parser.parse_args()

    script_dir = Path(__file__).parent
    out_dir  = (script_dir / '..' / args.out_dir).resolve()
    csv_path = (script_dir / '..' / args.csv).resolve()

    generate_dataset(n=args.n, out_dir=out_dir, csv_path=csv_path)


if __name__ == '__main__':
    main()

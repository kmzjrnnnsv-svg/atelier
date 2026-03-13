"""
02_extract_measurements.py
Extrahiert präzise Fußmaße (mm) aus OBJ-Meshes des Foot3D-Datensatzes.

Berechnete Maße (alle in mm):
  - foot_length:     Ferse → längste Zehe (Z-Achse)
  - foot_width:      Breiteste Stelle im Ballenbereich (X-Achse)
  - arch_height:     Bogenhöhe (Abstand Boden → Fußgewölbe auf Innenseite)
  - foot_height:     Gesamthöhe des Fußes (Boden → Fußrücken)
  - ball_width:      Breite auf Höhe des Ballens (vorderes Drittel)
  - heel_width:      Breite der Ferse (hinteres Fünftel)

Verwendung:
  python scripts/02_extract_measurements.py
  python scripts/02_extract_measurements.py --data_dir data/foot3d --out data/measurements.csv

Abhängigkeiten:
  pip install trimesh numpy pandas tqdm
"""

import argparse
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

try:
    import trimesh
    HAS_TRIMESH = True
except ImportError:
    HAS_TRIMESH = False
    print('[ERROR] trimesh nicht installiert: pip install trimesh')
    sys.exit(1)

try:
    from tqdm import tqdm
except ImportError:
    tqdm = lambda x, **kw: x  # noqa: E731


# ── Mesh Orientierung ─────────────────────────────────────────────────────────
# Foot3D: Füße stehen aufrecht, Länge = Z-Achse, Breite = X-Achse, Höhe = Y-Achse
# Einheit: prüfen ob mm oder m (auto-detect via mesh bounds)

def detect_unit(mesh) -> float:
    """Erkennt ob das Mesh in Metern oder mm ist → gibt Skalierungsfaktor zurück."""
    extent = mesh.bounding_box.extents
    max_extent = max(extent)
    if max_extent < 1.0:
        # Wahrscheinlich in Metern → zu mm skalieren
        return 1000.0
    elif max_extent < 10.0:
        # Wahrscheinlich in cm → zu mm skalieren
        return 10.0
    else:
        # Schon in mm
        return 1.0


def orient_foot(vertices: np.ndarray) -> np.ndarray:
    """
    Orientiert das Mesh so dass:
      - Längste Achse = Z (Länge)
      - Zweite Achse  = X (Breite)
      - Kürzeste Achse = Y (Höhe)
    Zentriert das Mesh am Boden (Y_min = 0).
    """
    # PCA um Hauptachsen zu finden
    centered = vertices - vertices.mean(axis=0)
    cov = np.cov(centered.T)
    eigenvalues, eigenvectors = np.linalg.eigh(cov)
    # Sortiere Eigenvektoren nach Varianz (absteigend)
    order = np.argsort(eigenvalues)[::-1]
    eigenvectors = eigenvectors[:, order]

    # Rotiere: Hauptachse (maximale Varianz) → Z, etc.
    rotated = centered @ eigenvectors

    # Stelle sicher: Z ist positiv (Zehen vorne)
    # Heuristik: der Bereich mit der höchsten Y-Dichte vorne sind die Zehen
    # (Zehen sind dünner als Ferse)
    front_half  = rotated[rotated[:, 2] > 0]
    back_half   = rotated[rotated[:, 2] < 0]
    if len(front_half) > 0 and len(back_half) > 0:
        front_width = front_half[:, 0].max() - front_half[:, 0].min()
        back_width  = back_half[:, 0].max()  - back_half[:, 0].min()
        if back_width > front_width:
            # Ferse ist hinten (Z<0), richtige Orientierung
            pass
        else:
            # Umdrehen
            rotated[:, 2] = -rotated[:, 2]

    # Boden auf Y=0 setzen
    rotated[:, 1] -= rotated[:, 1].min()
    return rotated


def compute_arch_height(vertices: np.ndarray, foot_length: float) -> float:
    """
    Bogenhöhe: minimale Y-Höhe im mittleren Drittel des Fußes (Arch-Bereich).
    Der Arch ist die Stelle wo der Fuß den Boden NICHT berührt.
    """
    z_min = vertices[:, 2].min()
    z_range = vertices[:, 2].max() - z_min

    # Mittleres Drittel: von 30% bis 65% der Länge
    arch_start = z_min + z_range * 0.30
    arch_end   = z_min + z_range * 0.65

    arch_verts = vertices[(vertices[:, 2] >= arch_start) & (vertices[:, 2] <= arch_end)]
    if len(arch_verts) == 0:
        return 14.0  # Standardwert

    # Innenseite: nimm die Hälfte mit kleineren X-Werten (medial)
    x_median = np.median(arch_verts[:, 0])
    medial_verts = arch_verts[arch_verts[:, 0] < x_median]
    if len(medial_verts) == 0:
        medial_verts = arch_verts

    # Minimale Höhe im Innenbereich = Bogenhöhe
    arch_height = medial_verts[:, 1].min()
    return max(arch_height, 0.0)


def compute_ball_width(vertices: np.ndarray) -> float:
    """Breite im Ballenbereich (25%–40% der Länge von vorne)."""
    z_min, z_max = vertices[:, 2].min(), vertices[:, 2].max()
    z_range = z_max - z_min
    ball_start = z_max - z_range * 0.40
    ball_end   = z_max - z_range * 0.25
    ball_verts = vertices[(vertices[:, 2] >= ball_start) & (vertices[:, 2] <= ball_end)]
    if len(ball_verts) < 3:
        return 90.0
    return ball_verts[:, 0].max() - ball_verts[:, 0].min()


def compute_heel_width(vertices: np.ndarray) -> float:
    """Breite im Fersenbereich (hinteres Fünftel)."""
    z_min, z_max = vertices[:, 2].min(), vertices[:, 2].max()
    z_range = z_max - z_min
    heel_end = z_min + z_range * 0.20
    heel_verts = vertices[vertices[:, 2] <= heel_end]
    if len(heel_verts) < 3:
        return 60.0
    return heel_verts[:, 0].max() - heel_verts[:, 0].min()


def measure_foot_obj(obj_path: Path) -> dict | None:
    """
    Lädt ein OBJ-Mesh und berechnet alle Fußmaße in mm.
    Gibt None zurück bei Fehler.
    """
    try:
        mesh = trimesh.load(str(obj_path), force='mesh', process=True)
        if not hasattr(mesh, 'vertices') or len(mesh.vertices) < 100:
            return None

        # Einheit erkennen + Skalieren
        scale = detect_unit(mesh)
        vertices = mesh.vertices * scale

        # Orientieren
        vertices = orient_foot(vertices)

        # Basis-Maße
        z_extent = vertices[:, 2].max() - vertices[:, 2].min()  # Länge
        x_extent = vertices[:, 0].max() - vertices[:, 0].min()  # Breite
        y_extent = vertices[:, 1].max() - vertices[:, 1].min()  # Höhe

        # Plausibilitäts-Check
        if not (180 < z_extent < 350):
            # Möglicherweise falsche Achse → versuche andere Orientierung
            z_extent, x_extent = x_extent, z_extent

        # Arch-Höhe berechnen
        arch_h = compute_arch_height(vertices, z_extent)

        return {
            'foot_length':   round(z_extent, 1),
            'foot_width':    round(x_extent, 1),
            'arch_height':   round(arch_h, 1),
            'foot_height':   round(y_extent, 1),
            'ball_width':    round(compute_ball_width(vertices),  1),
            'heel_width':    round(compute_heel_width(vertices),  1),
            'n_vertices':    len(vertices),
        }

    except Exception as e:
        print(f'  [WARN] {obj_path.name}: {e}')
        return None


def process_foot3d(data_dir: Path, out_csv: Path):
    """Verarbeitet den kompletten Foot3D-Datensatz."""
    print(f'\n[Foot3D] Suche OBJ-Meshes in: {data_dir}')

    # Finde alle OBJ-Dateien
    obj_files = sorted(data_dir.rglob('*.obj'))
    print(f'  Gefunden: {len(obj_files)} OBJ-Dateien')

    if len(obj_files) == 0:
        print('  ⚠  Keine OBJ-Dateien gefunden. Erst 01_download_data.sh ausführen!')
        return pd.DataFrame()

    # JSON-Annotationen laden (Foot3D-Metadaten)
    annotations = {}
    ann_files = list(data_dir.rglob('*.json'))
    for ann_file in ann_files:
        try:
            with open(ann_file) as f:
                data = json.load(f)
            if 'data' in data:
                for entry in data['data']:
                    foot_id = entry.get('foot_id') or entry.get('id')
                    if foot_id:
                        annotations[str(foot_id)] = entry
        except Exception:
            pass
    print(f'  Annotationen: {len(annotations)} Einträge')

    # Maße berechnen
    records = []
    for obj_path in tqdm(obj_files, desc='Messe Füße'):
        measurements = measure_foot_obj(obj_path)
        if measurements is None:
            continue

        # Foot-ID aus Dateiname extrahieren
        foot_id = obj_path.stem.split('_')[0] if '_' in obj_path.stem else obj_path.stem

        # Metadaten hinzufügen
        meta = annotations.get(foot_id, {})
        record = {
            'source':     'foot3d',
            'foot_id':    foot_id,
            'obj_path':   str(obj_path),
            'side':       meta.get('side', 'unknown'),
            'sex':        meta.get('sex', 'unknown'),
            'age':        meta.get('age', None),
            'height_cm':  meta.get('height', None),
            **measurements,
        }
        records.append(record)

    df = pd.DataFrame(records)
    print(f'\n  ✓ {len(df)} Füße vermessen')

    if len(df) > 0:
        print(f'\n  Statistiken:')
        for col in ['foot_length', 'foot_width', 'arch_height', 'foot_height']:
            if col in df.columns:
                print(f'    {col:15s}: {df[col].mean():.1f} ± {df[col].std():.1f} mm '
                      f'(min={df[col].min():.0f}, max={df[col].max():.0f})')

    return df


def process_cad_walk(data_dir: Path) -> pd.DataFrame:
    """
    Liest CAD WALK demografische Daten.
    Enthält Schuhgrößen → nützlich für Größen-Validierung.
    """
    print(f'\n[CAD WALK] Suche CSV-Dateien in: {data_dir}')
    records = []

    csv_files = list(data_dir.rglob('*.csv')) + list(data_dir.rglob('*.xlsx'))
    print(f'  Gefunden: {len(csv_files)} Dateien')

    for f in csv_files:
        try:
            if f.suffix == '.xlsx':
                df = pd.read_excel(f)
            else:
                df = pd.read_csv(f, sep=None, engine='python')

            # Normalisiere Spaltennamen
            df.columns = df.columns.str.lower().str.replace(' ', '_')

            # Suche nach Schuhgröße / Fußlänge
            size_cols = [c for c in df.columns if any(kw in c for kw in ['shoe', 'size', 'foot', 'length', 'maat'])]
            if size_cols:
                for _, row in df.iterrows():
                    rec = {'source': 'cad_walk'}
                    for col in ['age', 'sex', 'gender', 'height', 'weight'] + size_cols:
                        if col in row:
                            rec[col] = row[col]
                    records.append(rec)
        except Exception as e:
            print(f'  [WARN] {f.name}: {e}')

    df = pd.DataFrame(records)
    print(f'  ✓ {len(df)} Einträge aus CAD WALK')
    return df


def main():
    parser = argparse.ArgumentParser(description='Fußmaße aus OBJ-Meshes extrahieren')
    parser.add_argument('--data_dir',    default='data',            help='Datensatz-Ordner')
    parser.add_argument('--foot3d_dir',  default='data/foot3d',     help='Foot3D OBJ-Ordner')
    parser.add_argument('--cadwalk_dir', default='data/cad_walk',   help='CAD WALK Ordner')
    parser.add_argument('--out',         default='data/measurements.csv', help='Output CSV')
    args = parser.parse_args()

    script_dir = Path(__file__).parent
    foot3d_dir  = (script_dir / '..' / args.foot3d_dir).resolve()
    cadwalk_dir = (script_dir / '..' / args.cadwalk_dir).resolve()
    out_path    = (script_dir / '..' / args.out).resolve()
    out_path.parent.mkdir(exist_ok=True, parents=True)

    all_dfs = []

    # Foot3D
    df_foot3d = process_foot3d(foot3d_dir, out_path)
    if len(df_foot3d) > 0:
        all_dfs.append(df_foot3d)

    # CAD WALK (nur wenn vorhanden)
    if cadwalk_dir.exists():
        df_cad = process_cad_walk(cadwalk_dir)
        if len(df_cad) > 0:
            all_dfs.append(df_cad)

    # Zusammenführen + speichern
    if all_dfs:
        combined = pd.concat(all_dfs, ignore_index=True)
        combined.to_csv(out_path, index=False)
        print(f'\n✓ Gesamt {len(combined)} Einträge gespeichert: {out_path}')
        print('\nNächster Schritt: python scripts/03_render_views.py')
    else:
        print('\n⚠  Keine Daten gefunden. Erst 01_download_data.sh ausführen!')
        print('   Dann: python scripts/02_extract_measurements.py')


if __name__ == '__main__':
    main()

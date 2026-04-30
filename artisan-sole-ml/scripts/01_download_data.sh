#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# 01_download_data.sh
# Lädt alle verfügbaren Fußdatensätze herunter.
#
# Verwendung:
#   chmod +x 01_download_data.sh
#   ./01_download_data.sh
#
# Benötigte Tools:
#   pip install kaggle
#   → Kaggle API-Key: https://www.kaggle.com/settings → "Create New Token"
#   → Datei speichern als: ~/.kaggle/kaggle.json
# ─────────────────────────────────────────────────────────────────────────────

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="$SCRIPT_DIR/../data"
mkdir -p "$DATA_DIR"

echo "═══════════════════════════════════════════════════"
echo "  Atelier ML — Datensatz-Download"
echo "═══════════════════════════════════════════════════"

# ── 1. Foot3D (Kaggle) ────────────────────────────────────────────────────────
# 118 hochauflösende 3D-Fußscans (OBJ + JSON-Annotationen)
echo ""
echo "[1/3] Foot3D Dataset (OllieBoyne, Cambridge)"
echo "      118 OBJ-Meshes + JSON-Annotationen"
echo "      Quelle: https://www.kaggle.com/datasets/ollieboyne/foot3d"
echo ""

FOOT3D_DIR="$DATA_DIR/foot3d"
mkdir -p "$FOOT3D_DIR"

if command -v kaggle &>/dev/null; then
    if [ -f "$HOME/.kaggle/kaggle.json" ]; then
        echo "  → Lade herunter..."
        kaggle datasets download -d ollieboyne/foot3d -p "$FOOT3D_DIR" --unzip
        echo "  ✓ Foot3D heruntergeladen: $FOOT3D_DIR"
    else
        echo "  ⚠  Kaggle API-Key nicht gefunden!"
        echo "     1. Gehe zu: https://www.kaggle.com/settings"
        echo "     2. Klicke 'Create New Token'"
        echo "     3. Speichere kaggle.json in: ~/.kaggle/kaggle.json"
        echo "     4. chmod 600 ~/.kaggle/kaggle.json"
        echo "     Oder: Manuell herunterladen von kaggle.com/datasets/ollieboyne/foot3d"
    fi
else
    echo "  ⚠  kaggle-CLI nicht installiert!"
    echo "     pip install kaggle"
    echo "     Dann: kaggle datasets download -d ollieboyne/foot3d -p $FOOT3D_DIR --unzip"
fi

# ── 2. CAD WALK Healthy Controls (Zenodo) ────────────────────────────────────
# 55 Probanden, Schuhgrößen + demografische Daten (Plantar-Druckmessungen)
echo ""
echo "[2/3] CAD WALK Healthy Controls (Zenodo 1265420)"
echo "      55 Probanden, inkl. Schuhgrößen & Körperdaten"
echo "      Lizenz: CC BY 4.0"
echo ""

CADWALK_DIR="$DATA_DIR/cad_walk"
mkdir -p "$CADWALK_DIR"

if command -v curl &>/dev/null; then
    echo "  → Lade herunter..."
    curl -L "https://zenodo.org/records/1265420/files/CAD_WALK_Healthy_Controls_Dataset.zip" \
         -o "$CADWALK_DIR/cad_walk.zip" \
         --progress-bar
    echo "  → Entpacke..."
    unzip -q "$CADWALK_DIR/cad_walk.zip" -d "$CADWALK_DIR" && rm "$CADWALK_DIR/cad_walk.zip"
    echo "  ✓ CAD WALK heruntergeladen: $CADWALK_DIR"
else
    echo "  ⚠  curl nicht gefunden. Manuell herunterladen:"
    echo "     https://zenodo.org/records/1265420"
fi

# ── 3. SynFoot-Metadaten (GitHub) ────────────────────────────────────────────
# Synthetische Fußbilder (benötigt Google Form für Rohdaten)
echo ""
echo "[3/3] SynFoot Metadaten (OllieBoyne, GitHub)"
echo "      Synthetischer Datensatz — nur README/Metadaten öffentlich"
echo ""

SYNFOOT_DIR="$DATA_DIR/synfoot"
mkdir -p "$SYNFOOT_DIR"

if command -v curl &>/dev/null; then
    curl -sL "https://raw.githubusercontent.com/OllieBoyne/SynFoot/main/README.md" \
         -o "$SYNFOOT_DIR/README.md"
    echo "  ✓ SynFoot README gespeichert"
    echo "  ℹ  Für Rohdaten: Google Form auf https://github.com/OllieBoyne/SynFoot ausfüllen"
fi

# ── Ergebnis ──────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════"
echo "  Nächster Schritt:"
echo "  python scripts/02_extract_measurements.py"
echo "═══════════════════════════════════════════════════"
echo ""

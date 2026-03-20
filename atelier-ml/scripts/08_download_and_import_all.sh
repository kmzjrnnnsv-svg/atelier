#!/usr/bin/env bash
# 08_download_and_import_all.sh — Download and import all external datasets.
#
# Downloads:
#   1. Foot3D (Kaggle) — 118 real 3D foot scans (requires kaggle CLI + auth)
#   2. Dryad Foot Shape — 100 PLY meshes (CC0, direct download)
#
# Then runs:
#   - Import scripts for both datasets
#   - PCA shape model rebuild
#   - Accuracy evaluation
#
# Usage:
#   bash scripts/08_download_and_import_all.sh

set -euo pipefail

ML_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DATA_DIR="${ML_DIR}/data"

echo "============================================"
echo "  DATASET DOWNLOAD & IMPORT PIPELINE"
echo "============================================"
echo "  ML dir: ${ML_DIR}"
echo ""

# ── 1. Dryad Foot Shape (CC0, direct API download) ──────────────────────────
echo "[1/4] Downloading Dryad Foot Shape dataset..."
DRYAD_DIR="${DATA_DIR}/dryad_foot"
mkdir -p "${DRYAD_DIR}"

if [ "$(find "${DRYAD_DIR}" -name '*.ply' 2>/dev/null | head -1)" ]; then
    echo "  → Already downloaded (PLY files found)"
else
    DRYAD_ZIP="/tmp/dryad_foot_shape.zip"
    if [ ! -f "${DRYAD_ZIP}" ]; then
        echo "  Downloading from Dryad API..."
        curl -L -o "${DRYAD_ZIP}" \
            "https://datadryad.org/api/v2/datasets/doi:10.5061/dryad.g4f4qrfwt/download" \
            2>&1 | tail -2
    fi
    echo "  Extracting..."
    unzip -o -q "${DRYAD_ZIP}" -d "${DRYAD_DIR}" 2>/dev/null || true
    # PLY files might be in subdirectories — flatten
    find "${DRYAD_DIR}" -name '*.ply' -not -path "${DRYAD_DIR}/*.ply" \
        -exec mv {} "${DRYAD_DIR}/" \; 2>/dev/null || true
    N_PLY=$(find "${DRYAD_DIR}" -maxdepth 2 -name '*.ply' | wc -l)
    echo "  → ${N_PLY} PLY files extracted"
fi

# ── 2. Foot3D from Kaggle ───────────────────────────────────────────────────
echo ""
echo "[2/4] Downloading Foot3D dataset from Kaggle..."
FOOT3D_FIND_DIR="${DATA_DIR}/foot3d_find"
mkdir -p "${FOOT3D_FIND_DIR}"

if [ "$(find "${FOOT3D_FIND_DIR}" -name '*.obj' -o -name '*.ply' 2>/dev/null | head -1)" ]; then
    echo "  → Already downloaded (mesh files found)"
else
    if command -v kaggle &>/dev/null; then
        echo "  Downloading via kaggle CLI..."
        kaggle datasets download ollieboyne/foot3d -p /tmp/foot3d_kaggle --unzip 2>&1 || {
            echo "  [WARN] Kaggle download failed. You may need:"
            echo "    export KAGGLE_USERNAME=your_username"
            echo "    export KAGGLE_KEY=your_api_key"
            echo "  Or fill in the Google form at:"
            echo "    https://forms.gle/7eZh67UXMZYcM11M7"
        }
        # Move mesh files to our directory
        if [ -d /tmp/foot3d_kaggle ]; then
            find /tmp/foot3d_kaggle -name '*.obj' -o -name '*.ply' | \
                xargs -I{} cp {} "${FOOT3D_FIND_DIR}/" 2>/dev/null || true
        fi
    else
        echo "  [SKIP] kaggle CLI not installed. Install with: pip install kaggle"
        echo "  Alternatively, download from:"
        echo "    https://www.kaggle.com/datasets/ollieboyne/foot3d"
        echo "    https://forms.gle/7eZh67UXMZYcM11M7"
    fi
    N_MESH=$(find "${FOOT3D_FIND_DIR}" -name '*.obj' -o -name '*.ply' 2>/dev/null | wc -l)
    echo "  → ${N_MESH} mesh files available"
fi

# ── 3. Run import scripts ──────────────────────────────────────────────────
echo ""
echo "[3/4] Running import scripts..."

cd "${ML_DIR}"

echo "  Importing Dryad..."
python3 scripts/import_dryad_foot.py 2>&1 | tail -15

echo ""
echo "  Importing Foot3D+FIND..."
python3 scripts/import_foot3d_find.py 2>&1 | tail -15

# ── 4. Rebuild PCA shape model ─────────────────────────────────────────────
echo ""
echo "[4/4] Rebuilding PCA shape model with all data..."
python3 scripts/rebuild_shape_model.py 2>&1 | tail -20

echo ""
echo "============================================"
echo "  DONE"
echo "============================================"
echo ""
echo "Next: Run accuracy evaluation:"
echo "  python3 eval_data_accuracy.py"

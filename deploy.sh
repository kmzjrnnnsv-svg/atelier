#!/bin/bash
# =============================================================================
# Atelier — Deploy Script
# Zieht den neuesten Code und startet das Backend neu.
#
# Nutzung:  bash ~/deploy.sh
# =============================================================================

set -e

APP_DIR="$HOME/atelier"
LOG="$HOME/deploy.log"
BRANCH="website"

echo "──────────────────────────────────────"
echo "  Atelier Deploy — $(date '+%Y-%m-%d %H:%M:%S')"
echo "──────────────────────────────────────"

# 1. Neuesten Code holen
echo "→ Git pull..."
cd "$APP_DIR"
git pull origin "$BRANCH"
echo "  Code aktualisiert"

# 2. Frontend bauen
echo "→ Frontend bauen..."
cd "$APP_DIR/atelier-app"
npm install
npm run build
echo "  Frontend gebaut"

# 3. Backend Dependencies prüfen
echo "→ npm install (Backend)..."
cd "$APP_DIR/atelier-backend"
npm install --production
echo "  Dependencies aktuell"

# 4. Backend neustarten
echo "→ Backend neustarten..."
pm2 restart atelier
echo "  Backend neu gestartet"

# 4. Status prüfen
echo ""
echo "→ PM2 Status:"
pm2 status

# Log schreiben
echo "$(date '+%Y-%m-%d %H:%M:%S') — Deploy erfolgreich" >> "$LOG"

echo ""
echo "  Deploy abgeschlossen!"
echo "  Logs: pm2 logs atelier"
echo "──────────────────────────────────────"

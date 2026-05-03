#!/bin/bash
# =============================================================================
# Artisan Sole — Deploy Script
# Zieht den neuesten Code und startet das Backend neu.
#
# Nutzung:  bash ~/deploy.sh
# =============================================================================

set -e

APP_DIR="$HOME/as"
LOG="$HOME/deploy.log"
BRANCH="website"

echo "──────────────────────────────────────"
echo "  Artisan Sole Deploy — $(date '+%Y-%m-%d %H:%M:%S')"
echo "──────────────────────────────────────"

# 1. Neuesten Code holen
echo "→ Git pull..."
cd "$APP_DIR"
# Lockfiles werden auf dem Server bei jedem `npm install` neu erzeugt und blockieren
# sonst den Pull. Sie sind im Repo gepflegt — lokale Diffs hier sind Wegwerf.
git checkout -- artisan-sole-app/package-lock.json artisan-sole-backend/package-lock.json 2>/dev/null || true
git pull origin "$BRANCH"
echo "  Code aktualisiert"

# 2. Frontend bauen
echo "→ Frontend bauen..."
cd "$APP_DIR/artisan-sole-app"
npm install
npm run build
echo "  Frontend gebaut"

# 3. Backend Dependencies prüfen
echo "→ npm install (Backend)..."
cd "$APP_DIR/artisan-sole-backend"
npm install --production
echo "  Dependencies aktuell"

# 4. Backend neustarten
echo "→ Backend neustarten..."
pm2 restart artisan-sole
echo "  Backend neu gestartet"

# 4. Status prüfen
echo ""
echo "→ PM2 Status:"
pm2 status

# Log schreiben
echo "$(date '+%Y-%m-%d %H:%M:%S') — Deploy erfolgreich" >> "$LOG"

echo ""
echo "  Deploy abgeschlossen!"
echo "  Logs: pm2 logs artisan-sole"
echo "──────────────────────────────────────"

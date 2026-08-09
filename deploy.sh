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

# 0. Datenbank sichern, BEVOR neuer Code Migrationen darauf ausführt
# Die gesamten Inhalte — Modelle, Bilder, Bestellungen, Konten — liegen in
# einer einzigen SQLite-Datei. Bislang gab es davon keine Kopie: Ein
# fehlgeschlagener Migrationsschritt oder ein versehentlicher Eingriff war
# unwiederbringlich. `VACUUM INTO` erzeugt eine konsistente Kopie auch bei
# laufendem Server (WAL-Modus), ohne ihn anzuhalten.
DB="$APP_DIR/artisan-sole-backend/atelier.db"
BACKUP_DIR="$HOME/db-backups"
if [ -f "$DB" ]; then
  mkdir -p "$BACKUP_DIR"
  SNAP="$BACKUP_DIR/atelier-$(date '+%Y%m%d-%H%M%S').db"
  if sqlite3 "$DB" "VACUUM INTO '$SNAP'" 2>/dev/null; then
    echo "→ Datenbank gesichert: $SNAP"
  else
    # Ohne sqlite3-Binary bleibt das schlichte Kopieren. Weniger sauber,
    # aber immer noch besser als keine Sicherung.
    cp "$DB" "$SNAP" && echo "→ Datenbank kopiert: $SNAP"
  fi
  # Die letzten 20 Stände behalten, ältere entfernen.
  ls -1t "$BACKUP_DIR"/atelier-*.db 2>/dev/null | tail -n +21 | xargs -r rm -f
else
  echo "→ Keine Datenbank unter $DB gefunden, Sicherung übersprungen"
fi

# 1. Neuesten Code holen
echo "→ Git pull..."
cd "$APP_DIR"
# Lockfiles werden auf dem Server bei jedem `npm install` neu erzeugt und blockieren
# sonst den Pull. Sie sind im Repo gepflegt — lokale Diffs hier sind Wegwerf.
# `git checkout HEAD --` setzt Index UND Working-Tree zurück (auch wenn der Diff
# versehentlich gestaged wurde) — `git checkout --` allein reicht dafür nicht.
git checkout HEAD -- artisan-sole-app/package-lock.json artisan-sole-backend/package-lock.json 2>/dev/null || true
git pull origin "$BRANCH"
echo "  Code aktualisiert"

# 2. Frontend bauen (ATOMAR)
# Bisher wurde direkt im live ausgelieferten dist/ gebaut. Vite leert dist/ aber
# zu Beginn des (mehrere Sekunden langen) Builds → in diesem Fenster liefert der
# laufende Server fehlende/halbe Chunks aus (404 → ChunkLoadError beim Nutzer),
# und bei einem Build-Abbruch (z. B. OOM) bleibt die Seite dauerhaft kaputt.
# Lösung: in dist-new/ bauen und erst nach erfolgreichem Build live schalten.
echo "→ Frontend bauen..."
cd "$APP_DIR/artisan-sole-app"
npm install
rm -rf dist-new
# set -e (oben) sorgt dafür, dass bei einem Build-Fehler das alte dist/
# unangetastet bleibt und die Seite weiterläuft.
# Höheres V8-Heap-Limit gegen "JavaScript heap out of memory" beim Bündeln des
# schweren three.js-Bundles. Bei Bedarf an den Server-RAM anpassen.
NODE_OPTIONS="--max-old-space-size=2048" npm run build -- --outDir dist-new --emptyOutDir
# Assets des vorherigen Builds übernehmen, damit bereits geöffnete Tabs beim
# Lazy-Laden alter Chunk-Hashes (während/kurz nach dem Deploy) nicht 404en.
#   -n: niemals frisch gebaute Dateien überschreiben · -p: mtime erhalten (Prune)
if [ -d dist/assets ]; then cp -rpn dist/assets/. dist-new/assets/ 2>/dev/null || true; fi
# Atomarer Wechsel (zwei mv = Sub-Millisekunden-Fenster).
rm -rf dist-old
[ -d dist ] && mv dist dist-old
mv dist-new dist
# Verwaiste, mitgeschleppte Alt-Assets aufräumen. Referenzierte Chunks werden
# bei jedem Build frisch geschrieben (aktuelle mtime) und daher nie getroffen —
# nur nicht mehr referenzierte Hashes werden entfernt.
#
# Aufbewahrung 90 statt 7 Tage: Die Frist entscheidet, wie lange ein Besucher
# wegbleiben darf, ohne dass seine gecachte index.html ins Leere zeigt. Zwischen
# den Deploys vom 06.06. und 08.08. lagen zwei Monate; mit 7 Tagen waren die
# Chunks der Juni-Fassung längst gelöscht, und jeder Browser, der noch die alte
# index.html hielt, lief in einen Chunk-Fehler. Ein Build wiegt rund 4 MB, die
# längere Frist kostet also wenig Platz und erspart genau diesen Fall.
find dist/assets -type f -mtime +90 -delete 2>/dev/null || true
echo "  Frontend gebaut & live geschaltet"

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

#!/bin/bash
# Sync-Script: zieht den website-Branch und rollt aus, falls es Neues gibt.
#
# Das Bauen selbst macht deploy.sh — dort sitzen das erhöhte Heap-Limit
# (sonst bricht das three.js-Bündel auf kleinen Servern ab) und der
# atomare Wechsel nach dist/. Wird hier direkt `npm run build` aufgerufen,
# bleibt nach einem abgebrochenen Build ein leeres dist/ zurück, und die
# Seite zeigt dauerhaft „Seite kann nicht geladen werden".

APP_DIR="${APP_DIR:-$HOME/as}"
cd "$APP_DIR" || exit 1

git fetch origin website

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/website)

if [ "$LOCAL" != "$REMOTE" ]; then
  bash "$APP_DIR/deploy.sh" >> "$HOME/sync.log" 2>&1
  echo "$(date): Updated to $(git rev-parse --short HEAD)" >> "$HOME/sync.log"
else
  echo "$(date): Already up to date" >> "$HOME/sync.log"
fi

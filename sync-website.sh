#!/bin/bash
# Sync-Script: zieht website-Branch und baut neu falls Änderungen da sind

cd ~/app || exit 1

git fetch origin website

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/website)

if [ "$LOCAL" != "$REMOTE" ]; then
  git pull origin website
  cd atelier-app && npm run build
  pm2 restart all
  echo "$(date): Updated to $(git rev-parse --short HEAD)" >> ~/app/sync.log
else
  echo "$(date): Already up to date" >> ~/app/sync.log
fi

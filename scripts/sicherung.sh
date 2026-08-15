#!/bin/bash
# =============================================================================
# sicherung.sh — die Datenbank sichern, und zwar richtig.
#
# ── Warum nicht einfach `cp` ─────────────────────────────────────────────────
#
# Die Anwendung läuft im WAL-Modus. Ein `cp atelier.db backup.db` kopiert dann
# eine Datei, deren jüngste Schreibvorgänge noch im Begleit-Journal stehen —
# man bekommt einen Stand, den es nie gegeben hat, und merkt es erst beim
# Zurückspielen. `sqlite3 .backup` nimmt dagegen einen in sich stimmigen
# Abzug, auch während geschrieben wird.
#
# ── Was hier passiert ────────────────────────────────────────────────────────
#
#   1. Abzug ziehen und auf Lesbarkeit prüfen. Eine Sicherung, die niemand
#      geprüft hat, ist eine Vermutung.
#   2. Packen und mit Datum ablegen.
#   3. Alte Stände aufräumen — täglich 14 Tage, dazu der erste jedes Monats
#      für ein Jahr. Ohne Aufräumen läuft die Platte voll, und dann scheitert
#      nicht die Sicherung, sondern der Laden.
#
# ── Aufruf ───────────────────────────────────────────────────────────────────
#
#     bash ~/as/scripts/sicherung.sh
#
# Täglich um 3:30 Uhr, über crontab -e:
#
#     30 3 * * * /bin/bash /root/as/scripts/sicherung.sh >> /var/log/atelier-sicherung.log 2>&1
#
# ── Zurückspielen ────────────────────────────────────────────────────────────
#
#     pm2 stop all
#     gunzip -c /var/backups/atelier/atelier-2026-08-15.db.gz > /root/as/artisan-sole-backend/atelier.db
#     rm -f /root/as/artisan-sole-backend/atelier.db-wal /root/as/artisan-sole-backend/atelier.db-shm
#     pm2 start all
#
# Die beiden Begleitdateien MÜSSEN weg: Bleiben sie liegen, hält SQLite sie
# für die zur neuen Datei gehörenden Journale und schreibt sie darüber.
# =============================================================================

set -euo pipefail

DB="${DB:-/root/as/artisan-sole-backend/atelier.db}"
ZIEL="${ZIEL:-/var/backups/atelier}"
TAGE=14          # tägliche Stände
MONATE=12        # Monatserste

blau() { printf '\n\033[1m%s\033[0m\n' "$1"; }

if [ ! -f "$DB" ]; then
  echo "FEHLER: $DB gibt es nicht. Pfad über DB= setzen." >&2
  exit 1
fi
if ! command -v sqlite3 >/dev/null 2>&1; then
  echo "FEHLER: sqlite3 fehlt. Nachinstallieren mit: apt-get install -y sqlite3" >&2
  exit 1
fi

install -d -m 700 "$ZIEL"
HEUTE=$(date +%F)
ROH="$ZIEL/atelier-$HEUTE.db"
FERTIG="$ROH.gz"

blau "1/3  Abzug ziehen"
# In eine Zwischendatei, damit ein Abbruch nicht den letzten guten Stand
# überschreibt.
TMP=$(mktemp "$ZIEL/.abzug.XXXXXX")
trap 'rm -f "$TMP"' EXIT
sqlite3 "$DB" ".backup '$TMP'"
echo "     $(du -h "$TMP" | cut -f1)"

blau "2/3  Abzug prüfen"
ERGEBNIS=$(sqlite3 "$TMP" 'PRAGMA integrity_check;' | head -1)
if [ "$ERGEBNIS" != "ok" ]; then
  echo "     FEHLER: Der Abzug ist nicht lesbar ($ERGEBNIS). Nichts abgelegt." >&2
  exit 1
fi
# Eine formal heile, aber leere Datenbank wäre genauso wertlos.
ANZAHL=$(sqlite3 "$TMP" 'SELECT COUNT(*) FROM users;' 2>/dev/null || echo 0)
if [ "$ANZAHL" -lt 1 ]; then
  echo "     FEHLER: Der Abzug enthält keine Benutzer. Nichts abgelegt." >&2
  exit 1
fi
echo "     in Ordnung — $ANZAHL Konten, $(sqlite3 "$TMP" 'SELECT COUNT(*) FROM orders;') Bestellungen"

blau "3/3  Ablegen und aufräumen"
gzip -c "$TMP" > "$FERTIG.teil"
mv "$FERTIG.teil" "$FERTIG"
chmod 600 "$FERTIG"
rm -f "$TMP"
trap - EXIT
echo "     $FERTIG ($(du -h "$FERTIG" | cut -f1))"

# Tägliche Stände: alles älter als TAGE weg — außer Monatsersten.
GELOESCHT=0
for datei in "$ZIEL"/atelier-*.db.gz; do
  [ -e "$datei" ] || continue
  name=$(basename "$datei" .db.gz)          # atelier-2026-08-15
  datum=${name#atelier-}
  tag=${datum##*-}
  alter=$(( ( $(date +%s) - $(date -d "$datum" +%s) ) / 86400 ))

  if [ "$tag" = "01" ]; then
    grenze=$(( MONATE * 31 ))
  else
    grenze=$TAGE
  fi
  if [ "$alter" -gt "$grenze" ]; then
    rm -f "$datei"
    GELOESCHT=$((GELOESCHT + 1))
  fi
done
echo "     $GELOESCHT alte Stände entfernt, $(ls -1 "$ZIEL"/atelier-*.db.gz 2>/dev/null | wc -l) verbleiben"

cat <<HINWEIS

────────────────────────────────────────────────────────────────────────
  Eine Sicherung auf demselben Server schützt gegen einen Fehlgriff, nicht
  gegen den Verlust des Servers. Holen Sie sich $ZIEL regelmäßig
  woandershin — von Ihrem Rechner aus genügt:

      rsync -az --delete root@SERVER:$ZIEL/ ~/sicherungen/atelier/

  Und spielen Sie einmal eine Sicherung zurück, bevor Sie es müssen. Der
  Weg steht im Kopf dieser Datei.
────────────────────────────────────────────────────────────────────────

HINWEIS

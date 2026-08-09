#!/usr/bin/env bash
# Artisan Sole — Selbstdiagnose
#
# Ein Befehl, eine Ausgabe, ein Urteil. Gedacht für den Fall „Seite geht
# nicht" — statt sechs Einzelbefehle abzutippen und die Ergebnisse zu deuten.
#
#   Auf dem Server:   bash scripts/diagnose.sh
#   Vom eigenen Rechner (prüft nur, was von außen sichtbar ist):
#                     bash scripts/diagnose.sh --extern
#
# Nichts wird verändert, nur gelesen.

set -uo pipefail
DOMAIN="${DOMAIN:-artisansole.com}"
PROBLEME=0
WARNUNGEN=0

rot()  { printf '\033[31m%s\033[0m\n' "$*"; PROBLEME=$((PROBLEME+1)); }
gelb() { printf '\033[33m%s\033[0m\n' "$*"; WARNUNGEN=$((WARNUNGEN+1)); }
gruen(){ printf '\033[32m%s\033[0m\n' "$*"; }
titel(){ printf '\n\033[1m── %s %s\033[0m\n' "$*" "$(printf '─%.0s' $(seq 1 $((60 - ${#1}))))"; }

titel "Von außen"

# ── DNS ────────────────────────────────────────────────────────────────────
if command -v dig >/dev/null 2>&1; then
  A=$(dig +short "$DOMAIN" A | grep -E '^[0-9]' | head -3)
  AAAA=$(dig +short "$DOMAIN" AAAA | head -3)
else
  A=$(getent ahostsv4 "$DOMAIN" 2>/dev/null | awk '{print $1}' | sort -u | head -3)
  AAAA=$(getent ahostsv6 "$DOMAIN" 2>/dev/null | awk '{print $1}' | sort -u | head -3)
fi

if [ -z "$A" ]; then
  rot "DNS: $DOMAIN löst nicht auf. Die Domain zeigt nirgendwohin — Registrar und DNS-Zone prüfen."
else
  gruen "DNS: $DOMAIN → $(echo "$A" | tr '\n' ' ')"
fi

# Ein AAAA-Eintrag ohne funktionierendes IPv6 ist eine klassische Falle:
# Der Browser probiert zuerst IPv6 und meldet „nicht erreichbar", obwohl
# über IPv4 alles läuft.
if [ -n "$AAAA" ]; then
  echo "     IPv6: $(echo "$AAAA" | tr '\n' ' ')"
  if ! curl -6 -s -o /dev/null --max-time 8 "https://$DOMAIN"; then
    rot "     IPv6 ist eingetragen, antwortet aber nicht. Das erklärt „Seite nicht erreichbar\"" \
      && echo "     bei funktionierendem Server. AAAA-Eintrag entfernen oder IPv6 einrichten."
  else
    gruen "     IPv6 antwortet"
  fi
fi

# ── Erreichbarkeit und Zertifikat ──────────────────────────────────────────
for PORT in 80 443; do
  if timeout 8 bash -c "</dev/tcp/$DOMAIN/$PORT" 2>/dev/null; then
    gruen "Port $PORT: offen"
  else
    rot "Port $PORT: keine Verbindung. Firewall, Server aus, oder nginx läuft nicht."
  fi
done

CODE=$(curl -4 -s -o /dev/null -w '%{http_code}' --max-time 12 "https://$DOMAIN" 2>/dev/null)
case "$CODE" in
  200|301|302) gruen "HTTPS: antwortet mit $CODE" ;;
  000)         rot  "HTTPS: keine Antwort (Zeitüberschreitung oder TLS-Fehler)" ;;
  5*)          rot  "HTTPS: $CODE — nginx läuft, die Anwendung dahinter nicht" ;;
  *)           gelb "HTTPS: $CODE" ;;
esac

if command -v openssl >/dev/null 2>&1; then
  ENDE=$(echo | timeout 12 openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" 2>/dev/null \
         | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
  if [ -n "$ENDE" ]; then
    TAGE=$(( ( $(date -d "$ENDE" +%s) - $(date +%s) ) / 86400 ))
    if   [ "$TAGE" -lt 0 ];  then rot  "Zertifikat: seit $((-TAGE)) Tagen abgelaufen — certbot renew"
    elif [ "$TAGE" -lt 14 ]; then gelb "Zertifikat: nur noch $TAGE Tage gültig"
    else gruen "Zertifikat: noch $TAGE Tage gültig"; fi
  fi
fi

# ── Ab hier nur auf dem Server ─────────────────────────────────────────────
if [ "${1:-}" = "--extern" ] || [ ! -d /etc/nginx ]; then
  titel "Ergebnis"
  [ "$PROBLEME" -eq 0 ] && gruen "Von außen sieht alles gut aus." \
                        || rot "$PROBLEME Problem(e) von außen sichtbar."
  echo "Für die Serverseite denselben Befehl auf dem Server ausführen."
  exit 0
fi

titel "Auf dem Server"

systemctl is-active --quiet nginx && gruen "nginx: läuft" || rot "nginx: läuft NICHT — systemctl start nginx"

BELEGT=$(df -h / | awk 'NR==2{gsub("%","",$5); print $5}')
if   [ "$BELEGT" -ge 95 ]; then rot  "Platte: $BELEGT % belegt — nichts geht mehr. Alte Builds und Uploads wegräumen."
elif [ "$BELEGT" -ge 85 ]; then gelb "Platte: $BELEGT % belegt — wird eng."
else gruen "Platte: $BELEGT % belegt"; fi

if command -v pm2 >/dev/null 2>&1; then
  if pm2 jlist 2>/dev/null | grep -q '"name":"artisan-sole"'; then
    ST=$(pm2 jlist 2>/dev/null | python3 -c "
import sys,json
for p in json.load(sys.stdin):
    if p['name']=='artisan-sole':
        print(p['pm2_env']['status'], p['pm2_env'].get('restart_time',0))" 2>/dev/null)
    set -- $ST
    [ "${1:-}" = "online" ] && gruen "Backend: online (${2:-?} Neustarts)" || rot "Backend: ${1:-unbekannt} — pm2 restart artisan-sole"
  else
    rot "Backend: nicht in pm2 registriert"
  fi
fi

HEALTH=$(curl -s -o /dev/null -w '%{http_code}' --max-time 8 http://127.0.0.1:3001/api/health 2>/dev/null)
[ "$HEALTH" = "200" ] && gruen "Backend antwortet lokal (200)" || gelb "Backend lokal: $HEALTH (Port ggf. abweichend)"

# ── Einstellungen, die stille Fehler verursachen ───────────────────────────
DB=$(ls -1 "$HOME"/as/artisan-sole-backend/*.db "$HOME"/as/artisan-sole-backend/data/*.db 2>/dev/null | head -1)
if [ -n "$DB" ] && command -v sqlite3 >/dev/null 2>&1; then
  APPURL=$(sqlite3 "$DB" "SELECT value FROM settings WHERE key='app_url'" 2>/dev/null)
  SMTP=$(sqlite3 "$DB" "SELECT value FROM settings WHERE key='smtp_user'" 2>/dev/null)

  # app_url trägt doppelt: Einladungslinks in E-Mails und die Domainbindung
  # der Passkeys. Steht sie falsch, scheitert beides ohne sichtbare Meldung.
  case "$APPURL" in
    "https://$DOMAIN") gruen "app_url: $APPURL" ;;
    "")                rot  "app_url: nicht gesetzt — Einladungslinks führen ins Leere, Passkeys scheitern" ;;
    *localhost*)       rot  "app_url: $APPURL — zeigt auf localhost. Links in E-Mails sind für Empfänger wertlos, Passkeys scheitern." ;;
    *)                 gelb "app_url: $APPURL (erwartet https://$DOMAIN)" ;;
  esac
  [ -n "$SMTP" ] && gruen "SMTP: Benutzer hinterlegt ($SMTP)" \
                 || rot "SMTP: kein Benutzer — es geht keine einzige E-Mail hinaus"
fi

titel "Ergebnis"
if [ "$PROBLEME" -eq 0 ] && [ "$WARNUNGEN" -eq 0 ]; then
  gruen "Alles in Ordnung."
elif [ "$PROBLEME" -eq 0 ]; then
  gelb "$WARNUNGEN Hinweis(e), aber nichts Dringendes."
else
  rot "$PROBLEME Problem(e) gefunden — siehe die roten Zeilen oben."
fi

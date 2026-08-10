#!/usr/bin/env bash
#
# subdomain-einrichten.sh — eine weitere Domain auf dieselbe Anwendung zeigen.
#
#   sudo ./scripts/subdomain-einrichten.sh affiliate.artisansole.com
#
# Was es tut: Den Namen in die passenden server_name-Zeilen der bestehenden
# nginx-Konfiguration aufnehmen und ein Zertifikat dafür holen. Mehr braucht es
# nicht — business.artisansole.com und artisansole.com liefern dieselbe
# Anwendung aus, die Unterscheidung passiert im Browser am Hostnamen.
#
# Was es NICHT tut: den DNS-Eintrag setzen. Der liegt beim Registrar, und ohne
# ihn findet niemand den Server. Das Skript prüft ihn und bricht sonst ab —
# certbot würde ohnehin scheitern.
#
# Vor jeder Änderung wird die Konfiguration gesichert; bei einem Fehler in der
# Prüfung wird zurückgerollt, statt einen kaputten nginx zu hinterlassen.
set -euo pipefail

DOMAIN="${1:-}"
if [[ -z "$DOMAIN" ]]; then
  echo "Aufruf: sudo $0 <domain>" >&2
  echo "Beispiel: sudo $0 affiliate.artisansole.com" >&2
  exit 1
fi

[[ $EUID -eq 0 ]] || { echo "Bitte mit sudo ausführen." >&2; exit 1; }

echo "→ Domain: $DOMAIN"

# ── 1. Zeigt der Name schon hierher? ────────────────────────────────────────
# Ohne DNS-Eintrag hat der Rest keinen Zweck: certbot muss die Domain von außen
# erreichen können, um sie zu bestätigen.
SERVER_IP="$(curl -fsS --max-time 10 https://api.ipify.org || echo '')"
DOMAIN_IP="$(getent hosts "$DOMAIN" | awk '{print $1}' | head -1 || echo '')"

if [[ -z "$DOMAIN_IP" ]]; then
  cat >&2 <<EOF

✗ $DOMAIN ist im DNS nicht auffindbar.

  Beim Registrar (dort, wo artisansole.com verwaltet wird) anlegen:

      Typ:   CNAME
      Name:  ${DOMAIN%%.*}
      Wert:  artisansole.com.

  Oder, wenn CNAME dort nicht geht, ein A-Record auf ${SERVER_IP:-die Server-IP}.

  Die Änderung braucht ein paar Minuten. Prüfen mit:
      dig +short $DOMAIN

EOF
  exit 1
fi

echo "  DNS: $DOMAIN → $DOMAIN_IP"
if [[ -n "$SERVER_IP" && "$DOMAIN_IP" != "$SERVER_IP" ]]; then
  echo "  ⚠ Dieser Server hat $SERVER_IP. Zeigt die Domain woanders hin, schlägt certbot fehl."
  read -r -p "  Trotzdem fortfahren? [j/N] " weiter
  [[ "$weiter" == "j" ]] || exit 1
fi

# ── 2. Welche Konfiguration liefert die Anwendung aus? ───────────────────────
# Die Datei, in der artisansole.com steht — dort gehört der neue Name dazu.
CONF="$(grep -rl 'server_name.*artisansole\.com' /etc/nginx/sites-available/ 2>/dev/null | head -1 || true)"
if [[ -z "$CONF" ]]; then
  echo "✗ Keine nginx-Konfiguration mit artisansole.com in /etc/nginx/sites-available/ gefunden." >&2
  echo "  Vorhanden:" >&2
  ls -1 /etc/nginx/sites-available/ >&2
  exit 1
fi
echo "  Konfiguration: $CONF"

if grep -q "$DOMAIN" "$CONF"; then
  echo "  $DOMAIN steht bereits darin — nginx bleibt unverändert."
else
  SICHERUNG="${CONF}.vor-${DOMAIN}.$(date +%Y%m%d-%H%M%S)"
  cp "$CONF" "$SICHERUNG"
  echo "  Sicherung: $SICHERUNG"

  # An jede server_name-Zeile anhängen, die artisansole.com führt — der
  # HTTP-Block leitet auf HTTPS um, der HTTPS-Block liefert aus, beide brauchen
  # den Namen.
  sed -i -E "s/^(\s*server_name\s+[^;]*artisansole\.com[^;]*);/\1 ${DOMAIN};/" "$CONF"

  echo "  Neue server_name-Zeilen:"
  grep -nE '^\s*server_name' "$CONF" | sed 's/^/    /'

  if ! nginx -t; then
    echo "✗ nginx-Prüfung fehlgeschlagen — Sicherung wird zurückgespielt." >&2
    cp "$SICHERUNG" "$CONF"
    exit 1
  fi
  systemctl reload nginx
  echo "  nginx neu geladen."
fi

# ── 3. Zertifikat ───────────────────────────────────────────────────────────
# --expand nimmt die Domain in das bestehende Zertifikat auf, statt ein zweites
# anzulegen; --nginx trägt die Pfade selbst ein.
echo "→ Zertifikat anfordern…"
if certbot --nginx --expand -d "$DOMAIN" --non-interactive --agree-tos --keep-until-expiring; then
  echo "  Zertifikat steht."
else
  echo "✗ certbot ist gescheitert. Häufigste Ursache: Der DNS-Eintrag ist noch nicht überall" >&2
  echo "  bekannt. In ein paar Minuten erneut versuchen:" >&2
  echo "      sudo certbot --nginx --expand -d $DOMAIN" >&2
  exit 1
fi

systemctl reload nginx

echo
echo "✓ Fertig. Prüfen:"
echo "    curl -sSI https://$DOMAIN | head -1"
echo
echo "  Die Anwendung erkennt die Domain am Hostnamen und zeigt dort den"
echo "  Vermittlerbereich. Ein eigener nginx-Block ist nicht nötig."

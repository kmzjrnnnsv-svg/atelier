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
#
# Hier lag ein Fehler, der die Hauptseite lahmgelegt hat: `certbot --expand -d
# <nur der neue Name>` erweitert nicht das bestehende Zertifikat, sondern legt
# ein neues an, das ausschließlich diesen einen Namen führt — und `--nginx`
# trägt dessen Pfade in den Block ein, der auch artisansole.com ausliefert.
# Ergebnis: Zertifikat und Domain passen nicht mehr zusammen, der Browser
# schlägt Alarm.
#
# Richtig ist: das bestehende Zertifikat über --cert-name ansprechen und ALLE
# Namen des Blocks mitgeben. certbot ersetzt dann eins durch eins, statt ein
# zweites danebenzustellen.
echo "→ Zertifikat…"

# Alle Namen aus dem HTTPS-Block einsammeln, den wir gerade angefasst haben.
NAMEN="$(grep -hoE '^\s*server_name[^;]*' "$CONF" \
  | sed -E 's/^\s*server_name\s+//' | tr ' ' '\n' \
  | grep -E '^[a-z0-9.-]+\.[a-z]{2,}$' | sort -u)"

if [[ -z "$NAMEN" ]]; then
  echo "✗ Keine Domainnamen in $CONF gefunden." >&2
  exit 1
fi
echo "  Abzudecken: $(echo "$NAMEN" | tr '\n' ' ')"

# Welches Zertifikat deckt heute die Hauptdomain ab? Dessen Namen behalten wir
# bei, damit die Erneuerung weiterläuft und keine Karteileiche entsteht.
CERT_NAME="$(certbot certificates 2>/dev/null \
  | awk -v d="$DOMAIN" '
      /Certificate Name:/ { name=$3 }
      /Domains:/ { if ($0 ~ /artisansole\.com/ && name != "") { print name; exit } }
    ')"

D_ARGS=()
while read -r n; do [[ -n "$n" ]] && D_ARGS+=(-d "$n"); done <<< "$NAMEN"

if [[ -n "$CERT_NAME" ]]; then
  echo "  Bestehendes Zertifikat: $CERT_NAME (wird erweitert)"
  CERT_ARGS=(--cert-name "$CERT_NAME")
else
  echo "  Kein passendes Zertifikat gefunden — es wird eins angelegt."
  CERT_ARGS=()
fi

if ! certbot --nginx --expand "${CERT_ARGS[@]}" "${D_ARGS[@]}" \
     --non-interactive --agree-tos --keep-until-expiring; then
  cat >&2 <<EOF
✗ certbot ist gescheitert. Die Seite läuft weiter mit dem alten Zertifikat.

  Häufigste Ursache: Der DNS-Eintrag ist noch nicht überall bekannt.
  In ein paar Minuten von Hand nachholen:

      sudo certbot --nginx --expand ${CERT_NAME:+--cert-name $CERT_NAME} $(echo "$NAMEN" | sed 's/^/-d /' | tr '\n' ' ')

  Kam die Warnung „Verbindung ist nicht privat" schon vorher: Sicherung
  zurückspielen und erneut versuchen —
      sudo cp ${SICHERUNG:-<sicherung>} $CONF && sudo nginx -t && sudo systemctl reload nginx
EOF
  exit 1
fi
echo "  Zertifikat deckt jetzt alle Namen ab."

# Gegenprobe: Deckt das ausgelieferte Zertifikat wirklich jeden Namen? Ohne die
# Prüfung fällt eine Lücke erst dem Besucher auf.
echo "→ Gegenprobe…"
FEHLT=""
while read -r n; do
  [[ -z "$n" ]] && continue
  if echo | openssl s_client -servername "$n" -connect 127.0.0.1:443 2>/dev/null \
     | openssl x509 -noout -checkhost "$n" 2>/dev/null | grep -q 'does match'; then
    echo "  ✓ $n"
  else
    echo "  ✗ $n — Zertifikat passt nicht"
    FEHLT="$FEHLT $n"
  fi
done <<< "$NAMEN"

if [[ -n "$FEHLT" ]]; then
  echo >&2
  echo "✗ Für diese Namen passt das Zertifikat nicht:$FEHLT" >&2
  echo "  Besucher sehen dort eine Sicherheitswarnung. Bitte melden." >&2
  exit 1
fi

systemctl reload nginx

echo
echo "✓ Fertig. Prüfen:"
echo "    curl -sSI https://$DOMAIN | head -1"
echo
echo "  Die Anwendung erkennt die Domain am Hostnamen und zeigt dort den"
echo "  Vermittlerbereich. Ein eigener nginx-Block ist nicht nötig."

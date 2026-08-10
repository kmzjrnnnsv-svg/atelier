#!/usr/bin/env bash
#
# tls-pruefen.sh — deckt das Zertifikat wirklich jede ausgelieferte Domain ab?
#
#   sudo ./scripts/tls-pruefen.sh                # nur prüfen
#   sudo ./scripts/tls-pruefen.sh --reparieren   # prüfen und in Ordnung bringen
#
# Warum es das gibt: Ein Zertifikat, das eine Domain nicht abdeckt, sieht auf
# dem Server nach nichts aus — nginx läuft, die Seite antwortet, die Logs sind
# still. Erst der Besucher bekommt „Diese Verbindung ist nicht privat" zu sehen
# und ist weg. Genau das ist beim Einrichten von affiliate.artisansole.com
# passiert: certbot legte ein Zertifikat für den einen neuen Namen an, und die
# Hauptdomain wurde damit ausgeliefert.
#
# Das Skript nimmt jeden Namen, den nginx bedient, baut eine echte
# TLS-Verbindung dorthin auf und vergleicht, was zurückkommt. Es rät nicht
# anhand von Konfigurationsdateien — es sieht nach.
#
# Gedacht für den Aufruf per cron (täglich) und aus deploy.sh heraus. Der
# Exit-Code ist die Aussage: 0 heißt, alle Namen sind sauber.
set -uo pipefail

REPARIEREN=0
[[ "${1:-}" == "--reparieren" ]] && REPARIEREN=1

[[ $EUID -eq 0 ]] || { echo "Bitte mit sudo ausführen." >&2; exit 2; }

# ── Welche Namen liefert nginx aus? ─────────────────────────────────────────
# Aus der laufenden Konfiguration, nicht aus einer Datei: `nginx -T` gibt aus,
# was tatsächlich geladen ist, samt aller eingebundenen Dateien.
mapfile -t NAMEN < <(
  nginx -T 2>/dev/null \
    | grep -E '^\s*server_name\s' \
    | sed -E 's/^\s*server_name\s+//; s/;.*$//' \
    | tr ' ' '\n' \
    | grep -E '^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$' \
    | sort -u
)

if [[ ${#NAMEN[@]} -eq 0 ]]; then
  echo "✗ Keine Domainnamen in der nginx-Konfiguration gefunden." >&2
  exit 2
fi

echo "→ ${#NAMEN[@]} Name(n) aus der laufenden nginx-Konfiguration:"
printf '    %s\n' "${NAMEN[@]}"
echo

# ── Was liefert der Server für jeden Namen wirklich aus? ────────────────────
# Über 127.0.0.1 mit gesetztem SNI: So wird auch dann geprüft, wenn der Name
# von außen (noch) nicht auflöst — es geht um das Zertifikat, nicht um DNS.
fehlerhaft=()
for n in "${NAMEN[@]}"; do
  cert="$(echo | timeout 10 openssl s_client -servername "$n" -connect 127.0.0.1:443 2>/dev/null)"
  if [[ -z "$cert" ]]; then
    echo "  ? $n — keine TLS-Antwort (läuft nginx auf 443?)"
    fehlerhaft+=("$n")
    continue
  fi

  if echo "$cert" | openssl x509 -noout -checkhost "$n" 2>/dev/null | grep -q 'does match'; then
    # Zusätzlich die Restlaufzeit: Ein gültiges, aber morgen ablaufendes
    # Zertifikat ist derselbe Ausfall, nur später.
    rest="$(echo "$cert" | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)"
    tage=$(( ( $(date -d "$rest" +%s 2>/dev/null || echo 0) - $(date +%s) ) / 86400 ))
    if (( tage < 14 )); then
      echo "  ⚠ $n — gültig, läuft aber in $tage Tagen ab"
      fehlerhaft+=("$n")
    else
      echo "  ✓ $n — gültig, noch $tage Tage"
    fi
  else
    ausgestellt="$(echo "$cert" | openssl x509 -noout -subject 2>/dev/null | sed 's/^subject=//')"
    echo "  ✗ $n — Zertifikat passt NICHT (ausgestellt auf:${ausgestellt:- unbekannt})"
    fehlerhaft+=("$n")
  fi
done

echo
if [[ ${#fehlerhaft[@]} -eq 0 ]]; then
  echo "✓ Alle Namen sauber."
  exit 0
fi

echo "✗ ${#fehlerhaft[@]} Name(n) betroffen: ${fehlerhaft[*]}"
echo "  Besucher sehen dort eine Sicherheitswarnung."
echo

if [[ $REPARIEREN -eq 0 ]]; then
  cat <<EOF
  Zum Beheben:
      sudo $0 --reparieren

  Das fordert ein Zertifikat an, das alle oben genannten Namen zusammen
  abdeckt — statt für jeden Namen ein eigenes, was genau zu diesem Zustand
  führt.
EOF
  exit 1
fi

# ── Reparatur ───────────────────────────────────────────────────────────────
# Ein Zertifikat für alle Namen. Der entscheidende Punkt: --cert-name auf das
# bestehende Zertifikat setzen und ALLE Namen mitgeben. Ohne beides legt
# certbot ein zusätzliches an und trägt dessen Pfade in einen Block ein, der
# mehr Namen bedient, als das neue Zertifikat kennt.
echo "→ Reparatur: ein Zertifikat für alle Namen"

CERT_NAME="$(certbot certificates 2>/dev/null | awk '/Certificate Name:/ { print $3; exit }')"
D_ARGS=()
for n in "${NAMEN[@]}"; do D_ARGS+=(-d "$n"); done

if [[ -n "$CERT_NAME" ]]; then
  echo "  Bestehendes Zertifikat: $CERT_NAME"
  set -- --cert-name "$CERT_NAME"
else
  echo "  Kein bestehendes Zertifikat — es wird eins angelegt."
  set --
fi

if ! certbot --nginx --expand "$@" "${D_ARGS[@]}" \
     --non-interactive --agree-tos --keep-until-expiring; then
  cat >&2 <<EOF

✗ certbot ist gescheitert.

  Häufigste Ursachen:
    • Ein Name in der Liste löst nicht auf diesen Server auf. Prüfen:
          for n in ${NAMEN[*]}; do echo -n "\$n → "; dig +short \$n; done
      Namen, die woanders hinzeigen, gehören aus der nginx-Konfiguration
      heraus — certbot kann sie nicht bestätigen.
    • Das Let's-Encrypt-Limit ist erreicht (5 gleiche Anfragen pro Woche).
      Dann hilft nur warten.
EOF
  exit 2
fi

systemctl reload nginx
echo "  nginx neu geladen."
echo

# Gegenprobe — ohne sie wäre „repariert" nur eine Behauptung.
echo "→ Gegenprobe:"
exec "$0"

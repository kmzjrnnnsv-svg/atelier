#!/bin/bash
# =============================================================================
# server-haerten.sh — die zwei Dinge, die nur auf dem Server selbst gehen.
#
# Beides stand lange auf der Liste und blieb liegen, weil es eine Handvoll
# Befehle war, die man sich zusammensuchen musste. Jetzt ist es einer.
#
#   1. Neustart-Festigkeit. Ohne `pm2 startup` + `pm2 save` käme die
#      Anwendung nach einem Reboot des Servers nicht von allein hoch — der
#      Shop wäre weg, und niemand bekäme eine Meldung. Ein Server startet
#      irgendwann neu, ob geplant oder nicht.
#
#   2. Das Webhook-Secret. Es hat einmal im Repository gestanden. Was dort
#      war, gilt als bekannt: Wer es hat, kann Auslieferungen auslösen. Ein
#      neues zu erzeugen ist billig, es nicht zu tun kann teuer werden.
#
# Aufruf auf dem Server:
#     bash ~/as/scripts/server-haerten.sh
#
# Nichts davon ist zerstörend. Das alte Secret wird vor dem Überschreiben
# gesichert, und pm2 ändert nur, was beim Systemstart passiert.
# =============================================================================

set -e

ENV_DATEI="/etc/atelier/webhook.env"
blau() { printf '\n\033[1m%s\033[0m\n' "$1"; }

blau "1/2  Neustart-Festigkeit"

if ! command -v pm2 >/dev/null 2>&1; then
  echo "     pm2 ist nicht installiert — übersprungen."
  echo "     (Läuft die Anwendung über systemd, ist dieser Schritt nicht nötig.)"
else
  # `pm2 startup` gibt einen Befehl AUS, den man ausführen muss — es tut selbst
  # nichts. Genau daran scheitert der Schritt sonst: Man ruft ihn auf, sieht
  # Ausgabe, hält ihn für erledigt, und nach dem nächsten Reboot ist der Shop
  # offline. Deshalb wird die Zeile hier gleich ausgeführt.
  BEFEHL=$(pm2 startup systemd -u "$(whoami)" --hp "$HOME" 2>/dev/null | grep -E '^sudo ' || true)
  if [ -n "$BEFEHL" ]; then
    echo "     Richte den Systemdienst ein …"
    eval "$BEFEHL"
  else
    echo "     Systemdienst besteht bereits."
  fi
  pm2 save
  echo "     Gespeichert. Die laufenden Prozesse kommen nach einem Neustart wieder."
fi

blau "2/2  Webhook-Secret erneuern"

if [ ! -f "$ENV_DATEI" ]; then
  echo "     $ENV_DATEI gibt es nicht — lege sie an."
  install -d -m 700 "$(dirname "$ENV_DATEI")"
  install -m 600 /dev/null "$ENV_DATEI"
else
  SICHERUNG="${ENV_DATEI}.$(date +%Y%m%d-%H%M%S).bak"
  cp -p "$ENV_DATEI" "$SICHERUNG"
  chmod 600 "$SICHERUNG"
  echo "     Alter Stand gesichert: $SICHERUNG"
fi

NEU=$(openssl rand -hex 32)
printf 'WEBHOOK_SECRET=%s\n' "$NEU" > "$ENV_DATEI"
chmod 600 "$ENV_DATEI"

if systemctl is-active --quiet atelier-webhook 2>/dev/null; then
  systemctl restart atelier-webhook
  echo "     Dienst neu gestartet."
else
  echo "     Dienst läuft nicht — nach dem Eintragen bei GitHub starten mit:"
  echo "       systemctl restart atelier-webhook"
fi

cat <<HINWEIS

────────────────────────────────────────────────────────────────────────
  Jetzt bei GitHub eintragen — bis dahin werden Aufrufe abgewiesen.

  Repository › Settings › Webhooks › den Eintrag öffnen ›
  Secret ersetzen durch:

      $NEU

  Das ist Absicht: Der Empfänger weist alles ab, was nicht mit dem
  aktuellen Secret unterschrieben ist. Lieber keine Auslieferung als
  eine, die jeder auslösen kann.
────────────────────────────────────────────────────────────────────────

HINWEIS

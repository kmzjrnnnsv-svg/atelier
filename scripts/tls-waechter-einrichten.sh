#!/usr/bin/env bash
#
# tls-waechter-einrichten.sh — täglich nachsehen, ob die Zertifikate passen.
#
#   sudo ./scripts/tls-waechter-einrichten.sh
#
# Einmal ausführen, danach läuft es von selbst. Legt einen systemd-Timer an,
# der tls-pruefen.sh jeden Morgen aufruft. Ist etwas nicht in Ordnung, steht es
# im Journal und der Dienst gilt als fehlgeschlagen — sichtbar in
# `systemctl --failed`, statt in einer Logdatei zu versanden, die niemand liest.
#
# Bewusst nur prüfen, nicht reparieren: Ein Skript, das nachts unbeaufsichtigt
# Zertifikate neu ausstellt, kann bei einem DNS-Fehler in das Wochenlimit von
# Let's Encrypt laufen und die Lage verschlimmern. Die Reparatur bleibt ein
# bewusster Handgriff.
set -euo pipefail

[[ $EUID -eq 0 ]] || { echo "Bitte mit sudo ausführen." >&2; exit 1; }

SKRIPT="$(cd "$(dirname "$0")" && pwd)/tls-pruefen.sh"
[[ -x "$SKRIPT" ]] || { echo "✗ $SKRIPT nicht gefunden oder nicht ausführbar." >&2; exit 1; }

cat > /etc/systemd/system/tls-pruefen.service <<EOF
[Unit]
Description=Prüft, ob das TLS-Zertifikat alle ausgelieferten Domains abdeckt
After=network-online.target

[Service]
Type=oneshot
ExecStart=$SKRIPT
EOF

cat > /etc/systemd/system/tls-pruefen.timer <<'EOF'
[Unit]
Description=Tägliche TLS-Prüfung

[Timer]
# Morgens, mit etwas Streuung — nicht zur vollen Stunde, wenn ohnehin alles läuft.
OnCalendar=*-*-* 07:20:00
RandomizedDelaySec=20m
Persistent=true

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable --now tls-pruefen.timer

echo "✓ Wächter aktiv."
echo
echo "  Nächster Lauf:   systemctl list-timers tls-pruefen.timer"
echo "  Letztes Ergebnis: journalctl -u tls-pruefen.service -n 40"
echo "  Sofort prüfen:    sudo systemctl start tls-pruefen.service"
echo
echo "  Meldet der Dienst einen Fehler, beheben mit:"
echo "      sudo $SKRIPT --reparieren"

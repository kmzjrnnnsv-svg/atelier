#!/bin/bash
# =============================================================================
# Hetzner VPS Setup Script für Atelier
#
# Dieses Script als root auf einem frischen Ubuntu 24.04 Server ausführen:
#   ssh root@DEINE_IP
#   bash <(curl -sSL https://raw.githubusercontent.com/DEIN_REPO/main/hetzner-setup.sh)
#
# Oder: Datei auf den Server kopieren und ausführen:
#   scp hetzner-setup.sh root@DEINE_IP:~
#   ssh root@DEINE_IP 'bash ~/hetzner-setup.sh'
# =============================================================================

set -euo pipefail

# ── Konfiguration ──────────────────────────────────────────────────────────
APP_USER="nrply"
APP_DIR="/home/$APP_USER/atelier"
REPO_URL="https://github.com/DEIN_USERNAME/atelier.git"  # ← ANPASSEN!
NODE_VERSION=22
PYTHON_VERSION="3.12"

echo "============================================="
echo "  Atelier — Hetzner Server Setup"
echo "============================================="
echo ""

# ── 1. System updaten ──────────────────────────────────────────────────────
echo "→ System updaten..."
apt update && apt upgrade -y

# ── 2. Grundlegende Pakete ─────────────────────────────────────────────────
echo "→ Grundpakete installieren..."
apt install -y \
  curl wget git unzip htop ufw fail2ban \
  build-essential python3 python3-pip python3-venv \
  sqlite3 nginx certbot python3-certbot-nginx

# ── 3. User 'nrply' erstellen (ohne Passwort, SSH-Login) ──────────────────
echo "→ User '$APP_USER' erstellen..."
if id "$APP_USER" &>/dev/null; then
  echo "  User '$APP_USER' existiert bereits"
else
  adduser --disabled-password --gecos "" "$APP_USER"
  echo "  User '$APP_USER' erstellt (kein Passwort)"
fi

# SSH Key von root kopieren, damit du dich als nrply einloggen kannst
mkdir -p /home/$APP_USER/.ssh
cp /root/.ssh/authorized_keys /home/$APP_USER/.ssh/authorized_keys
chown -R $APP_USER:$APP_USER /home/$APP_USER/.ssh
chmod 700 /home/$APP_USER/.ssh
chmod 600 /home/$APP_USER/.ssh/authorized_keys
echo "  SSH Key kopiert → 'ssh $APP_USER@SERVER_IP' funktioniert"

# sudo-Rechte geben
usermod -aG sudo "$APP_USER"
# sudo ohne Passwort erlauben (da kein Passwort gesetzt)
echo "$APP_USER ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/$APP_USER
chmod 440 /etc/sudoers.d/$APP_USER
echo "  sudo-Rechte vergeben (ohne Passwort)"

# ── 4. Node.js installieren ───────────────────────────────────────────────
echo "→ Node.js $NODE_VERSION installieren..."
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
apt install -y nodejs
echo "  Node.js $(node -v) + npm $(npm -v)"

# ── 5. PM2 (Prozess-Manager) ──────────────────────────────────────────────
echo "→ PM2 installieren..."
npm install -g pm2
pm2 startup systemd -u $APP_USER --hp /home/$APP_USER
echo "  PM2 installiert + Autostart konfiguriert"

# ── 6. Python ML-Umgebung ─────────────────────────────────────────────────
echo "→ Python ML-Umgebung vorbereiten..."
sudo -u $APP_USER bash -c "
  python3 -m venv /home/$APP_USER/ml-venv
  source /home/$APP_USER/ml-venv/bin/activate
  pip install --upgrade pip
  pip install numpy scipy scikit-learn torch torchvision opencv-python-headless pillow
"
echo "  Python venv + ML-Pakete installiert"

# ── 7. Repo klonen ────────────────────────────────────────────────────────
echo "→ Repository klonen..."
if [ -d "$APP_DIR" ]; then
  echo "  $APP_DIR existiert bereits — überspringe"
else
  sudo -u $APP_USER git clone "$REPO_URL" "$APP_DIR"
  echo "  Repo geklont nach $APP_DIR"
fi

# ── 8. Backend einrichten ─────────────────────────────────────────────────
echo "→ Backend einrichten..."
sudo -u $APP_USER bash -c "
  cd $APP_DIR/atelier-backend
  npm install
"
echo "  npm install abgeschlossen"

# ── 9. .env Datei erstellen ───────────────────────────────────────────────
ENV_FILE="$APP_DIR/atelier-backend/.env"
if [ ! -f "$ENV_FILE" ]; then
  # Zufällige Secrets generieren
  ACCESS_SECRET=$(openssl rand -hex 32)
  REFRESH_SECRET=$(openssl rand -hex 32)

  sudo -u $APP_USER bash -c "cat > $ENV_FILE" <<EOF
NODE_ENV=production
PORT=3001
DB_PATH=/home/$APP_USER/atelier-data/atelier.db

JWT_ACCESS_SECRET=$ACCESS_SECRET
JWT_REFRESH_SECRET=$REFRESH_SECRET

# Mail-Einstellungen (später anpassen)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=deine@email.com
# SMTP_PASS=app-password

# Anthropic API Key (für Übersetzungen)
# ANTHROPIC_API_KEY=sk-ant-...

FRONTEND_URL=https://raza.work
EOF
  echo "  .env erstellt mit generierten Secrets"
  echo "  ⚠️  BITTE ANPASSEN: $ENV_FILE"
else
  echo "  .env existiert bereits"
fi

# Daten-Verzeichnis erstellen
sudo -u $APP_USER mkdir -p /home/$APP_USER/atelier-data
echo "  Daten-Verzeichnis erstellt"

# ── 10. PM2 Prozess starten ───────────────────────────────────────────────
echo "→ Backend mit PM2 starten..."
sudo -u $APP_USER bash -c "
  cd $APP_DIR/atelier-backend
  pm2 start src/index.js --name atelier -- --env production
  pm2 save
"
echo "  Backend läuft auf Port 3001"

# ── 11. Firewall einrichten ───────────────────────────────────────────────
echo "→ Firewall konfigurieren..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
echo "  Firewall aktiv (SSH + HTTP + HTTPS)"

# ── 12. Nginx Reverse Proxy ───────────────────────────────────────────────
echo "→ Nginx konfigurieren..."
cat > /etc/nginx/sites-available/atelier <<'NGINX'
# HTTP → HTTPS Redirect
server {
    listen 80;
    server_name raza.work www.raza.work;
    return 301 https://$host$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name raza.work www.raza.work;

    # SSL-Zertifikate (werden von Certbot verwaltet)
    ssl_certificate /etc/letsencrypt/live/raza.work/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/raza.work/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Frontend (statische Dateien aus Vite Build)
    root /home/nrply/atelier/atelier-app/dist;
    index index.html;

    # API Backend
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Größere Uploads erlauben (für Scan-Fotos)
        client_max_body_size 50M;
    }

    # Health Check
    location /health {
        proxy_pass http://127.0.0.1:3001/api/health;
    }

    # SPA Fallback — alle anderen Routen an index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/atelier /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
echo "  Nginx Reverse Proxy aktiv"

# ── 12b. Frontend bauen ──────────────────────────────────────────────────
echo "→ Frontend bauen..."
sudo -u $APP_USER bash -c "
  cd $APP_DIR/atelier-app
  npm install
  npm run build
"
echo "  Frontend gebaut → $APP_DIR/atelier-app/dist"

# ── 12c. SSL-Zertifikat mit Certbot ─────────────────────────────────────
echo "→ SSL-Zertifikat einrichten..."
echo "  ⚠️  Certbot benötigt eine konfigurierte Domain."
echo "  Falls die Domain noch nicht auf diesen Server zeigt,"
echo "  führe folgenden Befehl manuell aus, sobald DNS konfiguriert ist:"
echo "    certbot --nginx -d raza.work -d www.raza.work --non-interactive --agree-tos -m admin@raza.work"
echo ""
echo "  Versuche Certbot jetzt automatisch..."

# Temporäre HTTP-only Nginx Config für Certbot Challenge
cat > /etc/nginx/sites-available/atelier-certbot <<'CERTBOT_NGINX'
server {
    listen 80;
    server_name raza.work www.raza.work;
    root /var/www/html;
    location /.well-known/acme-challenge/ { allow all; }
    location / { return 301 https://$host$request_uri; }
}
CERTBOT_NGINX
ln -sf /etc/nginx/sites-available/atelier-certbot /etc/nginx/sites-enabled/atelier
nginx -t && systemctl reload nginx

certbot --nginx -d raza.work -d www.raza.work --non-interactive --agree-tos -m admin@raza.work || {
  echo "  ⚠️  Certbot fehlgeschlagen — DNS muss auf $SERVER_IP zeigen."
  echo "  Manuell nachholen: certbot --nginx -d raza.work -d www.raza.work"
}

# Richtige Nginx Config wiederherstellen
ln -sf /etc/nginx/sites-available/atelier /etc/nginx/sites-enabled/atelier
nginx -t && systemctl reload nginx
echo "  SSL-Konfiguration abgeschlossen"

# ── 13. Auto-Deploy Webhook ───────────────────────────────────────────────
echo "→ Auto-Deploy Script erstellen..."
DEPLOY_SCRIPT="/home/$APP_USER/deploy.sh"
sudo -u $APP_USER cat > "$DEPLOY_SCRIPT" <<'DEPLOY'
#!/bin/bash
set -e
APP_DIR="$HOME/atelier"
LOG="$HOME/deploy.log"

echo "$(date) — Deploy gestartet" >> "$LOG"
cd "$APP_DIR"
git pull origin main >> "$LOG" 2>&1
cd "$APP_DIR/atelier-app"
npm install >> "$LOG" 2>&1
npm run build >> "$LOG" 2>&1
cd "$APP_DIR/atelier-backend"
npm install >> "$LOG" 2>&1
pm2 restart atelier >> "$LOG" 2>&1
echo "$(date) — Deploy abgeschlossen" >> "$LOG"
DEPLOY
chmod +x "$DEPLOY_SCRIPT"
echo "  Deploy-Script erstellt: $DEPLOY_SCRIPT"

# ── 14. Fail2Ban (Schutz gegen Brute-Force) ───────────────────────────────
echo "→ Fail2Ban konfigurieren..."
systemctl enable fail2ban
systemctl start fail2ban
echo "  Fail2Ban aktiv"

# ── Fertig! ────────────────────────────────────────────────────────────────
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo "DEINE_IP")

echo ""
echo "============================================="
echo "  ✅ Setup abgeschlossen!"
echo "============================================="
echo ""
echo "  Server:     http://$SERVER_IP"
echo "  API:        http://$SERVER_IP/api/health"
echo "  User:       $APP_USER (SSH: ssh $APP_USER@$SERVER_IP)"
echo "  Backend:    pm2 status / pm2 logs atelier"
echo "  Deploy:     /home/$APP_USER/deploy.sh"
echo "  Daten:      /home/$APP_USER/atelier-data/"
echo "  Logs:       /home/$APP_USER/deploy.log"
echo ""
echo "  Nächste Schritte:"
echo "  1. REPO_URL in diesem Script anpassen und erneut laufen lassen"
echo "  2. .env anpassen: $ENV_FILE"
echo "  3. DNS A-Record für raza.work → $SERVER_IP setzen"
echo "  4. Falls Certbot fehlgeschlagen: certbot --nginx -d raza.work -d www.raza.work"
echo "  5. GitHub Webhook einrichten für Auto-Deploy"
echo ""

#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# setup-vps.sh  — Instalación inicial del backend Debuta en Hostinger VPS
# Ejecutar UNA SOLA VEZ como root en el servidor:
#   chmod +x setup-vps.sh && sudo bash setup-vps.sh
# ─────────────────────────────────────────────────────────────────────────────
set -e

DOMAIN="debuta.online"
APP_USER="debuta"
APP_DIR="/var/www/debuta"
LOG_DIR="/var/log/debuta"
NODE_VERSION="20"
REPO_URL="https://github.com/desarrolladorandres2026-gif/TU_REPO.git"

echo "────────────────────────────────────────────"
echo " Debuta Backend — Setup inicial del VPS"
echo " Usuario: $APP_USER | Dir: $APP_DIR"
echo "────────────────────────────────────────────"

# ── 1. Actualizar sistema ────────────────────────────────────────────────────
echo "[1/9] Actualizando paquetes..."
apt-get update -y && apt-get upgrade -y

# ── 2. Dependencias del sistema (requeridas por canvas y face-api.js) ────────
echo "[2/9] Instalando dependencias del sistema..."
apt-get install -y \
  curl git nginx certbot python3-certbot-nginx \
  build-essential \
  libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev \
  libpixman-1-dev pkg-config

# ── 3. Node.js ───────────────────────────────────────────────────────────────
echo "[3/9] Instalando Node.js ${NODE_VERSION}..."
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
  apt-get install -y nodejs
fi
echo "   Node: $(node -v) | npm: $(npm -v)"

# ── 4. PM2 (gestor de procesos) ──────────────────────────────────────────────
echo "[4/9] Instalando PM2..."
npm install -g pm2

# ── 5. Crear estructura de directorios con permisos para el usuario ──────────
echo "[5/9] Creando directorios..."
mkdir -p "$APP_DIR" "$LOG_DIR"
chown -R "$APP_USER:$APP_USER" "$APP_DIR" "$LOG_DIR"

# ── 6. Clonar repositorio como el usuario debuta ────────────────────────────
echo "[6/9] Clonando repositorio..."
if [ ! -d "$APP_DIR/.git" ]; then
  sudo -u "$APP_USER" git clone "$REPO_URL" "$APP_DIR"
else
  echo "   Repositorio ya existe, omitiendo clone."
  sudo -u "$APP_USER" git -C "$APP_DIR" pull origin main
fi

# ── 7. Instalar dependencias de Node ────────────────────────────────────────
echo "[7/9] Instalando dependencias npm..."
sudo -u "$APP_USER" bash -c "cd $APP_DIR/backend && npm ci --omit=dev"

# Descargar modelos de face-api.js si no existen
if [ ! -d "$APP_DIR/backend/models/face-api" ]; then
  echo "   Descargando modelos de reconocimiento facial..."
  sudo -u "$APP_USER" bash -c "cd $APP_DIR/backend && node scripts/download-face-models.js"
fi

# Instalar dependencias del apk-server
sudo -u "$APP_USER" bash -c "cd $APP_DIR/apk-server && npm ci --omit=dev"
sudo -u "$APP_USER" mkdir -p "$APP_DIR/apk-server/apks"

# ── 8. Configurar Nginx ──────────────────────────────────────────────────────
echo "[8/9] Configurando Nginx..."
cp "$APP_DIR/backend/nginx.conf" "/etc/nginx/sites-available/debuta"
ln -sf /etc/nginx/sites-available/debuta /etc/nginx/sites-enabled/debuta
rm -f /etc/nginx/sites-enabled/default

nginx -t && systemctl reload nginx

# ── 9. Certificado SSL con Let's Encrypt ─────────────────────────────────────
echo "[9/9] Configurando SSL con Let's Encrypt..."
certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos \
  --email "desarrolladorandres2026@gmail.com" --redirect || \
  echo "   AVISO: Certbot falló. Ejecuta manualmente: certbot --nginx -d $DOMAIN"

# ── PM2 startup (arranque automático al reiniciar el VPS) ───────────────────
echo "Configurando PM2 startup para el usuario $APP_USER..."
sudo -u "$APP_USER" bash -c "pm2 startup systemd -u $APP_USER --hp /home/$APP_USER" | tail -1 | bash || true

echo ""
echo "Setup completo."
echo ""
echo "Proximos pasos:"
echo "  1. Sube el .env al VPS (desde tu PC local):"
echo "       scp backend/.env $APP_USER@TU_IP_VPS:$APP_DIR/backend/.env"
echo "  2. Inicia ambos procesos con PM2 (en el VPS como usuario debuta):"
echo "       su - $APP_USER"
echo "       cd $APP_DIR/backend && pm2 start ecosystem.config.js --env production"
echo "       pm2 save"
echo "  3. (Cuando tengas el APK) Subelo con:"
echo "       scp tu-app.apk $APP_USER@TU_IP_VPS:$APP_DIR/apk-server/apks/"
echo "  4. Verifica:"
echo "       https://debuta.online        → API backend"
echo "       https://debuta.online/apk    → Pagina de descarga APK"
echo ""

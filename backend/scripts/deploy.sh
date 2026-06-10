#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy.sh  — Actualizar el backend en el VPS después de cada push
# Ejecutar desde tu máquina local:
#   bash backend/scripts/deploy.sh
#
# O configurar en GitHub Actions / CI para ejecución automática.
# ─────────────────────────────────────────────────────────────────────────────
set -e

VPS_USER="root"
VPS_IP="TU_IP_VPS"
APP_DIR="/var/www/debuta"

echo "🚀 Iniciando despliegue en $VPS_IP..."

ssh "${VPS_USER}@${VPS_IP}" bash << 'REMOTE'
  set -e
  APP_DIR="/var/www/debuta"

  echo "📦 Actualizando código..."
  cd "$APP_DIR"
  git pull origin main

  echo "📦 Actualizando dependencias..."
  cd backend
  npm ci --omit=dev

  echo "🔄 Recargando PM2 sin tiempo de inactividad..."
  pm2 reload ecosystem.config.js --env production --update-env

  echo "✅ Despliegue completado."
  pm2 status debuta-backend
REMOTE

echo ""
echo "✅ Deploy finalizado correctamente."

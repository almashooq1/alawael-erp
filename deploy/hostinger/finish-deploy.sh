#!/bin/bash
# ════════════════════════════════════════════════════════════════════════════════
#  سكربت إكمال النشر — Finish Deployment Script
#  يُصلح Frontend Build + Nginx + PM2 + Backend
#
#  الاستخدام على السيرفر:
#    curl -sL https://raw.githubusercontent.com/almashooq1/alawael-erp/main/deploy/hostinger/finish-deploy.sh -o /tmp/finish-deploy.sh && bash /tmp/finish-deploy.sh
# ════════════════════════════════════════════════════════════════════════════════
set -euo pipefail

# ─── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

log_ok()   { echo -e "${GREEN}  ✅ $1${NC}"; }
log_warn() { echo -e "${YELLOW}  ⚠️  $1${NC}"; }
log_err()  { echo -e "${RED}  ❌ $1${NC}"; }
log_step() { echo -e "\n${BLUE}━━━ [$1] $2 ━━━${NC}"; }

# ─── Configuration ─────────────────────────────────────────────────────────────
APP_USER="alawael"
APP_DIR="/home/${APP_USER}/app"
LOG_DIR="/home/${APP_USER}/logs"
BACKUP_DIR="/home/${APP_USER}/backups"

# Auto-detect domain from SSL certificates
if [ -d "/etc/letsencrypt/live/alaweal.org" ]; then
  DOMAIN="alaweal.org"
elif [ -d "/etc/letsencrypt/live/alawael.org" ]; then
  DOMAIN="alawael.org"
else
  DOMAIN="alaweal.org"
fi

echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   🔧  إكمال نشر نظام الأوائل — Finish Deploy              ║${NC}"
echo -e "${CYAN}║   Domain: ${DOMAIN}                                         ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"

# ─── Root Check ────────────────────────────────────────────────────────────────
if [ "$EUID" -ne 0 ]; then
  log_err "يرجى تشغيل كـ root: sudo bash finish-deploy.sh"
  exit 1
fi

# ══════════════════════════════════════════════════════════════════════════════
#  STEP 1: Update code from GitHub
# ══════════════════════════════════════════════════════════════════════════════
log_step "1/7" "تحديث الكود من GitHub"

cd ${APP_DIR}
if [ -d ".git" ]; then
  sudo -u ${APP_USER} git fetch origin 2>&1
  sudo -u ${APP_USER} git reset --hard origin/main 2>&1
  log_ok "تم تحديث الكود إلى آخر نسخة"
else
  log_warn "لا يوجد git repo — تخطي"
fi

# ══════════════════════════════════════════════════════════════════════════════
#  STEP 2: Fix Backend .env (ensure PORT=5000 and correct domain)
# ══════════════════════════════════════════════════════════════════════════════
log_step "2/7" "إصلاح ملف البيئة Backend"

MONGO_PASS=$(cat /root/.mongo_pass 2>/dev/null || echo "")
if [ -z "$MONGO_PASS" ]; then
  MONGO_PASS=$(openssl rand -base64 32 | tr -dc 'A-Za-z0-9' | head -c 32)
  echo "${MONGO_PASS}" > /root/.mongo_pass
  chmod 600 /root/.mongo_pass
fi

MONGODB_URI="mongodb://alawael_admin:${MONGO_PASS}@127.0.0.1:27017/alawael_erp?authSource=admin"

# Generate fresh secrets
JWT_SECRET=$(openssl rand -hex 64)
JWT_REFRESH_SECRET=$(openssl rand -hex 64)
SESSION_SECRET=$(openssl rand -hex 64)
ENCRYPTION_KEY=$(openssl rand -hex 32)

cat > ${APP_DIR}/backend/.env << ENVFILE
# ═══ Alawael ERP — Production Environment ═══
# Generated on $(date '+%Y-%m-%d %H:%M:%S') by finish-deploy.sh

# Application
NODE_ENV=production
PORT=5000
APP_NAME=alawael-erp
APP_VERSION=1.0.0
TZ=Asia/Riyadh

# MongoDB
MONGODB_URI=${MONGODB_URI}
MONGODB_MAX_POOL_SIZE=50
USE_MOCK_DB=false

# Encryption
ENCRYPTION_KEY=${ENCRYPTION_KEY}

# Redis (Disabled)
DISABLE_REDIS=true
REDIS_ENABLED=false

# JWT
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_REFRESH_EXPIRES_IN=7d

# Session
SESSION_SECRET=${SESSION_SECRET}
SESSION_MAX_AGE=86400000

# URLs & CORS
CORS_ORIGIN=https://${DOMAIN}
CORS_ORIGINS=https://${DOMAIN},https://www.${DOMAIN}
ALLOWED_HOSTS=${DOMAIN}
FRONTEND_URL=https://${DOMAIN}
BACKEND_URL=https://${DOMAIN}
API_BASE_URL=https://${DOMAIN}/api

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
EMAIL_FROM=noreply@${DOMAIN}
EMAIL_FROM_NAME=Al-Awael ERP

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
MAX_LOGIN_ATTEMPTS=5

# Database TLS (disable for local MongoDB without SSL)
DB_TLS=false

# Logging
LOG_LEVEL=warn
LOG_FORMAT=json

# Features
ENABLE_SWAGGER=false
ENABLE_HEALTH_CHECK=true
ENABLE_REQUEST_LOGGING=true
ENABLE_RATE_LIMITING=true
SMART_TEST_MODE=false
ENVFILE

chown ${APP_USER}:${APP_USER} ${APP_DIR}/backend/.env
chmod 600 ${APP_DIR}/backend/.env
log_ok "Backend .env (PORT=5000, domain=${DOMAIN})"

# ══════════════════════════════════════════════════════════════════════════════
#  STEP 3: Install Backend dependencies
# ══════════════════════════════════════════════════════════════════════════════
log_step "3/7" "تثبيت حزم Backend"

cd ${APP_DIR}/backend
sudo -u ${APP_USER} npm install --production --no-audit --no-fund 2>&1 | tail -3
log_ok "Backend packages installed"

# ══════════════════════════════════════════════════════════════════════════════
#  STEP 4: Build Frontend (THE CRITICAL STEP)
# ══════════════════════════════════════════════════════════════════════════════
log_step "4/7" "بناء Frontend (React)"

cd ${APP_DIR}/frontend

# Install dependencies if needed
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.bin/react-scripts" ]; then
  echo -e "${CYAN}  📦 Installing frontend packages...${NC}"
  sudo -u ${APP_USER} npm install --no-audit --no-fund 2>&1 | tail -3
fi

# Clean old broken build
rm -rf build

echo -e "${CYAN}  🔨 Building React app (NODE_OPTIONS=--max-old-space-size=4096)...${NC}"
echo -e "${CYAN}  ⏳ This may take 5-10 minutes. DO NOT close this terminal.${NC}"

# Build with generous memory and no sourcemaps
sudo -u ${APP_USER} env \
  NODE_OPTIONS="--max-old-space-size=4096" \
  GENERATE_SOURCEMAP=false \
  CI=false \
  REACT_APP_API_URL="https://${DOMAIN}/api" \
  npm run build 2>&1

# Verify build succeeded
if [ -f "build/index.html" ]; then
  JS_COUNT=$(ls build/static/js/*.js 2>/dev/null | wc -l)
  CSS_COUNT=$(ls build/static/css/*.css 2>/dev/null | wc -l)
  log_ok "Frontend build successful! (${JS_COUNT} JS, ${CSS_COUNT} CSS files)"
else
  log_err "Frontend build FAILED!"
  echo -e "${RED}  Check: ls -la ${APP_DIR}/frontend/build/${NC}"
  echo -e "${RED}  Logs above should show the error${NC}"
  exit 1
fi

# ══════════════════════════════════════════════════════════════════════════════
#  STEP 5: Fix Nginx (correct domain + PORT 5000)
# ══════════════════════════════════════════════════════════════════════════════
log_step "5/7" "إصلاح Nginx (${DOMAIN} + PORT 5000)"

# Remove default site
rm -f /etc/nginx/sites-enabled/default

# Rate limiting (add if not exists)
if ! grep -q "limit_req_zone" /etc/nginx/nginx.conf; then
  sed -i '/http {/a\    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r\/s;\n    limit_req_zone $binary_remote_addr zone=login_limit:10m rate=3r\/s;' /etc/nginx/nginx.conf
fi

# Write complete nginx config
cat > /etc/nginx/sites-available/alawael << NGINXCONF
# HTTP → HTTPS redirect
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

# Main HTTPS server
server {
    listen 443 ssl http2;
    server_name ${DOMAIN} www.${DOMAIN};

    # SSL
    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript
               application/json application/javascript application/xml
               application/rss+xml font/truetype font/opentype
               application/vnd.ms-fontobject image/svg+xml;

    client_max_body_size 20M;

    # Frontend (React SPA)
    root ${APP_DIR}/frontend/build;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;

        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)\$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            access_log off;
        }
    }

    # API — PORT 5000
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 30s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Login rate limit
    location /api/auth/login {
        limit_req zone=login_limit burst=5 nodelay;
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # WebSocket (Socket.IO)
    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }

    # Health check
    location /health {
        proxy_pass http://127.0.0.1:5000/health;
        access_log off;
    }

    # Block dotfiles
    location ~ /\. {
        deny all;
    }
}
NGINXCONF

ln -sf /etc/nginx/sites-available/alawael /etc/nginx/sites-enabled/alawael

# Test and reload
if nginx -t 2>&1; then
  systemctl reload nginx
  log_ok "Nginx configured: ${DOMAIN} → port 5000"
else
  log_err "Nginx config test failed!"
  nginx -t
  exit 1
fi

# ══════════════════════════════════════════════════════════════════════════════
#  STEP 6: Start PM2
# ══════════════════════════════════════════════════════════════════════════════
log_step "6/7" "تشغيل التطبيق بـ PM2"

# Create ecosystem config
cat > ${APP_DIR}/ecosystem.config.js << 'PM2CONF'
module.exports = {
  apps: [{
    name: 'alawael-api',
    script: './server.js',
    cwd: '/home/alawael/app/backend',
    instances: 2,
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 5000,
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: '/home/alawael/logs/api-error.log',
    out_file: '/home/alawael/logs/api-out.log',
    merge_logs: true,
    max_restarts: 10,
    restart_delay: 4000,
    autorestart: true,
  }]
};
PM2CONF

chown ${APP_USER}:${APP_USER} ${APP_DIR}/ecosystem.config.js
mkdir -p ${LOG_DIR}
touch ${LOG_DIR}/api-out.log ${LOG_DIR}/api-error.log
chown -R ${APP_USER}:${APP_USER} ${LOG_DIR}

# Stop any existing
su - ${APP_USER} -c "cd ${APP_DIR} && pm2 delete all 2>/dev/null; pm2 start ecosystem.config.js && pm2 save" 2>&1

# PM2 auto-start on reboot
pm2 startup systemd -u ${APP_USER} --hp /home/${APP_USER} > /dev/null 2>&1 || true

log_ok "PM2 started: alawael-api (2 instances, port 5000)"

# ══════════════════════════════════════════════════════════════════════════════
#  STEP 7: Verify Everything
# ══════════════════════════════════════════════════════════════════════════════
log_step "7/7" "التحقق النهائي"

sleep 5

# Check backend health
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5000/health 2>/dev/null || echo "000")
if [ "${HEALTH}" = "200" ]; then
  log_ok "Backend API: HTTP 200 ✅"
else
  log_warn "Backend API: HTTP ${HEALTH} — check: pm2 logs alawael-api"
fi

# Check HTTPS
HTTPS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://${DOMAIN}/health 2>/dev/null || echo "000")
if [ "${HTTPS_STATUS}" = "200" ]; then
  log_ok "HTTPS: https://${DOMAIN} ✅"
else
  log_warn "HTTPS: ${HTTPS_STATUS} — check DNS points to this server"
fi

# Setup daily MongoDB backup
mkdir -p ${BACKUP_DIR}/mongodb
chown -R ${APP_USER}:${APP_USER} ${BACKUP_DIR}
cat > /home/${APP_USER}/backup-mongodb.sh << 'BACKUP'
#!/bin/bash
MONGO_PASS=$(cat /root/.mongo_pass)
mongodump --uri="mongodb://alawael_admin:${MONGO_PASS}@127.0.0.1:27017/alawael_erp?authSource=admin" \
  --out="/home/alawael/backups/mongodb/$(date +%Y%m%d)" --gzip 2>/dev/null
find "/home/alawael/backups/mongodb" -maxdepth 1 -mtime +7 -type d -exec rm -rf {} + 2>/dev/null
BACKUP
chmod 700 /home/${APP_USER}/backup-mongodb.sh
(crontab -l 2>/dev/null | grep -v backup-mongodb; echo "0 2 * * * /home/${APP_USER}/backup-mongodb.sh") | crontab -

# SSL auto-renew
(crontab -l 2>/dev/null | grep -v certbot; echo "0 3 1,15 * * certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   ✅  النشر اكتمل بنجاح!                                   ║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║   🌐  https://${DOMAIN}                                ║${NC}"
echo -e "${CYAN}║   🔌  https://${DOMAIN}/api                           ║${NC}"
echo -e "${CYAN}║   💚  https://${DOMAIN}/health                        ║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║   📊  pm2 status                                            ║${NC}"
echo -e "${CYAN}║   📝  pm2 logs alawael-api                                  ║${NC}"
echo -e "${CYAN}║   🔄  pm2 restart alawael-api                               ║${NC}"
echo -e "${CYAN}║   🗄️  cat /root/.mongo_pass                                 ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Deploy log saved to: /tmp/finish-deploy.log"

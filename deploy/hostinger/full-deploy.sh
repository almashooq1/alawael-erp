#!/bin/bash
# ════════════════════════════════════════════════════════════════════════════════
#  🚀 سكربت النشر الشامل — نظام الأوائل ERP
#  Full Automated Deployment Script — Alawael ERP
#
#  هذا السكربت يعمل كل شيء بأمر واحد:
#    1. تحديث النظام وتثبيت الأدوات
#    2. تثبيت MongoDB 8.0 مع Authentication
#    3. تثبيت Node.js 20 LTS + PM2
#    4. إنشاء المستخدم والمجلدات
#    5. سحب المشروع من GitHub
#    6. تثبيت الحزم وبناء Frontend
#    7. إعداد Firewall + Nginx + SSL
#    8. تشغيل التطبيق بـ PM2
#    9. نسخ احتياطي يومي تلقائي
#
#  الاستخدام:
#    ssh root@72.60.84.56
#    curl -sL https://raw.githubusercontent.com/almashooq1/alawael-erp/main/deploy/hostinger/full-deploy.sh | bash
#    أو:
#    bash full-deploy.sh
# ════════════════════════════════════════════════════════════════════════════════
set -euo pipefail

# ─── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ─── Configuration ─────────────────────────────────────────────────────────────
DOMAIN="alawael.org"
EMAIL="admin@alawael.org"
APP_USER="alawael"
APP_DIR="/home/${APP_USER}/app"
LOG_DIR="/home/${APP_USER}/logs"
BACKUP_DIR="/home/${APP_USER}/backups"
GITHUB_REPO="https://github.com/almashooq1/alawael-erp.git"
GITHUB_BRANCH="main"
NODE_VERSION="20"

# ─── Auto-generated Secrets (generated fresh at deploy time) ──────────────────
JWT_SECRET=$(openssl rand -hex 64)
JWT_REFRESH_SECRET=$(openssl rand -hex 64)
SESSION_SECRET=$(openssl rand -hex 64)
ENCRYPTION_KEY=$(openssl rand -hex 32)

# ─── Functions ─────────────────────────────────────────────────────────────────
log_step() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}${BOLD}  [$1/11] $2${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

log_ok() { echo -e "${GREEN}  ✅ $1${NC}"; }
log_warn() { echo -e "${YELLOW}  ⚠️  $1${NC}"; }
log_err() { echo -e "${RED}  ❌ $1${NC}"; }

# ─── Root Check ────────────────────────────────────────────────────────────────
if [ "$EUID" -ne 0 ]; then
  log_err "يرجى تشغيل السكربت كـ root: sudo bash full-deploy.sh"
  exit 1
fi

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                              ║${NC}"
echo -e "${CYAN}║   🚀  نشر نظام الأوائل ERP — Alawael ERP Deployment       ║${NC}"
echo -e "${CYAN}║                                                              ║${NC}"
echo -e "${CYAN}║   Domain:  ${DOMAIN}                                     ║${NC}"
echo -e "${CYAN}║   Server:  $(hostname -I | awk '{print $1}')                           ║${NC}"
echo -e "${CYAN}║                                                              ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ══════════════════════════════════════════════════════════════════════════════
#  STEP 1: System Update
# ══════════════════════════════════════════════════════════════════════════════
log_step 1 "تحديث النظام وتثبيت الأدوات الأساسية"

export DEBIAN_FRONTEND=noninteractive
apt update -qq
apt upgrade -y -qq
apt install -y -qq curl wget git build-essential nginx certbot python3-certbot-nginx \
  ufw gnupg lsb-release software-properties-common jq unzip fail2ban

# Stop & disable Apache if running (conflicts with Nginx on port 80)
if systemctl is-active --quiet apache2 2>/dev/null; then
  systemctl stop apache2
  systemctl disable apache2
  log_warn "Apache2 stopped & disabled (Nginx will use port 80)"
fi

# ─── Create Swap if needed (React build is memory-hungry) ──────────────────
if [ ! -f /swapfile ]; then
  echo -e "${CYAN}  💾 إنشاء Swap 2GB...${NC}"
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile > /dev/null
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  log_ok "Swap 2GB created & enabled"
else
  swapon /swapfile 2>/dev/null || true
  log_ok "Swap already exists"
fi

log_ok "تم تحديث النظام"

# ══════════════════════════════════════════════════════════════════════════════
#  STEP 2: Install MongoDB 8.0
# ══════════════════════════════════════════════════════════════════════════════
log_step 2 "تثبيت MongoDB 8.0 Community Edition"

if ! command -v mongod &> /dev/null; then
  # Remove any old MongoDB 7.0 repo that may have been added
  rm -f /etc/apt/sources.list.d/mongodb-org-7.0.list
  rm -f /usr/share/keyrings/mongodb-server-7.0.gpg

  # Import MongoDB 8.0 GPG Key
  curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | \
    gpg --dearmor -o /usr/share/keyrings/mongodb-server-8.0.gpg 2>/dev/null

  # Detect OS codename — MongoDB 8.0 supports noble (24.04)
  OS_CODENAME=$(lsb_release -cs 2>/dev/null || echo "noble")

  # Add repo
  echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu ${OS_CODENAME}/mongodb-org/8.0 multiverse" | \
    tee /etc/apt/sources.list.d/mongodb-org-8.0.list > /dev/null

  apt update -qq
  apt install -y -qq mongodb-org

  # Start & enable
  systemctl start mongod
  systemctl enable mongod
  log_ok "MongoDB 8.0 تم تثبيته وتشغيله"
else
  log_warn "MongoDB مثبّت مسبقاً: $(mongod --version | head -1)"

  # ─── Fix duplicate security blocks in mongod.conf (from previous runs) ─────
  if grep -c '^security:' /etc/mongod.conf 2>/dev/null | grep -q '[2-9]'; then
    log_warn "Fixing duplicate security blocks in mongod.conf..."
    # Remove ALL security blocks, will re-add one cleanly below
    sed -i '/^security:/,/^  authorization:.*$/d' /etc/mongod.conf
    # Also remove any leftover blank lines from deletion
    sed -i '/^$/N;/^\n$/d' /etc/mongod.conf
  fi

  systemctl start mongod 2>/dev/null || {
    # If start fails, check if config is broken
    log_warn "MongoDB failed to start, checking config..."
    # Remove any duplicate security sections entirely
    python3 -c "
import re
with open('/etc/mongod.conf') as f: t = f.read()
# Remove all security blocks
t = re.sub(r'\nsecurity:\s*\n\s*authorization:\s*enabled\s*', '', t)
with open('/etc/mongod.conf','w') as f: f.write(t)
print('Cleaned mongod.conf')
" 2>/dev/null || sed -i '/^security:/,/^  authorization:.*$/d' /etc/mongod.conf
    systemctl start mongod
  }
fi

# ─── MongoDB Authentication ────────────────────────────────────────────────────
echo -e "${CYAN}  🔑 إعداد مستخدم قاعدة البيانات...${NC}"

MONGO_PASS=$(openssl rand -base64 32 | tr -dc 'A-Za-z0-9' | head -c 32)
echo "${MONGO_PASS}" > /root/.mongo_pass
chmod 600 /root/.mongo_pass

# Wait for MongoDB to be ready (up to 20 seconds)
for i in {1..10}; do
  if mongosh --quiet --eval "db.runCommand({ping:1})" &>/dev/null; then break; fi
  echo -e "${CYAN}  ⏳ Waiting for MongoDB... (${i}/10)${NC}"
  sleep 2
done

# Verify MongoDB is actually running
if ! mongosh --quiet --eval "db.runCommand({ping:1})" &>/dev/null; then
  log_err "MongoDB is not running! Checking logs..."
  journalctl -u mongod --no-pager -n 10
  log_err "Attempting config fix..."
  # Nuclear option: reset to clean config
  cp /etc/mongod.conf /etc/mongod.conf.broken
  cat > /etc/mongod.conf << 'CLEANCONF'
# mongod.conf - cleaned by deploy script

storage:
  dbPath: /var/lib/mongodb

systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log

net:
  port: 27017
  bindIp: 127.0.0.1

processManagement:
  timeZoneInfo: /usr/share/zoneinfo
CLEANCONF
  systemctl restart mongod
  sleep 3
  if ! mongosh --quiet --eval "db.runCommand({ping:1})" &>/dev/null; then
    log_err "MongoDB still not running after config reset. Check: journalctl -u mongod"
    exit 1
  fi
  log_ok "MongoDB recovered with clean config"
fi

mongosh --quiet --eval "
use admin;
try {
  db.createUser({
    user: 'alawael_admin',
    pwd: '${MONGO_PASS}',
    roles: [
      { role: 'readWrite', db: 'alawael_erp' },
      { role: 'dbAdmin', db: 'alawael_erp' }
    ]
  });
  print('User created');
} catch(e) {
  if (e.codeName === 'DuplicateKey' || e.code === 51003) {
    db.changeUserPassword('alawael_admin', '${MONGO_PASS}');
    print('Password updated');
  } else { throw e; }
}
"

# Enable auth (safely — remove any existing security blocks first, then add one)
sed -i '/^security:/,/^[^ ]/{ /^security:/d; /^  authorization:/d; }' /etc/mongod.conf 2>/dev/null
# Remove empty lines left behind
sed -i '/^$/N;/^\n$/d' /etc/mongod.conf 2>/dev/null
# Add clean security block
cat >> /etc/mongod.conf << 'MONGOAUTH'

security:
  authorization: enabled
MONGOAUTH
systemctl restart mongod
sleep 2

MONGODB_URI="mongodb://alawael_admin:${MONGO_PASS}@127.0.0.1:27017/alawael_erp?authSource=admin"
log_ok "MongoDB جاهز مع Authentication"

# ══════════════════════════════════════════════════════════════════════════════
#  STEP 3: Install Node.js 20 LTS
# ══════════════════════════════════════════════════════════════════════════════
log_step 3 "تثبيت Node.js ${NODE_VERSION} LTS"

if ! command -v node &> /dev/null || [[ $(node -v | cut -d. -f1 | tr -d v) -lt 18 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - > /dev/null 2>&1
  apt install -y -qq nodejs
fi

log_ok "Node.js $(node -v) | npm $(npm -v)"

# ══════════════════════════════════════════════════════════════════════════════
#  STEP 4: Install PM2
# ══════════════════════════════════════════════════════════════════════════════
log_step 4 "تثبيت PM2 Process Manager"

npm install -g pm2 > /dev/null 2>&1
pm2 install pm2-logrotate > /dev/null 2>&1
pm2 set pm2-logrotate:max_size 10M > /dev/null 2>&1
pm2 set pm2-logrotate:retain 7 > /dev/null 2>&1

log_ok "PM2 $(pm2 -v) مع logrotate"

# ══════════════════════════════════════════════════════════════════════════════
#  STEP 5: Create App User & Directories
# ══════════════════════════════════════════════════════════════════════════════
log_step 5 "إنشاء المستخدم والمجلدات"

if ! id "${APP_USER}" &>/dev/null; then
  adduser --disabled-password --gecos "" ${APP_USER}
fi

mkdir -p ${APP_DIR} ${LOG_DIR} ${BACKUP_DIR}/mongodb /var/www/certbot
chown -R ${APP_USER}:${APP_USER} /home/${APP_USER}

log_ok "المستخدم ${APP_USER} والمجلدات جاهزة"

# ══════════════════════════════════════════════════════════════════════════════
#  STEP 6: Clone Project from GitHub
# ══════════════════════════════════════════════════════════════════════════════
log_step 6 "سحب المشروع من GitHub"

if [ -d "${APP_DIR}/.git" ]; then
  echo -e "${YELLOW}  📁 المشروع موجود — تحديث...${NC}"
  cd ${APP_DIR}
  sudo -u ${APP_USER} git fetch origin
  sudo -u ${APP_USER} git reset --hard origin/${GITHUB_BRANCH}
else
  rm -rf ${APP_DIR}/*
  sudo -u ${APP_USER} git clone --branch ${GITHUB_BRANCH} --depth 1 ${GITHUB_REPO} ${APP_DIR}
fi

chown -R ${APP_USER}:${APP_USER} ${APP_DIR}
log_ok "المشروع جاهز في ${APP_DIR}"

# ══════════════════════════════════════════════════════════════════════════════
#  STEP 7: Configure .env & Install Dependencies
# ══════════════════════════════════════════════════════════════════════════════
log_step 7 "إعداد البيئة وتثبيت الحزم"

# ─── Create backend .env ───────────────────────────────────────────────────
cat > ${APP_DIR}/backend/.env << ENVFILE
# ═══ Alawael ERP — Production Environment ═══
# Auto-generated on $(date '+%Y-%m-%d %H:%M:%S')

# Application
NODE_ENV=production
PORT=5000
APP_NAME=alawael-erp
APP_VERSION=1.0.0
TZ=Asia/Riyadh

# MongoDB (Local)
MONGODB_URI=${MONGODB_URI}
MONGODB_MAX_POOL_SIZE=50
USE_MOCK_DB=false

# Encryption
ENCRYPTION_KEY=$(openssl rand -hex 32)

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

# Email (configure later — leave commented until ready)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
# SMTP_USER=
# SMTP_PASS=
SMTP_SECURE=false
EMAIL_FROM=noreply@${DOMAIN}
EMAIL_FROM_NAME=Al-Awael ERP

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
MAX_LOGIN_ATTEMPTS=5

# Logging
LOG_LEVEL=warn
LOG_FORMAT=json

# Backups
ENABLE_AUTO_BACKUP=false
BACKUP_DIR=${BACKUP_DIR}

# Features
ENABLE_SWAGGER=false
ENABLE_HEALTH_CHECK=true
ENABLE_REQUEST_LOGGING=true
ENABLE_RATE_LIMITING=true
SMART_TEST_MODE=false
ENVFILE

chown ${APP_USER}:${APP_USER} ${APP_DIR}/backend/.env
chmod 600 ${APP_DIR}/backend/.env
log_ok "ملف .env تم إنشاؤه"

# ─── Install Backend Dependencies ──────────────────────────────────────────
echo -e "${CYAN}  📦 تثبيت حزم Backend...${NC}"
cd ${APP_DIR}/backend
sudo -u ${APP_USER} npm install --production --no-audit --no-fund 2>&1 | tail -3
log_ok "Backend packages installed"

# ─── Build Frontend ────────────────────────────────────────────────────────
echo -e "${CYAN}  🏗️  بناء Frontend...${NC}"
cd ${APP_DIR}/frontend
sudo -u ${APP_USER} npm install --no-audit --no-fund 2>&1 | tail -3
echo -e "${CYAN}  🔨 Building React app (may take a few minutes)...${NC}"
sudo -u ${APP_USER} env NODE_OPTIONS="--max-old-space-size=4096" GENERATE_SOURCEMAP=false CI=false npm run build 2>&1 | tail -5

if [ ! -d "${APP_DIR}/frontend/build" ]; then
  log_err "فشل بناء Frontend!"
  exit 1
fi
log_ok "Frontend built successfully"

# ══════════════════════════════════════════════════════════════════════════════
#  STEP 8: Firewall (UFW + Fail2Ban)
# ══════════════════════════════════════════════════════════════════════════════
log_step 8 "إعداد جدار الحماية"

ufw default deny incoming > /dev/null
ufw default allow outgoing > /dev/null
ufw allow ssh > /dev/null
ufw allow 'Nginx Full' > /dev/null
ufw --force enable > /dev/null

# Fail2Ban for SSH brute force protection
systemctl enable fail2ban > /dev/null 2>&1
systemctl start fail2ban > /dev/null 2>&1

log_ok "UFW + Fail2Ban configured"

# ══════════════════════════════════════════════════════════════════════════════
#  STEP 9: Nginx Configuration
# ══════════════════════════════════════════════════════════════════════════════
log_step 9 "إعداد Nginx + SSL"

# Remove default
rm -f /etc/nginx/sites-enabled/default

# Rate limiting
if ! grep -q "limit_req_zone" /etc/nginx/nginx.conf; then
  sed -i '/http {/a\    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r\/s;\n    limit_req_zone $binary_remote_addr zone=login_limit:10m rate=3r\/s;' /etc/nginx/nginx.conf
fi

# ─── Temporary HTTP-only config for SSL issuance ──────────────────────────
cat > /etc/nginx/sites-available/alawael << NGINX_TEMP
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 200 'Setting up SSL...';
        add_header Content-Type text/plain;
    }
}
NGINX_TEMP

ln -sf /etc/nginx/sites-available/alawael /etc/nginx/sites-enabled/alawael
nginx -t && systemctl restart nginx

# ─── Get SSL Certificate ──────────────────────────────────────────────────
echo -e "${CYAN}  🔒 Getting SSL certificate from Let's Encrypt...${NC}"
certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} \
  --email ${EMAIL} --agree-tos --non-interactive --redirect 2>&1 | tail -3

# ─── Full Nginx config with SSL ───────────────────────────────────────────
cat > /etc/nginx/sites-available/alawael << 'NGINX_FULL'
# Rate limiting zones defined in nginx.conf http block

# HTTP → HTTPS redirect
server {
    listen 80;
    server_name DOMAIN_PH www.DOMAIN_PH;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# Main HTTPS server
server {
    listen 443 ssl http2;
    server_name DOMAIN_PH www.DOMAIN_PH;

    # SSL
    ssl_certificate /etc/letsencrypt/live/DOMAIN_PH/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/DOMAIN_PH/privkey.pem;
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
    root APPDIR_PH/frontend/build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;

        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            access_log off;
        }
    }

    # API with rate limiting
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 30s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Login with strict rate limiting
    location /api/auth/login {
        limit_req zone=login_limit burst=5 nodelay;
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket (Socket.IO)
    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
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
NGINX_FULL

# Replace placeholders
sed -i "s|DOMAIN_PH|${DOMAIN}|g" /etc/nginx/sites-available/alawael
sed -i "s|APPDIR_PH|${APP_DIR}|g" /etc/nginx/sites-available/alawael

nginx -t && systemctl reload nginx
log_ok "Nginx + SSL configured for ${DOMAIN}"

# Auto-renew SSL
(crontab -l 2>/dev/null; echo "0 3 1,15 * * certbot renew --quiet --post-hook 'systemctl reload nginx'") | sort -u | crontab -

# ══════════════════════════════════════════════════════════════════════════════
#  STEP 10: Start Application with PM2
# ══════════════════════════════════════════════════════════════════════════════
log_step 10 "تشغيل التطبيق"

# Setup PM2 ecosystem config
cp ${APP_DIR}/deploy/hostinger/ecosystem.config.js ${APP_DIR}/ecosystem.config.js 2>/dev/null || true
chown ${APP_USER}:${APP_USER} ${APP_DIR}/ecosystem.config.js

# Setup logging
mkdir -p ${LOG_DIR}
touch ${LOG_DIR}/api-out.log ${LOG_DIR}/api-error.log
chown -R ${APP_USER}:${APP_USER} ${LOG_DIR}

# Start PM2 as app user
cd ${APP_DIR}
pm2 delete alawael-api 2>/dev/null || true

sudo -u ${APP_USER} bash -c "cd ${APP_DIR} && pm2 start ecosystem.config.js"
sudo -u ${APP_USER} pm2 save

# PM2 auto-start on reboot
pm2 startup systemd -u ${APP_USER} --hp /home/${APP_USER} > /dev/null 2>&1

log_ok "التطبيق يعمل على PM2"

# ══════════════════════════════════════════════════════════════════════════════
#  STEP 11: Verify & Setup Backups
# ══════════════════════════════════════════════════════════════════════════════
log_step 11 "التحقق والنسخ الاحتياطي"

# Wait for app to start
echo -e "${CYAN}  ⏳ انتظار بدء التطبيق...${NC}"
sleep 5

# Health check
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5000/health 2>/dev/null || echo "000")
if [ "${HEALTH}" = "200" ]; then
  log_ok "Backend يعمل بنجاح (HTTP 200)"
else
  log_warn "Backend status: HTTP ${HEALTH} — تحقق: pm2 logs alawael-api"
fi

# Check HTTPS
HTTPS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://${DOMAIN}/health 2>/dev/null || echo "000")
if [ "${HTTPS_STATUS}" = "200" ]; then
  log_ok "HTTPS يعمل: https://${DOMAIN}"
else
  log_warn "HTTPS status: ${HTTPS_STATUS} — تأكد أن DNS يشير إلى هذا السيرفر"
fi

# ─── Daily MongoDB Backup at 2 AM ─────────────────────────────────────────
# Use a dedicated backup script to avoid exposing password in crontab
cat > /home/${APP_USER}/backup-mongodb.sh << 'BACKUP_SCRIPT'
#!/bin/bash
MONGO_PASS=$(cat /root/.mongo_pass)
BACKUP_DIR="/home/alawael/backups"
mongodump --uri="mongodb://alawael_admin:${MONGO_PASS}@127.0.0.1:27017/alawael_erp?authSource=admin" \
  --out="${BACKUP_DIR}/mongodb/$(date +%Y%m%d)" --gzip
find "${BACKUP_DIR}/mongodb" -maxdepth 1 -mtime +7 -type d -exec rm -rf {} + 2>/dev/null
BACKUP_SCRIPT
chmod 700 /home/${APP_USER}/backup-mongodb.sh
(crontab -l 2>/dev/null; echo "0 2 * * * /home/${APP_USER}/backup-mongodb.sh") | sort -u | crontab -

log_ok "نسخ احتياطي يومي مُفعّل (2 AM، 7 أيام)"

# ══════════════════════════════════════════════════════════════════════════════
#  DONE!
# ══════════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                              ║${NC}"
echo -e "${CYAN}║   ✅  تم نشر نظام الأوائل ERP بنجاح!                       ║${NC}"
echo -e "${CYAN}║                                                              ║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║                                                              ║${NC}"
echo -e "${CYAN}║   🌐  الموقع:     https://${DOMAIN}                    ║${NC}"
echo -e "${CYAN}║   🔌  API:        https://${DOMAIN}/api               ║${NC}"
echo -e "${CYAN}║   💚  Health:     https://${DOMAIN}/health            ║${NC}"
echo -e "${CYAN}║                                                              ║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║                                                              ║${NC}"
echo -e "${CYAN}║   📊  PM2 Status:    pm2 status                             ║${NC}"
echo -e "${CYAN}║   📝  Logs:          pm2 logs alawael-api                   ║${NC}"
echo -e "${CYAN}║   🔄  Restart:       pm2 restart alawael-api                ║${NC}"
echo -e "${CYAN}║   🗄️  MongoDB Pass:  cat /root/.mongo_pass                  ║${NC}"
echo -e "${CYAN}║                                                              ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}📋 ملاحظات مهمة:${NC}"
echo -e "  1. تأكد أن DNS لـ ${DOMAIN} يشير إلى $(hostname -I | awk '{print $1}')"
echo -e "  2. كلمة مرور MongoDB محفوظة في: /root/.mongo_pass"
echo -e "  3. النسخ الاحتياطي اليومي في: ${BACKUP_DIR}/mongodb/"
echo -e "  4. لتحديث التطبيق لاحقاً: cd ${APP_DIR} && git pull && pm2 restart alawael-api"
echo ""

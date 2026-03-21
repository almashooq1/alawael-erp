#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  إكمال النشر — الخطوات 8-11 (بعد فشل full-deploy عند Frontend build)
#  يُشغّل على السيرفر: bash /tmp/complete-deploy.sh
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

DOMAIN="alawael.org"
APP_USER="alawael"
APP_DIR="/home/${APP_USER}/app"
LOG_DIR="/home/${APP_USER}/logs"
BACKUP_DIR="/home/${APP_USER}/backups"

log_step() { echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n${GREEN}${BOLD}  [$1] $2${NC}\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; }
log_ok() { echo -e "${GREEN}  ✅ $1${NC}"; }
log_warn() { echo -e "${YELLOW}  ⚠️  $1${NC}"; }
log_err() { echo -e "${RED}  ❌ $1${NC}"; }

if [ "$EUID" -ne 0 ]; then
  log_err "يرجى تشغيل كـ root: sudo bash complete-deploy.sh"
  exit 1
fi

echo -e "${CYAN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  إكمال نشر نظام الأوائل ERP (Steps 8-11)  ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════╝${NC}"

# ─── Pre-check: Verify previous steps completed ─────────────────────────
echo -e "\n${CYAN}  🔍 فحص متطلبات ما قبل الإكمال...${NC}"

# Check frontend build
if [ ! -f "${APP_DIR}/frontend/build/index.html" ]; then
  log_warn "Frontend build incomplete — rebuilding with 4GB RAM..."
  cd ${APP_DIR}/frontend
  sudo -u ${APP_USER} env NODE_OPTIONS="--max-old-space-size=4096" GENERATE_SOURCEMAP=false CI=false npm run build 2>&1 | tail -5
  if [ ! -f "${APP_DIR}/frontend/build/index.html" ]; then
    log_err "Frontend build failed! Check: cd ${APP_DIR}/frontend && npm run build"
    exit 1
  fi
  log_ok "Frontend build completed"
else
  log_ok "Frontend build exists ($(ls ${APP_DIR}/frontend/build/static/js/*.js 2>/dev/null | wc -l) JS bundles)"
fi

# Check backend .env
if [ ! -f "${APP_DIR}/backend/.env" ]; then
  log_err "Backend .env missing! Run full-deploy.sh first."
  exit 1
fi
log_ok "Backend .env exists"

# Check MongoDB
if ! systemctl is-active --quiet mongod; then
  log_warn "MongoDB not running — starting..."
  systemctl start mongod
  sleep 2
fi
log_ok "MongoDB running"

# ══════════════════════════════════════════════════════════════
#  STEP 8: Firewall (UFW + Fail2Ban)
# ══════════════════════════════════════════════════════════════
log_step "8/11" "إعداد جدار الحماية"

ufw default deny incoming > /dev/null 2>&1
ufw default allow outgoing > /dev/null 2>&1
ufw allow ssh > /dev/null 2>&1
ufw allow 'Nginx Full' > /dev/null 2>&1
ufw --force enable > /dev/null 2>&1

systemctl enable fail2ban > /dev/null 2>&1
systemctl start fail2ban > /dev/null 2>&1

log_ok "UFW + Fail2Ban configured"

# ══════════════════════════════════════════════════════════════
#  STEP 9: Nginx + SSL
# ══════════════════════════════════════════════════════════════
log_step "9/11" "إعداد Nginx + SSL"

rm -f /etc/nginx/sites-enabled/default

# Rate limiting
if ! grep -q "limit_req_zone" /etc/nginx/nginx.conf; then
  sed -i '/http {/a\    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r\/s;\n    limit_req_zone $binary_remote_addr zone=login_limit:10m rate=3r\/s;' /etc/nginx/nginx.conf
fi

# Temp HTTP-only config for SSL cert
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

# Get SSL certificate
echo -e "${CYAN}  🔒 Getting SSL from Let's Encrypt...${NC}"
certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} \
  --email admin@${DOMAIN} --agree-tos --non-interactive --redirect 2>&1 | tail -5

# Full Nginx config
cat > /etc/nginx/sites-available/alawael << 'NGINX_FULL'
server {
    listen 80;
    server_name DOMAIN_PH www.DOMAIN_PH;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://$host$request_uri; }
}

server {
    listen 443 ssl http2;
    server_name DOMAIN_PH www.DOMAIN_PH;

    ssl_certificate /etc/letsencrypt/live/DOMAIN_PH/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/DOMAIN_PH/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript
               application/json application/javascript application/xml
               application/rss+xml font/truetype font/opentype
               application/vnd.ms-fontobject image/svg+xml;

    client_max_body_size 20M;

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

    location /api/auth/login {
        limit_req zone=login_limit burst=5 nodelay;
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

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

    location /health {
        proxy_pass http://127.0.0.1:5000/health;
        access_log off;
    }

    location ~ /\. { deny all; }
}
NGINX_FULL

sed -i "s|DOMAIN_PH|${DOMAIN}|g" /etc/nginx/sites-available/alawael
sed -i "s|APPDIR_PH|${APP_DIR}|g" /etc/nginx/sites-available/alawael

nginx -t && systemctl reload nginx
log_ok "Nginx + SSL configured for ${DOMAIN}"

# Auto-renew SSL
(crontab -l 2>/dev/null; echo "0 3 1,15 * * certbot renew --quiet --post-hook 'systemctl reload nginx'") | sort -u | crontab -

# ══════════════════════════════════════════════════════════════
#  STEP 10: Start Application with PM2
# ══════════════════════════════════════════════════════════════
log_step "10/11" "تشغيل التطبيق"

cp ${APP_DIR}/deploy/hostinger/ecosystem.config.js ${APP_DIR}/ecosystem.config.js 2>/dev/null || true
chown ${APP_USER}:${APP_USER} ${APP_DIR}/ecosystem.config.js

mkdir -p ${LOG_DIR}
touch ${LOG_DIR}/api-out.log ${LOG_DIR}/api-error.log
chown -R ${APP_USER}:${APP_USER} ${LOG_DIR}

cd ${APP_DIR}
su - ${APP_USER} -c "cd ${APP_DIR} && pm2 delete alawael-api 2>/dev/null; pm2 start ecosystem.config.js && pm2 save"

pm2 startup systemd -u ${APP_USER} --hp /home/${APP_USER} > /dev/null 2>&1

log_ok "التطبيق يعمل على PM2"

# ══════════════════════════════════════════════════════════════
#  STEP 11: Verify & Setup Backups
# ══════════════════════════════════════════════════════════════
log_step "11/11" "التحقق والنسخ الاحتياطي"

echo -e "${CYAN}  ⏳ انتظار بدء التطبيق...${NC}"
sleep 5

# Health check
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5000/health 2>/dev/null || echo "000")
if [ "${HEALTH}" = "200" ]; then
  log_ok "Backend يعمل (HTTP 200)"
else
  log_warn "Backend status: HTTP ${HEALTH} — check: su - alawael -c 'pm2 logs alawael-api --lines 20'"
fi

# HTTPS check
HTTPS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://${DOMAIN}/health 2>/dev/null || echo "000")
if [ "${HTTPS_STATUS}" = "200" ]; then
  log_ok "HTTPS يعمل: https://${DOMAIN}"
else
  log_warn "HTTPS status: ${HTTPS_STATUS} — تأكد أن DNS يشير إلى هذا السيرفر"
fi

# Daily backup
mkdir -p ${BACKUP_DIR}/mongodb
chown -R ${APP_USER}:${APP_USER} ${BACKUP_DIR}

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

log_ok "نسخ احتياطي يومي مُفعّل"

# ═══════════════════════════════════════════
echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  ✅  تم النشر بنجاح!                         ║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║  🌐 https://${DOMAIN}                   ║${NC}"
echo -e "${CYAN}║  🔌 https://${DOMAIN}/api              ║${NC}"
echo -e "${CYAN}║  💚 https://${DOMAIN}/health           ║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║  📊 pm2 status                               ║${NC}"
echo -e "${CYAN}║  📝 pm2 logs alawael-api                     ║${NC}"
echo -e "${CYAN}║  🔄 pm2 restart alawael-api                  ║${NC}"
echo -e "${CYAN}║  🗄️  cat /root/.mongo_pass                    ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════╝${NC}"
echo ""

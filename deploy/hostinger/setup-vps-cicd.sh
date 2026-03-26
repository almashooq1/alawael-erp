#!/bin/bash
# ════════════════════════════════════════════════════════════════════════
#  إعداد سيرفر Hostinger لأول مرة (للنشر التلقائي عبر GitHub Actions)
#  Alawael ERP - First-Time VPS Setup for CI/CD
#  يُشغَّل مرة واحدة فقط على السيرفر
# ════════════════════════════════════════════════════════════════════════
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  إعداد سيرفر Hostinger للنشر التلقائي - الأوائل ERP${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}❌ شغّل السكربت كـ root: sudo bash setup-vps-cicd.sh${NC}"
  exit 1
fi

# ─── Variables ─────────────────────────────────────────────────────
read -p "أدخل اسم الدومين (مثال: alawael.com): " DOMAIN
read -p "أدخل بريدك الإلكتروني (لشهادة SSL): " EMAIL

APP_USER="alawael"
APP_DIR="/home/${APP_USER}/app"
LOG_DIR="/home/${APP_USER}/logs"

echo ""

# ═══════════════════════════════════════════════════════════════════
# 1. تحديث النظام وتثبيت الأدوات
# ═══════════════════════════════════════════════════════════════════
echo -e "${GREEN}[1/9] تحديث النظام...${NC}"
apt update && apt upgrade -y
apt install -y curl wget git build-essential nginx certbot python3-certbot-nginx ufw rsync

# ═══════════════════════════════════════════════════════════════════
# 2. تثبيت Node.js 20 LTS
# ═══════════════════════════════════════════════════════════════════
echo -e "${GREEN}[2/9] تثبيت Node.js 20...${NC}"
if ! command -v node &> /dev/null || [[ $(node -v | cut -d. -f1 | tr -d v) -lt 18 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
fi
echo "  Node $(node -v) | npm $(npm -v)"

# ═══════════════════════════════════════════════════════════════════
# 3. تثبيت PM2
# ═══════════════════════════════════════════════════════════════════
echo -e "${GREEN}[3/9] تثبيت PM2...${NC}"
npm install -g pm2
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

# ═══════════════════════════════════════════════════════════════════
# 4. إنشاء مستخدم التطبيق + مفتاح SSH
# ═══════════════════════════════════════════════════════════════════
echo -e "${GREEN}[4/9] إنشاء مستخدم alawael + مفتاح SSH...${NC}"
if ! id "${APP_USER}" &>/dev/null; then
  adduser --disabled-password --gecos "" ${APP_USER}
fi

# Create directories
mkdir -p ${APP_DIR}/backend ${APP_DIR}/frontend/build ${LOG_DIR} /var/www/certbot
chown -R ${APP_USER}:${APP_USER} /home/${APP_USER}

# Generate SSH key pair for GitHub Actions
SSH_DIR="/home/${APP_USER}/.ssh"
mkdir -p ${SSH_DIR}

if [ ! -f "${SSH_DIR}/github_deploy_key" ]; then
  ssh-keygen -t ed25519 -f ${SSH_DIR}/github_deploy_key -N "" -C "github-actions-deploy"
  cat ${SSH_DIR}/github_deploy_key.pub >> ${SSH_DIR}/authorized_keys
  chmod 700 ${SSH_DIR}
  chmod 600 ${SSH_DIR}/authorized_keys ${SSH_DIR}/github_deploy_key
  chown -R ${APP_USER}:${APP_USER} ${SSH_DIR}
fi

# Allow alawael user to reload nginx without password
echo "${APP_USER} ALL=(ALL) NOPASSWD: /usr/bin/nginx, /usr/sbin/nginx, /bin/systemctl reload nginx, /bin/systemctl restart nginx" > /etc/sudoers.d/alawael-nginx
chmod 440 /etc/sudoers.d/alawael-nginx

# ═══════════════════════════════════════════════════════════════════
# 5. جدار الحماية
# ═══════════════════════════════════════════════════════════════════
echo -e "${GREEN}[5/9] إعداد جدار الحماية...${NC}"
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable

# ═══════════════════════════════════════════════════════════════════
# 6. إعداد Nginx
# ═══════════════════════════════════════════════════════════════════
echo -e "${GREEN}[6/9] إعداد Nginx...${NC}"
rm -f /etc/nginx/sites-enabled/default

# Rate limiting
if ! grep -q "limit_req_zone" /etc/nginx/nginx.conf; then
  sed -i '/http {/a\    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;' /etc/nginx/nginx.conf
fi

# Full Nginx config
cat > /etc/nginx/sites-available/alawael << NGINX_EOF
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

server {
    listen 443 ssl http2;
    server_name ${DOMAIN} www.${DOMAIN};

    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
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

    # Frontend (React SPA)
    root ${APP_DIR}/frontend/build;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;

        location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)\$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            access_log off;
        }
    }

    # Backend API
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
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

    # Block hidden files
    location ~ /\\. {
        deny all;
    }
}
NGINX_EOF

ln -sf /etc/nginx/sites-available/alawael /etc/nginx/sites-enabled/alawael

# ═══════════════════════════════════════════════════════════════════
# 7. شهادة SSL
# ═══════════════════════════════════════════════════════════════════
echo -e "${GREEN}[7/9] إعداد SSL (Let's Encrypt)...${NC}"

# Temp config for certbot
cat > /etc/nginx/sites-available/alawael-temp << EOF2
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 200 'Setting up SSL...'; add_header Content-Type text/plain; }
}
EOF2
ln -sf /etc/nginx/sites-available/alawael-temp /etc/nginx/sites-enabled/alawael-temp
rm -f /etc/nginx/sites-enabled/alawael
nginx -t && systemctl restart nginx

certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} --email ${EMAIL} --agree-tos --non-interactive --redirect

rm -f /etc/nginx/sites-enabled/alawael-temp /etc/nginx/sites-available/alawael-temp
ln -sf /etc/nginx/sites-available/alawael /etc/nginx/sites-enabled/alawael
nginx -t && systemctl reload nginx

# Auto-renew cron
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'") | sort -u | crontab -

# ═══════════════════════════════════════════════════════════════════
# 8. PM2 auto-start
# ═══════════════════════════════════════════════════════════════════
echo -e "${GREEN}[8/9] PM2 auto-start...${NC}"
env PATH=$PATH:/usr/bin pm2 startup systemd -u ${APP_USER} --hp /home/${APP_USER}

# ═══════════════════════════════════════════════════════════════════
# 9. إعداد ملف .env (يدوي)
# ═══════════════════════════════════════════════════════════════════
echo -e "${GREEN}[9/9] إنشاء قالب .env...${NC}"

if [ ! -f "${APP_DIR}/backend/.env" ]; then
cat > ${APP_DIR}/backend/.env << ENV_EOF
NODE_ENV=production
PORT=5000

# MongoDB Atlas - غيّر هذا الرابط!
MONGODB_URI=mongodb+srv://USER:PASS@cluster.mongodb.net/alawael-erp?retryWrites=true&w=majority

# Security - ولّد مفاتيح عشوائية بـ: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=$(openssl rand -hex 64)
JWT_REFRESH_SECRET=$(openssl rand -hex 64)
SESSION_SECRET=$(openssl rand -hex 64)
JWT_EXPIRE=24h

# Domain
CORS_ORIGIN=https://${DOMAIN}
FRONTEND_URL=https://${DOMAIN}

# Redis (معطّل)
DISABLE_REDIS=true
REDIS_ENABLED=false

# Logging
LOG_LEVEL=warn
ENABLE_SWAGGER=false
ENV_EOF
  chown ${APP_USER}:${APP_USER} ${APP_DIR}/backend/.env
  chmod 600 ${APP_DIR}/backend/.env
fi

# ═══════════════════════════════════════════════════════════════════
# Done!
# ═══════════════════════════════════════════════════════════════════
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ تم إعداد السيرفر بنجاح!${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${CYAN}═══ مفتاح SSH لـ GitHub Actions (انسخه كاملاً) ═══${NC}"
echo ""
cat ${SSH_DIR}/github_deploy_key
echo ""
echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}الخطوات التالية:${NC}"
echo ""
echo -e "  ${GREEN}1.${NC} عدّل ملف .env:"
echo -e "     ${CYAN}nano ${APP_DIR}/backend/.env${NC}"
echo -e "     ← ضع رابط MongoDB Atlas ومفاتيح JWT"
echo ""
echo -e "  ${GREEN}2.${NC} أضف Secrets في GitHub (Settings → Secrets → Actions):"
echo -e "     ${CYAN}VPS_HOST${NC}     = $(curl -s ifconfig.me 2>/dev/null || echo 'IP_السيرفر')"
echo -e "     ${CYAN}VPS_USER${NC}     = ${APP_USER}"
echo -e "     ${CYAN}VPS_SSH_KEY${NC}  = المفتاح أعلاه (انسخه كاملاً)"
echo -e "     ${CYAN}DOMAIN${NC}       = ${DOMAIN}"
echo ""
echo -e "  ${GREEN}3.${NC} ادفع الكود لـ GitHub:"
echo -e "     ${CYAN}git push origin main${NC}"
echo -e "     ← سيبدأ النشر التلقائي!"
echo ""
echo -e "  ${GREEN}💡${NC} لنشر يدوي: GitHub → Actions → Deploy to Hostinger → Run workflow"
echo ""

#!/bin/bash
# ════════════════════════════════════════════════════════════════════════
#  سكربت نشر نظام الأوائل ERP على Hostinger VPS
#  Alawael ERP - Hostinger VPS Deployment Script
# ════════════════════════════════════════════════════════════════════════
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  نشر نظام الأوائل ERP - Alawael ERP Deployment${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

# ─── Check if running as root ─────────────────────────────────────────
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}❌ يرجى تشغيل السكربت كـ root: sudo bash setup-server.sh${NC}"
  exit 1
fi

# ─── Variables ─────────────────────────────────────────────────────────
read -p "أدخل اسم الدومين (مثال: alawael.com): " DOMAIN
read -p "أدخل بريدك الإلكتروني (لشهادة SSL): " EMAIL
APP_USER="alawael"
APP_DIR="/home/${APP_USER}/app"
LOG_DIR="/home/${APP_USER}/logs"

echo ""
echo -e "${YELLOW}⚙️  إعداد السيرفر لـ: ${DOMAIN}${NC}"
echo ""

# ─── 1. System Update ─────────────────────────────────────────────────
echo -e "${GREEN}[1/10] تحديث النظام...${NC}"
apt update && apt upgrade -y
apt install -y curl wget git build-essential nginx certbot python3-certbot-nginx ufw gnupg

# ─── 2. Install MongoDB 7.0 ───────────────────────────────────────────
echo -e "${GREEN}[2/10] تثبيت MongoDB 7.0...${NC}"
if ! command -v mongod &> /dev/null; then
  # Import MongoDB public GPG Key
  curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
    gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg

  # Detect OS and add appropriate repo
  OS_CODENAME=$(lsb_release -cs 2>/dev/null || echo "jammy")
  echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu ${OS_CODENAME}/mongodb-org/7.0 multiverse" | \
    tee /etc/apt/sources.list.d/mongodb-org-7.0.list

  apt update
  apt install -y mongodb-org

  # Start & enable MongoDB
  systemctl start mongod
  systemctl enable mongod
  echo -e "${GREEN}  ✅ MongoDB 7.0 installed and started${NC}"
else
  echo -e "${YELLOW}  ⏭️  MongoDB already installed: $(mongod --version | head -1)${NC}"
  systemctl start mongod 2>/dev/null || true
fi

# ─── 2b. Configure MongoDB Authentication ─────────────────────────────
echo -e "${GREEN}  🔐 Setting up MongoDB authentication...${NC}"

# Generate a secure random password
MONGO_PASS=$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | head -c 32)
echo "${MONGO_PASS}" > /root/.mongo_pass
chmod 600 /root/.mongo_pass

# Create admin user and app database user
mongosh --quiet --eval "
use admin;
try {
  db.createUser({
    user: 'alawael_admin',
    pwd: '${MONGO_PASS}',
    roles: [
      { role: 'readWrite', db: 'alawael_erp' },
      { role: 'dbAdmin', db: 'alawael_erp' },
      { role: 'userAdminAnyDatabase', db: 'admin' }
    ]
  });
  print('✅ MongoDB user created successfully');
} catch(e) {
  if (e.codeName === 'DuplicateKey' || e.code === 51003) {
    print('⏭️  User already exists, updating password...');
    db.changeUserPassword('alawael_admin', '${MONGO_PASS}');
  } else { throw e; }
}"

# Enable authentication in MongoDB config (safely remove duplicates first)
sed -i '/^security:/,/^[^ ]/{ /^security:/d; /^  authorization:/d; }' /etc/mongod.conf 2>/dev/null
cat >> /etc/mongod.conf << 'MONGOAUTH'

security:
  authorization: enabled
MONGOAUTH
systemctl restart mongod
echo -e "${GREEN}  ✅ MongoDB authentication enabled${NC}"

echo -e "${GREEN}  📋 MongoDB URI: mongodb://alawael_admin:${MONGO_PASS}@127.0.0.1:27017/alawael_erp?authSource=admin${NC}"
echo -e "${YELLOW}  ⚠️  Password saved to /root/.mongo_pass${NC}"
echo ""

# ─── 3. Install Node.js 20 LTS ────────────────────────────────────────
echo -e "${GREEN}[3/10] تثبيت Node.js 20 LTS...${NC}"
if ! command -v node &> /dev/null || [[ $(node -v | cut -d. -f1 | tr -d v) -lt 18 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
fi
echo "Node.js $(node -v) | npm $(npm -v)"

# ─── 4. Install PM2 ───────────────────────────────────────────────────
echo -e "${GREEN}[4/10] تثبيت PM2...${NC}"
npm install -g pm2
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

# ─── 5. Create App User & Directories ─────────────────────────────────
echo -e "${GREEN}[5/10] إنشاء المستخدم والمجلدات...${NC}"
if ! id "${APP_USER}" &>/dev/null; then
  adduser --disabled-password --gecos "" ${APP_USER}
fi
mkdir -p ${APP_DIR}/backend ${APP_DIR}/frontend ${LOG_DIR} /var/www/certbot
chown -R ${APP_USER}:${APP_USER} /home/${APP_USER}

# ─── 6. Firewall ──────────────────────────────────────────────────────
echo -e "${GREEN}[6/10] إعداد جدار الحماية...${NC}"
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable

# ─── 7. Configure Nginx ───────────────────────────────────────────────
echo -e "${GREEN}[7/10] إعداد Nginx...${NC}"

# Remove default site
rm -f /etc/nginx/sites-enabled/default

# Create rate limit zone in main nginx.conf if not exists
if ! grep -q "limit_req_zone" /etc/nginx/nginx.conf; then
  sed -i '/http {/a\    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;' /etc/nginx/nginx.conf
fi

# Create site config
cat > /etc/nginx/sites-available/alawael << 'NGINX_CONF'
server {
    listen 80;
    server_name DOMAIN_PLACEHOLDER www.DOMAIN_PLACEHOLDER;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name DOMAIN_PLACEHOLDER www.DOMAIN_PLACEHOLDER;

    ssl_certificate /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/privkey.pem;
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

    # Frontend
    root APP_DIR_PLACEHOLDER/frontend/build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;

        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            access_log off;
        }
    }

    # API
    location /api/ {
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

    # WebSocket
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

    location ~ /\. {
        deny all;
    }
}
NGINX_CONF

# Replace placeholders
sed -i "s|DOMAIN_PLACEHOLDER|${DOMAIN}|g" /etc/nginx/sites-available/alawael
sed -i "s|APP_DIR_PLACEHOLDER|${APP_DIR}|g" /etc/nginx/sites-available/alawael

# Enable site
ln -sf /etc/nginx/sites-available/alawael /etc/nginx/sites-enabled/alawael

# ─── 8. SSL Certificate ───────────────────────────────────────────────
echo -e "${GREEN}[8/10] إعداد شهادة SSL...${NC}"

# First start nginx without SSL for certbot challenge
cat > /etc/nginx/sites-available/alawael-temp << EOF
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
EOF
ln -sf /etc/nginx/sites-available/alawael-temp /etc/nginx/sites-enabled/alawael-temp
rm -f /etc/nginx/sites-enabled/alawael
nginx -t && systemctl restart nginx

# Get certificate
certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} --email ${EMAIL} --agree-tos --non-interactive --redirect

# Restore full config
rm -f /etc/nginx/sites-enabled/alawael-temp /etc/nginx/sites-available/alawael-temp
ln -sf /etc/nginx/sites-available/alawael /etc/nginx/sites-enabled/alawael
nginx -t && systemctl reload nginx

# Auto-renewal
echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'" | crontab -

# ─── 9. PM2 Startup ───────────────────────────────────────────────────
echo -e "${GREEN}[9/10] إعداد PM2 للتشغيل التلقائي...${NC}"
pm2 startup systemd -u ${APP_USER} --hp /home/${APP_USER}

# ─── 10. MongoDB Backup Cron ──────────────────────────────────────────
echo -e "${GREEN}[10/10] إعداد النسخ الاحتياطي اليومي لـ MongoDB...${NC}"
mkdir -p /home/${APP_USER}/backups/mongodb
chown -R ${APP_USER}:${APP_USER} /home/${APP_USER}/backups

# Daily backup at 2 AM
MONGO_PASS_ESCAPED=$(cat /root/.mongo_pass)
(crontab -l 2>/dev/null; echo "0 2 * * * mongodump --uri='mongodb://alawael_admin:${MONGO_PASS_ESCAPED}@127.0.0.1:27017/alawael_erp?authSource=admin' --out=/home/${APP_USER}/backups/mongodb/\$(date +\%Y\%m\%d) --gzip && find /home/${APP_USER}/backups/mongodb -maxdepth 1 -mtime +7 -type d -exec rm -rf {} + 2>/dev/null") | sort -u | crontab -

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ تم إعداد السيرفر بنجاح!${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}📋 MongoDB Connection:${NC}"
echo -e "  URI: mongodb://alawael_admin:${MONGO_PASS}@127.0.0.1:27017/alawael_erp?authSource=admin"
echo -e "  Password file: /root/.mongo_pass"
echo ""
echo -e "${YELLOW}⚠️  مهم: حدّث MONGODB_URI في ملف .env بالكلمة أعلاه${NC}"
echo ""
echo -e "${YELLOW}الخطوات التالية:${NC}"
echo -e "  1. ارفع الملفات إلى ${APP_DIR} (راجع deploy.sh)"
echo -e "  2. عدّل ملف .env → حدّث MONGODB_URI بالكلمة المولّدة"
echo -e "  3. شغّل: sudo -u ${APP_USER} bash deploy.sh"
echo ""

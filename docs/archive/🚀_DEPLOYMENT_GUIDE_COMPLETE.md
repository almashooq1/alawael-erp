# 🚀 شامل دليل النشر والـ Deployment

**التاريخ**: يناير 17, 2026  
**الأولوية**: 🔴 CRITICAL  
**الحالة**: شامل وجاهز للاستخدام

---

## 📋 جدول المحتويات

1. [متطلبات البيئة](#متطلبات-البيئة)
2. [عملية النشر المرحلة](#عملية-النشر-المرحلة)
3. [نشر على Linux Server](#نشر-على-linux-server)
4. [نشر مع Docker](#نشر-مع-docker)
5. [صحة الفحصات بعد النشر](#صحة-الفحصات-بعد-النشر)
6. [استراتيجية Rollback](#استراتيجية-rollback)

---

## 🖥️ متطلبات البيئة

### متطلبات الخادم

```bash
# التحقق من متطلبات النظام

# RAM: 4GB - 8GB (development) / 8GB - 16GB (production)
# CPU: 2 cores (development) / 4+ cores (production)
# Storage: 50GB (minimal) / 250GB+ (recommended)
# Bandwidth: 10Mbps+

# نظام التشغيل المدعوم:
# - Ubuntu 20.04 LTS أو أحدث
# - CentOS 8 أو أحدث
# - Debian 11 أو أحدث
# - Amazon Linux 2
```

### البرامج المطلوبة

```bash
# 1. Node.js و npm
node -v  # v18.16.0 أو أحدث
npm -v   # v9.0.0 أو أحدث

# 2. قاعدة البيانات
mysql --version  # MySQL 8.0+ أو
psql --version   # PostgreSQL 12+

# 3. Redis (اختياري ولكن موصى به)
redis-cli --version

# 4. Docker و Docker Compose (للـ containerization)
docker --version
docker-compose --version

# 5. Git
git --version

# 6. SSL Certificate
# (من Let's Encrypt أو خدمة أخرى)
```

---

## 📦 خطوات التحضير قبل النشر

### الخطوة 1: إعداد قاعدة البيانات

```bash
# على خادم الإنتاج

# 1. تسجيل دخول MySQL
mysql -u root -p

# 2. إنشاء قاعدة البيانات
CREATE DATABASE alawael_erp_prod
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

# 3. إنشاء مستخدم قاعدة البيانات
CREATE USER 'alawael_prod_user'@'%'
IDENTIFIED BY 'STRONG-PASSWORD-HERE';

# 4. منح الأذونات
GRANT ALL PRIVILEGES ON alawael_erp_prod.*
TO 'alawael_prod_user'@'%';
FLUSH PRIVILEGES;

# 5. التحقق
SHOW GRANTS FOR 'alawael_prod_user'@'%';
```

### الخطوة 2: إعداد مجلدات المشروع

```bash
# على الخادم

cd /var/www

# إنشاء مجلد المشروع
sudo mkdir -p alawael-erp
sudo chown -R deploy:deploy alawael-erp
cd alawael-erp

# إنشاء المجلدات الضرورية
mkdir -p logs
mkdir -p data
mkdir -p backups
mkdir -p uploads
mkdir -p ssl-certs

# تعيين الأذونات
chmod 755 logs
chmod 755 data
chmod 755 uploads
```

### الخطوة 3: إعداد ملفات .env

```bash
# نسخ ملف .env.production
cp /path/to/.env.production /var/www/alawael-erp/.env

# تأكيد الأسرار آمنة
nano .env  # تحرير يدويٌ للأسرار

# تعيين الأذونات
chmod 600 .env  # لا يمكن لأحد قراءته إلا المالك
```

---

## 🐳 نشر مع Docker

### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: alawael-app
    ports:
      - '3001:3001'
    environment:
      - NODE_ENV=production
      - DATABASE_URL=mysql://alawael_prod_user:password@db:3306/alawael_erp_prod
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
    volumes:
      - ./logs:/app/logs
      - ./uploads:/app/uploads
    restart: always
    networks:
      - alawael-network

  db:
    image: mysql:8.0
    container_name: alawael-db
    environment:
      MYSQL_ROOT_PASSWORD: root-password
      MYSQL_DATABASE: alawael_erp_prod
      MYSQL_USER: alawael_prod_user
      MYSQL_PASSWORD: strong-password
    ports:
      - '3306:3306'
    volumes:
      - db-data:/var/lib/mysql
      - ./db-init:/docker-entrypoint-initdb.d
    restart: always
    networks:
      - alawael-network

  redis:
    image: redis:7-alpine
    container_name: alawael-redis
    ports:
      - '6379:6379'
    volumes:
      - redis-data:/data
    restart: always
    networks:
      - alawael-network

volumes:
  db-data:
  redis-data:

networks:
  alawael-network:
    driver: bridge
```

### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# نسخ package.json و package-lock.json
COPY package*.json ./

# تثبيت الـ dependencies
RUN npm ci --only=production

# نسخ بقية الملفات
COPY . .

# تشغيل migrations
RUN npm run migrate

# تشغيل seed data (اختياري)
# RUN npm run seed

# بناء الـ frontend إن وجد
RUN npm run build

# كشف الثغرات الأمنية
RUN npm audit fix

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node healthcheck.js

# تشغيل التطبيق
CMD ["npm", "start"]
```

### أوامر النشر مع Docker

```bash
# بناء Docker image
docker-compose build

# تشغيل الخدمات
docker-compose up -d

# التحقق من الحالة
docker-compose ps

# مراجعة السجلات
docker-compose logs -f app

# إيقاف الخدمات
docker-compose down

# إعادة تشغيل تطبيق فقط
docker-compose restart app
```

---

## 🖥️ نشر على Linux Server (بدون Docker)

### الخطوة 1: استنساخ المستودع

```bash
cd /var/www/alawael-erp

# استنساخ الكود
git clone https://github.com/your-org/alawael-erp.git .

# التحقق من الفرع الصحيح
git branch -a
git checkout production
```

### الخطوة 2: تثبيت الـ Dependencies

```bash
# تثبيت npm dependencies
npm ci --only=production

# تحديث الـ npm لأحدث إصدار
npm install -g npm@latest
```

### الخطوة 3: تشغيل Migrations

```bash
# تشغيل جميع الـ migrations
npm run migrate

# التحقق من حالة الـ migrations
npm run migrate:status

# تحميل البيانات الأولية (seed)
npm run seed
```

### الخطوة 4: إعداد PM2 (Process Manager)

```bash
# تثبيت PM2 عالمياً
npm install -g pm2

# إنشاء ملف ecosystem.config.js
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'alawael-erp',
    script: './server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'uploads'],
    max_memory_restart: '1G'
  }]
};
EOF

# تشغيل التطبيق مع PM2
pm2 start ecosystem.config.js

# حفظ قائمة العمليات
pm2 save

# إعداد PM2 للبدء تلقائياً عند restart الخادم
pm2 startup

# مراجعة العمليات
pm2 list
pm2 logs
```

### الخطوة 5: إعداد Nginx (Web Server)

```bash
# تثبيت Nginx
sudo apt-get install nginx

# إنشاء ملف الإعدادات
sudo nano /etc/nginx/sites-available/alawael-erp

# محتوى ملف الإعدادات:
```

```nginx
upstream alawael_app {
    server 127.0.0.1:3001;
    keepalive 64;
}

# HTTP redirect to HTTPS
server {
    listen 80;
    server_name alawael.com www.alawael.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name alawael.com www.alawael.com;

    # SSL Certificates (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/alawael.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/alawael.com/privkey.pem;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Proxy settings
    location / {
        proxy_pass http://alawael_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1000;
    gzip_types text/plain text/css text/xml text/javascript
               application/x-javascript application/xml+rss
               application/json application/javascript;
}
```

```bash
# تفعيل الإعدادات
sudo ln -s /etc/nginx/sites-available/alawael-erp /etc/nginx/sites-enabled/

# اختبار الإعدادات
sudo nginx -t

# إعادة تشغيل Nginx
sudo systemctl restart nginx

# التحقق من الحالة
sudo systemctl status nginx
```

### الخطوة 6: SSL Certificates (Let's Encrypt)

```bash
# تثبيت Certbot
sudo apt-get install certbot python3-certbot-nginx

# الحصول على شهادة SSL
sudo certbot certonly --nginx -d alawael.com -d www.alawael.com

# إعداد التجديد التلقائي
sudo certbot renew --dry-run
```

---

## ✅ فحوصات صحة النشر

### الفحص 1: اختبار الاتصال

```bash
# اختبار الخادم
curl -I https://alawael.com

# يجب أن نحصل على:
# HTTP/2 200
# X-Frame-Options: DENY
# Strict-Transport-Security: max-age=31536000
```

### الفحص 2: اختبار قاعدة البيانات

```bash
# اختبار الاتصال
mysql -h localhost -u alawael_prod_user -p alawael_erp_prod -e "SELECT 1"

# التحقق من الجداول
mysql -h localhost -u alawael_prod_user -p alawael_erp_prod -e "SHOW TABLES"
```

### الفحص 3: اختبار الـ API

```bash
# اختبار login endpoint
curl -X POST https://alawael.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'

# التحقق من JWT token في الرد
```

### الفحص 4: مراقبة الأداء

```bash
# متوسط response time
curl -w "Time: %{time_total}s\n" -o /dev/null -s https://alawael.com

# يجب أن يكون < 500ms
```

### الفحص 5: اختبار SSL/TLS

```bash
# فحص شهادة SSL
openssl s_client -connect alawael.com:443

# استخدام online tool
# https://www.ssllabs.com/ssltest/
```

---

## 🔄 استراتيجية Rollback (الرجوع للإصدار السابق)

### خطة الطوارئ

```bash
# 1. التحقق من آخر إصدار يعمل
git log --oneline -10

# 2. عمل backup للحالة الحالية
cp -r /var/www/alawael-erp /var/www/alawael-erp-backup-current

# 3. الرجوع للإصدار السابق
git checkout previous-commit-hash

# 4. إعادة تثبيت الـ dependencies
npm ci

# 5. تشغيل migrations للخلف (إن لزم)
npm run migrate:rollback

# 6. إعادة تشغيل التطبيق
pm2 restart alawael-erp

# 7. التحقق من النظام
curl https://alawael.com/api/health
```

---

## 📊 قائمة فحص النشر

```
قبل النشر:
☐ جميع الاختبارات تمر بنجاح (npm test)
☐ لا توجد أخطاء في ESLint
☐ جميع الـ security checks مسلح
☐ نسخة احتياطية من البيانات موجودة
☐ Migration scripts جاهزة
☐ .env.production معد بشكل صحيح

أثناء النشر:
☐ الكود منسوخ على الخادم
☐ البيانات محدثة (migrations تمت)
☐ التطبيق يعمل بدون أخطاء
☐ SSL/HTTPS يعمل
☐ الـ health check يمر

بعد النشر:
☐ الموقع متاح ويحمل بسرعة
☐ جميع الـ endpoints تستجيب
☐ السجلات (logs) واضحة
☐ المراقبة فعالة
☐ لا توجد أخطاء في الـ backend
```

---

**الحالة**: ✅ جاهز للاستخدام الفوري  
**آخر تحديث**: يناير 17, 2026

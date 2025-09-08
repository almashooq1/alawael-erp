# دليل النشر الإنتاجي - نظام ERP مراكز الأوائل

## 🚀 نظرة عامة على النشر

هذا الدليل يوضح خطوات نشر نظام ERP مراكز الأوائل في بيئة الإنتاج بشكل آمن وموثوق.

**المصمم والمطور:** عبدالله المعشوق

---

## 📋 متطلبات النظام

### متطلبات الخادم الأساسية
```
- نظام التشغيل: Ubuntu 20.04 LTS أو CentOS 8+
- المعالج: 4 cores minimum (8 cores recommended)
- الذاكرة: 8GB RAM minimum (16GB recommended)
- التخزين: 100GB SSD minimum (500GB recommended)
- الشبكة: 100Mbps minimum bandwidth
```

### البرمجيات المطلوبة
```
- Python 3.9+
- PostgreSQL 13+
- Redis 6+
- Nginx 1.18+
- SSL Certificate (Let's Encrypt or commercial)
- Docker & Docker Compose (optional but recommended)
```

---

## 🐳 النشر باستخدام Docker

### 1. إعداد ملفات Docker

**Dockerfile:**
```dockerfile
FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# Run application
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", "--timeout", "120", "app:app"]
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - DATABASE_URL=postgresql://alawael_user:${DB_PASSWORD}@db:5432/alawael_db
      - REDIS_URL=redis://redis:6379/0
      - JWT_SECRET_KEY=${JWT_SECRET_KEY}
      - FLASK_ENV=production
    depends_on:
      - db
      - redis
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs
    restart: unless-stopped
    networks:
      - alawael-network

  db:
    image: postgres:13
    environment:
      - POSTGRES_DB=alawael_db
      - POSTGRES_USER=alawael_user
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    restart: unless-stopped
    networks:
      - alawael-network

  redis:
    image: redis:6-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    restart: unless-stopped
    networks:
      - alawael-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
      - ./static:/var/www/static
    depends_on:
      - app
    restart: unless-stopped
    networks:
      - alawael-network

volumes:
  postgres_data:
  redis_data:

networks:
  alawael-network:
    driver: bridge
```

### 2. إعداد متغيرات البيئة

**ملف .env:**
```env
# Database Configuration
DB_PASSWORD=your_secure_database_password_here
DATABASE_URL=postgresql://alawael_user:${DB_PASSWORD}@db:5432/alawael_db

# Application Configuration
JWT_SECRET_KEY=your_very_secure_jwt_secret_key_here
FLASK_ENV=production
SECRET_KEY=your_flask_secret_key_here

# Redis Configuration
REDIS_URL=redis://redis:6379/0

# Email Configuration (for notifications)
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=your_email@gmail.com
MAIL_PASSWORD=your_app_password

# External API Keys
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
FIREBASE_SERVER_KEY=your_firebase_key

# Security Settings
SESSION_COOKIE_SECURE=True
SESSION_COOKIE_HTTPONLY=True
PERMANENT_SESSION_LIFETIME=3600

# File Upload Settings
MAX_CONTENT_LENGTH=16777216  # 16MB
UPLOAD_FOLDER=/app/uploads
```

### 3. إعداد Nginx

**nginx.conf:**
```nginx
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:5000;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;

    server {
        listen 80;
        server_name your-domain.com www.your-domain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name your-domain.com www.your-domain.com;

        # SSL Configuration
        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
        ssl_prefer_server_ciphers off;

        # Security Headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";

        # Static files
        location /static/ {
            alias /var/www/static/;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # API endpoints with rate limiting
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Login endpoint with stricter rate limiting
        location /api/auth/login {
            limit_req zone=login burst=5 nodelay;
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Main application
        location / {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_read_timeout 300;
            proxy_connect_timeout 300;
            proxy_send_timeout 300;
        }
    }
}
```

---

## 🔧 النشر التقليدي (بدون Docker)

### 1. إعداد البيئة

```bash
# تحديث النظام
sudo apt update && sudo apt upgrade -y

# تثبيت Python و pip
sudo apt install python3.9 python3.9-venv python3-pip -y

# تثبيت PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# تثبيت Redis
sudo apt install redis-server -y

# تثبيت Nginx
sudo apt install nginx -y

# تثبيت Git
sudo apt install git -y
```

### 2. إعداد قاعدة البيانات

```bash
# الدخول إلى PostgreSQL
sudo -u postgres psql

# إنشاء قاعدة البيانات والمستخدم
CREATE DATABASE alawael_db;
CREATE USER alawael_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE alawael_db TO alawael_user;
\q
```

### 3. نشر التطبيق

```bash
# إنشاء مستخدم للتطبيق
sudo useradd -m -s /bin/bash alawael
sudo su - alawael

# استنساخ المشروع
git clone https://github.com/your-repo/alawael-erp.git
cd alawael-erp

# إنشاء البيئة الافتراضية
python3.9 -m venv venv
source venv/bin/activate

# تثبيت المتطلبات
pip install -r requirements.txt

# إعداد متغيرات البيئة
cp .env.example .env
nano .env  # تحرير المتغيرات

# تهيئة قاعدة البيانات
python database_init.py

# إضافة البيانات التجريبية (اختياري)
python add_sample_data.py
```

### 4. إعداد Systemd Service

**ملف /etc/systemd/system/alawael.service:**
```ini
[Unit]
Description=Al-Awael ERP System
After=network.target postgresql.service redis.service

[Service]
Type=exec
User=alawael
Group=alawael
WorkingDirectory=/home/alawael/alawael-erp
Environment=PATH=/home/alawael/alawael-erp/venv/bin
ExecStart=/home/alawael/alawael-erp/venv/bin/gunicorn --bind 127.0.0.1:5000 --workers 4 app:app
ExecReload=/bin/kill -s HUP $MAINPID
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# تفعيل وتشغيل الخدمة
sudo systemctl daemon-reload
sudo systemctl enable alawael
sudo systemctl start alawael
sudo systemctl status alawael
```

---

## 🔒 إعداد الأمان

### 1. إعداد Firewall

```bash
# تفعيل UFW
sudo ufw enable

# السماح بالاتصالات الأساسية
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'

# منع الاتصالات المباشرة لقاعدة البيانات
sudo ufw deny 5432
sudo ufw deny 6379

# عرض الحالة
sudo ufw status
```

### 2. إعداد SSL Certificate

```bash
# تثبيت Certbot
sudo apt install certbot python3-certbot-nginx -y

# الحصول على شهادة SSL
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# تجديد تلقائي
sudo crontab -e
# إضافة السطر التالي:
0 12 * * * /usr/bin/certbot renew --quiet
```

### 3. تقوية الأمان

```bash
# تعطيل root login عبر SSH
sudo nano /etc/ssh/sshd_config
# PermitRootLogin no
# PasswordAuthentication no (إذا كنت تستخدم SSH keys)

# إعادة تشغيل SSH
sudo systemctl restart ssh

# تثبيت fail2ban
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

---

## 📊 المراقبة والسجلات

### 1. إعداد السجلات

**ملف logging.conf:**
```ini
[loggers]
keys=root,alawael

[handlers]
keys=consoleHandler,fileHandler

[formatters]
keys=simpleFormatter

[logger_root]
level=INFO
handlers=consoleHandler

[logger_alawael]
level=INFO
handlers=fileHandler
qualname=alawael
propagate=0

[handler_consoleHandler]
class=StreamHandler
level=INFO
formatter=simpleFormatter
args=(sys.stdout,)

[handler_fileHandler]
class=handlers.RotatingFileHandler
level=INFO
formatter=simpleFormatter
args=('/var/log/alawael/app.log', 'a', 10485760, 5)

[formatter_simpleFormatter]
format=%(asctime)s - %(name)s - %(levelname)s - %(message)s
```

### 2. إعداد مراقبة النظام

```bash
# إنشاء مجلد السجلات
sudo mkdir -p /var/log/alawael
sudo chown alawael:alawael /var/log/alawael

# مراقبة استخدام الموارد
sudo apt install htop iotop -y

# إعداد logrotate
sudo nano /etc/logrotate.d/alawael
```

**ملف logrotate:**
```
/var/log/alawael/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 alawael alawael
    postrotate
        systemctl reload alawael
    endscript
}
```

---

## 💾 النسخ الاحتياطي والاستعادة

### 1. نسخ احتياطي لقاعدة البيانات

**سكريبت backup_db.sh:**
```bash
#!/bin/bash

# متغيرات
DB_NAME="alawael_db"
DB_USER="alawael_user"
BACKUP_DIR="/backups/database"
DATE=$(date +%Y%m%d_%H%M%S)

# إنشاء مجلد النسخ الاحتياطي
mkdir -p $BACKUP_DIR

# إنشاء النسخة الاحتياطية
pg_dump -U $DB_USER -h localhost $DB_NAME | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# حذف النسخ القديمة (أكثر من 30 يوم)
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

echo "Database backup completed: backup_$DATE.sql.gz"
```

### 2. نسخ احتياطي للملفات

**سكريبت backup_files.sh:**
```bash
#!/bin/bash

# متغيرات
APP_DIR="/home/alawael/alawael-erp"
BACKUP_DIR="/backups/files"
DATE=$(date +%Y%m%d_%H%M%S)

# إنشاء مجلد النسخ الاحتياطي
mkdir -p $BACKUP_DIR

# نسخ الملفات المهمة
tar -czf $BACKUP_DIR/files_$DATE.tar.gz \
    $APP_DIR/uploads \
    $APP_DIR/.env \
    $APP_DIR/static \
    /etc/nginx/sites-available \
    /etc/systemd/system/alawael.service

# حذف النسخ القديمة
find $BACKUP_DIR -name "files_*.tar.gz" -mtime +30 -delete

echo "Files backup completed: files_$DATE.tar.gz"
```

### 3. جدولة النسخ الاحتياطي

```bash
# إضافة إلى crontab
sudo crontab -e

# نسخ احتياطي يومي في الساعة 2:00 صباحاً
0 2 * * * /home/alawael/scripts/backup_db.sh
30 2 * * * /home/alawael/scripts/backup_files.sh

# نسخ احتياطي أسبوعي كامل
0 3 * * 0 /home/alawael/scripts/full_backup.sh
```

---

## 🔄 التحديثات والصيانة

### 1. تحديث التطبيق

**سكريبت update_app.sh:**
```bash
#!/bin/bash

# الانتقال إلى مجلد التطبيق
cd /home/alawael/alawael-erp

# إيقاف الخدمة
sudo systemctl stop alawael

# نسخ احتياطي سريع
cp -r . ../alawael-erp-backup-$(date +%Y%m%d_%H%M%S)

# تحديث الكود
git pull origin main

# تفعيل البيئة الافتراضية
source venv/bin/activate

# تحديث المتطلبات
pip install -r requirements.txt

# تحديث قاعدة البيانات
python database_migrate.py

# إعادة تشغيل الخدمة
sudo systemctl start alawael

# التحقق من الحالة
sudo systemctl status alawael

echo "Application updated successfully"
```

### 2. صيانة دورية

```bash
# تنظيف السجلات القديمة
sudo logrotate -f /etc/logrotate.d/alawael

# تحديث النظام
sudo apt update && sudo apt upgrade -y

# تنظيف الذاكرة المؤقتة
sudo apt autoremove -y
sudo apt autoclean

# فحص مساحة القرص
df -h

# فحص استخدام الذاكرة
free -h

# فحص العمليات
ps aux | grep alawael
```

---

## 🚨 استكشاف الأخطاء وإصلاحها

### 1. مشاكل شائعة وحلولها

**مشكلة: التطبيق لا يبدأ**
```bash
# فحص السجلات
sudo journalctl -u alawael -f

# فحص حالة قاعدة البيانات
sudo systemctl status postgresql

# فحص الاتصال بقاعدة البيانات
sudo -u postgres psql -c "SELECT version();"
```

**مشكلة: بطء في الاستجابة**
```bash
# فحص استخدام الموارد
htop
iotop

# فحص اتصالات قاعدة البيانات
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"

# فحص سجلات Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 2. أوامر مفيدة للصيانة

```bash
# إعادة تشغيل جميع الخدمات
sudo systemctl restart alawael nginx postgresql redis

# فحص حالة جميع الخدمات
sudo systemctl status alawael nginx postgresql redis

# فحص الاتصال بالتطبيق
curl -I http://localhost:5000/health

# فحص استخدام المنافذ
sudo netstat -tlnp | grep :5000
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443
```

---

## 📈 تحسين الأداء

### 1. تحسين قاعدة البيانات

```sql
-- إنشاء فهارس للاستعلامات الشائعة
CREATE INDEX idx_students_active ON students(is_active);
CREATE INDEX idx_sessions_date ON ar_vr_sessions(session_date);
CREATE INDEX idx_assessments_student ON assessments(student_id);

-- تحليل الجداول
ANALYZE;

-- تحسين إعدادات PostgreSQL
-- في ملف /etc/postgresql/13/main/postgresql.conf
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB
```

### 2. تحسين التطبيق

```python
# في app.py - إضافة تخزين مؤقت
from flask_caching import Cache

cache = Cache(app, config={'CACHE_TYPE': 'redis'})

@app.route('/api/dashboard')
@cache.cached(timeout=300)  # 5 دقائق
def dashboard():
    # كود لوحة التحكم
    pass
```

### 3. تحسين Nginx

```nginx
# في nginx.conf
worker_processes auto;
worker_connections 2048;

# تفعيل الضغط
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css application/json application/javascript;

# تحسين التخزين المؤقت
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

---

## 📞 الدعم والمساعدة

### معلومات الاتصال
- **المطور:** عبدالله المعشوق
- **البريد الإلكتروني:** [البريد الإلكتروني]
- **الدعم الفني:** 24/7 متاح

### الموارد المفيدة
- **التوثيق الفني:** `/docs`
- **API Documentation:** `/api/docs`
- **دليل المستخدم:** `/user-guide`
- **الأسئلة الشائعة:** `/faq`

---

**تاريخ آخر تحديث:** 2025-01-06
**الإصدار:** 1.0.0
**الحالة:** جاهز للإنتاج

**© 2025 مراكز الأوائل - تصميم وتطوير: عبدالله المعشوق**

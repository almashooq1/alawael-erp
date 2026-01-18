# 🚀 دليل النشر الكامل - Phase 3 Production Ready

## 📋 جدول المحتويات

1. [المتطلبات الأساسية](#المتطلبات)
2. [إعداد البيئة](#البيئة)
3. [نشر Docker](#docker)
4. [نشر على استضافة سحابية](#cloud)
5. [إعدادات الأمان](#أمان)
6. [المراقبة والتسجيل](#مراقبة)
7. [النسخ الاحتياطي والاسترجاع](#backup)
8. [استكشاف الأخطاء](#troubleshooting)

---

## 🔧 المتطلبات الأساسية

### الخوادم والأنظمة

```bash
✅ Linux Server (Ubuntu 22.04 LTS موصى به)
✅ Docker & Docker Compose 20.10+
✅ PostgreSQL 15+
✅ Redis 7+
✅ Nginx 1.20+
✅ Python 3.11+
✅ Node.js 18+
```

### الموارد المطلوبة

```
CPU:       4 cores minimum
RAM:       8GB minimum (16GB recommended)
Storage:   50GB minimum (100GB recommended)
Bandwidth: 1Mbps minimum
```

### الشهادات والتراخيص

```bash
✅ SSL/TLS Certificate (Let's Encrypt مجاني)
✅ Domain Name
✅ Email Account (للإشعارات)
```

---

## 🛠️ إعداد البيئة

### 1. إعداد خادم جديد

```bash
# تحديث النظام
sudo apt update && sudo apt upgrade -y

# تثبيت المتطلبات الأساسية
sudo apt install -y \
    curl \
    wget \
    git \
    build-essential \
    postgresql-client \
    redis-tools \
    unzip

# تثبيت Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# تثبيت Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. إنشاء مجلد المشروع

```bash
# إنشاء مجلد التطبيق
sudo mkdir -p /opt/rehabilitation-center
cd /opt/rehabilitation-center

# استنساخ المشروع
git clone <your-repo-url> .

# إعداد الصلاحيات
sudo chown -R $USER:$USER .
chmod -R 755 .
```

### 3. إعداد متغيرات البيئة

```bash
# نسخ ملف البيئة
cp .env.example .env

# تعديل البيانات الحساسة
nano .env
```

**محتوى `.env`:**

```env
# Database
DB_NAME=rehabilitation_center
DB_USER=pg_user
DB_PASSWORD=secure_password_here
DB_HOST=db
DB_PORT=5432

# Redis
REDIS_PASSWORD=redis_secure_password
REDIS_HOST=redis
REDIS_PORT=6379

# Flask
FLASK_ENV=production
FLASK_APP=backend/app.py
SECRET_KEY=your-super-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key-here

# Email
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Security
ALLOWED_ORIGINS=https://rehabilitation-center.com,https://www.rehabilitation-center.com

# Monitoring
SENTRY_DSN=https://your-sentry-dsn

# Backup
BACKUP_ENCRYPTION_KEY=backup-encryption-key
```

---

## 🐳 نشر Docker

### 1. بناء الصور

```bash
# بناء صورة الـ Backend
docker build -f Dockerfile.production -t rehab-backend:latest .

# بناء باستخدام Docker Compose
docker-compose -f docker-compose.production.yml build
```

### 2. إطلاق الخدمات

```bash
# البدء بجميع الخدمات
docker-compose -f docker-compose.production.yml up -d

# التحقق من الحالة
docker-compose -f docker-compose.production.yml ps

# عرض السجلات
docker-compose -f docker-compose.production.yml logs -f

# تشغيل تهيئة قاعدة البيانات
docker-compose -f docker-compose.production.yml exec backend flask db upgrade

# إنشاء مستخدم admin
docker-compose -f docker-compose.production.yml exec backend flask create-admin
```

### 3. اختبار النشر

```bash
# اختبار الاتصال بـ API
curl http://localhost:5000/health

# اختبار قاعدة البيانات
docker-compose -f docker-compose.production.yml exec db pg_isready

# اختبار Redis
docker-compose -f docker-compose.production.yml exec redis redis-cli ping
```

---

## ☁️ نشر على استضافة سحابية

### نشر على AWS

```bash
# 1. إعداد EC2 Instance
# - اختر Ubuntu 22.04 LTS
# - الحد الأدنى: t3.large
# - قم بفتح المنافذ: 80, 443

# 2. تثبيت على الخادم
ssh -i your-key.pem ubuntu@your-instance-ip

# 3. تنفيذ خطوات إعداد البيئة أعلاه

# 4. استخدام RDS لقاعدة البيانات (اختياري)
# - استبدل DB_HOST بـ RDS endpoint

# 5. استخدام ElastiCache لـ Redis (اختياري)
# - استبدل REDIS_HOST بـ ElastiCache endpoint
```

### نشر على DigitalOcean

```bash
# 1. إنشاء Droplet
# - Ubuntu 22.04 LTS
# - 4GB RAM / 2 vCPUs minimum

# 2. الاتصال بـ SSH
ssh root@your-droplet-ip

# 3. تنفيذ خطوات الإعداد

# 4. استخدام App Platform (اختياري)
# - Push to GitHub
# - Connect DigitalOcean App Platform
# - تكوين البيئة والنشر التلقائي
```

### نشر على Heroku

```bash
# 1. تثبيت Heroku CLI
curl https://cli-assets.heroku.com/install.sh | sh

# 2. تسجيل الدخول
heroku login

# 3. إنشاء تطبيق
heroku create rehabilitation-center

# 4. إضافة وحدات الإضافية
heroku addons:create heroku-postgresql:standard-0
heroku addons:create heroku-redis:premium-0

# 5. النشر
git push heroku main

# 6. تشغيل الترقيات
heroku run flask db upgrade
```

---

## 🔐 إعدادات الأمان

### 1. تكوين SSL/TLS

```bash
# استخدام Let's Encrypt (مجاني)
sudo apt install -y certbot python3-certbot-nginx

# الحصول على شهادة
sudo certbot certonly --nginx -d rehabilitation-center.com -d www.rehabilitation-center.com

# التجديد التلقائي
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

### 2. جدار الحماية

```bash
# تثبيت UFW
sudo apt install -y ufw

# تفعيل الجدار
sudo ufw enable

# فتح المنافذ المطلوبة
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 5432/tcp  # PostgreSQL (للنسخ الاحتياطية فقط من IP محدد)

# عرض الحالة
sudo ufw status
```

### 3. تكوين Fail2Ban

```bash
# التثبيت
sudo apt install -y fail2ban

# إنشاء ملف إعدادات محلي
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# تفعيل الخدمة
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# التحقق من الحالة
sudo fail2ban-client status
```

---

## 📊 المراقبة والتسجيل

### 1. إعداد Prometheus و Grafana

```bash
# إضافة المراقبة إلى docker-compose.yml
# (موجودة بالفعل في الملف)

# الوصول إلى Grafana
# URL: http://localhost:3000
# Username: admin
# Password: ${GRAFANA_PASSWORD}
```

### 2. إعداد Sentry للتقارير

```bash
# 1. سجل حساباً في sentry.io
# 2. احصل على DSN
# 3. أضفه إلى .env

# في كود Flask:
import sentry_sdk
sentry_sdk.init(dsn=os.getenv('SENTRY_DSN'))
```

### 3. تكوين ELK Stack (اختياري)

```bash
# استخدام docker-compose لـ ELK
docker-compose -f docker-compose.elk.yml up -d

# الوصول إلى Kibana
# URL: http://localhost:5601
```

---

## 💾 النسخ الاحتياطية والاسترجاع

### 1. نسخ احتياطية يومية آلية

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# نسخة احتياطية لقاعدة البيانات
docker-compose -f /opt/rehabilitation-center/docker-compose.production.yml exec -T db pg_dump -U postgres rehabilitation_center | gzip > "$BACKUP_DIR/db_backup_$DATE.sql.gz"

# نسخة احتياطية للملفات المهمة
tar -czf "$BACKUP_DIR/app_backup_$DATE.tar.gz" /opt/rehabilitation-center/

# حذف النسخ القديمة (أكثر من 30 يوم)
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
```

### 2. جدول النسخ الاحتياطية

```bash
# إضافة إلى crontab
crontab -e

# نسخة احتياطية يومية الساعة 2 صباحاً
0 2 * * * /opt/rehabilitation-center/backup.sh

# نسخة احتياطية أسبوعية للتخزين البعيد
0 3 * * 0 aws s3 sync /backups s3://your-backup-bucket/
```

### 3. استعادة من النسخة الاحتياطية

```bash
# استعادة قاعدة البيانات
gunzip < /backups/db_backup_20260115_020000.sql.gz | \
docker-compose -f docker-compose.production.yml exec -T db psql -U postgres -d rehabilitation_center

# استعادة الملفات
tar -xzf /backups/app_backup_20260115_020000.tar.gz -C /
```

---

## 🔧 استكشاف الأخطاء والمشاكل

### مشكلة: الخدمات لا تبدأ

```bash
# التحقق من السجلات
docker-compose logs -f

# التحقق من الصحة
docker-compose ps

# إعادة تشغيل الخدمات
docker-compose restart

# حذف وإعادة بناء
docker-compose down -v
docker-compose up -d
```

### مشكلة: خطأ في قاعدة البيانات

```bash
# التحقق من الاتصال
docker-compose exec db psql -U postgres -c "SELECT 1;"

# فحص حجم قاعدة البيانات
docker-compose exec db du -sh /var/lib/postgresql/data

# إصلاح قاعدة البيانات
docker-compose exec db reindexdb -U postgres rehabilitation_center
```

### مشكلة: استهلاك عالي للذاكرة

```bash
# التحقق من استهلاك الذاكرة
docker stats

# تنظيف الصور والحاويات غير المستخدمة
docker system prune -a

# زيادة حدود الذاكرة في docker-compose.yml
# mem_limit: 2gb
```

### مشكلة: بطء الأداء

```bash
# فحص قاعدة البيانات
docker-compose exec db pgbench -U postgres rehabilitation_center

# فحص Redis
docker-compose exec redis redis-cli --stat

# تحليل الطلبات البطيئة
# استخدم Sentry أو New Relic
```

---

## ✅ قائمة التحقق قبل الإطلاق

- [ ] جميع متغيرات البيئة محددة
- [ ] شهادة SSL/TLS صالحة
- [ ] النسخ الاحتياطية تعمل
- [ ] المراقبة والتسجيل مفعلة
- [ ] الأمان معزز (UFW, Fail2Ban)
- [ ] اختبارات جميع الوظائف الأساسية
- [ ] الأداء يلبي المتطلبات
- [ ] فريق الدعم مدرب
- [ ] وثائق الطوارئ جاهزة
- [ ] خطة النشر موافق عليها

---

## 📞 الدعم والمساعدة

### للمساعدة الفنية:

```
📧 Email: support@rehabilitation-center.com
🔗 Tickets: https://support.rehabilitation-center.com
📋 Documentation: https://docs.rehabilitation-center.com
💬 Slack Channel: #technical-support
```

### للبلاغات الأمنية:

```
🔒 Email: security@rehabilitation-center.com
🔑 GPG Key: https://rehabilitation-center.com/security.gpg
```

---

**تم الإنشاء:** 15 يناير 2026  
**الإصدار:** 3.0 Production Ready  
**الحالة:** جاهز للنشر الفوري ✅

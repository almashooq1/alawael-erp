# دليل النشر والتطوير | Deployment & Development Guide

**اللغة | Language:** العربية (Arabic) | English  
**آخر تحديث | Last Updated:** January 14, 2026  
**الإصدار | Version:** 1.0

---

## 📚 محتويات | Contents

1. [البدء السريع | Quick Start](#البدء-السريع)
2. [بيئة التطوير | Development Environment](#بيئة-التطوير)
3. [بيئة الإنتاج | Production Environment](#بيئة-الإنتاج)
4. [نشر المشروع | Deployment Process](#نشر-المشروع)
5. [CI/CD Pipeline](#pipelineci-cd)
6. [المراقبة والتسجيل | Monitoring & Logging](#المراقبة-والتسجيل)
7. [استكشاف الأخطاء | Troubleshooting](#استكشاف-الأخطاء)

---

## 🚀 البدء السريع | Quick Start

### المتطلبات | Requirements:

```
✓ Docker 20.10+
✓ Docker Compose 2.0+
✓ Node.js 18+
✓ Git
✓ 4GB RAM (minimum)
✓ 20GB Disk Space
```

### التطوير المحلي | Local Development:

```bash
# استنساخ المستودع | Clone repository
git clone https://github.com/your-org/rehab-system.git
cd rehab-system

# نسخ ملف الإعدادات | Copy environment file
cp .env.example .env

# تشغيل الحاويات | Start containers
docker-compose up -d

# تحقق من الحالة | Check status
docker-compose ps

# وصول التطبيق | Access application
# Frontend: http://localhost:3000
# API: http://localhost:3001/api/v1
# MongoDB: localhost:27017
# Redis: localhost:6379
```

---

## 🛠️ بيئة التطوير | Development Environment

### الإعداد | Setup:

```bash
# 1. تثبيت المتطلبات | Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 2. نسخ ملف الإعدادات | Copy env file
cp .env.example .env

# 3. تعديل الإعدادات | Edit .env
# تغيير قيم قاعدة البيانات والمتغيرات | Update database and API settings

# 4. بدء خوادم التطوير | Start dev servers
cd backend && npm run dev

# في نافذة جديدة | In new terminal:
cd frontend && npm start
```

### الأوامر المفيدة | Useful Commands:

```bash
# بناء الصور | Build images
docker-compose build

# إعادة تشغيل | Restart services
docker-compose restart

# عرض السجلات | View logs
docker-compose logs -f backend

# تنظيف | Clean up
docker-compose down -v

# تشغيل tests | Run tests
docker-compose exec backend npm test

# دخول الـ shell | Access container
docker-compose exec backend sh
```

---

## 🌍 بيئة الإنتاج | Production Environment

### الإعدادات الأمنية | Security Settings:

```bash
# 1. تحديث .env بقيم آمنة
# Update .env with secure values:

NODE_ENV=production
JWT_SECRET=<random_strong_secret>
MONGODB_URI=<production_mongodb_url>
REDIS_URL=<production_redis_url>

# 2. تفعيل HTTPS
# Enable HTTPS in nginx.conf

# 3. إعداد جدار الحماية
# Configure firewall rules
# Allow: 80, 443
# Restrict: 27017, 6379

# 4. النسخ الاحتياطية
# Enable automated backups
```

### النشر | Deployment:

```bash
# 1. بناء الصورة الإنتاجية
# Build production image
docker build -t rehab-system:latest .

# 2. دفع للسجل
# Push to registry
docker tag rehab-system:latest ghcr.io/org/rehab-system:latest
docker push ghcr.io/org/rehab-system:latest

# 3. تحديث الخادم
# Update on server
docker pull ghcr.io/org/rehab-system:latest
docker-compose -f docker-compose.prod.yml up -d

# 4. التحقق من النشر
# Verify deployment
curl https://rehab-system.sa/health
```

---

## 📦 عملية النشر | Deployment Process

### Pre-Deployment Checklist | قائمة التحقق:

```
☐ جميع الاختبارات تمر | All tests pass
☐ لا توجد تحذيرات الأمان | No security warnings
☐ السجلات نظيفة | Logs are clean
☐ النسخ الاحتياطية جاهزة | Backups ready
☐ التكوين محدث | Config updated
☐ الشهادات صالحة | Certificates valid
☐ الموارد كافية | Resources available
☐ خطة التراجع جاهزة | Rollback plan ready
```

### خطوات النشر | Deployment Steps:

```
1. إنشاء نسخة احتياطية | Create Backup
   └─ docker-compose exec backend tar czf backup.tar.gz /app/data

2. سحب الصورة الجديدة | Pull New Image
   └─ docker pull ghcr.io/org/rehab-system:latest

3. اختبار الصورة محلياً | Test Image Locally
   └─ docker run --rm -p 3001:3001 <image-id> npm test

4. إيقاف الخدمات القديمة | Stop Old Services
   └─ docker-compose down

5. بدء الخدمات الجديدة | Start New Services
   └─ docker-compose up -d

6. التحقق من الحالة | Verify Health
   └─ curl http://localhost:3001/health

7. اختبارات الدخان | Smoke Tests
   └─ npm run test:smoke

8. مراقبة السجلات | Monitor Logs
   └─ docker-compose logs -f
```

### خطة التراجع | Rollback Plan:

```bash
# في حالة الفشل | In case of failure:

# 1. إيقاف الخدمات الحالية | Stop current services
docker-compose down

# 2. استعادة من النسخة الاحتياطية | Restore from backup
docker-compose exec backend tar xzf backup.tar.gz -C /

# 3. إعادة بدء الخدمات القديمة | Restart old version
docker-compose up -d

# 4. التحقق من الحالة | Verify status
curl http://localhost:3001/health
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow:

```
Push to Repository
    ↓
1. Lint & Code Quality Check
    ├─ ESLint
    ├─ Prettier
    └─ Code Analysis
    ↓
2. Run Tests
    ├─ Unit Tests
    ├─ Integration Tests
    └─ Security Tests
    ↓
3. Build Docker Image
    ├─ Frontend Build
    ├─ Backend Build
    └─ Push to Registry
    ↓
4. Security Scanning
    ├─ Trivy Scan
    ├─ Dependency Check
    └─ SAST Scan
    ↓
5. Deploy to Staging (if develop branch)
    └─ Auto-deploy to staging
    ↓
6. Deploy to Production (if tag v*.*.*)
    └─ Manual approval required
```

### تفعيل Pipeline | Enable Pipeline:

```yaml
# 1. إضافة الملفات | Add files:
.github/workflows/ci-cd.yml
.github/workflows/production-deploy.yml

# 2. إضافة Secrets | Add secrets:
STAGING_DEPLOY_KEY
STAGING_HOST
STAGING_USER
PROD_DEPLOY_KEY
PROD_HOST
PROD_USER
SLACK_WEBHOOK

# 3. تفعيل على Repository | Enable on repo:
Settings → Actions → Allow all actions
```

---

## 📊 المراقبة والتسجيل | Monitoring & Logging

### المراقبة | Monitoring:

```
الخدمة | Service        | الأداة | Tool           | الرابط | URL
--------+----------------+----------+----------------+------------------
Backend | Prometheus    | :9090    | localhost:9090
Frontend| Sentry        | Dashboard| sentry.io
Database| MongoDB Ops   | :27017   | localhost:27017
Cache  | Redis CLI     | :6379    | localhost:6379
All    | DataDog       | Dashboard| app.datadoghq.com
```

### السجلات | Logging:

```bash
# عرض السجلات | View logs:
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mongodb

# البحث في السجلات | Search logs:
docker-compose logs backend | grep "error"

# تصدير السجلات | Export logs:
docker-compose logs > logs.txt

# تنظيف السجلات القديمة | Clean old logs:
docker-compose exec backend truncate -s 0 /var/log/app.log
```

### التنبيهات | Alerts:

```
مستوى | Level      | الشرط | Condition              | الإجراء | Action
----+-----------+-----------------+-------------------
1    | Critical  | CPU > 90%       | إيقاف وإعادة | Stop & Restart
2    | High      | Memory > 80%    | تنبيه | Alert
3    | Medium    | Errors > 100/min| تسجيل | Log
4    | Low       | Warnings       | مراقبة | Monitor
```

---

## 🔍 استكشاف الأخطاء | Troubleshooting

### المشكلة: "تفشل الحاويات في البدء"

**Problem: "Containers fail to start"**

```bash
# الحل | Solution:
1. فحص السجلات | Check logs
   docker-compose logs

2. التحقق من المتطلبات | Verify requirements
   docker --version
   docker-compose --version

3. تنظيف الحاويات | Clean up containers
   docker-compose down -v

4. إعادة البناء | Rebuild
   docker-compose build --no-cache

5. إعادة البدء | Restart
   docker-compose up -d
```

### المشكلة: "قاعدة البيانات لا تتصل"

**Problem: "Database connection fails"**

```bash
# الحل | Solution:
1. تحقق من MongoDB | Check MongoDB
   docker-compose logs mongodb

2. التحقق من الاتصال | Verify connection
   docker-compose exec backend mongosh mongodb://localhost:27017

3. إعادة تشغيل | Restart
   docker-compose restart mongodb

4. التحقق من .env | Check .env
   grep MONGODB .env
```

### المشكلة: "Memory usage مرتفع جداً"

**Problem: "High memory usage"**

```bash
# الحل | Solution:
1. فحص الاستخدام | Check usage
   docker stats

2. تقليل cache | Reduce cache
   docker-compose exec redis redis-cli FLUSHDB

3. إعادة التشغيل | Restart services
   docker-compose restart

4. التحقق من رشح الذاكرة | Check for memory leak
   docker inspect <container_id> | grep -A 5 Memory
```

---

## 📞 الدعم والمساعدة | Support

```
للمساعدة | For Help:
- التوثيق | Docs: https://docs.rehab-system.sa
- القضايا | Issues: GitHub Issues
- النقاش | Discussions: GitHub Discussions
- البريد | Email: devops@rehab-system.sa
```

---

**آخر تحديث | Last Updated:** January 14, 2026

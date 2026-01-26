# 🚀 دليل تطوير المرحلة 1 - Phase 1 Development Guide

**التاريخ:** 22 يناير 2026  
**الحالة:** ✅ جاهز للنشر على Staging  
**الإصدار:** 2.0.0

---

## 📋 ملخص الحالة الحالية

### ✅ ما تم إنجازه:

1. **ملفات الإنتاج:**
   - ✅ `docker-compose.prod.yml` (377 سطر)
   - ✅ `.env.staging` (جديد اليوم)
   - ✅ `.env.production` (محدّث)
   - ✅ `nginx.conf` (موجود مسبقاً)

2. **توثيق شامل:**
   - ✅ `docs/BACKUP_RECOVERY.md`
   - ✅ `docs/MONITORING_GUIDE.md`
   - ✅ `_PHASE_1_COMPLETION_FINAL.md`

3. **البنية الأساسية:**
   - ✅ Backend API (Node.js/Express)
   - ✅ Frontend (React)
   - ✅ Database (MongoDB)
   - ✅ Cache (Redis)

---

## 🎯 الخطوات التالية (حسب الأولوية)

### المرحلة 1: الإعداد (اليوم - غداً)

#### ✅ الخطوة 1: التحقق من ملفات البيئة
```bash
# التحقق من وجود الملفات
ls -la .env.staging .env.production

# التحقق من صيغة الملفات
cat .env.staging | head -20
cat .env.production | head -20
```

#### 🔄 الخطوة 2: إعداد Docker (إذا لم يكن مثبتاً)

**على Windows:**
```powershell
# تنزيل Docker Desktop
# https://www.docker.com/products/docker-desktop

# التحقق من التثبيت
docker --version
docker-compose --version
```

**على Linux:**
```bash
# تثبيت Docker
sudo apt-get update
sudo apt-get install docker.io docker-compose

# إضافة المستخدم إلى مجموعة docker
sudo usermod -aG docker $USER
```

#### 📁 الخطوة 3: إنشاء المجلدات المطلوبة

```bash
# إنشاء مجلدات البيانات
mkdir -p data/mongodb data/redis logs/backend logs/nginx

# إنشاء مجلد النسخ الاحتياطي
mkdir -p backups/daily backups/weekly backups/monthly

# إنشاء مجلد الشهادات
mkdir -p certs

# تعيين الصلاحيات
chmod 755 data logs backups certs
```

---

### المرحلة 2: النشر على Staging (24-48 ساعة)

#### الخطوة 4: بناء الصور والخدمات

```bash
# الانتقال إلى مجلد المشروع
cd /path/to/alawael-erp

# سحب أحدث كود (إذا كان محفوظ في Git)
git pull origin develop

# بناء الصور
docker-compose -f docker-compose.prod.yml build --no-cache

# التحقق من الصور
docker images | grep alawael
```

#### الخطوة 5: تشغيل الخدمات

```bash
# تشغيل جميع الخدمات
docker-compose -f docker-compose.prod.yml up -d

# التحقق من حالة الخدمات
docker-compose -f docker-compose.prod.yml ps

# عرض السجلات
docker-compose -f docker-compose.prod.yml logs -f backend
```

#### الخطوة 6: اختبار الاتصال

```bash
# اختبار Health Check
curl -k https://staging-api.yourdomain.com/api/health

# اختبار تسجيل الدخول
curl -X POST https://staging-api.yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@alawael.com",
    "password": "Admin@123456"
  }'

# اختبار قاعدة البيانات
curl https://staging-api.yourdomain.com/api/users
```

---

## 🔧 أوامر مفيدة

### إدارة الخدمات

```bash
# إيقاف جميع الخدمات
docker-compose -f docker-compose.prod.yml stop

# إعادة تشغيل خدمة معينة
docker-compose -f docker-compose.prod.yml restart backend

# حذف جميع الخدمات
docker-compose -f docker-compose.prod.yml down

# حذف مع البيانات
docker-compose -f docker-compose.prod.yml down -v
```

### عرض السجلات

```bash
# جميع السجلات
docker-compose -f docker-compose.prod.yml logs

# آخر 100 سطر
docker-compose -f docker-compose.prod.yml logs --tail 100

# السجلات الحية
docker-compose -f docker-compose.prod.yml logs -f

# سجلات خدمة معينة
docker-compose -f docker-compose.prod.yml logs backend -f
```

### الاتصال بالحاويات

```bash
# الدخول إلى حاوية Backend
docker-compose -f docker-compose.prod.yml exec backend bash

# تنفيذ أمر مباشرة
docker-compose -f docker-compose.prod.yml exec backend npm test

# الدخول إلى MongoDB
docker-compose -f docker-compose.prod.yml exec mongodb mongosh
```

---

## 📊 اختبارات التحقق

### 1️⃣ اختبار الصحة الأساسية

```bash
#!/bin/bash
# health-check.sh

echo "🔍 Health Check Tests"
echo "===================="

# Backend Health
echo "✓ Testing Backend Health..."
curl -s https://staging-api.yourdomain.com/api/health | jq .

# MongoDB Status
echo "✓ Testing Database..."
curl -s https://staging-api.yourdomain.com/api/db/status | jq .

# Redis Status
echo "✓ Testing Cache..."
curl -s https://staging-api.yourdomain.com/api/cache/status | jq .

echo "✓ All tests completed"
```

### 2️⃣ اختبار الأداء

```bash
# اختبار نقاط النهاية الرئيسية
for endpoint in "/api/health" "/api/users" "/api/vehicles"; do
  echo "Testing $endpoint..."
  ab -n 100 -c 10 "https://staging-api.yourdomain.com$endpoint"
done
```

---

## 🛡️ قائمة التحقق من الأمان

- [ ] جميع المفاتيح السرية تم تغييرها
- [ ] شهادات SSL تم تثبيتها
- [ ] CORS تم تكوينه بشكل صحيح
- [ ] معدل التحديد (Rate Limiting) فعّال
- [ ] Helmet middleware مفعّل
- [ ] Database passwords قوي
- [ ] Redis password محمي
- [ ] Backup system يعمل
- [ ] Monitoring فعّال
- [ ] Logging يسجل الأخطاء

---

## 📞 الدعم والمساعدة

### في حالة المشاكل:

1. **عرض السجلات:**
   ```bash
   docker-compose -f docker-compose.prod.yml logs --tail 200
   ```

2. **إعادة البناء:**
   ```bash
   docker-compose -f docker-compose.prod.yml down -v
   docker-compose -f docker-compose.prod.yml build --no-cache
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **التحقق من الموارد:**
   ```bash
   docker stats
   docker volume ls
   docker network ls
   ```

---

## 📚 ملفات المراجع

| الملف | الوصف |
|------|-------|
| `docker-compose.prod.yml` | تكوين الخدمات |
| `.env.staging` | متغيرات بيئة Staging |
| `.env.production` | متغيرات بيئة الإنتاج |
| `docs/BACKUP_RECOVERY.md` | استراتيجية النسخ الاحتياطي |
| `docs/MONITORING_GUIDE.md` | نظام المراقبة |
| `nginx.conf` | تكوين Nginx |

---

## ✅ قائمة الإنجاز

- [x] إنشاء ملفات البيئة
- [ ] بناء صور Docker
- [ ] تشغيل الخدمات
- [ ] اختبار الصحة
- [ ] اختبار الأداء
- [ ] إعداد Backup
- [ ] تكوين Monitoring
- [ ] النشر على الإنتاج

---

**تم الإنشاء:** 2026-01-22  
**الإصدار:** 1.0.0  
**الحالة:** جاهز للاستخدام ✅

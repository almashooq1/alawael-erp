# 🧪 اختبار سريع للنظام

# Quick System Test Guide

## 📋 نظرة عامة - Overview

هذا الملف يحتوي على اختبارات سريعة للتأكد من أن **قاعدة البيانات** و **الـ APIs** تعمل بشكل صحيح.

---

## ✅ Pre-requisites

قبل البدء، تأكد من:

```bash
# 1. تشغيل السيرفر
cd backend
npm start

# يجب أن ترى:
# ✅ Connected to MongoDB: alawael-erp
# 🚀 Server is running on port 3001
```

---

## 🧪 الاختبارات - Tests

### اختبار 1: فحص اتصال API

```bash
# Windows PowerShell
Invoke-WebRequest http://localhost:3001/health

# Expected Response:
# {
#   "status": "ok",
#   "database": "connected",
#   "timestamp": "2026-01-13T..."
# }
```

**✅ الحالة:** إذا رأيت `"status": "ok"` فالنظام يعمل!

---

### اختبار 2: استيراد البيانات الأولية

```bash
cd backend
node scripts/seed.js

# Expected Output:
# ✅ Connected to MongoDB
# 🧹 Clearing existing data...
# 🏢 Inserting organization data...
# 👥 Inserting employee data...
# ✅ Data seeding completed successfully!
```

**✅ الحالة:** إذا انتهى بنجاح، البيانات موجودة الآن!

---

### اختبار 3: جلب بيانات المؤسسة

```bash
# PowerShell
Invoke-RestMethod http://localhost:3001/api/organizations | ConvertTo-Json

# Expected Response:
# {
#   "success": true,
#   "data": [
#     {
#       "organizationId": "ORG001",
#       "name": "منظمة الأوائل لتأهيل ذوي الإعاقة",
#       "departments": [...],
#       ...
#     }
#   ]
# }
```

**✅ الحالة:** إذا رأيت البيانات، قاعدة البيانات تعمل!

---

### اختبار 4: جلب بيانات الموظفين

```bash
# PowerShell
Invoke-RestMethod http://localhost:3001/api/employees | ConvertTo-Json

# Expected Response:
# {
#   "success": true,
#   "data": [
#     {
#       "employeeId": "EMP001",
#       "personalInfo": {
#         "firstName": "أحمد",
#         "lastName": "المحمد",
#         ...
#       },
#       ...
#     },
#     ...
#   ]
# }
```

**✅ الحالة:** يجب أن ترى 3 موظفين!

---

### اختبار 5: اختبار AI Endpoint

```bash
# PowerShell - Performance Scoring
$body = @{
    employeeId = "EMP002"
    metrics = @{
        quality = 90
        productivity = 85
        teamwork = 92
        attendance = 95
    }
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:3001/api/ai/performance-score `
    -Method POST `
    -Body $body `
    -ContentType "application/json" | ConvertTo-Json

# Expected Response:
# {
#   "success": true,
#   "data": {
#     "overallScore": 90.5,
#     "weightedScores": {...},
#     "performanceLevel": "متميز",
#     "recommendations": [...]
#   }
# }
```

**✅ الحالة:** إذا حصلت على `overallScore`، الـ AI يعمل!

---

### اختبار 6: اختبار بقاء البيانات

```bash
# خطوات الاختبار:

# 1. تأكد من وجود بيانات
Invoke-RestMethod http://localhost:3001/api/employees | ConvertTo-Json

# 2. أوقف السيرفر
# اضغط Ctrl+C في terminal السيرفر

# 3. شغل السيرفر مرة أخرى
cd backend
npm start

# 4. اطلب البيانات مرة أخرى
Invoke-RestMethod http://localhost:3001/api/employees | ConvertTo-Json

# ✅ يجب أن ترى نفس البيانات!
```

**✅ الحالة:** إذا البيانات موجودة بعد إعادة التشغيل، قاعدة البيانات تعمل بشكل دائم!

---

### اختبار 7: اختبار النسخ الاحتياطي

```bash
cd backend
node scripts/backup.js

# Expected Output:
# 📦 نظام النسخ الاحتياطي - Backup System
# 🔄 Starting MongoDB backup...
# ✅ Backup completed successfully!
# 📁 Backup ID: backup_20260113_143025
```

**✅ الحالة:** إذا انتهى بنجاح، النسخ الاحتياطي يعمل!

---

### اختبار 8: عرض جميع النسخ الاحتياطية

```bash
node scripts/backup.js list

# Expected Output:
# 📋 Available Backups:
#
# 1. backup_20260113_143025
#    Date: 13/01/2026, 14:30:25
#    Size: 2.5 MB
#    Status: completed
```

**✅ الحالة:** يجب أن ترى قائمة بالنسخ الاحتياطية!

---

## 🧪 اختبارات الـ AI (18 endpoint)

### 1. Employee Performance Prediction

```powershell
$body = @{
    employeeId = "EMP002"
    includeFactors = $true
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:3001/api/ai/predict-performance `
    -Method POST -Body $body -ContentType "application/json"
```

### 2. Promotion Readiness

```powershell
$body = @{
    employeeId = "EMP002"
    targetPosition = "مدير تأهيل"
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:3001/api/ai/promotion-readiness `
    -Method POST -Body $body -ContentType "application/json"
```

### 3. Training Recommendations

```powershell
$body = @{
    employeeId = "EMP002"
    focusArea = "leadership"
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:3001/api/ai/training-recommendations `
    -Method POST -Body $body -ContentType "application/json"
```

### 4. Salary Analysis

```powershell
$body = @{
    positionId = "POS003"
    region = "الرياض"
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:3001/api/ai/salary-analysis `
    -Method POST -Body $body -ContentType "application/json"
```

### 5. Department Analytics

```powershell
Invoke-RestMethod http://localhost:3001/api/ai/department-analytics/DEPT002
```

### 6. Organization Health

```powershell
Invoke-RestMethod http://localhost:3001/api/ai/organization-health
```

---

## 📊 النتائج المتوقعة - Expected Results

### ✅ جميع الاختبارات نجحت

إذا نجحت جميع الاختبارات:

```
✅ اختبار 1: API يعمل
✅ اختبار 2: البيانات مستوردة
✅ اختبار 3: المؤسسات موجودة
✅ اختبار 4: الموظفون موجودون
✅ اختبار 5: AI يعمل
✅ اختبار 6: البيانات دائمة
✅ اختبار 7: النسخ الاحتياطي يعمل
✅ اختبار 8: عرض النسخ يعمل

🎉 النظام جاهز للإنتاج!
```

### ❌ بعض الاختبارات فشلت

| الخطأ                       | السبب المحتمل           | الحل                              |
| --------------------------- | ----------------------- | --------------------------------- |
| `ECONNREFUSED`              | السيرفر غير متصل        | `npm start`                       |
| `Cannot find module`        | Packages غير مثبتة      | `npm install`                     |
| `[]` في البيانات            | لم يتم استيراد البيانات | `node scripts/seed.js`            |
| `USE_MOCK_DB` warning       | In-Memory mode          | غير `USE_MOCK_DB=false` في `.env` |
| `MongoDB connection failed` | رابط MongoDB خاطئ       | تحقق من `MONGODB_URI` في `.env`   |

---

## 🔍 تفاصيل إضافية - Additional Details

### فحص Logs

```bash
# في terminal السيرفر، يجب أن ترى:
✅ Connected to MongoDB: alawael-erp
🚀 Server is running on port 3001
⚡ Backend server ready!

# وليس:
⚠️ Using In-Memory Database (temporary storage)
```

### فحص البيانات مباشرة في MongoDB

إذا كنت تستخدم **MongoDB Compass**:

1. افتح MongoDB Compass
2. اتصل بـ: `your-mongodb-uri`
3. افتح database: `alawael-erp`
4. يجب أن ترى:
   - `organizations` collection
   - `employees` collection
   - `aipredictions` collection
   - `systemlogs` collection
   - `backups` collection

---

## 📞 الدعم - Support

إذا واجهت مشاكل:

### مشكلة: السيرفر لا يبدأ

```bash
# افحص الأخطاء
cd backend
npm start

# إذا كان هناك خطأ في Mongoose:
npm install mongoose

# إذا كان هناك خطأ في dotenv:
npm install dotenv
```

### مشكلة: البيانات لا تظهر

```bash
# تأكد من استيراد البيانات
cd backend
node scripts/seed.js

# ثم اطلب البيانات
Invoke-RestMethod http://localhost:3001/api/organizations
```

### مشكلة: AI لا يعمل

```bash
# تأكد من الـ route موجود
cd backend/routes
cat organization.routes.js | Select-String "ai/"

# يجب أن ترى:
# router.post('/ai/performance-score', ...)
# router.post('/ai/predict-performance', ...)
# ...
```

---

## 🎯 الخطوة التالية

بعد نجاح جميع الاختبارات:

### الأولوية 2: جدولة النسخ الاحتياطي (30 دقيقة)

```powershell
# إنشاء Task في Windows
$action = New-ScheduledTaskAction -Execute "node" `
    -Argument "C:\path\to\backend\scripts\backup.js"
$trigger = New-ScheduledTaskTrigger -Daily -At 3am
Register-ScheduledTask -Action $action -Trigger $trigger `
    -TaskName "ERP Backup" -Description "Daily ERP database backup"
```

### الأولوية 3: الدومين والـ SSL (ساعة واحدة)

انظر إلى: `🚀_HOSTINGER_DEPLOYMENT.md`

---

## 📊 Checklist الإكمال

قبل الانتقال للمرحلة التالية:

- [ ] جميع الاختبارات 1-8 نجحت
- [ ] البيانات تُحفظ بعد إعادة التشغيل
- [ ] الـ 18 AI endpoints تعمل
- [ ] النسخ الاحتياطي يعمل بنجاح
- [ ] لا توجد أخطاء في logs
- [ ] `USE_MOCK_DB=false` في `.env`
- [ ] قاعدة البيانات متصلة (MongoDB/Hostinger)

---

**📅 آخر تحديث:** 13 يناير 2026  
**⏱️ الوقت المتوقع:** 15 دقيقة لجميع الاختبارات  
**👨‍💻 الحالة:** جاهز للتنفيذ

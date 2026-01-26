# 🚀 دليل التشغيل السريع - Quick Start Guide

## ✅ الحالة الحالية
- **Backend:** يعمل على Port 3001 ✅
- **Frontend:** يعمل على Port 3002 ✅
- **قاعدة البيانات:** Mock Database ✅
- **المصادقة:** JWT ✅

---

## 📖 التعليمات السريعة

### 1️⃣ بدء النظام من الصفر

#### الطريقة الأولى: من جهازك
```bash
# Terminal 1 - Backend
cd erp_new_system/backend
npm install  # إذا لم تقم بتثبيت الـ dependencies
npm start

# ستظهر هذه الرسالة:
# ✅ Server running on port 3001
```

```bash
# Terminal 2 - Frontend
cd erp_new_system/frontend
npm install  # إذا لم تقم بتثبيت الـ dependencies
npm start    # Dev server على port 3000
# أو استخدم:
serve -s build -l 3002
```

#### الطريقة الثانية: Using Docker
```bash
docker-compose -f docker-compose.production.yml up
```

### 2️⃣ الوصول للنظام

افتح المتصفح:
```
http://localhost:3002
```

### 3️⃣ تسجيل الدخول

استخدم أحد الحسابات التالية:

| البريد | كلمة المرور | الدور |
|------|-----------|------|
| admin@alawael.com | Admin@123456 | مسؤول النظام |
| hr@alawael.com | Admin@123456 | مدير الموارد البشرية |
| finance@alawael.com | Admin@123456 | الحسابات |
| teacher@alawael.com | Admin@123456 | معلم |
| driver@alawael.com | Admin@123456 | سائق |

---

## 🧪 اختبار الـ API

### استخدام PowerShell/Terminal:

#### 1. فحص صحة النظام
```powershell
Invoke-WebRequest -Uri 'http://localhost:3001/api/health' -UseBasicParsing
```

#### 2. تسجيل الدخول والحصول على Token
```powershell
$body = @{
    email = 'admin@alawael.com'
    password = 'Admin@123456'
} | ConvertTo-Json

$response = Invoke-WebRequest `
    -Uri 'http://localhost:3001/api/auth/login' `
    -Method Post `
    -Body $body `
    -ContentType 'application/json' `
    -UseBasicParsing

$json = $response.Content | ConvertFrom-Json
$token = $json.data.accessToken
Write-Host "Token: $token"
```

#### 3. الحصول على بيانات المستخدم
```powershell
$headers = @{
    'Authorization' = "Bearer $token"
}

Invoke-WebRequest `
    -Uri 'http://localhost:3001/api/auth/me' `
    -Headers $headers `
    -UseBasicParsing
```

#### 4. البحث
```powershell
Invoke-WebRequest `
    -Uri 'http://localhost:3001/api/search/full-text?query=test' `
    -UseBasicParsing
```

#### 5. إدارة المركبات
```powershell
Invoke-WebRequest `
    -Uri 'http://localhost:3001/api/vehicles' `
    -UseBasicParsing
```

---

## 🎯 المميزات الرئيسية

### 🔐 المصادقة والتحكم بالوصول
- تسجيل دخول آمن بـ JWT
- تحكم الوصول حسب الأدوار (RBAC)
- إدارة الجلسات

### 🔍 البحث المتقدم
- بحث نصي شامل
- بحث غير دقيق (Fuzzy Search)
- اقتراحات البحث الذكية

### 🚗 إدارة المركبات
- إضافة وتعديل وحذف مركبات
- تتبع حالة المركبات
- التقارير

### 🎮 نظام الألعاب (Gamification)
- شارات (Badges)
- نقاط (Points)
- التصنيفات (Leaderboards)

### 💬 التواصل الفوري
- WebSocket للرسائل الفورية
- الإشعارات الفورية
- تحديثات مباشرة

---

## 🛑 إيقاف النظام

```bash
# اضغط Ctrl+C في كلا Terminal
```

أو من PowerShell:
```powershell
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
```

---

## 🔧 استكشاف الأخطاء

### مشكلة: Backend لا يبدأ

```bash
# تحقق من المنفذ
netstat -ano | findstr :3001

# أو إذا كان مشغول:
Get-Process node | Stop-Process -Force
npm start
```

### مشكلة: Frontend لا يعمل

```bash
# تثبيت الـ dependencies
npm install

# تنظيف الـ cache
rm -r node_modules
npm install

# ثم التشغيل
npm start
```

### مشكلة: CORS Error

تأكد من:
1. Backend يعمل على 3001
2. Frontend يصل إلى http://localhost:3001/api
3. الـ environment variables صحيحة

---

## 📊 رسائل النجاح

عندما يبدأ Backend بنجاح:
```
✅ Server running on port 3001
✅ Database connected
✅ WebSocket enabled
```

عندما يبدأ Frontend بنجاح:
```
http://localhost:3002
```

---

## 📝 البيئة والإعدادات

### متغيرات Backend (.env):
```env
NODE_ENV=development
PORT=3001
USE_MOCK_DB=true
USE_MOCK_CACHE=true
JWT_SECRET=your_secret_key_here
```

### متغيرات Frontend (.env):
```env
REACT_APP_API_URL=http://localhost:3001/api
```

---

## 🚀 الإنتاج (Production)

### بناء Frontend للإنتاج:
```bash
cd frontend
npm run build
```

### نشر على الإنتاج:
```bash
docker-compose -f docker-compose.production.yml up -d
```

---

## 📞 الدعم السريع

### البيانات الافتراضية:
```
Email:    admin@alawael.com
Password: Admin@123456
```

### الروابط الرئيسية:
```
Frontend:    http://localhost:3002
API:         http://localhost:3001/api
Health:      http://localhost:3001/api/health
```

### الأوامر المهمة:
```bash
npm install   # تثبيت الـ dependencies
npm start     # بدء التطوير
npm run build # بناء للإنتاج
npm test      # تشغيل الاختبارات
```

---

## ✅ قائمة التحقق

- [ ] Backend يعمل على 3001
- [ ] Frontend يعمل على 3002
- [ ] يمكن الوصول إلى http://localhost:3002
- [ ] يمكن تسجيل الدخول بـ admin@alawael.com
- [ ] API responses صحيحة
- [ ] WebSocket متصل
- [ ] البحث يعمل
- [ ] المركبات تظهر

---

**آخر تحديث:** 22 يناير 2026
**جاهز للاستخدام الفوري** ✅

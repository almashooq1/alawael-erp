# 🚀 دليل تشغيل ALAWAEL محليا

**التاريخ:** 23 فبراير 2026  
**الحالة:** ✅ جاهز للتشغيل الفوري  
**الوقت المتوقع:** 15-30 دقيقة

---

## 📋 المتطلبات المُسبقة

تأكد من تثبيت:

```bash
✅ Node.js 18+ (تحقق: node --version)
✅ npm 8+ (تحقق: npm --version)
✅ Git (تحقق: git --version)
✅ MongoDB 5.0+ (محلي أو cloud - اختياري)
```

---

## 🎯 اختر أحد المشروعات للتشغيل

### **الخيار 1: ALAWAEL Backend (المُوصى به)**
المجلد: `backend/`  
الوصف: Backend كامل مع 100+ API endpoint

### **الخيار 2: ERP System**
المجلد: `erp_new_system/backend/`  
الوصف: نظام ERP متكامل

### **الخيار 3: Frontend React**
المجلد: `frontend/` أو `erp_new_system/frontend/`  
الوصف: واجهة المستخدم

---

## 🔥 التشغيل السريع (Backend)

### الخطوة 1: افتح Terminal في المشروع

```bash
cd c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666\backend
```

### الخطوة 2: تثبيت المزودات (Dependencies)

```bash
npm install
```

⏱️ الوقت: 2-5 دقائق

### الخطوة 3: اضبط متغيرات البيئة

```bash
# نسخ الملف النموذجي
cp .env.example .env

# أو استخدم هذا الملف القياسي:
```

**أنشئ ملف `.env` محلي:**

```env
# Server
NODE_ENV=development
PORT=3000
HOST=localhost

# Database (MongoDB)
DATABASE_URL=mongodb://localhost:27017/alawael-dev

# JWT
JWT_SECRET=your-secret-key-change-this-in-production
JWT_EXPIRE=7d
REFRESH_TOKEN_EXPIRE=30d

# Logging
LOG_LEVEL=debug

# Disable production checks for dev
SKIP_ENV_VALIDATION=true
```

### الخطوة 4: شغّل الخادم

```bash
# الخيار 1: التشغيل العادي
npm start

# الخيار 2: تطوير مع تحديث تلقائي (إذا كان nodemon مُثبتًا)
npm run dev

# الخيار 3: تشغيل آمن (بدون الواجهة)
npm run start:safe
```

✅ **النتيجة المتوقعة:**
```
Server running on http://localhost:3000
Database connected to MongoDB
Health check: http://localhost:3000/api/health
```

---

## 🧪 اختبار الخادم

### اختبار سريع للصحة (Health Check)

**في نافذة Terminal جديدة:**

```bash
# اختبار بسيط
curl http://localhost:3000/api/health

# أو استخدم PowerShell
Invoke-WebRequest -Uri http://localhost:3000/api/health
```

**النتيجة المتوقعة:**
```json
{
  "status": "OK",
  "timestamp": "2026-02-23T...",
  "mongodb": "connected"
}
```

### تشغيل الاختبارات الآلية

```bash
# تشغيل الاختبارات الأساسية
npm run test:core

# تشغيل جميع الاختبارات
npm test

# تشغيل الاختبارات مع مراقبة مستمرة
npm run test:core:watch
```

---

## 🌐 تشغيل Frontend

### الخطوة 1: اذهب لمجلد Frontend

```bash
cd ../frontend
```

### الخطوة 2: تثبيت المزودات

```bash
npm install
```

### الخطوة 3: شغّل الخادم

```bash
npm start
```

✅ **النتيجة:**
- سيفتح متصفح تلقائيًا على `http://localhost:3000`
- الواجهة تتصل تلقائيًا بـ Backend على `http://localhost:3000`

---

## 🐳 تشغيل باستخدام Docker (اختياري)

### الخيار 1: Docker Desktop

```bash
# بناء الصورة
docker build -t alawael-backend:latest .

# تشغيل الحاوية
docker run -d \
  --name alawael-server \
  -p 3000:3000 \
  -e DATABASE_URL=mongodb://host.docker.internal:27017/alawael-dev \
  alawael-backend:latest

# التحقق
docker ps
docker logs alawael-server

# الإيقاف
docker stop alawael-server
```

### الخيار 2: Docker Compose

```bash
# في مجلد root المشروع
docker-compose up

# أو في الخلفية
docker-compose up -d

# الإيقاف
docker-compose down
```

---

## 📊 المنافذ المستخدمة

| الخدمة | المنفذ | العنوان |
|------|-------|--------|
| **Backend** | 3000 | http://localhost:3000 |
| **Frontend** | 3000* | http://localhost:3000 |
| **MongoDB** | 27017 | localhost:27017 |
| **Redis** (اختياري) | 6379 | localhost:6379 |

*Frontend يستخدم نفس المنفذ بعد البناء

---

## 🔗 API Endpoints للاختبار

### تسجيل الدخول

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@alawael.com",
    "password": "password123"
  }'
```

### الحصول على المستخدمين

```bash
# بدون التحقق (قد تحتاج رمز Bearer)
curl http://localhost:3000/api/users

# مع الرمز (استبدل TOKEN بالرمز الفعلي)
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/users
```

### الحصول على المنتجات

```bash
curl http://localhost:3000/api/products
```

---

## 🛠️ استكشاف الأخطاء

### المشكلة: "Port 3000 already in use"

```bash
# Windows - البحث عن العملية
netstat -ano | findstr :3000

# إيقاف العملية (استبدل PID)
taskkill /PID <PID> /F

# أو غيّر المنفذ في .env
PORT=3001
```

### المشكلة: "MongoDB connection failed"

```bash
# تحقق من MongoDB
mongosh

# أو استخدم بدون MongoDB مؤقتًا
DATABASE_URL='' npm start
```

### المشكلة: "npm install فشل"

```bash
# امسح cache
npm cache clean --force

# حاول مرة أخرى
npm install
```

### المشكلة: "Module not found"

```bash
# أعد تثبيت المزودات
rm -r node_modules package-lock.json
npm install
```

---

## 🎯 الخطوات الكاملة (نسخة سريعة)

```bash
# 1. اذهب للمشروع
cd backend

# 2. ثبِّت المزودات
npm install

# 3. أنشئ ملف .env (انسخ المطلوب أعلاه)
# (أنشئ الملف .env يدويًا في المجلد)

# 4. شغِّل الخادم
npm start

# 5. في Terminal جديد - اختبر الصحة
curl http://localhost:3000/api/health

# ✅ تم! الخادم يعمل الآن
```

---

## 📱 اختبار كامل Stack

```bash
# Terminal 1: تشغيل Backend
cd backend
npm install
npm start

# Terminal 2: تشغيل Frontend
cd frontend
npm install
npm start

# ✅ الأن لديك:
# - Backend على http://localhost:3000
# - Frontend على http://localhost:3000 (بعد البناء)
```

---

## 🔍 مراقبة الخادم أثناء التشغيل

### استخدم أحد هذه الأدوات:

#### 1. **Postman** (للاختبارات)
```bash
# استورد الـ Collection من:
postman/ERP_API_Postman_Collection.json
```

#### 2. **Insomnia**
```bash
# مشابه لـ Postman
```

#### 3. **curl** (من Terminal)
```bash
curl -i http://localhost:3000/api/health
```

#### 4. **VS Code REST Client**
```bash
# اضغط على "Send Request" على الـ API

GET http://localhost:3000/api/health
```

---

## 📊 ملفات السجلات

تجد السجلات هنا:

```
/logs/
├─ combined.log      (جميع السجلات)
├─ error.log         (الأخطاء فقط)
└─ access.log        (طلبات HTTP)
```

عرضها:

```bash
# آخر 50 سطر
tail -50 logs/combined.log

# البحث عن أخطاء
grep ERROR logs/combined.log

# مراقبة مستمرة
tail -f logs/combined.log
```

---

## ⚡ نصائح الأداء

### تطوير سريع

```bash
# استخدم nodemon للتحديث التلقائي
npm install -g nodemon

# ثم شغِّل
nodemon server.js
```

### تصحيح أخطاء

```bash
# تشغيل مع تصحيح (Debug)
node --inspect server.js

# ثم افتح:
chrome://inspect
```

### اختبارات مستمرة

```bash
# مراقبة الاختبارات
npm run test:core:watch
```

---

## 📦 Database Setup (اختياري)

### تثبيت MongoDB محليًا

#### Windows:

```bash
# تحميل Installer من:
# https://www.mongodb.com/try/download/community

# أو باستخدام Chocolatey
choco install mongodb-community

# ابدأ الخدمة
mongosh
```

#### macOS:

```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

#### Docker:

```bash
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password \
  mongo:latest
```

---

## 🎉 الخطوة التالية

بعد التشغيل بنجاح:

1. ✅ تحقق من `http://localhost:3000/api/health`
2. ✅ اختبر بعض الـ endpoints
3. ✅ شغِّل الاختبارات الآلية
4. ✅ استكشف الكود
5. ✅ اصنع تعديلاتك!

---

## 📚 الملفات المهمة

| الملف | الوصف |
|------|-------|
| `server.js` | نقطة الدخول الرئيسية |
| `package.json` | المزودات والأوامر |
| `.env` | متغيرات البيئة |
| `routes/` | نقاط النهاية (Endpoints) |
| `models/` | نماذج Database |
| `controllers/` | المنطق التجاري |
| `middleware/` | الوسيطات |
| `tests/` | الاختبارات |

---

## 🆘 تحتاج مساعدة؟

```bash
# اعرض جميع الأوامر المتاحة
npm run

# اعرض معلومات الحزمة
npm info

# تحقق من الإصدارات
node --version && npm --version
```

---

## ✅ قائمة التحقق

قبل البدء:

- [ ] تثبيت Node.js 18+
- [ ] تثبيت npm 8+
- [ ] نسخ المشروع محليًا
- [ ] إنشاء ملف .env
- [ ] تثبيت المزودات (npm install)
- [ ] تشغيل الخادم (npm start)
- [ ] اختبار Health check
- [ ] تشغيل الاختبارات

---

**الآن أنت جاهز للتطوير! 🚀**


# ⚡ تشغيل ALAWAEL محليا - البدء السريع (5 دقائق)

**الوقت:** 5 دقائق فقط  
**المتطلبات:** Node.js 18+, npm 8+  
**الهدف:** تشغيل Backend أو Frontend محليا

---

## 🚀 الطريقة الأسرع (استخدم Script)

### ✅ الخيار 1: تشغيل مباشر (الأسهل)

```bash
# في Windows - استخدم أحد هاتين:

# الطريقة 1: PowerShell (موصى به)
.\START_LOCAL_DEVELOPMENT.ps1

# الطريقة 2: CMD
START_LOCAL_DEVELOPMENT.bat
```

### ثم اختر:
```
1. Backend (الموصى به)
2. ERP System
3. Frontend
4. Full Stack
```

---

## 📝 الطريقة اليدوية (إذا لم ينجح Script)

### للـ Backend:

```bash
# 1. افتح Terminal
cd backend

# 2. ثبِّت المزودات
npm install

# 3. أنشئ ملف .env (انسخ هذا):
notepad .env
```

**محتوى `.env`:**
```env
NODE_ENV=development
PORT=3000
DATABASE_URL=mongodb://localhost:27017/alawael-dev
JWT_SECRET=change-this-secret
```

```bash
# 4. شغِّل الخادم
npm start

# ✅ يجب أن تحصل على:
# Server running on http://localhost:3000
```

### للـ Frontend:

```bash
# 1. افتح Terminal
cd frontend

# 2. ثبِّت المزودات
npm install

# 3. شغِّل
npm start

# ✅ سيفتح المتصفح تلقائيا على http://localhost:3000
```

---

## ✅ اختبر أن كل شيء يعمل

### في Terminal جديد:

```bash
# اختبر API
curl http://localhost:3000/api/health

# أو في PowerShell
Invoke-WebRequest -Uri http://localhost:3000/api/health
```

### النتيجة المتوقعة:
```json
{
  "status": "OK",
  "mongodb": "connected"
}
```

---

## 🛠️ إذا حدثت مشاكل

### **المشكلة: "Port 3000 already in use"**

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <رقم> /F

# أو غيّر المنفذ في .env
PORT=3001
```

### **المشكلة: "npm install تفشل"**

```bash
npm cache clean --force
npm install
```

### **المشكلة: "MongoDB not found"**

```bash
# اترك DATABASE_URL فارغة مؤقتا
DATABASE_URL=
npm start
```

---

## 📊 الهيكل السريع

```
مشروعك/
├── backend/              ← Node.js + Express
│   ├── package.json
│   ├── server.js
│   └── .env
│
├── frontend/             ← React
│   ├── package.json
│   ├── src/
│   └── .env
│
└── erp_new_system/       ← نظام ERP كامل
    ├── backend/
    └── frontend/
```

---

## 🎯 الأوامر الشهيرة

```bash
# البدء
npm start

# التطوير (تحديث تلقائي)
npm run dev

# الاختبارات
npm test

# البناء
npm run build

# التنسيق
npm run format

# الفحص
npm run lint
```

---

## ✨ نصائح

1. **شغِّل Backend أولا** - Frontend يتطلبه
2. **لا تحتاج MongoDB محليا** - يمكنك تجاهل قاعدة البيانات أولا
3. **استخدم VSCode** - لتعديل الكود بسهولة
4. **افتح Terminal منفصل** - لكل مشروع (Backend و Frontend)

---

## 🎉 تم!

الآن لديك:
- ✅ Backend يعمل على port 3000
- ✅ Frontend يعمل على port 3000
- ✅ API endpoints جاهزة للاختبار
- ✅ الكود جاهز للتعديل

---

## 📱 الخطوة التالية

1. **استكشف الكود** في VS Code
2. **عدّل ملف** ولاحظ التحديث التلقائي
3. **اختبر API** باستخدام Postman أو curl
4. **اقرأ الوثائق** في `docs/` أو `README.md`

---

**✅ بدأت بنجاح! 🚀**


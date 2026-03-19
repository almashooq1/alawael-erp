# دليل تشغيل المشروع محلياً

## ✅ حالة النظام

| المكون | الحالة | الإصدار |
|--------|--------|---------|
| Node.js | ✅ متوفر | v22.20.0 |
| NPM | ✅ متوفر | 11.8.0 |
| MongoDB | ✅ تعمل | 7.0 (Docker) |

---

## ⚠️ مطلوب: تثبيت MongoDB

### الخيار 1: MongoDB Atlas (مجاني - موصى به)
1. اذهب إلى: https://www.mongodb.com/cloud/atlas/register
2. أنشئ حساب مجاني
3. أنشئ Cluster مجاني
4. احصل على Connection String
5. أضفه في `backend/.env`:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/alawael
```

### الخيار 2: تثبيت MongoDB محلياً
```powershell
# باستخدام Chocolatey
choco install mongodb

# أو تحميل من الموقع
# https://www.mongodb.com/try/download/community
```

### الخيار 3: Docker (الأسرع)
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

---

## 🚀 خطوات التشغيل

### 1. إعداد Backend
```bash
cd backend

# تثبيت المتطلبات
npm install

# إنشاء ملف .env
echo NODE_ENV=development > .env
echo PORT=5000 >> .env
echo MONGODB_URI=mongodb://localhost:27017/alawael >> .env
echo JWT_SECRET=your-secret-key-here >> .env

# تشغيل الخادم
npm run dev
```

### 2. إعداد Frontend
```bash
cd frontend

# تثبيت المتطلبات
npm install

# تشغيل الواجهة
npm start
```

---

## 📋 عناوين الوصول

| الخدمة | العنوان |
|--------|---------|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:5000 |
| MongoDB | localhost:27017 |

---

## 🔧 استكشاف الأخطاء

### خطأ الاتصال بـ MongoDB
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**الحل:** تأكد من تشغيل MongoDB أو استخدم Atlas

### خطأ في المنفذ
```bash
# التحقق من المنفذ 5000
netstat -ano | findstr :5000
```

---

## 🎉 البدء السريع (بعد تثبيت MongoDB)

```bash
# Terminal 1 - Backend
cd backend && npm install && npm run dev

# Terminal 2 - Frontend
cd frontend && npm install && npm start

# افتح المتصفح على
# http://localhost:3000
```

---

## 📦 الثغرات الأمنية

| المكون | الثغرات | الحالة |
|--------|---------|--------|
| Backend | 0 | ✅ آمن |
| Frontend | 5 | ⚠️ غير حرجة (في react-scripts) |
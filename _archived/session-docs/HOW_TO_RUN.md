# 🚀 كيفية تشغيل المشروع

## الطريقة الأولى: تشغيل محلي (Local Development)

### 1️⃣ تثبيت التبعيات
```bash
# Backend
cd backend
npm install

# Frontend (في نافذة جديدة)
cd frontend
npm install
```

### 2️⃣ إعداد ملف .env
```bash
# في مجلد backend، انسخ الملف_example
copy .env.example .env

# أو أنشئ ملف .env بالمتغيرات التالية:
```

```env
# backend/.env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/alawael-erp
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3001
```

### 3️⃣ تشغيل MongoDB و Redis
```bash
# باستخدام Docker
docker run -d --name mongodb -p 27017:27017 mongo:7.0
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

### 4️⃣ تشغيل الخادم
```bash
# Backend (في نافذة)
cd backend
npm run dev

# Frontend (في نافذة جديدة)
cd frontend
npm start
```

### ✅ النتيجة
- Backend: http://localhost:3000
- Frontend: http://localhost:3001
- Health Check: http://localhost:3000/health

---

## الطريقة الثانية: Docker Compose (الأسهل)

### 1️⃣ تشغيل الكل
```bash
# في المجلد الرئيسي
docker-compose up -d --build
```

### 2️⃣ فحص الحالة
```bash
docker-compose ps
docker-compose logs -f backend
```

### 3️⃣ إيقاف
```bash
docker-compose down
```

---

## أوامر سريعة

```bash
# فحص صحة النظام
curl http://localhost:3000/health

# عرض السجلات
docker-compose logs -f

# إعادة البناء
docker-compose up -d --build

# حذف الكل
docker-compose down -v
```

---

## 📞 للمساعدة
راجع ملف: `PROJECT_OPTIMIZATION_REPORT.md`
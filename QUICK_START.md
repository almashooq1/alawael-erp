# 🚀 Quick Start Guide

## خطوات البدء السريعة

### 1️⃣ المتطلبات الأساسية (5 دقائق)

```bash
# تحقق من الإصدارات
node --version          # 16+ required
npm --version          # 7+ required
git --version          # 2.35+ required

# تثبيت Node.js (if needed)
# Windows: https://nodejs.org
# macOS: brew install node
# Linux: apt-get install nodejs npm
```

### 2️⃣ استنساخ وإعداد المشروع (10 دقائق)

```bash
# استنسخ المستودع
git clone https://github.com/almashooq1/alawael-erp.git
cd alawael-erp

# تثبيت جميع المكتبات
npm install

# الذهاب للـ backend
cd backend
npm install

# العودة للجذر
cd ..
```

### 3️⃣ تكوين البيئة (5 دقائق)

```bash
# انسخ ملف البيئة
cp .env.example .env

# أو أنشئ .env يدويًا:
```

**محتوى `.env` الأساسي:**
```env
# Backend
NODE_ENV=development
PORT=3001
API_URL=http://localhost:3001

# Frontend  
VITE_API_URL=http://localhost:3001
VITE_APP_TITLE=AlAwael ERP

# Database
DB_TYPE=sqlite
DB_PATH=./data/app.db

# JWT
JWT_SECRET=your-secret-key-change-this
JWT_EXPIRY=7d

# Optional Services
ENABLE_NATS=false
ENABLE_ELK=false
```

### 4️⃣ تشغيل البرنامج (5 دقائق)

**الطريقة 1: في نافذة واحدة (الأسهل)**

```bash
# من جذر المشروع
npm run dev:all
# سيشغل backend و frontend معًا
```

**الطريقة 2: في نوافذ منفصلة (الأفضل)**

```bash
# نافذة Terminal 1: Backend
cd backend
npm start
# 🟢 Server running on http://localhost:3001

# نافذة Terminal 2: Frontend  
cd frontend/admin-dashboard
npm run dev
# 🟢 Frontend running on http://localhost:5173
```

### 5️⃣ تحقق من صحة التثبيت ✅

```bash
# تحقق من صحة API
curl http://localhost:3001/health

# في المتصفح:
# Frontend: http://localhost:5173
# API Docs: http://localhost:3001/api-docs
```

---

## 📌 الأوامر الأساسية

| الأمر | الوصف |
|------|-------|
| `npm test` | تشغيل جميع الاختبارات |
| `npm run lint` | فحص جودة الكود |
| `npm run build` | بناء للإنتاج |
| `docker-compose up` | تشغيل جميع الخدمات |

---

## 🐛 استكشاف الأخطاء الشائعة

### ❌ "Cannot find module"
```bash
rm -rf node_modules package-lock.json
npm install
```

### ❌ "Port already in use"
```bash
# على Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# على macOS/Linux
lsof -i :3001
kill -9 <PID>
```

### ❌ "Database connection error"
```bash
# تأكد من وجود مجلد data
mkdir -p ./data
# أو شغل migration
npm run db:migrate
```

---

## 📚 المراجع المفيدة

- [API Documentation](http://localhost:3001/api-docs)
- [Contributing Guide](./CONTRIBUTING.md)
- [Project Status](./PROJECT_STATUS_REPORT.md)
- [Backend README](./backend/README.md)

---

## ✨ الخطوة التالية؟

1. اقرأ [CONTRIBUTING.md](./CONTRIBUTING.md)
2. جرّب تعديل endpoint بسيط
3. أنشئ branch وقدم PR

**Happy coding! 🚀**

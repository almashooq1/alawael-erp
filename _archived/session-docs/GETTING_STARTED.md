# 🚀 دليل البدء السريع - Supply Chain Management

## ⚡ البدء في 30 ثانية

### 1️⃣ Backend - خادم Express

```bash
cd supply-chain-management/backend

# تشغيل الخادم
npm start

# ✅ الخادم على: http://localhost:3000
```

### 2️⃣ Frontend - تطبيق React

```bash
cd supply-chain-management/frontend

# تشغيل التطبيق
npm start

# ✅ التطبيق على: http://localhost:3000 (أو http://localhost:3001)
```

---

## 🧪 تشغيل الاختبارات

### Backend Tests

```bash
cd supply-chain-management/backend

npm test                # تشغيل جميع الاختبارات
npm run test:watch     # وضع المراقبة
npm run test:coverage  # تغطية الاختبارات
```

### Frontend Tests

```bash
cd supply-chain-management/frontend

npm test               # تشغيل الاختبارات
npm run test:watch    # وضع المراقبة
npm run test:coverage # تغطية الاختبارات
```

---

## 📊 الهيكل

```
supply-chain-management/
├── backend/          (Express + MongoDB)
│   ├── routes/       API Routes
│   ├── models/       Data Models
│   ├── services/     Business Logic
│   ├── controllers/  Request Handlers
│   ├── middleware/   Auth & Validation
│   └── tests/        190+ Unit Tests
│
└── frontend/         (React + Ant Design)
    ├── src/
    │   ├── components/ React Components
    │   └── pages/      Page Components
    └── public/         Static Assets
```

---

## ✅ الحالة الحالية

| المكون   | الاختبارات | الثغرات | الحالة  |
| -------- | ---------- | ------- | ------- |
| Backend  | 190 ✅     | 0       | 🟢 جاهز |
| Frontend | Ready      | 0       | 🟢 جاهز |

---

## 🔧 الإعدادات السريعة

```bash
# Backend - تطوير مع nodemon
npm run dev

# Frontend - بناء الإنتاج
npm run build

# كلا الجانبين - اختبارات
npm test

# كلا الجانبين - تغطية الاختبارات
npm run test:coverage
```

---

**آخر تحديث**: 2026-03-01 | **الحالة**: 🟢 جاهز للإنتاج

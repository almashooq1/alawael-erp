# 🚀 تشغيل النظام محلياً - دليل سريع

## تشغيل Backend + Frontend معاً

### الطريقة 1: تشغيل تلقائي (موصى به)

```powershell
# من مجلد المشروع
.\start_local.ps1
```

هذا السكربت سيقوم بـ:

- ✅ تشغيل Backend على المنفذ 5000
- ✅ تشغيل Frontend على المنفذ 3000
- ✅ فتح المتصفح تلقائياً

---

### الطريقة 2: تشغيل يدوي

#### نافذة 1 - Backend:

```powershell
cd backend
npm start
```

#### نافذة 2 - Frontend:

```powershell
cd frontend
npm start
```

---

## 🧪 اختبار النظام

### 1. فحص Backend:

```
http://localhost:5000/api/health
```

### 2. فتح Frontend:

```
http://localhost:3000
```

### 3. بيانات تسجيل الدخول للاختبار:

```
Email: admin@example.com
Password: Admin@123
```

---

## 🔧 استكشاف الأخطاء

### Backend لا يعمل:

```powershell
cd backend
npm install
npm start
```

### Frontend لا يعمل:

```powershell
cd frontend
npm install
npm start
```

### المنفذ مشغول:

```powershell
# إيقاف جميع عمليات Node
Get-Process -Name node | Stop-Process -Force
```

---

## 📊 المنافذ المستخدمة

- Backend API: `http://localhost:5000`
- Frontend: `http://localhost:3000`
- MongoDB: `localhost:27017` (إذا كان مثبت)

---

## ⚡ أوامر سريعة

```powershell
# إيقاف كل شيء
Get-Process -Name node | Stop-Process -Force

# إعادة التشغيل
.\start_local.ps1

# مشاهدة السجلات
Get-Content backend\logs\backend.log -Tail 50 -Wait
```

---

**آخر تحديث:** 2026-01-19

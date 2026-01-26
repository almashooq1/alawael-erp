# ⚡ دليل التشغيل السريع - نظام ERP الأوائل

## 🚀 تشغيل النظام في 30 ثانية

### الخطوة 1: تشغيل Backend

```powershell
cd "c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666\backend"
node server.js
```

**النتيجة:** Backend يعمل على http://localhost:3001

### الخطوة 2: تشغيل Frontend (نافذة جديدة)

```powershell
cd "c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666\frontend\build"
python -m http.server 3002
```

**النتيجة:** Frontend يعمل على http://localhost:3002

### الخطوة 3: تسجيل الدخول

افتح المتصفح: http://localhost:3002

```
Email: admin@alawael.com
Password: Admin@123456
```

---

## ⚡ أوامر سريعة

### إيقاف جميع العمليات

```powershell
taskkill /F /IM node.exe
taskkill /F /IM python.exe
```

### اختبار API مباشرةً

```powershell
# Login Test
$body = '{"email":"admin@alawael.com","password":"Admin@123456"}'
Invoke-WebRequest -Uri "http://localhost:3001/api/auth/login" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
```

### فحص الحالة

```powershell
# Backend Health
Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing

# Frontend
Invoke-WebRequest -Uri "http://localhost:3002" -UseBasicParsing
```

---

## 📚 الوثائق الكاملة

راجع: [⚡_COMPREHENSIVE_SYSTEM_STATUS.md](⚡_COMPREHENSIVE_SYSTEM_STATUS.md)

---

## ✅ الحالة الحالية

- ✅ Backend: **ONLINE** على Port 3001
- ✅ Frontend: **ONLINE** على Port 3002
- ✅ Authentication: **يعمل**
- ✅ Database: **In-Memory MongoDB جاهز**

---

**تم التحديث:** 19 يناير 2026

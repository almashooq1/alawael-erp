# 🚀 دليل البدء السريع - 5 دقائق

**تاريخ:** 16 يناير 2026

---

## 1️⃣ تشغيل النظام (في الحال)

### خطوة أولى: فتح Terminal

```powershell
# Windows PowerShell
cd C:\Users\x-be\OneDrive\المستندات\04-10-2025\66666
```

### خطوة ثانية: تشغيل Backend

```bash
cd backend
npm install  # (إذا لم تثبت من قبل)
npm start
```

**النتيجة المتوقعة:**

```
✅ Server running on http://localhost:3001
✅ Database connected
✅ Socket.IO enabled
```

### خطوة ثالثة: تشغيل Frontend (Terminal منفصل)

```bash
cd frontend
npm install  # (إذا لم تثبت من قبل)
npm run dev
```

**النتيجة المتوقعة:**

```
✅ Frontend running on http://localhost:3000
✅ Vite dev server ready
```

---

## 2️⃣ تسجيل الدخول

### الدخول إلى النظام

اذهب إلى: **http://localhost:3000**

### استخدم أحد الحسابات الجاهزة:

```
📋 Admin:
   Username: admin
   Password: admin123

📋 Manager:
   Username: manager
   Password: manager123

📋 Employee:
   Username: employee
   Password: employee123
```

---

## 3️⃣ استكشاف الصفحات

بعد تسجيل الدخول، تصفّح:

| الصفحة         | الرابط       | الوصف                 |
| -------------- | ------------ | --------------------- |
| **Dashboard**  | `/dashboard` | لوحة التحكم الرئيسية  |
| **HR**         | `/hr`        | إدارة الموارد البشرية |
| **CRM**        | `/crm`       | إدارة العملاء         |
| **E-Learning** | `/elearning` | الدورات التدريبية     |
| **Documents**  | `/documents` | إدارة الملفات         |
| **Reports**    | `/reports`   | التقارير والإحصائيات  |
| **Settings**   | `/settings`  | الإعدادات الشخصية     |

---

## 4️⃣ اختبر الـ API

### الطريقة الأولى: استخدم Swagger UI

```
اذهب إلى: http://localhost:3001/api-docs
```

### الطريقة الثانية: استخدم cURL

```bash
# 1️⃣ تسجيل الدخول والحصول على Token
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'

# 2️⃣ انسخ التوكن من الاستجابة ثم استخدمه:
SET TOKEN=<your_token_here>

# 3️⃣ اختبر API
curl -X GET http://localhost:3001/api/users \
  -H "Authorization: Bearer %TOKEN%"

# 4️⃣ اختبر البريد الإلكتروني
curl -X POST http://localhost:3001/api/email/verify \
  -H "Authorization: Bearer %TOKEN%"
```

---

## 5️⃣ اختبر الميزات الرئيسية

### 🔐 اختبار التحقق من البريد الإلكتروني

```bash
curl -X POST http://localhost:3001/api/email/verify \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"

# النتيجة المتوقعة:
{
  "success": true,
  "message": "Email service is working correctly",
  "status": "operational"
}
```

### 📊 احصل على لوحة بيانات

```bash
curl -X GET http://localhost:3001/api/analytics/kpis \
  -H "Authorization: Bearer <token>"
```

### 📧 أرسل بريد الكتروني تجريبي

```bash
curl -X POST http://localhost:3001/api/email/send \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email",
    "html": "<h1>Hello</h1>"
  }'
```

---

## 6️⃣ ملفات مهمة

```
📁 Structure:
├── frontend/
│   ├── src/pages/
│   │   ├── LoginPage.jsx
│   │   ├── DashboardPage.jsx
│   │   ├── HRPage.jsx
│   │   ├── CRMPage.jsx
│   │   ├── ELearningPage.jsx
│   │   ├── DocumentsPage.jsx
│   │   ├── ReportsPage.jsx
│   │   └── SettingsPage.jsx
│   └── vite.config.js
│
├── backend/
│   ├── server.js (الملف الرئيسي)
│   ├── services/
│   │   ├── emailService.js
│   │   └── smsService.js
│   ├── routes/
│   │   ├── emailRoutes.js
│   │   ├── smsRoutes.js
│   │   └── ... (50+ routes)
│   └── swagger-config.js
│
└── 📚_COMPLETE_API_DOCUMENTATION.md
```

---

## 7️⃣ استكشاف الأخطاء السريع

### المشكلة: "Cannot connect to server"

```bash
# تحقق من تشغيل Backend:
curl http://localhost:3001/api/health

# إذا فشل، شغّل:
cd backend && npm start
```

### المشكلة: "Port already in use"

```bash
# Windows: اقتل العملية على Port 3001
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# أو غيّر الـ Port في .env:
PORT=3002
```

### المشكلة: "Module not found"

```bash
# أعد تثبيت الحزم:
cd backend
rm -r node_modules
npm install

cd ../frontend
rm -r node_modules
npm install
```

---

## 8️⃣ الخطوات التالية

بعد اختبار النظام:

### 🔧 للتطوير المزيد:

1. اقرأ [📚_COMPLETE_API_DOCUMENTATION.md](📚_COMPLETE_API_DOCUMENTATION.md)
2. اقرأ [⚡_PERFORMANCE_OPTIMIZATION_GUIDE.md](⚡_PERFORMANCE_OPTIMIZATION_GUIDE.md)
3. أضف ميزات جديدة حسب احتياجاتك

### 🚀 للإنتاج:

1. اقرأ [🗄️_MONGODB_ATLAS_SETUP.md](🗄️_MONGODB_ATLAS_SETUP.md)
2. ربط MongoDB Atlas بدلاً من Mock DB
3. اختبر جميع الوظائف
4. نشّر على الخادم

### 📊 للتحليلات:

1. اقرأ [📊_ADVANCED_ANALYTICS_GUIDE.md](📊_ADVANCED_ANALYTICS_GUIDE.md)
2. تفعيل التقارير المتقدمة
3. إنشاء لوحات بيانات مخصصة

---

## 9️⃣ روابط سريعة

```
🌐 الواجهة الأمامية:
   http://localhost:3000

🔌 API الخلفية:
   http://localhost:3001

📚 توثيق API:
   http://localhost:3001/api-docs

❤️ Health Check:
   http://localhost:3001/api/health
```

---

## 🔟 نصائح مهمة

✅ **استخدم Admin account أولاً** - لديه أعلى الصلاحيات  
✅ **راجع Console في Browser** - للرسائل التفصيلية  
✅ **راجع Terminal في Backend** - لسجلات الخادم  
✅ **استخدم Swagger UI** - للاختبار السهل  
✅ **احفظ نسخة من البيانات** - قبل أي تعديل كبير

---

## 📞 احصل على الدعم

إذا واجهت مشاكل:

1. 📖 اقرأ الدليل المناسب من الملفات المتاحة
2. 💬 ابحث عن الحل في الـ Troubleshooting section
3. 🔍 تحقق من الـ Console logs
4. 📧 راسل الدعم الفني

---

**🎉 اهلاً وسهلاً بك في النظام المتكامل!**

**الآن أنت جاهز للعمل الفوري. استمتع بالاستكشاف! 🚀**

---

**آخر تحديث:** 16 يناير 2026  
**المدة المتوقعة:** 5 دقائق  
**النجاح المتوقع:** 100% ✅

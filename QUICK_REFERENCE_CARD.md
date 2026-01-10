# ⚡ بطاقة المرجع السريع - Quick Reference Card

## 📌 بطاقات سريعة للاستخدام الفوري

---

## 🚀 البدء السريع (2 دقيقة)

```bash
# 1. استنساخ
git clone https://github.com/alawael/erp-system.git
cd alawael-erp

# 2. التثبيت
cd backend && npm install
cd ../alawael-erp-frontend && npm install

# 3. التشغيل (نافذتان منفصلتان)
# نافذة 1
cd backend && npm run dev

# نافذة 2
cd alawael-erp-frontend && npm run dev

# 4. افتح المتصفح
# Frontend: http://localhost:5173
# Email: admin@alawael.com | Password: Admin@123456
```

---

## 🐳 Docker (أمر واحد)

```bash
docker-compose -f docker-compose.production.yml up -d
```

**الوصول:**

- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- Mongo: http://localhost:8081
- Redis: http://localhost:8082

---

## 🔑 بيانات الدخول الافتراضية

```
📧 Email:       admin@alawael.com
🔑 Password:    Admin@123456
👤 Role:        Admin
```

---

## 📡 أهم 10 API Endpoints

### 1️⃣ المصادقة (Auth)

```bash
# تسجيل دخول
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@alawael.com","password":"Admin@123456"}'
```

### 2️⃣ الموظفين (Employees)

```bash
# الحصول على جميع الموظفين
curl http://localhost:3001/api/employees \
  -H "Authorization: Bearer TOKEN"

# إنشاء موظف
curl -X POST http://localhost:3001/api/employees \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"firstName":"Ahmed","lastName":"Ali","email":"ahmed@alawael.com"}'
```

### 3️⃣ التقارير (Reports)

```bash
# لوحة البيانات
curl http://localhost:3001/api/reports/dashboard \
  -H "Authorization: Bearer TOKEN"

# تقرير الموظفين
curl http://localhost:3001/api/reports/employee-summary \
  -H "Authorization: Bearer TOKEN"

# تصدير Excel
curl http://localhost:3001/api/reports/export-excel/employee \
  -H "Authorization: Bearer TOKEN" -o report.xlsx
```

### 4️⃣ المالية (Finance)

```bash
# الملخص المالي
curl http://localhost:3001/api/finance/summary \
  -H "Authorization: Bearer TOKEN"

# الفواتير
curl http://localhost:3001/api/finance/invoices \
  -H "Authorization: Bearer TOKEN"
```

### 5️⃣ الإشعارات (Notifications)

```bash
# الحصول على الإشعارات
curl http://localhost:3001/api/notifications \
  -H "Authorization: Bearer TOKEN"

# إرسال بريد إلكتروني
curl -X POST http://localhost:3001/api/notifications/email/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"to":"user@example.com","subject":"Hello","body":"Test"}'
```

### 6️⃣ الذكاء الاصطناعي (AI)

```bash
# التنبؤ بالحضور
curl http://localhost:3001/api/ai/predictions/attendance \
  -H "Authorization: Bearer TOKEN"

# الرؤى الذكية
curl http://localhost:3001/api/ai/insights \
  -H "Authorization: Bearer TOKEN"
```

### 7️⃣ الحضور (Attendance)

```bash
# سجل الحضور
curl http://localhost:3001/api/hr/attendance \
  -H "Authorization: Bearer TOKEN"

# تسجيل الحضور
curl -X POST http://localhost:3001/api/hr/attendance \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"employeeId":"1","status":"present"}'
```

### 8️⃣ الإجازات (Leaves)

```bash
# طلب إجازة
curl -X POST http://localhost:3001/api/hr/leaves \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"employeeId":"1","type":"annual","startDate":"2025-01-15","endDate":"2025-01-20"}'
```

### 9️⃣ المستخدمين (Users)

```bash
# جميع المستخدمين
curl http://localhost:3001/api/users \
  -H "Authorization: Bearer TOKEN"
```

### 🔟 الميزانيات (Budgets)

```bash
# الميزانية الحالية
curl http://localhost:3001/api/finance/budgets/current \
  -H "Authorization: Bearer TOKEN"
```

---

## 🧪 الاختبارات السريعة

```bash
# Backend Tests
cd backend
npm test

# Frontend Tests
cd alawael-erp-frontend
npm run test

# Coverage
npm run test:coverage
```

---

## 📁 الملفات المهمة

| الملف          | الموقع                                   |
| -------------- | ---------------------------------------- |
| Backend Entry  | backend/server.js                        |
| Frontend Entry | alawael-erp-frontend/src/main.js         |
| API Routes     | backend/routes/\*.routes.js              |
| Vue Pages      | alawael-erp-frontend/src/views/\*.vue    |
| Database       | backend/data/db.json                     |
| Config         | backend/.env                             |
| Router         | alawael-erp-frontend/src/router/index.js |

---

## 🔧 متغيرات البيئة (.env)

```env
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:5173
JWT_SECRET=your_secret_key
JWT_EXPIRE=24h
REFRESH_TOKEN_EXPIRE=7d
```

---

## 📊 الخدمات والمنافذ

| الخدمة          | المنفذ | الرابط                    |
| --------------- | ------ | ------------------------- |
| Frontend        | 5173   | http://localhost:5173     |
| Backend         | 3001   | http://localhost:3001     |
| MongoDB         | 27017  | mongodb://localhost:27017 |
| Redis           | 6379   | redis://localhost:6379    |
| Mongo Express   | 8081   | http://localhost:8081     |
| Redis Commander | 8082   | http://localhost:8082     |

---

## 🆘 استكشاف الأخطاء السريع

### المنفذ مشغول

```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Mac/Linux
lsof -i :3001
kill -9 <PID>
```

### المصادقة فشلت

```bash
# امسح localStorage
localStorage.clear()

# أو أعد تحميل الصفحة
# Ctrl + Shift + R (Windows/Linux)
# Cmd + Shift + R (Mac)
```

### لا يمكن الاتصال بـ MongoDB

```bash
docker-compose restart mongodb
```

### مشكلة في التبعيات

```bash
# حذف node_modules وإعادة التثبيت
rm -rf node_modules package-lock.json
npm install
```

---

## 🎯 أوامر Git الأساسية

```bash
# الحصول على آخر النسخة
git pull origin main

# إنشاء فرع جديد
git checkout -b feature/my-feature

# حفظ التغييرات
git add .
git commit -m "Add my feature"

# رفع التغييرات
git push origin feature/my-feature
```

---

## 📱 اختصارات لوحة المفاتيح

### في المتصفح

```
F12 or Ctrl+Shift+I     → فتح Developer Tools
Ctrl+Shift+R            → تحديث كامل (امسح الـ Cache)
F5                      → تحديث عادي
Ctrl+K                  → البحث في الملفات
Alt+Left Arrow          → الرجوع للصفحة السابقة
```

### في Editor

```
Ctrl+S                  → حفظ الملف
Ctrl+Shift+S            → حفظ الكل
Ctrl+`                  → فتح Terminal
Ctrl+/                  → تعليق/إلغاء تعليق
Ctrl+K Ctrl+F           → تنسيق الكود
```

---

## 📚 ملفات التوثيق المهمة

```
🌟 START_NOW.md
   ↳ البدء السريع (5 دقائق)

🌟 COMPREHENSIVE_DOCUMENTATION.md
   ↳ التوثيق الشامل (600+ سطر)

🌟 FINAL_PROJECT_REPORT.md
   ↳ التقرير النهائي (600+ سطر)

🌟 PROJECT_STATUS_DASHBOARD.md
   ↳ لوحة الحالة (400+ سطر)
```

---

## ✅ قائمة التحقق قبل الإطلاق

```
Development:
- [ ] npm run dev (Backend و Frontend يعملان)
- [ ] Frontend يحمل على http://localhost:5173
- [ ] تسجيل الدخول يعمل
- [ ] الـ API تستجيب

Production:
- [ ] Tests تمر بنجاح
- [ ] لا توجد أخطاء في Console
- [ ] متغيرات البيئة معرفة
- [ ] Docker يعمل
- [ ] جميع الخدمات تعمل
```

---

## 🎓 نصائح سريعة

```
💡 استخدم Chrome DevTools لتصحيح الأخطاء
💡 فعّل Redux DevTools لـ Pinia State
💡 استخدم Postman لاختبار الـ API
💡 افصل المحطات في نوافذ منفصلة
💡 استخدم git branches للميزات الجديدة
💡 اكتب الاختبارات قبل الكود
💡 احفظ بانتظام (Ctrl+S)
💡 اقرأ السجلات عند حدوث خطأ
```

---

## 🌐 الموارد الخارجية

```
Vue.js:           https://vuejs.org
Express.js:       https://expressjs.com
Tailwind CSS:     https://tailwindcss.com
Pinia:            https://pinia.vuejs.org
Vite:             https://vitejs.dev
Docker:           https://docker.com
```

---

## 📞 الاتصالات السريعة

```
📧 Email:   support@alawael.com
💬 Discord: https://discord.gg/alawael
📖 Docs:    COMPREHENSIVE_DOCUMENTATION.md
🐛 Issues:  GitHub Issues
```

---

## 🎯 الملخص النهائي

```
✅ المشروع جاهز للاستخدام الفوري
✅ جميع الـ Endpoints موثقة
✅ Docker جاهز للإنتاج
✅ الأمان مطبق بـ 7 طبقات
✅ التوثيق شامل وسهل الفهم
✅ الاختبارات تغطي المسارات الرئيسية

🚀 ابدأ الآن!
```

---

<div align="center">

## ⚡ بطاقة المرجع السريع

**تم طباعتها؟ احفظها بجانبك! 📌**

**Last Updated:** January 10, 2025

</div>

---

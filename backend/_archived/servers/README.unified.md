# 🚀 AlAwael ERP - النظام الموحد

## 📋 نظرة عامة

نظام ERP موحد وشامل لشركة الأوقاف، يتضمن:

- إدارة الموارد البشرية (HR)
- نظام الإشعارات
- لوحات التحكم والتقارير
- إدارة المالية

## 🏗️ هيكل النظام

```
backend/
├── middleware/          # الوسطاء الموحدون
│   ├── auth.unified.js
│   ├── validation.unified.js
│   ├── rateLimiter.unified.js
│   └── index.unified.js
├── routes/              # المسارات الموحدة
│   ├── hr.routes.unified.js
│   ├── notifications.routes.unified.js
│   ├── dashboard.routes.unified.js
│   └── index.unified.js
├── models/              # نماذج قاعدة البيانات
│   └── index.unified.js
├── services/            # الخدمات
│   └── index.unified.js
├── utils/               # الأدوات المساعدة
│   └── index.unified.js
├── config/              # التكوين
│   └── unified-integration.js
├── server.unified.js    # الخادم
├── app.unified.js       # التطبيق
├── index.unified.js     # نقطة البداية
├── package.unified.json # الحزم
└── .env.unified.example # مثال البيئة
```

## 🚀 التثبيت والتشغيل

### 1. المتطلبات

- Node.js >= 18.0.0
- MongoDB >= 6.0
- Redis (اختياري)

### 2. التثبيت

```bash
# نسخ ملف البيئة
cp .env.unified.example .env

# تثبيت الحزم
npm install

# تشغيل الخادم
npm start
# أو
node index.unified.js
```

### 3. التطوير

```bash
npm run dev
```

## 📖 API Documentation

### المصادقة (Authentication)

```http
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh
```

### HR (الموارد البشرية)

```http
GET    /api/hr/employees
POST   /api/hr/employees
GET    /api/hr/employees/:id
PUT    /api/hr/employees/:id
DELETE /api/hr/employees/:id
GET    /api/hr/payroll
POST   /api/hr/attendance/check-in
POST   /api/hr/attendance/check-out
GET    /api/hr/leaves
POST   /api/hr/leaves/request
```

### الإشعارات (Notifications)

```http
GET    /api/notifications
GET    /api/notifications/unread
PUT    /api/notifications/:id/read
PUT    /api/notifications/read-all
POST   /api/notifications/send
```

### لوحة التحكم (Dashboard)

```http
GET /api/dashboard
GET /api/dashboard/hr
GET /api/dashboard/finance
GET /api/dashboard/kpis
GET /api/dashboard/reports/daily
```

## 🔧 الاستخدام

### استيراد المكونات

```javascript
// الطريقة الأولى: من app.unified.js
const app = require('./app.unified');
const { authenticate, User, notification } = app;

// الطريقة الثانية: استيراد منفصل
const { authenticate, validate } = require('./middleware/index.unified');
const { User, Employee } = require('./models/index.unified');
const { notification, auth } = require('./services/index.unified');
const { formatDate, formatCurrency } = require('./utils/index.unified');
```

### إنشاء مسار محمي

```javascript
const { authenticate, authorize, validate } = require('./middleware/index.unified');

router.delete(
  '/users/:id',
  authenticate, // يتطلب تسجيل دخول
  authorize('admin'), // يتطلب صلاحية مسؤول
  deleteUser // المعالج
);
```

### استخدام النماذج

```javascript
const { User, Employee } = require('./models/index.unified');

// إنشاء مستخدم
const user = await User.create({
  name: 'أحمد',
  email: 'ahmed@example.com',
  password: hashedPassword,
});

// البحث
const employees = await Employee.find({ status: 'active' });
```

## 📊 Models المتاحة

| النموذج      | الوصف             |
| ------------ | ----------------- |
| User         | المستخدمين        |
| Employee     | الموظفين          |
| Department   | الأقسام           |
| Attendance   | الحضور            |
| Leave        | الإجازات          |
| Notification | الإشعارات         |
| Transaction  | المعاملات المالية |
| Payroll      | كشوف الرواتب      |

## 🔐 Middleware المتاحة

| الوسيط                | الوصف                |
| --------------------- | -------------------- |
| authenticate          | التحقق من التوكن     |
| authorize(roles)      | التحقق من الصلاحيات  |
| checkPermission(perm) | التحقق من الإذن      |
| validate(rules)       | التحقق من البيانات   |
| loginLimiter          | تحديد محاولات الدخول |
| apiLimiter            | تحديد API العام      |

## 🧹 التنظيف

```bash
# معاينة الملفات للتنظيف
node ../CLEANUP_DUPLICATES.js

# تنفيذ التنظيف
DRY_RUN=false node ../CLEANUP_DUPLICATES.js
```

## 📁 الملفات المكررة للتنظيف

- 12 ملف middleware مكرر
- 16 ملف services مكرر
- 5 ملف models مؤقت

**الإجمالي: 33 ملف**

## 📞 الدعم

للمساعدة راجع:

- `FINAL_SYSTEM_REPORT.md` - التقرير الشامل
- `UNIFIED_SYSTEM_GUIDE.md` - دليل الاستخدام
- `SYSTEM_ANALYSIS_REPORT.md` - تحليل المشاكل

---

_AlAwael ERP v2.0.0 - 2026_

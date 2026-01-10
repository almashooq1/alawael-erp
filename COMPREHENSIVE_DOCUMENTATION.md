# 📚 وثائق نظام AlAwael ERP الشامل

## 🎯 نظرة عامة

نظام **AlAwael ERP** هو حل إدارة موارد بشرية شامل بُني باستخدام **Vue 3** و **Node.js/Express** و **MongoDB** و **Redis**، مع دعم:

- ✅ إدارة الموظفين والرواتب
- ✅ تتبع الحضور والانصراف
- ✅ إدارة طلبات الإجازات
- ✅ نظام مالي متكامل (فواتير ونفقات)
- ✅ التقارير والإحصائيات المتقدمة
- ✅ نظام الإشعارات والتنبيهات
- ✅ الذكاء الاصطناعي والتنبؤات
- ✅ الأتمتة الذكية

---

## 🏗️ البنية المعمارية

### Backend Stack

```
├── server.js                    # نقطة البداية
├── config/
│   └── inMemoryDB.js           # نظام قاعدة البيانات
├── api/
│   └── routes/
│       ├── auth.routes.js       # المصادقة
│       └── users.routes.js      # إدارة المستخدمين
├── routes/
│   ├── hr.routes.js            # إدارة الموظفين
│   ├── hrops.routes.js         # الحضور والإجازات
│   ├── reports.routes.js       # التقارير
│   ├── finance.routes.js       # الإدارة المالية
│   ├── notifications.routes.js # الإشعارات
│   └── ai.routes.js            # الذكاء الاصطناعي
├── models/
│   ├── Employee.memory.js      # نموذج الموظف
│   ├── Attendance.memory.js    # نموذج الحضور
│   ├── Leave.memory.js         # نموذج الإجازة
│   ├── Finance.memory.js       # نموذج النظام المالي
│   ├── Notification.memory.js  # نموذج الإشعارات
│   └── AI.memory.js            # نموذج الذكاء الاصطناعي
├── middleware/
│   ├── auth.middleware.js      # التحقق من الهوية
│   ├── validator.middleware.js # التحقق من البيانات
│   └── sanitize.js             # تنظيف المدخلات
└── utils/
    ├── logger.js               # تسجيل الأخطاء
    └── response.js             # تنسيق الاستجابات
```

### Frontend Stack

```
alawael-erp-frontend/
├── src/
│   ├── views/
│   │   ├── LoginView.vue           # صفحة الدخول
│   │   ├── DashboardView.vue       # لوحة التحكم
│   │   ├── ProfileView.vue         # الملف الشخصي
│   │   ├── UsersView.vue           # إدارة المستخدمين
│   │   ├── EmployeesView.vue       # إدارة الموظفين
│   │   ├── AttendanceView.vue      # الحضور
│   │   ├── LeavesView.vue          # الإجازات
│   │   ├── ReportsView.vue         # التقارير
│   │   ├── FinanceView.vue         # الإدارة المالية
│   │   ├── NotificationsView.vue   # الإشعارات
│   │   └── SettingsView.vue        # الإعدادات
│   ├── layouts/
│   │   └── MainLayout.vue          # التخطيط الرئيسي
│   ├── stores/
│   │   └── auth.js                 # متجر المصادقة (Pinia)
│   ├── services/
│   │   └── api.js                  # خدمة API
│   ├── router/
│   │   └── index.js                # جدول التوجيه
│   ├── App.vue                      # المكون الجذري
│   └── main.js                      # نقطة البداية
├── public/
│   └── index.html                   # ملف HTML الرئيسي
├── package.json
└── vite.config.js
```

---

## 🔌 API Endpoints

### 🔐 المصادقة `/api/auth`

```
POST   /auth/register              # تسجيل مستخدم جديد
POST   /auth/login                 # تسجيل الدخول
POST   /auth/logout                # تسجيل الخروج
POST   /auth/refresh               # تحديث الرمز
GET    /auth/profile               # الحصول على الملف الشخصي
PUT    /auth/change-password       # تغيير كلمة المرور
```

### 👥 المستخدمين `/api/users`

```
GET    /users                      # الحصول على جميع المستخدمين
POST   /users                      # إنشاء مستخدم جديد
GET    /users/:id                  # الحصول على مستخدم
PUT    /users/:id                  # تحديث مستخدم
DELETE /users/:id                  # حذف مستخدم
PATCH  /users/:id/role             # تغيير دور المستخدم
```

### 👔 الموظفين `/api/employees`

```
GET    /employees                  # جميع الموظفين
POST   /employees                  # إنشاء موظف
GET    /employees/:id              # موظف واحد
PUT    /employees/:id              # تحديث موظف
DELETE /employees/:id              # حذف موظف
PATCH  /employees/:id/status       # تغيير الحالة
GET    /employees/analytics        # الإحصائيات
```

### 📋 HR Operations `/api/hr`

```
// الحضور
POST   /hr/attendance              # تسجيل حضور
GET    /hr/attendance              # الحصول على الحضور
GET    /hr/attendance/monthly      # إحصائيات شهرية

// الإجازات
POST   /hr/leaves                  # إنشاء طلب إجازة
GET    /hr/leaves                  # جميع الطلبات
PATCH  /hr/leaves/:id/approve      # الموافقة
PATCH  /hr/leaves/:id/reject       # الرفض
```

### 📊 التقارير `/api/reports`

```
GET    /reports/employee-summary   # ملخص الموظفين
GET    /reports/attendance-stats   # إحصائيات الحضور
GET    /reports/leave-stats        # إحصائيات الإجازات
GET    /reports/dashboard          # لوحة البيانات
GET    /reports/export-excel/:type # تصدير Excel
GET    /reports/export-pdf/:type   # تصدير PDF
```

### 💰 المالية `/api/finance`

```
// الفواتير
POST   /finance/invoices           # إنشاء فاتورة
GET    /finance/invoices           # الحصول على الفواتير
PUT    /finance/invoices/:id       # تحديث فاتورة
DELETE /finance/invoices/:id       # حذف فاتورة

// النفقات
POST   /finance/expenses           # تسجيل نفقة
GET    /finance/expenses           # الحصول على النفقات
PATCH  /finance/expenses/:id/approve # الموافقة على نفقة

// الميزانيات
POST   /finance/budgets            # إنشاء ميزانية
GET    /finance/budgets/current    # الميزانية الحالية

// الدفعات
POST   /finance/payments           # تسجيل دفعة
GET    /finance/payments           # الحصول على الدفعات

// الملخص
GET    /finance/summary            # ملخص مالي شامل
```

### 🔔 الإشعارات `/api/notifications`

```
GET    /notifications             # الإشعارات
GET    /notifications/unread      # عدد غير المقروءة
PATCH  /notifications/:id/read    # وضع علامة كمقروء
POST   /notifications/email/send  # إرسال بريد
POST   /notifications/sms/send    # إرسال رسالة نصية
POST   /notifications/sms/otp     # إرسال رمز التحقق
POST   /notifications/push        # إرسال إشعار فوري
POST   /notifications/push/bulk   # إرسال لعدة مستخدمين
POST   /notifications/preferences # حفظ التفضيلات
```

### 🤖 الذكاء الاصطناعي `/api/ai`

```
GET    /ai/predictions/attendance # التنبؤ بالحضور
GET    /ai/predictions/salary     # توقع الرواتب
GET    /ai/predictions/leaves     # توقع الإجازات
GET    /ai/performance/:id        # درجة الأداء
GET    /ai/performance/all        # درجات الأداء الجماعية
GET    /ai/insights               # الرؤى الذكية
GET    /ai/automations            # الأتمتات
POST   /ai/automations            # إنشاء أتمتة
PATCH  /ai/automations/:id/toggle # تفعيل/تعطيل
```

---

## 🚀 البدء السريع

### المتطلبات

- Node.js v16+
- npm أو yarn
- MongoDB (اختياري - نستخدم In-Memory)
- Redis (اختياري)

### التثبيت والتشغيل

#### 1. Backend

```bash
cd backend
npm install
npm run dev      # تشغيل بوضع التطوير
npm test         # تشغيل الاختبارات
```

#### 2. Frontend

```bash
cd alawael-erp-frontend
npm install
npm run dev      # تشغيل بوضع التطوير
npm build        # بناء للإنتاج
```

#### 3. Docker

```bash
docker-compose -f docker-compose.production.yml up -d
```

---

## 📝 أمثلة الاستخدام

### تسجيل الدخول

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@alawael.com",
    "password": "Admin@123456"
  }'
```

### إنشاء موظف

```bash
curl -X POST http://localhost:3001/api/employees \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "أحمد محمد",
    "email": "ahmed@company.com",
    "department": "it",
    "position": "مطور",
    "salary": 5000
  }'
```

### تسجيل حضور

```bash
curl -X POST http://localhost:3001/api/hr/attendance \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "emp-123",
    "date": "2025-01-10",
    "checkIn": "09:00",
    "status": "present"
  }'
```

---

## 🎨 المميزات الرئيسية

### 1️⃣ إدارة الموظفين

- إضافة/تحديث/حذف الموظفين
- تقسيم حسب الأقسام
- إحصائيات الراتب والأداء
- تتبع الحالة (نشط/غير نشط)

### 2️⃣ نظام الحضور

- تسجيل الحضور والانصراف
- حالات متعددة (حاضر، غياب، متأخر، نصف يوم)
- إحصائيات شهرية وسنوية
- تنبيهات تلقائية للغياب

### 3️⃣ إدارة الإجازات

- طلب الإجازات (المرضية، الإجازات العادية، الدراسية)
- نظام الموافقة (معلق، موافق عليه، مرفوض)
- عد أيام الإجازات المتبقية
- تنبيهات للموافقات

### 4️⃣ النظام المالي

- إنشاء الفواتير وتتبع الدفعات
- تسجيل النفقات والموافقة عليها
- إدارة الميزانيات الشهرية/السنوية
- تقارير مالية شاملة

### 5️⃣ التقارير والإحصائيات

- تقارير تفاعلية (PDF/Excel)
- لوحة بيانات شاملة
- رسوم بيانية وإحصائيات
- فلترة وتصفية متقدمة

### 6️⃣ نظام الإشعارات

- إشعارات في التطبيق (In-App)
- بريد إلكتروني
- رسائل نصية (SMS)
- تفضيلات قابلة للتخصيص

### 7️⃣ الذكاء الاصطناعي

- التنبؤ بأنماط الحضور
- حساب درجات الأداء
- رؤى وتوصيات ذكية
- أتمتة سير العمل

### 8️⃣ الأمان

- JWT مع رموز التحديث
- تشفير كلمات المرور (bcrypt)
- حماية من XSS و CSRF
- تحديد سرعة الطلبات (Rate Limiting)
- تنظيف المدخلات

---

## 📊 نماذج البيانات

### User

```javascript
{
  _id: String,
  fullName: String,
  email: String,
  password: String (hashed),
  role: 'admin' | 'user',
  status: 'active' | 'inactive',
  createdAt: Date
}
```

### Employee

```javascript
{
  _id: String,
  fullName: String,
  email: String,
  department: String,
  position: String,
  salary: Number,
  status: 'active' | 'inactive',
  joinDate: Date,
  phone: String,
  address: String,
  createdAt: Date
}
```

### Attendance

```javascript
{
  _id: String,
  employeeId: String,
  date: Date,
  checkIn: String (HH:MM),
  checkOut: String (HH:MM),
  status: 'present' | 'absent' | 'late' | 'half_day',
  notes: String,
  createdAt: Date
}
```

### Leave

```javascript
{
  _id: String,
  employeeId: String,
  type: 'sick' | 'annual' | 'study' | 'other',
  fromDate: Date,
  toDate: Date,
  days: Number,
  reason: String,
  status: 'pending' | 'approved' | 'rejected',
  createdAt: Date
}
```

---

## ⚙️ المتغيرات البيئية

```bash
# Backend
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:5173
JWT_SECRET=your_secret_key
JWT_EXPIRE=24h
REFRESH_TOKEN_EXPIRE=7d

# Database (اختياري)
MONGODB_URI=mongodb://localhost:27017/alawael_erp
REDIS_URL=redis://localhost:6379
```

---

## 📦 الملفات المستخدمة

- `backend/data/db.json` - قاعدة البيانات الأساسية
- `backend/data/finance.json` - البيانات المالية
- `backend/data/notifications.json` - الإشعارات
- `backend/data/ai.json` - بيانات الذكاء الاصطناعي

---

## 🧪 الاختبارات

```bash
# تشغيل الاختبارات
npm test

# مع تغطية الكود
npm run test:coverage

# بوضع المراقبة
npm run test:watch
```

---

## 📈 الإصدار التالي

- [ ] تطبيق الهاتف المحمول (React Native)
- [ ] نسخة PWA
- [ ] ربط مع خدمات الدفع
- [ ] تكامل البريد الإلكتروني (SendGrid)
- [ ] تكامل SMS (Twilio)
- [ ] نظام إدارة الوثائق
- [ ] تقارير متقدمة (Power BI)
- [ ] Kubernetes للنشر

---

## 📞 الدعم والمساعدة

للمساعدة والدعم:

- 📧 Email: support@alawael.com
- 💬 Slack: #alawael-erp
- 🐛 Issues: GitHub Issues

---

**آخر تحديث**: يناير 2025
**النسخة**: 1.0.0
**الحالة**: جاهز للإنتاج ✅

# 🔧 دليل دمج النظام المحاسبي

## 📋 الخطوات المطلوبة

### 1️⃣ تثبيت الحزم المطلوبة

```bash
npm install express-validator pdfkit exceljs
```

---

### 2️⃣ تسجيل المسارات في server.js

أضف الكود التالي إلى ملف `backend/server.js` أو `backend/app.js`:

```javascript
// ===== النظام المحاسبي =====
const accountingRoutes = require('./routes/accounting.routes');
const { errorHandler } = require('./middleware/accounting.middleware');

// تسجيل المسارات
app.use('/api/accounting', accountingRoutes);

// معالج الأخطاء (يجب أن يكون في النهاية)
app.use(errorHandler);
```

---

### 3️⃣ إعداد النظام المحاسبي

قم بتشغيل سكريبت الإعداد لإنشاء دليل الحسابات الأساسي:

```bash
node backend/scripts/setup-accounting.js
```

هذا السكريبت سيقوم بـ:

- ✅ إنشاء 50+ حساب أساسي
- ✅ إعداد الإعدادات الأولية
- ✅ ربط الحسابات الافتراضية

---

### 4️⃣ إضافة دور المحاسب للمستخدمين

قم بإضافة دور `accountant` للمستخدمين الذين يحتاجون للوصول:

```javascript
// مثال: إضافة دور للمستخدم
const User = require('./models/User');

await User.findByIdAndUpdate(userId, {
  $addToSet: { roles: 'accountant' },
});
```

أو من خلال MongoDB مباشرة:

```javascript
db.users.updateOne(
  { email: 'accountant@example.com' },
  { $addToSet: { roles: 'accountant' } }
);
```

---

### 5️⃣ اختبار النظام

#### أ. اختبار الحصول على الحسابات

```bash
curl http://localhost:3001/api/accounting/accounts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### ب. اختبار إنشاء قيد يومية

```bash
curl -X POST http://localhost:3001/api/accounting/journal-entries \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-01-19",
    "description": "قيد افتتاحي",
    "lines": [
      {
        "accountId": "BANK_ACCOUNT_ID",
        "debit": 100000,
        "credit": 0,
        "description": "رصيد افتتاحي"
      },
      {
        "accountId": "CAPITAL_ACCOUNT_ID",
        "debit": 0,
        "credit": 100000,
        "description": "رأس المال"
      }
    ]
  }'
```

#### ج. اختبار إنشاء فاتورة

```bash
curl -X POST http://localhost:3001/api/accounting/invoices \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "sales",
    "date": "2026-01-19",
    "customerName": "عميل تجريبي",
    "customerEmail": "customer@example.com",
    "items": [
      {
        "description": "خدمة علاج طبيعي",
        "quantity": 10,
        "unitPrice": 500,
        "taxRate": 0.15
      }
    ]
  }'
```

---

## 🔐 إعدادات الأمان

### متغيرات البيئة المطلوبة (.env)

```env
# JWT
JWT_SECRET=your-super-secret-key-change-this-in-production

# MongoDB
MONGODB_URI=mongodb://localhost:27017/rehabilitation

# Node Environment
NODE_ENV=development
```

---

## 📊 البنية النهائية

```
backend/
├── models/
│   ├── Account.js
│   ├── JournalEntry.js
│   ├── Invoice.js
│   ├── Payment.js
│   ├── Expense.js
│   ├── Budget.js
│   ├── VATReturn.js
│   ├── AccountingSettings.js
│   └── AuditLog.js
│
├── routes/
│   └── accounting.routes.js
│
├── services/
│   └── accounting.service.js
│
├── validators/
│   └── accounting.validator.js
│
├── middleware/
│   └── accounting.middleware.js
│
├── utils/
│   ├── financial-calculations.js
│   ├── pdf-generator.js
│   └── excel-generator.js
│
└── scripts/
    └── setup-accounting.js
```

---

## 🎯 نقاط النهاية المتاحة (40+ Endpoint)

### دليل الحسابات

- `GET /api/accounting/accounts` - قائمة الحسابات
- `POST /api/accounting/accounts` - إنشاء حساب
- `PUT /api/accounting/accounts/:id` - تحديث حساب
- `GET /api/accounting/accounts/:id/balance` - رصيد الحساب

### قيود اليومية

- `GET /api/accounting/journal-entries` - قائمة القيود
- `POST /api/accounting/journal-entries` - إنشاء قيد
- `POST /api/accounting/journal-entries/:id/post` - ترحيل قيد
- `POST /api/accounting/journal-entries/:id/reverse` - عكس قيد

### الفواتير

- `GET /api/accounting/invoices` - قائمة الفواتير
- `POST /api/accounting/invoices` - إنشاء فاتورة
- `POST /api/accounting/invoices/:id/pay` - تسجيل دفعة
- `GET /api/accounting/invoices/:id/pdf` - توليد PDF

### التقارير

- `GET /api/accounting/reports/trial-balance` - ميزان المراجعة
- `GET /api/accounting/reports/balance-sheet` - الميزانية العمومية
- `GET /api/accounting/reports/income-statement` - قائمة الدخل
- `GET /api/accounting/reports/cash-flow` - التدفقات النقدية
- `GET /api/accounting/reports/general-ledger` - دفتر الأستاذ
- `GET /api/accounting/reports/aged-receivables` - أعمار المدينين
- `GET /api/accounting/reports/aged-payables` - أعمار الدائنين

### الضرائب

- `GET /api/accounting/taxes/vat-report` - تقرير ضريبة القيمة المضافة
- `POST /api/accounting/taxes/vat-return` - إقرار ضريبي

### الميزانية

- `GET /api/accounting/budgets` - قائمة الميزانيات
- `POST /api/accounting/budgets` - إنشاء ميزانية
- `GET /api/accounting/budgets/:id/variance` - تحليل الانحرافات

### المصروفات

- `GET /api/accounting/expenses` - قائمة المصروفات
- `POST /api/accounting/expenses` - إنشاء مصروف
- `POST /api/accounting/expenses/:id/approve` - الموافقة على مصروف

### التحليلات

- `GET /api/accounting/analytics/dashboard` - لوحة المعلومات
- `GET /api/accounting/analytics/profitability` - تحليل الربحية
- `GET /api/accounting/analytics/financial-ratios` - النسب المالية

### عمليات إضافية

- `GET /api/accounting/audit-trail` - سجل التدقيق
- `POST /api/accounting/export` - تصدير البيانات
- `POST /api/accounting/import` - استيراد البيانات
- `GET /api/accounting/settings` - الإعدادات
- `PUT /api/accounting/settings` - تحديث الإعدادات
- `POST /api/accounting/close-period` - إقفال فترة
- `POST /api/accounting/reconcile` - التسوية البنكية

---

## 🔍 استكشاف الأخطاء

### خطأ: "غير مصرح - لا يوجد توكن"

**الحل:** تأكد من إرسال التوكن في الـ headers:

```javascript
headers: {
  'Authorization': 'Bearer YOUR_JWT_TOKEN'
}
```

### خطأ: "ممنوع - ليس لديك صلاحية"

**الحل:** تأكد من أن المستخدم لديه دور `accountant` أو `admin`

### خطأ: "مجموع المدين لا يساوي الدائن"

**الحل:** في قيود اليومية، تأكد من:

```javascript
∑ debit = ∑ credit
```

### خطأ: "الحساب غير موجود"

**الحل:** قم بتشغيل سكريبت الإعداد:

```bash
node backend/scripts/setup-accounting.js
```

---

## ✅ قائمة التحقق النهائية

- [ ] تثبيت الحزم المطلوبة
- [ ] تسجيل المسارات في server.js
- [ ] تشغيل سكريبت الإعداد
- [ ] إضافة دور accountant للمستخدمين
- [ ] إعداد متغيرات البيئة (.env)
- [ ] اختبار نقاط النهاية الأساسية
- [ ] مراجعة التوثيق الكامل

---

## 📚 المراجع

- [الدليل الكامل](./📊_ACCOUNTING_SYSTEM_COMPLETE_GUIDE.md)
- [الإعداد السريع](./⚡_ACCOUNTING_QUICK_START.md)

---

**✅ النظام جاهز للعمل!**

التاريخ: 19 يناير 2026

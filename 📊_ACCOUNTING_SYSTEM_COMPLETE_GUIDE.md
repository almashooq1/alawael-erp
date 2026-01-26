# 💰 النظام المحاسبي المتقدم - دليل كامل

## 📋 نظرة عامة

تم تطوير **نظام محاسبي احترافي وقوي** يتضمن جميع الميزات الأساسية والمتقدمة
لإدارة الحسابات المالية في المؤسسات.

---

## ✨ الميزات الرئيسية

### 1. 📊 دليل الحسابات (Chart of Accounts)

- نظام شجري هرمي للحسابات
- 5 أنواع رئيسية: أصول، خصوم، حقوق ملكية، إيرادات، مصروفات
- دعم الحسابات الفرعية
- إدارة العملات المتعددة
- تفعيل/تعطيل الحسابات

### 2. 📝 قيود اليومية (Journal Entries)

- إنشاء قيود يدوية وتلقائية
- التحقق التلقائي من توازن المدين والدائن
- ترحيل القيود
- عكس القيود
- سجل كامل للتدقيق

### 3. 🧾 الفواتير (Invoices)

- فواتير المبيعات
- فواتير المشتريات
- فواتير المرتجعات
- حساب ضريبة القيمة المضافة تلقائياً
- تتبع حالة الفاتورة
- توليد PDF للفواتير

### 4. 💳 المدفوعات (Payments)

- تسجيل المدفوعات
- طرق دفع متعددة
- ربط تلقائي بالفواتير
- إنشاء قيود محاسبية تلقائياً

### 5. 📈 التقارير المالية (Financial Reports)

#### تقارير متقدمة:

- **ميزان المراجعة** (Trial Balance)
- **الميزانية العمومية** (Balance Sheet)
- **قائمة الدخل** (Income Statement)
- **قائمة التدفقات النقدية** (Cash Flow Statement)
- **دفتر الأستاذ العام** (General Ledger)
- **أعمار الديون** (Aged Receivables/Payables)

### 6. 🧮 ضريبة القيمة المضافة (VAT)

- حساب تلقائي للضريبة
- تقارير ضريبية شاملة
- إقرارات ضريبية
- دعم نسبة 15% (السعودية)

### 7. 📊 الميزانية (Budgeting)

- إنشاء ميزانيات سنوية/ربع سنوية/شهرية
- تحليل الانحرافات
- تتبع الإنفاق الفعلي
- نسب الاستخدام

### 8. 💸 المصروفات (Expenses)

- تسجيل المصروفات
- تصنيف المصروفات
- سير عمل الموافقات
- رفع الإيصالات

### 9. 📊 التحليلات المالية (Financial Analytics)

- لوحة معلومات شاملة
- تحليل الربحية
- النسب المالية
- مؤشرات الأداء الرئيسية

---

## 🗂️ البنية التقنية

### النماذج (Models)

```
backend/models/
├── Account.js                  // دليل الحسابات
├── JournalEntry.js            // قيود اليومية
├── Invoice.js                 // الفواتير
├── Payment.js                 // المدفوعات
├── Expense.js                 // المصروفات
├── Budget.js                  // الميزانيات
├── VATReturn.js               // إقرارات الضريبة
├── AccountingSettings.js      // إعدادات النظام
└── AuditLog.js                // سجل التدقيق
```

### الخدمات (Services)

```javascript
backend / services / accounting.service.js;
```

**الوظائف الرئيسية:**

- إدارة دليل الحسابات (4 وظائف)
- إدارة قيود اليومية (5 وظائف)
- إدارة الفواتير والمدفوعات (6 وظائف)
- توليد التقارير المالية (7 وظائف)
- إدارة الضرائب (2 وظيفة)
- **إجمالي: 30+ وظيفة**

### المسارات (Routes)

```javascript
backend / routes / accounting.routes.js;
```

**نقاط النهاية:**

- 40+ API endpoint
- مصادقة JWT كاملة
- تفويض قائم على الأدوار
- التحقق من صحة البيانات

---

## 🔐 الأمان

### المصادقة والتفويض

```javascript
// جميع المسارات محمية
router.use(authenticate);
router.use(authorize(['accountant', 'admin']));
```

### الأدوار المدعومة:

- **محاسب** (accountant): صلاحيات كاملة في المحاسبة
- **مدير** (admin): صلاحيات إدارية شاملة

### سجل التدقيق

- تسجيل جميع العمليات المحاسبية
- تتبع المستخدم والوقت والتفاصيل
- حفظ دائم للسجلات

---

## 📊 API الرئيسية

### 1. دليل الحسابات

#### الحصول على الحسابات

```
GET /api/accounting/accounts
Query: type, parentId, isActive, searchTerm
```

#### إنشاء حساب

```
POST /api/accounting/accounts
Body: {
  code: "1010",
  name: "الصندوق",
  type: "asset",
  category: "current_asset"
}
```

#### تحديث حساب

```
PUT /api/accounting/accounts/:id
```

#### رصيد الحساب

```
GET /api/accounting/accounts/:id/balance
Query: startDate, endDate
```

---

### 2. قيود اليومية

#### الحصول على القيود

```
GET /api/accounting/journal-entries
Query: startDate, endDate, status, type, page, limit
```

#### إنشاء قيد

```
POST /api/accounting/journal-entries
Body: {
  date: "2026-01-19",
  description: "قيد افتتاحي",
  lines: [
    { accountId: "...", debit: 10000, credit: 0 },
    { accountId: "...", debit: 0, credit: 10000 }
  ]
}
```

#### ترحيل قيد

```
POST /api/accounting/journal-entries/:id/post
```

#### عكس قيد

```
POST /api/accounting/journal-entries/:id/reverse
Body: { reason: "..." }
```

---

### 3. الفواتير

#### الحصول على الفواتير

```
GET /api/accounting/invoices
Query: status, type, customerId, startDate, endDate
```

#### إنشاء فاتورة

```
POST /api/accounting/invoices
Body: {
  type: "sales",
  date: "2026-01-19",
  customerName: "شركة ABC",
  items: [
    {
      description: "خدمة استشارية",
      quantity: 1,
      unitPrice: 5000,
      taxRate: 0.15
    }
  ]
}
```

#### تسجيل دفعة

```
POST /api/accounting/invoices/:id/pay
Body: {
  amount: 5750,
  paymentMethod: "bank_transfer",
  paymentDate: "2026-01-19",
  accountId: "..."
}
```

#### توليد PDF

```
GET /api/accounting/invoices/:id/pdf
```

---

### 4. التقارير المالية

#### ميزان المراجعة

```
GET /api/accounting/reports/trial-balance
Query: startDate, endDate, detailed
```

#### الميزانية العمومية

```
GET /api/accounting/reports/balance-sheet
Query: asOfDate
```

#### قائمة الدخل

```
GET /api/accounting/reports/income-statement
Query: startDate, endDate
```

#### قائمة التدفقات النقدية

```
GET /api/accounting/reports/cash-flow
Query: startDate, endDate
```

#### دفتر الأستاذ العام

```
GET /api/accounting/reports/general-ledger
Query: accountId, startDate, endDate
```

#### أعمار الديون - المدينون

```
GET /api/accounting/reports/aged-receivables
Query: asOfDate
```

#### أعمار الديون - الدائنون

```
GET /api/accounting/reports/aged-payables
Query: asOfDate
```

---

### 5. ضريبة القيمة المضافة

#### تقرير الضريبة

```
GET /api/accounting/taxes/vat-report
Query: startDate, endDate
```

#### إنشاء إقرار ضريبي

```
POST /api/accounting/taxes/vat-return
Body: {
  period: {
    startDate: "2026-01-01",
    endDate: "2026-03-31"
  },
  ...
}
```

---

### 6. الميزانية

#### الحصول على الميزانيات

```
GET /api/accounting/budgets
Query: fiscalYear, status
```

#### إنشاء ميزانية

```
POST /api/accounting/budgets
Body: {
  name: "ميزانية 2026",
  fiscalYear: 2026,
  period: "annual",
  startDate: "2026-01-01",
  endDate: "2026-12-31",
  lines: [...]
}
```

#### تحليل الانحرافات

```
GET /api/accounting/budgets/:id/variance
```

---

### 7. المصروفات

#### الحصول على المصروفات

```
GET /api/accounting/expenses
Query: category, status, startDate, endDate
```

#### إنشاء مصروف

```
POST /api/accounting/expenses
Body: {
  date: "2026-01-19",
  category: "utilities",
  description: "فاتورة كهرباء",
  amount: 2500,
  accountId: "..."
}
```

#### الموافقة على مصروف

```
POST /api/accounting/expenses/:id/approve
Body: { approved: true }
```

---

### 8. التحليلات

#### لوحة المعلومات

```
GET /api/accounting/analytics/dashboard
Query: startDate, endDate
```

#### تحليل الربحية

```
GET /api/accounting/analytics/profitability
Query: startDate, endDate, groupBy
```

#### النسب المالية

```
GET /api/accounting/analytics/financial-ratios
Query: asOfDate
```

---

### 9. عمليات إضافية

#### سجل التدقيق

```
GET /api/accounting/audit-trail
Query: startDate, endDate, userId, action
```

#### تصدير البيانات

```
POST /api/accounting/export
Body: { format: "excel", dataType: "accounts" }
```

#### استيراد البيانات

```
POST /api/accounting/import
Body: FormData with file
```

#### الإعدادات

```
GET /api/accounting/settings
PUT /api/accounting/settings
```

#### إقفال الفترة

```
POST /api/accounting/close-period
Body: { endDate: "2026-12-31" }
```

#### التسوية البنكية

```
POST /api/accounting/reconcile
Body: { accountId: "...", statementDate: "..." }
```

---

## 🎯 حالات الاستخدام

### السيناريو 1: إنشاء فاتورة مبيعات كاملة

```javascript
// 1. إنشاء الفاتورة
const invoice = await fetch('/api/accounting/invoices', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + token,
  },
  body: JSON.stringify({
    type: 'sales',
    date: '2026-01-19',
    customerName: 'مركز التأهيل الطبي',
    customerEmail: 'info@rehab.com',
    items: [
      {
        description: 'خدمة علاج طبيعي - 10 جلسات',
        quantity: 10,
        unitPrice: 500,
        taxRate: 0.15,
      },
    ],
  }),
});

// 2. تسجيل الدفعة
const payment = await fetch(`/api/accounting/invoices/${invoice._id}/pay`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + token,
  },
  body: JSON.stringify({
    amount: 5750, // 5000 + 15% ضريبة
    paymentMethod: 'bank_transfer',
    paymentDate: '2026-01-19',
    accountId: bankAccountId,
  }),
});

// 3. توليد PDF
const pdf = await fetch(`/api/accounting/invoices/${invoice._id}/pdf`);
```

---

### السيناريو 2: توليد تقارير شهرية

```javascript
const month = {
  startDate: '2026-01-01',
  endDate: '2026-01-31',
};

// 1. قائمة الدخل
const incomeStatement = await fetch(
  `/api/accounting/reports/income-statement?startDate=${month.startDate}&endDate=${month.endDate}`
);

// 2. ميزان المراجعة
const trialBalance = await fetch(
  `/api/accounting/reports/trial-balance?startDate=${month.startDate}&endDate=${month.endDate}`
);

// 3. التدفقات النقدية
const cashFlow = await fetch(
  `/api/accounting/reports/cash-flow?startDate=${month.startDate}&endDate=${month.endDate}`
);
```

---

### السيناريو 3: إدارة الميزانية السنوية

```javascript
// 1. إنشاء ميزانية
const budget = await fetch('/api/accounting/budgets', {
  method: 'POST',
  body: JSON.stringify({
    name: 'ميزانية 2026',
    fiscalYear: 2026,
    period: 'annual',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    lines: [
      { accountId: salariesAccountId, amount: 500000 },
      { accountId: rentAccountId, amount: 120000 },
      { accountId: utilitiesAccountId, amount: 60000 },
    ],
  }),
});

// 2. تحليل الانحرافات شهرياً
const variance = await fetch(`/api/accounting/budgets/${budget._id}/variance`);
```

---

## 📊 قاعدة البيانات

### نموذج Account (الحساب)

```javascript
{
  code: "1010",              // كود الحساب
  name: "الصندوق",           // اسم الحساب
  type: "asset",             // النوع
  category: "current_asset", // الفئة
  parentId: null,            // الحساب الأب
  isActive: true,            // نشط؟
  isPostable: true,          // قابل للترحيل؟
  currency: "SAR"            // العملة
}
```

### نموذج JournalEntry (قيد اليومية)

```javascript
{
  reference: "JE-2026-000001",
  date: "2026-01-19",
  description: "قيد افتتاحي",
  type: "manual",
  status: "posted",
  lines: [
    {
      accountId: "...",
      debit: 100000,
      credit: 0,
      description: "رصيد افتتاحي"
    },
    {
      accountId: "...",
      debit: 0,
      credit: 100000,
      description: "رأس المال"
    }
  ]
}
```

### نموذج Invoice (الفاتورة)

```javascript
{
  invoiceNumber: "INV-2026-000001",
  type: "sales",
  date: "2026-01-19",
  dueDate: "2026-02-18",
  customerName: "مركز التأهيل",
  items: [...],
  subtotal: 5000,
  taxAmount: 750,
  total: 5750,
  status: "paid",
  paidAmount: 5750,
  remainingAmount: 0
}
```

---

## 🚀 التثبيت والإعداد

### 1. تثبيت الحزم المطلوبة

```bash
npm install mongoose express jsonwebtoken
```

### 2. تسجيل المسارات

```javascript
// backend/server.js
const accountingRoutes = require('./routes/accounting.routes');
app.use('/api/accounting', accountingRoutes);
```

### 3. إعداد دليل الحسابات الأساسي

قم بتشغيل السكريبت التالي لإنشاء الحسابات الأساسية:

```javascript
// backend/scripts/setup-accounts.js
const Account = require('../models/Account');

const defaultAccounts = [
  // الأصول
  { code: '1000', name: 'الأصول', type: 'asset', isPostable: false },
  { code: '1010', name: 'الصندوق', type: 'asset', parentId: '1000' },
  { code: '1020', name: 'البنك', type: 'asset', parentId: '1000' },
  { code: '1030', name: 'المدينون', type: 'asset', parentId: '1000' },

  // الخصوم
  { code: '2000', name: 'الخصوم', type: 'liability', isPostable: false },
  { code: '2010', name: 'الدائنون', type: 'liability', parentId: '2000' },
  {
    code: '2020',
    name: 'ضريبة القيمة المضافة',
    type: 'liability',
    parentId: '2000',
  },

  // حقوق الملكية
  { code: '3000', name: 'حقوق الملكية', type: 'equity', isPostable: false },
  { code: '3010', name: 'رأس المال', type: 'equity', parentId: '3000' },
  { code: '3020', name: 'الأرباح المحتجزة', type: 'equity', parentId: '3000' },

  // الإيرادات
  { code: '4000', name: 'الإيرادات', type: 'revenue', isPostable: false },
  { code: '4010', name: 'إيرادات الخدمات', type: 'revenue', parentId: '4000' },

  // المصروفات
  { code: '5000', name: 'المصروفات', type: 'expense', isPostable: false },
  { code: '5010', name: 'رواتب الموظفين', type: 'expense', parentId: '5000' },
  { code: '5020', name: 'الإيجار', type: 'expense', parentId: '5000' },
  { code: '5030', name: 'الكهرباء والماء', type: 'expense', parentId: '5000' },
];

async function setupAccounts() {
  for (const account of defaultAccounts) {
    await Account.create(account);
  }
  console.log('✅ تم إنشاء دليل الحسابات بنجاح');
}
```

---

## 🔍 اختبار النظام

### اختبار 1: إنشاء حساب

```bash
curl -X POST http://localhost:3001/api/accounting/accounts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "1040",
    "name": "حساب بنك الراجحي",
    "type": "asset",
    "category": "current_asset"
  }'
```

### اختبار 2: إنشاء قيد يومية

```bash
curl -X POST http://localhost:3001/api/accounting/journal-entries \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-01-19",
    "description": "إيداع في البنك",
    "lines": [
      { "accountId": "BANK_ACCOUNT_ID", "debit": 50000, "credit": 0 },
      { "accountId": "CASH_ACCOUNT_ID", "debit": 0, "credit": 50000 }
    ]
  }'
```

---

## 📈 الأداء والتحسين

### استعلامات مُحسّنة

- استخدام الفهارس على الحقول الأساسية
- Pagination للبيانات الكبيرة
- Aggregation للتقارير المعقدة
- Caching للتقارير المستخدمة بكثرة

### معالجة البيانات الكبيرة

```javascript
// معالجة دفعات كبيرة من القيود
const batchSize = 1000;
for (let i = 0; i < entries.length; i += batchSize) {
  const batch = entries.slice(i, i + batchSize);
  await JournalEntry.insertMany(batch);
}
```

---

## 🛡️ الأمان وأفضل الممارسات

### 1. التحقق من صحة البيانات

```javascript
// استخدام مكتبة express-validator
const { body } = require('express-validator');

router.post(
  '/accounts',
  body('code').notEmpty().trim(),
  body('name').notEmpty().trim(),
  body('type').isIn(['asset', 'liability', 'equity', 'revenue', 'expense'])
  // ...
);
```

### 2. منع SQL Injection

- استخدام Mongoose Schemas
- عدم تمرير query parameters مباشرة

### 3. Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

const accountingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 100, // 100 طلب كحد أقصى
});

app.use('/api/accounting', accountingLimiter);
```

---

## 🎓 أمثلة متقدمة

### إقفال السنة المالية

```javascript
async function closeF fiscalYear(year) {
  // 1. التحقق من توازن الحسابات
  const trialBalance = await accountingService.generateTrialBalance({
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`
  });

  if (!trialBalance.totals.balanced) {
    throw new Error('ميزان المراجعة غير متوازن');
  }

  // 2. حساب صافي الربح/الخسارة
  const incomeStatement = await accountingService.generateIncomeStatement({
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`
  });

  const netIncome = incomeStatement.netIncome.amount;

  // 3. إنشاء قيد الإقفال
  const settings = await AccountingSettings.findOne();

  await accountingService.createJournalEntry({
    date: new Date(`${year}-12-31`),
    description: `قيد إقفال السنة المالية ${year}`,
    type: 'closing',
    lines: [
      {
        accountId: settings.defaultAccounts.retainedEarningsAccount,
        debit: netIncome > 0 ? 0 : Math.abs(netIncome),
        credit: netIncome > 0 ? netIncome : 0,
        description: 'قيد إقفال صافي الربح/الخسارة'
      }
      // إقفال حسابات الإيرادات والمصروفات...
    ]
  });

  // 4. وضع علامة على الفترة كمقفلة
  await accountingService.closePeriod({ endDate: `${year}-12-31` });

  console.log(`✅ تم إقفال السنة المالية ${year}`);
}
```

---

## 📚 المراجع والموارد

### التوثيق الرسمي

- [Mongoose Documentation](https://mongoosejs.com/)
- [Express.js](https://expressjs.com/)
- [JWT Authentication](https://jwt.io/)

### معايير المحاسبة

- المعايير الدولية لإعداد التقارير المالية (IFRS)
- المعايير السعودية للمحاسبة
- نظام ضريبة القيمة المضافة السعودي

---

## ✅ قائمة التحقق

### قبل الإطلاق:

- [ ] إعداد دليل الحسابات الأساسي
- [ ] تكوين الإعدادات المحاسبية
- [ ] إنشاء المستخدمين والأدوار
- [ ] اختبار إنشاء القيود
- [ ] اختبار إنشاء الفواتير
- [ ] مراجعة التقارير المالية
- [ ] التحقق من حسابات الضريبة
- [ ] إعداد النسخ الاحتياطية

### بعد الإطلاق:

- [ ] مراقبة الأداء
- [ ] مراجعة سجلات التدقيق
- [ ] تحديثات دورية للنظام
- [ ] تدريب المستخدمين
- [ ] دعم فني مستمر

---

## 🎉 الخلاصة

تم تطوير **نظام محاسبي احترافي ومتكامل** يشمل:

✅ **9 نماذج** كاملة (Models) ✅ **30+ وظيفة** (Service Methods) ✅ **40+ نقطة
نهاية** (API Endpoints) ✅ **7 تقارير** مالية شاملة ✅ **حماية كاملة** (JWT +
Roles) ✅ **سجل تدقيق** شامل ✅ **دعم ضريبة** القيمة المضافة ✅ **إدارة
ميزانيات** ✅ **تحليلات متقدمة**

---

## 📞 الدعم الفني

للاستفسارات والدعم:

- 📧 البريد الإلكتروني: support@system.com
- 📱 الهاتف: +966-XX-XXX-XXXX
- 💬 الدعم الفني: متاح 24/7

---

**تم بحمد الله ✨**

التاريخ: 19 يناير 2026 النسخة: 1.0.0

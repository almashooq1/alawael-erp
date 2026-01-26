# ⚡ الإعداد السريع للنظام المحاسبي - 5 دقائق

## 🚀 البدء السريع

### الخطوة 1: تسجيل المسارات (30 ثانية)

```javascript
// backend/server.js أو app.js
const accountingRoutes = require('./routes/accounting.routes');

// إضافة المسار
app.use('/api/accounting', accountingRoutes);
```

---

### الخطوة 2: إنشاء دليل الحسابات الأساسي (2 دقيقة)

```javascript
// قم بتشغيل هذا الكود مرة واحدة
const Account = require('./models/Account');

const accounts = [
  // أصول
  {
    code: '1010',
    name: 'الصندوق',
    nameEn: 'Cash',
    type: 'asset',
    category: 'current_asset',
  },
  {
    code: '1020',
    name: 'البنك',
    nameEn: 'Bank',
    type: 'asset',
    category: 'current_asset',
  },
  {
    code: '1030',
    name: 'المدينون',
    nameEn: 'Accounts Receivable',
    type: 'asset',
    category: 'current_asset',
  },

  // خصوم
  {
    code: '2010',
    name: 'الدائنون',
    nameEn: 'Accounts Payable',
    type: 'liability',
    category: 'current_liability',
  },
  {
    code: '2020',
    name: 'ضريبة القيمة المضافة',
    nameEn: 'VAT Payable',
    type: 'liability',
    category: 'current_liability',
  },

  // حقوق ملكية
  {
    code: '3010',
    name: 'رأس المال',
    nameEn: 'Capital',
    type: 'equity',
    category: 'capital',
  },
  {
    code: '3020',
    name: 'الأرباح المحتجزة',
    nameEn: 'Retained Earnings',
    type: 'equity',
    category: 'retained_earnings',
  },

  // إيرادات
  {
    code: '4010',
    name: 'إيرادات الخدمات',
    nameEn: 'Service Revenue',
    type: 'revenue',
    category: 'operating_revenue',
  },

  // مصروفات
  {
    code: '5010',
    name: 'الرواتب',
    nameEn: 'Salaries',
    type: 'expense',
    category: 'operating_expense',
  },
  {
    code: '5020',
    name: 'الإيجار',
    nameEn: 'Rent',
    type: 'expense',
    category: 'operating_expense',
  },
  {
    code: '5030',
    name: 'المرافق',
    nameEn: 'Utilities',
    type: 'expense',
    category: 'operating_expense',
  },
];

async function setup() {
  for (const acc of accounts) {
    await Account.create(acc);
  }
  console.log('✅ تم إنشاء الحسابات');
}

setup();
```

---

### الخطوة 3: إعداد الإعدادات الأساسية (1 دقيقة)

```javascript
const AccountingSettings = require('./models/AccountingSettings');

const settings = await AccountingSettings.create({
  companyInfo: {
    name: 'اسم شركتك',
    nameEn: 'Your Company Name',
    taxNumber: '123456789000003',
    email: 'info@company.com',
  },
  baseCurrency: 'SAR',
  defaultTaxRate: 0.15,
  fiscalYear: {
    startMonth: 1,
    endMonth: 12,
  },
});

console.log('✅ تم إنشاء الإعدادات');
```

---

### الخطوة 4: إضافة الأدوار (30 ثانية)

```javascript
// أضف دور "accountant" للمستخدم
const User = require('./models/User');

await User.findByIdAndUpdate(userId, {
  $addToSet: { roles: 'accountant' },
});

console.log('✅ تم إضافة دور المحاسب');
```

---

### الخطوة 5: اختبار API (1 دقيقة)

```bash
# اختبار 1: الحصول على الحسابات
curl http://localhost:3001/api/accounting/accounts \
  -H "Authorization: Bearer YOUR_TOKEN"

# اختبار 2: إنشاء فاتورة
curl -X POST http://localhost:3001/api/accounting/invoices \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "sales",
    "date": "2026-01-19",
    "customerName": "عميل تجريبي",
    "items": [{
      "description": "خدمة تجريبية",
      "quantity": 1,
      "unitPrice": 1000,
      "taxRate": 0.15
    }]
  }'
```

---

## 🎯 الميزات الجاهزة للاستخدام

### ✅ جاهزة الآن:

- 📊 دليل الحسابات
- 📝 قيود اليومية
- 🧾 الفواتير
- 💳 المدفوعات
- 📈 التقارير المالية (7 تقارير)
- 🧮 ضريبة القيمة المضافة
- 📊 الميزانيات
- 💸 المصروفات
- 📊 التحليلات

### 📦 إجمالي:

- **9 نماذج** كاملة
- **40+ API** جاهزة
- **30+ وظيفة** في الخدمة
- **7 تقارير** مالية

---

## 🔐 المصادقة

جميع المسارات تتطلب:

```javascript
headers: {
  'Authorization': 'Bearer YOUR_JWT_TOKEN',
  'Content-Type': 'application/json'
}
```

الأدوار المطلوبة: `accountant` أو `admin`

---

## 📊 أمثلة سريعة

### 1. إنشاء قيد يومية

```javascript
POST /api/accounting/journal-entries

{
  "date": "2026-01-19",
  "description": "قيد افتتاحي",
  "lines": [
    { "accountId": "CASH_ID", "debit": 100000, "credit": 0 },
    { "accountId": "CAPITAL_ID", "debit": 0, "credit": 100000 }
  ]
}
```

### 2. إنشاء فاتورة مبيعات

```javascript
POST /api/accounting/invoices

{
  "type": "sales",
  "date": "2026-01-19",
  "customerName": "عميل ABC",
  "items": [
    {
      "description": "خدمة علاج طبيعي",
      "quantity": 10,
      "unitPrice": 500,
      "taxRate": 0.15
    }
  ]
}
```

### 3. تسجيل دفعة

```javascript
POST /api/accounting/invoices/:id/pay

{
  "amount": 5750,
  "paymentMethod": "bank_transfer",
  "paymentDate": "2026-01-19",
  "accountId": "BANK_ACCOUNT_ID"
}
```

### 4. تقرير ميزان المراجعة

```javascript
GET /api/accounting/reports/trial-balance
  ?startDate=2026-01-01
  &endDate=2026-01-31
```

---

## 🛠️ استكشاف الأخطاء

### خطأ: "الحساب غير موجود"

**الحل:** تأكد من تشغيل سكريبت إنشاء الحسابات (الخطوة 2)

### خطأ: "Unauthorized"

**الحل:** تحقق من:

1. وجود التوكن في الـ headers
2. صلاحيات المستخدم (يجب أن يكون accountant أو admin)

### خطأ: "مجموع المدين لا يساوي الدائن"

**الحل:** في قيود اليومية، تأكد من أن:

```javascript
مجموع debit = مجموع credit
```

---

## 📞 الدعم

للمزيد من التفاصيل، راجع:

- 📖 الدليل الكامل: `📊_ACCOUNTING_SYSTEM_COMPLETE_GUIDE.md`
- 💻 الكود المصدري: `backend/services/accounting.service.js`
- 🔗 المسارات: `backend/routes/accounting.routes.js`

---

## ✅ قائمة التحقق السريعة

- [ ] تسجيل المسارات في server.js
- [ ] إنشاء الحسابات الأساسية
- [ ] إعداد الإعدادات الأولية
- [ ] إضافة دور accountant للمستخدم
- [ ] اختبار API الأساسي
- [ ] مراجعة التوثيق الكامل

---

**🎉 جاهز للعمل في 5 دقائق!**

التاريخ: 19 يناير 2026

# ⚡ البدء السريع - نظام المحاسبة

## 🚀 البدء الفوري (5 دقائق)

### الخطوة 1: تشغيل الخادم
```bash
cd backend
node test-accounting-server.js

# أو إذا واجهت مشاكل:
node tiny-server.js
```

**النتيجة المتوقعة:**
```
🚀 ACCOUNTING TEST SERVER STARTED
📍 Server: http://localhost:3002
📍 Invoices: http://localhost:3002/api/accounting/invoices
📍 Payments: http://localhost:3002/api/accounting/payments
📍 Expenses: http://localhost:3002/api/accounting/expenses
```

---

### الخطوة 2: اختبار الـ APIs

#### أ) اختبار الصحة
```bash
curl http://localhost:3002/
```

#### ب) الفواتير
```bash
# الحصول على جميع الفواتير
curl http://localhost:3002/api/accounting/invoices

# الإحصائيات
curl http://localhost:3002/api/accounting/invoices/stats

# إنشاء فاتورة
curl -X POST http://localhost:3002/api/accounting/invoices \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceDate": "2026-01-20",
    "dueDate": "2026-02-20",
    "customerName": "Test Customer",
    "customerEmail": "test@example.com",
    "type": "sales",
    "items": [{"description": "Service", "quantity": 1, "unitPrice": 1000, "vatRate": 15}]
  }'
```

#### ج) المدفوعات
```bash
# الحصول على جميع المدفوعات
curl http://localhost:3002/api/accounting/payments

# الإحصائيات
curl http://localhost:3002/api/accounting/payments/stats
```

#### د) المصروفات
```bash
# الحصول على جميع المصروفات
curl http://localhost:3002/api/accounting/expenses

# إنشاء مصروف
curl -X POST http://localhost:3002/api/accounting/expenses \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-01-20",
    "category": "rent",
    "amount": 10000,
    "paymentMethod": "bank",
    "vendor": "Company"
  }'
```

---

## 🔧 المشاكل الشائعة والحلول

### المشكلة: المنفذ مشغول
```bash
# الحل: استخدام منفذ مختلف
# عدّل PORT في الملف (مثلاً 3009)

# أو اقتل العملية القديمة:
# Windows:
taskkill /PID <ProcessID> /F

# Linux/Mac:
kill -9 <ProcessID>
```

### المشكلة: Error: Cannot find module
```bash
# الحل: تثبيت الحزم المفقودة
npm install

# ثم أعد تشغيل الخادم
```

### المشكلة: MongoDB connection failed
```bash
# لا تقلق - الخادم يعمل بدون MongoDB
# لاحقاً سيتم ربط قاعدة البيانات
```

---

## 📊 الـ Endpoints المتاحة الآن

### الفواتير (9)
```
GET    /api/accounting/invoices           ✅
GET    /api/accounting/invoices/stats     ✅
GET    /api/accounting/invoices/:id       ✅
POST   /api/accounting/invoices           ✅
PUT    /api/accounting/invoices/:id       ✅
DELETE /api/accounting/invoices/:id       ✅
POST   /api/accounting/invoices/:id/payment ✅
POST   /api/accounting/invoices/:id/send    ✅
GET    /api/accounting/invoices/:id/pdf     ✅
```

### المدفوعات (7)
```
GET    /api/accounting/payments           ✅
GET    /api/accounting/payments/stats     ✅
GET    /api/accounting/payments/:id       ✅
POST   /api/accounting/payments           ✅
PUT    /api/accounting/payments/:id       ✅
DELETE /api/accounting/payments/:id       ✅
GET    /api/accounting/payments/:id/receipt ✅
```

### المصروفات (8)
```
GET    /api/accounting/expenses           ✅
GET    /api/accounting/expenses/stats     ✅
GET    /api/accounting/expenses/:id       ✅
POST   /api/accounting/expenses           ✅
PUT    /api/accounting/expenses/:id       ✅
DELETE /api/accounting/expenses/:id       ✅
POST   /api/accounting/expenses/:id/approve ✅
POST   /api/accounting/expenses/:id/reject  ✅
```

---

## 🧪 Postman Testing

### إذا كنت تستخدم Postman:

1. **استيراد Collection**
   - اذهب إلى: File → Import
   - اختر: [Accounting Collection]

2. **تعيين Variables**
   - `{{baseUrl}}` = `http://localhost:3002`
   - `{{invoiceId}}` = استخدم ID من GET response

3. **بدء الاختبار**
   - اختبر Health Check أولاً
   - ثم الـ GET endpoints
   - ثم POST endpoints

---

## 📱 استخدام من Frontend

### مثال React
```javascript
import axios from 'axios';

const API = 'http://localhost:3002/api/accounting';

// الحصول على الفواتير
const getInvoices = async () => {
  const { data } = await axios.get(`${API}/invoices`);
  return data.data; // Array of invoices
};

// إنشاء فاتورة جديدة
const createInvoice = async (invoiceData) => {
  const { data } = await axios.post(`${API}/invoices`, invoiceData);
  return data.data;
};

// تسجيل دفعة
const recordPayment = async (invoiceId, paymentData) => {
  const { data } = await axios.post(
    `${API}/invoices/${invoiceId}/payment`,
    paymentData
  );
  return data;
};
```

---

## ✅ قائمة تحقق

قبل الإنتاج:
- [ ] الخادم يعمل بدون أخطاء
- [ ] جميع Endpoints تستجيب
- [ ] البيانات تُحفظ بشكل صحيح
- [ ] الفواتير تُحدّث تلقائياً عند الدفع
- [ ] الأخطاء تُعالج بشكل صحيح

---

## 🚀 الخطوة التالية

بعد اختبار الـ APIs:
1. اربط Frontend مع Backend
2. حدّث صفحات المحاسبة الـ 8
3. اختبر التكامل الكامل
4. أنتشر للإنتاج

---

## 📞 الدعم

- **مشاكل تقنية**: اطلب الملفات الكاملة
- **استفسارات**: راجع `🎉_ACCOUNTING_SYSTEM_COMPLETE.md`
- **أمثلة API**: راجع `⚡_ACCOUNTING_API_TEST_GUIDE.md`

---

**Happy Testing! 🎉**

نظام المحاسبة جاهز للاستخدام الفوري!

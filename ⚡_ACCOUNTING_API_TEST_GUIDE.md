# 🎯 دليل اختبار Accounting APIs

## المعلومات الأساسية

- **Base URL**: `http://localhost:3002/api/accounting`
- **Server Status**: ✅ Running on port 3002
- **Authentication**: موفرة تلقائياً في السيرفر الاختباري

---

## 📄 Invoices API (9 Endpoints)

### 1. GET إحصائيات الفواتير

```http
GET /invoices/stats
```

**Response:**

```json
{
  "success": true,
  "data": {
    "totalInvoices": 0,
    "totalAmount": 0,
    "draft": 0,
    "sent": 0,
    "paid": 0,
    "partial": 0,
    "overdue": 0,
    "totalAmount": 0,
    "paidAmount": 0,
    "pendingAmount": 0
  }
}
```

### 2. GET جميع الفواتير

```http
GET /invoices
GET /invoices?status=draft
GET /invoices?type=sales
GET /invoices?search=شركة
```

**Response:**

```json
{
  "success": true,
  "data": []
}
```

### 3. GET فاتورة واحدة

```http
GET /invoices/:id
```

**Response:**

```json
{
  "success": true,
  "data": {
    "_id": "...",
    "invoiceNumber": "INV-2026-0001",
    "invoiceDate": "2026-01-20",
    "dueDate": "2026-02-20",
    "customerName": "شركة الأمل",
    "customerEmail": "info@amal.com",
    "customerPhone": "0501234567",
    "type": "sales",
    "status": "draft",
    "items": [
      {
        "description": "خدمة استشارية",
        "quantity": 10,
        "unitPrice": 500,
        "vatRate": 15,
        "amount": 5000
      }
    ],
    "subtotal": 5000,
    "vatAmount": 750,
    "totalAmount": 5750,
    "paidAmount": 0,
    "remainingAmount": 5750,
    "notes": "شروط الدفع: 30 يوم",
    "payments": [],
    "createdBy": "...",
    "updatedBy": "...",
    "createdAt": "2026-01-20T...",
    "updatedAt": "2026-01-20T..."
  }
}
```

### 4. POST إنشاء فاتورة جديدة

```http
POST /invoices
Content-Type: application/json

{
  "invoiceDate": "2026-01-20",
  "dueDate": "2026-02-20",
  "customerName": "شركة الأمل",
  "customerEmail": "info@amal.com",
  "customerPhone": "0501234567",
  "customerAddress": "الرياض، السعودية",
  "type": "sales",
  "items": [
    {
      "description": "خدمات استشارية",
      "quantity": 10,
      "unitPrice": 500,
      "vatRate": 15
    }
  ],
  "notes": "شروط الدفع: 30 يوم",
  "terms": "الدفع بعد الاستلام"
}
```

**Response:** `201 Created`

```json
{
  "success": true,
  "data": { ... },
  "message": "تم إنشاء الفاتورة بنجاح"
}
```

### 5. PUT تحديث فاتورة

```http
PUT /invoices/:id
Content-Type: application/json

{
  "customerName": "شركة النهاية",
  "items": [ ... ]
}
```

**Response:**

```json
{
  "success": true,
  "data": { ... },
  "message": "تم تحديث الفاتورة بنجاح"
}
```

### 6. DELETE حذف فاتورة

```http
DELETE /invoices/:id
```

**Response:**

```json
{
  "success": true,
  "message": "تم حذف الفاتورة بنجاح"
}
```

### 7. POST تسجيل دفعة للفاتورة

```http
POST /invoices/:id/payment
Content-Type: application/json

{
  "amount": 2000,
  "paymentDate": "2026-01-21",
  "paymentMethod": "bank",
  "reference": "TRX123456",
  "receivedBy": "محمد أحمد"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "payment": { ... },
    "updatedInvoice": { ... }
  }
}
```

### 8. POST إرسال الفاتورة

```http
POST /invoices/:id/send
Content-Type: application/json

{
  "sentTo": "info@amal.com"
}
```

**Response:**

```json
{
  "success": true,
  "data": { ... },
  "message": "تم إرسال الفاتورة بنجاح"
}
```

### 9. GET تحميل PDF الفاتورة

```http
GET /invoices/:id/pdf
```

---

## 💰 Payments API (7 Endpoints)

### 1. GET إحصائيات المدفوعات

```http
GET /payments/stats
```

**Response:**

```json
{
  "success": true,
  "data": {
    "totalPayments": 0,
    "totalAmount": 0,
    "cashPayments": 0,
    "bankPayments": 0,
    "creditPayments": 0,
    "transferPayments": 0,
    "chequePayments": 0,
    "todayPayments": 0,
    "todayAmount": 0
  }
}
```

### 2. GET جميع المدفوعات

```http
GET /payments
GET /payments?paymentMethod=cash
GET /payments?status=completed
GET /payments?search=TRX
```

### 3. GET مدفوعة واحدة

```http
GET /payments/:id
```

### 4. POST إنشاء مدفوعة

```http
POST /payments
Content-Type: application/json

{
  "invoice": "invoiceId",
  "amount": 2000,
  "paymentDate": "2026-01-21",
  "paymentMethod": "bank",
  "reference": "TRX123456",
  "receivedBy": "محمد أحمد",
  "transactionId": "TX-2026-001"
}
```

### 5. PUT تحديث مدفوعة

```http
PUT /payments/:id
Content-Type: application/json

{
  "status": "pending"
}
```

### 6. DELETE حذف مدفوعة

```http
DELETE /payments/:id
```

### 7. GET تحميل إيصال

```http
GET /payments/:id/receipt
```

---

## 💸 Expenses API (8 Endpoints)

### 1. GET إحصائيات المصروفات

```http
GET /expenses/stats
```

**Response:**

```json
{
  "success": true,
  "data": {
    "totalExpenses": 0,
    "totalAmount": 0,
    "pending": 0,
    "approved": 0,
    "rejected": 0,
    "thisMonth": 0,
    "thisMonthAmount": 0
  }
}
```

### 2. GET جميع المصروفات

```http
GET /expenses
GET /expenses?category=rent
GET /expenses?status=pending
GET /expenses?dateFrom=2026-01-01&dateTo=2026-01-31
GET /expenses?search=مكتب
```

### 3. GET مصروف واحد

```http
GET /expenses/:id
```

### 4. POST إنشاء مصروف

```http
POST /expenses
Content-Type: application/json

{
  "date": "2026-01-20",
  "category": "rent",
  "description": "إيجار المكتب - يناير 2026",
  "amount": 10000,
  "paymentMethod": "bank",
  "vendor": "شركة العقارات",
  "reference": "RENT-2026-01"
}
```

**Categories:**

- salaries (الرواتب)
- rent (الإيجار)
- utilities (الخدمات)
- supplies (المستلزمات)
- marketing (التسويق)
- transportation (النقل)
- maintenance (الصيانة)
- insurance (التأمين)
- professional (المهني)
- training (التدريب)
- travel (السفر)
- meals (الطعام)
- depreciation (الاستهلاك)
- other (أخرى)

### 5. PUT تحديث مصروف

```http
PUT /expenses/:id
Content-Type: application/json

{
  "description": "إيجار المكتب - يناير 2026 معدل"
}
```

### 6. DELETE حذف مصروف

```http
DELETE /expenses/:id
```

### 7. POST الموافقة على مصروف

```http
POST /expenses/:id/approve
```

**Response:**

```json
{
  "success": true,
  "data": { ... },
  "message": "تم الموافقة على المصروف بنجاح"
}
```

### 8. POST رفض مصروف

```http
POST /expenses/:id/reject
Content-Type: application/json

{
  "rejectionReason": "القيمة تتجاوز الميزانية المخصصة"
}
```

**Response:**

```json
{
  "success": true,
  "data": { ... },
  "message": "تم رفض المصروف"
}
```

---

## 🧪 أمثلة الاستخدام في Thunder Client / Postman

### 1. اختبار الاتصال

```
GET http://localhost:3002/
```

### 2. إنشاء فاتورة

```
POST http://localhost:3002/api/accounting/invoices
{
  "invoiceDate": "2026-01-20",
  "dueDate": "2026-02-20",
  "customerName": "اختبار",
  "customerEmail": "test@test.com",
  "type": "sales",
  "items": [{"description": "اختبار", "quantity": 1, "unitPrice": 100, "vatRate": 15}]
}
```

### 3. جلب الفواتير

```
GET http://localhost:3002/api/accounting/invoices
```

### 4. جلب الإحصائيات

```
GET http://localhost:3002/api/accounting/invoices/stats
GET http://localhost:3002/api/accounting/payments/stats
GET http://localhost:3002/api/accounting/expenses/stats
```

---

## ⚙️ متطلبات التشغيل

### 1. MongoDB (اختياري للاختبار)

```bash
# إذا كنت تستخدم MongoDB محليًا
mongod

# أو استخدم MongoDB Atlas
# اجعل MONGODB_URI في .env يشير إلى اتصالك
```

### 2. البيئة

```bash
# في ملف .env
MONGODB_URI=mongodb://localhost:27017/alawael-erp
TEST_PORT=3002
NODE_ENV=development
```

### 3. تشغيل السيرفر

```bash
cd backend
node test-accounting-server.js
```

---

## ✅ حالة الـ APIs

| Endpoint          | الحالة    | ملاحظات                 |
| ----------------- | --------- | ----------------------- |
| Invoice CRUD      | ✅ مكتملة | جاهزة للاستخدام         |
| Invoice Stats     | ✅ مكتملة | إحصائيات فورية          |
| Invoice Payments  | ✅ مكتملة | ربط تلقائي مع المدفوعات |
| Payment CRUD      | ✅ مكتملة | جاهزة للاستخدام         |
| Payment Stats     | ✅ مكتملة | إحصائيات فورية          |
| Expense CRUD      | ✅ مكتملة | جاهزة للاستخدام         |
| Expense Approval  | ✅ مكتملة | نظام موافقات مدمج       |
| Expense Stats     | ✅ مكتملة | إحصائيات فورية          |
| PDF Generation    | 🟡 قريباً | يحتاج pdfkit            |
| Email Integration | 🟡 قريباً | يحتاج nodemailer        |

---

## 🐛 استكشاف الأخطاء

### خطأ: Cannot connect to MongoDB

**الحل:** MongoDB غير مثبت أو متوقف. جرب:

```bash
# تشغيل بدون قاعدة بيانات (mock mode)
# السيرفر سيستمر بدون البيانات المستمرة
```

### خطأ: Port 3002 already in use

**الحل:** قتل العملية القديمة:

```powershell
Stop-Process -Name node -Force
```

### خطأ: CORS errors

**الحل:** CORS مفعل افتراضياً. تأكد من رؤوس الطلب:

```
Origin: http://localhost:3000
```

---

## 📝 الملفات المتعلقة

- [Models](backend/models/):
  - `AccountingInvoice.js`
  - `AccountingPayment.js`
  - `AccountingExpense.js`

- [Controllers](backend/controllers/):
  - `accounting-invoice.controller.js`
  - `accounting-payment.controller.js`
  - `accounting-expense.controller.js`

- [Routes](backend/routes/):
  - `accounting.routes.js`

- [Test Server](backend/):
  - `test-accounting-server.js`

---

## 🚀 الخطوات التالية

1. ✅ APIs مكتملة
2. ⏳ ربط Frontend
3. ⏳ اختبار شامل
4. ⏳ إضافة PDF/Email
5. ⏳ نشر

**آخر تحديث:** 20 يناير 2026

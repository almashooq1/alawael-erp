# ⚡ مراجع سريعة وأوامر شائعة - نظام الفوترة الذكية

**هذا الملف يحتوي على كل الأوامر والأشياء التي قد تحتاجها بسرعة!**

---

## 🚀 أوامر البدء السريع

### تشغيل الفاحص
```bash
node SMART_INVOICE_CHECKER.js
```

### البدء الفوري (3 خطوات)
```bash
# 1. اتبع QUICK_START_STEPS.md
# 2. أضف في server.js:
const smartInvoiceRoutes = require('./routes/smartInvoice.routes');
app.use('/api/invoices', smartInvoiceRoutes);

# 3. شغل التطبيق
npm start
```

---

## 📝 API Endpoints الرئيسية

### 🔵 الفواتير

```bash
# إنشاء فاتورة جديدة
POST /api/invoices
{
  "invoiceNumber": "2025-001",
  "customer": "أحمد محمد",
  "amount": 5000
}

# جلب جميع الفواتير
GET /api/invoices

# جلب فاتورة محددة
GET /api/invoices/{id}

# تحديث فاتورة
PUT /api/invoices/{id}

# حذف فاتورة
DELETE /api/invoices/{id}
```

### 💰 المدفوعات

```bash
# تسجيل دفعة
POST /api/invoices/{id}/payments
{
  "amount": 2500,
  "paymentMethod": "bank_transfer"
}

# جلب المدفوعات
GET /api/invoices/{id}/payments
```

### 🤖 الميزات الذكية

```bash
# التنبؤ بالدفع
GET /api/invoices/{id}/prediction

# التوصيات الذكية
GET /api/invoices/{id}/recommendations

# نقاط التنبيه
GET /api/invoices/{id}/alerts
```

### 📊 التقارير

```bash
# الإحصائيات العامة
GET /api/invoices/reports/statistics

# الفواتير المتأخرة
GET /api/invoices/reports/overdue

# تقرير شهري
GET /api/invoices/reports/monthly?month=2025-02
```

### 📤 التصدير والإرسال

```bash
# إرسال بالبريد الإلكتروني
POST /api/invoices/{id}/send

# تذكير العميل
POST /api/invoices/{id}/remind

# تصدير CSV
GET /api/invoices/export/csv

# تصدير JSON
GET /api/invoices/export/json
```

---

## 🔐 مثال كامل مع cURL

### إنشاء فاتورة وتسجيل دفعة

```bash
# 1. البحصول على TOKEN (موجود لديك)
TOKEN="your_jwt_token_here"

# 2. إنشاء فاتورة
curl -X POST http://localhost:5000/api/invoices \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "invoiceNumber": "INV-2025-001",
    "customer": {
      "name": "أحمد محمد",
      "email": "ahmed@company.com",
      "phone": "966501234567"
    },
    "items": [
      {
        "description": "خدمة استشارية",
        "quantity": 1,
        "unitPrice": 5000
      }
    ],
    "dueDate": "2025-03-17",
    "status": "issued"
  }'

# 3. تسجيل دفعة
INVOICE_ID="من الاستجابة أعلاه"
curl -X POST http://localhost:5000/api/invoices/$INVOICE_ID/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "amount": 2500,
    "paymentMethod": "bank_transfer",
    "reference": "TRF123456"
  }'

# 4. الحصول على التنبؤ
curl -X GET http://localhost:5000/api/invoices/$INVOICE_ID/prediction \
  -H "Authorization: Bearer $TOKEN"
```

---

## 💻 أمثلة في JavaScript/Node.js

### إنشاء فاتورة برمجياً

```javascript
const axios = require('axios');

const token = 'your_jwt_token';
const baseURL = 'http://localhost:5000/api';

async function createInvoice() {
  try {
    const response = await axios.post(`${baseURL}/invoices`, {
      invoiceNumber: 'INV-2025-001',
      customer: {
        name: 'أحمد محمد',
        email: 'ahmed@company.com'
      },
      amount: 5000,
      dueDate: '2025-03-17'
    }, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('فاتورة تم إنشاؤها:', response.data);
    return response.data;
  } catch (error) {
    console.error('خطأ:', error.message);
  }
}

createInvoice();
```

### تسجيل دفعة

```javascript
async function recordPayment(invoiceId, amount) {
  try {
    const response = await axios.post(
      `${baseURL}/invoices/${invoiceId}/payments`,
      {
        amount,
        paymentMethod: 'bank_transfer',
        reference: 'TRF123456'
      },
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    
    console.log('دفعة تم تسجيلها:', response.data);
    return response.data;
  } catch (error) {
    console.error('خطأ:', error.message);
  }
}
```

### الحصول على التنبؤ

```javascript
async function getPrediction(invoiceId) {
  try {
    const response = await axios.get(
      `${baseURL}/invoices/${invoiceId}/prediction`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    
    console.log('التنبؤ:', response.data);
    // {
    //   predictedPaymentDate: '2025-03-10',
    //   confidence: 85,
    //   riskLevel: 'low'
    // }
    return response.data;
  } catch (error) {
    console.error('خطأ:', error.message);
  }
}
```

### الحصول على الإحصائيات

```javascript
async function getStatistics() {
  try {
    const response = await axios.get(
      `${baseURL}/invoices/reports/statistics`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    
    console.log('الإحصائيات:', response.data);
    // {
    //   totalInvoices: 150,
    //   totalAmount: 500000,
    //   paidAmount: 350000,
    //   collectionRate: 70
    // }
    return response.data;
  } catch (error) {
    console.error('خطأ:', error.message);
  }
}
```

---

## 🔧 أمثلة في React

### استخدام في Component

```javascript
import { useState, useEffect } from 'react';
import axios from 'axios';

function InvoiceForm() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // جلب الفواتير
  useEffect(() => {
    const fetchInvoices = async () => {
      setLoading(true);
      try {
        const response = await axios.get('/api/invoices', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setInvoices(response.data);
      } catch (error) {
        console.error('خطأ:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchInvoices();
  }, []);
  
  // إنشاء فاتورة جديدة
  const handleCreateInvoice = async (data) => {
    try {
      const response = await axios.post('/api/invoices', data, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setInvoices([...invoices, response.data]);
    } catch (error) {
      console.error('خطأ:', error);
    }
  };
  
  // تسجيل دفعة
  const handlePayment = async (invoiceId, amount) => {
    try {
      await axios.post(
        `/api/invoices/${invoiceId}/payments`,
        { amount, paymentMethod: 'bank_transfer' },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      // تحديث الفواتير
      const updatedInvoices = await axios.get('/api/invoices', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setInvoices(updatedInvoices.data);
    } catch (error) {
      console.error('خطأ:', error);
    }
  };
  
  return (
    <div>
      <h1>الفواتير</h1>
      {loading ? <p>جاري التحميل...</p> : (
        <table>
          <tbody>
            {invoices.map(invoice => (
              <tr key={invoice._id}>
                <td>{invoice.invoiceNumber}</td>
                <td>{invoice.customer.name}</td>
                <td>{invoice.amount}</td>
                <td>
                  <button onClick={() => handlePayment(invoice._id, 1000)}>
                    دفع
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

---

## 🎯 اختصارات شائعة

### متى تحتاج... اضغط على

| الحاجة | الحل |
|--------|------|
| **بدء سريع** | `QUICK_START_STEPS.md` |
| **فاتورة جديدة** | `POST /api/invoices` |
| **دفعة جديدة** | `POST /api/invoices/{id}/payments` |
| **توقعات الدفع** | `GET /api/invoices/{id}/prediction` |
| **اقتراحات** | `GET /api/invoices/{id}/recommendations` |
| **إحصائيات** | `GET /api/invoices/reports/statistics` |
| **مساعدة** | `TROUBLESHOOTING_FAQ.md` |
| **فاحص** | `node SMART_INVOICE_CHECKER.js` |
| **أمثلة** | `SMART_INVOICE_QUICK_START.js` |

---

## 🔐 معايير الأمان

### Header المصادقة
```javascript
headers: {
  'Authorization': `Bearer ${jwt_token}`,
  'Content-Type': 'application/json'
}
```

### CORS Configuration
```javascript
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
```

### معايير الترخيص
```javascript
// فقط الـ Admins
authorize(['admin'])

// Admins و Finance
authorize(['admin', 'finance'])

// أي مستخدم يملك نفس الـ ID
authorize('self')
```

---

## 📊 الحقول المهمة في الفاتورة

```javascript
{
  // المعرف
  _id: "60d5ec49c1234567890abcde",
  invoiceNumber: "INV-2025-001",
  
  // العميل
  customer: {
    name: "أحمد محمد",
    email: "ahmed@company.com",
    phone: "966501234567",
    address: "الرياض",
    taxId: "123456789"
  },
  
  // البيانات المالية
  items: [{
    description: "خدمة",
    quantity: 1,
    unitPrice: 5000
  }],
  subtotal: 5000,
  taxAmount: 750,
  discountAmount: 0,
  feeAmount: 0,
  totalAmount: 5750,
  paidAmount: 0,
  remainingBalance: 5750,
  
  // التواريخ
  issueDate: "2025-02-17",
  dueDate: "2025-03-17",
  
  // الحالة
  status: "issued", // draft, issued, sent, partially_paid, paid, overdue, cancelled
  paymentStatus: "pending", // pending, partial, completed
  
  // الذكاء
  predictedPaymentDate: "2025-03-10",
  riskLevel: "low", // low, medium, high
  
  // الأمان
  auditTrail: [{
    action: "CREATED",
    timestamp: new Date(),
    details: {}
  }]
}
```

---

## ✅ قائمة التحقق قبل الإطلاق

```javascript
☑️ جميع الملفات منسوخة
☑️ جميع الـ import صحيحة
☑️ جميع الـ routes مسجلة
☑️ قاعدة البيانات متصلة
☑️ JWT يعمل
☑️ CORS معد
☑️ البريد الإلكتروني معد (اختياري)
☑️ الاختبار الأول يعمل
☑️ الإحصائيات تظهر
☑️ جاهز للذهاب! 🚀
```

---

**💡 احفظ هذا الملف! ستحتاجه كثيراً!**

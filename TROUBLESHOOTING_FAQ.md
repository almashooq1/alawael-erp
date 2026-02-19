# ❓ FAQ و الحلول السريعة - نظام الفوترة الذكية

---

## 🔴 الأخطاء الشائعة والحل

### ❌ الخطأ: "Cannot find module 'SmartInvoice'"

**السبب:** الملف لم ينسخ بشكل صحيح

**الحل:**
```bash
# تحقق من وجود الملف
ls backend/models/SmartInvoice.js

# إذا لم يكن موجوداً، انسخه مجدداً
cp SmartInvoice.js backend/models/SmartInvoice.js

# من backend، أحاول Import مباشرة
node -e "require('./models/SmartInvoice.js')"
```

---

### ❌ الخطأ: "Cannot find module 'SmartInvoiceService'"

**السبب:** ملف الخدمة لم ينسخ

**الحل:**
```bash
# تحقق
ls backend/services/SmartInvoiceService.js

# انسخ
cp SmartInvoiceService.js backend/services/SmartInvoiceService.js
```

---

### ❌ الخطأ: "Route ... not found"

**السبب:** المسارات لم تسجل في server.js

**الحل:**
```javascript
// في backend/server.js، أضف:
const smartInvoiceRoutes = require('./routes/smartInvoice.routes');
app.use('/api/invoices', smartInvoiceRoutes);

// ثم أعد تشغيل الخادم
npm start
```

---

### ❌ الخطأ: "Material-UI components not found"

**السبب:** المكتبة لم تثبت

**الحل:**
```bash
cd frontend
npm install @mui/material @mui/icons-material
npm install recharts  # إذا لم تكن موجودة
npm start
```

---

### ❌ الخطأ: "Cannot GET /api/invoices"

**السبب:** المسارات لم تسجل صحيحاً

**الحل:**
```javascript
// تحقق من server.js:
// 1. هل الملف مستورد؟
const smartInvoiceRoutes = require('./routes/smartInvoice.routes');

// 2. هل المسار مسجل؟
app.use('/api/invoices', smartInvoiceRoutes);

// 3. هل الخادم يعمل؟
console.log('Server running on port 5000');

// 4. أعد تشغيل الخادم
npm start
```

---

### ❌ الخطأ: "Unexpected token <" أو مشاكل JSX

**السبب:** ملف React في المسار الخطأ

**الحل:**
```bash
# تأكد من أن SmartInvoiceDashboard.jsx ينسخ للمكان الصحيح
cp SmartInvoiceDashboard.jsx frontend/src/components/SmartInvoiceDashboard.jsx

# تحقق من الامتداد: .jsx وليس .js
ls frontend/src/components/SmartInvoiceDashboard.jsx
```

---

### ❌ الخطأ: "CORS error"

**السبب:** Cross-Origin مشاكل

**الحل:**
```javascript
// في backend/server.js، أضف:
const cors = require('cors');
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
```

---

### ❌ الخطأ: "Unauthorized" (401)

**السبب:** التوكن غير صحيح

**الحل:**
```javascript
// في Postman أو Frontend، استخدم:
Headers: {
  'Authorization': 'Bearer YOUR_JWT_TOKEN'
}

// أو في smartInvoice.routes.js:
router.get('/', verifyToken, (req, res) => {
  // your code
});
```

---

## 💡 الأسئلة الشائعة

### س1: كيف أنشئ فاتورة برمجياً؟

**الجواب:**

```javascript
// الطريقة 1: عبر cURL
curl -X POST http://localhost:5000/api/invoices \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "invoiceNumber": "2025-001",
    "customerId": "60d5ec49c1234567890abcde",
    "items": [
      {
        "description": "خدمة استشارية",
        "quantity": 1,
        "unitPrice": 5000
      }
    ],
    "customer": {
      "name": "أحمد محمد",
      "email": "ahmed@example.com"
    }
  }'

// الطريقة 2: في React
import axios from 'axios';

const createInvoice = async () => {
  const response = await axios.post('/api/invoices', {
    invoiceNumber: '2025-001',
    customer: 'أحمد محمد',
    amount: 5000,
    status: 'draft'
  }, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.data;
};

// الطريقة 3: مباشرة في Node.js
const SmartInvoiceService = require('./services/SmartInvoiceService');
const invoice = await SmartInvoiceService.createInvoice({
  invoiceNumber: '2025-001',
  customer: 'أحمد محمد',
  amount: 5000
});
```

---

### س2: كيف أسجل دفعة على فاتورة؟

**الجواب:**

```javascript
// عبر cURL
curl -X POST http://localhost:5000/api/invoices/{INVOICE_ID}/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "amount": 2500,
    "paymentMethod": "bank_transfer",
    "reference": "TRF123456"
  }'

// في React
const recordPayment = async (invoiceId, amount) => {
  const response = await axios.post(
    `/api/invoices/${invoiceId}/payments`,
    {
      amount,
      paymentMethod: 'bank_transfer',
      reference: 'TRF123456'
    },
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  return response.data;
};

// في Node.js
const payment = await SmartInvoiceService.recordPayment(invoiceId, {
  amount: 2500,
  paymentMethod: 'bank_transfer'
});
```

---

### س3: كيف أحصل على التنبؤ بالدفع؟

**الجواب:**

```javascript
// عبر cURL
curl -X GET http://localhost:5000/api/invoices/{INVOICE_ID}/prediction \
  -H "Authorization: Bearer TOKEN"

// في React
const getPrediction = async (invoiceId) => {
  const response = await axios.get(
    `/api/invoices/${invoiceId}/prediction`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  console.log('Payment Date:', response.data.predictedPaymentDate);
  console.log('Confidence:', response.data.confidence);
  console.log('Risk Level:', response.data.riskLevel);
  return response.data;
};

// في Node.js
const prediction = await SmartInvoiceService.predictPayment(invoiceId);
console.log(prediction);
// {
//   predictedPaymentDate: '2025-02-24',
//   confidence: 85,
//   riskLevel: 'low',
//   trend: 'on-time'
// }
```

---

### س4: كيف أضيف حقول مخصصة؟

**الجواب:**

اقرأ `SMART_INVOICE_INTEGRATION_GUIDE.js` للتفاصيل الكاملة.

**ملخص سريع:**

```javascript
// في SmartInvoice.js، أضف في schema:
const smartInvoiceSchema = new Schema({
  // الحقول الموجودة...
  
  // حقل مخصص جديد
  customField1: {
    type: String,
    default: '',
    trim: true
  },
  
  // حقل متقدم
  customMetadata: {
    type: Map,
    of: String,
    default: {}
  }
});

// في الخدمة، استخدمه:
async createInvoice(invoiceData) {
  const invoice = new SmartInvoice({
    ...invoiceData,
    customField1: invoiceData.customField1,
    customMetadata: invoiceData.metadata
  });
  return await invoice.save();
}
```

---

### س5: كيف أرسل فاتورة بالبريد الإلكتروني؟

**الجواب:**

```javascript
// في smartInvoice.routes.js
router.post('/:id/send', verifyToken, authorize('admin', 'finance'), async (req, res) => {
  try {
    const invoiceId = req.params.id;
    const invoice = await SmartInvoice.findById(invoiceId);
    
    // أرسل بالبريد
    await SmartInvoiceService.sendInvoiceEmail(invoiceId, invoice.customer.email);
    
    res.status(200).json({
      success: true,
      message: 'تم إرسال الفاتورة بنجاح'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// في SmartInvoiceService.js
async sendInvoiceEmail(invoiceId, email) {
  const nodemailer = require('nodemailer');
  
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'فاتورتك الجديدة',
    html: `<h1>فاتورة #${invoiceId}</h1>`
  };
  
  await transporter.sendMail(mailOptions);
  
  // سجل الإرسال
  await this.addAuditTrail(invoiceId, 'SENT_EMAIL', {
    email_sent: true,
    timestamp: new Date()
  });
}
```

---

### س6: كيف أشغل Cron Jobs للتنبيهات؟

**الجواب:**

```javascript
// في backend/server.js
const cron = require('node-cron');
const SmartInvoiceService = require('./services/SmartInvoiceService');

// كل يوم الساعة 9 صباحاً
cron.schedule('0 9 * * *', async () => {
  try {
    console.log('🔔 فحص الفواتير المتأخرة...');
    
    const SmartInvoice = require('./models/SmartInvoice');
    const overdueInvoices = await SmartInvoice.findOverdue();
    
    for (let invoice of overdueInvoices) {
      // أرسل تذكير بريد إلكتروني
      await SmartInvoiceService.sendInvoiceEmail(
        invoice._id,
        invoice.customer.email
      );
      
      // أضف تنبيه
      await SmartInvoiceService.addAuditTrail(
        invoice._id,
        'DAILY_REMINDER',
        { sent_at: new Date() }
      );
    }
    
    console.log(`✅ تم فحص ${overdueInvoices.length} فاتورة متأخرة`);
  } catch (error) {
    console.error('❌ خطأ في Cron job:', error);
  }
});

console.log('✅ Cron jobs تم تفعيله');
```

---

### س7: ماذا عن الأمان والمصادقة؟

**الجواب:**

```javascript
// استخدم نفس JWT الموجود في مشروعك
// في smartInvoice.routes.js:

const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid token' });
  }
};

// وللترخيص:
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  };
};

// استخدام:
router.post('/api/invoices', verifyToken, authorize('admin', 'finance'), (req, res) => {
  // فقط الـ admin والـ finance يمكنهم إنشاء
});
```

---

### س8: كيف أرى الإحصائيات والتقارير؟

**الجواب:**

```javascript
// عبر API
curl -X GET http://localhost:5000/api/invoices/reports/statistics \
  -H "Authorization: Bearer TOKEN"

// الاستجابة:
{
  "totalInvoices": 150,
  "totalAmount": 500000,
  "paidAmount": 350000,
  "pendingAmount": 100000,
  "overdueAmount": 50000,
  "collectionRate": 70,
  "averagePaymentDays": 15,
  "overallStatus": "good"
}

// في React Dashboard
const [statistics, setStatistics] = useState({});

useEffect(() => {
  axios.get('/api/invoices/reports/statistics', {
    headers: { 'Authorization': `Bearer ${token}` }
  }).then(res => setStatistics(res.data));
}, []);

// عرض الإحصائيات
<Card>
  <h3>إجمالي الفواتير: {statistics.totalInvoices}</h3>
  <h3>المبلغ المدفوع: {statistics.paidAmount}</h3>
  <h3>معدل التحصيل: {statistics.collectionRate}%</h3>
</Card>
```

---

### س9: كيف أصدر تقرير CSV؟

**الجواب:**

```javascript
// عبر API
curl -X GET "http://localhost:5000/api/invoices/export/csv?month=2025-02" \
  -H "Authorization: Bearer TOKEN" \
  --output invoices.csv

// في React
<button onClick={() => {
  window.location.href = '/api/invoices/export/csv?month=2025-02';
}}>
  تحميل CSV
</button>
```

---

### س10: هل يمكن تخصيص المزيد؟

**الجواب:** **نعم!** اقرأ:

1. `SMART_INVOICE_INTEGRATION_GUIDE.js` - لمزيد التخصيصات
2. `SMART_INVOICE_SYSTEM_DOCUMENTATION.md` - للتفاصيل كاملة
3. `SMART_INVOICE_INDEX.md` - للملفات المتعلقة

---

## 🆘 لا تجد الحل؟

### خطوات التشخيص:

1. **اقرأ رسالة الخطأ بعناية** - غالباً تخبرك بالمشكلة
2. **شغل SMART_INVOICE_CHECKER.js** - سيساعدك يجد المشكلة
3. **اقرأ الملفات المرتبطة** - توثيق شامل موجود
4. **احفظ أي Custom Code** - قبل نسخ إصدار جديد

---

## 📚 الموارد

| للاستكشاف | اقرأ |
|-----------|------|
| تفاصيل كاملة | SMART_INVOICE_SYSTEM_DOCUMENTATION.md |
| أمثلة عملية | SMART_INVOICE_QUICK_START.js |
| التكامل المتقدم | SMART_INVOICE_INTEGRATION_GUIDE.js |
| الملفات | SMART_INVOICE_INDEX.md |
| فحص سريع | اشغل SMART_INVOICE_CHECKER.js |

---

**💪 أنت الآن جاهز لحل أي مشكلة! 🎉**

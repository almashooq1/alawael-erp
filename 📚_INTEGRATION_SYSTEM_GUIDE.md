# 🔗 نظام التكامل الموحد - Integration System

## 📋 نظرة عامة

نظام متكامل لتوصيل AlAwael ERP مع الجهات الحكومية والتأمينية والمختبرات الطبية،
مع ضمانات عالية للموثوقية والأمان والامتثال.

**الملفات المضافة:**

- `government-connector.js` - موصل الجهات الحكومية
- `insurance-connector.js` - موصل شركات التأمين
- `lab-connector.js` - موصل المختبرات الطبية
- `integration-manager.js` - مدير التكامل الموحد

---

## 🏛️ موصل الجهات الحكومية (Government Connector)

### الميزات الرئيسية

| الميزة              | الوصف                                |
| ------------------- | ------------------------------------ |
| **OAuth2/JWT Auth** | مصادقة آمنة مع الأنظمة الحكومية      |
| **Retry Logic**     | إعادة محاولة بـ exponential backoff  |
| **Circuit Breaker** | حماية من الأعطال المتكررة            |
| **Audit Logging**   | تسجيل شامل مع إخفاء البيانات الحساسة |
| **Request Signing** | توقيع HMAC لسلامة الطلبات            |

### API الرئيسية

```javascript
const { GovernmentConnector } = require('./government-connector');

const gov = new GovernmentConnector({
  baseURL: 'https://api.gov.sa',
  clientId: 'YOUR_CLIENT_ID',
  clientSecret: 'YOUR_CLIENT_SECRET',
});

// التحقق من هوية المواطن
const result = await gov.verifyCitizen(
  nationalId, // الرقم القومي
  fullName, // الاسم الكامل
  dateOfBirth // تاريخ الميلاد
);

// طلب موافقة حكومية
const consent = await gov.requestConsent(
  citizenId, // معرف المواطن
  'health-data', // نوع الموافقة
  ['medical', 'financial'] // النطاق
);

// الحصول على السجلات الصحية
const records = await gov.getCitizenHealthRecords(nationalId, consentToken);

// الإبلاغ عن حادث
const report = await gov.reportIncident(
  'medical-incident',
  'Description...',
  'high' // low, medium, high, critical
);
```

### متغيرات البيئة

```env
GOV_API_URL=https://api.gov.sa
GOV_CLIENT_ID=your_client_id
GOV_CLIENT_SECRET=your_client_secret
```

---

## 🛡️ موصل التأمين (Insurance Connector)

### الميزات الرئيسية

| الميزة                | الوصف                          |
| --------------------- | ------------------------------ |
| **Eligibility Check** | التحقق من غطاء التأمين         |
| **Claims Management** | إدارة الادعاءات (Submit/Track) |
| **Idempotency Keys**  | منع التكرار العرضي             |
| **Webhook Support**   | تلقي التحديثات الفورية         |
| **Provider Network**  | التحقق من الشركاء المرخصين     |

### API الرئيسية

```javascript
const { InsuranceConnector } = require('./insurance-connector');

const insurance = new InsuranceConnector({
  baseURL: 'https://api.insurance.sa',
  apiKey: 'YOUR_API_KEY',
  clientId: 'YOUR_CLIENT_ID',
  clientSecret: 'YOUR_CLIENT_SECRET',
  webhookUrl: 'https://yourdomain.com/webhooks/insurance',
});

// التحقق من الأهلية
const eligibility = await insurance.verifyEligibility(
  policyNumber,
  patientId,
  'rehabilitation'  // نوع الخدمة
);

// إرسال ادعاء تأمين
const claim = await insurance.submitClaim(
  patientId,
  policyNumber,
  {
    type: 'service',
    code: 'PT001',
    description: 'Physiotherapy Session',
    date: new Date(),
    provider: 'AlAwael Center',
    grossAmount: 500,
    copayAmount: 50,
    documents: [...], // PDF/scans
  }
);

// تتبع الادعاء
const status = await insurance.trackClaim(claimId);

// التحقق من الشريك
const verified = await insurance.verifyProvider(
  providerId,
  insurerId
);

// تسجيل webhook للتحديثات
await insurance.registerWebhook([
  'claim.approved',
  'claim.rejected',
  'claim.pending'
]);

// معالجة webhook
app.post('/webhooks/insurance', (req, res) => {
  insurance.handleWebhookEvent(req.body, req.headers['x-signature'])
    .then(() => res.sendStatus(200))
    .catch(() => res.sendStatus(400));
});

// الاستماع للأحداث
insurance.on('claim-approved', (data) => {
  console.log('Claim approved:', data);
});

insurance.on('claim-rejected', (data) => {
  console.log('Claim rejected:', data);
});
```

### متغيرات البيئة

```env
INSURANCE_API_URL=https://api.insurance.sa
INSURANCE_API_KEY=your_api_key
INSURANCE_CLIENT_ID=your_client_id
INSURANCE_CLIENT_SECRET=your_client_secret
INSURANCE_WEBHOOK_URL=https://yourdomain.com/webhooks/insurance
```

---

## 🧪 موصل المختبرات (Lab Connector)

### الميزات الرئيسية

| الميزة                  | الوصف                             |
| ----------------------- | --------------------------------- |
| **HL7/FHIR Support**    | معايير طبية عالمية                |
| **Order Tracking**      | تتبع حالة الفحوص                  |
| **Result Verification** | التحقق من التواقيع والمجاميع      |
| **Reconciliation**      | مطابقة الطلبات المعلقة            |
| **Poison Queue**        | إعادة محاولة آمنة للطلبات الفاشلة |

### API الرئيسية

```javascript
const { LabConnector } = require('./lab-connector');

const lab = new LabConnector({
  baseURL: 'https://api.labs.sa',
  apiKey: 'YOUR_API_KEY',
  format: 'json', // 'hl7', 'fhir', 'json'
  clientCert: fs.readFileSync('cert.pem'),
  clientKey: fs.readFileSync('key.pem'),
});

// إرسال أمر فحص
const order = await lab.submitOrder(
  'ORD-2026-001', // معرف الطلب
  'PAT-123', // معرف المريض
  [
    { code: '03020', name: 'Complete Blood Count', specimen: 'serum' },
    { code: '04018', name: 'Glucose Fasting', specimen: 'plasma' },
  ],
  'normal' // priority: 'normal', 'urgent'
);

// الحصول على النتائج
const results = await lab.getResults('ORD-2026-001');

// تتبع حالة الطلب
const status = await lab.trackOrder('ORD-2026-001');

// إلغاء طلب
await lab.cancelOrder('ORD-2026-001', 'Patient request');

// مطابقة الطلبات المعلقة (يعمل تلقائياً في الخلفية)
const reconciliation = await lab.reconcilePendingOrders();

// الاستماع للأحداث
lab.on('poison-queue', entry => {
  // إضافة إلى قائمة الإعادة
  console.log('Order added to retry queue:', entry);
});

lab.on('reconciliation-timeout', ({ orderId }) => {
  console.log('Order timed out:', orderId);
});
```

### معايير الصيغة

#### JSON (Default)

```json
{
  "orderId": "ORD-2026-001",
  "patientId": "PAT-123",
  "tests": [{ "code": "03020", "name": "CBC", "specimen": "serum" }],
  "priority": "normal",
  "submittedAt": "2026-01-23T12:00:00Z"
}
```

#### HL7 v2.5

```
MSH|^~\&|ERP|AlAwael|LAB|DEFAULT|202601231200||ORM^O01|ORD-001|P|2.5
PID|||PAT-123
ORC|NW|ORD-001|ORD-001|1
OBR|1|ORD-001|ORD-001|03020
```

#### FHIR R4

```json
{
  "resourceType": "ServiceRequest",
  "status": "active",
  "intent": "order",
  "code": { "coding": [...] }
}
```

### متغيرات البيئة

```env
LAB_API_URL=https://api.labs.sa
LAB_API_KEY=your_api_key
LAB_CLIENT_CERT=/path/to/cert.pem
LAB_CLIENT_KEY=/path/to/key.pem
```

---

## 🎛️ مدير التكامل (Integration Manager)

### الاستخدام

```javascript
const { IntegrationManager } = require('./integration-manager');

const integrations = new IntegrationManager({
  logLevel: 'info',
  government: {
    /* config */
  },
  insurance: {
    /* config */
  },
  lab: {
    /* config */
  },
});

// بدء المهام الخلفية
integrations.startBackgroundTasks();

// فحص الصحة
const health = await integrations.healthCheck();
console.log(health);
// {
//   government: { healthy: true, status: 200 },
//   insurance: { healthy: true, status: 200 },
//   laboratory: { healthy: true, status: 200 },
//   overallStatus: 'healthy'
// }

// الحصول على الإحصائيات
const metrics = integrations.getMetrics();

// الاستماع للأحداث
integrations.on('integration-error', ({ connector, operation, error }) => {
  logger.error(`${connector}.${operation} failed: ${error}`);
});

integrations.on('claim-approved', data => {
  // تحديث في النظام
});

integrations.on('poison-queue', entry => {
  // إضافة إلى قائمة الإعادة في قاعدة البيانات
});

// الإغلاق الآمن
await integrations.shutdown();
```

---

## 🔐 أمان وامتثال

### التشفير والتوقيع

```javascript
// جميع الطلبات موقعة بـ HMAC-SHA256
const signature = crypto
  .createHmac('sha256', clientSecret)
  .update(requestBody)
  .digest('hex');

// التحقق من النتائج
const verified = connector.verifySignature(responseData, signature);
```

### إخفاء البيانات الحساسة (PII Masking)

```javascript
// في السجلات:
Authorization: "Bearer abc123...***" (الأخير فقط مرئي)
nationalId: "masked" (لا يتم تسجيل القيمة الفعلية)
policyNumber: "***9876" (آخر 4 أرقام فقط)
```

### مستويات الخطأ والإعادة

```
محاولة 1: 1-2 ثانية
محاولة 2: 2-4 ثوانٍ
محاولة 3: 4-8 ثوانٍ
(مع عشوائية لتجنب thundering herd)
```

---

## 📊 المراقبة والقياس

### متغيرات الأداء

```javascript
metrics = {
  gov: { requests: 1234, failures: 5 },
  insurance: { requests: 5678, failures: 12 },
  lab: { requests: 8901, failures: 3 },
  uptime: 34567.89, // seconds
};
```

### السجلات المهمة

```javascript
// عند نجاح
INFO: claim-approved { claimId: "...", approvalAmount: 500 }

// عند الفشل
ERROR: integration-error {
  connector: "insurance",
  operation: "SUBMIT_CLAIM",
  error: "Claim service timeout"
}

// عند الإعادة
WARN: poison-queue {
  orderId: "ORD-001",
  operation: "submit",
  retryCount: 0,
  nextRetry: "2026-01-23T13:00:00Z"
}
```

---

## 🚀 البدء السريع

### التثبيت

```bash
cd backend
npm install axios pino pino-pretty
```

### الإعداد

```env
# .env
GOV_API_URL=https://api.gov.sa
GOV_CLIENT_ID=...
GOV_CLIENT_SECRET=...

INSURANCE_API_URL=https://api.insurance.sa
INSURANCE_API_KEY=...
INSURANCE_CLIENT_ID=...
INSURANCE_CLIENT_SECRET=...
INSURANCE_WEBHOOK_URL=https://yourdomain.com/webhooks/insurance

LAB_API_URL=https://api.labs.sa
LAB_API_KEY=...
LAB_CLIENT_CERT=/path/to/cert.pem
LAB_CLIENT_KEY=/path/to/key.pem
```

### في Express

```javascript
const IntegrationManager = require('./integrations/integration-manager');

const integrations = new IntegrationManager({
  government: {
    clientId: process.env.GOV_CLIENT_ID,
    clientSecret: process.env.GOV_CLIENT_SECRET,
  },
  // ... other configs
});

app.locals.integrations = integrations;

// بدء المراقبة
integrations.startBackgroundTasks();

// طريق للتحقق من الصحة
app.get('/api/integrations/health', async (req, res) => {
  const health = await integrations.healthCheck();
  res.json(health);
});
```

---

## ⚠️ حالات الخطأ الشائعة

| الخطأ                       | السبب                         | الحل                            |
| --------------------------- | ----------------------------- | ------------------------------- |
| `Circuit breaker is open`   | عطل متكرر                     | انتظر timeout أو تحقق من الخدمة |
| `Invalid webhook signature` | توقيع غير صحيح                | تحقق من secret key              |
| `Idempotency key duplicate` | إعادة إرسال نفس الطلب         | استخدم معرف فريد جديد           |
| `Reconciliation timeout`    | لم يتم استقبال النتيجة في 24h | اتصل بالدعم الفني               |

---

## 📝 الأحداث المتاحة

### Government Connector

- `token-refreshed` - تم تحديث التوكن
- `token-error` - فشل تحديث التوكن
- `circuit-breaker-opened` - دخول حالة العطل
- `circuit-breaker-closed` - العودة للعمل الطبيعي
- `audit-log` - تسجيل العملية
- `retry` - إعادة محاولة
- `operation-failed` - فشل العملية

### Insurance Connector

- `claim-approved` - الادعاء موافق عليه
- `claim-rejected` - الادعاء مرفوض
- `claim-pending` - الادعاء قيد الانتظار
- `retry` - إعادة محاولة
- `operation-failed` - فشل العملية
- `error-logged` - تسجيل الخطأ

### Lab Connector

- `results-retrieved` - تم استقبال النتائج
- `poison-queue` - إضافة إلى قائمة الإعادة
- `reconciliation-timeout` - انتهت صلاحية الطلب
- `reconciliation-failed` - فشل المطابقة
- `error-logged` - تسجيل الخطأ

---

## 📞 الدعم والمساعدة

للمزيد من المعلومات:

- 📧 support@alawael.com
- 📖 [وثائق API الحكومية](https://api.gov.sa/docs)
- 📖 [وثائق API التأمين](https://api.insurance.sa/docs)
- 📖 [وثائق API المختبرات](https://api.labs.sa/docs)

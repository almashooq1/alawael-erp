# 📧 Email Service API Documentation

## وثائق API خدمة البريد الإلكتروني

---

## 📋 Table of Contents | جدول المحتويات

1. [Overview | نظرة عامة](#overview)
2. [Configuration | الإعدادات](#configuration)
3. [API Endpoints | نقاط النهاية](#api-endpoints)
4. [Models | النماذج](#models)
5. [Templates | القوالب](#templates)
6. [Usage Examples | أمثلة الاستخدام](#usage-examples)
7. [Webhooks | خطافات الويب](#webhooks)
8. [Error Handling | معالجة الأخطاء](#error-handling)

---

## Overview | نظرة عامة

تقدم خدمة البريد الإلكتروني نظامًا متكاملاً لإرسال وإدارة رسائل البريد الإلكتروني مع دعم:

- إرسال رسائل فردية وجماعية
- قوالب بريد إلكتروني قابلة للتخصيص
- حملات تسويقية
- تتبع الفتح والنقر
- إدارة قوائم المشتركين
- جدولة الرسائل

---

## Configuration | الإعدادات

### Environment Variables | متغيرات البيئة

```env
# Email Provider | مزود البريد
EMAIL_PROVIDER=smtp  # smtp, sendgrid, mailgun, ses

# SMTP Configuration | إعدادات SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# SendGrid Configuration | إعدادات SendGrid
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@alawael-erp.com

# Mailgun Configuration | إعدادات Mailgun
MAILGUN_API_KEY=your-mailgun-api-key
MAILGUN_DOMAIN=mg.yourdomain.com
MAILGUN_FROM_EMAIL=noreply@alawael-erp.com

# Default Settings | الإعدادات الافتراضية
EMAIL_FROM_NAME=نظام الأهداف ERP
EMAIL_FROM_ADDRESS=noreply@alawael-erp.com
EMAIL_REPLY_TO=support@alawael-erp.com
```

---

## API Endpoints | نقاط النهاية

### 📤 Email Sending | إرسال البريد

#### Send Single Email | إرسال بريد فردي

```http
POST /api/email/send
Content-Type: multipart/form-data
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "to": ["user@example.com"],
  "cc": ["cc@example.com"],
  "bcc": ["bcc@example.com"],
  "subject": "موضوع الرسالة",
  "html": "<p>محتوى HTML</p>",
  "text": "محتوى نصي",
  "template": "welcome",
  "variables": { "name": "أحمد" },
  "priority": "high",
  "scheduledFor": "2026-02-26T10:00:00Z"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Email sent successfully",
  "emailId": "eml_1234567890_abc123",
  "messageId": "<message-id@provider.com>"
}
```

#### Send Bulk Emails | إرسال بريد جماعي

```http
POST /api/email/send-bulk
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "recipients": [
    { "email": "user1@example.com", "variables": { "name": "أحمد" } },
    { "email": "user2@example.com", "variables": { "name": "محمد" } }
  ],
  "subject": "مرحباً {{name}}",
  "html": "<p>مرحباً {{name}}</p>",
  "template": "notification"
}
```

#### Send Template Email | إرسال بريد بقالب

```http
POST /api/email/send-template
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "to": ["user@example.com"],
  "templateSlug": "welcome",
  "variables": {
    "name": "أحمد",
    "email": "user@example.com"
  }
}
```

---

### 📝 Template Management | إدارة القوالب

#### List Templates | عرض القوالب

```http
GET /api/email/templates?category=notification&isActive=true&page=1&limit=20
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "65d...",
      "templateId": "tpl_1234567890_abc123",
      "name": "Welcome Email",
      "slug": "welcome",
      "subject": "مرحباً بك في نظام الأهداف",
      "category": "authentication",
      "isActive": true,
      "variables": [{ "name": "name", "required": true }]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "pages": 1
  }
}
```

#### Create Template | إنشاء قالب

```http
POST /api/email/templates
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "name": "Invoice Email",
  "slug": "invoice",
  "subject": "فاتورة رقم {{invoiceNumber}}",
  "subjectAr": "فاتورة رقم {{invoiceNumber}}",
  "htmlContent": "<div dir='rtl'><h2>فاتورة</h2><p>الرقم: {{invoiceNumber}}</p></div>",
  "textContent": "فاتورة رقم {{invoiceNumber}}",
  "variables": [
    { "name": "invoiceNumber", "description": "رقم الفاتورة", "required": true },
    { "name": "totalAmount", "description": "المبلغ الإجمالي", "required": true }
  ],
  "category": "finance",
  "tags": ["invoice", "billing"]
}
```

#### Update Template | تحديث قالب

```http
PUT /api/email/templates/:id
Authorization: Bearer <token>
```

#### Delete Template | حذف قالب

```http
DELETE /api/email/templates/:id
Authorization: Bearer <token>
```

---

### 📊 Logs & Tracking | السجلات والتتبع

#### Get Email Logs | عرض سجلات البريد

```http
GET /api/email/logs?status=sent&startDate=2026-01-01&endDate=2026-02-28
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "emailId": "eml_1234567890_abc123",
      "to": [{ "address": "user@example.com" }],
      "subject": "مرحباً بك",
      "status": "delivered",
      "provider": "smtp",
      "tracking": {
        "totalOpens": 2,
        "uniqueOpens": 1,
        "totalClicks": 0
      },
      "timestamps": {
        "sentAt": "2026-02-25T10:00:00Z",
        "deliveredAt": "2026-02-25T10:00:05Z",
        "firstOpenedAt": "2026-02-25T11:30:00Z"
      }
    }
  ]
}
```

#### Track Email Open | تتبع فتح البريد

```http
POST /api/email/tracking/open/:emailId
```

Returns a 1x1 transparent GIF pixel.

#### Track Email Click | تتبع نقر البريد

```http
POST /api/email/tracking/click/:emailId
```

**Request Body:**

```json
{
  "url": "https://example.com/landing-page"
}
```

---

### 📢 Campaigns | الحملات

#### List Campaigns | عرض الحملات

```http
GET /api/email/campaigns?status=sent
Authorization: Bearer <token>
```

#### Create Campaign | إنشاء حملة

```http
POST /api/email/campaigns
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "name": "حملة الترحيب الجديدة",
  "description": "حملة ترحيبية للمستخدمين الجدد",
  "template": "65d...",
  "recipients": {
    "type": "list",
    "lists": ["65d..."]
  },
  "schedule": {
    "sendAt": "2026-02-27T09:00:00Z",
    "timezone": "Asia/Riyadh"
  },
  "trackingSettings": {
    "opens": true,
    "clicks": true,
    "googleAnalytics": true
  },
  "abTest": {
    "enabled": true,
    "variantA": { "subject": "مرحباً بك!" },
    "variantB": { "subject": "أهلاً وسهلاً!" },
    "testPercentage": 10,
    "winnerCriteria": "opens"
  }
}
```

#### Send Campaign | إرسال حملة

```http
POST /api/email/campaigns/:id/send
Authorization: Bearer <token>
```

---

### 📋 Lists | القوائم

#### List Email Lists | عرض قوائم البريد

```http
GET /api/email/lists
Authorization: Bearer <token>
```

#### Create Email List | إنشاء قائمة

```http
POST /api/email/lists
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "name": "المشتركون الجدد",
  "description": "قائمة المشتركين الجدد",
  "type": "subscribers",
  "settings": {
    "doubleOptIn": true,
    "welcomeEmail": true,
    "gdprCompliant": true
  }
}
```

#### Add Subscriber | إضافة مشترك

```http
POST /api/email/lists/:id/subscribers
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "email": "new@example.com",
  "name": "أحمد محمد",
  "customFields": {
    "company": "شركة ABC",
    "interests": ["technology", "business"]
  }
}
```

#### Remove Subscriber | إزالة مشترك

```http
DELETE /api/email/lists/:id/subscribers/:email
Authorization: Bearer <token>
```

---

### ✍️ Signatures | التواقيع

#### List Signatures | عرض التواقيع

```http
GET /api/email/signatures
Authorization: Bearer <token>
```

#### Create Signature | إنشاء توقيع

```http
POST /api/email/signatures
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "name": "التوقيع الافتراضي",
  "html": "<div>مع تحياتي،<br><b>{{name}}</b><br>{{title}}</div>",
  "text": "مع تحياتي،\n{{name}}\n{{title}}",
  "isDefault": true
}
```

---

### 📈 Statistics | الإحصائيات

#### Get Email Statistics | عرض إحصائيات البريد

```http
GET /api/email/stats?startDate=2026-01-01&endDate=2026-02-28
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "overall": {
      "sent": 1500,
      "delivered": 1450,
      "opened": 800,
      "clicked": 250,
      "bounced": 50,
      "failed": 0
    },
    "byProvider": [
      {
        "_id": "smtp",
        "sent": 1500,
        "delivered": 1450,
        "opened": 800
      }
    ],
    "daily": [
      {
        "_id": "2026-02-25",
        "sent": 150,
        "delivered": 145,
        "opened": 80
      }
    ]
  }
}
```

#### Health Check | فحص الصحة

```http
GET /api/email/health
Authorization: Bearer <token>
```

---

### ⏳ Queue Management | إدارة الطابور

#### Get Queue | عرض الطابور

```http
GET /api/email/queue?status=pending
Authorization: Bearer <token>
```

#### Process Queue | معالجة الطابور

```http
POST /api/email/queue/process
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "batchSize": 50
}
```

---

## Models | النماذج

### EmailTemplate | قالب البريد

```javascript
{
  templateId: String,       // معرف القالب
  name: String,             // اسم القالب
  slug: String,             // الرابط المختصر
  subject: String,          // الموضوع
  subjectAr: String,        // الموضوع بالعربية
  htmlContent: String,      // محتوى HTML
  textContent: String,      // المحتوى النصي
  variables: [{             // المتغيرات
    name: String,
    description: String,
    defaultValue: String,
    required: Boolean
  }],
  category: String,         // الفئة
  isActive: Boolean,        // نشط
  isDefault: Boolean,       // افتراضي
  version: Number,          // الإصدار
  tags: [String]            // العلامات
}
```

### EmailLog | سجل البريد

```javascript
{
  emailId: String,          // معرف البريد
  messageId: String,        // معرف الرسالة
  from: {                   // المرسل
    name: String,
    address: String
  },
  to: [{                    // المستلمون
    address: String,
    name: String
  }],
  subject: String,          // الموضوع
  template: {               // القالب
    id: ObjectId,
    slug: String,
    variables: Mixed
  },
  status: String,           // الحالة
  provider: String,         // المزود
  tracking: {               // التتبع
    opens: [{ timestamp, ipAddress, userAgent }],
    clicks: [{ timestamp, url, ipAddress }],
    totalOpens: Number,
    uniqueOpens: Number,
    totalClicks: Number,
    uniqueClicks: Number
  }
}
```

### EmailCampaign | حملة البريد

```javascript
{
  campaignId: String,       // معرف الحملة
  name: String,             // الاسم
  description: String,      // الوصف
  template: ObjectId,       // القالب
  recipients: {             // المستلمون
    type: String,           // list, segment, all, manual
    lists: [ObjectId],
    segments: [String]
  },
  schedule: {               // الجدولة
    sendAt: Date,
    timezone: String,
    isRecurring: Boolean
  },
  status: String,           // الحالة
  stats: {                  // الإحصائيات
    totalRecipients: Number,
    sent: Number,
    delivered: Number,
    opened: Number,
    clicked: Number,
    bounced: Number
  }
}
```

---

## Templates | القوالب المعدة مسبقًا

### Welcome Email | بريد الترحيب

```javascript
EmailTemplates.WELCOME;
// Variables: name, email
```

### Password Reset | إعادة تعيين كلمة المرور

```javascript
EmailTemplates.PASSWORD_RESET;
// Variables: name, resetLink
```

### Invoice | فاتورة

```javascript
EmailTemplates.INVOICE;
// Variables: customerName, invoiceNumber, invoiceDate, totalAmount, dueDate
```

### Leave Request | طلب إجازة

```javascript
EmailTemplates.LEAVE_REQUEST;
// Variables: employeeName, leaveType, startDate, endDate, reason, approvalLink
```

### Notification | إشعار

```javascript
EmailTemplates.NOTIFICATION;
// Variables: title, message, actionLink, actionText
```

### Report | تقرير

```javascript
EmailTemplates.REPORT;
// Variables: reportName, startDate, endDate
```

---

## Usage Examples | أمثلة الاستخدام

### Send Welcome Email | إرسال بريد ترحيب

```javascript
const { emailService, EmailTemplates } = require('./communication');

// Using helper function
await sendWelcomeEmail({
  email: 'user@example.com',
  name: 'أحمد',
});

// Using service directly
await emailService.send({
  to: 'user@example.com',
  template: 'welcome',
  variables: {
    name: 'أحمد',
    email: 'user@example.com',
  },
});
```

### Send Password Reset | إرسال رابط إعادة التعيين

```javascript
const { sendPasswordResetEmail } = require('./communication');

await sendPasswordResetEmail(
  { email: 'user@example.com', name: 'أحمد' },
  'https://app.alawael-erp.com/reset-password?token=abc123'
);
```

### Send Invoice | إرسال فاتورة

```javascript
const { sendInvoiceEmail } = require('./communication');

await sendInvoiceEmail(
  {
    number: 'INV-2026-001',
    date: '2026-02-25',
    total: '1500.00',
    dueDate: '2026-03-25',
    tenantId: '65d...',
    pdf: buffer, // PDF Buffer
  },
  {
    email: 'customer@example.com',
    name: 'شركة ABC',
  }
);
```

### Send with Attachment | إرسال مع مرفق

```javascript
await emailService.send({
  to: 'user@example.com',
  subject: 'تقرير شهري',
  html: '<p>المرفق التقرير الشهري</p>',
  attachments: [
    {
      filename: 'report.pdf',
      content: pdfBuffer,
      contentType: 'application/pdf',
    },
  ],
});
```

---

## Webhooks | خطافات الويب

### Delivery Events | أحداث التسليم

```json
{
  "event": "delivered",
  "emailId": "eml_1234567890_abc123",
  "timestamp": "2026-02-25T10:00:05Z",
  "provider": "smtp",
  "providerResponse": {}
}
```

### Open Events | أحداث الفتح

```json
{
  "event": "opened",
  "emailId": "eml_1234567890_abc123",
  "timestamp": "2026-02-25T11:30:00Z",
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0..."
}
```

### Click Events | أحداث النقر

```json
{
  "event": "clicked",
  "emailId": "eml_1234567890_abc123",
  "timestamp": "2026-02-25T11:35:00Z",
  "url": "https://example.com/page",
  "ipAddress": "192.168.1.1"
}
```

---

## Error Handling | معالجة الأخطاء

### Error Codes | رموز الأخطاء

| Code                   | Description                  |
| ---------------------- | ---------------------------- |
| `INVALID_RECIPIENT`    | عنوان بريد إلكتروني غير صالح |
| `TEMPLATE_NOT_FOUND`   | القالب غير موجود             |
| `PROVIDER_ERROR`       | خطأ من مزود الخدمة           |
| `RATE_LIMIT_EXCEEDED`  | تجاوز حد الإرسال             |
| `ATTACHMENT_TOO_LARGE` | المرفق كبير جداً             |
| `INVALID_FILE_TYPE`    | نوع ملف غير مدعوم            |

### Error Response | استجابة الخطأ

```json
{
  "success": false,
  "error": {
    "code": "TEMPLATE_NOT_FOUND",
    "message": "Email template 'nonexistent' not found",
    "details": {}
  }
}
```

---

## Rate Limits | حدود الإرسال

| Endpoint         | Limit      |
| ---------------- | ---------- |
| `/send`          | 100/minute |
| `/send-bulk`     | 10/minute  |
| `/send-template` | 100/minute |

---

## Best Practices | أفضل الممارسات

1. **استخدم القوالب** للحفاظ على تناسق التصميم
2. **اختبر الرسائل** قبل الإرسال الجماعي
3. **راقب معدلات الفتح والنقر** لتحسين المحتوى
4. **احترم قوانين مكافحة البريد العشوائي**
5. **قدم خيار إلغاء الاشتراك** في الرسائل التسويقية
6. **استخدم HTTPS** لجميع الاتصالات

---

© 2026 Alawael ERP - Email Service

# WhatsApp API Documentation - توثيق واجهة برمجة تطبيقات الوتساب

## نظرة عامة | Overview

نظام الوتساب المتكامل لنظام الأهداف ERP يدعم:

- **WhatsApp Cloud API** (Meta/Facebook)
- **Twilio WhatsApp**
- **Local Gateways** (مزودي الخدمة المحليين)

---

## المتغيرات البيئية المطلوبة | Required Environment Variables

```env
# WhatsApp Provider Selection
WHATSAPP_PROVIDER=cloud_api  # cloud_api, twilio, local

# WhatsApp Cloud API (Meta)
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_verify_token
WHATSAPP_APP_ID=your_app_id
WHATSAPP_APP_SECRET=your_app_secret

# Twilio WhatsApp (Alternative)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+1234567890

# Local Gateway (Alternative)
WHATSAPP_API_URL=https://your-provider.com/api
WHATSAPP_API_KEY=your_api_key
WHATSAPP_INSTANCE_ID=your_instance_id
```

---

## نقاط النهاية | Endpoints

### 1. Webhook

#### GET /api/whatsapp/webhook

التحقق من Webhook (للمeta)

**Query Parameters:**

- `hub.mode` - يجب أن يكون "subscribe"
- `hub.challenge` - قيمة التحقق
- `hub.verify_token` - رمز التحقق

#### POST /api/whatsapp/webhook

استقبال الرسائل الواردة والأحداث

---

### 2. إرسال الرسائل | Send Messages

#### POST /api/whatsapp/send

إرسال رسالة (عام)

**Request Body:**

```json
{
  "to": "966501234567",
  "type": "text",
  "content": {
    "text": "مرحباً بك في نظام الأهداف"
  },
  "metadata": {
    "userId": "123"
  }
}
```

#### POST /api/whatsapp/send/text

إرسال رسالة نصية

**Request Body:**

```json
{
  "to": "966501234567",
  "text": "مرحباً بك",
  "replyTo": "wamid.previous_message_id"
}
```

#### POST /api/whatsapp/send/image

إرسال صورة

**Request Body:**

```json
{
  "to": "966501234567",
  "imageUrl": "https://example.com/image.jpg",
  "caption": "وصف الصورة"
}
```

#### POST /api/whatsapp/send/document

إرسال مستند

**Request Body:**

```json
{
  "to": "966501234567",
  "documentUrl": "https://example.com/document.pdf",
  "filename": "invoice.pdf",
  "caption": "فاتورة رقم 123"
}
```

#### POST /api/whatsapp/send/video

إرسال فيديو

**Request Body:**

```json
{
  "to": "966501234567",
  "videoUrl": "https://example.com/video.mp4",
  "caption": "فيديو تعريفي"
}
```

#### POST /api/whatsapp/send/location

إرسال موقع

**Request Body:**

```json
{
  "to": "966501234567",
  "latitude": 24.7136,
  "longitude": 46.6753,
  "name": "مركز الأهداف",
  "address": "الرياض، المملكة العربية السعودية"
}
```

#### POST /api/whatsapp/send/template

إرسال رسالة قالب

**Request Body:**

```json
{
  "to": "966501234567",
  "templateName": "otp_verification",
  "language": "ar",
  "components": [
    {
      "type": "body",
      "parameters": [
        { "type": "text", "text": "123456" },
        { "type": "text", "text": "5" }
      ]
    }
  ]
}
```

#### POST /api/whatsapp/send/interactive

إرسال رسالة تفاعلية (أزرار/قوائم)

**Request Body:**

```json
{
  "to": "966501234567",
  "interactive": {
    "type": "button",
    "body": { "text": "هل تريد تأكيد الحجز؟" },
    "action": {
      "buttons": [
        { "type": "reply", "reply": { "id": "confirm", "title": "نعم" } },
        { "type": "reply", "reply": { "id": "cancel", "title": "لا" } }
      ]
    }
  }
}
```

#### POST /api/whatsapp/send/bulk

إرسال رسائل جماعية (للمشرفين فقط)

**Request Body:**

```json
{
  "recipients": [
    { "phone": "966501234567", "name": "أحمد" },
    { "phone": "966509876543", "name": "محمد" }
  ],
  "message": {
    "type": "text",
    "text": "مرحباً {name}"
  },
  "options": {
    "delay": 1000,
    "batchSize": 10
  }
}
```

---

### 3. OTP (رمز التحقق)

#### POST /api/whatsapp/otp/send

إرسال OTP

**Request Body:**

```json
{
  "phoneNumber": "966501234567",
  "purpose": "verification"
}
```

**Response:**

```json
{
  "success": true,
  "message": "OTP sent successfully",
  "expiresIn": 300
}
```

#### POST /api/whatsapp/otp/verify

التحقق من OTP

**Request Body:**

```json
{
  "phoneNumber": "966501234567",
  "otp": "123456",
  "purpose": "verification"
}
```

---

### 4. الإشعارات | Notifications

#### POST /api/whatsapp/notify

إرسال إشعار

**Request Body:**

```json
{
  "to": "966501234567",
  "title": "تنبيه هام",
  "message": "تم تحديث حالة طلبك",
  "template": "NOTIFICATION",
  "templateData": ["تنبيه", "تم تحديث حالة طلبك"]
}
```

---

### 5. المحادثات | Conversations

#### GET /api/whatsapp/conversations

الحصول على المحادثات

**Query Parameters:**

- `status` - حالة المحادثة (active, pending, resolved, closed)
- `assignedTo` - معرف المستخدم المسؤول
- `limit` - عدد النتائج (افتراضي: 50)
- `skip` - تخطي النتائج (افتراضي: 0)

#### GET /api/whatsapp/conversations/:conversationId/messages

الحصول على رسائل محادثة

**Query Parameters:**

- `limit` - عدد الرسائل (افتراضي: 100)
- `before` - قبل تاريخ معين
- `after` - بعد تاريخ معين

---

### 6. الوسائط | Media

#### GET /api/whatsapp/media/:mediaId

الحصول على رابط الوسائط

#### POST /api/whatsapp/media/upload

رفع وسائط

---

### 7. الإحصائيات | Statistics

#### GET /api/whatsapp/stats

الحصول على إحصائيات الرسائل (للمشرفين)

**Query Parameters:**

- `startDate` - تاريخ البداية
- `endDate` - تاريخ النهاية
- `tenantId` - معرف المستأجر

**Response:**

```json
{
  "success": true,
  "data": {
    "total": 1000,
    "delivered": 950,
    "read": 800,
    "deliveryRate": "95.00",
    "readRate": "84.21",
    "byStatus": {
      "sent": 30,
      "delivered": 950,
      "read": 800,
      "failed": 20
    },
    "byType": {
      "text": 500,
      "template": 300,
      "image": 150,
      "document": 50
    }
  }
}
```

---

### 8. المساعدة | Utilities

#### GET /api/whatsapp/templates

الحصول على القوالب المتاحة

#### POST /api/whatsapp/interactive/buttons

بناء رسالة أزرار

**Request Body:**

```json
{
  "bodyText": "اختر أحد الخيارات",
  "buttons": [
    { "id": "btn1", "title": "الخيار الأول" },
    { "id": "btn2", "title": "الخيار الثاني" }
  ]
}
```

#### POST /api/whatsapp/interactive/list

بناء رسالة قائمة

**Request Body:**

```json
{
  "bodyText": "اختر من القائمة",
  "buttonText": "عرض الخيارات",
  "sections": [
    {
      "title": "القسم الأول",
      "rows": [{ "id": "opt1", "title": "الخيار 1", "description": "وصف الخيار" }]
    }
  ]
}
```

#### GET /api/whatsapp/health

فحص صحة الخدمة

---

## القوالب المتاحة | Available Templates

| القالب                 | الوصف        |
| ---------------------- | ------------ |
| `OTP_VERIFICATION`     | رمز التحقق   |
| `WELCOME`              | رسالة ترحيب  |
| `ORDER_CONFIRMATION`   | تأكيد الطلب  |
| `APPOINTMENT_REMINDER` | تذكير موعد   |
| `PAYMENT_REMINDER`     | تذكير دفع    |
| `LEAVE_STATUS`         | حالة الإجازة |
| `SALARY_CREDITED`      | صرف الراتب   |
| `DOCUMENT_READY`       | مستند جاهز   |
| `NOTIFICATION`         | إشعار عام    |

---

## أمثلة الاستخدام | Usage Examples

### إرسال OTP

```javascript
const { sendWhatsAppOTP } = require('./communication');

// إرسال OTP
const result = await sendWhatsAppOTP('966501234567', '123456', 5);
```

### إرسال رسالة نصية

```javascript
const { sendWhatsAppText } = require('./communication');

const result = await sendWhatsAppText('966501234567', 'مرحباً بك في نظام الأهداف');
```

### إرسال إشعار متعدد القنوات

```javascript
const { communicationService } = require('./communication');

const result = await communicationService.sendMultiChannel({
  channels: ['whatsapp', 'sms', 'email'],
  recipient: {
    phone: '966501234567',
    email: 'user@example.com',
  },
  subject: 'تنبيه هام',
  message: 'تم تحديث حسابك بنجاح',
});
```

### استخدام الأزرار التفاعلية

```javascript
const { InteractiveBuilders, whatsappService } = require('./communication');

// إنشاء أزرار
const interactive = InteractiveBuilders.quickReply('هل تريد تأكيد الحجز؟', [
  { id: 'confirm', title: 'نعم، أكد' },
  { id: 'cancel', title: 'لا، إلغاء' },
]);

// إرسال الرسالة
await whatsappService.sendInteractive('966501234567', interactive);
```

---

## Webhook Events | أحداث Webhook

### الرسائل الواردة

```json
{
  "entry": [
    {
      "changes": [
        {
          "value": {
            "messages": [
              {
                "id": "wamid.xxx",
                "from": "966501234567",
                "type": "text",
                "text": { "body": "مرحباً" }
              }
            ]
          }
        }
      ]
    }
  ]
}
```

### تحديثات الحالة

```json
{
  "entry": [
    {
      "changes": [
        {
          "value": {
            "statuses": [
              {
                "id": "wamid.xxx",
                "status": "delivered",
                "timestamp": "1234567890",
                "recipient_id": "966501234567"
              }
            ]
          }
        }
      ]
    }
  ]
}
```

---

## استكشاف الأخطاء | Troubleshooting

### مشاكل شائعة

1. **فشل التحقق من Webhook**
   - تأكد من صحة `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
   - تأكد من أن الـ URL قابل للوصول من الإنترنت

2. **فشل إرسال الرسائل**
   - تأكد من صحة رقم الهاتف (صيغة 966xxxxxxxxx)
   - تأكد من صحة `WHATSAPP_ACCESS_TOKEN`
   - تأكد من أن القالب معتمد من Meta

3. **رسائل لا تصل**
   - تأكد من أن المستخدم قد أرسل رسالة خلال الـ 24 ساعة الماضية
   - للاستخدام خارج نافذة الـ 24 ساعة، استخدم القوالب المعتمدة

---

## الأمان | Security

- جميع الـ endpoints المحمية تتطلب مصادقة
- استخدم HTTPS للإنتاج
- تحقق من توقيع Webhook
- لا تخزن رمز الوصول في الكود

---

## الحدود | Rate Limits

| النوع            | الحد       |
| ---------------- | ---------- |
| الرسائل النصية   | 20/دقيقة   |
| الرسائل الجماعية | 1000/طلب   |
| OTP              | 5/ساعة/رقم |

---

## الدعم | Support

للمساعدة، تواصل مع فريق التطوير.

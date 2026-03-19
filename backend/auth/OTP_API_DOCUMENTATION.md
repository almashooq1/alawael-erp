# 📚 توثيق نظام OTP للمصادقة

# OTP Authentication System Documentation

## نظرة عامة | Overview

نظام OTP (رمز التحقق الموحد) يتيح للمستخدمين تسجيل الدخول عن طريق:

- 📧 **البريد الإلكتروني**
- 📱 **الرسائل النصية (SMS)**
- 💬 **الواتساب (WhatsApp)**

---

## 📁 الملفات المنشأة | Created Files

### Backend (الخادم)

| الملف                               | الوصف               |
| ----------------------------------- | ------------------- |
| `backend/auth/otp-service.js`       | خدمة OTP الأساسية   |
| `backend/routes/otp-auth.routes.js` | مسارات API للمصادقة |

### Frontend (الواجهة)

| الملف                                 | الوصف                    |
| ------------------------------------- | ------------------------ |
| `frontend/src/pages/LoginPageOTP.jsx` | صفحة تسجيل الدخول مع OTP |

---

## 🔌 API Endpoints

### Base URL

```
/api/v1/auth/otp
```

### 1. إرسال رمز التحقق

```http
POST /api/v1/auth/otp/send
```

**Body:**

```json
{
  "identifier": "user@email.com أو 05xxxxxxxx",
  "method": "email|sms|whatsapp|auto",
  "purpose": "login|register|resetPassword|verifyEmail|verifyPhone"
}
```

**Response:**

```json
{
  "success": true,
  "message": "تم إرسال رمز التحقق إلى البريد الإلكتروني (us***@email.com)",
  "data": {
    "otpId": "otp_1234567890_abc123",
    "method": "email",
    "expiresIn": 300
  }
}
```

### 2. التحقق من الرمز

```http
POST /api/v1/auth/otp/verify
```

**Body:**

```json
{
  "identifier": "user@email.com",
  "otp": "123456",
  "purpose": "login"
}
```

**Response (تسجيل الدخول):**

```json
{
  "success": true,
  "message": "تم تسجيل الدخول بنجاح",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "1",
      "email": "user@email.com",
      "name": "مستخدم النظام",
      "role": "user"
    },
    "verifiedBy": "email"
  }
}
```

### 3. تسجيل الدخول المباشر بـ OTP

```http
POST /api/v1/auth/otp/login
```

**Body:**

```json
{
  "identifier": "user@email.com",
  "method": "email"
}
```

### 4. التحقق وتسجيل الدخول

```http
POST /api/v1/auth/otp/login/verify
```

**Body:**

```json
{
  "identifier": "user@email.com",
  "otp": "123456"
}
```

### 5. إعادة إرسال الرمز

```http
POST /api/v1/auth/otp/resend
```

**Body:**

```json
{
  "identifier": "user@email.com",
  "method": "email",
  "purpose": "login"
}
```

### 6. الحصول على طرق التحقق المتاحة

```http
GET /api/v1/auth/otp/methods
```

**Response:**

```json
{
  "success": true,
  "data": {
    "methods": [
      { "id": "email", "name": "البريد الإلكتروني", "enabled": true },
      { "id": "sms", "name": "الرسائل النصية", "enabled": true },
      { "id": "whatsapp", "name": "الواتساب", "enabled": true }
    ],
    "purposes": [
      { "id": "login", "name": "تسجيل الدخول", "expirySeconds": 300 },
      { "id": "register", "name": "التسجيل", "expirySeconds": 600 }
    ],
    "config": {
      "otpLength": 6,
      "maxAttempts": 3,
      "resendCooldown": 60
    }
  }
}
```

---

## ⚙️ متغيرات البيئة | Environment Variables

```env
# OTP Configuration
OTP_LENGTH=6
OTP_EXPIRY_SECONDS=300
OTP_MAX_ATTEMPTS=3
OTP_RESEND_COOLDOWN=60

# Methods Enable/Disable
OTP_EMAIL_ENABLED=true
OTP_SMS_ENABLED=true
OTP_WHATSAPP_ENABLED=true

# SMS Provider (Twilio)
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_phone_number

# WhatsApp Provider (Cloud API)
WHATSAPP_PROVIDER=cloud_api
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_verify_token

# Email Provider (Azure)
EMAIL_PROVIDER=azure
AZURE_COMMUNICATION_CONNECTION_STRING=your_connection_string

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=7d
```

---

## 🔧 الاستخدام | Usage

### في الخادم (Server)

```javascript
const { otpService, sendLoginOTP, verifyLoginOTP } = require('./auth/otp-service');

// إرسال OTP
const result = await sendLoginOTP('user@email.com', 'email');

// التحقق من OTP
const verification = await verifyLoginOTP('user@email.com', '123456');
```

### في الواجهة (Frontend)

```javascript
// إرسال OTP
const response = await fetch('/api/v1/auth/otp/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    identifier: 'user@email.com',
    method: 'email',
  }),
});

// التحقق من OTP
const verify = await fetch('/api/v1/auth/otp/login/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    identifier: 'user@email.com',
    otp: '123456',
  }),
});
```

---

## 🎨 تخصيص قوالب الرسائل

### قالب البريد الإلكتروني

يحتوي على:

- شعار النظام
- رمز التحقق بتصميم جذاب
- مدة الصلاحية
- تحذير أمني

### قالب SMS

```
رمز التحقق: 123456
صالح لمدة 5 دقيقة
@الأهداف
```

### قالب WhatsApp

```
🔐 رمز التحقق الخاص بك هو: 123456
⏰ صالح لمدة 5 دقيقة

@الأهداف
```

---

## 🔒 الأمان | Security

### Rate Limiting

- **60 ثانية** بين كل طلب
- **5 طلبات** كحد أقصى في الساعة

### حماية OTP

- **3 محاولات** كحد أقصى للإدخال
- **5 دقائق** صلاحية افتراضية
- إلغاء الرموز القديمة عند طلب رمز جديد

### التحقق

- التحقق من صيغة البريد/الجوال
- تسجيل محاولات التحقق الفاشلة
- حذف الرمز بعد الاستخدام

---

## 📱 دعم الأجهزة

- ✅ سطح المكتب
- ✅ الأجهزة اللوحية
- ✅ الهواتف المحمولة
- ✅ تصميم متجاوب RTL

---

## 🧪 الاختبار | Testing

```bash
# تشغيل الخادم
cd backend
npm run dev

# اختبار API
curl -X POST http://localhost:5000/api/v1/auth/otp/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"test@email.com","method":"email"}'
```

---

## 📞 الدعم الفني

للمساعدة أو الإبلاغ عن مشاكل:

- 📧 support@alawael.sa
- 📱 الواتساب: +966 xx xxx xxxx

---

## ✨ المميزات

| الميزة         | الوصف                 |
| -------------- | --------------------- |
| 🌐 تعدد اللغات | دعم كامل للغة العربية |
| 📱 طرق متعددة  | بريد، SMS، واتساب     |
| ⚡ سريع        | استجابة فورية         |
| 🔒 آمن         | حماية متقدمة          |
| 🎨 تصميم عصري  | واجهة مستخدم جذابة    |
| 📊 تتبع        | سجل كامل للعمليات     |

---

**الإصدار:** 1.0.0
**آخر تحديث:** فبراير 2026

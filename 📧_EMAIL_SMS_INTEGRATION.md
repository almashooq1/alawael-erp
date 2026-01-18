# 📧 Email & SMS Integration - مكتمل!

## ✨ المزايا المضافة

### 1. 📧 Email Service (خدمة البريد الإلكتروني)

#### المزايا:

- ✅ إرسال بريد إلكتروني مفرد
- ✅ إرسال رسائل بريد جماعية (Bulk Email)
- ✅ 6 قوالب بريد جاهزة
- ✅ التحقق من الاتصال
- ✅ دعم HTML + RTL للعربية
- ✅ معالجة الأخطاء

#### القوالب المتاحة:

1. **welcomeEmail** - رسالة ترحيب جديد
2. **passwordReset** - إعادة تعيين كلمة المرور
3. **emailVerification** - التحقق من البريد الإلكتروني
4. **employeeNotification** - إشعار الموظفين
5. **invoiceEmail** - رسالة الفاتورة
6. **reportEmail** - رسالة التقرير
7. **notificationEmail** - إشعار عام

#### الـ API Endpoints:

```
POST /api/email/send - إرسال بريد مفرد
POST /api/email/send-bulk - إرسال جماعي
POST /api/email/verify - التحقق من الخدمة
POST /api/email/send-welcome - رسالة ترحيب
POST /api/email/send-password-reset - إعادة تعيين
POST /api/email/send-verification - التحقق
GET /api/email/templates - عرض القوالب
```

### 2. 📱 SMS Service (خدمة الرسائل النصية)

#### المزايا:

- ✅ إرسال SMS مفرد
- ✅ إرسال SMS جماعي
- ✅ 8 قوالب SMS جاهزة
- ✅ دعم Twilio و Vonage
- ✅ التحقق من الرصيد
- ✅ معالجة الأخطاء

#### القوالب المتاحة:

1. **verificationCode** - رمز التحقق (OTP)
2. **employeeAlert** - تنبيه الموظفين
3. **orderConfirmation** - تأكيد الطلب
4. **deliveryNotification** - إشعار التسليم
5. **paymentReminder** - تذكير الدفع
6. **securityAlert** - تنبيه أمان
7. **courseReminder** - تذكير الدورة
8. **appointmentReminder** - تذكير الموعد
9. **reportNotification** - إشعار التقرير

#### الـ API Endpoints:

```
POST /api/sms/send - إرسال SMS مفرد
POST /api/sms/send-bulk - إرسال جماعي
POST /api/sms/send-template - إرسال بقالب
POST /api/sms/verification-code - رمز OTP
GET /api/sms/balance - فحص الرصيد
GET /api/sms/templates - عرض القوالب
```

---

## 🔧 الإعدادات المطلوبة

### البريد الإلكتروني (Gmail)

أضف إلى `.env`:

```bash
# Email Configuration
EMAIL_SERVICE=gmail
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM="نظام الأوائل <your-email@gmail.com>"
FRONTEND_URL=http://localhost:3000
```

**الخطوات:**

1. فعّل 2FA في حسابك على Google
2. إنشِ App Password من: https://myaccount.google.com/apppasswords
3. استخدم App Password في `EMAIL_PASSWORD`

### الرسائل النصية (Twilio)

أضف إلى `.env`:

```bash
# SMS Configuration (Twilio)
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
SMS_FROM_NUMBER=+1234567890
```

**الخطوات:**

1. إنشِ حساب Twilio: https://www.twilio.com
2. احصل على Account SID و Auth Token
3. احصل على رقم Twilio

### الرسائل النصية (Vonage/Nexmo)

أضف إلى `.env`:

```bash
# SMS Configuration (Vonage)
SMS_PROVIDER=vonage
VONAGE_API_KEY=your_api_key
VONAGE_API_SECRET=your_api_secret
```

---

## 📊 أمثلة الاستخدام

### 1. إرسال بريد ترحيب

```bash
POST /api/email/send
Content-Type: application/json

{
  "to": "user@example.com",
  "templateName": "welcomeEmail",
  "data": {
    "fullName": "أحمد محمد",
    "email": "user@example.com"
  }
}
```

### 2. إرسال بريد إعادة تعيين

```bash
POST /api/email/send-password-reset
Content-Type: application/json

{
  "email": "user@example.com",
  "fullName": "أحمد محمد",
  "resetToken": "abc123def456"
}
```

### 3. إرسال رسالة SMS

```bash
POST /api/sms/send
Content-Type: application/json
Authorization: Bearer <token>

{
  "toNumber": "+970591234567",
  "message": "رمز التحقق الخاص بك: 123456"
}
```

### 4. إرسال SMS بقالب

```bash
POST /api/sms/send-template
Content-Type: application/json
Authorization: Bearer <token>

{
  "toNumber": "+970591234567",
  "templateName": "verificationCode",
  "data": "123456"
}
```

### 5. إرسال بريد جماعي

```bash
POST /api/email/send-bulk
Content-Type: application/json
Authorization: Bearer <token>

{
  "recipients": [
    "user1@example.com",
    "user2@example.com",
    "user3@example.com"
  ],
  "templateName": "reportEmail",
  "data": {
    "title": "تقرير المبيعات",
    "period": "يناير 2026",
    "date": "2026-01-16",
    "summary": "تم تحقيق 125,450 ريال"
  }
}
```

---

## 🔐 متطلبات الأمان

### للإرسال:

- ✅ المستخدم يجب أن يكون authenticated
- ✅ تفويضات محددة (admin/manager):
  - `POST /email/send` → admin, manager
  - `POST /email/send-bulk` → admin فقط
  - `POST /sms/send` → admin, manager
  - `POST /sms/send-bulk` → admin فقط
  - `GET /email/verify` → admin فقط
  - `GET /sms/balance` → admin فقط

### للتحقق والإعادة:

- ✅ لا يتطلب تفويضات (password reset, email verification)

---

## 📁 الملفات المضافة

### 1. `backend/services/emailService.js`

- خدمة البريد الإلكتروني
- معالجة القوالب
- التحقق من الاتصال
- 700+ سطر

### 2. `backend/services/smsService.js`

- خدمة الرسائل النصية
- دعم Twilio و Vonage
- معالجة القوالب
- 450+ سطر

### 3. `backend/routes/emailRoutes.js`

- endpoints البريد الإلكتروني
- معالجة الأخطاء
- التفويضات
- 300+ سطر

### 4. `backend/routes/smsRoutes.js`

- endpoints الرسائل النصية
- معالجة الأخطاء
- التفويضات
- 280+ سطر

---

## 🎯 حالات الاستخدام

### 1. تسجيل مستخدم جديد

```javascript
// إرسال رسالة ترحيب + رابط التحقق
await sendEmail(user.email, 'welcomeEmail', user);
await sendEmail(user.email, 'emailVerification', {
  ...user,
  verificationToken,
});
```

### 2. نسيان كلمة المرور

```javascript
// إرسال رابط إعادة التعيين
await sendEmail(user.email, 'passwordReset', {
  ...user,
  resetToken,
});
```

### 3. إشعارات الموظفين

```javascript
// عند إضافة موظف جديد
await sendBulkEmail(adminEmails, 'employeeNotification', { employee, action: 'إضافة' });
```

### 4. تأكيد الطلبات

```javascript
// إرسال رسالة SMS لتأكيد الطلب
await sendSMSWithTemplate(phoneNumber, 'orderConfirmation', { orderId, amount });
```

### 5. تنبيهات الأمان

```javascript
// إرسال SMS عند محاولة تسجيل دخول مريبة
await sendSMSWithTemplate(phoneNumber, 'securityAlert', 'محاولة تسجيل دخول من عنوان IP غريب');
```

---

## 📈 الإحصائيات

| العنصر              | العدد                     |
| ------------------- | ------------------------- |
| Email Templates     | 7                         |
| SMS Templates       | 8                         |
| Email Endpoints     | 7                         |
| SMS Endpoints       | 6                         |
| Providers Supported | 3 (Gmail, Twilio, Vonage) |
| Total Lines of Code | 1,730+                    |

---

## ⚠️ ملاحظات مهمة

1. **قبل الإنتاج**:
   - استخدم خادم SMTP خاص لـ Email
   - استخدم Twilio أو Vonage مدفوع للـ SMS
   - اختبر جميع القوالب

2. **الأداء**:
   - ضع في الاعتبار Queue (Bull/RabbitMQ) للبريد الجماعي
   - استخدم async/await بشكل صحيح

3. **الأمان**:
   - لا تكشف رموز التحقق في السجلات
   - استخدم HTTPS فقط
   - راقب محاولات الإساءة

---

## 🚀 الخطوات التالية

- [ ] إضافة Email Queue (Bull)
- [ ] إضافة SMS Queue (Bull)
- [ ] إضافة Email Templates Dashboard
- [ ] إضافة Analytics (معدل النجاح/الفشل)
- [ ] إضافة Retry Logic
- [ ] إضافة Webhooks

---

**آخر تحديث**: 16 يناير 2026  
**الإصدار**: 3.0.0  
**الحالة**: 🟢 جاهز للاستخدام

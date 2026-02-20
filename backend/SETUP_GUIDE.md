# 📚 دليل الإعداد الشامل - نظام الإشعارات والتنبيهات

## المحتويات

1. [المتطلبات الأساسية](#المتطلبات-الأساسية)
2. [التثبيت والإعداد](#التثبيت-والإعداد)
3. [إعدادات قنوات الإشعارات](#إعدادات-قنوات-الإشعارات)
4. [التكامل مع Express](#التكامل-مع-express)
5. [الاختبار](#الاختبار)
6. [حل المشاكل](#حل-المشاكل)
7. [تحسينات الأداء](#تحسينات-الأداء)

---

## المتطلبات الأساسية

### Node.js و npm
```bash
# التحقق من الإصدار
node --version  # v16+ مطلوب
npm --version   # v8+
```

### MongoDB
```bash
# التثبيت على Windows
# تحميل: https://www.mongodb.com/try/download/community
# التشغيل
mongod

# أو استخدام Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### المكتبات المطلوبة
```bash
# تثبيت جميع المكتبات
npm install

# المكتبات الأساسية المطلوبة:
# - express
# - mongoose
# - nodemailer
# - twilio
# - axios
# - dotenv
# - winston (logging)
```

---

## التثبيت والإعداد

### 1. نسخ الملفات

```bash
# انسخ جميع الملفات إلى مجلد المشروع
cp services/*.js backend/services/
cp routes/*.js backend/routes/
```

### 2. التكوين الأساسي

```bash
# انسخ ملف الإعدادات
cp .env.example .env

# قم بتحرير .env وأضف بيانات اعتمادك (سنشرح أدناه)
nano .env  # أو استخدم محرر آخر
```

### 3. إنشاء قاعدة البيانات

```bash
# تحقق من الاتصال
mongo --eval "db.adminCommand('ping')"

# يجب أن ترى: { ok: 1 }
```

### 4. تجربة الاتصال

```bash
node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB متصل'))
.catch(err => console.error('❌ خطأ:', err));
"
```

---

## إعدادات قنوات الإشعارات

### A. البريد الإلكتروني (Gmail)

#### الخطوة 1: تفعيل المصادقة
1. انتقل إلى: https://myaccount.google.com/security
2. فعّل "التحقق بخطوتين" (Two-Factor Authentication)
3. اذهب إلى: https://myaccount.google.com/apppasswords
4. اختر: Mail و Windows Computer
5. انسخ كلمة المرور المولدة (16 حرفاً)

#### الخطوة 2: التكوين

```env
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx  # 16 حرف من الخطوة 1
EMAIL_FROM_NAME=نظام الإشعارات
EMAIL_FROM_ADDRESS=noreply@your-system.com
```

#### الخطوة 3: اختبار

```javascript
const emailService = require('./services/unifiedNotificationManager');

emailService.sendEmailNotification('user@example.com', {
  title: 'اختبار البريد',
  body: 'هل يعمل البريد الإلكتروني؟',
})
.then(() => console.log('✅ تم إرسال البريد'))
.catch(err => console.error('❌ خطأ:', err));
```

---

### B. SMS - Twilio

#### الخطوة 1: إنشاء حساب

1. انتقل إلى: https://www.twilio.com/console
2. قم بالتسجيل أو تسجيل الدخول
3. احصل على:
   - Account SID
   - Auth Token
   - Phone Number

#### الخطوة 2: التكوين

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token-here
TWILIO_PHONE_NUMBER=+1234567890
```

#### الخطوة 3: اختبار

```javascript
const twilio = require('twilio');
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

const client = twilio(accountSid, authToken);

client.messages.create({
  body: 'اختبار الرسالة النصية',
  from: process.env.TWILIO_PHONE_NUMBER,
  to: '+966501234567'
})
.then(msg => console.log('✅ تم إرسال الرسالة:', msg.sid))
.catch(err => console.error('❌ خطأ:', err));
```

---

### C. WhatsApp

#### خيار 1: Official WhatsApp Business API

##### الخطوة 1: الإعداد
1. سجل في: https://www.facebook.com/business/
2. قم بإنشاء تطبيق
3. أضف WhatsApp API
4. احصل على:
   - Phone Number ID
   - Business Account ID
   - API Token

##### الخطوة 2: التكوين

```env
WHATSAPP_PROVIDER=official
WHATSAPP_API_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxxxx
WHATSAPP_PHONE_NUMBER_ID=102xxxxxxxxxxxxxxxxx
WHATSAPP_BUSINESS_ACCOUNT_ID=1xxxxxxxxxxxxxxx
WHATSAPP_API_VERSION=v18.0
```

##### الخطوة 3: اختبار

```bash
curl -X POST "https://graph.instagram.com/v18.0/YOUR_PHONE_ID/messages" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "966501234567",
    "type": "text",
    "text": {
      "body": "رسالة اختبار من الواتساب"
    }
  }'
```

#### خيار 2: Twilio WhatsApp

```env
WHATSAPP_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_WHATSAPP_NUMBER=whatsapp:+1xxxxxxxxxx
```

#### خيار 3: MessageBird

```env
WHATSAPP_PROVIDER=messagebird
MESSAGEBIRD_API_KEY=your-api-key
```

---

### D. Firebase Cloud Messaging (Push Notifications)

#### الخطوة 1: إنشاء مشروع Firebase

1. انتقل إلى: https://console.firebase.google.com
2. أنشئ مشروعاً جديداً
3. اذهب إلى إعدادات المشروع
4. انقر على "خدمات حساب الخدمة" (Service Accounts)
5. انقر على "Python" ثم "إنشاء مفتاح جديد" (Generate New Private Key)
6. حفظ الملف JSON

#### الخطوة 2: التكوين

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
```

---

### E. Slack Notifications

#### الخطوة 1: إنشاء Webhook

1. انتقل إلى: https://api.slack.com/messaging/webhooks
2. اختر Workspace
3. أنشئ تطبيقاً جديداً
4. فعّل "Incoming Webhooks"
5. انسخ webhook URL

#### الخطوة 2: التكوين

```env
SLACK_ENABLED=true
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
SLACK_CHANNEL=#notifications
```

---

## التكامل مع Express

### الخطوة 1: استيراد الطرق

```javascript
// في server.js أو app.js
const express = require('express');
const app = express();

// استيراد طرق الإشعارات
const notificationRoutes = require('./routes/notificationRoutes');

// إضافة المحطات والبرمجيات الوسيطة
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// تركيب طرق الإشعارات
app.use('/api/notifications', notificationRoutes);

// بدء الخادم
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 الخادم يعمل على المنفذ ${PORT}`);
});
```

### الخطوة 2: التحقق من التثبيت

```bash
# بدء الخادم
npm start

# في نافذة أخرى اختبر
curl http://localhost:5000/api/notifications/metrics/kpis

# يجب أن ترى:
# {
#   "success": true,
#   "kpis": { ... }
# }
```

---

## الاختبار

### 1. اختبار البريد الإلكتروني

```bash
curl -X POST http://localhost:5000/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "title": "اختبار البريد",
    "body": "أرسل لي بريد إلكتروني",
    "channels": {
      "email": true,
      "sms": false,
      "whatsapp": false
    }
  }'
```

### 2. اختبار الواتس آب

```bash
curl -X POST http://localhost:5000/api/notifications/whatsapp/send \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "966501234567",
    "message": "مرحباً، هذا اختبار"
  }'
```

### 3. اختبار القالب

```bash
curl -X POST http://localhost:5000/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "templateId": "TRANSACTION_SUCCESS",
    "variables": {
      "transaction_id": "TRX-12345",
      "amount": "1000",
      "currency": "SAR"
    },
    "channels": {
      "email": true,
      "whatsapp": true
    }
  }'
```

---

## حل المشاكل

### المشكلة: لا يمكن الاتصال بـ MongoDB

```bash
# تحقق من حالة MongoDB
mongosh --eval "db.adminCommand('ping')"

# أو بدء MongoDB
mongod

# تحقق من اتصال التطبيق
NODE_DEBUG=mongoose npm start
```

### المشكلة: خطأ في البريد الإلكتروني

```bash
# تحقق من بيانات الاعتماد
echo "password: $EMAIL_PASSWORD"

# اختبر مع تطبيق Gmail Test
# https://support.google.com/accounts/answer/7126594

# إذا كنت تستخدم حساب google غير أساسي
# اذهب إلى: https://accounts.google.com/DisplayUnlockCaptcha
```

### المشكلة: WhatsApp لا يرسل الرسائل

```bash
# تحقق من رقم الهاتف
node -e "
const whatsappService = require('./services/whatsappNotificationService');
console.log(whatsappService.normalizePhoneNumber('0501234567'));
// يجب أن يطبع: 966501234567
"

# تحقق من Token
curl -H "Authorization: Bearer $WHATSAPP_API_TOKEN" \
  "https://graph.instagram.com/debug_token?input_token=$WHATSAPP_API_TOKEN"
```

### المشكلة: معدل مرتفع من الأخطاء

```javascript
// قم بفحص السجلات
const fs = require('fs');
const logs = fs.readFileSync('./logs/notifications.log', 'utf8');
console.log(logs.slice(-5000)); // آخر 5000 حرف
```

---

## تحسينات الأداء

### 1. استخدام Redis للتخزين المؤقت

```env
REDIS_URL=redis://localhost:6379
CACHE_TTL=3600
```

```javascript
// تثبيت Redis
npm install redis

// في الخدمة
const redis = require('redis');
const client = redis.createClient({
  url: process.env.REDIS_URL
});
```

### 2. معالجة قائمة الانتظار بشكل فعال

```javascript
// قصر حجم قائمة الانتظار
MAX_QUEUE_SIZE=10000

// استخدم المعالجة المجمعة
BATCH_SIZE=100
BATCH_INTERVAL=5000
```

### 3. تحسين قاعدة البيانات

```javascript
// أنشئ فهارس
db.notifications.createIndex({ userId: 1, status: 1 });
db.notifications.createIndex({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // حذف بعد 30 يوم
db.notificationpreferences.createIndex({ userId: 1 });
```

### 4. تقليل حجم السجلات

```env
LOG_LEVEL=warn  # في الإنتاج
LOG_MAX_SIZE=10m
LOG_MAX_FILES=7  # الاحتفاظ بـ 7 أيام فقط
```

---

## الخطوات التالية

1. **تخصيص القوالب**
   - أضف قوالب مخصصة لعملك
   - استخدم متغيرات ديناميكية

2. **إعداد القواعس**
   - أنشئ قواعس تنبيهات مخصصة
   - اختبرها مع أحداث حقيقية

3. **مراقبة الأداء**
   - تتبع مؤشرات الأداء الرئيسية
   - أنشئ لوحات معلومات

4. **تحسين معدل النجاح**
   - راجع التقارير
   - طبّق التوصيات

---

## المساعدة والدعم

للمزيد من المعلومات:
- 📖 اقرأ: [NOTIFICATIONS_SYSTEM_GUIDE.md](./NOTIFICATIONS_SYSTEM_GUIDE.md)
- 🐛 أبلغ عن المشاكل في GitHub
- 💬 تواصل عبر Slack أو البريد الإلكتروني

---

**تاريخ الإنشاء:** فبراير 19, 2025
**الإصدار:** 1.0.0

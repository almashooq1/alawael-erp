# 📱 نظام الإشعارات والتنبيهات المتقدم الشامل

## 🎯 نظرة عامة

نظام احترافي وشامل وذكي ومتكامل للإشعارات والتنبيهات يدعم قنوات متعددة:
- ✅ البريد الإلكتروني (Email)
- ✅ الرسائل النصية (SMS)
- ✅ الواتس آب (WhatsApp)
- ✅ الإشعارات الفورية (In-App)
- ✅ إشعارات التطبيق (Push)
- ✅ لوحة التحكم (Dashboard)

---

## 📦 المكونات الرئيسية

### 1. **WhatsApp Notification Service** 📱
معالج متقدم لإرسال الرسائل عبر الواتس آب

**الملف:** `services/whatsappNotificationService.js`

**الميزات:**
- دعم أنواع متعددة من الرسائل (نص، صور، ملفات، تفاعلية)
- معالجة قائمة الانتظار الذكية
- نظام إعادة المحاولات التلقائي
- معدل التحديد والقائمة البيضاء
- دعم عدة مقدمي خدمات (Official، Twilio، MessageBird)

**الاستخدام:**
```javascript
const whatsappService = require('./services/whatsappNotificationService');

// إرسال رسالة نصية
await whatsappService.sendMessage('966501234567', 'مرحباً');

// إرسال صورة
await whatsappService.sendImageMessage('966501234567', 'https://example.com/image.jpg', 'وصف الصورة');

// إرسال رسائل جماعية
await whatsappService.sendBulkMessages(['966501234567', '966502345678'], 'رسالة جماعية');

// الحصول على الإحصائيات
const stats = whatsappService.getStatistics();
```

---

### 2. **Unified Notification Manager** 🔔
مدير موحد لجميع قنوات الإشعارات

**الملف:** `services/unifiedNotificationManager.js`

**الميزات:**
- إرسال موحد عبر قنوات متعددة
- معالجة قائمة انتظار متقدمة
- إعادة محاولات ذكية
- تتبع حالة التسليم
- إحصائيات شاملة

**الاستخدام:**
```javascript
const { notificationManager } = require('./services/unifiedNotificationManager');

// إرسال إشعار موحد
const notification = await notificationManager.sendNotification('user-123', {
  title: 'مرحباً',
  body: 'هذا إشعار موحد',
  channels: {
    email: true,
    sms: true,
    whatsapp: true,
    inApp: true,
  },
  priority: 'high',
  category: 'business',
});

// الحصول على إشعارات المستخدم
const notifications = await notificationManager.getUserNotifications('user-123', {
  limit: 50,
  status: 'sent',
});

// وضع علامة على الإشعار كمقروء
await notificationManager.markAsRead(notification.id);

// تقييم الإشعار
await notificationManager.rateNotification(notification.id, 5, 'رسالة رائعة');
```

---

### 3. **Smart Template System** 📋
نظام قوالب ذكي مع دعم لغات متعددة

**الملف:** `services/smartTemplateSystem.js`

**القوالب المدمجة:**
- `SYSTEM_ALERT` - تنبيهات النظام
- `TRANSACTION_SUCCESS` - تأكيد المعاملات
- `SECURITY_WARNING` - تنبيهات الأمان
- `REMINDER_UPCOMING` - التذكيرات
- `ERROR_OPERATION_FAILED` - رسائل الخطأ
- `SUCCESS_NOTIFICATION` - رسائل النجاح
- `BUSINESS_UPDATE` - تحديثات الأعمال
- `WARNING_NOTICE` - التحذيرات

**الاستخدام:**
```javascript
const { templateSystem } = require('./services/smartTemplateSystem');

// استخدام قالب مدمج
const notification = await templateSystem.createNotificationFromTemplate(
  'TRANSACTION_SUCCESS',
  {
    transaction_id: 'TRX-12345',
    amount: '1000',
    currency: 'SAR',
    date: new Date().toLocaleDateString('ar-SA'),
  },
  'ar' // اللغة
);

// إنشاء قالب مخصص
const customTemplate = await templateSystem.createTemplate({
  name: 'Custom Template',
  category: 'custom',
  content: {
    ar: {
      title: 'عنوان مخصص',
      body: 'نص المحتوى: {{variable_name}}',
    },
    en: {
      title: 'Custom Title',
      body: 'Content text: {{variable_name}}',
    },
  },
  variables: ['variable_name'],
  requiredVariables: ['variable_name'],
});
```

---

### 4. **User Preferences Manager** ⚙️
مدير تفضيلات المستخدمين المتقدم

**الملف:** `services/userPreferencesManager.js`

**الميزات:**
- إدارة القنوات المفعلة
- ساعات الراحة (Quiet Hours)
- حدود التكرار (Rate Limiting)
- قوائم الحظر والبيضاء
- إعدادات الخصوصية
- تقييم الإشعارات

**الاستخدام:**
```javascript
const { preferencesManager } = require('./services/userPreferencesManager');

// الحصول على تفضيلات المستخدم
const preferences = await preferencesManager.getPreferences('user-123');

// تحديث القنوات
await preferencesManager.updateChannels('user-123', {
  email: true,
  sms: false,
  whatsapp: true,
});

// تحديث ساعات الراحة
await preferencesManager.updateQuietHours('user-123', {
  enabled: true,
  startTime: '22:00',
  endTime: '08:00',
  timezone: 'Asia/Riyadh',
  daysOff: ['friday', 'saturday'],
});

// التحقق من إمكانية إرسال إشعار
const canSend = await preferencesManager.canSendNotification('user-123', {
  channel: 'whatsapp',
  category: 'transaction',
  priority: 'high',
});

// تعليق الإشعارات مؤقتاً
await preferencesManager.suspendNotifications('user-123', 2); // ساعتان

// حظر فئة معينة
await preferencesManager.addToBlacklist('user-123', 'categories', 'marketing');
```

---

### 5. **Advanced Alert Rules Engine** 🎯
محرك قواعس متقدم للتنبيهات

**الملف:** `services/advancedAlertRulesEngine.js`

**الميزات:**
- قواعس مرنة وقابلة للتخصيص
- تقييم شروط معقدة
- تنفيذ إجراءات متعددة
- معدل التحديد وحدود التكرار
- تجميع الإشعارات
- فترات الانتظار

**الاستخدام:**
```javascript
const { rulesEngine } = require('./services/advancedAlertRulesEngine');

// إنشاء قاعدة تنبيه
const rule = await rulesEngine.createRule({
  name: 'High Traffic Alert',
  description: 'تنبيه عند ارتفاع حركة المرور',
  
  conditions: {
    eventType: ['high_traffic'],
    severity: ['high', 'critical'],
    customFilters: [
      {
        field: 'cpu_usage',
        operator: 'gt',
        value: 80,
      },
    ],
    timeRange: {
      enabled: true,
      startTime: '08:00',
      endTime: '18:00',
    },
  },

  actions: {
    notify: {
      enabled: true,
      channels: ['email', 'sms', 'whatsapp'],
      templateId: 'SYSTEM_ALERT',
      priority: 'high',
    },
    webhook: {
      enabled: true,
      url: 'https://your-api.com/alerts',
      method: 'POST',
    },
  },

  constraints: {
    rateLimit: {
      enabled: true,
      maxPerHour: 5,
      maxPerDay: 20,
    },
  },
});

// تقييم حدث
const triggeredRules = await rulesEngine.evaluateEvent({
  type: 'high_traffic',
  severity: 'critical',
  cpu_usage: 85,
});
```

---

### 6. **Notification Analytics System** 📊
نظام تحليلات وإحصائيات شامل

**الملف:** `services/notificationAnalyticsSystem.js`

**الميزات:**
- إحصائيات فورية وتاريخية
- مؤشرات الأداء الرئيسية (KPIs)
- تقارير شاملة
- تحليل الاتجاهات
- توصيات ذكية

**الاستخدام:**
```javascript
const { analyticsSystem } = require('./services/notificationAnalyticsSystem');

// الحصول على الإحصائيات الحالية
const currentMetrics = await analyticsSystem.getCurrentMetrics();

// الحصول على مؤشرات الأداء
const kpis = await analyticsSystem.getKPIs();

// إنشاء تقرير شامل
const report = await analyticsSystem.generateComprehensiveReport(
  new Date('2025-02-01'),
  new Date('2025-02-28')
);

// تقرير القناة
const channelReport = await analyticsSystem.getChannelReport(
  'whatsapp',
  new Date('2025-02-01'),
  new Date('2025-02-28')
);

// تقرير المشاركة
const engagementReport = await analyticsSystem.getUserEngagementReport(
  new Date('2025-02-01'),
  new Date('2025-02-28')
);
```

---

## 🚀 التكامل مع Express

إضافة الطريق إلى تطبيق Express:

```javascript
const express = require('express');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();

app.use('/api/notifications', notificationRoutes);
```

---

## 📡 نقاط النهاية (API Endpoints)

### إرسال الإشعارات
- `POST /api/notifications/send` - إرسال إشعار موحد
- `POST /api/notifications/send-immediate` - إرسال فوري
- `POST /api/notifications/send-bulk` - إرسال جماعي
- `POST /api/notifications/whatsapp/send` - إرسال واتس آب

### إدارة القوالب
- `GET /api/notifications/templates` - جميع القوالب
- `POST /api/notifications/templates` - إنشاء قالب
- `PUT /api/notifications/templates/:templateId` - تحديث
- `DELETE /api/notifications/templates/:templateId` - حذف
- `POST /api/notifications/templates/:templateId/use` - استخدام القالب

### تفضيلات المستخدمين
- `GET /api/notifications/preferences/:userId` - جلب التفضيلات
- `PUT /api/notifications/preferences/:userId` - تحديث التفضيلات
- `POST /api/notifications/preferences/:userId/suspend` - تعليق
- `POST /api/notifications/preferences/:userId/resume` - استئناف

### الإحصائيات
- `GET /api/notifications/metrics/current` - الإحصائيات الحالية
- `GET /api/notifications/metrics/kpis` - مؤشرات الأداء
- `POST /api/notifications/reports/comprehensive` - تقرير شامل

### إدارة الإشعارات
- `GET /api/notifications/user/:userId` - إشعارات المستخدم
- `PUT /api/notifications/:notificationId/read` - وضع علامة مقروء
- `DELETE /api/notifications/:notificationId` - حذف

### القواعس
- `POST /api/notifications/rules` - إنشاء قاعدة
- `GET /api/notifications/rules` - جميع القواعس
- `PUT /api/notifications/rules/:ruleId` - تحديث
- `DELETE /api/notifications/rules/:ruleId` - حذف

---

## ⚙️ الإعدادات (.env)

```bash
# البريد الإلكتروني
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
ADMIN_EMAIL=admin@system.com

# Twilio (SMS)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
ADMIN_PHONE=+966501234567

# WhatsApp
WHATSAPP_PROVIDER=official  # official, twilio, messagebird
WHATSAPP_API_TOKEN=your-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-id
WHATSAPP_BUSINESS_ACCOUNT_ID=your-account-id
WHATSAPP_API_VERSION=v18.0
WHATSAPP_RATE_LIMIT=60  # per minute
WHATSAPP_WHITELIST_ONLY=false

# Slack
SLACK_WEBHOOK_URL=https://hooks.slack.com/...

# قاعدة البيانات
MONGODB_URI=mongodb://localhost:27017/notifications

# النظام
NODE_ENV=production
LOG_LEVEL=info
```

---

## 🔒 الأمان

### التحقق والتصحيح
```javascript
// التحقق من رقم الهاتف
whatsappService.isValidPhoneNumber('966501234567');

// تطبيع الأرقام
whatsappService.normalizePhoneNumber('+966-501-234-567');

// تنظيف الرسائل
whatsappService.sanitizeMessage(userInput);
```

### القائمة البيضاء
```javascript
// إضافة رقم موثوق
whatsappService.addToWhitelist('966501234567');

// إزالة
whatsappService.removeFromWhitelist('966501234567');
```

---

## 📊 الإحصائيات

```javascript
// إحصائيات الواتس آب
const whatsappStats = whatsappService.getStatistics();
// {
//   total: 1250,
//   sent: 1200,
//   failed: 30,
//   pending: 20,
//   successRate: '96%'
// }

// إحصائيات الإشعارات
const notificationStats = notificationManager.getStatistics();
// {
//   total: 5000,
//   sent: 4800,
//   failed: 150,
//   successRate: '96%',
//   channelStats: { ... }
// }
```

---

## 🧪 اختبار الواتس آب

```javascript
// اختبار الاتصال
await whatsappService.sendMessage('966501234567', 'رسالة اختبار');

// التحقق من السجل
const history = whatsappService.getHistory(10);

// مسح السجل
whatsappService.clearHistory();
```

---

## 📝 ملاحظات مهمة

1. **معدل التحديد**: يتم تطبيق حد أقصى للرسائل لكل دقيقة وساعة ويوم
2. **إعادة المحاولات**: يتم إعادة محاولة الرسائل الفاشلة تلقائياً
3. **ساعات الراحة**: يتم احترام تفضيلات المستخدم حول أوقات الهدوء
4. **اللغات**: دعم كامل للعربية والإنجليزية
5. **التتبع**: يمكن تتبع حالة كل رسالة

---

## 🤝 المساهمة

إذا كنت تريد إضافة ميزات جديدة أو إصلاح أخطاء:
1. قم بإنشاء فرع جديد
2. قم بإجراء التعديلات
3. أرسل طلب دمج (Pull Request)

---

## 📞 الدعم

للحصول على الدعم أو الإبلاغ عن المشاكل:
- 📧 البريد الإلكتروني: support@system.com
- 💬 Slack: #notifications-support
- 🐛 المشاكل: GitHub Issues

---

## 📄 الترخيص

هذا المشروع مرخص تحت رخصة MIT

---

**آخر تحديث:** فبراير 19, 2025
**الإصدار:** 1.0.0

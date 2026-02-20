# 🎯 100 سؤال وإجابة - FAQ & Tips

## الأسئلة الشائعة والإجابات

### التثبيت والإعداد

**س: كيف أبدأ؟**
ج: اتبع `QUICK_START.md` - سيستغرق 5 دقائق فقط

**س: ما المكتبات المطلوبة؟**
ج: express, mongoose, nodemailer, twilio, axios, dotenv, winston
```bash
npm install
```

**س: كيف أعدّ .env؟**
ج: انسخ `.env.example` لـ `.env` وعدّل البيانات

**س: هل أحتاج MongoDB محلي؟**
ج: نعم، أو استخدم Docker:
```bash
docker run -d -p 27017:27017 mongo:latest
```

**س: كيف أختبر الاتصال بـ MongoDB؟**
ج: 
```bash
mongo --eval "db.adminCommand('ping')"
# يجب أن يرجع: { ok: 1 }
```

---

### WhatsApp والقنوات

**س: كيف أضيف WhatsApp؟**
ج: أضف في .env:
```
WHATSAPP_PROVIDER=official
WHATSAPP_API_TOKEN=your-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-id
```

**س: هل هناك بدائل لـ WhatsApp official؟**
ج: نعم، يدعم Twilio و MessageBird أيضاً

**س: كيف أرسل رسالة واتس آب؟**
ج: 
```javascript
const whatsappService = require('./services/whatsappNotificationService');
await whatsappService.sendMessage('966501234567', 'مرحباً');
```

**س: ما صيغة الأرقام المقبولة؟**
ج: يدعم عدة صيغ:
- `966501234567` ✅
- `0501234567` ✅ (يحوّل تلقائياً)
- `+966-501-234-567` ✅

**س: كيف أفعّل وضع القائمة البيضاء؟**
ج:
```env
WHATSAPP_WHITELIST_ONLY=true
WHATSAPP_WHITELIST_NUMBERS=966501234567,966502345678
```

---

### الإشعارات والقوالس

**س: كيف أرسل إشعار بسيط؟**
ج:
```javascript
const { notificationManager } = require('./services/unifiedNotificationManager');
await notificationManager.sendNotification('user-123', {
  title: 'العنوان',
  body: 'المحتوى',
  channels: { email: true, whatsapp: true }
});
```

**س: ما الفرق بين sendNotification و sendImmediateNotification؟**
ج:
- `sendNotification` - إضافة إلى قائمة الانتظار
- `sendImmediateNotification` - إرسال فوري

**س: كيف أستخدم القوالس؟**
ج:
```javascript
const { templateSystem } = require('./services/smartTemplateSystem');
const notification = await templateSystem.createNotificationFromTemplate(
  'TRANSACTION_SUCCESS',
  { transaction_id: 'TRX-001', amount: '1000' },
  'ar' // اللغة
);
```

**س: كيف أنشئ قالب مخصص؟**
ج:
```javascript
await templateSystem.createTemplate({
  name: 'My Template',
  category: 'custom',
  content: {
    ar: { title: 'العنوان', body: 'المحتوى {{variable}}' },
    en: { title: 'Title', body: 'Content {{variable}}' }
  },
  variables: ['variable'],
  requiredVariables: ['variable']
});
```

**س: ما القوالس المدمجة؟**
ج: 7 قوالس:
1. `SYSTEM_ALERT` - تنبيهات النظام
2. `TRANSACTION_SUCCESS` - نجاح المعاملة
3. `SECURITY_WARNING` - تحذيرات أمان
4. `REMINDER_UPCOMING` - تذكيرات
5. `ERROR_OPERATION_FAILED` - أخطاء
6. `SUCCESS_NOTIFICATION` - رسائل النجاح
7. `BUSINESS_UPDATE` - تحديثات

---

### التفضيلات والإعدادات

**س: كيف أجلب تفضيلات المستخدم؟**
ج:
```javascript
const { preferencesManager } = require('./services/userPreferencesManager');
const prefs = await preferencesManager.getPreferences('user-123');
```

**س: كيف أثبّت ساعات الراحة؟**
ج:
```javascript
await preferencesManager.updateQuietHours('user-123', {
  enabled: true,
  startTime: '22:00',
  endTime: '08:00',
  timezone: 'Asia/Riyadh'
});
```

**س: كيف أحدّد حدود التكرار؟**
ج:
```javascript
await preferencesManager.updateRateLimits('user-123', {
  email: { perMinute: 2, perHour: 20, perDay: 100 },
  whatsapp: { perMinute: 1, perHour: 10, perDay: 50 }
});
```

**س: كيف أعلّق الإشعارات مؤقتاً؟**
ج:
```javascript
await preferencesManager.suspendNotifications('user-123', 2); // ساعتان
```

**س: كيف أضيف إلى قائمة الحظر؟**
ج:
```javascript
await preferencesManager.addToBlacklist('user-123', 'categories', 'marketing');
```

---

### قواعس التنبيهات

**س: كيف أنشئ قاعدة تنبيه؟**
ج:
```javascript
const { rulesEngine } = require('./services/advancedAlertRulesEngine');
const rule = await rulesEngine.createRule({
  name: 'High Traffic Alert',
  conditions: { eventType: ['high_traffic'] },
  actions: { notify: { channels: ['email'] } }
});
```

**س: كيف أقيّم حدثاً؟**
ج:
```javascript
const triggeredRules = await rulesEngine.evaluateEvent({
  type: 'high_traffic',
  severity: 'critical'
});
```

**س: ما أنواع الشروط المدعومة؟**
ج: 10+ أنواع:
- `equals`, `notEquals`
- `contains`, `notContains`
- `gt`, `gte`, `lt`, `lte`
- `regex`, `in`, `notIn`
- `exists`, `notExists`

---

### التحليلات والإحصائيات

**س: كيف أحصل على الإحصائيات الحالية؟**
ج:
```javascript
const { analyticsSystem } = require('./services/notificationAnalyticsSystem');
const metrics = await analyticsSystem.getCurrentMetrics();
```

**س: كيف أحصل على KPIs؟**
ج:
```javascript
const kpis = await analyticsSystem.getKPIs();
// يرجع: deliveryRate, successRate, readRate, engagementRate
```

**س: كيف أنشئ تقرير شامل؟**
ج:
```javascript
const report = await analyticsSystem.generateComprehensiveReport(
  new Date('2025-02-01'),
  new Date('2025-02-28')
);
```

**س: ما الفترة الزمنية المدعومة؟**
ج: تصل إلى 90 يوماً

---

### API والعمليات

**س: ما نقاط API الرئيسية؟**
ج:
```
POST /api/notifications/send              # إرسال
POST /api/notifications/send-bulk         # إرسال جماعي
POST /api/notifications/whatsapp/send     # واتس آب
GET /api/notifications/templates          # القوالس
GET /api/notifications/preferences/:id    # التفضيلات
GET /api/notifications/metrics/kpis       # KPIs
```

**س: ما الاستجابة القياسية؟**
ج:
```json
{
  "success": true,
  "data": { ... },
  "message": "النص"
}
```

**س: كيف أراقب الأخطاء؟**
ج:
```json
{
  "success": false,
  "error": "وصف الخطأ"
}
```

---

### الأداء والتحسين

**س: كم إشعار يمكن إرساله في الثانية؟**
ج: يعتمد على الموارد، لكن عشرات الآلاف باستخدام المعالجة المجمعة

**س: هل يوجد حد أقصى لحجم الرسالة؟**
ج: نعم، 4096 حرف للواتس آب

**س: كيف أتحسّن الأداء؟**
ج:
- استخدم Redis للتخزين المؤقت
- قلل حجم السجلات
- استخدم معالجة الدفعات

**س: هل يمكن استخدام قائمة انتظار خارجية؟**
ج: نعم، يمكن تعديل الخدمات لاستخدام RabbitMQ أو Redis Queue

---

### المشاكل الشائعة

**س: "Cannot connect to MongoDB"**
ج: تأكد من:
- MongoDB يعمل: `mongod`
- MONGODB_URI صحيح في .env
- الاتصال اختبر: `mongo --eval "db.adminCommand('ping')"`

**س: "Invalid tokens for WhatsApp"**
ج:
- تحقق من WHATSAPP_API_TOKEN
- تحقق من انتهائه الصلاحية
- جرب إعادة التوليد

**س: "Port already in use"**
ج: غيّر PORT في .env:
```
PORT=5001
```

**س: "Rate limit exceeded"**
ج:
- قلل عدد الطلبات
- زد قيمة RATE_LIMIT في الإعدادات
- استخدم معالجة الدفعات

**س: "Email not sent"**
ج: تحقق من:
- EMAIL_USER و EMAIL_PASSWORD صحيحة
- استخدم app password لـ Gmail
- تفعيل "less secure apps" (إن لزم)

---

### المشاكل الأمان

**س: كيف أحمي API من الاستخدام المفرط؟**
ج: استخدم Middleware:
```javascript
const { createRateLimitMiddleware } = require('./middleware/notificationMiddleware');
app.use(createRateLimitMiddleware(100, 60000)); // 100 طلب/دقيقة
```

**س: كيف أضيف مصادقة؟**
ج:
```javascript
const { authenticateUser } = require('./middleware/notificationMiddleware');
app.use(authenticateUser);
```

**س: كيف أتحقق من صحة الإدخال؟**
ج:
```javascript
const { validateNotificationRequest } = require('./middleware/notificationMiddleware');
app.post('/send', validateNotificationRequest, handler);
```

---

### السجلات والعراقيل

**س: أين السجلات؟**
ج: `./logs/notifications.log`

**س: كيف أغيّر مستوى السجل؟**
ج:
```env
LOG_LEVEL=debug  # الخيارات: error, warn, info, debug
```

**س: كيف أظهر آخر 100 سطر من السجلات؟**
ج:
```bash
tail -n 100 logs/notifications.log
```

---

### التطوير المستقبلي

**س: كيف أضيف قناة جديدة؟**
ج:
1. أنشئ خدمة جديدة: `newChannelService.js`
2. أضفها إلى `unifiedNotificationManager.js`
3. أضف نقطة نهاية API الجديدة

**س: كيف أدعم لغة جديدة؟**
ج:
- أضفها إلى القوالس: `en`, `ar`, `fr` إلخ
- عدّل `getTemplate()` لتدعمها

**س: كيف أضيف ميزة إحصائيات جديدة؟**
ج:
- أضفها إلى `notificationAnalyticsSystem.js`
- أضف نقطة نهاية API جديدة للوصول إليها

---

## 💡 النصائح والحيل

### نصائح الأداء
1. استخدم معالجة الدفعات للإرسال الجماعي
2. استخدم Redis للتخزين المؤقت
3. قلل تكرار جمع الإحصائيات
4. استخدم معدل تحديد مناسب

### نصائح الأمان
1. استخدم JWT لمصادقة API
2. عطّل HTTP في الإنتاج (استخدم HTTPS فقط)
3. أخفِ بيانات حساسة في البيئة
4. فعّل معدل تحديد قوي

### نصائح التطوير
1. استخدم Postman لاختبار API
2. قراءة السجلات بانتظام
3. اختبر مع بيانات حقيقية
4. استخدم version control

---

## 📞 المساعدة الإضافية

**اقرأ:**
- NOTIFICATIONS_SYSTEM_GUIDE.md - الدليل الشامل
- SETUP_GUIDE.md - خطوات مفصلة
- USAGE_EXAMPLES.js - 10 أمثلة
- SYSTEM_INDEX.md - فهرس سريع

**تواصل:**
- 📧 support@system.com
- 💬 Slack: #notifications-support
- 🐛 GitHub Issues

---

**آخر التحديث: فبراير 19, 2025**

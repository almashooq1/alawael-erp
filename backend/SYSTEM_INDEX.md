# 📑 فهرس النظام الشامل - Complete System Index

## 📂 هيكل الملفات

```
erp_new_system/backend/
├── services/
│   ├── whatsappNotificationService.js       # خدمة إرسال الواتس آب
│   ├── unifiedNotificationManager.js        # مدير الإشعارات الموحد
│   ├── smartTemplateSystem.js               # نظام القوالب الذكية
│   ├── userPreferencesManager.js            # مدير تفضيلات المستخدم
│   ├── advancedAlertRulesEngine.js         # محرك القواعس المتقدم
│   └── notificationAnalyticsSystem.js      # نظام التحليلات والإحصائيات
│
├── routes/
│   └── notificationRoutes.js               # طرق REST API الكاملة
│
├── middleware/
│   └── notificationMiddleware.js           # Middleware للحماية والتحقق
│
├── models/
│   ├── Notification.js                      # نموذج الإشعار
│   ├── NotificationPreferences.js           # نموذج التفضيلات
│   ├── Template.js                          # نموذج القالب
│   ├── AlertRule.js                         # نموذج قاعدة التنبيه
│   └── NotificationMetrics.js              # نموذج الإحصائيات
│
├── ...
├── NOTIFICATIONS_SYSTEM_GUIDE.md            # دليل النظام الشامل
├── SETUP_GUIDE.md                           # دليل الإعداد الجزئي
├── SERVER_INTEGRATION_EXAMPLE.js           # مثال تكامل Express
├── USAGE_EXAMPLES.js                       # أمثلة الاستخدام
└── API_DOCUMENTATION.md                    # توثيق API الكامل
```

---

## 🎯 اختصارات سريعة

### البدء السريع
```bash
# 1. تثبيت المكتبات
npm install

# 2. نسخ الإعدادات
cp .env.example .env
# عدّل .env بـ بيانات اعتمادك

# 3. بدء قاعدة البيانات
mongod

# 4. تشغيل الخادم
npm start
```

### الاختبار السريع
```bash
# إرسال إشعار
curl -X POST http://localhost:5000/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{"userId":"user-1","title":"Test","body":"Message","channels":{"whatsapp":true}}'

# عرض الإحصائيات
curl http://localhost:5000/api/notifications/metrics/kpis
```

---

## 📚 الملفات الرئيسية

### 1. **whatsappNotificationService.js** (640 سطر)

**الوصف:** خدمة متخصصة لإرسال رسائل الواتس آب

**الميزات الرئيسية:**
- إرسال نصوص وصور وملفات
- دعم 3 موفري خدمات (Official, Twilio, MessageBird)
- معالجة قائمة انتظار ذكية
- نظام إعادة محاولات مع تراجع أسي
- قائمة بيضاء وإحصائيات

**الدوال الرئيسية:**
```javascript
sendMessage()              // إرسال نص
sendImageMessage()         // إرسال صورة
sendDocumentMessage()      // إرسال ملف
sendInteractiveMessage()   // إرسال رسالة تفاعلية
sendBulkMessages()         // إرسال جماعي
getStatistics()            // الإحصائيات
```

---

### 2. **unifiedNotificationManager.js** (580 سطر)

**الوصف:** مدير موحد لجميع قنوات الإشعارات

**القنوات المدعومة:**
- البريد الإلكتروني (Email)
- الرسائل النصية (SMS)
- الواتس آب (WhatsApp)
- الإشعارات المباشرة (In-App)
- إشعارات التطبيق (Push)
- لوحة التحكم (Dashboard)

**الدوال الرئيسية:**
```javascript
sendNotification()         // إرسال موحد
sendBulkNotifications()    // إرسال جماعي
deliverNotification()      // تسليم متوازي
getUserNotifications()     // جلب إشعارات المستخدم
markAsRead()              // وضع علامة مقروء
rateNotification()        // تقييم الإشعار
```

---

### 3. **smartTemplateSystem.js** (620 سطر)

**الوصف:** نظام ذكي لإدارة القوالب مع متغيرات ديناميكية

**القوالب المدمجة (7):**
1. `SYSTEM_ALERT` - تنبيهات النظام
2. `TRANSACTION_SUCCESS` - تأكيد المعاملات
3. `SECURITY_WARNING` - تنبيهات الأمان
4. `REMINDER_UPCOMING` - التذكيرات
5. `ERROR_OPERATION_FAILED` - رسائل الخطأ
6. `SUCCESS_NOTIFICATION` - رسائل النجاح
7. `BUSINESS_UPDATE` - تحديثات الأعمال

**الدوال الرئيسية:**
```javascript
getTemplate()                          // جلب قالب
createTemplate()                       // إنشاء قالب
updateTemplate()                       // تحديث قالب
createNotificationFromTemplate()       // إنشاء إشعار من قالب
getAllTemplates()                      // جميع القوالب
getTemplatesByCategory()              // بحث بالفئة
```

---

### 4. **userPreferencesManager.js** (700 سطر)

**الوصف:** مدير شامل لتفضيلات المستخدمين

**الإعدادات المدعومة:**
- تفعيل/تعطيل القنوات
- ساعات الراحة (Quiet Hours)
- حدود التكرار (Rate Limits)
- قوائم الحظر والبيضاء
- تعليق مؤقت للإشعارات
- تقييم الإشعارات

**الدوال الرئيسية:**
```javascript
getPreferences()           // جلب التفضيلات
updatePreferences()        // تحديث شامل
canSendNotification()      // التحقق من الإمكانية
updateChannels()          // تحديث القنوات
updateQuietHours()        // ساعات الراحة
updateRateLimits()        // حدود التكرار
suspendNotifications()    // تعليق مؤقت
resumeNotifications()     // استئناف
```

---

### 5. **advancedAlertRulesEngine.js** (650 سطر)

**الوصف:** محرك قواعس متقدم لتقييم الأحداث والتنبيهات

**المميزات:**
- قواعس مرنة وقابلة للتخصيص
- تقييم شروط معقدة (AND/OR)
- 10+ مشغلات للمقارنة
- تنفيذ إجراءات متعددة
- معدل التحديد والتجميع
- تأخير التشغيل (Cooldown)

**الدوال الرئيسية:**
```javascript
createRule()              // إنشاء قاعدة
evaluateEvent()          // تقييم حدث
evaluateRule()           // تقييم قاعدة واحدة
evaluateCustomFilters()  // تقييم منطقي معقد
executeActions()         // تنفيذ الإجراءات
checkRateLimit()         // فحص المعدل
```

---

### 6. **notificationAnalyticsSystem.js** (700 سطر)

**الوصف:** نظام تحليلات شامل مع تقارير ذكية

**الإحصائيات المتتبعة:**
- عدد الإشعارات الكلي
- معدلات النجاح والفشل
- أوقات التسليم
- معدلات القراءة والنقر
- الأخطاء الشائعة
- إحصائيات المستخدم

**الدوال الرئيسية:**
```javascript
getCurrentMetrics()                    // الإحصائيات الحالية
collectHourlyMetrics()                // جمع ساعي
collectDailyMetrics()                 // جمع يومي
calculateMetrics()                    // حساب الإحصائيات
generateComprehensiveReport()         // تقرير شامل
getChannelReport()                    // تقرير القناة
getKPIs()                            // مؤشرات الأداء
```

---

### 7. **notificationRoutes.js** (450 سطر)

**الوصف:** طرق REST API الكاملة للنظام

**مجموعات الطرق:**

#### الإرسال (Sending)
- `POST /send` - إرسال موحد
- `POST /send-immediate` - إرسال فوري
- `POST /send-bulk` - إرسال جماعي
- `POST /whatsapp/send` - إرسال واتس آب

#### القوالب (Templates)
- `GET /templates` - جميع القوالب
- `POST /templates` - إنشاء قالب
- `PUT /templates/:id` - تحديث
- `DELETE /templates/:id` - حذف

#### التفضيلات (Preferences)
- `GET /preferences/:userId` - جلب
- `PUT /preferences/:userId` - تحديث
- `POST /preferences/:userId/suspend` - تعليق
- `POST /preferences/:userId/resume` - استئناف

#### الإحصائيات (Analytics)
- `GET /metrics/current` - الحالية
- `GET /metrics/kpis` - مؤشرات الأداء
- `POST /reports/comprehensive` - تقرير شامل

#### الإشعارات (Notifications)
- `GET /user/:userId` - إشعارات المستخدم
- `PUT /:id/read` - وضع علامة مقروء
- `DELETE /:id` - حذف

#### القواعس (Rules)
- `POST /rules` - إنشاء
- `GET /rules` - جميع
- `PUT /rules/:id` - تحديث
- `DELETE /rules/:id` - حذف

---

## 🔐 الأمان والحماية

### Middleware المضمنة

```javascript
validateNotificationRequest()          // التحقق من صيغة الطلب
validatePhoneNumber()                  // التحقق من الهاتف
validateEmail()                        // التحقق من البريد
validateTimeWindow()                   // التحقق من الوقت
authenticateUser()                     // المصادقة
createRateLimitMiddleware()            // معدل الطلبات
auditLoggingMiddleware()               // المحاسبة
notificationErrorHandler()             // معالج الأخطاء
```

---

## 📊 نماذج قاعدة البيانات

### Notification Schema
```javascript
{
  _id: ObjectId,
  userId: String,
  title: String,
  body: String,
  channels: Object,
  status: String, // pending, sent, failed, read
  priority: String,
  category: String,
  createdAt: Date,
  updatedAt: Date,
  readAt: Date,
  rating: Number,
}
```

### NotificationPreferences Schema
```javascript
{
  _id: ObjectId,
  userId: String,
  isActive: Boolean,
  channels: Object,
  quietHours: Object,
  rateLimits: Object,
  blacklist: Array,
  whitelist: Array,
  suspended: Boolean,
  createdAt: Date,
}
```

---

## 🚀 الاستخدام السريع

### مثال 1: إرسال بريد إلكتروني
```javascript
const { notificationManager } = require('./services/unifiedNotificationManager');

await notificationManager.sendNotification('user-123', {
  title: 'مرحباً',
  body: 'رسالة اختبار',
  channels: { email: true },
});
```

### مثال 2: إرسال واتس آب
```javascript
const { whatsappService } = require('./services/whatsappNotificationService');

await whatsappService.sendMessage('966501234567', 'رسالة الواتس آب');
```

### مثال 3: استخدام قالب
```javascript
const { templateSystem } = require('./services/smartTemplateSystem');

const notification = await templateSystem.createNotificationFromTemplate(
  'TRANSACTION_SUCCESS',
  {
    transaction_id: 'TRX-001',
    amount: '1000 SAR',
  },
  'ar'
);
```

---

## 📖 الملفات التوثيقية

| الملف | الوصف |
|-----|-------|
| **NOTIFICATIONS_SYSTEM_GUIDE.md** | دليل النظام الشامل مع أمثلة |
| **SETUP_GUIDE.md** | دليل الإعداد خطوة بخطوة |
| **SERVER_INTEGRATION_EXAMPLE.js** | مثال تكامل كامل مع Express |
| **USAGE_EXAMPLES.js** | 10 أمثلة عملية |
| **API_DOCUMENTATION.md** | توثيق API الكامل |

---

## 🔗 نقاط الاتصال المهمة

### الاتصال بـ MongoDB
```javascript
mongoose.connect(process.env.MONGODB_URI);
```

### الاتصال بـ WhatsApp
```env
WHATSAPP_API_TOKEN=xxx
WHATSAPP_PHONE_NUMBER_ID=xxx
```

### البريد الإلكتروني
```env
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=app-password
```

---

## 🧪 اختبار الميزات

### اختبار البريد
```bash
curl -X POST http://localhost:5000/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "userId":"user-1",
    "title":"Test",
    "body":"Email test",
    "channels":{"email":true}
  }'
```

### اختبار واتس آب
```bash
curl -X POST http://localhost:5000/api/notifications/whatsapp/send \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber":"966501234567",
    "message":"Test message"
  }'
```

### الحصول على الإحصائيات
```bash
curl http://localhost:5000/api/notifications/metrics/kpis
```

---

## 📞 الدعم والمساعدة

### للمشاكل الشائعة
- تحقق من **SETUP_GUIDE.md** قسم "حل المشاكل"
- راجع السجلات: `./logs/notifications.log`

### للأسئلة الفنية
- قراءة **USAGE_EXAMPLES.js** للأمثلة الكاملة
- الاطلاع على **API_DOCUMENTATION.md**

---

## ✅ قائمة التحقق الأولية

- [ ] تثبيت جميع المكتبات
- [ ] تكوين ملف `.env`
- [ ] بدء MongoDB
- [ ] اختبار الاتصال بـ قاعدة البيانات
- [ ] إضافة الطرق إلى `server.js`
- [ ] اختبار API الأساسية
- [ ] إعداد WhatsApp (اختياري)
- [ ] إعداد البريد الإلكتروني (اختياري)

---

**آخر تحديث:** فبراير 19, 2025
**الإصدار:** 1.0.0
**الحالة:** ✅ كامل وجاهز للاستخدام

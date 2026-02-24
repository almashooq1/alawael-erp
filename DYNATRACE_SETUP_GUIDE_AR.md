# 🔍 دليل تكوين Dynatrace OneAgent

## نظرة عامة
تم تركيب وتكوين Dynatrace OneAgent في مشروعيك:
- **Backend**: Node.js + Express Server
- **Frontend**: React App

---

## ✅ ما تم تثبيته

### Backend
- ✅ `@dynatrace/oneagent-sdk` تم تثبيته
- ✅ تم إضافة التهيئة الأولى في `server.js`
- ✅ ملف تكوين في `config/dynatrace.config.js`
- ✅ متغيرات البيئة في `.env`

### Frontend  
- ✅ Real User Monitoring (RUM) JavaScript injected في `public/index.html`
- ✅ جمع بيانات الأداء التلقائي
- ✅ جمع أخطاء المتصفح التلقائي

---

## 🚀 كيفية التشغيل

### 1️⃣ تشغيل Backend
```bash
cd erp_new_system/backend
npm start
```
ستشاهد رسالة:
```
✅ Dynatrace OneAgent Initialized
```

### 2️⃣ تشغيل Frontend
```bash
cd supply-chain-management/frontend
npm start
```
الـ JavaScript تلقائياً سيتم تحميله (إذا كنت غير بـ localhost)

---

## 🔐 تكوين متغيرات البيئة (مهم!)

في ملف `.env`:

```env
# الأساسي
DYNATRACE_ENABLED=true
DYNATRACE_APP_ID=alawael-backend
DYNATRACE_ENV_ID=production

# إذا كان لديك Dynatrace Server
DYNATRACE_SERVER_URL=https://your-dynatrace-server.com
DYNATRACE_API_TOKEN=your-api-token-here
DYNATRACE_ENVIRONMENT_ID=your-env-id
```

---

## 📊 مراقبة الأداء

### ما يتم جمعه تلقائياً:

#### Backend:
- ✅ أوقات الاستجابة HTTPتابع الـ Requests/Responses
- ✅ عمليات قاعدة البيانات (MongoDB, MySQL)
- ✅ عمليات Redis
- ✅ معدل الأخطاء والاستثناءات
- ✅ استهلاك الذاكرة والـ CPU
- ✅ ActiveConnections والـ Threads

#### Frontend:
- ✅ وقت التحميل الكامل (Page Load Time)
- ✅ Interactive Elements Timing
- ✅ أخطاء JavaScript والـ Console errors
- ✅ Core Web Vitals (LCP, FID, CLS)
- ✅ مراقبة الـ API Calls من الـ Browser

---

## 🔗 الاتصال بـ Dynatrace

### Option 1: لـ Development (بدون Server)
الخيار الحالي يعمل بدون الاتصال بـ Dynatrace Server مباشرة.
البيانات تُجمع محلياً في الـ Process.

### Option 2: للـ Production (مع Server)
إذا كنت تريد الاتصال بـ Dynatrace SaaS:

```bash
# 1. احصل على توكن API من Dynatrace
# 2. أضفه في .env
DYNATRACE_API_TOKEN=your-token-xyz123

# 3. قم بإعادة تشغيل التطبيق
npm start
```

---

## 📈 عرض البيانات

### في Dynatrace Portal:
1. اذهب إلى: **Applications** → **alawael-backend**
2. ستشاهد:
   - Transaction Flow
   - Database Queries
   - Error Analysis
   - Performance Metrics

### محلياً:
```bash
# معلومات استخدام الذاكرة
npm run analyze

# عرض السجلات
tail -f logs/application.log
```

---

## ✨ الميزات المتقدمة

### 1. تتبع Transactions المخصصة
```javascript
const dynatrace = require('@dynatrace/oneagent-sdk');
const transaction = dynatrace.createTransaction('custom-operation');
// ... أكوادك ...
transaction.end();
```

### 2. إضافة Metadata مخصصة
```javascript
dynatrace.addCustomTag('user-type', 'premium');
dynatrace.addCustomTag('region', 'saudi-arabia');
```

### 3. تتبع الأخطاء
```javascript
try {
  // أكوادك
} catch (error) {
  dynatrace.reportError(error, { userId: '123' });
}
```

---

## 🆘 استكشاف الأخطاء

### المشكلة: "Dynatrace not initialized"
**الحل:**
```bash
# تأكد من أن متغيرات البيئة موجودة
cat .env | grep DYNATRACE

# إعادة تشغيل:
npm start
```

### المشكلة: بيانات لا تظهر في Dynatrace Portal
**الحل:**
```bash
# 1. تحقق من API Token
# 2. تحقق من الـ Server URL
# 3. تحقق من الـ Network Connection

curl -H "Authorization: Api-Token $DYNATRACE_API_TOKEN" \
  $DYNATRACE_SERVER_URL/api/v1/environment/status
```

### المشكلة: أداء سيء بسبب Dynatrace
**الحل:**
```env
# قلل نسبة العينات
DYNATRACE_LOG_LEVEL=warn
# عطّل بعض الميزات
DYNATRACE_TRACE=false
```

---

## 📚 مراجع إضافية

- [Dynatrace Node.js Documentation](https://docs.dynatrace.com/docs/shortlink/nodejs-intro)
- [Dynatrace RUM Setup](https://docs.dynatrace.com/docs/shortlink/rum-setup)
- [API Token Management](https://docs.dynatrace.com/docs/shortlink/api-tokens)

---

## ✅ Checklist للإنتاج

- [ ] إضافة API Token الفعلي
- [ ] تحديد Server URL الصحيح
- [ ] تفعيل Distributed Tracing
- [ ] إعداد Custom Tags للـ Application
- [ ] تفعيل Alert Rules في Dynatrace
- [ ] اختبار الـ Dashboard والـ Reports
- [ ] توثيق SLA والـ Response Time Targets

---

## 🎯 الخلاصة

✅ **تم تثبيت Dynatrace بنجاح!**

الآن تطبيقك يجمع:
- بيانات الأداء المتقدمة
- معلومات المستخدم النهائي
- تتبع الأخطاء التلقائي
- مراقبة قاعدة البيانات

**للمزيد من المساعدة:** اطلب مساعدة في ملف `.env` أو في ملف التكوين.

# ✅ إكمال إعداد قاعدة البيانات

# Database Setup Completion Guide

## 📊 الحالة الحالية - Current Status

### ✅ المكتمل - Completed

- [x] إنشاء Mongoose Schemas (5 models)
- [x] إنشاء نظام النسخ الاحتياطي التلقائي
- [x] توثيق شامل

### ⏳ الخطوات المتبقية - Remaining Steps

- [ ] **ربط قاعدة البيانات الفعلية** (5 دقائق)
- [ ] **استيراد البيانات الأولية** (10 دقائق)
- [ ] **اختبار الاتصال** (5 دقائق)

---

## 🚀 الخطوات التالية - Next Steps

### الخطوة 1: اختيار قاعدة البيانات (دقيقتان)

لديك خياران:

#### الخيار A: Hostinger Cloud (الموصى به)

```env
MONGODB_URI=mongodb://<username>:<password>@<hostinger-host>:27017/alawael-erp
```

**المميزات:**

- ✅ لديك استضافة جاهزة
- ✅ سريع وموثوق
- ✅ دعم فني

**الخطوات:**

1. تسجيل الدخول إلى Hostinger
2. انتقل إلى قسم Databases
3. أنشئ قاعدة MongoDB جديدة
4. احصل على رابط الاتصال

#### الخيار B: MongoDB Atlas (مجاني)

```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/alawael-erp?retryWrites=true&w=majority
```

**المميزات:**

- ✅ مجاني تماماً (512 MB)
- ✅ إعداد سريع (5 دقائق)
- ✅ عالمي ومستقر

**الخطوات:**

1. اذهب إلى mongodb.com/cloud/atlas
2. سجل حساب مجاني
3. أنشئ Cluster مجاني
4. احصل على رابط الاتصال

---

### الخطوة 2: تحديث الإعدادات (دقيقة واحدة)

افتح ملف `.env` في مجلد `backend`:

```env
# تغيير من In-Memory إلى MongoDB
USE_MOCK_DB=false

# إضافة رابط قاعدة البيانات (اختر واحداً)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/alawael-erp

# الإعدادات الأخرى (لا تغيرها)
NODE_ENV=development
PORT=3001
JWT_SECRET=your-secret-key-here
```

---

### الخطوة 3: تثبيت Mongoose (إذا لم يكن مثبتاً)

```bash
cd backend
npm install mongoose
```

---

### الخطوة 4: إنشاء script للبيانات الأولية

سأنشئ ملف `backend/scripts/seed.js`:

```javascript
// سيتم إنشاؤه تلقائياً في الخطوة التالية
```

---

### الخطوة 5: تشغيل النظام مع قاعدة البيانات

```bash
# في terminal جديد
cd backend
npm start

# يجب أن ترى:
# ✅ Connected to MongoDB: alawael-erp
# 🚀 Server is running on port 3001
```

---

## 🧪 اختبار النظام

### 1. اختبار الاتصال بقاعدة البيانات

```bash
# افتح browser واذهب إلى:
http://localhost:3001/api/organizations

# يجب أن ترى:
{
  "success": true,
  "data": [],
  "message": "Organizations retrieved"
}
```

### 2. اختبار إضافة بيانات

```bash
# استخدم Postman أو curl:
curl -X POST http://localhost:3001/api/organizations \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "ORG001",
    "name": "منظمة الأوائل",
    "chairman": {
      "name": "رئيس مجلس الإدارة",
      "title": "Chairman",
      "email": "chairman@alawael.com"
    }
  }'
```

### 3. اختبار بقاء البيانات

```bash
# 1. أضف بيانات (كما في الأعلى)
# 2. أوقف السيرفر (Ctrl+C)
# 3. شغل السيرفر مرة أخرى (npm start)
# 4. اطلب البيانات مرة أخرى:

curl http://localhost:3001/api/organizations

# يجب أن ترى البيانات موجودة! ✅
```

---

## 📦 نظام النسخ الاحتياطي

### إنشاء نسخة احتياطية يدوية

```bash
cd backend
node scripts/backup.js
```

### عرض جميع النسخ الاحتياطية

```bash
node scripts/backup.js list
```

### جدولة نسخ احتياطية يومية (Windows)

```powershell
# إنشاء task في Windows Task Scheduler
$action = New-ScheduledTaskAction -Execute "node" -Argument "C:\path\to\backend\scripts\backup.js"
$trigger = New-ScheduledTaskTrigger -Daily -At 3am
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "ERP Backup" -Description "Daily ERP database backup"
```

---

## 📊 البيانات المحفوظة - Data Structure

بعد الربط، سيتم حفظ:

### 1. المؤسسة (Organization)

- معلومات المؤسسة الأساسية
- 9 أقسام رئيسية
- 4 فروع
- مؤشرات الأداء (KPIs)
- المسارات الوظيفية
- برامج التدريب (200+ برنامج)

### 2. الموظفون (Employees)

- معلومات شخصية
- بيانات التوظيف
- الرواتب والبدلات
- تقييمات الأداء
- سجلات التدريب
- الحضور والغياب

### 3. تنبؤات الذكاء الاصطناعي (AI Predictions)

- تنبؤات الترقية
- تنبؤات دوران الموظفين
- تأثير التدريب
- توقعات الميزانية
- تقييمات الأداء

### 4. سجلات النظام (System Logs)

- جميع العمليات
- تسجيلات الدخول
- التغييرات في البيانات
- الأخطاء والتحذيرات

### 5. النسخ الاحتياطية (Backups)

- معلومات النسخ الاحتياطية
- التواريخ والأحجام
- الحالة والأخطاء

---

## 🔍 استكشاف الأخطاء - Troubleshooting

### مشكلة: لا يمكن الاتصال بقاعدة البيانات

```text
Error: connect ECONNREFUSED
```

**الحلول:**

1. تأكد من صحة `MONGODB_URI` في `.env`
2. تأكد من `USE_MOCK_DB=false`
3. تأكد من الاتصال بالإنترنت (إذا كنت تستخدم MongoDB Atlas)
4. تحقق من اسم المستخدم وكلمة المرور

### مشكلة: البيانات لا تُحفظ

```text
Data is lost after restart
```

**الحلول:**

1. تأكد من `USE_MOCK_DB=false` في `.env`
2. تأكد من إعادة تشغيل السيرفر بعد التغيير
3. تحقق من logs:

```bash
# يجب أن ترى
✅ Connected to MongoDB: alawael-erp
# وليس
⚠️ Using In-Memory Database
```

### مشكلة: Mongoose not found

```text
Error: Cannot find module 'mongoose'
```

**الحل:**

```bash
cd backend
npm install mongoose
npm start
```

---

## 📈 الأداء - Performance

### بعد ربط قاعدة البيانات:

| المقياس             | In-Memory            | MongoDB       |
| ------------------- | -------------------- | ------------- |
| سرعة القراءة        | ⚡⚡⚡⚡⚡ سريع جداً | ⚡⚡⚡⚡ سريع |
| سرعة الكتابة        | ⚡⚡⚡⚡⚡ سريع جداً | ⚡⚡⚡ جيد    |
| بقاء البيانات       | ❌ تُحذف             | ✅ دائم       |
| حجم البيانات        | محدود بالذاكرة       | غير محدود     |
| النسخ الاحتياطي     | ❌ غير ممكن          | ✅ تلقائي     |
| الاستعلامات المعقدة | ⚠️ محدود             | ✅ متقدم      |

---

## 🎯 الخطوة التالية بعد الإكمال

بعد إكمال إعداد قاعدة البيانات، سننتقل إلى:

### الأولوية 2: نظام النسخ الاحتياطي المجدول (2 ساعة)

- ✅ Script موجود بالفعل (`backend/scripts/backup.js`)
- ⏳ إعداد الجدولة التلقائية
- ⏳ اختبار الاسترجاع (Restore)

### الأولوية 3: الدومين والـ SSL (ساعة واحدة)

- إعداد الدومين
- تثبيت SSL certificate
- ربط النظام

### الأولوية 4: الأمان المتقدم (1-2 يوم)

- 2FA authentication
- تشفير البيانات الحساسة
- تعزيز الأذونات

---

## 📞 الدعم - Support

إذا واجهت أي مشكلة:

1. **راجع الـ logs:**

```bash
cd backend
npm start
# اقرأ الرسائل بعناية
```

2. **تحقق من الإعدادات:**

```bash
cat backend/.env
# يجب أن يكون USE_MOCK_DB=false
```

3. **اختبر الاتصال:**

```bash
# افتح MongoDB Compass أو Mongo Shell
mongo "your-mongodb-uri"
```

---

## ✅ Checklist للتأكد من الإكمال

قبل الانتقال للخطوة التالية، تأكد من:

- [ ] `USE_MOCK_DB=false` في `.env`
- [ ] `MONGODB_URI` محدث برابط صحيح
- [ ] السيرفر يعمل بدون أخطاء
- [ ] البيانات تُحفظ بعد إعادة التشغيل
- [ ] النسخ الاحتياطي يعمل (`node scripts/backup.js`)
- [ ] جميع الـ 18 AI endpoints تعمل

---

## 🎉 الخلاصة

**الوقت المتوقع:** 20 دقيقة إجمالاً

- 2 دقيقة: اختيار قاعدة البيانات
- 5 دقائق: إعداد MongoDB
- 1 دقيقة: تحديث `.env`
- 2 دقيقة: تثبيت Mongoose
- 5 دقائق: تشغيل واختبار
- 5 دقائق: اختبار النسخ الاحتياطي

**بعد الإكمال:**

- ✅ البيانات محفوظة بشكل دائم
- ✅ نسخ احتياطية تلقائية
- ✅ جاهز للإنتاج (من ناحية قاعدة البيانات)

---

**📅 آخر تحديث:** 13 يناير 2026
**👨‍💻 الحالة:** جاهز للتنفيذ

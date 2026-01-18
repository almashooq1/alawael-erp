# 💾 MongoDB Atlas Setup - إعداد قاعدة البيانات

**خطوة بخطوة مع صور توضيحية**

---

## ⏱️ الوقت: 10 دقائق فقط

---

## 📍 الخطوة 1: التسجيل (2 دقيقة)

### افتح في Browser:

```
https://www.mongodb.com/cloud/atlas/register
```

### في الصفحة:

1. اختر **Sign up with Google** (الأسهل)
   - أو استخدم Email
2. أكمل التسجيل
3. اختر FREE tier
4. اضغط **Create**

✅ **تم!** اذهب للخطوة التالية

---

## 📍 الخطوة 2: إنشاء Cluster (2 دقيقة)

### بعد التسجيل:

1. اضغط **Create a Deployment**
2. اختر **M0 Sandbox** (FREE - مجاني)
3. **Provider:** AWS
4. **Region:**
   - بحث: اكتب `frankfurt` أو `eu-central-1`
   - اختر: **Europe (Frankfurt) eu-central-1**
5. **Cluster Name:**
   - اكتب: `alawael-erp`
6. اضغط **Create Deployment**

⏳ **انتظر 2-3 دقائق** حتى يصبح الـ cluster جاهزاً

✅ **عندما ترى✓ (green checkmark)، انتقل للخطوة التالية**

---

## 📍 الخطوة 3: إنشاء مستخدم (1 دقيقة)

### في صفحة Cluster:

1. اضغط على الـ Cluster الذي أنشأته (`alawael-erp`)
2. اذهب إلى: **Database Access** (في القائمة اليسرى)
3. اضغط: **Add New Database User**

### ملء البيانات:

```
Username:   alawael_admin
Password:   Admin@2026
```

### Privileges:

- اختر: **Atlas Admin** (لتسهيل الأمور)

### اضغط: **Add User**

✅ **تم!** الآن لديك مستخدم

---

## 📍 الخطوة 4: السماح بالاتصال (1 دقيقة)

### من نفس الصفحة:

1. اذهب إلى: **Network Access** (في القائمة اليسرى)
2. اضغط: **Add IP Address**
3. اختر: **Allow Access from Anywhere**
4. IP سيكون: `0.0.0.0/0`
5. اضغط: **Confirm**

⚠️ **ملاحظة:** هذا يسمح من أي مكان (آمن للتطوير)

✅ **تم!** الآن يمكن الاتصال من أي مكان

---

## 📍 الخطوة 5: الحصول على Connection String (2 دقيقة)

### من Dashboard:

1. اذهب إلى: **Databases** (في القائمة اليسرى)
2. اضغط على الـ Cluster: **alawael-erp**
3. اضغط: **Connect**
4. اختر: **Connect your application**
5. **Driver:** اختر **Node.js**
6. **Version:** اختر **5.5 or later**

### النافذة ستظهر بـ Connection String:

```
mongodb+srv://alawael_admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

### الخطوات:

1. **استبدل `<password>` بـ `Admin@2026`**
2. **استبدل `/?` بـ `/alawael-erp?`** (اسم قاعدة البيانات)

### النتيجة النهائية:

```
mongodb+srv://alawael_admin:Admin@2026@cluster0.xxxxx.mongodb.net/alawael-erp?retryWrites=true&w=majority
```

**⚠️ لا تغير `xxxxx` - اتركها كما هي!**

✅ **نسخ الرابط الكامل**

---

## 📍 الخطوة 6: تحديث النظام (1 دقيقة)

### افتح Terminal:

```powershell
cd backend
notepad .env
```

### ابحث عن هذا السطر:

```env
MONGODB_URI=mongodb://localhost:27017/alawael-erp
```

### استبدله بـ الرابط من MongoDB:

```env
MONGODB_URI=mongodb+srv://alawael_admin:Admin@2026@cluster0.xxxxx.mongodb.net/alawael-erp?retryWrites=true&w=majority
```

### تأكد من:

```env
USE_MOCK_DB=false
```

### احفظ: `Ctrl+S`

### أغلق: `Ctrl+Q` أو `Alt+F4`

✅ **تم!** الملف محدث

---

## 📍 الخطوة 7: استيراد البيانات (1 دقيقة)

### في Terminal:

```powershell
cd backend
node scripts\seed.js
```

### يجب أن ترى:

```
🔌 Connecting to MongoDB...
✅ Connected to MongoDB
🧹 Clearing existing data...
🏢 Inserting organization data...
   ✅ Organization created: منظمة الأوائل لتأهيل ذوي الإعاقة
👥 Inserting employee data...
   ✅ أحمد المحمد (مدير عام المنظمة)
   ✅ فاطمة العلي (أخصائي تأهيل طبي)
   ✅ خالد السعيد (مدير موارد بشرية)

✅ Data seeding completed successfully!
📁 Backup ID: backup_20260117_143025
```

**إذا رأيت ✅ في كل مكان = نجح!** 🎉

---

## 📍 الخطوة 8: التشغيل (النهاية!)

### في Terminal:

```powershell
cd backend
npm start
```

### يجب أن ترى:

```
✅ Connected to MongoDB: alawael-erp
🚀 Server is running on port 3001
```

**وليس:**

```
⚠️ Using In-Memory Database
```

✅ **إذا رأيت Connected to MongoDB = نجحت!** 🎉

---

## 🧪 اختبار سريع

### في PowerShell جديد:

```powershell
Invoke-RestMethod http://localhost:3001/api/organizations | ConvertTo-Json | head -50
```

### يجب أن ترى:

```json
{
  "success": true,
  "data": [
    {
      "organizationId": "ORG001",
      "name": "منظمة الأوائل لتأهيل ذوي الإعاقة",
      ...
    }
  ]
}
```

✅ **البيانات موجودة!** المتابعة للخطوة التالية

---

## 🎉 تهانينا! قاعدة البيانات جاهزة

```
✅ MongoDB Atlas متصل
✅ البيانات محفوظة
✅ API تعمل
✅ مستعد للتشغيل الكامل!
```

---

## 🚀 الآن: شغل Frontend + Backend

### Terminal 1 (Backend):

```powershell
cd backend
npm start
```

### Terminal 2 (Frontend):

```powershell
cd frontend
npm start
```

### في Browser:

```
Frontend: http://localhost:3002
Backend API: http://localhost:3001
```

---

## 🔄 التحقق من البقاء

### اختبار أن البيانات دائمة:

1. **أوقف السيرفر:**

   ```powershell
   # اضغط Ctrl+C في terminal Backend
   ```

2. **شغله مرة أخرى:**

   ```powershell
   npm start
   ```

3. **اطلب البيانات:**
   ```powershell
   Invoke-RestMethod http://localhost:3001/api/employees
   ```

**إذا رأيت الموظفين = البيانات دائمة!** ✅

---

## 🆘 المشاكل والحلول

### ❌ "MongoServerError: bad auth"

**السبب:** كلمة المرور خاطئة في MONGODB_URI

**الحل:**

1. افتح .env
2. تأكد من: `Admin@2026` صحيحة
3. إذا غيرت الرابط، تأكد من النسخ الصحيح

---

### ❌ "ECONNREFUSED"

**السبب:** IP address غير مسموح

**الحل:**

1. اذهب إلى MongoDB Atlas
2. Network Access → Add IP Address
3. اختر: `0.0.0.0/0`

---

### ❌ "seed.js failed"

**السبب:** MongoDB غير متصل

**الحل:**

```powershell
# جرب الاتصال:
node -e "const mongoose = require('mongoose'); mongoose.connect('mongodb+srv://alawael_admin:Admin@2026@cluster0.xxxxx.mongodb.net/alawael-erp?retryWrites=true&w=majority').then(() => console.log('✅ Connected!')).catch(e => console.error('❌', e.message))"
```

---

### ❌ البيانات لا تظهر

**الحل:**

```powershell
# تأكد من USE_MOCK_DB=false
cat .env | Select-String "USE_MOCK_DB"

# أعد استيراد البيانات
node scripts\seed.js
```

---

## 📋 Checklist

- [ ] تسجيل في MongoDB Atlas
- [ ] إنشاء Cluster (M0 Sandbox)
- [ ] إنشاء مستخدم (alawael_admin)
- [ ] إضافة IP (0.0.0.0/0)
- [ ] الحصول على Connection String
- [ ] تحديث .env بـ URI
- [ ] تأكد من USE_MOCK_DB=false
- [ ] تشغيل: node scripts\seed.js
- [ ] تشغيل: npm start
- [ ] اختبر: Invoke-RestMethod http://localhost:3001/api/organizations
- [ ] شغل Frontend: npm start
- [ ] الدخول إلى: http://localhost:3002

---

## ⏱️ الخطوة التالية

بعد إكمال هذا الإعداد:

### Priority 2: جدولة النسخ (30 دقيقة)

```powershell
$action = New-ScheduledTaskAction -Execute "node" -Argument "$PWD\scripts\backup.js" -WorkingDirectory "$PWD"
$trigger = New-ScheduledTaskTrigger -Daily -At 3am
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "ERP Backup" -Description "Daily backup"
```

### Priority 3: Domain + SSL (اختياري الآن)

### Priority 4: Testing (اختياري الآن)

### Priority 5: Production (عندما تكون جاهزاً)

---

## 🎯 Quick Reference

```powershell
# اختبار الاتصال
Invoke-RestMethod http://localhost:3001/api/organizations

# استيراد البيانات
node scripts\seed.js

# تشغيل Backend
npm start

# تشغيل Frontend
cd frontend; npm start

# نسخة احتياطية
node scripts\backup.js

# عرض النسخ
node scripts\backup.js list
```

---

**📅 Created:** 17 يناير 2026  
**⏱️ Duration:** 10 دقائق  
**🎯 Result:** قاعدة بيانات دائمة عاملة!

---

## 🚀 ابدأ الآن!

**اتبع الخطوات 1-8 أعلاه** ✨

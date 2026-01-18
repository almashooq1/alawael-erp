# 🚀 إعداد سريع لقاعدة البيانات - Quick Database Setup

**الوقت: 5-10 دقائق**

---

## ✅ الخطوة 1: افتح MongoDB Atlas

**الرابط:** https://www.mongodb.com/cloud/atlas/register

1. سجل بـ Google أو Email
2. اختر: **Create a FREE cluster**

---

## ✅ الخطوة 2: إعداد Cluster

1. **Plan:** M0 Sandbox (FREE) ✅
2. **Provider:** AWS
3. **Region:** eu-central-1 (Frankfurt)
4. **Cluster Name:** alawael-erp
5. اضغط **Create**

⏳ انتظر 2-3 دقائق حتى يصبح Cluster جاهزاً

---

## ✅ الخطوة 3: إنشاء مستخدم

1. اذهب إلى: **Database Access** (القائمة اليسرى)
2. اضغط **Add New Database User**
3. **Username:** `alawael_admin`
4. **Password:** اختر كلمة مرور قوية (مثلاً: `Admin@2026`)
5. **Database User Privileges:** Atlas admin
6. اضغط **Add User**

---

## ✅ الخطوة 4: السماح بالاتصال

1. اذهب إلى: **Network Access** (القائمة اليسرى)
2. اضغط **Add IP Address**
3. اختر: **Allow Access from Anywhere**
4. IP: `0.0.0.0/0`
5. اضغط **Confirm**

---

## ✅ الخطوة 5: الحصول على Connection String

1. اذهب إلى: **Databases** (القائمة اليسرى)
2. اضغط **Connect** (على cluster الخاص بك)
3. اختر: **Connect your application**
4. **Driver:** Node.js
5. **Version:** 5.5 or later
6. انسخ الرابط (يبدو مثل):

```
mongodb+srv://alawael_admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

7. **استبدل `<password>` بكلمة المرور الحقيقية**
8. **أضف اسم Database بعد `.net/`** → `/alawael-erp?`

**مثال النتيجة النهائية:**

```
mongodb+srv://alawael_admin:Admin@2026@cluster0.abc12.mongodb.net/alawael-erp?retryWrites=true&w=majority
```

---

## ✅ الخطوة 6: تحديث ملف .env

افتح ملف: `backend\.env`

**غير هذين السطرين:**

### قبل:

```env
MONGODB_URI=mongodb://localhost:27017/alawael-erp
USE_MOCK_DB=true
```

### بعد:

```env
MONGODB_URI=mongodb+srv://alawael_admin:Admin@2026@cluster0.abc12.mongodb.net/alawael-erp?retryWrites=true&w=majority
USE_MOCK_DB=false
```

**⚠️ مهم:** استخدم الرابط الخاص بك، ليس المثال!

---

## ✅ الخطوة 7: استيراد البيانات

افتح PowerShell في مجلد `backend`:

```powershell
cd backend
node scripts\seed.js
```

**المتوقع:**

```
✅ Connected to MongoDB
🧹 Clearing existing data...
🏢 Inserting organization data...
👥 Inserting employee data...
✅ Data seeding completed successfully!
```

---

## ✅ الخطوة 8: تشغيل السيرفر

```powershell
npm start
```

**يجب أن ترى:**

```
✅ Connected to MongoDB: alawael-erp
🚀 Server is running on port 3001
```

**وليس:**

```
⚠️ Using In-Memory Database
```

---

## ✅ الخطوة 9: اختبار

في PowerShell جديد:

```powershell
# اختبار البيانات
Invoke-RestMethod http://localhost:3001/api/organizations | ConvertTo-Json

# يجب أن ترى بيانات المؤسسة!
```

---

## ✅ الخطوة 10: اختبار البقاء

```powershell
# 1. أوقف السيرفر (Ctrl+C في terminal السيرفر)

# 2. شغله مرة أخرى
npm start

# 3. اطلب البيانات مرة أخرى
Invoke-RestMethod http://localhost:3001/api/employees | ConvertTo-Json

# ✅ إذا رأيت البيانات، نجحت! البيانات دائمة الآن!
```

---

## 🎉 تهانينا! قاعدة البيانات جاهزة

```
✅ MongoDB Atlas متصل
✅ البيانات محفوظة بشكل دائم
✅ لا مزيد من In-Memory
✅ جاهز للخطوة التالية
```

---

## 🔜 الخطوة التالية

**Priority 2: جدولة النسخ الاحتياطية** (30 دقيقة)

```powershell
node scripts\backup.js
```

---

## ❓ إذا واجهت مشكلة

### مشكلة: `MongoServerError: bad auth`

**الحل:** تأكد من كلمة المرور صحيحة في MONGODB_URI

### مشكلة: `ECONNREFUSED`

**الحل:** تأكد من إضافة IP Address في Network Access

### مشكلة: البيانات لا تظهر

**الحل:**

1. تأكد من `USE_MOCK_DB=false`
2. شغل `node scripts\seed.js`

---

**📅 آخر تحديث:** 17 يناير 2026  
**⏱️ الوقت:** 5-10 دقائق  
**🎯 الحالة:** جاهز للتنفيذ

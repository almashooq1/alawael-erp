# 🗄️ MongoDB Atlas Connection Guide

**تاريخ:** 16 يناير 2026

---

## 📋 خطوات الربط

### الخطوة 1️⃣: إنشاء حساب MongoDB Atlas

1. اذهب إلى [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. اضغط على **"Try Free"**
3. أنشئ حسابك باستخدام:
   - البريد الإلكتروني
   - كلمة المرور
   - الموافقة على الشروط

---

### الخطوة 2️⃣: إنشاء مشروع

1. بعد تسجيل الدخول، اضغط **"Create a Project"**
2. أدخل اسم المشروع: `CRM-ERP-System`
3. اختر **"Next"**
4. أضف أعضاء (اختياري)
5. اضغط **"Create Project"**

---

### الخطوة 3️⃣: إنشاء Cluster

1. في لوحة التحكم، اضغط **"Create Cluster"**
2. اختر **"Shared"** (مجاني)
3. اختر:
   - **Cloud Provider**: AWS
   - **Region**: Middle East (Bahrain) `ap-south-1a`
   - **Cluster Tier**: M0 (مجاني)
4. اسم Cluster: `crm-erp-cluster`
5. اضغط **"Create Deployment"**

---

### الخطوة 4️⃣: إنشاء Database User

1. انتظر إنشاء الـ Cluster (5-10 دقائق)
2. في القائمة الجانبية، اختر **"Database Access"**
3. اضغط **"Add New Database User"**
4. أختر **"Password"**
5. أدخل:
   - **Username**: `crm_admin`
   - **Password**: `SecurePassword123!`
6. اختر **"Built-in Role"**: `Atlas admin`
7. اضغط **"Add User"**

---

### الخطوة 5️⃣: تكوين Network Access

1. اختر **"Network Access"** من القائمة الجانبية
2. اضغط **"Add IP Address"**
3. اختر **"Allow Access from Anywhere"** (للتطوير فقط)
   - IP Address: `0.0.0.0/0`
4. اضغط **"Confirm"**

---

### الخطوة 6️⃣: الحصول على Connection String

1. اذهب إلى **"Clusters"**
2. اضغط زر **"Connect"** بجانب اسم Cluster
3. اختر **"Drivers"**
4. اختر:
   - **Driver**: Node.js
   - **Version**: 4.1 or later
5. انسخ Connection String:

```
mongodb+srv://crm_admin:SecurePassword123!@crm-erp-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority&appName=CRM-ERP
```

---

## 🔧 تكوين المشروع

### الخطوة 7️⃣: تحديث .env

أنشئ أو عدّل ملف `.env` في مجلد `backend`:

```env
# ===== MongoDB Atlas Connection =====
MONGODB_URI=mongodb+srv://crm_admin:SecurePassword123!@crm-erp-cluster.xxxxx.mongodb.net/crm_erp_db?retryWrites=true&w=majority&appName=CRM-ERP
MONGODB_NAME=crm_erp_db
USE_MOCK_DB=false

# ===== Server Configuration =====
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# ===== JWT Secret =====
JWT_SECRET=your_secret_key_here_12345

# ===== Email Service (Gmail) =====
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password_here
EMAIL_SERVICE=gmail
EMAIL_FROM=noreply@example.com

# ===== SMS Service (Twilio) =====
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890

# ===== Database Backup =====
BACKUP_ENABLED=true
BACKUP_INTERVAL=86400
```

---

### الخطوة 8️⃣: تثبيت MongoDB Driver

```bash
cd backend
npm install mongodb
npm install mongoose  # لـ ODM (اختياري لكن موصى به)
```

---

### الخطوة 9️⃣: اختبار الاتصال

أنشئ ملف `test-mongodb.js`:

```javascript
const mongoose = require('mongoose');

const testConnection = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Atlas Connection Successful!');
    console.log('Database:', process.env.MONGODB_NAME);

    // إنشاء collection تجريبية
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log(
      '📦 Collections:',
      collections.map(c => c.name),
    );

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Connection Error:', error.message);
  }
};

testConnection();
```

تشغيل الاختبار:

```bash
node test-mongodb.js
```

---

## 📊 Mongoose Schema Examples

### Example 1: User Model

```javascript
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  fullName: String,
  role: {
    type: String,
    enum: ['admin', 'manager', 'employee', 'user'],
    default: 'user',
  },
  department: String,
  phone: String,
  profileImage: String,
  isActive: {
    type: Boolean,
    default: true,
  },
  lastLogin: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for faster queries
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });

module.exports = mongoose.model('User', userSchema);
```

### Example 2: Employee Model

```javascript
const employeeSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  phone: String,
  department: {
    type: String,
    required: true,
  },
  position: {
    type: String,
    required: true,
  },
  salary: Number,
  hireDate: Date,
  status: {
    type: String,
    enum: ['active', 'inactive', 'on-leave'],
    default: 'active',
  },
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Employee', employeeSchema);
```

---

## 🔍 MongoDB Atlas Features

### 1. **Charts** (مخططات بيانية)

- إنشاء لوحات بيانية مرئية
- تحليل البيانات في الوقت الفعلي

### 2. **Backup & Restore**

- نسخ احتياطية يومية تلقائية
- استعادة البيانات من أي نقطة زمنية

### 3. **Performance Advisor**

- توصيات لتحسين الأداء
- تحليل الاستعلامات

### 4. **Monitoring**

- مراقبة الأداء الفعلي
- إنذارات عند تجاوز الحدود

---

## 🔐 أفضل الممارسات

### 1. **استخدم Indexes**

```javascript
// على الحقول التي تبحث عنها كثيراً
userSchema.index({ email: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ department: 1, status: 1 });
```

### 2. **استخدم Pagination**

```javascript
const page = req.query.page || 1;
const limit = req.query.limit || 10;
const skip = (page - 1) * limit;

const users = await User.find().skip(skip).limit(limit);
```

### 3. **استخدم Connection Pooling**

```javascript
const mongoose = require('mongoose');

mongoose.connect(MONGODB_URI, {
  maxPoolSize: 10, // عدد الاتصالات القصوى
  minPoolSize: 5, // الحد الأدنى
});
```

### 4. **استخدم Transactions**

```javascript
const session = await mongoose.startSession();
session.startTransaction();

try {
  await User.updateOne({ _id: userId }, { balance: -100 }, { session });
  await Invoice.create([{ userId, amount: 100 }], { session });
  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
}
```

---

## 🚨 استكشاف الأخطاء

### خطأ: "connect ENOTFOUND"

```
❌ الحل: تحقق من IP Address في Network Access
```

### خطأ: "authentication failed"

```
❌ الحل: تحقق من اسم المستخدم وكلمة المرور بشكل صحيح
```

### خطأ: "Exceeded 10000 connections"

```
❌ الحل: تحقق من إغلاق الاتصالات بشكل صحيح
```

---

## 📈 مراقبة الاستخدام

1. اذهب إلى **"Metrics"**
2. مراقبة:
   - عدد العمليات (Ops/sec)
   - استخدام الذاكرة
   - حجم التخزين
   - الاتصالات النشطة

---

## 🎯 الخطوات التالية

بعد الربط الناجح:

1. ✅ استبدال جميع Mock Database بـ MongoDB
2. ✅ تشغيل Seeders لإدخال البيانات الأولية
3. ✅ اختبار جميع API endpoints
4. ✅ تفعيل النسخ الاحتياطية
5. ✅ إضافة مراقبة الأداء

---

## 📚 مراجع مفيدة

- [MongoDB Atlas Docs](https://docs.atlas.mongodb.com/)
- [Mongoose Docs](https://mongoosejs.com/)
- [MongoDB Best Practices](https://docs.mongodb.com/manual/core/bulk-write-operations/)

---

**تاريخ التحديث:** 16 يناير 2026  
**الحالة:** ✅ جاهز للاستخدام

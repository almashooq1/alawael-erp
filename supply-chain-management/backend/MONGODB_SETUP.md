# 🗄️ MongoDB Integration Guide

## ✅ ما تم إنجازه

### 1️⃣ تحويل جميع النماذج من ES6 إلى CommonJS

تم تحويل 10 ملفات نموذج لاستخدام `require()` و `module.exports`:

- ✅ Supplier.js
- ✅ Product.js
- ✅ Order.js
- ✅ Inventory.js
- ✅ Shipment.js
- ✅ AuditLog.js
- ✅ User.js
- ✅ BarcodeLog.js
- ✅ ChangeLog.js
- ✅ EnhancedModels.js

### 2️⃣ إنشاء server-mongodb.js

خادم جديد مع دعم كامل لـ MongoDB يتضمن:

- ✅ اتصال Mongoose مع معالجة الأخطاء
- ✅ دوال البذر (Seeding) لملء قاعدة البيانات بالبيانات الأولية
- ✅ جميع CRUD endpoints محدثة لاستخدام Mongoose
- ✅ دعم الفشل الناعم (Fallback إلى بيانات في الذاكرة إذا فشل الاتصال)
- ✅ جميع endpoints الباركود والـ Dashboard محدثة
- ✅ معالجة الأخطاء والتحقق من الصحة

## 🚀 كيفية البدء

### الخيار 1️⃣: استخدام In-Memory Data (الحالي)

```bash
# ما زال server.js يعمل مع البيانات في الذاكرة
npm start  # أو node server.js
```

- ✅ **المميزات**: لا يتطلب قاعدة بيانات، سهل للتطوير السريع
- ⚠️ **العيوب**: البيانات تُفقد عند إعادة تشغيل الخادم، لا توجد استمرارية

### الخيار 2️⃣: الترقية إلى MongoDB (موصى به)

#### خطوة 1: تثبيت MongoDB

**على Windows:**

```bash
# استخدام Chocolatey
choco install mongodb-community

# أو تحميل من: https://www.mongodb.com/try/download/community
```

**على macOS:**

```bash
brew tap mongodb/brew
brew install mongodb-community
```

**أو استخدام Docker:**

```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

#### خطوة 2: بدء خدمة MongoDB

```bash
# على Windows
net start MongoDB

# على macOS
brew services start mongodb-community

# أو إذا كنت تستخدم Docker
docker start mongodb
```

#### خطوة 3: تحديث .env

```bash
# تأكد من أن ملف .env يحتوي على:
MONGODB_URI=mongodb://localhost:27017/supply-chain
PORT=3001
```

#### خطوة 4: استخدام server-mongodb.js

```bash
# استبدل سطر البدء في package.json:
# من:
"start": "node server.js"

# إلى:
"start": "node server-mongodb.js"

# أو قم بتشغيله مباشرة:
npm NODE_ENV=development node server-mongodb.js
```

#### خطوة 5: التحقق من الاتصال

```bash
# افتح المتصفح
http://localhost:3001/health

# يجب أن تحصل على استجابة مشابهة لـ:
{
  "status": "ok",
  "message": "Server is running",
  "database": "connected"
}
```

## 📊 استخدام MongoDB Atlas (Service Cloud)

### خطوات الإعداد:

1. **إنشاء حساب على MongoDB Atlas:**

   - اذهب إلى: https://www.mongodb.com/cloud/atlas
   - اضغط "Sign Up"
   - أنشئ حسابك

2. **إنشاء Cluster:**

   - في لوحة التحكم، اضغط "Create Cluster"
   - اختر الخطة المجانية
   - اختر منطقة قريبة منك

3. **الحصول على Connection String:**

   - اذهب إلى "Database" > "Connect"
   - اختر "Connect your application"
   - انسخ Connection String
   - استبدل `<username>` و `<password>` بأسرارك

4. **تحديث .env:**

```bash
# بدلاً من:
MONGODB_URI=mongodb://localhost:27017/supply-chain

# استخدم:
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/supply-chain?retryWrites=true&w=majority
```

5. **قم بتشغيل الخادم:**

```bash
npm run dev
# أو
node server-mongodb.js
```

## 🧪 اختبار Endpoints

بعد تشغيل الخادم مع MongoDB:

```bash
# 1. التحقق من صحة الاتصال
curl http://localhost:3001/health

# 2. الحصول على الموردين
curl http://localhost:3001/api/suppliers

# 3. إنشاء مورد جديد
curl -X POST http://localhost:3001/api/suppliers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "مورد جديد",
    "email": "supplier@example.com",
    "phone": "966501234567",
    "address": "الرياض",
    "rating": 5
  }'

# 4. الحصول على إحصائيات الـ Dashboard
curl http://localhost:3001/api/dashboard/advanced-reports
```

## 🔄 هيكل قاعدة البيانات

### المجموعات (Collections):

```
supply-chain/
├── suppliers
├── products
├── orders
├── inventory
├── shipments
├── users
├── auditlogs
├── barcode_logs
└── changelogs
```

### مثال على وثيقة Supplier:

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "الشركة الأولى",
  "email": "supplier@example.com",
  "phone": "966501234567",
  "address": "الرياض",
  "rating": 4.8,
  "status": "active",
  "createdAt": "2026-02-09T10:30:00Z",
  "updatedAt": "2026-02-09T10:30:00Z"
}
```

## 📈 الفوائد

✅ **استمرارية البيانات**: لا تُفقد البيانات عند إعادة تشغيل الخادم ✅ **أداء
أفضل**: استعلامات محسّنة مع الفهارس ✅ **توسع**: يمكن التعامل مع كميات كبيرة من
البيانات ✅ **أمان**: تشفير البيانات والتحكم في الوصول ✅ **مرونة**: شكل
البيانات قابل للتطور والتوسع

## 🐛 استكشاف الأخطاء

### المشكلة: "MongoDB connection refused"

```bash
# تحقق من أن MongoDB يعمل:
# Windows: net start MongoDB
# macOS: brew services list
# Docker: docker ps
```

### المشكلة: "Invalid MongoDB URI"

```bash
# تأكد من صيغ من .env:
MONGODB_URI=mongodb://localhost:27017/supply-chain
```

### المشكلة: "Model not found in database"

```bash
# الخادم سيقوم بـ Seed (ملء) قاعدة البيانات تلقائياً
# إذا لم يحدث ذلك، قم بهذا يدويًا
```

## ⏭️ الخطوات التالية

1. **Advanced Features** (البحث والتصفية والتصدير)
2. **اختبار شامل** (Unit Tests و Integration Tests)
3. **النشر على الإنتاج** (Deployment)
4. **المراقبة والتسجيل** (Monitoring & Logging)

---

**ملاحظة**: الخادم `server-mongodb.js` يحسم البيانات تلقائياً في المرة الأولى
فقط، لذا لا تقلق من البيانات المكررة.

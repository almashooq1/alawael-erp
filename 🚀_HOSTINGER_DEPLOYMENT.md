# 🚀 نشر النظام على Hostinger Cloud

## ✨ ممتاز! لديك Hostinger Cloud

**Hostinger Cloud** يوفر:
✅ استضافة سحابية قوية
✅ قواعد بيانات (MySQL, PostgreSQL, MongoDB)
✅ دعم Node.js والتطبيقات المتقدمة
✅ أداء عالي وموثوقية

---

## 🎯 الخطوات السريعة

### الخطوة 1️⃣: تحديد نوع قاعدة البيانات

#### الخيار أ: MongoDB في Hostinger

```
إذا كان Hostinger يوفر MongoDB:
1. اذهب إلى لوحة التحكم
2. ابحث عن: Databases أو MongoDB
3. أنشئ قاعدة بيانات جديدة
4. احصل على رابط الاتصال
5. ضعه في backend/.env
```

#### الخيار ب: MySQL في Hostinger

```
إذا كنت تفضل MySQL:
1. اذهب إلى لوحة التحكم
2. ابحث عن: Databases أو MySQL
3. أنشئ قاعدة بيانات جديدة
4. احصل على بيانات الاتصال
5. حدّث الكود ليدعم MySQL
```

---

## 📋 الخطوات التفصيلية

### أولاً: تحديد نوع قاعدة البيانات المتاحة

#### في لوحة تحكم Hostinger:

```
1. ادخل إلى: hPanel (لوحة التحكم)
2. ابحث عن: Databases أو Cloud Databases
3. شاهد الخيارات المتاحة:
   - MongoDB
   - MySQL
   - PostgreSQL
```

---

### الخيار 1: استخدام MongoDB على Hostinger

#### خطوة 1: إنشاء قاعدة بيانات

```
1. في hPanel → Databases
2. اضغط Create Database
3. اختر MongoDB
4. سمّها: alawael-erp
5. اضغط Create
```

#### خطوة 2: احصل على الرابط

```
بعد الإنشاء، سترى:
- Host: mongo.hostinger.cloud
- Port: 27017
- Username: admin
- Password: ***
- Database: alawael-erp

رابط الاتصال:
mongodb://admin:PASSWORD@mongo.hostinger.cloud:27017/alawael-erp
```

#### خطوة 3: تحديث ملف .env

```env
# backend/.env
USE_MOCK_DB=false
MONGODB_URI=mongodb://admin:PASSWORD@mongo.hostinger.cloud:27017/alawael-erp
NODE_ENV=production
```

---

### الخيار 2: استخدام MySQL على Hostinger

#### خطوة 1: إنشاء قاعدة بيانات

```
1. في hPanel → Databases
2. اضغط Create Database
3. اختر MySQL
4. سمّها: alawael_erp
5. اضغط Create
```

#### خطوة 2: احصل على بيانات الاتصال

```
بعد الإنشاء، سترى:
- Host: db.hostinger.cloud
- Username: db_user
- Password: ***
- Database: alawael_erp
```

#### خطوة 3: تثبيت مكتبات MySQL

```bash
cd backend
npm install mysql2 sequelize dotenv
```

#### خطوة 4: تحديث ملف .env

```env
# backend/.env
DATABASE_TYPE=mysql
DB_HOST=db.hostinger.cloud
DB_PORT=3306
DB_USER=db_user
DB_PASSWORD=PASSWORD
DB_NAME=alawael_erp
DB_DIALECT=mysql
NODE_ENV=production
```

---

## 🔧 نشر التطبيق على Hostinger

### الخطوة 1: تحضير الملفات

```bash
# 1. تأكد من وجود package.json صحيح
cd backend
npm install

# 2. تأكد من وجود .env صحيح
cat .env

# 3. بناء التطبيق
npm run build  # إن وجد
```

### الخطوة 2: النشر على Hostinger

#### الخيار أ: استخدام Git

```bash
# 1. في Hostinger hPanel:
#    - ابحث عن Git / Deployment
#    - اختر Deploy from Git

# 2. على جهازك:
git init
git add .
git commit -m "Initial deploy"
git remote add hostinger <rابط-hostinger>
git push hostinger main
```

#### الخيار ب: رفع الملفات مباشرة

```bash
# 1. اضغط Files في Hostinger
# 2. ارفع مجلد backend بالكامل
# 3. عيّن ملف البداية: server.js
# 4. اضغط Deploy
```

#### الخيار ج: استخدام FTP

```bash
# استخدم FileZilla أو أي برنامج FTP
# البيانات من Hostinger hPanel:
# - Host: ftp.hostinger.com
# - Username: ***
# - Password: ***
# ارفع المجلدات والملفات
```

---

## ⚙️ إعدادات النشر

### ملف production .env

```env
# أمان
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://yourdomain.com

# قاعدة البيانات
USE_MOCK_DB=false
MONGODB_URI=mongodb://admin:PASSWORD@mongo.hostinger.cloud:27017/alawael-erp

# أو MySQL:
DATABASE_TYPE=mysql
DB_HOST=db.hostinger.cloud
DB_USER=db_user
DB_PASSWORD=PASSWORD
DB_NAME=alawael_erp

# JWT أمان
JWT_SECRET=your-secure-secret-key-change-this
JWT_EXPIRY=7d

# تفعيل/تعطيل الخدمات
ENABLE_NATS=false
ENABLE_ELK=false
API_LIMIT_WINDOW_MS=900000
API_LIMIT_MAX_REQUESTS=100
```

---

## 🌐 ربط الدومين

### في Hostinger hPanel:

```
1. اذهب إلى: Domains
2. اختر دومينك
3. وجّه إلى: Hostinger Nameservers
4. انتظر (24 ساعة)
```

### تحديث رابط الفرونت إند

```
في frontend/.env:
REACT_APP_API_URL=https://yourdomain.com/api
```

---

## ✅ التحقق من النشر

### تحقق من الخادم

```bash
curl https://yourdomain.com/api/organization/structure
```

### تحقق من قاعدة البيانات

```bash
# في Hostinger hPanel
# Databases → select database
# شاهد البيانات المحفوظة
```

---

## 🚨 مشاكل شائعة وحلولها

### ❌ خطأ: "Cannot connect to database"

```
✓ تحقق من رابط الاتصال
✓ تأكد من فتح Network Access
✓ تحقق من اسم المستخدم وكلمة المرور
```

### ❌ خطأ: "CORS error"

```
في backend/server.js:
const corsOptions = {
  origin: 'https://yourdomain.com',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));
```

### ❌ خطأ: "Port already in use"

```
تأكد من أن Hostinger يسمح بالمنفذ
عادةً Hostinger يستخدم المنفذ 3000 أو يختاره تلقائياً
```

---

## 📊 المقارنة: MongoDB Atlas vs Hostinger

| الميزة    | MongoDB Atlas | Hostinger    |
| --------- | ------------- | ------------ |
| التكلفة   | مجاني (M0)    | ضمن الاشتراك |
| الأداء    | ⚡⚡⚡ ممتاز  | ⚡⚡ جيد     |
| الموثوقية | 99.9%         | 99.9%        |
| النسخ     | تلقائي        | تلقائي       |
| الدعم     | عالي          | جيد          |
| الإعداد   | أسهل          | وسط          |

**الاختيار:**

- تريد الأفضل؟ → MongoDB Atlas
- تريد الأرخص؟ → Hostinger

---

## 🎯 الخطوات السريعة (إذا كنت مستعجل)

```
1. ادخل hPanel
2. اذهب إلى Databases
3. أنشئ MongoDB أو MySQL
4. احصل على الرابط
5. حدّث backend/.env
6. ارفع الملفات
7. انتظر النشر
8. اختبر الـ API
```

**الوقت الكلي:** 15 دقيقة

---

## 📞 المساعدة الإضافية

### أسئلة قد تحتاجها:

- ❓ هل لديك Hostinger Business أم Cloud؟
- ❓ ما نوع قاعدة البيانات المتاح؟
- ❓ هل تريد رفع الفرونت إند أيضاً؟
- ❓ هل لديك دومين خاص؟

---

## ✨ النتيجة النهائية

بعد الإعداد:

```
✅ النظام يعمل على Hostinger
✅ البيانات محفوظة بأمان
✅ متاح من أي مكان
✅ سهل الصيانة والتحديث
```

---

**آخر تحديث:** 17 يناير 2026
**الحالة:** ✅ جاهز للنشر على Hostinger

# 🗄️ دليل إعداد قاعدة البيانات السريع

## الخيار 1: MongoDB محلي (الأسرع - للاختبار)

### التثبيت:

```powershell
# استخدم Chocolatey
choco install mongodb

# أو حمّل من الموقع:
# https://www.mongodb.com/try/download/community
```

### التشغيل:

```powershell
# ابدأ MongoDB
mongod --dbpath="C:\data\db"

# أو استخدم الخدمة
net start MongoDB
```

### التكوين في .env.production:

```env
DATABASE_URL=mongodb://localhost:27017/alawael_erp
```

---

## الخيار 2: MongoDB Atlas (مجاني - موصى به للإنتاج)

### الخطوات:

#### 1. إنشاء حساب مجاني:

- اذهب إلى: https://www.mongodb.com/cloud/atlas/register
- سجّل حساب مجاني (Free Tier - M0)

#### 2. إنشاء Cluster:

- اضغط "Build a Cluster"
- اختر "Shared" (مجاني)
- اختر منطقة قريبة (مثل: eu-central-1)
- اضغط "Create Cluster" (يستغرق 3-5 دقائق)

#### 3. إنشاء مستخدم:

- اذهب إلى "Database Access"
- اضغط "Add New Database User"
- اسم المستخدم: `alawael_admin`
- كلمة المرور: (احفظها!)
- اختر "Read and write to any database"

#### 4. السماح بالاتصال:

- اذهب إلى "Network Access"
- اضغط "Add IP Address"
- اختر "Allow Access from Anywhere" (0.0.0.0/0)

#### 5. الحصول على Connection String:

- اذهب إلى "Databases"
- اضغط "Connect" على cluster الخاص بك
- اختر "Connect your application"
- انسخ الـ Connection String

#### 6. التكوين في .env.production:

```env
DATABASE_URL=mongodb+srv://alawael_admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/alawael_erp?retryWrites=true&w=majority
```

**استبدل:**

- `alawael_admin` → اسم المستخدم
- `YOUR_PASSWORD` → كلمة المرور
- `cluster0.xxxxx` → رابط cluster الخاص بك

---

## الخيار 3: PostgreSQL محلي

### التثبيت:

```powershell
# استخدم Chocolatey
choco install postgresql

# أو حمّل من:
# https://www.postgresql.org/download/windows/
```

### إنشاء قاعدة البيانات:

```sql
-- افتح psql
psql -U postgres

-- أنشئ قاعدة البيانات
CREATE DATABASE alawael_erp;

-- أنشئ مستخدم
CREATE USER alawael_user WITH PASSWORD 'secure_password';

-- امنح الصلاحيات
GRANT ALL PRIVILEGES ON DATABASE alawael_erp TO alawael_user;
```

### التكوين في .env.production:

```env
DATABASE_URL=postgresql://alawael_user:secure_password@localhost:5432/alawael_erp
```

---

## الخيار 4: MySQL محلي

### التثبيت:

```powershell
# استخدم Chocolatey
choco install mysql

# أو حمّل من:
# https://dev.mysql.com/downloads/installer/
```

### إنشاء قاعدة البيانات:

```sql
-- افتح MySQL
mysql -u root -p

-- أنشئ قاعدة البيانات
CREATE DATABASE alawael_erp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- أنشئ مستخدم
CREATE USER 'alawael_user'@'localhost' IDENTIFIED BY 'secure_password';

-- امنح الصلاحيات
GRANT ALL PRIVILEGES ON alawael_erp.* TO 'alawael_user'@'localhost';
FLUSH PRIVILEGES;
```

### التكوين في .env.production:

```env
DATABASE_URL=mysql://alawael_user:secure_password@localhost:3306/alawael_erp
```

---

## 🚀 بعد إعداد قاعدة البيانات:

### 1. حدّث .env.production:

```powershell
notepad .env.production
```

### 2. شغّل Migrations (إذا لزم):

```powershell
cd backend
npm run migrate
# أو
python manage.py migrate
```

### 3. اختبر الاتصال:

```powershell
# MongoDB
mongo "YOUR_CONNECTION_STRING"

# PostgreSQL
psql -d alawael_erp -U alawael_user

# MySQL
mysql -u alawael_user -p alawael_erp
```

### 4. شغّل النشر:

```powershell
.\deploy.ps1 -Environment production
```

---

## 💡 توصيتي:

**للاختبار السريع:** استخدم MongoDB محلي (الخيار 1)

```env
DATABASE_URL=mongodb://localhost:27017/alawael_erp
```

**للإنتاج:** استخدم MongoDB Atlas المجاني (الخيار 2)

- مجاني للأبد (512 MB)
- نسخ احتياطي تلقائي
- أمان عالي
- لا يحتاج صيانة

---

## 🆘 استكشاف الأخطاء:

### MongoDB لا يعمل:

```powershell
# تحقق من الخدمة
Get-Service MongoDB

# ابدأ الخدمة
net start MongoDB

# أو شغّل يدوياً
mongod --dbpath="C:\data\db"
```

### خطأ في الاتصال:

```powershell
# تحقق من المنفذ
netstat -ano | findstr 27017

# تحقق من .env
Get-Content backend\.env | Select-String "DATABASE"
```

### كلمة مرور خاطئة:

```powershell
# MongoDB - أعد تعيين
mongo admin
db.changeUserPassword("username", "newPassword")

# PostgreSQL - أعد تعيين
ALTER USER alawael_user WITH PASSWORD 'new_password';
```

---

**آخر تحديث:** 2026-01-19

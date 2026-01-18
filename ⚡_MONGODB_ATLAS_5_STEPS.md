# 🚀 MongoDB Atlas - إعداد سريع (5 خطوات)

## ⏱️ الوقت المتوقع: 10 دقائق

---

## الخطوات الأساسية فقط (بدون تفاصيل):

### 1️⃣ اذهب هنا:

```
https://www.mongodb.com/cloud/atlas/register
```

ثم سجل بـ Google أو Email

---

### 2️⃣ أنشئ Cluster:

- اختر **M0 Sandbox** (FREE)
- **Region:** Frankfurt (أو أقرب منطقة)
- **Name:** `alawael-erp`

✏️ **انتظر 2-3 دقائق حتى يصبح أخضر**

---

### 3️⃣ أضف مستخدم:

- **Database Access** (من اليسار)
- **Add New Database User**
  - Username: `alawael_admin`
  - Password: `Admin@2026`

---

### 4️⃣ اسمح بالاتصال:

- **Network Access** (من اليسار)
- **Add IP Address**
- اختر: **Allow Access from Anywhere**
- **0.0.0.0/0**

---

### 5️⃣ احصل على الرابط:

- اذهب إلى **Databases** (من اليسار)
- اضغط على **Cluster**: `alawael-erp`
- اضغط **Connect**
- اختر: **Connect your application**
- اختر: **Node.js** و **5.5 or later**

**ستظهر Connection String:**

```
mongodb+srv://alawael_admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

**✏️ استبدل:**

- `<password>` → `Admin@2026`
- `/?` → `/alawael-erp?`

---

## النتيجة النهائية:

```
mongodb+srv://alawael_admin:Admin@2026@cluster0.xxxxx.mongodb.net/alawael-erp?retryWrites=true&w=majority
```

**⚠️ لا تغير `xxxxx` - اتركها!**

---

## الآن في Terminal:

```powershell
cd backend
```

### افتح .env:

```powershell
notepad .env
```

### غيّر هذين السطرين:

**من:**

```env
MONGODB_URI=mongodb://localhost:27017/alawael-erp
USE_MOCK_DB=true
```

**إلى:**

```env
MONGODB_URI=mongodb+srv://alawael_admin:Admin@2026@cluster0.xxxxx.mongodb.net/alawael-erp?retryWrites=true&w=majority
USE_MOCK_DB=false
```

**احفظ:** `Ctrl+S`

---

## الآن استيراد البيانات:

```powershell
node scripts\seed.js
```

### يجب أن ترى:

```
✅ Connected to MongoDB
✅ Organization created: منظمة الأوائل
✅ Employees created
✅ Data seeding completed!
```

---

## التشغيل:

```powershell
npm start
```

### يجب أن ترى:

```
✅ Connected to MongoDB: alawael-erp
🚀 Server is running on port 3001
```

---

## ✅ نجحت!

البيانات الآن محفوظة في السحابة ودائمة! 🎉

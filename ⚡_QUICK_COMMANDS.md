# ⚡ MongoDB Atlas - أوامر فورية

## Copy & Paste الآن! 👇

---

## 📋 الخطوات بسيطة فقط:

### 1. Register (2 دقائق)

```
https://www.mongodb.com/cloud/atlas/register
```

سجل بـ Google → أكمل التسجيل

---

### 2. Create Cluster (3 دقائق)

- اختر M0 Sandbox
- Region: Frankfurt
- Name: alawael-erp
- ثم انتظر حتى يصبح أخضر ✅

---

### 3. Create User

- Username: `alawael_admin`
- Password: `Admin@2026`

---

### 4. Add IP

- Network Access → Add IP Address
- Select: Allow from Anywhere (0.0.0.0/0)

---

### 5. Get Connection String

- Databases → Your Cluster → Connect
- Copy the string

---

### 6. Update .env

افتح Terminal:

```powershell
cd backend
code .env
```

**استبدل هذين السطرين:**

**من:**

```env
MONGODB_URI=mongodb://localhost:27017/alawael-erp
USE_MOCK_DB=true
```

**إلى (الصق رابط Atlas الخاص بك):**

```env
MONGODB_URI=mongodb+srv://alawael_admin:Admin@2026@cluster0.xxxxx.mongodb.net/alawael-erp?retryWrites=true&w=majority
USE_MOCK_DB=false
```

احفظ: `Ctrl+S`

---

### 7. Import Data

```powershell
node scripts\seed.js
```

يجب أن تشوف:

```
✅ Connected to MongoDB
✅ Organization created
✅ Data seeding completed!
```

---

### 8. Verify

```powershell
node scripts\verify-mongodb.js
```

يجب أن تشوف:

```
✅ Connected to MongoDB!
   Database: alawael-erp
   Collections: 5
```

---

### 9. Start System

**Terminal 1:**

```powershell
npm start
```

**Terminal 2:**

```powershell
cd frontend
npm start
```

---

### 10. Test

```powershell
Invoke-RestMethod http://localhost:3001/api/organizations | ConvertTo-Json
```

---

## ✅ Done! 🎉

البيانات الآن محفوظة في السحابة ودائمة!

---

## 🔧 Troubleshooting

| Problem             | Solution                                   |
| ------------------- | ------------------------------------------ |
| ❌ "bad auth"       | تأكد من `alawael_admin` و `Admin@2026`     |
| ❌ "ECONNREFUSED"   | أضف IP: 0.0.0.0/0 في Network Access        |
| ❌ "Not connecting" | انسخ Connection String مرة أخرى من MongoDB |
| ❌ "ENOTFOUND"      | تأكد من الاتصال بالإنترنت                  |

---

## 📱 Quick Commands

```powershell
# التحقق من الاتصال
node scripts\verify-mongodb.js

# استيراد البيانات
node scripts\seed.js

# بدء النظام
npm start

# اختبار API
Invoke-RestMethod http://localhost:3001/api/organizations

# النسخ الاحتياطي
node scripts\backup.js
```

---

**إذا حصلت على خطأ، ارسل الخطأ كاملاً!**

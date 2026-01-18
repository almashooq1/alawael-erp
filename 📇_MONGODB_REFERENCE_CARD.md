# 🎯 MongoDB Atlas - Reference Card

## جميع المعلومات التي تحتاجها في صفحة واحدة!

---

## 1️⃣ معلومات الاتصال الثابتة:

```
🔐 Credentials:
   Username:  alawael_admin
   Password:  Admin@2026
   Database:  alawael-erp
   Cluster:   alawael-erp
   Region:    Frankfurt (eu-central-1)
   Tier:      M0 Sandbox (Free)
```

---

## 2️⃣ رابط الاتصال (بعد الإعداد):

```
mongodb+srv://alawael_admin:Admin@2026@cluster0.xxxxx.mongodb.net/alawael-erp?retryWrites=true&w=majority
```

**ملاحظة:** `xxxxx` تختلف لكل Cluster - لا تغيره!

---

## 3️⃣ .env Configuration:

```env
# Before:
MONGODB_URI=mongodb://localhost:27017/alawael-erp
USE_MOCK_DB=true

# After (MongoDB Atlas):
MONGODB_URI=mongodb+srv://alawael_admin:Admin@2026@cluster0.xxxxx.mongodb.net/alawael-erp?retryWrites=true&w=majority
USE_MOCK_DB=false
```

---

## 4️⃣ أوامر سريعة:

```powershell
# التحقق من الاتصال
cd backend && node scripts\verify-mongodb.js

# استيراد البيانات
node scripts\seed.js

# اختبار الإعداد
node scripts\test-setup.js

# بدء Backend
npm start

# بدء Frontend
cd frontend && npm start

# اختبار API
Invoke-RestMethod http://localhost:3001/api/organizations
```

---

## 5️⃣ MongoDB Atlas Steps (الخطوات):

### الخطوة 1: التسجيل

```
URL: https://www.mongodb.com/cloud/atlas/register
Button: Sign up with Google
```

### الخطوة 2: الـ Cluster

```
Button: Create Deployment
Tier: M0 Sandbox (FREE)
Provider: AWS
Region: Frankfurt
Name: alawael-erp
```

### الخطوة 3: المستخدم

```
Menu: Database Access
Button: Add New Database User
Username: alawael_admin
Password: Admin@2026
Click: Create User
```

### الخطوة 4: الـ IP

```
Menu: Network Access
Button: Add IP Address
Select: Allow from Anywhere (0.0.0.0/0)
Click: Confirm
```

### الخطوة 5: الـ Connection String

```
Menu: Databases
Click: Your Cluster
Button: Connect
Select: Connect your application
Driver: Node.js
Version: 5.5 or later
Copy: Connection String
```

---

## 6️⃣ أخطاء شائعة والحلول:

| الخطأ                | السبب           | الحل                   |
| -------------------- | --------------- | ---------------------- |
| `bad auth`           | كلمة مرور خاطئة | تأكد من `Admin@2026`   |
| `ECONNREFUSED`       | IP غير مسموح    | أضف `0.0.0.0/0`        |
| `ENOTFOUND`          | اسم Domain خاطئ | انسخ الرابط من MongoDB |
| `Connection timeout` | إنترنت بطيء     | تحقق من الاتصال        |

---

## 7️⃣ التحقق من النجاح:

```
✅ Node scripts\verify-mongodb.js تظهر:
   ✅ Connected to MongoDB!
   ✅ Database: alawael-erp

✅ npm start تظهر:
   ✅ Connected to MongoDB: alawael-erp
   🚀 Server is running on port 3001

✅ API test:
   {
     "success": true,
     "data": [organization...]
   }
```

---

## 8️⃣ الملفات الجديدة:

| الملف                             | الهدف              |
| --------------------------------- | ------------------ |
| 💾_MONGODB_ATLAS_SETUP.md         | دليل شامل (10 min) |
| ⚡_QUICK_COMMANDS.md              | أوامر فقط (2 min)  |
| 📸_MONGODB_ATLAS_VISUAL_GUIDE.md  | شرح مرئي (10 min)  |
| backend/scripts/verify-mongodb.js | تحقق من الاتصال    |
| backend/scripts/test-setup.js     | اختبار شامل        |

---

## 9️⃣ ملفات موجودة بالفعل:

| الملف                                | الهدف              |
| ------------------------------------ | ------------------ |
| backend/models/organization.model.js | 5 Mongoose schemas |
| backend/scripts/seed.js              | استيراد البيانات   |
| backend/scripts/backup.js            | النسخ الاحتياطي    |

---

## 🔟 خريطة الإعداد:

```
START
  ↓
1. سجل في MongoDB Atlas (2 min)
  ↓
2. أنشئ Cluster (3 min - في الخلفية)
  ↓
3. أنشئ مستخدم (1 min)
  ↓
4. أضف IP (1 min)
  ↓
5. احصل على Connection String (1 min)
  ↓
6. حدّث .env (1 min)
  ↓
7. استيراد البيانات (1 min)
  ↓
8. التحقق (1 min)
  ↓
DONE ✅
```

---

## 🎯 الخطوة التالية:

### اختر:

**🏃 Fast Track (2 دقيقة):**

```
اقرأ: ⚡_QUICK_COMMANDS.md
نفذ: الأوامر بدقة
النتيجة: MongoDB متصل!
```

**📚 Standard Track (10 دقيقة):**

```
اقرأ: 💾_MONGODB_ATLAS_SETUP.md
اتبع: الخطوات 1-8
النتيجة: MongoDB متصل + بيانات!
```

**👨‍💼 Visual Track (10 دقيقة):**

```
اقرأ: 📸_MONGODB_ATLAS_VISUAL_GUIDE.md
اتبع: الخطوات مع الصور
النتيجة: MongoDB متصل + بيانات!
```

---

## 💾 Backup Information:

```
Files:
  - MongoDB Snapshot (automatic)
  - Manual export: node scripts\backup.js
  - Location: backups/ folder

Retention: Keep last 7 backups
Timing: Daily at 3 AM (configurable)
```

---

## 📞 Support:

```
1. Read error message carefully
2. Run: node scripts\verify-mongodb.js
3. Run: node scripts\test-setup.js
4. Check: Common errors above
5. Ask: Provide full error message
```

---

## ✨ Timeline:

```
Now:          📖 Reading guides (5-10 min)
              🛠️  Setting up MongoDB (10 min)

30 min:       ✅ Full system running
              📊 With persistent data

1 hour:       🚀 Ready for Priority 2
              📅 Backup scheduling

4 hours:      🎉 Production ready!
              🌐 Deployed and live
```

---

## 🚀 انطلق الآن!

**Step 1:** اختر دليل
**Step 2:** اتبع الخطوات
**Step 3:** شغّل النظام

**المدة:** 10-15 دقيقة
**الهدف:** MongoDB متصل + بيانات محفوظة ✅

---

**Last Updated:** 17 يناير 2026
**Status:** ✅ جاهز للاستخدام
**Version:** 1.0

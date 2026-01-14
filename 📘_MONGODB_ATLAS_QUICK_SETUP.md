# 🚀 دليل سريع - إضافة MongoDB Atlas في 5 خطوات

## ✅ المتطلبات:

- حساب Gmail أو بريد إلكتروني (مجاني)
- اتصال إنترنت

---

## 📋 الخطوات:

### 1️⃣ **أنشئ حساباً في MongoDB Atlas**

```
اذهب إلى: https://www.mongodb.com/cloud/atlas
اختر: "Start Free"
أدخل بريدك الإلكتروني
تحقق من البريد وأكمل التسجيل
```

### 2️⃣ **أنشئ Cluster مجاني**

```
اختر: "Build a Database"
اختر: "M0 Sandbox" (مجاني)
اختر منطقة (أي منطقة تناسبك)
اضغط: "Create Cluster"
⏳ انتظر 5-10 دقائق حتى يبدأ Cluster
```

### 3️⃣ **أضف مستخدم قاعدة البيانات**

```
في لوحة التحكم، اختر: "Security" → "Database Access"
اضغط: "Add New Database User"
Username: admin
Password: Admin@123456
اضغط: "Create Database User"
```

### 4️⃣ **اسمح بالوصول من أي مكان**

```
في لوحة التحكم، اختر: "Security" → "Network Access"
اضغط: "Add IP Address"
اختر: "Allow Access from Anywhere" (0.0.0.0/0)
اضغط: "Confirm"
```

### 5️⃣ **احصل على رابط الاتصال**

```
اذهب إلى Cluster الذي أنشأته
اضغط: "Connect"
اختر: "Connect your application"
انسخ الرابط (يبدو كهذا):
   mongodb+srv://admin:Admin@123456@cluster0.xxxxx.mongodb.net/alawael-erp?retryWrites=true&w=majority
```

---

## 🔧 **الآن: أضف الرابط في backend/.env**

### الطريقة 1: التحرير اليدوي

```
1. افتح: backend/.env
2. جد السطر: MONGODB_URI=mongodb://localhost:27017/alawael-erp
3. استبدله برابطك من MongoDB Atlas
4. غيّر: USE_MOCK_DB=true إلى USE_MOCK_DB=false
5. احفظ الملف (Ctrl+S)
```

### الطريقة 2: باستخدام PowerShell

```powershell
# استبدل PASTE_YOUR_MONGODB_URI برابطك
$uri = "mongodb+srv://admin:Admin@123456@cluster0.xxxxx.mongodb.net/alawael-erp?retryWrites=true&w=majority"

# عدّل الملف
(Get-Content "backend\.env") -replace "MONGODB_URI=.*", "MONGODB_URI=$uri" | Set-Content "backend\.env"
(Get-Content "backend\.env") -replace "USE_MOCK_DB=true", "USE_MOCK_DB=false" | Set-Content "backend\.env"

Write-Host "✅ تم تحديث .env بنجاح"
```

---

## 🚀 **الآن: أعد تشغيل Backend**

```powershell
cd "c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666\backend"
npm start
```

### 🎉 علامات النجاح:

```
✅ MongoDB Connected: mongodb+srv://admin@cluster0.xxxxx...
✅ Server running on port 3001
```

---

## ⚠️ **إذا فشل الاتصال:**

| المشكلة                     | الحل                                                   |
| --------------------------- | ------------------------------------------------------ |
| "Cannot connect to MongoDB" | تحقق من IP Address (يجب أن يكون 0.0.0.0/0)             |
| "Authentication failed"     | تحقق من username و password                            |
| "Cluster not ready"         | انتظر حتى يبدأ Cluster (5-10 دقائق)                    |
| "تايم آوت"                  | قد يكون Cluster في وضع sleep - اذهب إلى MongoDB وأيقظه |

---

## 🎯 **بعد الانتهاء:**

```
1️⃣  تأكد أن Backend يعمل
   http://localhost:3001/health

2️⃣  اختبر تسجيل الدخول
   http://localhost:3000
   admin@alawael.com / Admin@123456

3️⃣  البيانات الآن محفوظة دائماً! 🎉
```

---

## 📝 **ملخص القيم:**

```
MongoDB Atlas URL Example:
mongodb+srv://admin:Admin@123456@cluster0.abc123.mongodb.net/alawael-erp?retryWrites=true&w=majority

الأجزاء:
- admin = اسم المستخدم
- Admin@123456 = كلمة المرور
- cluster0.abc123 = معرّف Cluster الخاص بك
- alawael-erp = اسم قاعدة البيانات
```

---

**تاريخ الإنشاء:** January 13, 2026  
**الحالة:** ✅ **جاهز للاستخدام**

🎉 **تم! الآن لديك قاعدة بيانات دائمة في السحابة!**

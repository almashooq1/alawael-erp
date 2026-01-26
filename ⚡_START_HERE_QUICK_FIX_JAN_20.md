# 🚀 دليل البدء السريع - 5 دقائق

## تاريخ: 20 يناير 2026

---

## ⚡ الحل الأسرع (دقيقتان)

### الخطوة 1: تطبيق الإصلاح السريع

```powershell
cd "c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666"
.\scripts\quick-fix.ps1
```

### الخطوة 2: بدء النظام

```powershell
.\START_SYSTEM_FIXED.ps1
```

### الخطوة 3: افتح المتصفح

```
http://localhost:3002
```

**✅ انتهى! النظام يعمل الآن**

---

## 🔧 الحل الشامل (15 دقيقة)

إذا كنت تريد حل جميع المشاكل بشكل كامل:

### الخطوة 1: تطبيق الإصلاح الشامل

```powershell
cd "c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666"
.\scripts\comprehensive-fix.ps1
```

هذا السكريبت سيقوم بـ:

- ✅ إيقاف جميع العمليات القديمة
- ✅ تنظيف node_modules
- ✅ توليد مفاتيح أمان جديدة
- ✅ تكوين ملفات .env
- ✅ إعادة تثبيت جميع Dependencies
- ✅ اختبار النظام

### الخطوة 2: بدء النظام

```powershell
.\START_SYSTEM_FIXED.ps1
```

### الخطوة 3: التحقق

افتح المتصفح وادخل:

- **Frontend**: http://localhost:3002
- **Backend API**: http://localhost:3001
- **API Docs**: http://localhost:3001/api-docs

---

## 🗄️ إعداد MongoDB

### خيار A: استخدام MongoDB محلي

#### 1. تثبيت MongoDB

قم بتحميل وتثبيت MongoDB من: https://www.mongodb.com/try/download/community

#### 2. بدء الخدمة

```powershell
net start MongoDB
```

#### 3. التحقق

```powershell
mongo --version
```

---

### خيار B: استخدام MongoDB Atlas (موصى به) ⭐

#### 1. إنشاء حساب مجاني

اذهب إلى: https://www.mongodb.com/cloud/atlas/register

#### 2. إنشاء Cluster

- اختر "Create a FREE Shared Cluster"
- اختر المنطقة الأقرب (مثل Bahrain أو Mumbai)
- انقر "Create Cluster"

#### 3. إعداد Access

1. **Database Access** → Add New Database User
   - Username: admin
   - Password: (احفظه)
   - Role: Atlas Admin

2. **Network Access** → Add IP Address
   - انقر "Allow Access from Anywhere"
   - انقر "Confirm"

#### 4. الحصول على Connection String

1. انقر "Connect" على الـ Cluster
2. اختر "Connect your application"
3. انسخ Connection String

#### 5. تحديث .env

```powershell
# في backend\.env
MONGODB_URI=mongodb+srv://admin:<password>@cluster0.xxxxx.mongodb.net/alawael_db?retryWrites=true&w=majority
USE_MOCK_DB=false
```

⚠️ **هام**: استبدل `<password>` بكلمة المرور الفعلية

#### 6. إعادة تشغيل Backend

```powershell
cd backend
npm start
```

---

## 📋 الأوامر المفيدة

### بدء النظام

```powershell
# بدء عادي
.\START_SYSTEM_FIXED.ps1

# بدء مع تنظيف
.\START_SYSTEM_FIXED.ps1 -Clean

# بدء بدون فتح المتصفح
.\START_SYSTEM_FIXED.ps1 -NoBrowser
```

### إيقاف النظام

```powershell
.\STOP_SYSTEM.ps1
```

### بدء يدوي

#### Backend فقط

```powershell
cd backend
npm start
```

#### Frontend فقط

```powershell
cd frontend
npm start
```

---

## 🔍 التحقق من الحالة

### فحص الخوادم

```powershell
# فحص عمليات Node
Get-Process node | Select ProcessName,Id,CPU,WorkingSet

# فحص المنافذ
Get-NetTCPConnection -LocalPort 3001,3002
```

### اختبار API

```powershell
# Health Check
curl http://localhost:3001/api/health

# Get Users
curl http://localhost:3001/api/v1/users

# Accounting
curl http://localhost:3002/api/accounting/invoices
```

---

## 🐛 حل المشاكل السريع

### مشكلة: "Port already in use"

```powershell
# إيقاف جميع العمليات
Get-Process node | Stop-Process -Force

# أو استخدم
.\STOP_SYSTEM.ps1
```

### مشكلة: "Cannot find module"

```powershell
cd backend
Remove-Item node_modules -Recurse -Force
npm install

cd ..\frontend
Remove-Item node_modules -Recurse -Force
npm install
```

### مشكلة: "MongoDB connection failed"

```powershell
# تحقق من MongoDB
Get-Service MongoDB

# بدء MongoDB
net start MongoDB

# أو تحقق من MONGODB_URI في .env
```

### مشكلة: "CORS error"

```powershell
# تحديث backend\.env
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002
CORS_ORIGIN=*
```

---

## 📚 الوثائق الإضافية

للمزيد من التفاصيل، راجع:

1. **🔧_COMPREHENSIVE_PROJECT_FIXES_JAN_20.md**
   - تحليل شامل لجميع المشاكل
   - حلول مفصلة لكل مشكلة

2. **MONGODB_ATLAS_GUIDE_AR.md**
   - دليل MongoDB Atlas الكامل
   - خطوات الإعداد بالصور

3. **⚡*إصلاحات*سريعة.md**
   - ملخص الإصلاحات السابقة

4. **🔐_GITHUB_SECRETS_SETUP_GUIDE.md**
   - إعداد GitHub Actions

---

## ✅ Checklist البدء

قبل البدء، تأكد من:

- [ ] Node.js مُثبت (v14+)
- [ ] npm مُثبت
- [ ] MongoDB يعمل (محلي أو Atlas)
- [ ] ملفات .env محدثة
- [ ] Dependencies مُثبتة
- [ ] المنافذ 3001 و 3002 متاحة

---

## 🆘 الدعم

إذا واجهت مشاكل:

1. راجع قسم "حل المشاكل السريع" أعلاه
2. افحص ملفات Log:
   - `backend\server.log`
   - `frontend\serve.log`
3. راجع الوثائق المفصلة
4. أعد تشغيل السكريبت الشامل:
   ```powershell
   .\scripts\comprehensive-fix.ps1
   ```

---

## 🎯 نصائح للنجاح

### 1. استخدم MongoDB Atlas

- أسهل في الإعداد
- لا يتطلب تثبيت محلي
- مجاني للاستخدام الأساسي
- موثوق ومستقر

### 2. احفظ المفاتيح الأمنية

- مفاتيح JWT موجودة في `backend\.env`
- لا تشاركها مع أحد
- اعمل backup منها

### 3. راقب الأداء

```powershell
# مراقبة استهلاك الموارد
Get-Process node | Select ProcessName,CPU,WorkingSet | Format-Table -AutoSize
```

### 4. نظف بانتظام

```powershell
# كل فترة احذف ملفات Log القديمة
Remove-Item backend\*.log
```

---

## 🚀 الخطوات التالية

بعد تشغيل النظام بنجاح:

1. **سجل دخول**
   - افتح http://localhost:3002
   - استخدم بيانات الاختبار الافتراضية

2. **اختبر الميزات**
   - Dashboard
   - Communications
   - Documents
   - HR System
   - Accounting

3. **أضف بيانات**
   - Users
   - Students
   - Employees
   - Documents

4. **استكشف API**
   - افتح http://localhost:3001/api-docs
   - جرب Endpoints مختلفة

---

## 📊 معلومات النظام

### Ports

- **Frontend**: 3002
- **Backend**: 3001
- **MongoDB**: 27017 (محلي)

### URLs

- **App**: http://localhost:3002
- **API**: http://localhost:3001/api/v1
- **Docs**: http://localhost:3001/api-docs
- **Health**: http://localhost:3001/api/health

### Default Credentials

راجع ملفات seed في `backend\db\seeders\`

---

**🎉 بالتوفيق! النظام جاهز للاستخدام**

**تاريخ آخر تحديث**: 20 يناير 2026  
**الإصدار**: 1.0.0  
**الحالة**: ✅ مُختبر وجاهز

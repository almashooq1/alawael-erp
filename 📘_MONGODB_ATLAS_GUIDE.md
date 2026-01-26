# 🗄️ MongoDB Atlas - دليل الإعداد السريع

## الخطوة 1: التسجيل والإعداد

### 1.1 إنشاء حساب MongoDB Atlas

🔗 **رابط التسجيل**: https://mongodb.com/cloud/atlas/register

- استخدم البريد الإلكتروني أو Google/GitHub
- خطة مجانية (Free Forever)
- 512 MB storage مجاناً

### 1.2 إنشاء Cluster جديد

بعد التسجيل:

1. **Create a New Cluster**
2. **Shared** (Free Tier - M0)
3. **Cloud Provider**: AWS (أو أي مزود قريب)
4. **Region**: اختر أقرب منطقة لموقعك
5. **Cluster Name**: `AlAwael-ERP` (أو أي اسم)
6. **Create Cluster** (يستغرق 3-5 دقائق)

---

## الخطوة 2: إعداد الوصول

### 2.1 Database Access (إنشاء مستخدم)

1. في القائمة الجانبية: **Security** → **Database Access**
2. **Add New Database User**
3. **Username**: `alawael_admin`
4. **Password**: اختر **Autogenerate Secure Password** ونسخه
5. **Database User Privileges**: **Read and write to any database**
6. **Add User**

⚠️ **مهم**: احتفظ بكلمة المرور في مكان آمن!

### 2.2 Network Access (السماح بالاتصال)

1. في القائمة الجانبية: **Security** → **Network Access**
2. **Add IP Address**
3. **Allow Access from Anywhere**: `0.0.0.0/0`
   - للتطوير: استخدم `0.0.0.0/0`
   - للإنتاج: أضف IP محدد
4. **Confirm**

---

## الخطوة 3: الحصول على Connection String

1. ارجع إلى **Database** → **Clusters**
2. انقر **Connect** على الـ Cluster
3. اختر **Connect your application**
4. **Driver**: Node.js
5. **Version**: 4.1 or later
6. **نسخ Connection String**:

```
mongodb+srv://alawael_admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

⚠️ **استبدل `<password>` بكلمة المرور الفعلية!**

### مثال Connection String كامل:

```
mongodb+srv://alawael_admin:MySecurePass123@cluster0.abc123.mongodb.net/alawael_erp?retryWrites=true&w=majority
```

**ملاحظة**: تأكد من إضافة `/alawael_erp` بعد `.mongodb.net` لتحديد اسم قاعدة
البيانات

---

## الخطوة 4: التطبيق التلقائي

### خيار 1: استخدام السكريبت التلقائي ⭐ (موصى به)

```powershell
.\Setup-MongoDB.ps1
```

السكريبت سيقوم بـ:

- ✅ نسخ احتياطي لـ .env
- ✅ تحديث USE_MOCK_DB=false
- ✅ تحديث MONGODB_URI
- ✅ إعادة تشغيل Backend
- ✅ التحقق من الاتصال

### خيار 2: تطبيق يدوي

#### 4.1 تحديث `backend/.env`:

```env
# تغيير من true إلى false
USE_MOCK_DB=false

# إضافة/تحديث Connection String
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/alawael_erp?retryWrites=true&w=majority
```

#### 4.2 إعادة تشغيل Backend:

```powershell
# إيقاف Backend الحالي
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# بدء Backend الجديد
cd backend
npm run start
```

---

## الخطوة 5: التحقق من الاتصال

### 5.1 فحص Logs

يجب أن ترى في سجلات Backend:

```
✅ MongoDB Connected: alawael_erp
🌐 Server running on port 3001
```

### 5.2 اختبار Health Endpoint

```powershell
Invoke-RestMethod -Uri "http://localhost:3001/health"
```

**الناتج المتوقع**:

```json
{
  "status": "OK",
  "message": "AlAwael ERP Backend is running",
  "database": "connected",
  "timestamp": "2026-01-24T..."
}
```

---

## الخطوة 6: تحميل البيانات الأولية (Seeding)

### خيار 1: عبر API

```powershell
$headers = @{
    "Content-Type" = "application/json"
}

Invoke-RestMethod -Uri "http://localhost:3001/api/admin/seed-database" `
                  -Method POST `
                  -Headers $headers
```

### خيار 2: عبر npm script (إذا كان موجوداً)

```powershell
cd backend
npm run seed
```

---

## الخطوة 7: اختبار Login

```powershell
$body = @{
    email = "admin@test.com"
    password = "Admin@123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" `
                              -Method POST `
                              -Body $body `
                              -ContentType "application/json"

Write-Host "Token: $($response.accessToken)"
```

---

## 🎯 الفوائد

✅ **بيانات دائمة**: لا تضيع عند إعادة التشغيل  
✅ **أداء أفضل**: Indexing و Aggregation  
✅ **Backup تلقائي**: MongoDB Atlas يقوم بنسخ احتياطي يومي  
✅ **Scalable**: إمكانية الترقية للخطط المدفوعة  
✅ **Production-ready**: جاهز للنشر

---

## 🔧 استكشاف الأخطاء

### خطأ: "Authentication failed"

**الحل**:

1. تأكد من كلمة المرور صحيحة في Connection String
2. تأكد من إنشاء Database User بصلاحيات صحيحة

### خطأ: "Network timeout"

**الحل**:

1. تأكد من إضافة `0.0.0.0/0` في Network Access
2. تحقق من اتصال الإنترنت

### خطأ: "Database name missing"

**الحل**: تأكد من إضافة اسم قاعدة البيانات في Connection String:

```
mongodb+srv://user:pass@cluster.net/alawael_erp
```

---

## 📊 مراقبة القاعدة

### في MongoDB Atlas Dashboard:

1. **Collections**: عرض الجداول والبيانات
2. **Metrics**: استخدام CPU, Memory, Storage
3. **Performance Advisor**: توصيات لتحسين Indexes
4. **Logs**: سجلات الاستعلامات البطيئة

---

## ⏭️ الخطوة التالية

بعد إكمال MongoDB Atlas:

**Redis Cache Setup** (15 دقيقة) →  
تحسين الأداء 10-100x للاستعلامات المتكررة

---

**Status**: ⏳ جاهز للتنفيذ  
**الوقت المقدر**: 15 دقيقة  
**الأولوية**: 🔥 عالية جداً

# 🧪 اختبار شامل للـ API Endpoints
# Equipment Management System - API Testing Guide
# اختبار نظام إدارة المعدات - دليل الاختبار

## 📋 المتطلبات الأساسية

```bash
# 1. تأكد من تشغيل Backend
cd backend
npm start
# ✅ يجب أن ترى: Server running on port 3001

# 2. في Terminal جديد، تحقق من الاتصال
curl http://localhost:3001/api/health
# ✅ يجب أن ترى: { status: "healthy", port: 3001 }
```

## 🔑 الحصول على Token

```powershell
# تسجيل الدخول (Login)
$loginBody = @{
  email = "admin@alawael.com"
  password = "Admin@123456"
} | ConvertTo-Json

$loginResponse = Invoke-WebRequest -Uri 'http://localhost:3001/api/auth/login' `
  -Method Post `
  -Body $loginBody `
  -ContentType 'application/json' `
  -UseBasicParsing

$json = $loginResponse.Content | ConvertFrom-Json
$token = $json.accessToken

Write-Host "✅ Token: $($token.Substring(0,30))..."
Write-Host "User: $($json.user.email)"
Write-Host "Role: $($json.user.role)"
```

## 🚀 اختبارات الـ API

### 1️⃣ **اختبار المعدات (Equipment)**

#### 1.1 الحصول على جميع المعدات
```powershell
$response = Invoke-WebRequest -Uri 'http://localhost:3001/api/equipment' `
  -UseBasicParsing `
  -Headers @{ Authorization = "Bearer $token" }

$json = $response.Content | ConvertFrom-Json
Write-Host "✅ عدد المعدات: $($json.data.length)"
```

#### 1.2 إنشاء معدة جديدة
```powershell
$equipmentBody = @{
  equipmentId = "EQ-TEST-001"
  name = "جهاز اختبار"
  category = "assessment_diagnostic"
  purchaseDate = "2026-01-22"
  purchasePrice = 1000
  supplier = "Test Supplier"
  location = @{
    building = "Main"
    floor = "1"
    room = "101"
    department = "Testing"
  }
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri 'http://localhost:3001/api/equipment' `
  -Method Post `
  -Body $equipmentBody `
  -ContentType 'application/json' `
  -UseBasicParsing `
  -Headers @{ Authorization = "Bearer $token" }

$json = $response.Content | ConvertFrom-Json
Write-Host "✅ تم إنشاء: $($json.data.equipmentId)"
```

#### 1.3 الحصول على معدة محددة
```powershell
$response = Invoke-WebRequest -Uri 'http://localhost:3001/api/equipment/EQ-TEST-001' `
  -UseBasicParsing `
  -Headers @{ Authorization = "Bearer $token" }

$json = $response.Content | ConvertFrom-Json
Write-Host "✅ المعدة: $($json.data.name)"
Write-Host "   الفئة: $($json.data.category)"
```

#### 1.4 تحديث معدة
```powershell
$updateBody = @{
  name = "جهاز اختبار محدّث"
  status = "in_maintenance"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri 'http://localhost:3001/api/equipment/EQ-TEST-001' `
  -Method Put `
  -Body $updateBody `
  -ContentType 'application/json' `
  -UseBasicParsing `
  -Headers @{ Authorization = "Bearer $token" }

Write-Host "✅ تم التحديث بنجاح"
```

### 2️⃣ **اختبار جداول الصيانة (Maintenance Schedules)**

#### 2.1 الحصول على جداول الصيانة
```powershell
$response = Invoke-WebRequest -Uri 'http://localhost:3001/api/maintenance-schedules' `
  -UseBasicParsing `
  -Headers @{ Authorization = "Bearer $token" }

$json = $response.Content | ConvertFrom-Json
Write-Host "✅ عدد جداول الصيانة: $($json.data.length)"
```

#### 2.2 جدولة صيانة جديدة
```powershell
$maintenanceBody = @{
  equipment = "EQ-TEST-001"
  scheduleType = "preventive"
  preventiveSchedule = @{
    frequency = 30
    frequencyType = "monthly"
  }
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri 'http://localhost:3001/api/maintenance-schedules' `
  -Method Post `
  -Body $maintenanceBody `
  -ContentType 'application/json' `
  -UseBasicParsing `
  -Headers @{ Authorization = "Bearer $token" }

$json = $response.Content | ConvertFrom-Json
Write-Host "✅ تم جدولة الصيانة: $($json.data._id)"
```

#### 2.3 الحصول على جداول الصيانة المتأخرة
```powershell
$response = Invoke-WebRequest -Uri 'http://localhost:3001/api/maintenance/overdue' `
  -UseBasicParsing `
  -Headers @{ Authorization = "Bearer $token" }

$json = $response.Content | ConvertFrom-Json
Write-Host "✅ عدد جداول الصيانة المتأخرة: $($json.data.length)"
```

#### 2.4 إكمال الصيانة
```powershell
$completeBody = @{
  workingHours = 8.5
  cost = 250
  findings = "جميع الأنظمة تعمل بشكل طبيعي"
  recommendations = "تحديث البرامج الثابتة"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri 'http://localhost:3001/api/maintenance/{maintenanceId}/complete' `
  -Method Post `
  -Body $completeBody `
  -ContentType 'application/json' `
  -UseBasicParsing `
  -Headers @{ Authorization = "Bearer $token" }

Write-Host "✅ تم إكمال الصيانة"
```

### 3️⃣ **اختبار نظام الإعارة (Lending)**

#### 3.1 الحصول على الإعارات
```powershell
$response = Invoke-WebRequest -Uri 'http://localhost:3001/api/lending' `
  -UseBasicParsing `
  -Headers @{ Authorization = "Bearer $token" }

$json = $response.Content | ConvertFrom-Json
Write-Host "✅ عدد الإعارات: $($json.data.length)"
```

#### 3.2 إعارة معدة
```powershell
$borrowBody = @{
  equipment = "EQ-TEST-001"
  borrower = "user123"
  expectedReturnDate = "2026-02-22"
  lendingType = "home_loan"
  borrowLocation = "Home"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri 'http://localhost:3001/api/lending/borrow' `
  -Method Post `
  -Body $borrowBody `
  -ContentType 'application/json' `
  -UseBasicParsing `
  -Headers @{ Authorization = "Bearer $token" }

$json = $response.Content | ConvertFrom-Json
$lendingId = $json.data._id
Write-Host "✅ تم الإعارة: $lendingId"
```

#### 3.3 الحصول على الإعارات المتأخرة
```powershell
$response = Invoke-WebRequest -Uri 'http://localhost:3001/api/lending/overdue' `
  -UseBasicParsing `
  -Headers @{ Authorization = "Bearer $token" }

$json = $response.Content | ConvertFrom-Json
Write-Host "✅ عدد الإعارات المتأخرة: $($json.data.length)"
```

#### 3.4 إرجاع معدة
```powershell
$returnBody = @{
  condition = "good"
  inspectionDate = "2026-02-22"
  usageHours = 24
  notes = "المعدة في حالة جيدة"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri 'http://localhost:3001/api/lending/{lendingId}/return' `
  -Method Post `
  -Body $returnBody `
  -ContentType 'application/json' `
  -UseBasicParsing `
  -Headers @{ Authorization = "Bearer $token" }

Write-Host "✅ تم الإرجاع بنجاح"
```

### 4️⃣ **اختبار سجل الأعطال (Faults)**

#### 4.1 الحصول على الأعطال
```powershell
$response = Invoke-WebRequest -Uri 'http://localhost:3001/api/faults' `
  -UseBasicParsing `
  -Headers @{ Authorization = "Bearer $token" }

$json = $response.Content | ConvertFrom-Json
Write-Host "✅ عدد الأعطال: $($json.data.length)"
```

#### 4.2 تسجيل عطل جديد
```powershell
$faultBody = @{
  equipment = "EQ-TEST-001"
  description = "الشاشة لا تعرض البيانات بشكل صحيح"
  severity = "high"
  reportedBy = "user123"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri 'http://localhost:3001/api/faults' `
  -Method Post `
  -Body $faultBody `
  -ContentType 'application/json' `
  -UseBasicParsing `
  -Headers @{ Authorization = "Bearer $token" }

$json = $response.Content | ConvertFrom-Json
Write-Host "✅ تم تسجيل العطل: $($json.data._id)"
```

#### 4.3 حل العطل
```powershell
$resolveBody = @{
  resolution = "تم استبدال الشاشة بأخرى جديدة"
  resolutionDate = "2026-01-23"
  technician = "tech123"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri 'http://localhost:3001/api/faults/{faultId}/resolve' `
  -Method Patch `
  -Body $resolveBody `
  -ContentType 'application/json' `
  -UseBasicParsing `
  -Headers @{ Authorization = "Bearer $token" }

Write-Host "✅ تم حل العطل"
```

### 5️⃣ **اختبار المعايرة (Calibration)**

#### 5.1 الحصول على سجلات المعايرة
```powershell
$response = Invoke-WebRequest -Uri 'http://localhost:3001/api/calibrations' `
  -UseBasicParsing `
  -Headers @{ Authorization = "Bearer $token" }

$json = $response.Content | ConvertFrom-Json
Write-Host "✅ عدد سجلات المعايرة: $($json.data.length)"
```

#### 5.2 إضافة معايرة جديدة
```powershell
$calibrationBody = @{
  equipment = "EQ-TEST-001"
  calibrationStandard = "ISO 13849-1"
  measurements = @(
    @{ parameter = "Accuracy"; expected = "±0.5%"; actual = "±0.48%" }
    @{ parameter = "Response Time"; expected = "<100ms"; actual = "<95ms" }
  )
  certificateNumber = "CERT-2026-001"
  calibrationDate = "2026-01-22"
  nextDueDate = "2027-01-22"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri 'http://localhost:3001/api/calibrations' `
  -Method Post `
  -Body $calibrationBody `
  -ContentType 'application/json' `
  -UseBasicParsing `
  -Headers @{ Authorization = "Bearer $token" }

Write-Host "✅ تم إضافة المعايرة"
```

### 6️⃣ **اختبار التحليلات والإحصائيات**

#### 6.1 إحصائيات لوحة التحكم
```powershell
$response = Invoke-WebRequest -Uri 'http://localhost:3001/api/equipment/dashboard/stats' `
  -UseBasicParsing `
  -Headers @{ Authorization = "Bearer $token" }

$json = $response.Content | ConvertFrom-Json
Write-Host "✅ إجمالي المعدات: $($json.data.totalEquipment)"
Write-Host "   المتاحة: $($json.data.availableEquipment)"
Write-Host "   في الصيانة: $($json.data.inMaintenanceEquipment)"
```

#### 6.2 التحليل حسب الفئة
```powershell
$response = Invoke-WebRequest -Uri 'http://localhost:3001/api/equipment/analytics/by-category' `
  -UseBasicParsing `
  -Headers @{ Authorization = "Bearer $token" }

$json = $response.Content | ConvertFrom-Json
Write-Host "✅ توزيع المعدات:"
foreach ($category in $json.data) {
  Write-Host "   $($category._id): $($category.count) معدة"
}
```

## 📊 سيناريوهات الاختبار الكاملة

### السيناريو 1: تدفق العمل الكامل
```
1. إنشاء معدة جديدة
2. جدولة صيانة لها
3. إعارة المعدة
4. تسجيل استخدام
5. إرجاع المعدة
6. إكمال الصيانة
7. عرض الإحصائيات
```

### السيناريو 2: معالجة الأعطال
```
1. تسجيل عطل جديد
2. تعيين الفني
3. متابعة الإصلاح
4. حل العطل
5. المعايرة بعد الإصلاح
```

## ✅ قائمة التحقق

- [ ] جميع endpoints تعيد 200 OK
- [ ] البيانات تُحفظ بشكل صحيح
- [ ] الأخطاء تعيد رسائل واضحة
- [ ] التفويض (Authorization) يعمل
- [ ] الحد من الطلبات (Rate Limiting) يعمل
- [ ] الأداء مقبول (< 200ms)
- [ ] لا توجد تسريبات ذاكرة
- [ ] السجلات (Logs) واضحة ومفيدة

## 🐛 معالجة الأخطاء الشائعة

```powershell
# ❌ خطأ: Token غير صحيح
Response: 401 Unauthorized
Fix: احصل على token جديد من login

# ❌ خطأ: Endpoint غير موجود
Response: 404 Not Found
Fix: تحقق من مسار الـ URL

# ❌ خطأ: بيانات غير صحيحة
Response: 422 Unprocessable Entity
Fix: تحقق من صيغة البيانات والـ validation rules

# ❌ خطأ: الخادم متوقف
Response: Connection refused
Fix: تأكد من تشغيل: npm start في backend
```

## 📝 نصائح الاختبار

1. **استخدم Postman:** أسهل طريقة لاختبار الـ API
2. **احفظ الـ Requests:** للاستخدام المستقبلي
3. **استخدم Environment Variables:** للـ URLs والـ Tokens
4. **اختبر Cases المختلفة:** النجاح والفشل
5. **راقب الأداء:** استخدم Network tab
6. **احتفظ بسجلات:** لتتبع المشاكل

---

**آخر تحديث:** January 22, 2026  
**الحالة:** TESTING GUIDE COMPLETE  
**النسخة:** 1.0

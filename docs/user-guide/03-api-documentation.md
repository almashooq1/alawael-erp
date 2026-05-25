# وثائق واجهة برمجية التطبيقات | API Documentation

**اللغة | Language:** العربية (Arabic) | English  
**آخر تحديث | Last Updated:** January 14, 2026  
**الإصدار | Version:** v1.0  
**المستوى | Level:** Advanced / للمطورين (For Developers)

---

## 📖 محتويات | Table of Contents

1. [مقدمة واجهة برمجية التطبيقات | API Overview](#مقدمة-واجهة-برمجية)
2. [المصادقة والأمان | Authentication & Security](#المصادقة-والأمان)
3. [المركبات | Vehicles Endpoints](#المركبات)
4. [المرضى | Patients Endpoints](#المرضى)
5. [الجلسات | Sessions Endpoints](#الجلسات)
6. [الوثائق | Documents Endpoints](#الوثائق)
7. [التقارير | Reports Endpoints](#التقارير)
8. [معالجة الأخطاء | Error Handling](#معالجة-الأخطاء)
9. [أمثلة عملية | Practical Examples](#أمثلة-عملية)

---

## 🌐 مقدمة واجهة برمجية التطبيقات | API Overview

### الرابط الأساسي | Base URL:

```text
https://api.rehab-system.sa/v1
أو محلي | Or locally: http://localhost:3001/api/v1
```

### نسخة واجهة برمجية التطبيقات | API Version:

```text
الإصدار الحالي | Current Version: v1.0
تاريخ الإصدار | Release Date: January 2026
الحالة | Status: Stable / مستقرة
```

### الميزات الرئيسية | Key Features:

```json
{
  "authentication": "JWT Token-based / مستند التوكن",
  "response_format": "JSON",
  "rate_limit": "1000 requests/hour",
  "timeout": "30 seconds",
  "cors": true,
  "documentation": "https://api.rehab-system.sa/docs",
  "version": "1.0",
  "sandbox": "https://sandbox-api.rehab-system.sa/v1"
}
```

---

## 🔐 المصادقة والأمان | Authentication & Security

### الحصول على التوكن | Get Authentication Token

**طريقة HTTP | HTTP Method:** `POST`  
**النقطة النهائية | Endpoint:** `/auth/login`

**الطلب | Request:**

```json
{
  "email": "user@rehab-system.sa",
  "password": "SecurePassword123!"
}
```

**الرد | Response (200 OK):**

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_123",
    "name": "أحمد محمد | Ahmed Mohammed",
    "email": "user@rehab-system.sa",
    "role": "therapist"
  },
  "expires_in": 3600,
  "refresh_token": "refresh_token_here"
}
```

### استخدام التوكن | Using the Token

**في كل طلب | In every request:**

```text
رأس المصادقة | Authorization Header:
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

مثال cURL | cURL Example:
curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://api.rehab-system.sa/v1/vehicles
```

### مفاتيح API | API Keys

**للتطبيقات | For Applications:**

```text
معرف التطبيق | App ID: app_production_123
مفتاح API | API Key: sk_live_a1b2c3d4e5f6...

الاستخدام | Usage:
Header: X-API-Key: sk_live_a1b2c3d4e5f6...
```

### سياسة الأمان | Security Policy

```text
✓ جميع الطلبات يجب أن تكون عبر HTTPS
✓ All requests must be over HTTPS

✓ التوكن ينتهي بعد ساعة | Token expires after 1 hour

✓ استخدم Refresh Token لتجديد الجلسة
✓ Use Refresh Token to renew session

✓ لا تشارك مفاتيح API | Never share API keys

✓ تغيير كلمات المرور دورياً | Change passwords regularly

✓ تفعيل المصادقة الثنائية | Enable two-factor authentication
```

---

## 🚗 المركبات | Vehicles Endpoints

### الحصول على قائمة المركبات | Get All Vehicles

**طريقة HTTP | HTTP Method:** `GET`  
**النقطة النهائية | Endpoint:** `/vehicles`  
**المصادقة | Authentication:** Required ✓

**معاملات الطلب | Query Parameters:**

```text
page: رقم الصفحة (افتراضي: 1) | Page number (default: 1)
limit: عدد النتائج (افتراضي: 20، الحد الأقصى: 100)
       Number of results (default: 20, max: 100)
sort: ترتيب النتائج (name, date, status)
      Sort field (name, date, status)
filter: البحث عن نصوص معينة | Filter search text
status: حالة المركبة (active, inactive, archived)
```

**الرد | Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "vehicle_001",
      "name": "مركبة رقم 1 | Vehicle #1",
      "type": "Wheelchair / كرسي متحرك",
      "status": "active",
      "make": "Brand Name",
      "model": "Model 2025",
      "serialNumber": "SN-123456",
      "purchaseDate": "2025-01-01",
      "condition": "excellent",
      "maintenanceStatus": "up-to-date",
      "assignedPatient": "patient_123",
      "lastMaintenance": "2026-01-10",
      "nextMaintenanceSchedule": "2026-04-10",
      "createdAt": "2025-01-01T10:00:00Z",
      "updatedAt": "2026-01-14T15:30:00Z"
    },
    {
      /* المزيد من المركبات | more vehicles */
    }
  ],
  "pagination": {
    "total": 150,
    "pages": 8,
    "currentPage": 1,
    "limit": 20
  }
}
```

### إضافة مركبة جديدة | Create Vehicle

**طريقة HTTP | HTTP Method:** `POST`  
**النقطة النهائية | Endpoint:** `/vehicles`  
**المصادقة | Authentication:** Required ✓  
**الأدوار المطلوبة | Required Roles:** Admin, Manager

**جسم الطلب | Request Body:**

```json
{
  "name": "مركبة جديدة | New Vehicle",
  "type": "wheelchair",
  "make": "Brand Name",
  "model": "Model 2025",
  "serialNumber": "SN-987654",
  "purchaseDate": "2026-01-14",
  "condition": "excellent",
  "cost": 5000,
  "currency": "SAR",
  "notes": "ملاحظات | Notes about the vehicle"
}
```

**الرد | Response (201 Created):**

```json
{
  "success": true,
  "message": "تم إنشاء المركبة بنجاح | Vehicle created successfully",
  "data": {
    "id": "vehicle_new_123",
    "name": "مركبة جديدة | New Vehicle",
    "status": "active",
    "createdAt": "2026-01-14T16:00:00Z"
  }
}
```

### تحديث بيانات مركبة | Update Vehicle

**طريقة HTTP | HTTP Method:** `PUT`  
**النقطة النهائية | Endpoint:** `/vehicles/{id}`  
**المصادقة | Authentication:** Required ✓

**جسم الطلب | Request Body:**

```json
{
  "name": "اسم جديد | Updated Name",
  "condition": "good",
  "status": "maintenance",
  "notes": "ملاحظات محدثة | Updated notes"
}
```

**الرد | Response (200 OK):**

```json
{
  "success": true,
  "message": "تم تحديث المركبة | Vehicle updated",
  "data": {
    "id": "vehicle_001",
    "updated_fields": ["condition", "status", "notes"],
    "updatedAt": "2026-01-14T16:15:00Z"
  }
}
```

### حذف مركبة | Delete Vehicle

**طريقة HTTP | HTTP Method:** `DELETE`  
**النقطة النهائية | Endpoint:** `/vehicles/{id}`  
**المصادقة | Authentication:** Required ✓  
**الأدوار المطلوبة | Required Roles:** Admin

**الرد | Response (200 OK):**

```json
{
  "success": true,
  "message": "تم حذف المركبة | Vehicle deleted successfully",
  "data": {
    "id": "vehicle_001",
    "deletedAt": "2026-01-14T16:20:00Z"
  }
}
```

---

## 👥 المرضى | Patients Endpoints

### الحصول على المرضى | Get All Patients

**طريقة HTTP | HTTP Method:** `GET`  
**النقطة النهائية | Endpoint:** `/patients`  
**المصادقة | Authentication:** Required ✓

**معاملات الطلب | Query Parameters:**

```text
page: رقم الصفحة | Page number
limit: عدد النتائج | Results limit
search: البحث بالاسم أو الرقم الطبي | Search by name or ID
status: النشط أو المغلق | active or inactive
branchId: الفرع | Branch filter
```

**الرد | Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "patient_001",
      "name": "محمد أحمد | Mohammed Ahmed",
      "nationalId": "1234567890",
      "medicalId": "MED-001-2026",
      "phone": "+966-50-1234567",
      "email": "patient@email.com",
      "dateOfBirth": "1980-01-15",
      "gender": "male",
      "diagnosis": "Physical rehabilitation needed / إعادة تأهيل بدني",
      "status": "active",
      "assignedTherapist": "therapist_001",
      "admissionDate": "2025-01-01",
      "createdAt": "2025-01-01T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 250,
    "pages": 13,
    "currentPage": 1,
    "limit": 20
  }
}
```

### إضافة مريض جديد | Create Patient

**طريقة HTTP | HTTP Method:** `POST`  
**النقطة النهائية | Endpoint:** `/patients`

**جسم الطلب | Request Body:**

```json
{
  "name": "اسم المريض | Patient Name",
  "nationalId": "1234567890",
  "phone": "+966-50-1234567",
  "email": "patient@email.com",
  "dateOfBirth": "1980-01-15",
  "gender": "male",
  "diagnosis": "Physical rehabilitation",
  "notes": "ملاحظات طبية | Medical notes"
}
```

---

## 📅 الجلسات | Sessions Endpoints

### الحصول على الجلسات | Get Sessions

**طريقة HTTP | HTTP Method:** `GET`  
**النقطة النهائية | Endpoint:** `/sessions`

**معاملات الطلب | Query Parameters:**

```text
patientId: معرّف المريض | Patient ID
therapistId: معرّف المعالج | Therapist ID
dateFrom: من تاريخ | From date
dateTo: إلى تاريخ | To date
status: completed, scheduled, cancelled
```

**الرد | Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "session_001",
      "patientId": "patient_001",
      "therapistId": "therapist_001",
      "title": "جلسة علاج فيزيائي | Physical Therapy Session",
      "type": "rehabilitation",
      "scheduledTime": "2026-01-15T10:00:00Z",
      "duration": 60,
      "status": "scheduled",
      "location": "قاعة العلاج 1 | Therapy Room 1",
      "notes": "ملاحظات الجلسة | Session notes",
      "createdAt": "2026-01-14T15:00:00Z"
    }
  ]
}
```

### إنشاء جلسة جديدة | Create Session

**طريقة HTTP | HTTP Method:** `POST`  
**النقطة النهائية | Endpoint:** `/sessions`

**جسم الطلب | Request Body:**

```json
{
  "patientId": "patient_001",
  "therapistId": "therapist_001",
  "title": "جلسة علاج جديدة | New Therapy Session",
  "type": "rehabilitation",
  "scheduledTime": "2026-01-15T10:00:00Z",
  "duration": 60,
  "location": "قاعة العلاج 1 | Therapy Room 1",
  "notes": "ملاحظات | Notes"
}
```

---

## 📄 الوثائق | Documents Endpoints

### الحصول على الوثائق | Get Documents

**طريقة HTTP | HTTP Method:** `GET`  
**النقطة النهائية | Endpoint:** `/documents`

**معاملات الطلب | Query Parameters:**

```text
page: رقم الصفحة | Page number
limit: عدد النتائج | Results limit
fileType: نوع الملف | File type (pdf, doc, image, etc)
dateFrom: من تاريخ | From date
dateTo: إلى تاريخ | To date
category: تصنيف الوثيقة | Document category
tags: البحث عن وسوم | Search tags
```

**الرد | Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "doc_001",
      "name": "تقرير طبي | Medical Report",
      "fileName": "report_2026_01.pdf",
      "fileType": "application/pdf",
      "fileSize": 2048576,
      "category": "medical_report",
      "tags": ["x-ray", "follow-up", "important"],
      "uploadedBy": "doctor_001",
      "uploadedAt": "2026-01-14T14:30:00Z",
      "url": "https://api.rehab-system.sa/v1/documents/doc_001/download",
      "previewUrl": "https://api.rehab-system.sa/v1/documents/doc_001/preview"
    }
  ],
  "pagination": {
    "total": 500,
    "pages": 25,
    "currentPage": 1
  }
}
```

### رفع وثيقة | Upload Document

**طريقة HTTP | HTTP Method:** `POST`  
**النقطة النهائية | Endpoint:** `/documents/upload`  
**نوع المحتوى | Content-Type:** `multipart/form-data`

**معاملات الطلب | Form Parameters:**

```text
file: الملف المراد رفعه | File to upload
title: عنوان الوثيقة | Document title
category: التصنيف | Category
tags: الوسوم (اختياري) | Tags (optional)
relatedEntity: المرتبط بـ | Related to (patientId, etc)
```

**الرد | Response (201 Created):**

```json
{
  "success": true,
  "message": "تم رفع الوثيقة بنجاح | Document uploaded successfully",
  "data": {
    "id": "doc_new_001",
    "name": "document_name.pdf",
    "fileSize": 2048576,
    "uploadedAt": "2026-01-14T16:00:00Z",
    "url": "https://api.rehab-system.sa/v1/documents/doc_new_001"
  }
}
```

### تحميل وثيقة | Download Document

**طريقة HTTP | HTTP Method:** `GET`  
**النقطة النهائية | Endpoint:** `/documents/{id}/download`

**الرد | Response (200 OK):**

```text
الملف مرفق في الرد | File attached in response
Content-Type: يعتمد على نوع الملف | Depends on file type
Content-Disposition: attachment; filename="document.pdf"
```

---

## 📊 التقارير | Reports Endpoints

### الحصول على التقارير | Get Reports

**طريقة HTTP | HTTP Method:** `GET`  
**النقطة النهائية | Endpoint:** `/reports`

**معاملات الطلب | Query Parameters:**

```text
type: نوع التقرير | Report type (performance, financial, compliance)
dateFrom: من تاريخ | From date
dateTo: إلى تاريخ | To date
branchId: الفرع | Branch filter
format: تنسيق التقرير | Report format (json, pdf, excel)
```

**الرد | Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "reportType": "performance",
    "generatedAt": "2026-01-14T16:00:00Z",
    "period": {
      "from": "2025-12-14",
      "to": "2026-01-14"
    },
    "summary": {
      "totalSessions": 250,
      "completedSessions": 245,
      "completionRate": 98,
      "averageRating": 4.8,
      "totalPatients": 150,
      "activeTherapists": 25
    },
    "details": [
      {
        "therapist": "أحمد محمد | Ahmed Mohammed",
        "sessions": 45,
        "completed": 44,
        "rating": 4.9,
        "patientsSatisfaction": "98%"
      }
    ]
  }
}
```

---

## ⚠️ معالجة الأخطاء | Error Handling

### رموز الأخطاء | Error Codes:

```json
{
  "400": {
    "message": "Bad Request / طلب غير صحيح",
    "reason": "بيانات الطلب غير صحيحة | Invalid request data"
  },
  "401": {
    "message": "Unauthorized / غير مصرح",
    "reason": "توكن غير صحيح أو منتهي | Invalid or expired token"
  },
  "403": {
    "message": "Forbidden / ممنوع",
    "reason": "ليس لديك صلاحيات | Insufficient permissions"
  },
  "404": {
    "message": "Not Found / غير موجود",
    "reason": "المورد غير موجود | Resource not found"
  },
  "409": {
    "message": "Conflict / تضارب",
    "reason": "البيانات موجودة بالفعل | Data already exists"
  },
  "429": {
    "message": "Too Many Requests / عدد طلبات كبير جداً",
    "reason": "تم تجاوز حد الطلبات | Rate limit exceeded"
  },
  "500": {
    "message": "Internal Server Error / خطأ في الخادم",
    "reason": "خطأ في النظام | Server error"
  }
}
```

### مثال على رسالة خطأ | Error Response Example:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_EMAIL",
    "message": "البريد الإلكتروني غير صحيح | Invalid email format",
    "details": {
      "field": "email",
      "value": "invalid-email",
      "expected": "valid@email.com"
    },
    "timestamp": "2026-01-14T16:00:00Z"
  }
}
```

---

## 💡 أمثلة عملية | Practical Examples

### مثال 1: تسجيل الدخول والحصول على البيانات | Login and Get Data

**JavaScript/Node.js:**

```javascript
// تسجيل الدخول | Login
const loginResponse = await fetch('https://api.rehab-system.sa/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@rehab-system.sa',
    password: 'SecurePassword123!',
  }),
});

const { token } = await loginResponse.json();

// الحصول على المركبات | Get vehicles
const vehiclesResponse = await fetch('https://api.rehab-system.sa/v1/vehicles?limit=10', {
  headers: { Authorization: `Bearer ${token}` },
});

const vehicles = await vehiclesResponse.json();
console.log(vehicles.data);
```

**Python:**

```python
import requests

# تسجيل الدخول | Login
response = requests.post(
    'https://api.rehab-system.sa/v1/auth/login',
    json={
        'email': 'user@rehab-system.sa',
        'password': 'SecurePassword123!'
    }
)
token = response.json()['token']

# الحصول على المركبات | Get vehicles
headers = {'Authorization': f'Bearer {token}'}
vehicles = requests.get(
    'https://api.rehab-system.sa/v1/vehicles',
    headers=headers
).json()

print(vehicles['data'])
```

### مثال 2: رفع وثيقة | Upload Document

**JavaScript:**

```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('title', 'تقرير طبي | Medical Report');
formData.append('category', 'medical_report');
formData.append('tags', 'x-ray,follow-up');

const response = await fetch('https://api.rehab-system.sa/v1/documents/upload', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: formData,
});

const result = await response.json();
console.log('Document uploaded:', result.data.id);
```

---

**آخر تحديث | Last Updated:** January 14, 2026  
**الإصدار | Version:** 1.0  
**الحالة | Status:** Stable / مستقرة

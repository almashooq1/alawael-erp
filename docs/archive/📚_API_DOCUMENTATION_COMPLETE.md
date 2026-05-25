# 📚 شامل توثيق API والـ Endpoints

**التاريخ**: يناير 17, 2026  
**الأولوية**: 🔴 CRITICAL  
**النسخة**: 2.0 - كاملة

---

## 🌐 معلومات API الأساسية

```text
Base URL (Development):  http://localhost:3001/api
Base URL (Production):   https://alawael.com/api
API Version:             v1
Authentication:          JWT Bearer Token
Response Format:         JSON
Content-Type:            application/json
```

---

## 🔐 المصادقة والتفويض

### Authentication Header

```text
Authorization: Bearer <JWT_TOKEN>
```

### JWT Token Structure

```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user_id",
    "username": "username",
    "email": "user@example.com",
    "role": "user",
    "iat": 1673986800,
    "exp": 1673990400
  }
}
```

---

## 📋 Endpoints - المصادقة

### 1. تسجيل دخول برمجي (Email)

**Endpoint:**

```text
POST /auth/login
```

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "rememberMe": true
}
```

**Response Success (200):**

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "username",
      "email": "user@example.com",
      "role": "user",
      "first_name": "أحمد",
      "last_name": "محمد",
      "avatar_url": "https://api.example.com/avatars/1.jpg"
    },
    "expiresIn": 3600
  }
}
```

**Response Error (401/422):**

```json
{
  "success": false,
  "error": "Invalid credentials",
  "code": "INVALID_CREDENTIALS",
  "message": "البريد الإلكتروني أو كلمة المرور غير صحيحة"
}
```

---

### 2. تسجيل دخول برقم الهاتف

**Endpoint:**

```text
POST /auth/login-phone
```

**Request Body:**

```json
{
  "phone": "+966501234567",
  "password": "SecurePassword123!",
  "countryCode": "SA"
}
```

**Response:** مشابه لـ Email Login

---

### 3. تسجيل دخول برقم الهوية

**Endpoint:**

```text
POST /auth/login-id
```

**Request Body:**

```json
{
  "idNumber": "1234567890",
  "password": "SecurePassword123!"
}
```

**Response:** مشابه لـ Email Login

---

### 4. تسجيل دخول ذكي (Smart Login)

**Endpoint:**

```text
POST /auth/smart-login
```

**Request Body:**

```json
{
  "identifier": "user@example.com",
  "password": "SecurePassword123!",
  "fingerprint": "device-fingerprint-hash"
}
```

**Response:** مشابه لـ Email Login

---

### 5. التحقق من المصادقة الثنائية (2FA)

**Endpoint:**

```text
POST /auth/verify-2fa
```

**Request Body:**

```json
{
  "sessionId": "session-token",
  "code": "123456",
  "method": "totp"
}
```

**Response Success (200):**

```json
{
  "success": true,
  "data": {
    "token": "JWT-TOKEN",
    "refreshToken": "REFRESH-TOKEN",
    "user": {...}
  }
}
```

---

### 6. تعيين 2FA

**Endpoint:**

```text
POST /auth/setup-2fa
```

**Headers:**

```text
Authorization: Bearer <JWT_TOKEN>
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "qrCode": "data:image/png;base64,...",
    "secret": "JBSWY3DPEBLW64TMMQ======",
    "backupCodes": ["123456", "654321", ...]
  }
}
```

---

### 7. تفعيل 2FA

**Endpoint:**

```text
POST /auth/enable-2fa
```

**Request Body:**

```json
{
  "code": "123456",
  "secret": "JBSWY3DPEBLW64TMMQ======"
}
```

---

### 8. تسجيل الخروج

**Endpoint:**

```text
POST /auth/logout
```

**Headers:**

```text
Authorization: Bearer <JWT_TOKEN>
```

**Response (200):**

```json
{
  "success": true,
  "message": "تم تسجيل الخروج بنجاح"
}
```

---

### 9. تحديث Token

**Endpoint:**

```text
POST /auth/refresh-token
```

**Request Body:**

```json
{
  "refreshToken": "REFRESH-TOKEN"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "token": "NEW-JWT-TOKEN",
    "expiresIn": 3600
  }
}
```

---

### 10. إعادة تعيين كلمة المرور

**Endpoint:**

```text
POST /auth/forgot-password
```

**Request Body:**

```json
{
  "email": "user@example.com"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "تم إرسال رابط إعادة تعيين إلى بريدك الإلكتروني"
}
```

---

### 11. تأكيد إعادة تعيين كلمة المرور

**Endpoint:**

```text
POST /auth/reset-password
```

**Request Body:**

```json
{
  "token": "reset-token-from-email",
  "newPassword": "NewSecurePassword123!"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "تم تعيين كلمة المرور بنجاح"
}
```

---

## 👤 Endpoints - المستخدمون

### 12. الحصول على بيانات المستخدم الحالي

**Endpoint:**

```text
GET /users/me
```

**Headers:**

```text
Authorization: Bearer <JWT_TOKEN>
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "username",
    "email": "user@example.com",
    "phone": "+966501234567",
    "idNumber": "1234567890",
    "role": "user",
    "status": "active",
    "firstName": "أحمد",
    "lastName": "محمد",
    "avatarUrl": "https://api.example.com/avatars/1.jpg",
    "emailVerified": true,
    "phoneVerified": true,
    "createdAt": "2024-01-15T10:30:00Z",
    "lastLoginAt": "2024-01-17T14:20:00Z",
    "twoFactorEnabled": true
  }
}
```

---

### 13. تحديث بيانات المستخدم

**Endpoint:**

```text
PUT /users/profile
```

**Headers:**

```text
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body:**

```json
{
  "firstName": "أحمد",
  "lastName": "محمد",
  "phone": "+966501234567",
  "avatarUrl": "https://example.com/avatar.jpg"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "تم تحديث البيانات بنجاح",
  "data": {...}
}
```

---

### 14. تغيير كلمة المرور

**Endpoint:**

```text
POST /users/change-password
```

**Headers:**

```text
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**

```json
{
  "currentPassword": "CurrentPassword123!",
  "newPassword": "NewPassword123!",
  "confirmPassword": "NewPassword123!"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "تم تغيير كلمة المرور بنجاح"
}
```

---

### 15. قائمة المستخدمين (Admin Only)

**Endpoint:**

```text
GET /users?page=1&limit=20&role=user&status=active
```

**Headers:**

```text
Authorization: Bearer <JWT_TOKEN>
```

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "username": "user1",
      "email": "user1@example.com",
      "role": "user",
      "status": "active",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

---

## 🏥 Endpoints - الصحة والفحص

### 16. فحص صحة النظام

**Endpoint:**

```text
GET /health
```

**Response (200):**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-17T14:30:00Z",
  "uptime": 432000,
  "services": {
    "database": "connected",
    "redis": "connected",
    "email": "operational"
  },
  "version": "2.0.0"
}
```

---

### 17. الإحصائيات العامة

**Endpoint:**

```text
GET /stats
```

**Headers:**

```text
Authorization: Bearer <JWT_TOKEN>
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "totalUsers": 1250,
    "activeUsers": 450,
    "newUsersToday": 25,
    "systemUptime": 99.9,
    "averageResponseTime": 120
  }
}
```

---

## 🔍 معايير الاستجابة

### Success Response (200-299)

```json
{
  "success": true,
  "data": {...},
  "message": "العملية نجحت",
  "code": "SUCCESS"
}
```

### Error Response (400-599)

```json
{
  "success": false,
  "error": "Error type",
  "message": "رسالة خطأ واضحة",
  "code": "ERROR_CODE",
  "details": {...},
  "timestamp": "2024-01-17T14:30:00Z"
}
```

---

## 🔢 رموز الأخطاء (Error Codes)

```text
200 OK                    - العملية نجحت
201 Created               - تم الإنشاء بنجاح
400 Bad Request           - طلب غير صحيح
401 Unauthorized          - غير مصرح
403 Forbidden             - غير مسموح
404 Not Found             - غير موجود
422 Unprocessable Entity  - بيانات غير صحيحة
429 Too Many Requests     - عدد طلبات كثير
500 Internal Server Error - خطأ في الخادم
503 Service Unavailable   - الخدمة غير متاحة
```

---

## 📊 معدل الحد (Rate Limiting)

```text
عام:                    100 requests / 15 minutes
المصادقة:                5 attempts / 15 minutes
API العام:              500 requests / hour
API Premium:            5000 requests / hour
```

---

## 🧪 أمثلة التطبيق

### مثال 1: التسجيل والدخول الكامل

```bash
# 1. تسجيل الدخول
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Password123!"}'

# الرد يحتوي على token

# 2. استخدام Token للدخول للـ API
curl -X GET http://localhost:3001/api/users/me \
  -H "Authorization: Bearer <TOKEN>"

# 3. تحديث البيانات
curl -X PUT http://localhost:3001/api/users/profile \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Ahmed","lastName":"Mohammad"}'
```

---

## 📖 الوثائق التفاعلية (Swagger)

```text
URL: https://alawael.com/api/docs
```

في Swagger يمكنك:

- اختبار جميع الـ Endpoints مباشرة
- رؤية نماذج Request/Response
- عرض جميع المعاملات

---

## ✅ قائمة فحص الـ API

```text
☐ جميع endpoints موثقة
☐ جميع الأخطاء المحتملة موثقة
☐ أمثلة طلبات موجودة
☐ أمثلة استجابات موجودة
☐ معدلات الحد موثقة
☐ متطلبات Authentication واضحة
☐ Swagger/OpenAPI موجود
☐ جميع الحقول موثقة
☐ جميع رموز الأخطاء موثقة
```

---

**الحالة**: ✅ جاهز للاستخدام الفوري  
**آخر تحديث**: يناير 17, 2026

# API Documentation | توثيق الـ API

## 📚 Overview | نظرة عامة

This document provides comprehensive API documentation for the AlAwael ERP
System.

**Base URL**: `http://localhost:5000/api`  
**Authentication**: Bearer Token (JWT)

---

## 🔐 Authentication Endpoints

### 1. User Login | تسجيل الدخول

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response 200 OK:**

```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "admin"
  }
}
```

### 2. User Registration | تسجيل مستخدم جديد

```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "role": "employee"
}
```

### 3. Refresh Token | تحديث التوكن

```http
POST /api/auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### 4. Logout | تسجيل الخروج

```http
POST /api/auth/logout
Authorization: Bearer {token}
```

---

## 👥 User Management Endpoints

### 1. Get All Users | الحصول على جميع المستخدمين

```http
GET /api/users
Authorization: Bearer {token}
```

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `role` (optional): Filter by role (admin, manager, employee)
- `search` (optional): Search by name or email

**Response 200 OK:**

```json
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "admin",
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "pages": 5
  }
}
```

### 2. Get User by ID | الحصول على مستخدم بالمعرف

```http
GET /api/users/:id
Authorization: Bearer {token}
```

### 3. Update User | تحديث مستخدم

```http
PUT /api/users/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Jane Doe",
  "role": "manager"
}
```

### 4. Delete User | حذف مستخدم

```http
DELETE /api/users/:id
Authorization: Bearer {token}
```

---

## 🏢 HR Management Endpoints

### 1. Attendance

#### Clock In | تسجيل الحضور

```http
POST /api/hr/attendance/clock-in
Authorization: Bearer {token}
Content-Type: application/json

{
  "location": "Office",
  "notes": "On time"
}
```

#### Clock Out | تسجيل الانصراف

```http
POST /api/hr/attendance/clock-out
Authorization: Bearer {token}
Content-Type: application/json

{
  "notes": "End of day"
}
```

#### Get Attendance Records | سجلات الحضور

```http
GET /api/hr/attendance?startDate=2026-01-01&endDate=2026-01-31
Authorization: Bearer {token}
```

### 2. Leave Management

#### Request Leave | طلب إجازة

```http
POST /api/hr/leave/request
Authorization: Bearer {token}
Content-Type: application/json

{
  "type": "annual",
  "startDate": "2026-02-01",
  "endDate": "2026-02-05",
  "reason": "Personal vacation"
}
```

#### Approve Leave | الموافقة على الإجازة

```http
PUT /api/hr/leave/:id/approve
Authorization: Bearer {token}
Content-Type: application/json

{
  "approved": true,
  "comments": "Approved for annual leave"
}
```

---

## 💰 Finance Endpoints

### 1. Create Invoice | إنشاء فاتورة

```http
POST /api/finance/invoices
Authorization: Bearer {token}
Content-Type: application/json

{
  "customerId": "507f1f77bcf86cd799439011",
  "items": [
    {
      "description": "Service A",
      "quantity": 2,
      "price": 100.00
    }
  ],
  "dueDate": "2026-02-01",
  "notes": "Payment due in 30 days"
}
```

### 2. Get Financial Reports | التقارير المالية

```http
GET /api/finance/reports?type=monthly&year=2026&month=1
Authorization: Bearer {token}
```

---

## 📊 Error Responses | الأخطاء

### 400 Bad Request

```json
{
  "success": false,
  "error": "Invalid input data",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### 401 Unauthorized

```json
{
  "success": false,
  "error": "Authentication required",
  "message": "Please provide a valid token"
}
```

### 403 Forbidden

```json
{
  "success": false,
  "error": "Access denied",
  "message": "You don't have permission to access this resource"
}
```

### 404 Not Found

```json
{
  "success": false,
  "error": "Resource not found",
  "message": "The requested resource does not exist"
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "error": "Internal server error",
  "message": "An unexpected error occurred"
}
```

---

## 🔒 Authentication | المصادقة

All authenticated endpoints require a Bearer token in the Authorization header:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Token Expiration:**

- Access Token: 24 hours
- Refresh Token: 7 days

---

## 📝 Rate Limiting | حدود الاستخدام

API endpoints are rate-limited to prevent abuse:

- **Standard endpoints**: 100 requests per 15 minutes
- **Authentication endpoints**: 5 requests per 15 minutes
- **Bulk operations**: 20 requests per hour

**Rate Limit Headers:**

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
```

---

## 🌐 Internationalization | اللغات

The API supports bilingual responses. Use the `Accept-Language` header:

```http
Accept-Language: ar
```

or

```http
Accept-Language: en
```

---

## 📚 Additional Resources | موارد إضافية

- [Postman Collection](./postman/alawael-erp.postman_collection.json)
- [API Changelog](../CHANGELOG.md)
- [Security Policy](../SECURITY.md)
- [Contributing Guide](../CONTRIBUTING.md)

---

**Last Updated:** January 18, 2026  
**API Version:** 2.1.0

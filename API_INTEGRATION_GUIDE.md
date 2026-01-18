/\*\*

- API Integration Guide
- دليل تكامل API
-
- Complete guide for integrating with Enterprise Management System APIs
  \*/

# 📚 API Integration Guide - Complete Reference

## 🔐 Authentication

### 1. Register New User

```bash
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "أحمد",
  "lastName": "محمد"
}

Response (201):
{
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "firstName": "أحمد"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 2. Login

```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}

Response (200):
{
  "user": { ... },
  "token": "jwt_token_here",
  "expiresIn": 604800
}
```

### 3. Using Authentication Token

```bash
GET /api/v1/users
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

Response (200):
{
  "users": [...],
  "total": 150
}
```

---

## 👤 User Management

### Get All Users

```bash
GET /api/v1/users
Authorization: Bearer {token}

Query Parameters:
- page=1
- limit=10
- search="أحمد"
- role="manager"

Response (200):
{
  "users": [
    {
      "_id": "user_123",
      "email": "user@example.com",
      "firstName": "أحمد",
      "role": "manager",
      "isActive": true
    }
  ],
  "total": 150,
  "page": 1
}
```

### Get User by ID

```bash
GET /api/v1/users/:id
Authorization: Bearer {token}

Response (200):
{
  "_id": "user_123",
  "email": "user@example.com",
  "firstName": "أحمد",
  "lastName": "محمد",
  "phone": "+966-50-123-4567",
  "role": "manager",
  "permissions": ["read", "write", "delete"],
  "createdAt": "2026-01-10T10:00:00Z"
}
```

### Update User

```bash
PUT /api/v1/users/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "firstName": "محمود",
  "phone": "+966-50-999-8888",
  "avatar": "https://cdn.example.com/avatars/user.jpg"
}

Response (200):
{
  "message": "User updated successfully",
  "user": { ... }
}
```

---

## 📄 Document Management

### Get All Documents

```bash
GET /api/v1/documents
Authorization: Bearer {token}

Query Parameters:
- folder="Documents"
- status="published"
- tags="مهم"

Response (200):
{
  "documents": [
    {
      "_id": "doc_123",
      "title": "مستند مهم",
      "owner": "user_123",
      "status": "published",
      "createdAt": "2026-01-15T10:00:00Z",
      "fileSize": 1024000,
      "tags": ["مهم", "عمل"]
    }
  ],
  "total": 50
}
```

### Create Document

```bash
POST /api/v1/documents
Authorization: Bearer {token}
Content-Type: multipart/form-data

Parameters:
- title="اسم المستند"
- description="وصف المستند"
- folder="Documents"
- tags="مهم,عمل"
- file=<binary>

Response (201):
{
  "message": "Document created",
  "document": {
    "_id": "doc_124",
    "title": "اسم المستند",
    "fileUrl": "/uploads/document.pdf"
  }
}
```

### Update Document

```bash
PUT /api/v1/documents/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "عنوان محدث",
  "description": "وصف محدث",
  "status": "published"
}

Response (200):
{
  "message": "Document updated",
  "document": { ... }
}
```

### Delete Document

```bash
DELETE /api/v1/documents/:id
Authorization: Bearer {token}

Response (200):
{
  "message": "Document deleted successfully"
}
```

---

## 📊 Projects

### Get All Projects

```bash
GET /api/v1/projects
Authorization: Bearer {token}

Response (200):
{
  "projects": [
    {
      "_id": "proj_123",
      "name": "نظام الإدارة",
      "status": "in-progress",
      "progress": 75,
      "budget": 150000,
      "spent": 75000
    }
  ],
  "total": 10
}
```

### Create Project

```bash
POST /api/v1/projects
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "مشروع جديد",
  "description": "وصف المشروع",
  "budget": 200000,
  "startDate": "2026-02-01T00:00:00Z",
  "endDate": "2026-04-01T00:00:00Z",
  "team": ["user_123", "user_124"]
}

Response (201):
{
  "message": "Project created",
  "project": {
    "_id": "proj_125",
    "name": "مشروع جديد",
    "status": "planned"
  }
}
```

### Add Task to Project

```bash
POST /api/v1/projects/:id/tasks
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "مهمة 1",
  "priority": "high",
  "dueDate": "2026-02-15T00:00:00Z",
  "assignedTo": "user_123"
}

Response (201):
{
  "message": "Task added",
  "task": {
    "id": "TASK1234567890",
    "title": "مهمة 1",
    "status": "new"
  }
}
```

---

## 👥 Employee Management

### Get All Employees

```bash
GET /api/v1/employees
Authorization: Bearer {token}

Response (200):
{
  "employees": [
    {
      "_id": "emp_123",
      "employeeId": "EMP001",
      "userId": "user_123",
      "department": "تطوير البرامج",
      "position": "مطور أول",
      "salary": 8000,
      "status": "active"
    }
  ],
  "total": 50
}
```

### Create Employee

```bash
POST /api/v1/employees
Authorization: Bearer {token}
Content-Type: application/json

{
  "userId": "user_123",
  "employeeId": "EMP001",
  "department": "تطوير البرامج",
  "position": "مطور أول",
  "salary": 8000,
  "joinDate": "2026-01-01T00:00:00Z"
}

Response (201):
{
  "message": "Employee created",
  "employee": { ... }
}
```

### Record Attendance

```bash
POST /api/v1/employees/:id/attendance
Authorization: Bearer {token}
Content-Type: application/json

{
  "checkIn": "2026-01-16T09:00:00Z",
  "checkOut": "2026-01-16T17:00:00Z",
  "status": "present"
}

Response (200):
{
  "message": "Attendance recorded",
  "attendance": [...]
}
```

---

## 🤝 Customer Management

### Get All Customers

```bash
GET /api/v1/customers
Authorization: Bearer {token}

Query Parameters:
- status="active"
- search="أحمد"

Response (200):
{
  "customers": [
    {
      "_id": "cust_123",
      "name": "أحمد العبدالله",
      "email": "ahmad@example.com",
      "phone": "+966-50-123-4567",
      "status": "active",
      "totalPurchases": 25000
    }
  ],
  "total": 150
}
```

### Create Customer

```bash
POST /api/v1/customers
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "عميل جديد",
  "email": "customer@example.com",
  "phone": "+966-50-123-4567",
  "company": "شركة عميل",
  "address": "الرياض، السعودية"
}

Response (201):
{
  "message": "Customer created",
  "customer": { ... }
}
```

---

## 📦 Product Management

### Get All Products

```bash
GET /api/v1/products
Authorization: Bearer {token}

Query Parameters:
- category="الإلكترونيات"
- status="active"

Response (200):
{
  "products": [
    {
      "_id": "prod_123",
      "name": "لاب توب",
      "sku": "LAPTOP-001",
      "price": 15000,
      "stock": 50,
      "category": "الإلكترونيات"
    }
  ],
  "total": 200
}
```

### Create Product

```bash
POST /api/v1/products
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "منتج جديد",
  "sku": "SKU-001",
  "description": "وصف المنتج",
  "price": 1000,
  "category": "الإلكترونيات",
  "stock": 100,
  "minStock": 10,
  "maxStock": 500
}

Response (201):
{
  "message": "Product created",
  "product": { ... }
}
```

---

## 🏥 Health Check

### Server Health Status

```bash
GET /api/v1/health
Content-Type: application/json

Response (200):
{
  "status": "OK",
  "timestamp": "2026-01-16T10:00:00Z",
  "uptime": 3600,
  "environment": "production"
}
```

---

## ❌ Error Handling

### Common Error Responses

#### 400 Bad Request

```json
{
  "error": "Invalid request",
  "details": {
    "email": "Email is required"
  }
}
```

#### 401 Unauthorized

```json
{
  "error": "Unauthorized",
  "message": "Access token required or invalid"
}
```

#### 403 Forbidden

```json
{
  "error": "Forbidden",
  "message": "You don't have permission to access this resource"
}
```

#### 404 Not Found

```json
{
  "error": "Not found",
  "message": "Resource not found"
}
```

#### 500 Internal Server Error

```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred"
}
```

---

## 🔄 Pagination Example

All list endpoints support pagination:

```bash
GET /api/v1/documents?page=2&limit=20
Authorization: Bearer {token}

Response (200):
{
  "documents": [...],
  "total": 150,
  "page": 2,
  "pages": 8,
  "limit": 20
}
```

---

## 🔐 Rate Limiting

API enforces rate limiting:

- **Default:** 100 requests per 15 minutes
- **Headers:**
  ```
  X-RateLimit-Limit: 100
  X-RateLimit-Remaining: 95
  X-RateLimit-Reset: 1642341600
  ```

---

## ✅ Best Practices

1. **Always include Authorization header** with valid JWT token
2. **Handle errors gracefully** and retry on 5xx errors
3. **Use pagination** for large datasets
4. **Cache responses** when appropriate
5. **Validate input** before sending requests
6. **Never expose tokens** in client-side code
7. **Use HTTPS** in production
8. **Keep tokens secure** and refresh regularly

---

## 📞 Support

For API issues or questions:

- Email: api-support@enterprise-system.com
- Documentation: https://docs.enterprise-system.com
- Status: https://status.enterprise-system.com

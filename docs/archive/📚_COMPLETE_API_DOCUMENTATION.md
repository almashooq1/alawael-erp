# 📚 توثيق API الشامل - نظام إدارة العلاقات والموارد

**آخر تحديث:** 16 يناير 2026  
**الإصدار:** 2.0.0

---

## 📋 جدول المحتويات

1. [Authentication APIs](#authentication-apis)
2. [User Management APIs](#user-management-apis)
3. [HR & Employee APIs](#hr--employee-apis)
4. [CRM & Customer APIs](#crm--customer-apis)
5. [E-Learning APIs](#e-learning-apis)
6. [Communication APIs (Email & SMS)](#communication-apis)
7. [Document Management APIs](#document-management-apis)
8. [Finance & Billing APIs](#finance--billing-apis)
9. [Analytics & Reports APIs](#analytics--reports-apis)
10. [Admin & Settings APIs](#admin--settings-apis)

---

## 🔐 Authentication APIs

### 1. User Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "_id": "user_id",
    "username": "admin",
    "email": "admin@example.com",
    "role": "admin",
    "fullName": "Administrator"
  }
}
```

**Demo Credentials:**

- Admin: `admin` / `admin123`
- Manager: `manager` / `manager123`
- Employee: `employee` / `employee123`

---

### 2. User Registration

```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "newuser",
  "email": "user@example.com",
  "password": "password123",
  "fullName": "User Full Name"
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "_id": "new_user_id",
    "username": "newuser",
    "email": "user@example.com",
    "role": "user"
  }
}
```

---

### 3. Verify Token

```http
GET /api/auth/verify
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "success": true,
  "valid": true,
  "user": { ... }
}
```

---

## 👥 User Management APIs

### 1. Get All Users

```http
GET /api/users
Authorization: Bearer <token>
```

**Query Parameters:**

- `role`: Filter by role (admin, manager, employee)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "user_id",
      "username": "user1",
      "email": "user1@example.com",
      "fullName": "User One",
      "role": "employee",
      "department": "Sales",
      "phone": "+966501234567"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25
  }
}
```

---

### 2. Get User by ID

```http
GET /api/users/:id
Authorization: Bearer <token>
```

---

### 3. Update User

```http
PUT /api/users/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "newemail@example.com",
  "fullName": "Updated Name",
  "department": "IT"
}
```

---

### 4. Delete User

```http
DELETE /api/users/:id
Authorization: Bearer <token>
```

---

## 👨‍💼 HR & Employee APIs

### 1. Get All Employees

```http
GET /api/hr/employees
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "emp_id",
      "fullName": "Ahmed Ali",
      "email": "ahmed@example.com",
      "phone": "+966501234567",
      "department": "IT",
      "position": "Senior Developer",
      "salary": 12000,
      "hireDate": "2024-01-15",
      "status": "active"
    }
  ],
  "total": 45
}
```

---

### 2. Add New Employee

```http
POST /api/hr/employees
Authorization: Bearer <token>
Content-Type: application/json

{
  "fullName": "Muhammad Hassan",
  "email": "muhammad@example.com",
  "phone": "+966501234568",
  "department": "HR",
  "position": "HR Manager",
  "salary": 15000,
  "hireDate": "2026-01-16"
}
```

---

### 3. Update Employee

```http
PUT /api/hr/employees/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "position": "Lead Developer",
  "salary": 14000
}
```

---

### 4. Delete Employee

```http
DELETE /api/hr/employees/:id
Authorization: Bearer <token>
```

---

## 🎯 CRM & Customer APIs

### 1. Get All Customers

```http
GET /api/crm/customers
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "cust_id",
      "name": "ABC Company",
      "email": "contact@abc.com",
      "phone": "+966501234567",
      "company": "ABC Corp",
      "address": "Riyadh, Saudi Arabia",
      "status": "active",
      "createdAt": "2025-12-01T10:00:00Z"
    }
  ],
  "total": 156
}
```

---

### 2. Add New Customer

```http
POST /api/crm/customers
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "John Smith",
  "email": "john@company.com",
  "phone": "+966501234569",
  "company": "Smith Industries",
  "address": "Jeddah, Saudi Arabia"
}
```

---

### 3. Get Customer Leads

```http
GET /api/crm/leads
Authorization: Bearer <token>
```

---

### 4. Create Sales Opportunity

```http
POST /api/crm/opportunities
Authorization: Bearer <token>
Content-Type: application/json

{
  "customerId": "cust_id",
  "title": "Project Alpha",
  "value": 50000,
  "stage": "proposal",
  "expectedCloseDate": "2026-03-16"
}
```

---

## 📚 E-Learning APIs

### 1. Get All Courses

```http
GET /api/elearning/courses
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "course_id",
      "title": "Advanced JavaScript",
      "description": "Master JavaScript programming",
      "instructor": "Ahmed Al-Rashid",
      "duration": 40,
      "level": "advanced",
      "enrolledCount": 234,
      "rating": 4.8,
      "image": "course_image.jpg"
    }
  ],
  "total": 28
}
```

---

### 2. Enroll in Course

```http
POST /api/elearning/enroll
Authorization: Bearer <token>
Content-Type: application/json

{
  "courseId": "course_id"
}
```

---

### 3. Get Enrolled Courses

```http
GET /api/elearning/my-courses
Authorization: Bearer <token>
```

---

### 4. Submit Course Lesson

```http
POST /api/elearning/lessons/:lessonId/submit
Authorization: Bearer <token>
Content-Type: application/json

{
  "answers": [
    { "questionId": "q1", "answer": "A" },
    { "questionId": "q2", "answer": "B" }
  ]
}
```

---

## 📧 Communication APIs

### Email Service

#### 1. Send Email

```http
POST /api/email/send
Authorization: Bearer <token>
Content-Type: application/json

{
  "to": "recipient@example.com",
  "subject": "Welcome",
  "html": "<h1>Welcome to our system</h1>"
}
```

**Response (200):**

```json
{
  "success": true,
  "messageId": "msg_123456",
  "message": "Email sent successfully"
}
```

---

#### 2. Send Email with Template

```http
POST /api/email/send-welcome
Authorization: Bearer <token>
Content-Type: application/json

{
  "to": "newuser@example.com",
  "fullName": "Ahmed Ali",
  "email": "newuser@example.com"
}
```

**Available Templates:**

- `welcomeEmail` - Welcome new user
- `passwordReset` - Password reset link
- `emailVerification` - Email verification
- `employeeNotification` - Employee notification
- `invoiceEmail` - Invoice/Bill
- `reportEmail` - Report delivery
- `notificationEmail` - General notification

---

#### 3. Send Bulk Email

```http
POST /api/email/send-bulk
Authorization: Bearer <token>
Content-Type: application/json

{
  "recipients": [
    "user1@example.com",
    "user2@example.com",
    "user3@example.com"
  ],
  "templateName": "welcomeEmail",
  "data": {
    "fullName": "Multiple Users"
  }
}
```

---

#### 4. Verify Email Service

```http
POST /api/email/verify
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "success": true,
  "message": "Email service is working correctly",
  "status": "operational"
}
```

---

### SMS Service

#### 1. Send SMS

```http
POST /api/sms/send
Authorization: Bearer <token>
Content-Type: application/json

{
  "toNumber": "+966501234567",
  "message": "Hello, this is a test SMS"
}
```

**Response (200):**

```json
{
  "success": true,
  "messageId": "sms_123456",
  "message": "SMS sent successfully"
}
```

---

#### 2. Send SMS with Template

```http
POST /api/sms/send-template
Authorization: Bearer <token>
Content-Type: application/json

{
  "toNumber": "+966501234567",
  "templateName": "verificationCode",
  "data": {
    "code": "123456"
  }
}
```

**Available Templates:**

- `verificationCode` - OTP verification
- `employeeAlert` - Employee notification
- `orderConfirmation` - Order confirmation
- `deliveryNotification` - Delivery update
- `paymentReminder` - Payment reminder
- `securityAlert` - Security alert
- `courseReminder` - Course reminder
- `appointmentReminder` - Appointment reminder

---

#### 3. Send Bulk SMS

```http
POST /api/sms/send-bulk
Authorization: Bearer <token>
Content-Type: application/json

{
  "recipients": [
    "+966501234567",
    "+966501234568",
    "+966501234569"
  ],
  "message": "System maintenance on Jan 20, 2026"
}
```

---

#### 4. Check SMS Balance

```http
GET /api/sms/balance
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "success": true,
  "balance": 5000,
  "provider": "Twilio",
  "currency": "USD"
}
```

---

#### 5. Get SMS Templates

```http
GET /api/sms/templates
Authorization: Bearer <token>
```

---

## 📄 Document Management APIs

### 1. Upload Document

```http
POST /api/documents/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

- file: <binary file>
- category: "contracts"
- description: "Employee contract"
```

**Response (201):**

```json
{
  "success": true,
  "file": {
    "_id": "doc_id",
    "filename": "contract_2026.pdf",
    "category": "contracts",
    "size": 245632,
    "uploadedAt": "2026-01-16T10:30:00Z"
  }
}
```

---

### 2. Get All Documents

```http
GET /api/documents
Authorization: Bearer <token>
```

**Query Parameters:**

- `category`: Filter by category
- `search`: Search by filename
- `page`: Page number
- `limit`: Items per page

---

### 3. Download Document

```http
GET /api/documents/:id/download
Authorization: Bearer <token>
```

---

### 4. Delete Document

```http
DELETE /api/documents/:id
Authorization: Bearer <token>
```

---

## 💰 Finance & Billing APIs

### 1. Get All Invoices

```http
GET /api/finance/invoices
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "inv_id",
      "invoiceNumber": "INV-2026-001",
      "customerId": "cust_id",
      "amount": 5000,
      "status": "paid",
      "dueDate": "2026-02-16",
      "createdAt": "2026-01-16"
    }
  ],
  "total": 156
}
```

---

### 2. Create Invoice

```http
POST /api/finance/invoices
Authorization: Bearer <token>
Content-Type: application/json

{
  "customerId": "cust_id",
  "items": [
    {
      "description": "Service A",
      "quantity": 2,
      "unitPrice": 1000
    }
  ],
  "dueDate": "2026-02-16"
}
```

---

### 3. Get Purchase Orders

```http
GET /api/finance/purchase-orders
Authorization: Bearer <token>
```

---

### 4. Create Payment

```http
POST /api/finance/payments
Authorization: Bearer <token>
Content-Type: application/json

{
  "invoiceId": "inv_id",
  "amount": 5000,
  "paymentMethod": "bank_transfer",
  "reference": "TRX123456"
}
```

---

## 📊 Analytics & Reports APIs

### 1. Get Dashboard KPIs

```http
GET /api/analytics/kpis
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "totalUsers": 245,
    "activeEmployees": 156,
    "totalRevenue": 1250000,
    "pendingInvoices": 45,
    "enrolledStudents": 892,
    "courseCompletion": 78.5
  }
}
```

---

### 2. Get Sales Report

```http
GET /api/reports/sales
Authorization: Bearer <token>
```

**Query Parameters:**

- `startDate`: YYYY-MM-DD
- `endDate`: YYYY-MM-DD
- `department`: Filter by department

---

### 3. Get Employee Analytics

```http
GET /api/analytics/employees
Authorization: Bearer <token>
```

---

### 4. Get Learning Analytics

```http
GET /api/analytics/learning
Authorization: Bearer <token>
```

---

## ⚙️ Admin & Settings APIs

### 1. Get System Settings

```http
GET /api/admin/settings
Authorization: Bearer <token>
```

---

### 2. Update System Settings

```http
PUT /api/admin/settings
Authorization: Bearer <token>
Content-Type: application/json

{
  "companyName": "New Company Name",
  "email": "admin@newcompany.com",
  "phone": "+966501234567",
  "timezone": "Asia/Riyadh"
}
```

---

### 3. Get Audit Log

```http
GET /api/admin/audit-log
Authorization: Bearer <token>
```

**Query Parameters:**

- `action`: Filter by action type
- `user`: Filter by user
- `startDate`: Start date
- `endDate`: End date

---

### 4. Get System Health

```http
GET /api/health
```

**Response (200):**

```json
{
  "status": "operational",
  "timestamp": "2026-01-16T14:30:00Z",
  "components": {
    "database": "connected",
    "cache": "connected",
    "email": "operational",
    "sms": "operational"
  }
}
```

---

## 🔑 Authorization & Security

### Role-Based Access Control

- **Admin**: Full access to all endpoints
- **Manager**: Access to HR, CRM, Reports, Finance
- **Employee**: Access to personal data, courses, documents
- **User**: Limited access to public endpoints

### Bearer Token Usage

All endpoints (except login/register) require authentication:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 📈 Pagination

List endpoints support pagination:

```http
GET /api/endpoint?page=1&limit=20
```

**Response:**

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "pages": 8
  }
}
```

---

## ❌ Error Responses

### 400 Bad Request

```json
{
  "success": false,
  "error": "Validation error",
  "details": "Email is required"
}
```

### 401 Unauthorized

```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Invalid or missing token"
}
```

### 403 Forbidden

```json
{
  "success": false,
  "error": "Forbidden",
  "message": "You don't have permission to access this resource"
}
```

### 404 Not Found

```json
{
  "success": false,
  "error": "Not Found",
  "message": "Resource not found"
}
```

### 500 Server Error

```json
{
  "success": false,
  "error": "Server Error",
  "message": "An unexpected error occurred"
}
```

---

## 🚀 Getting Started

1. **Access API Documentation**: `http://localhost:3001/api-docs`
2. **Base URL**: `http://localhost:3001`
3. **Test Login**: Use demo credentials above
4. **Get Token**: Login and copy the JWT token
5. **Make Requests**: Include token in Authorization header

---

## 📞 Support

For issues or questions:

- Email: support@example.com
- Phone: +966 (0) 1234 5678
- Documentation: [Full API Docs](http://localhost:3001/api-docs)

---

**Last Updated:** 16 يناير 2026  
**API Version:** 2.0.0  
**Status:** ✅ Operational

# 📋 **QUICK API REFERENCE - PHASE 4**

## 🔑 Authentication Endpoints

### Register User

```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "أحمد محمد",
  "email": "ahmed@example.com",
  "password": "SecurePass123!",
  "passwordConfirm": "SecurePass123!"
}
```

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "ahmed@example.com",
  "password": "SecurePass123!"
}

Response:
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGc...",
  "user": { ... }
}
```

### Verify Token

```http
POST /api/auth/verify-token
Authorization: Bearer eyJhbGc...
```

### Enable 2FA

```http
POST /api/auth/enable-2fa
Content-Type: application/json

{
  "userId": "USER_001"
}
```

---

## 👥 User Management Endpoints

### Get All Users

```http
GET /api/users?role=admin&department=IT&status=active
```

### Create User

```http
POST /api/users
Content-Type: application/json

{
  "name": "محمد علي",
  "email": "mohammed@example.com",
  "role": "manager",
  "department": "HR"
}
```

### Update User Status

```http
PATCH /api/users/USER_001/status
Content-Type: application/json

{
  "status": "active"
}
```

### Export Users

```http
GET /api/users/export/csv
```

### Search Users

```http
GET /api/users/search/query?q=أحمد
```

---

## 🔐 RBAC Endpoints

### Get All Roles

```http
GET /api/rbac/roles
```

### Check Permission

```http
POST /api/rbac/check-permission
Content-Type: application/json

{
  "userRole": "admin",
  "requiredPermission": "delete"
}
```

### Add Permission to Role

```http
POST /api/rbac/roles/manager/permissions
Content-Type: application/json

{
  "permission": "export"
}
```

### Check Access

```http
POST /api/rbac/check-access
Content-Type: application/json

{
  "userId": "USER_001",
  "resource": "reports",
  "action": "delete"
}
```

---

## 📊 Analytics Endpoints

### Get User Behavior

```http
GET /api/analytics/user-behavior/USER_001
```

### Get Performance Metrics

```http
GET /api/analytics/performance-metrics?timeRange=24h
```

### Get Dashboard

```http
GET /api/analytics/dashboard/USER_001
```

### Get Trends

```http
GET /api/analytics/trends/sales?period=30d
```

### Track Conversion

```http
POST /api/analytics/track-conversion
Content-Type: application/json

{
  "userId": "USER_001",
  "event": "report_generated"
}
```

### Generate Report

```http
POST /api/analytics/generate-report
Content-Type: application/json

{
  "reportType": "executive"
}
```

### Get Real-time Analytics

```http
GET /api/analytics/real-time
```

---

## 📝 CMS Endpoints

### Get Pages

```http
GET /api/cms/pages?status=published
```

### Get Page by Slug

```http
GET /api/cms/pages/home
```

### Create Page

```http
POST /api/cms/pages
Content-Type: application/json

{
  "title": "عنوان الصفحة",
  "slug": "page-slug",
  "content": "محتوى الصفحة",
  "author": "Ahmed Admin"
}
```

### Publish Page

```http
POST /api/cms/pages/PAGE_001/publish
```

### Get Posts

```http
GET /api/cms/posts?category=News
```

### Get Comments

```http
GET /api/cms/pages/PAGE_001/comments
```

### Approve Comment

```http
POST /api/cms/comments/COMMENT_001/approve
```

### Upload Media

```http
POST /api/cms/media/upload
Content-Type: application/json

{
  "name": "image.png",
  "type": "image",
  "size": 512000
}
```

### Get Categories

```http
GET /api/cms/categories
```

### Schedule Content

```http
POST /api/cms/schedule
Content-Type: application/json

{
  "contentId": "PAGE_001",
  "publishDate": "2026-01-25T10:00:00Z"
}
```

---

## 🔄 Common Response Format

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful",
  "timestamp": "2026-01-20T12:30:45.123Z"
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error description",
  "error": "error_code",
  "statusCode": 400
}
```

---

## 🔒 Authentication Headers

All authenticated endpoints require:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 📊 Status Codes

| Code | Meaning                              |
| ---- | ------------------------------------ |
| 200  | OK - Request successful              |
| 201  | Created - Resource created           |
| 400  | Bad Request - Invalid data           |
| 401  | Unauthorized - Missing/invalid token |
| 403  | Forbidden - Insufficient permissions |
| 404  | Not Found - Resource doesn't exist   |
| 500  | Server Error - Internal error        |

---

## 🧪 Testing Quick Commands

### Using cURL

#### Register

```bash
curl -X POST http://localhost:3005/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "Test123!",
    "passwordConfirm": "Test123!"
  }'
```

#### Login

```bash
curl -X POST http://localhost:3005/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!"
  }'
```

#### Get Users

```bash
curl -X GET http://localhost:3005/api/users \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Get Roles

```bash
curl -X GET http://localhost:3005/api/rbac/roles
```

#### Get Analytics

```bash
curl -X GET http://localhost:3005/api/analytics/real-time
```

---

## 📈 Rate Limits & Quotas

- **Authentication**: 5 attempts per minute per IP
- **API Calls**: 1000 per hour per user
- **File Uploads**: 100MB max per file
- **Batch Operations**: 1000 items max

---

## 🛠️ Troubleshooting

### 401 Unauthorized

- Token is missing or invalid
- Token has expired
- User doesn't have permission

### 403 Forbidden

- User lacks required permissions/role
- Resource access denied
- RBAC rules prevent access

### 404 Not Found

- Endpoint doesn't exist
- Resource not found
- Wrong method (GET vs POST)

### 500 Server Error

- Internal server error
- Database connection issue
- Unhandled exception

---

## 📚 Documentation Links

- Complete API Docs: `/api/docs`
- Postman Collection: `./postman-collection.json`
- OpenAPI/Swagger: `/api/swagger.json`

---

**Last Updated:** January 20, 2026 **API Version:** 1.0.0 **Total Endpoints:**
117

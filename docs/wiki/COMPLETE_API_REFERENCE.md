# 📖 Complete API Reference Documentation

**Version:** 1.0.0  
**Date:** February 24, 2026  
**Status:** Production Ready

---

## 🌍 API Overview

### Base URL

```
Development: http://localhost:5000/api
Production: https://api.alawael.com/api
```

### Authentication

All requests (except login) require:
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

### Response Format

All responses follow this format:
```json
{
  "success": true,
  "data": { /* actual data */ },
  "message": "Optional success message",
  "timestamp": "2026-02-24T12:00:00Z"
}
```

Error responses:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": [ /* validation errors */ ]
  },
  "timestamp": "2026-02-24T12:00:00Z"
}
```

---

## 🔐 Authentication Endpoints

### POST /auth/login

**Login with email and password**

Request:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

Response (200):
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "User Name",
      "role": "user"
    }
  }
}
```

---

### POST /auth/register

**Register a new user**

Request:
```json
{
  "email": "newuser@example.com",
  "password": "SecurePassword123!",
  "name": "New User",
  "organization": "Company Name"
}
```

Response (201):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "newuser@example.com",
      "name": "New User"
    }
  }
}
```

---

### POST /auth/refresh

**Refresh expired token**

Request:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Response (200):
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### POST /auth/logout

**Logout (invalidate token)**

Response (200):
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### POST /auth/forgot-password

**Request password reset**

Request:
```json
{
  "email": "user@example.com"
}
```

Response (200):
```json
{
  "success": true,
  "message": "Reset link sent to email"
}
```

---

### POST /auth/reset-password

**Reset password with token**

Request:
```json
{
  "token": "reset-token-from-email",
  "newPassword": "NewPassword123!"
}
```

Response (200):
```json
{
  "success": true,
  "message": "Password reset successful"
}
```

---

## 👥 User Endpoints

### GET /users

**List all users (admin only)**

Query Parameters:
```
?page=1&limit=20&search=john&role=user&status=active
```

Response (200):
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "uuid",
        "email": "user@example.com",
        "name": "User Name",
        "role": "user",
        "status": "active",
        "createdAt": "2026-02-01T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    }
  }
}
```

---

### GET /users/:id

**Get user by ID**

Response (200):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name",
    "role": "user",
    "phone": "+1234567890",
    "address": "123 Main St",
    "department": "Engineering",
    "manager": "manager@example.com",
    "createdAt": "2026-02-01T10:00:00Z",
    "updatedAt": "2026-02-24T12:00:00Z"
  }
}
```

---

### POST /users

**Create new user (admin only)**

Request:
```json
{
  "email": "newuser@example.com",
  "password": "SecurePassword123!",
  "name": "New User",
  "role": "user",
  "phone": "+1234567890",
  "department": "Engineering"
}
```

Response (201):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "newuser@example.com",
    "name": "New User"
  }
}
```

---

### PUT /users/:id

**Update user**

Request:
```json
{
  "name": "Updated Name",
  "phone": "+1234567890",
  "department": "Sales"
}
```

Response (200):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "Updated Name"
  }
}
```

---

### DELETE /users/:id

**Delete user (admin only)**

Response (200):
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

---

### GET /users/me

**Get current user profile**

Response (200):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name",
    "role": "user"
  }
}
```

---

### PUT /users/me/password

**Change own password**

Request:
```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword123!"
}
```

Response (200):
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

## 📊 Dashboard Endpoints

### GET /dashboard

**Get dashboard summary**

Query Parameters:
```
?startDate=2026-02-01&endDate=2026-02-24&metrics=revenue,users,orders
```

Response (200):
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalRevenue": 150000,
      "totalUsers": 5432,
      "totalOrders": 890,
      "activeUsers": 234
    },
    "charts": {
      "revenue": [
        {
          "date": "2026-02-01",
          "value": 5000
        }
      ],
      "users": [
        {
          "date": "2026-02-01",
          "value": 150
        }
      ]
    }
  }
}
```

---

### GET /dashboard/:dashboard_id

**Get custom dashboard**

Response (200):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Sales Dashboard",
    "widgets": [
      {
        "id": "widget-1",
        "type": "chart",
        "title": "Monthly Revenue",
        "data": {}
      }
    ]
  }
}
```

---

## 📈 Analytics Endpoints

### GET /analytics/reports

**List available reports**

Response (200):
```json
{
  "success": true,
  "data": {
    "reports": [
      {
        "id": "report-1",
        "name": "Monthly Sales Report",
        "description": "Sales data by region",
        "frequency": "monthly",
        "lastRun": "2026-02-01T10:00:00Z"
      }
    ]
  }
}
```

---

### GET /analytics/reports/:report_id

**Generate report**

Query Parameters:
```
?startDate=2026-02-01&endDate=2026-02-24&format=json
```

Response (200):
```json
{
  "success": true,
  "data": {
    "reportId": "uuid",
    "name": "Monthly Sales Report",
    "generatedAt": "2026-02-24T12:00:00Z",
    "data": [
      {
        "region": "North",
        "revenue": 50000,
        "orders": 200
      }
    ]
  }
}
```

---

### POST /analytics/reports/:report_id/export

**Export report to file**

Request:
```json
{
  "format": "pdf",
  "includeCharts": true
}
```

Response (200):
```
File download (PDF/Excel/CSV)
```

---

## 🏢 Organization Endpoints

### GET /organizations

**List organizations**

Response (200):
```json
{
  "success": true,
  "data": {
    "organizations": [
      {
        "id": "uuid",
        "name": "Company Name",
        "industry": "Technology",
        "size": "Medium",
        "createdAt": "2026-02-01T10:00:00Z"
      }
    ]
  }
}
```

---

### POST /organizations

**Create organization**

Request:
```json
{
  "name": "New Company",
  "industry": "Technology",
  "size": "Small",
  "website": "https://example.com"
}
```

Response (201):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "New Company"
  }
}
```

---

### PUT /organizations/:id

**Update organization**

Request:
```json
{
  "name": "Updated Company Name",
  "industry": "Finance"
}
```

Response (200):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Updated Company Name"
  }
}
```

---

## ⚙️ System Endpoints

### GET /system/health

**Health check (no auth required)**

Response (200):
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "uptime": 3600,
    "timestamp": "2026-02-24T12:00:00Z"
  }
}
```

---

### GET /system/health/detailed

**Detailed health with dependencies**

Response (200):
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "services": {
      "database": {
        "status": "healthy",
        "responseTime": 12
      },
      "cache": {
        "status": "healthy",
        "responseTime": 5
      },
      "email": {
        "status": "healthy"
      }
    }
  }
}
```

---

### GET /system/metrics

**System metrics**

Response (200):
```json
{
  "success": true,
  "data": {
    "cpu": {
      "usage": 45,
      "available": 8
    },
    "memory": {
      "used": 4096,
      "total": 8192
    },
    "disk": {
      "used": 50,
      "total": 200
    },
    "requests": {
      "perSecond": 250,
      "total": 1000000
    },
    "errors": {
      "rate": 0.1,
      "total": 1000
    }
  }
}
```

---

### GET /system/version

**Get system version (no auth required)**

Response (200):
```json
{
  "success": true,
  "data": {
    "version": "1.0.0",
    "name": "ALAWAEL ERP",
    "apiVersion": "v1",
    "buildDate": "2026-02-24",
    "environment": "production"
  }
}
```

---

## 📝 Common Usage Examples

### Example 1: Complete Login & User Fetch

```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"pass"}' \
  | jq -r '.data.token')

echo "Token: $TOKEN"

# 2. Fetch user profile
curl -s -X GET http://localhost:5000/api/users/me \
  -H "Authorization: Bearer $TOKEN" | jq

# 3. Update profile
curl -s -X PUT http://localhost:5000/api/users/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"New Name"}' | jq
```

---

### Example 2: Paginated List with Search

```bash
# Fetch users page by page
curl -s -X GET "http://localhost:5000/api/users?page=1&limit=20&search=john&role=user" \
  -H "Authorization: Bearer $TOKEN" | jq '.data.pagination'

# Result:
# {
#   "page": 1,
#   "limit": 20,
#   "total": 150,
#   "pages": 8
# }
```

---

### Example 3: Generate & Export Report

```bash
# Generate report
REPORT=$(curl -s -X GET \
  "http://localhost:5000/api/analytics/reports/report-1?startDate=2026-02-01&endDate=2026-02-24&format=json" \
  -H "Authorization: Bearer $TOKEN")

# Export to PDF
curl -s -X POST http://localhost:5000/api/analytics/reports/report-1/export \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"format":"pdf"}' \
  -o report.pdf
```

---

## 🔄 Pagination

All list endpoints support pagination:

```
GET /api/resource?page=1&limit=20&sort=name&order=asc
```

Parameters:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `sort`: Field to sort by (default: createdAt)
- `order`: asc or desc (default: desc)

Response includes:
```json
{
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

---

## ⚠️ Error Codes

| Code | HTTP | Description |
|------|------|-----------|
| BAD_REQUEST | 400 | Invalid input or malformed request |
| UNAUTHORIZED | 401 | Missing or invalid authentication token |
| FORBIDDEN | 403 | Authenticated but lacks permission |
| NOT_FOUND | 404 | Resource doesn't exist |
| CONFLICT | 409 | Resource already exists |
| VALIDATION_ERROR | 422 | Data validation failed |
| RATE_LIMITED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Server error |
| SERVICE_UNAVAILABLE | 503 | Service temporarily unavailable |

---

## 🚀 Rate Limiting

Rate limits are enforced per IP and per user:

Response headers:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1708689600
```

If exceeded (429):
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests",
    "retryAfter": 60
  }
}
```

---

## 📚 SDK & Client Libraries

### JavaScript/Node.js
```bash
npm install alawael-sdk
```

```javascript
const Alawael = require('alawael-sdk');
const client = new Alawael({
  apiKey: 'your-api-key',
  baseURL: 'https://api.alawael.com'
});

const users = await client.users.list();
```

---

### Python
```bash
pip install alawael-sdk
```

```python
from alawael import Alawael

client = Alawael(api_key='your-api-key')
users = client.users.list()
```

---

### cURL
See examples above

---

**Status:** Production Ready  
**Last Updated:** February 24, 2026


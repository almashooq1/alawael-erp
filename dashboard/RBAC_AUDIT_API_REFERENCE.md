# Phase 13 - Week 1: RBAC & Audit API Reference

## 🌐 Base URL
```
http://localhost:3001/api
```

## 🔐 Authentication
All endpoints require JWT authentication via Bearer token:
```
Authorization: Bearer <your_jwt_token>
```

---

## 🛡️ RBAC Endpoints

### GET /api/rbac/roles
Get all available roles with their configurations.

**Authorization:** Any authenticated user

**Response:**
```json
{
  "success": true,
  "roles": [
    {
      "name": "ADMIN",
      "level": 100,
      "permissions": ["read:all", "write:all", "delete:all", "manage:users", "manage:roles"]
    },
    {
      "name": "QUALITY_MANAGER",
      "level": 80,
      "permissions": ["read:quality", "write:quality", "read:reports", "write:reports", "manage:teams"]
    }
  ]
}
```

---

### GET /api/rbac/role/:roleName
Get specific role configuration.

**Authorization:** Any authenticated user

**Parameters:**
- `roleName` (path) - Role name (ADMIN, QUALITY_MANAGER, etc.)

**Response:**
```json
{
  "success": true,
  "role": "QUALITY_MANAGER",
  "config": {
    "name": "QUALITY_MANAGER",
    "level": 80,
    "permissions": ["read:quality", "write:quality", "read:reports", "write:reports", "manage:teams"]
  }
}
```

---

### GET /api/rbac/permissions
Get all available permissions.

**Authorization:** Any authenticated user

**Response:**
```json
{
  "success": true,
  "permissions": [
    "read:all",
    "write:all",
    "delete:all",
    "manage:users",
    "manage:roles",
    "read:quality",
    "write:quality",
    "read:reports",
    "write:reports",
    "manage:teams",
    "read:team",
    "manage:team_members",
    "read:public"
  ],
  "hierarchy": {
    "read:all": ["read:quality", "read:reports", "read:team", "read:public"],
    "write:all": ["write:quality", "write:reports"],
    "delete:all": ["delete:quality", "delete:reports"],
    "manage:users": ["read:users", "write:users", "delete:users"],
    "manage:roles": ["read:roles", "write:roles"]
  }
}
```

---

### POST /api/rbac/check-permission
Check if user has specific permission.

**Authorization:** Any authenticated user

**Request Body:**
```json
{
  "permission": "write:quality"
}
```

**Response:**
```json
{
  "success": true,
  "hasPermission": true,
  "user": {
    "id": 1,
    "role": "QUALITY_MANAGER",
    "roleLevel": 80
  }
}
```

---

### POST /api/rbac/check-access
Check if role can access resource with permission.

**Authorization:** Any authenticated user

**Request Body:**
```json
{
  "role": "ANALYST",
  "permission": "write:quality"
}
```

**Response:**
```json
{
  "success": true,
  "canAccess": true,
  "role": "ANALYST",
  "permission": "write:quality"
}
```

---

## 📋 Audit Log Endpoints

### POST /api/audit/auth
Log authentication event.

**Authorization:** Any authenticated user

**Request Body:**
```json
{
  "action": "LOGIN",
  "success": true,
  "details": {
    "ipAddress": "192.168.1.100",
    "userAgent": "Mozilla/5.0"
  }
}
```

**Response:**
```json
{
  "success": true,
  "event": {
    "timestamp": "2026-03-02T10:30:00.000Z",
    "category": "AUTHENTICATION",
    "userId": 1,
    "email": "user@alawael.com",
    "action": "LOGIN",
    "success": true,
    "severity": "INFO"
  }
}
```

---

### POST /api/audit/authorization
Log authorization event (permission check).

**Authorization:** Any authenticated user

**Request Body:**
```json
{
  "action": "ACCESS_DENIED",
  "resource": "/admin/users",
  "allowed": false,
  "reason": "Insufficient permissions",
  "details": {
    "requiredRole": "ADMIN",
    "userRole": "VIEWER"
  }
}
```

**Response:**
```json
{
  "success": true,
  "event": {
    "timestamp": "2026-03-02T10:30:00.000Z",
    "category": "AUTHORIZATION",
    "userId": 1,
    "action": "ACCESS_DENIED",
    "resource": "/admin/users",
    "allowed": false,
    "reason": "Insufficient permissions",
    "severity": "WARNING"
  }
}
```

---

### POST /api/audit/data-access
Log data access event (CRUD operations).

**Authorization:** Any authenticated user

**Request Body:**
```json
{
  "action": "UPDATE",
  "resource": "quality_metrics",
  "dataType": "quality_data",
  "recordCount": 1,
  "details": {
    "recordId": 123,
    "fields": ["defect_rate", "status"]
  }
}
```

**Actions:** READ, WRITE, UPDATE, DELETE, BULK_READ, BULK_WRITE, BULK_DELETE

**Response:**
```json
{
  "success": true,
  "event": {
    "timestamp": "2026-03-02T10:30:00.000Z",
    "category": "DATA_ACCESS",
    "userId": 1,
    "action": "UPDATE",
    "resource": "quality_metrics",
    "dataType": "quality_data",
    "recordCount": 1,
    "severity": "WARNING"
  }
}
```

---

### POST /api/audit/config-change
Log configuration change.

**Authorization:** Requires `manage:config` permission

**Request Body:**
```json
{
  "configKey": "quality.threshold",
  "oldValue": "95",
  "newValue": "98",
  "reason": "Increased quality standards",
  "details": {
    "section": "quality_settings",
    "environment": "production"
  }
}
```

**Response:**
```json
{
  "success": true,
  "event": {
    "timestamp": "2026-03-02T10:30:00.000Z",
    "category": "CONFIG_CHANGE",
    "userId": 1,
    "configKey": "quality.threshold",
    "oldValue": "95",
    "newValue": "98",
    "reason": "Increased quality standards",
    "severity": "INFO"
  }
}
```

---

### POST /api/audit/security-event
Log security event (intrusion, threats).

**Authorization:** Any authenticated user (auto-logged for security events)

**Request Body:**
```json
{
  "severity": "HIGH",
  "type": "INTRUSION_ATTEMPT",
  "description": "Multiple failed login attempts",
  "details": {
    "ipAddress": "10.0.0.50",
    "attempts": 5,
    "timeWindow": "5 minutes"
  }
}
```

**Severities:** CRITICAL, HIGH, MEDIUM, LOW, INFO

**Response:**
```json
{
  "success": true,
  "event": {
    "timestamp": "2026-03-02T10:30:00.000Z",
    "category": "SECURITY",
    "userId": null,
    "severity": "HIGH",
    "type": "INTRUSION_ATTEMPT",
    "description": "Multiple failed login attempts"
  }
}
```

---

### POST /api/audit/api-call
Log API call (for monitoring).

**Authorization:** Internal (auto-logged by middleware)

**Request Body:**
```json
{
  "method": "POST",
  "endpoint": "/api/quality/metrics",
  "statusCode": 200,
  "duration": 45,
  "details": {
    "queryParams": {},
    "bodySize": 1024
  }
}
```

**Response:**
```json
{
  "success": true,
  "event": {
    "timestamp": "2026-03-02T10:30:00.000Z",
    "category": "API_CALL",
    "userId": 1,
    "method": "POST",
    "endpoint": "/api/quality/metrics",
    "statusCode": 200,
    "duration": 45,
    "severity": "INFO"
  }
}
```

---

### GET /api/audit/logs
Query audit logs with filters.

**Authorization:** Requires `read:audit` permission

**Query Parameters:**
- `category` (string, optional) - Filter by category (AUTHENTICATION, AUTHORIZATION, etc.)
- `userId` (number, optional) - Filter by user ID
- `startDate` (ISO date, optional) - Start date for date range
- `endDate` (ISO date, optional) - End date for date range
- `severity` (string, optional) - Filter by severity (INFO, WARNING, ERROR, CRITICAL)
- `search` (string, optional) - Search term for full-text search
- `page` (number, default: 1) - Page number
- `limit` (number, default: 50) - Results per page

**Example Request:**
```
GET /api/audit/logs?category=DATA_ACCESS&startDate=2026-03-01&page=1&limit=20
```

**Response:**
```json
{
  "success": true,
  "logs": [
    {
      "timestamp": "2026-03-02T10:30:00.000Z",
      "category": "DATA_ACCESS",
      "userId": 1,
      "email": "user@alawael.com",
      "action": "UPDATE",
      "resource": "quality_metrics",
      "severity": "WARNING",
      "details": {}
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

### GET /api/audit/export
Export audit logs to CSV or JSON.

**Authorization:** Requires `export:audit` permission

**Query Parameters:**
- `format` (string, required) - Export format: `csv` or `json`
- `category` (string, optional) - Filter by category
- `startDate` (ISO date, optional) - Start date
- `endDate` (ISO date, optional) - End date
- `severity` (string, optional) - Filter by severity

**Example Request:**
```
GET /api/audit/export?format=csv&category=SECURITY&startDate=2026-03-01
```

**Response:**
- Content-Type: `text/csv` or `application/json`
- File download with logs data

**CSV Format:**
```csv
timestamp,category,userId,email,action,resource,severity,details
2026-03-02T10:30:00.000Z,DATA_ACCESS,1,user@alawael.com,UPDATE,quality_metrics,WARNING,"{}"
```

---

### GET /api/audit/statistics
Get audit statistics and metrics.

**Authorization:** Requires `read:audit` permission

**Query Parameters:**
- `days` (number, default: 30) - Number of days to analyze

**Response:**
```json
{
  "success": true,
  "statistics": {
    "totalEvents": 1523,
    "timeRange": {
      "start": "2026-02-01T00:00:00.000Z",
      "end": "2026-03-02T10:30:00.000Z",
      "days": 30
    },
    "byCategory": {
      "AUTHENTICATION": 234,
      "AUTHORIZATION": 156,
      "DATA_ACCESS": 892,
      "CONFIG_CHANGE": 45,
      "SECURITY": 12,
      "API_CALL": 184
    },
    "bySeverity": {
      "INFO": 1234,
      "WARNING": 234,
      "ERROR": 45,
      "CRITICAL": 10
    },
    "topUsers": [
      { "userId": 1, "email": "admin@alawael.com", "events": 456 },
      { "userId": 2, "email": "manager@alawael.com", "events": 234 }
    ],
    "failureRate": 0.03,
    "securityEvents": 12,
    "recentCritical": [
      {
        "timestamp": "2026-03-02T09:15:00.000Z",
        "type": "SQL_INJECTION_ATTEMPT",
        "userId": null,
        "severity": "CRITICAL"
      }
    ]
  }
}
```

---

### DELETE /api/audit/cleanup
Trigger manual cleanup of old audit logs.

**Authorization:** Requires `manage:audit` permission (ADMIN only)

**Query Parameters:**
- `olderThan` (number, optional) - Days to keep (default: 90)

**Response:**
```json
{
  "success": true,
  "message": "Cleanup completed",
  "deleted": {
    "files": 5,
    "records": 15234
  },
  "retained": {
    "files": 12,
    "records": 45678
  }
}
```

---

## 👥 User Management Endpoints

### GET /api/users
Get all users (admin only).

**Authorization:** Requires `manage:users` permission

**Response:**
```json
{
  "success": true,
  "users": [
    {
      "id": 1,
      "email": "admin@alawael.com",
      "name": "System Admin",
      "role": "ADMIN",
      "roleLevel": 100,
      "permissions": ["read:all", "write:all", "delete:all"]
    }
  ]
}
```

---

### PUT /api/users/:userId/role
Update user role.

**Authorization:** Requires `manage:users` permission

**Request Body:**
```json
{
  "role": "QUALITY_MANAGER",
  "reason": "Promoted to management position"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User role updated successfully",
  "user": {
    "id": 1,
    "email": "user@alawael.com",
    "role": "QUALITY_MANAGER",
    "previousRole": "ANALYST"
  },
  "auditEvent": {
    "timestamp": "2026-03-02T10:30:00.000Z",
    "action": "ROLE_CHANGED"
  }
}
```

---

## ⚠️ Error Responses

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "No authentication token provided",
  "timestamp": "2026-03-02T10:30:00.000Z"
}
```

### 403 Forbidden - Insufficient Role
```json
{
  "error": "Forbidden - Invalid role",
  "required": ["ADMIN"],
  "userRole": "VIEWER",
  "timestamp": "2026-03-02T10:30:00.000Z"
}
```

### 403 Forbidden - Insufficient Permission
```json
{
  "error": "Forbidden - Insufficient permissions",
  "required": ["write:quality", "delete:quality"],
  "user": 1,
  "userRole": "VIEWER",
  "timestamp": "2026-03-02T10:30:00.000Z"
}
```

### 400 Bad Request
```json
{
  "error": "Bad Request",
  "message": "Invalid role name",
  "timestamp": "2026-03-02T10:30:00.000Z"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "Database connection failed",
  "timestamp": "2026-03-02T10:30:00.000Z"
}
```

---

## 🔧 Rate Limiting

All audit endpoints are rate-limited to prevent abuse:
- **Standard:** 100 requests per minute per user
- **Export:** 10 requests per minute per user
- **Statistics:** 30 requests per minute per user

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1709376000
```

---

## 📝 Example Usage

### Complete Authentication Flow with Audit
```javascript
// 1. Login
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

const { token, user } = await loginResponse.json();

// 2. Log successful login
await fetch('/api/audit/auth', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    action: 'LOGIN',
    success: true,
    details: { userAgent: navigator.userAgent }
  })
});

// 3. Check permissions before accessing resource
const permCheck = await fetch('/api/rbac/check-permission', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ permission: 'write:quality' })
});

const { hasPermission } = await permCheck.json();

if (hasPermission) {
  // 4. Access protected resource and log data access
  await fetch('/api/quality/metrics', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(qualityData)
  });

  // Log the data access
  await fetch('/api/audit/data-access', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      action: 'UPDATE',
      resource: 'quality_metrics',
      dataType: 'quality_data',
      recordCount: 1
    })
  });
}
```

---

## 🧪 Testing with cURL

```bash
# Get all roles
curl http://localhost:3001/api/rbac/roles \
  -H "Authorization: Bearer YOUR_TOKEN"

# Check permission
curl -X POST http://localhost:3001/api/rbac/check-permission \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"permission":"write:quality"}'

# Query audit logs
curl "http://localhost:3001/api/audit/logs?category=SECURITY&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Export logs to CSV
curl "http://localhost:3001/api/audit/export?format=csv&startDate=2026-03-01" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o audit-logs.csv
```

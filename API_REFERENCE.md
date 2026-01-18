# 📡 **Complete API Reference**

**التاريخ:** 14 يناير 2026  
**الإصدار:** 4.0.0 - Phase 6 Complete  
**Base URL:** `http://localhost:3001`

---

## 📋 **Table of Contents**

```
1. Authentication & Authorization
2. Health & Monitoring
3. Performance APIs
4. Cache Management
5. Vehicles Management
6. Students Management
7. Sessions Management
8. Appointments Management
9. Rehabilitation Programs
10. Reports & Analytics
11. Communications
12. Finance Management
13. User Management
14. Settings & Configuration
15. Error Responses
16. Rate Limiting
17. Webhooks
18. WebSocket Events
```

---

## 🔐 **Section 1: Authentication & Authorization**

### 1.1 Login

**Endpoint:** `POST /api/auth/login`

**Description:** Authenticate user and receive JWT token

**Request Body:**

```json
{
  "email": "admin@alawael.com",
  "password": "Admin@123456"
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "60d5ec49f1b2c8b1f8e4e1a1",
    "email": "admin@alawael.com",
    "name": "Admin User",
    "role": "admin"
  },
  "expiresIn": "24h"
}
```

**Errors:**

```json
// 401 Unauthorized
{
  "success": false,
  "error": "Invalid credentials"
}

// 429 Too Many Requests
{
  "success": false,
  "error": "Too many login attempts. Try again in 15 minutes"
}
```

**Example:**

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@alawael.com",
    "password": "Admin@123456"
  }'
```

---

### 1.2 Register

**Endpoint:** `POST /api/auth/register`

**Description:** Create new user account

**Request Body:**

```json
{
  "email": "newuser@example.com",
  "password": "SecurePass123!",
  "name": "New User",
  "role": "user"
}
```

**Response:** `201 Created`

```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": "60d5ec49f1b2c8b1f8e4e1a2",
    "email": "newuser@example.com",
    "name": "New User",
    "role": "user"
  }
}
```

---

### 1.3 Refresh Token

**Endpoint:** `POST /api/auth/refresh`

**Description:** Refresh expired JWT token

**Headers:**

```
Authorization: Bearer <expired_token>
```

**Response:** `200 OK`

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "24h"
}
```

---

### 1.4 Logout

**Endpoint:** `POST /api/auth/logout`

**Description:** Invalidate current session

**Headers:**

```
Authorization: Bearer <token>
```

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## 🏥 **Section 2: Health & Monitoring**

### 2.1 Health Check

**Endpoint:** `GET /health`

**Description:** Check application health status

**Response:** `200 OK`

```json
{
  "status": "ok",
  "timestamp": "2026-01-14T17:00:00.000Z",
  "uptime": 86400,
  "version": "4.0.0",
  "environment": "production"
}
```

**Example:**

```bash
curl http://localhost:3001/health
```

---

### 2.2 System Status

**Endpoint:** `GET /api/status`

**Description:** Detailed system status

**Response:** `200 OK`

```json
{
  "status": "healthy",
  "services": {
    "database": {
      "status": "connected",
      "responseTime": "5ms",
      "replicaSet": "healthy"
    },
    "redis": {
      "status": "connected",
      "cluster": "healthy",
      "nodes": 6
    },
    "cdn": {
      "status": "active",
      "hitRate": "98%"
    }
  },
  "metrics": {
    "activeConnections": 1250,
    "requestsPerSecond": 45000,
    "averageResponseTime": "15ms",
    "cacheHitRate": "87%"
  }
}
```

---

## ⚡ **Section 3: Performance APIs**

### 3.1 Performance Metrics

**Endpoint:** `GET /api/performance/metrics`

**Description:** Get comprehensive performance metrics

**Response:** `200 OK`

```json
{
  "timestamp": "2026-01-14T17:00:00.000Z",
  "uptime": 86400,
  "performance": {
    "responseTime": {
      "avg": "15ms",
      "p50": "12ms",
      "p95": "35ms",
      "p99": "100ms"
    },
    "throughput": {
      "current": "50000 req/s",
      "peak": "52000 req/s",
      "average": "45000 req/s"
    },
    "cache": {
      "hitRate": "87%",
      "hits": 87000000,
      "misses": 13000000,
      "size": "2GB"
    },
    "database": {
      "connections": 120,
      "queriesPerSecond": 600,
      "averageQueryTime": "5ms"
    },
    "redis": {
      "opsPerSecond": 100000,
      "commandsProcessed": 8640000000,
      "evictedKeys": 100000
    }
  },
  "resources": {
    "cpu": {
      "usage": "25%",
      "cores": 8
    },
    "memory": {
      "used": "2.5GB",
      "total": "8GB",
      "percentage": "31%"
    },
    "disk": {
      "used": "45GB",
      "total": "100GB",
      "percentage": "45%"
    }
  },
  "errors": {
    "rate": "0.01%",
    "count": 10000,
    "lastError": "2026-01-14T16:59:45.000Z"
  }
}
```

**Example:**

```bash
curl http://localhost:3001/api/performance/metrics
```

---

### 3.2 Real-time Stats

**Endpoint:** `GET /api/performance/realtime`

**Description:** Live performance statistics

**Query Parameters:**

- `interval` - Update interval in seconds (default: 1)

**Response:** `200 OK` (Server-Sent Events)

```
data: {"requests":847,"responseTime":14,"cacheHits":740}

data: {"requests":851,"responseTime":15,"cacheHits":745}

data: {"requests":849,"responseTime":13,"cacheHits":738}
```

**Example:**

```bash
curl -N http://localhost:3001/api/performance/realtime
```

---

### 3.3 Request Timing

**Endpoint:** `GET /api/performance/timing`

**Description:** Detailed request timing breakdown

**Response:** `200 OK`

```json
{
  "total": "15ms",
  "breakdown": {
    "dns": "0ms",
    "tcp": "1ms",
    "tls": "2ms",
    "request": "1ms",
    "processing": "8ms",
    "response": "3ms"
  },
  "cache": {
    "lookup": "0.5ms",
    "hit": true
  },
  "database": {
    "query": "2ms",
    "count": 1
  }
}
```

---

## 💾 **Section 4: Cache Management**

### 4.1 Cache Statistics

**Endpoint:** `GET /api/performance/cache`

**Description:** Get cache statistics

**Response:** `200 OK`

```json
{
  "hitRate": "87%",
  "stats": {
    "hits": 87000000,
    "misses": 13000000,
    "sets": 15000000,
    "deletes": 500000
  },
  "layers": {
    "L1": {
      "type": "memory",
      "hitRate": "95%",
      "size": "200MB",
      "keys": 50000
    },
    "L2": {
      "type": "redis",
      "hitRate": "87%",
      "size": "2GB",
      "keys": 2000000
    },
    "L3": {
      "type": "database",
      "hitRate": "75%"
    }
  },
  "topKeys": [
    {
      "key": "cache:vehicles:*",
      "hits": 5000000,
      "hitRate": "95%"
    },
    {
      "key": "cache:students:*",
      "hits": 3000000,
      "hitRate": "92%"
    }
  ]
}
```

---

### 4.2 Clear Cache

**Endpoint:** `POST /api/performance/cache/clear`

**Description:** Clear cache (all or specific pattern)

**Headers:**

```
Authorization: Bearer <admin_token>
```

**Request Body:**

```json
{
  "pattern": "vehicles", // Optional: specific pattern to clear
  "layers": ["L1", "L2"] // Optional: which layers to clear
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "Cache cleared successfully",
  "keysDeleted": 150000,
  "layers": ["L1", "L2"]
}
```

**Example:**

```bash
# Clear all cache
curl -X POST http://localhost:3001/api/performance/cache/clear \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{}'

# Clear specific pattern
curl -X POST http://localhost:3001/api/performance/cache/clear \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"pattern": "vehicles"}'
```

---

### 4.3 Warm Cache

**Endpoint:** `POST /api/performance/cache/warm`

**Description:** Preload frequently accessed data into cache

**Headers:**

```
Authorization: Bearer <admin_token>
```

**Request Body:**

```json
{
  "endpoints": ["/api/vehicles", "/api/students", "/api/sessions"]
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "Cache warming completed",
  "endpointsWarmed": 3,
  "keysCreated": 25000,
  "timeElapsed": "5.2s"
}
```

---

## 🚗 **Section 5: Vehicles Management**

### 5.1 List Vehicles

**Endpoint:** `GET /api/vehicles`

**Description:** Get all vehicles with pagination and filtering

**Query Parameters:**

- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)
- `type` - Filter by vehicle type
- `status` - Filter by status (active, maintenance, retired)
- `search` - Search by plate number or description
- `sort` - Sort field (plateNumber, type, capacity)
- `order` - Sort order (asc, desc)

**Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "60d5ec49f1b2c8b1f8e4e1a1",
      "plateNumber": "ABC-123",
      "type": "Bus",
      "capacity": 30,
      "status": "active",
      "manufacturer": "Mercedes",
      "model": "Sprinter",
      "year": 2024,
      "mileage": 15000,
      "lastMaintenance": "2026-01-01",
      "nextMaintenance": "2026-04-01",
      "createdAt": "2025-06-01T10:00:00.000Z",
      "updatedAt": "2026-01-14T15:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  },
  "cache": {
    "hit": true,
    "ttl": 300
  }
}
```

**Example:**

```bash
# Get all vehicles
curl http://localhost:3001/api/vehicles

# With filters
curl "http://localhost:3001/api/vehicles?type=Bus&status=active&page=1&limit=10"

# With search
curl "http://localhost:3001/api/vehicles?search=ABC"
```

---

### 5.2 Get Vehicle by ID

**Endpoint:** `GET /api/vehicles/:id`

**Description:** Get detailed information about a specific vehicle

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "60d5ec49f1b2c8b1f8e4e1a1",
    "plateNumber": "ABC-123",
    "type": "Bus",
    "capacity": 30,
    "status": "active",
    "details": {
      "manufacturer": "Mercedes",
      "model": "Sprinter",
      "year": 2024,
      "color": "White",
      "vin": "WDB9066051L123456"
    },
    "maintenance": {
      "lastService": "2026-01-01",
      "nextService": "2026-04-01",
      "mileage": 15000,
      "serviceHistory": [
        {
          "date": "2026-01-01",
          "type": "Regular Service",
          "cost": 500,
          "notes": "Oil change, filter replacement"
        }
      ]
    },
    "assignments": {
      "currentDriver": {
        "id": "60d5ec49f1b2c8b1f8e4e1b1",
        "name": "John Doe"
      },
      "route": "Route A",
      "schedule": "Morning Shift"
    },
    "statistics": {
      "totalTrips": 1500,
      "totalDistance": 45000,
      "fuelConsumption": 12.5,
      "averageSpeed": 45
    }
  }
}
```

**Errors:**

```json
// 404 Not Found
{
  "success": false,
  "error": "Vehicle not found"
}
```

**Example:**

```bash
curl http://localhost:3001/api/vehicles/60d5ec49f1b2c8b1f8e4e1a1
```

---

### 5.3 Create Vehicle

**Endpoint:** `POST /api/vehicles`

**Description:** Add a new vehicle

**Headers:**

```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "plateNumber": "XYZ-789",
  "type": "Bus",
  "capacity": 30,
  "manufacturer": "Mercedes",
  "model": "Sprinter",
  "year": 2024,
  "color": "White",
  "vin": "WDB9066051L123456",
  "purchaseDate": "2024-01-01",
  "purchasePrice": 75000
}
```

**Response:** `201 Created`

```json
{
  "success": true,
  "message": "Vehicle created successfully",
  "data": {
    "id": "60d5ec49f1b2c8b1f8e4e1a3",
    "plateNumber": "XYZ-789",
    "type": "Bus",
    "capacity": 30,
    "status": "active",
    "createdAt": "2026-01-14T17:00:00.000Z"
  }
}
```

**Errors:**

```json
// 400 Bad Request
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "plateNumber",
      "message": "Plate number already exists"
    }
  ]
}

// 401 Unauthorized
{
  "success": false,
  "error": "Authentication required"
}

// 403 Forbidden
{
  "success": false,
  "error": "Insufficient permissions"
}
```

**Example:**

```bash
curl -X POST http://localhost:3001/api/vehicles \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "plateNumber": "XYZ-789",
    "type": "Bus",
    "capacity": 30,
    "manufacturer": "Mercedes",
    "model": "Sprinter",
    "year": 2024
  }'
```

---

### 5.4 Update Vehicle

**Endpoint:** `PUT /api/vehicles/:id`

**Description:** Update vehicle information

**Headers:**

```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "status": "maintenance",
  "mileage": 15500,
  "notes": "Regular maintenance scheduled"
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "Vehicle updated successfully",
  "data": {
    "id": "60d5ec49f1b2c8b1f8e4e1a1",
    "status": "maintenance",
    "mileage": 15500,
    "updatedAt": "2026-01-14T17:00:00.000Z"
  }
}
```

---

### 5.5 Delete Vehicle

**Endpoint:** `DELETE /api/vehicles/:id`

**Description:** Delete a vehicle (soft delete)

**Headers:**

```
Authorization: Bearer <admin_token>
```

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "Vehicle deleted successfully"
}
```

---

## 👨‍🎓 **Section 6: Students Management**

### 6.1 List Students

**Endpoint:** `GET /api/students`

**Description:** Get all students with pagination

**Query Parameters:**

- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `status` - Filter by status (active, graduated, suspended)
- `grade` - Filter by grade level
- `search` - Search by name or ID
- `program` - Filter by rehabilitation program

**Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "60d5ec49f1b2c8b1f8e4e2a1",
      "studentId": "STU-2024-001",
      "name": "Ahmed Ali",
      "dateOfBirth": "2015-05-15",
      "gender": "male",
      "grade": "Grade 3",
      "status": "active",
      "program": "Speech Therapy",
      "enrollmentDate": "2024-01-15",
      "guardian": {
        "name": "Ali Ahmed",
        "relation": "Father",
        "phone": "+966501234567",
        "email": "ali.ahmed@example.com"
      },
      "disabilities": ["Speech Delay", "Learning Disability"],
      "progress": {
        "overall": "Good",
        "attendance": "95%",
        "improvements": ["Speech clarity improved", "Better focus"]
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 500,
    "pages": 25
  }
}
```

---

### 6.2 Get Student Profile

**Endpoint:** `GET /api/students/:id`

**Description:** Get complete student profile

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "60d5ec49f1b2c8b1f8e4e2a1",
    "studentId": "STU-2024-001",
    "personalInfo": {
      "name": "Ahmed Ali",
      "dateOfBirth": "2015-05-15",
      "age": 10,
      "gender": "male",
      "nationality": "Saudi"
    },
    "academicInfo": {
      "grade": "Grade 3",
      "class": "3-A",
      "enrollmentDate": "2024-01-15",
      "status": "active"
    },
    "guardian": {
      "name": "Ali Ahmed",
      "relation": "Father",
      "phone": "+966501234567",
      "email": "ali.ahmed@example.com",
      "alternateContact": "+966507654321"
    },
    "medical": {
      "disabilities": ["Speech Delay", "Learning Disability"],
      "allergies": ["Peanuts"],
      "medications": ["None"],
      "emergencyContact": "+966501234567"
    },
    "rehabilitation": {
      "programs": ["Speech Therapy", "Occupational Therapy"],
      "sessions": {
        "total": 120,
        "completed": 95,
        "remaining": 25
      },
      "progress": {
        "overall": "Good",
        "improvements": ["Speech clarity improved by 40%", "Better focus and attention span", "Improved social interaction"],
        "goals": ["Complete speech therapy by June 2026", "Improve reading comprehension"]
      }
    },
    "attendance": {
      "rate": "95%",
      "present": 171,
      "absent": 9,
      "excused": 5
    },
    "documents": [
      {
        "type": "Medical Report",
        "date": "2024-01-10",
        "url": "/documents/medical-report-001.pdf"
      },
      {
        "type": "Assessment Report",
        "date": "2024-06-15",
        "url": "/documents/assessment-001.pdf"
      }
    ]
  }
}
```

---

### 6.3 Create Student

**Endpoint:** `POST /api/students`

**Description:** Register a new student

**Headers:**

```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "name": "Ahmed Ali",
  "dateOfBirth": "2015-05-15",
  "gender": "male",
  "grade": "Grade 3",
  "disabilities": ["Speech Delay"],
  "guardian": {
    "name": "Ali Ahmed",
    "relation": "Father",
    "phone": "+966501234567",
    "email": "ali.ahmed@example.com"
  }
}
```

**Response:** `201 Created`

```json
{
  "success": true,
  "message": "Student registered successfully",
  "data": {
    "id": "60d5ec49f1b2c8b1f8e4e2a2",
    "studentId": "STU-2024-502",
    "name": "Ahmed Ali",
    "enrollmentDate": "2026-01-14"
  }
}
```

---

## 📅 **Section 7: Sessions Management**

### 7.1 List Sessions

**Endpoint:** `GET /api/sessions`

**Description:** Get all therapy/education sessions

**Query Parameters:**

- `page` - Page number
- `limit` - Items per page
- `date` - Filter by date (YYYY-MM-DD)
- `studentId` - Filter by student
- `therapistId` - Filter by therapist
- `type` - Session type (speech, occupational, physical)
- `status` - Session status (scheduled, completed, cancelled)

**Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "60d5ec49f1b2c8b1f8e4e3a1",
      "sessionId": "SES-2026-001",
      "date": "2026-01-15",
      "time": "09:00",
      "duration": 60,
      "type": "Speech Therapy",
      "status": "scheduled",
      "student": {
        "id": "60d5ec49f1b2c8b1f8e4e2a1",
        "name": "Ahmed Ali",
        "studentId": "STU-2024-001"
      },
      "therapist": {
        "id": "60d5ec49f1b2c8b1f8e4e4a1",
        "name": "Dr. Sarah Mohammed",
        "specialization": "Speech Therapy"
      },
      "room": "Room 101",
      "notes": "Focus on pronunciation exercises"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 300,
    "pages": 15
  }
}
```

---

### 7.2 Create Session

**Endpoint:** `POST /api/sessions`

**Description:** Schedule a new session

**Request Body:**

```json
{
  "studentId": "60d5ec49f1b2c8b1f8e4e2a1",
  "therapistId": "60d5ec49f1b2c8b1f8e4e4a1",
  "date": "2026-01-15",
  "time": "09:00",
  "duration": 60,
  "type": "Speech Therapy",
  "room": "Room 101",
  "notes": "Initial assessment session"
}
```

**Response:** `201 Created`

```json
{
  "success": true,
  "message": "Session scheduled successfully",
  "data": {
    "id": "60d5ec49f1b2c8b1f8e4e3a2",
    "sessionId": "SES-2026-302",
    "date": "2026-01-15",
    "time": "09:00"
  }
}
```

---

## 📊 **Section 8: Reports & Analytics**

### 8.1 Generate Report

**Endpoint:** `POST /api/reports/generate`

**Description:** Generate custom report

**Request Body:**

```json
{
  "type": "student-progress",
  "studentId": "60d5ec49f1b2c8b1f8e4e2a1",
  "dateRange": {
    "start": "2025-01-01",
    "end": "2026-01-14"
  },
  "includeGraphs": true,
  "format": "pdf"
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "report": {
    "id": "REP-2026-001",
    "type": "student-progress",
    "generatedAt": "2026-01-14T17:00:00.000Z",
    "url": "/reports/student-progress-2026-001.pdf",
    "expiresAt": "2026-01-21T17:00:00.000Z"
  }
}
```

---

### 8.2 Analytics Dashboard

**Endpoint:** `GET /api/analytics/dashboard`

**Description:** Get dashboard analytics

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "overview": {
      "totalStudents": 500,
      "activeStudents": 485,
      "totalSessions": 12500,
      "completedSessions": 11800
    },
    "performance": {
      "averageProgress": "78%",
      "attendanceRate": "93%",
      "satisfactionScore": "4.5/5"
    },
    "trends": {
      "enrollmentTrend": "↑ 15% vs last month",
      "completionRate": "↑ 8% vs last month"
    }
  }
}
```

---

## 📝 **Section 15: Error Responses**

### Standard Error Format

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}, // Optional additional details
  "timestamp": "2026-01-14T17:00:00.000Z",
  "requestId": "req-12345-67890"
}
```

### Common HTTP Status Codes

```
200 OK - Request successful
201 Created - Resource created
400 Bad Request - Invalid input
401 Unauthorized - Authentication required
403 Forbidden - Insufficient permissions
404 Not Found - Resource not found
409 Conflict - Resource already exists
422 Unprocessable Entity - Validation failed
429 Too Many Requests - Rate limit exceeded
500 Internal Server Error - Server error
503 Service Unavailable - Service down
```

---

## ⏱️ **Section 16: Rate Limiting**

### Rate Limits

```
Authentication endpoints: 5 requests/15 minutes
API endpoints: 1000 requests/hour
Reporting endpoints: 100 requests/hour
```

### Rate Limit Headers

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1705251600
```

### Rate Limit Exceeded Response

```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 3600,
  "limit": 1000,
  "resetAt": "2026-01-14T18:00:00.000Z"
}
```

---

## 🔔 **Section 17: Webhooks**

### Register Webhook

**Endpoint:** `POST /api/webhooks`

**Request Body:**

```json
{
  "url": "https://your-domain.com/webhook",
  "events": ["student.created", "session.completed"],
  "secret": "your-webhook-secret"
}
```

### Webhook Events

```
student.created
student.updated
session.scheduled
session.completed
session.cancelled
report.generated
```

### Webhook Payload

```json
{
  "event": "session.completed",
  "timestamp": "2026-01-14T17:00:00.000Z",
  "data": {
    "sessionId": "SES-2026-001",
    "studentId": "STU-2024-001",
    "status": "completed"
  },
  "signature": "sha256=..."
}
```

---

## 🎯 **Quick Reference**

### Base URLs

```
Development: http://localhost:3001
Staging: https://staging-api.yourdomain.com
Production: https://api.yourdomain.com
```

### Authentication

```
Header: Authorization: Bearer <token>
Token expires: 24 hours
Refresh token: POST /api/auth/refresh
```

### Pagination

```
Default page size: 20
Maximum page size: 100
Query params: ?page=1&limit=20
```

### Caching

```
Cache-Control headers included
Cached responses include: "cache": {"hit": true, "ttl": 300}
```

---

**تم إنشاء هذا API Reference بواسطة Development Team**  
**آخر تحديث:** 14 يناير 2026  
**الحالة:** ✅ Production Ready 🚀

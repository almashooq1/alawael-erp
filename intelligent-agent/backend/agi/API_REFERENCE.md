# 📚 API Reference - Rehab AGI

دليل مرجع API كامل

**Last Updated**: January 30, 2026

---

## 🔑 Authentication

### Headers Required

```http
Authorization: Bearer <jwt-token>
Content-Type: application/json
X-Request-ID: unique-request-id
```

### Get Authentication Token

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password"
}

Response: 200 OK
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 86400,
  "user": {
    "id": "USER-001",
    "email": "user@example.com",
    "role": "OPERATOR"
  }
}
```

---

## 🏥 Core API Endpoints

### 1. Beneficiary Analysis

```http
POST /api/rehab-agi/analyze
Authorization: Bearer <token>
Content-Type: application/json

{
  "beneficiaryId": "BEN-001",
  "analysisType": "comprehensive",
  "includeAI": true
}

Response: 200 OK
{
  "beneficiaryId": "BEN-001",
  "overallStatus": {
    "score": 8.5,
    "level": "IMPROVING",
    "trend": "positive"
  },
  "physicalRecovery": {
    "score": 7.8,
    "details": {...}
  },
  "cognitiveRecovery": {
    "score": 8.9,
    "details": {...}
  },
  "psychologicalWellbeing": {
    "score": 8.2,
    "details": {...}
  },
  "analysis": {
    "timestamp": "2026-01-30T10:30:00Z",
    "duration_ms": 234,
    "model": "RehabAI-v1.0"
  }
}
```

### 2. AI Recommendations

```http
POST /api/rehab-agi/recommend
Authorization: Bearer <token>
Content-Type: application/json

{
  "beneficiaryId": "BEN-001",
  "focusArea": "physical_recovery"
}

Response: 200 OK
{
  "recommendations": [
    {
      "id": "REC-001",
      "priority": "HIGH",
      "category": "EXERCISE",
      "description": "تمارين استعادة القوة العضلية",
      "details": "...",
      "estimatedDuration": "6 weeks",
      "expectedOutcome": "70%"
    },
    {
      "id": "REC-002",
      "priority": "MEDIUM",
      "category": "THERAPY",
      "description": "العلاج الطبيعي المكثف",
      "details": "...",
      "estimatedDuration": "8 weeks",
      "expectedOutcome": "65%"
    }
  ],
  "reasoning": "AI analysis suggests focus on motor recovery..."
}
```

### 3. Progress Tracking

```http
POST /api/rehab-agi/progress
Authorization: Bearer <token>
Content-Type: application/json

{
  "beneficiaryId": "BEN-001",
  "date": "2026-01-30",
  "metrics": {
    "mobilityScore": 7.5,
    "painLevel": 3,
    "moodScore": 8,
    "sleepQuality": 7
  }
}

Response: 200 OK
{
  "progressId": "PROG-001",
  "beneficiaryId": "BEN-001",
  "date": "2026-01-30",
  "comparison": {
    "previousScore": 7.2,
    "currentScore": 7.5,
    "improvement": "+0.3 (4.2%)"
  },
  "trend": "improving",
  "nextCheckup": "2026-02-06"
}
```

### 4. Report Generation

```http
POST /api/rehab-agi/report
Authorization: Bearer <token>
Content-Type: application/json

{
  "beneficiaryId": "BEN-001",
  "reportType": "monthly",
  "period": "2026-01",
  "format": "pdf"
}

Response: 200 OK
{
  "reportId": "RPT-001",
  "beneficiaryId": "BEN-001",
  "period": "2026-01",
  "format": "pdf",
  "url": "https://api.rehab-agi.com/reports/RPT-001.pdf",
  "generatedAt": "2026-01-30T10:35:00Z",
  "pages": 12,
  "summary": "Monthly progress report..."
}
```

---

## 👥 Beneficiary Management

### List Beneficiaries

```http
GET /api/beneficiaries?page=1&limit=20&status=active
Authorization: Bearer <token>

Response: 200 OK
{
  "data": [
    {
      "id": "BEN-001",
      "name": "أحمد محمد",
      "disabilityType": "SPINAL_CORD",
      "status": "ACTIVE",
      "lastAnalysis": "2026-01-30T09:00:00Z",
      "recoveryScore": 8.5
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156
  }
}
```

### Get Beneficiary Details

```http
GET /api/beneficiaries/BEN-001
Authorization: Bearer <token>

Response: 200 OK
{
  "id": "BEN-001",
  "name": "أحمد محمد",
  "email": "ahmed@example.com",
  "phone": "+966501234567",
  "disabilityType": "SPINAL_CORD",
  "injuryDate": "2025-06-15",
  "status": "ACTIVE",
  "program": "INTENSIVE_REHAB",
  "team": [
    {
      "id": "STAFF-001",
      "name": "دكتور علي",
      "role": "PHYSIOTHERAPIST"
    }
  ],
  "metadata": {...}
}
```

### Create Beneficiary

```http
POST /api/beneficiaries
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "فاطمة أحمد",
  "email": "fatima@example.com",
  "phone": "+966502345678",
  "disabilityType": "MOBILITY",
  "injuryDate": "2025-12-01",
  "program": "STANDARD_REHAB"
}

Response: 201 Created
{
  "id": "BEN-002",
  "name": "فاطمة أحمد",
  "status": "PENDING",
  "createdAt": "2026-01-30T10:40:00Z"
}
```

---

## 📊 Reports & Analytics

### Get Dashboard Data

```http
GET /api/analytics/dashboard
Authorization: Bearer <token>

Response: 200 OK
{
  "metrics": {
    "totalBeneficiaries": 156,
    "activeBeneficiaries": 142,
    "averageRecoveryScore": 7.6,
    "improvementRate": 87.3
  },
  "charts": {
    "recoveryTrend": [...],
    "disabilityDistribution": [...],
    "programComparison": [...]
  }
}
```

### Export Data

```http
POST /api/reports/export
Authorization: Bearer <token>
Content-Type: application/json

{
  "dataType": "beneficiaries",
  "format": "csv",
  "filters": {
    "status": "ACTIVE",
    "createdAfter": "2026-01-01"
  }
}

Response: 200 OK
{
  "exportId": "EXP-001",
  "status": "processing",
  "format": "csv",
  "estimatedTime": "5 minutes",
  "downloadUrl": "https://api.rehab-agi.com/exports/EXP-001"
}
```

---

## ⚙️ System Management

### Health Check

```http
GET /api/agi/health
Authorization: Bearer <token>

Response: 200 OK
{
  "status": "healthy",
  "timestamp": "2026-01-30T10:45:00Z",
  "services": {
    "api": "up",
    "database": "connected",
    "redis": "connected",
    "ai_engine": "ready"
  }
}
```

### System Stats

```http
GET /api/ops/stats
Authorization: Bearer <token>

Response: 200 OK
{
  "uptime": 1234567,
  "requests": {
    "total": 1234567,
    "successRate": 99.9,
    "averageResponseTime": 145
  },
  "database": {
    "connections": 12,
    "queries": 456789,
    "averageQueryTime": 45
  },
  "cache": {
    "hitRate": 84.5,
    "items": 23456,
    "memoryUsage": 512
  }
}
```

---

## 🔒 Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "معرف المستفيد مطلوب",
    "details": {
      "field": "beneficiaryId",
      "reason": "required"
    }
  },
  "requestId": "REQ-123456",
  "timestamp": "2026-01-30T10:50:00Z"
}
```

### Error Codes

| Code            | Status | Description                       |
| --------------- | ------ | --------------------------------- |
| INVALID_REQUEST | 400    | Missing or invalid parameters     |
| UNAUTHORIZED    | 401    | Invalid or missing authentication |
| FORBIDDEN       | 403    | Insufficient permissions          |
| NOT_FOUND       | 404    | Resource not found                |
| CONFLICT        | 409    | Resource already exists           |
| RATE_LIMITED    | 429    | Too many requests                 |
| INTERNAL_ERROR  | 500    | Server error                      |

---

## 📈 Rate Limiting

```
Limit: 1000 requests per minute per user
Window: Rolling 60-second window

Headers:
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1643524800
```

---

## 🔄 Pagination

```
GET /api/beneficiaries?page=1&limit=20&sort=name&order=asc

Parameters:
- page: Page number (default: 1)
- limit: Items per page (default: 20, max: 100)
- sort: Sort field (default: id)
- order: asc or desc (default: asc)

Response includes:
- data: Array of items
- pagination: {page, limit, total, pages}
```

---

## 📝 API Examples

### cURL

```bash
curl -X POST http://localhost:5001/api/rehab-agi/analyze \
  -H "Authorization: Bearer token_here" \
  -H "Content-Type: application/json" \
  -d '{
    "beneficiaryId": "BEN-001",
    "analysisType": "comprehensive"
  }'
```

### JavaScript

```javascript
const response = await fetch('http://localhost:5001/api/rehab-agi/analyze', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    beneficiaryId: 'BEN-001',
    analysisType: 'comprehensive',
  }),
});

const data = await response.json();
console.log(data);
```

### Python

```python
import requests

response = requests.post(
  'http://localhost:5001/api/rehab-agi/analyze',
  headers={
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
  },
  json={
    'beneficiaryId': 'BEN-001',
    'analysisType': 'comprehensive'
  }
)

data = response.json()
print(data)
```

---

**Last Updated**: January 30, 2026 **API Version**: 1.1.0

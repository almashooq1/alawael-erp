# 📚 Advanced API Documentation

# التوثيق المتقدم لـ API

## Table of Contents

- [AI Predictions API](#ai-predictions-api)
- [Smart Reports API](#smart-reports-api)
- [Smart Notifications API](#smart-notifications-api)
- [Support System API](#support-system-api)
- [Performance Analytics API](#performance-analytics-api)
- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)

---

## AI Predictions API

### نظام التنبؤات الذكية

### 1. Student Progress Prediction

**Endpoint:** `POST /api/predictions/student-progress/<student_id>`

**Description:** التنبؤ بتقدم الطالب الأكاديمي والسلوكي

**Request:**

```bash
curl -X POST http://localhost:5000/api/predictions/student-progress/student_123 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

**Response (200):**

```json
{
  "status": "success",
  "data": {
    "student_id": "student_123",
    "prediction": {
      "expected_gpa": 3.8,
      "graduation_probability": 95,
      "risk_factors": ["attendance", "participation"],
      "recommendations": ["زيادة المشاركة في الفصل", "تحسين الحضور المنتظم"]
    },
    "confidence": 87,
    "accuracy_score": 0.92,
    "timestamp": "2026-01-16T10:00:00"
  }
}
```

**Error Response (400):**

```json
{
  "status": "error",
  "message": "Student ID is required"
}
```

---

### 2. Deal Probability Prediction

**Endpoint:** `POST /api/predictions/deal-probability/<deal_id>`

**Description:** التنبؤ باحتمالية إغلاق الصفقة التجارية

**Response (200):**

```json
{
  "status": "success",
  "data": {
    "deal_id": "deal_456",
    "probability": {
      "closing_probability": 78,
      "estimated_closing_date": "2026-02-15",
      "deal_size": 50000,
      "confidence": 0.85
    },
    "risk_assessment": {
      "low_risk_factors": [],
      "high_risk_factors": ["budget_constraints"],
      "overall_risk": "medium"
    },
    "recommended_actions": ["Follow up with client", "Provide detailed proposal"]
  }
}
```

---

### 3. Risk Assessment

**Endpoint:** `POST /api/predictions/risk-assessment`

**Request Body:**

```json
{
  "entity_type": "student|customer|project",
  "entity_id": "entity_123"
}
```

**Response (200):**

```json
{
  "status": "success",
  "data": {
    "entity_type": "student",
    "entity_id": "entity_123",
    "risk_level": "high|medium|low",
    "risk_score": 75,
    "risk_factors": [
      {
        "factor": "Low attendance",
        "weight": 0.3,
        "impact": "High"
      }
    ],
    "recommendations": ["جلسة استشارة مع المرشد", "برنامج تحسين الأداء"]
  }
}
```

---

## Smart Reports API

### نظام التقارير الذكية

### 1. Generate Report

**Endpoint:** `POST /api/reports/generate`

**Request Body:**

```json
{
  "title": "تقرير تقدم الطلاب",
  "type": "student_progress|sales_performance|financial_summary|attendance",
  "date_from": "2026-01-01",
  "date_to": "2026-01-16",
  "filters": {
    "department": "تقنية المعلومات",
    "status": "active"
  }
}
```

**Response (201):**

```json
{
  "status": "success",
  "report": {
    "id": "rep_789",
    "title": "تقرير تقدم الطلاب",
    "type": "student_progress",
    "created_by": "user_123",
    "created_at": "2026-01-16T10:00:00",
    "status": "completed",
    "data": {
      "total_students": 150,
      "average_gpa": 3.5,
      "passing_rate": 95,
      "students_at_risk": 8
    },
    "charts": [
      {
        "type": "bar",
        "title": "توزيع الدرجات",
        "data": {...}
      }
    ]
  }
}
```

---

### 2. Export Report

**Endpoint:** `GET /api/reports/<report_id>/export?format=pdf|excel|csv|json`

**Example:**

```bash
curl -X GET http://localhost:5000/api/reports/rep_789/export?format=pdf \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o report.pdf
```

**Response:** Binary file (PDF/Excel/CSV)

---

### 3. Schedule Report

**Endpoint:** `POST /api/reports/schedule`

**Request Body:**

```json
{
  "report_config": {
    "title": "Weekly Report",
    "type": "sales_performance"
  },
  "frequency": "daily|weekly|monthly",
  "recipients": ["email@example.com"]
}
```

**Response (201):**

```json
{
  "status": "success",
  "schedule": {
    "schedule_id": "sch_101",
    "next_run": "2026-01-17T08:00:00",
    "frequency": "daily",
    "status": "active"
  }
}
```

---

### 4. Compare Periods

**Endpoint:** `POST /api/reports/compare`

**Request Body:**

```json
{
  "report_type": "sales_performance",
  "period1": {
    "from": "2026-01-01",
    "to": "2026-01-08"
  },
  "period2": {
    "from": "2026-01-09",
    "to": "2026-01-16"
  }
}
```

**Response (200):**

```json
{
  "status": "success",
  "comparison": {
    "period1": {...},
    "period2": {...},
    "difference": {
      "sales_increase": 15.5,
      "customer_growth": 8,
      "roi_change": 12.3
    },
    "trend": "positive|negative|neutral"
  }
}
```

---

## Smart Notifications API

### نظام الإشعارات الذكية

### 1. Send Notification

**Endpoint:** `POST /api/notifications/send`

**Request Body:**

```json
{
  "user_id": "user_123",
  "type": "alert|info|warning|success|error",
  "title": "عنوان الإشعار",
  "message": "نص الإشعار التفصيلي",
  "channels": ["email", "push", "sms", "in_app"],
  "priority": "high|medium|low",
  "metadata": {
    "action_url": "/reports/rep_123",
    "icon": "📊"
  }
}
```

**Response (200):**

```json
{
  "status": "success",
  "notification_id": "notif_456",
  "delivery_status": {
    "email": "sent",
    "push": "pending",
    "sms": "delivered",
    "in_app": "stored"
  },
  "timestamp": "2026-01-16T10:00:00"
}
```

---

### 2. Schedule Notification

**Endpoint:** `POST /api/notifications/schedule`

**Request Body:**

```json
{
  "notification_config": {
    "user_id": "user_123",
    "title": "إشعار مجدول",
    "message": "رسالة الإشعار"
  },
  "send_time": "2026-01-17T10:00:00"
}
```

**Response (201):**

```json
{
  "status": "success",
  "schedule": {
    "schedule_id": "sch_202",
    "send_time": "2026-01-17T10:00:00",
    "status": "scheduled"
  }
}
```

---

### 3. Set User Preferences

**Endpoint:** `PUT /api/notifications/preferences/<user_id>`

**Request Body:**

```json
{
  "email_enabled": true,
  "sms_enabled": false,
  "push_enabled": true,
  "quiet_hours": {
    "start": "22:00",
    "end": "08:00"
  },
  "notification_types": {
    "alerts": true,
    "reminders": true,
    "reports": false
  }
}
```

**Response (200):**

```json
{
  "status": "success",
  "message": "Preferences updated successfully",
  "preferences": {...}
}
```

---

## Support System API

### نظام الدعم الفني

### 1. Create Support Ticket

**Endpoint:** `POST /api/support/tickets/create`

**Request Body:**

```json
{
  "user_id": "user_123",
  "title": "عنوان المشكلة",
  "description": "وصف تفصيلي للمشكلة",
  "priority": "high|medium|low",
  "category": "technical|billing|general",
  "attachments": []
}
```

**Response (201):**

```json
{
  "status": "success",
  "ticket": {
    "ticket_id": "TIC_12345",
    "ticket_number": 12345,
    "status": "open",
    "priority": "high",
    "created_at": "2026-01-16T10:00:00",
    "assigned_to": null,
    "satisfaction_rating": null
  }
}
```

---

### 2. Update Ticket Status

**Endpoint:** `PUT /api/support/tickets/<ticket_id>/status`

**Request Body:**

```json
{
  "status": "open|pending|closed",
  "notes": "ملاحظات اختيارية"
}
```

**Response (200):**

```json
{
  "status": "success",
  "message": "Ticket status updated",
  "ticket": {
    "ticket_id": "TIC_12345",
    "status": "closed",
    "resolved_at": "2026-01-16T15:30:00"
  }
}
```

---

### 3. Search Knowledge Base

**Endpoint:** `GET /api/support/knowledge-base/search?q=keyword`

**Example:**

```bash
curl -X GET "http://localhost:5000/api/support/knowledge-base/search?q=%D9%83%D9%8A%D9%81%D9%8A%D8%A9" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200):**

```json
{
  "status": "success",
  "query": "كيفية",
  "results": [
    {
      "id": "kb_001",
      "title": "كيفية البدء",
      "content": "محتوى المقالة...",
      "relevance": 0.95
    }
  ],
  "count": 5
}
```

---

## Performance Analytics API

### نظام تحليل الأداء

### 1. Record Metric

**Endpoint:** `POST /api/analytics/metrics/record`

**Request Body:**

```json
{
  "metric_name": "response_time|memory_usage|cpu_usage|error_rate",
  "value": 250,
  "unit": "ms|%|count",
  "tags": {
    "endpoint": "/api/users",
    "method": "GET",
    "environment": "production"
  }
}
```

**Response (201):**

```json
{
  "status": "success",
  "message": "Metric recorded successfully"
}
```

---

### 2. Get Current Performance

**Endpoint:** `GET /api/analytics/performance/current`

**Response (200):**

```json
{
  "status": "success",
  "performance": {
    "avg_response_time": 150,
    "memory_usage": 45,
    "cpu_usage": 30,
    "error_rate": 0.5,
    "uptime_percentage": 99.95,
    "active_users": 234
  },
  "timestamp": "2026-01-16T10:00:00"
}
```

---

### 3. Analyze Response Time

**Endpoint:** `GET /api/analytics/performance/response-time?endpoint=/api/users&limit=100`

**Response (200):**

```json
{
  "status": "success",
  "analysis": {
    "endpoint": "/api/users",
    "average": 150,
    "minimum": 80,
    "maximum": 450,
    "p95": 300,
    "p99": 400,
    "trend": "stable|improving|degrading"
  }
}
```

---

### 4. Identify Bottlenecks

**Endpoint:** `GET /api/analytics/performance/bottlenecks`

**Response (200):**

```json
{
  "status": "success",
  "bottlenecks": [
    {
      "id": "bn_001",
      "name": "Database Query Slowness",
      "description": "Slow SELECT queries on users table",
      "impact": 85,
      "status": "detected",
      "recommendations": ["Add index on email column", "Optimize query logic"]
    }
  ],
  "count": 3
}
```

---

## Authentication

### Token-based Authentication

All endpoints require an `Authorization` header with a Bearer token:

```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Refresh

**Endpoint:** `POST /api/auth/refresh`

**Response (200):**

```json
{
  "status": "success",
  "token": "new_token_here",
  "expires_in": 3600
}
```

---

## Error Handling

### Standard Error Response

```json
{
  "status": "error",
  "message": "خطأ واضح",
  "error_code": "INVALID_REQUEST",
  "timestamp": "2026-01-16T10:00:00"
}
```

### Common Error Codes

- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error

---

## Rate Limiting

### Limits per User

- **Predictions**: 100 requests/hour
- **Reports**: 50 requests/hour
- **Notifications**: 200 requests/hour
- **Support**: 100 requests/hour
- **Analytics**: 500 requests/hour

### Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1642332000
```

---

## WebHooks

### Supported Events

- `prediction.created`
- `report.completed`
- `notification.delivered`
- `ticket.updated`
- `alert.triggered`

### Register WebHook

**Endpoint:** `POST /api/webhooks/register`

**Request Body:**

```json
{
  "event": "prediction.created",
  "url": "https://your-domain.com/webhook",
  "secret": "webhook_secret_key"
}
```

---

## Code Examples

### Python

```python
import requests

# Get predictions dashboard
response = requests.get(
    'http://localhost:5000/api/predictions/dashboard',
    headers={'Authorization': 'Bearer YOUR_TOKEN'}
)

predictions = response.json()
print(predictions['data']['recent_predictions'])
```

### JavaScript

```javascript
// Send notification
const response = await fetch('/api/notifications/send', {
  method: 'POST',
  headers: {
    Authorization: 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    user_id: 'user_123',
    title: 'تحديث جديد',
    message: 'لديك تحديث جديد',
    channels: ['email', 'push'],
  }),
});

const result = await response.json();
console.log(result);
```

### cURL

```bash
# Create support ticket
curl -X POST http://localhost:5000/api/support/tickets/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_123",
    "title": "مشكلة في النظام",
    "description": "وصف المشكلة",
    "priority": "high"
  }'
```

---

## API Versioning

Current API Version: **v1.0**

All endpoints are prefixed with `/api/v1/` for future compatibility.

---

## Support

For API issues or questions:

- Email: api-support@example.com
- Documentation: https://docs.example.com
- Status Page: https://status.example.com

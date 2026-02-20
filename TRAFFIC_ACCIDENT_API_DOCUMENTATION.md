# Traffic Accident Reporting System - API Documentation
# نظام تقارير الحوادث المرورية - توثيق API

## نظرة عامة | Overview

نظام شامل ومتكامل لادارة وتتبع تقارير الحوادث المرورية مع:
- إدارة كاملة for accident reports
- تحليلات متقدمة لأنماط الحوادث
- تقارير شاملة وتصدير البيانات
- نظام المتابعة والتحقيق
- تحديد المسؤولية والمخالفات

---

## جدول المحتويات | Table of Contents

1. [Authentication](#authentication)
2. [Core Endpoints](#core-endpoints)
3. [Investigation Endpoints](#investigation-endpoints)
4. [Analytics Endpoints](#analytics-endpoints)
5. [Error Handling](#error-handling)
6. [Examples](#examples)

---

## Authentication

جميع الطلبات تتطلب رمز JWT في الـ Header:

```
Authorization: Bearer <token>
```

### Required Scopes (Permissions):
- `view_accident_reports` - عرض التقارير
- `create_accident_report` - إنشاء تقارير جديدة
- `edit_accident_report` - تعديل التقارير
- `delete_accident_report` - حذف/أرشفة التقارير
- `start_investigation` - بدء التحقيقات
- `complete_investigation` - إكمال التحقيقات
- `determine_liability` - تحديد المسؤولية
- `view_accident_statistics` - عرض الإحصائيات
- `view_accident_analytics` - عرض التحليلات
- `export_report` - تصدير التقارير

---

## Core Endpoints

### 1. إنشاء تقرير حادثة جديد | Create Accident Report

**POST** `/api/traffic-accidents`

#### Request Body:
```json
{
  "accidentData": {
    "accidentInfo": {
      "accidentDateTime": "2026-02-18T14:30:00Z",
      "location": {
        "address": "شارع الملك فهد، الرياض",
        "city": "الرياض",
        "region": "المنطقة الوسطى",
        "roadsideDescription": "بالقرب من مستشفى الملك فيصل",
        "coordinates": {
          "type": "Point",
          "coordinates": [46.6753, 24.7136]
        }
      },
      "weather": "clear",
      "visibility": "good",
      "lightingConditions": "daylight",
      "roadConditions": "dry",
      "roadType": "highway",
      "speedLimit": 120,
      "description": "حادثة اصطدام بين مركبتين على الطريق السريع"
    },
    "vehicles": [
      {
        "plateNumber": "ج ا ب 1234",
        "vehicleType": "سيارة سيدان",
        "make": "Toyota",
        "model": "Camry",
        "year": 2022,
        "color": "أبيض"
      }
    ],
    "severity": "moderate",
    "priority": "high"
  }
}
```

#### Response (201 Created):
```json
{
  "success": true,
  "message": "تم إنشاء التقرير بنجاح",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "reportNumber": "TAR-202602-ABC123",
    "status": "draft",
    "severity": "moderate",
    "priority": "high",
    "accidentInfo": { ... },
    "reportedAt": "2026-02-18T14:35:00Z"
  }
}
```

---

### 2. الحصول على جميع التقارير | Get All Reports

**GET** `/api/traffic-accidents`

#### Query Parameters:
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | الحالة: draft, submitted, under_investigation, approved, closed |
| `severity` | string | الشدة: minor, moderate, severe, critical, fatal |
| `city` | string | المدينة |
| `priority` | string | الأولوية: low, medium, high, critical |
| `startDate` | date | تاريخ البداية (YYYY-MM-DD) |
| `endDate` | date | تاريخ النهاية (YYYY-MM-DD) |
| `page` | number | رقم الصفحة (default: 1) |
| `limit` | number | عدد العناصر في الصفحة (default: 20) |

#### Example Request:
```
GET /api/traffic-accidents?status=under_investigation&severity=critical&page=1&limit=20
```

#### Response (200 OK):
```json
{
  "success": true,
  "reports": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "reportNumber": "TAR-202602-ABC123",
      "status": "under_investigation",
      "severity": "critical",
      "accidentInfo": { ... },
      "totalInjured": 3,
      "totalDeaths": 0,
      "financialImpact": {
        "totalLoss": 150000
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

---

### 3. الحصول على تقرير محدد | Get Report by ID

**GET** `/api/traffic-accidents/:id`

#### Response (200 OK):
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "reportNumber": "TAR-202602-ABC123",
    "status": "under_investigation",
    "severity": "critical",
    "accidentInfo": { ... },
    "vehicles": [...],
    "people": { ... },
    "witnesses": [...],
    "investigation": { ... },
    "comments": [...],
    "attachments": [...]
  }
}
```

---

### 4. تحديث تقرير الحادثة | Update Accident Report

**PUT** `/api/traffic-accidents/:id`

#### Request Body:
```json
{
  "updateData": {
    "accidentInfo": {
      "description": "وصف محدث للحادثة"
    },
    "severity": "severe"
  }
}
```

#### Response (200 OK):
```json
{
  "success": true,
  "message": "تم تحديث التقرير بنجاح",
  "data": { ... }
}
```

---

### 5. تحديث حالة التقرير | Update Report Status

**PATCH** `/api/traffic-accidents/:id/status`

#### Request Body:
```json
{
  "status": "approved",
  "notes": "تم مراجعة التقرير وتم الموافقة عليه"
}
```

#### Status Values:
- `draft` - مسودة
- `submitted` - مرسلة
- `under_investigation` - تحت التحقيق
- `under_review` - قيد المراجعة
- `approved` - موافق عليها
- `appeal_pending` - انتظار الاستئناف
- `resolved` - تم حلها
- `closed` - مغلقة
- `archived` - مؤرشفة

#### Response (200 OK):
```json
{
  "success": true,
  "message": "تم تحديث الحالة بنجاح",
  "data": { ... }
}
```

---

### 6. حذف/أرشفة التقرير | Delete Report

**DELETE** `/api/traffic-accidents/:id`

#### Request Body:
```json
{
  "reason": "متطابقة مع تقرير آخر"
}
```

#### Response (200 OK):
```json
{
  "success": true,
  "message": "تم أرشفة التقرير بنجاح"
}
```

---

### 7. البحث المتقدم | Search Reports

**GET** `/api/traffic-accidents/search`

#### Query Parameters:
| Parameter | Type | Description |
|-----------|------|-------------|
| `q` | string | معيار البحث (رقم التقرير، الموقع، إلخ) |
| `severity` | string | فلترة حسب الشدة |
| `status` | string | فلترة حسب الحالة |
| `page` | number | رقم الصفحة |
| `limit` | number | عدد النتائج |

#### Example Request:
```
GET /api/traffic-accidents/search?q=الرياض&severity=critical&page=1&limit=10
```

#### Response (200 OK):
```json
{
  "success": true,
  "reports": [...],
  "pagination": { ... }
}
```

---

### 8. الحصول على الحوادث القريبة | Get Nearby Accidents

**GET** `/api/traffic-accidents/nearby`

#### Query Parameters:
| Parameter | Type | Description |
|-----------|------|-------------|
| `latitude` | number | خط العرض |
| `longitude` | number | خط الطول |
| `maxDistance` | number | أقصى مسافة بالمتر (default: 5000) |

#### Example Request:
```
GET /api/traffic-accidents/nearby?latitude=24.7136&longitude=46.6753&maxDistance=5000
```

#### Response (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "reportNumber": "TAR-202602-ABC123",
      "distance": 1234,
      "accidentInfo": { ... }
    }
  ]
}
```

---

### 9. المتابعات المتأخرة | Get Overdue Follow-ups

**GET** `/api/traffic-accidents/overdue`

#### Query Parameters:
| Parameter | Type | Description |
|-----------|------|-------------|
| `daysThreshold` | number | عدد الأيام (default: 30) |

#### Response (200 OK):
```json
{
  "success": true,
  "count": 5,
  "data": [...]
}
```

---

## Investigation Endpoints

### 1. بدء التحقيق | Start Investigation

**POST** `/api/traffic-accidents/:id/investigation/start`

#### Request Body:
```json
{
  "investigatingOfficerId": "507f1f77bcf86cd799439012"
}
```

#### Response (200 OK):
```json
{
  "success": true,
  "message": "تم بدء التحقيق بنجاح",
  "data": {
    "investigation": {
      "status": "in_progress",
      "investigatingOfficer": "507f1f77bcf86cd799439012",
      "startDate": "2026-02-18T14:40:00Z"
    }
  }
}
```

---

### 2. إكمال التحقيق | Complete Investigation

**POST** `/api/traffic-accidents/:id/investigation/complete`

#### Request Body:
```json
{
  "findings": "بناءً على الشهادات والأدلة المجمعة، تم تحديد السبب الرئيسي",
  "rootCause": "human_error",
  "primaryCause": "fatigue_driving",
  "contributingFactors": [
    "عدم الالتزام بحدود السرعة",
    "عدم الانتباه للطريق"
  ],
  "recommendations": [
    "حضور دورة تدريبية في السلامة",
    "تجديد الترخيص بعد فترة انتظار"
  ]
}
```

#### Response (200 OK):
```json
{
  "success": true,
  "message": "تم إكمال التحقيق بنجاح",
  "data": {
    "investigation": {
      "status": "completed",
      "completedDate": "2026-02-20T10:00:00Z",
      "findings": "...",
      "rootCause": "human_error"
    }
  }
}
```

---

### 3. إضافة شاهد | Add Witness

**POST** `/api/traffic-accidents/:id/witnesses`

#### Request Body:
```json
{
  "name": "محمد أحمد",
  "phone": "+966501234567",
  "email": "witness@example.com",
  "address": "الرياض، حي النرجس",
  "identityNumber": "1234567890",
  "relationship": "witness",
  "statement": "شهدت الحادثة وأفادت بما يلي..."
}
```

---

### 4. تحديد المسؤولية | Determine Liability

**POST** `/api/traffic-accidents/:id/liability`

#### Request Body:
```json
{
  "primaryResponsiblePartyId": "507f1f77bcf86cd799439013",
  "responsibilityPercentage": 100,
  "determination": "full"
}
```

#### Determination Values:
- `full` - مسؤولية كاملة
- `partial` - مسؤولية جزئية
- `no_fault` - بدون خطأ
- `undetermined` - غير محدد

---

### 5. إضافة معلومات التأمين | Add Insurance Info

**POST** `/api/traffic-accidents/:id/vehicles/:vehicleIndex/insurance`

#### Request Body:
```json
{
  "companyName": "شركة التعاونية للتأمين",
  "policyNumber": "POL-123456789",
  "expiryDate": "2026-12-31",
  "claimNumber": "CLAIM-2026-001",
  "claimStatus": "pending"
}
```

---

### 6. تحديث معلومات الضرر | Update Damage Info

**PUT** `/api/traffic-accidents/:id/vehicles/:vehicleIndex/damage`

#### Request Body:
```json
{
  "type": "major",
  "estimatedCost": 45000,
  "damageDescription": "ضرر في الجزء الأمامي والجانبي"
}
```

#### Damage Types:
- `total_loss` - خسارة كاملة
- `major` - ضرر رئيسي
- `moderate` - ضرر متوسط
- `minor` - ضرر طفيف
- `no_damage` - بدون ضرر

---

## Analytics Endpoints

### 1. الإحصائيات العامة | General Statistics

**GET** `/api/traffic-accidents/statistics`

#### Query Parameters:
| Parameter | Type | Description |
|-----------|------|-------------|
| `startDate` | date | تاريخ البداية |
| `endDate` | date | تاريخ النهاية |
| `city` | string | المدينة |
| `severity` | string | الشدة |
| `status` | string | الحالة |

#### Response (200 OK):
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalReports": 156,
      "totalInjured": 87,
      "totalDeaths": 3,
      "totalFinancialLoss": 1250000,
      "averageFinancialLoss": 8012.82,
      "criticalSeverity": 12,
      "severeSeverity": 34
    },
    "statusDistribution": [
      {
        "_id": "closed",
        "count": 120
      }
    ],
    "severityDistribution": [
      {
        "_id": "moderate",
        "count": 89
      }
    ]
  }
}
```

---

### 2. تحليل الأماكن الخطرة | Hotspots Analysis

**GET** `/api/traffic-accidents/analytics/hotspots`

#### Query Parameters:
| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | number | عدد النتائج (default: 10) |

#### Response (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "_id": {
        "city": "الرياض",
        "address": "شارع الملك فهد"
      },
      "count": 45,
      "injuries": 67,
      "deaths": 2,
      "avgLoss": 125000
    }
  ]
}
```

---

### 3. تحليل المخالفات | Violation Analysis

**GET** `/api/traffic-accidents/analytics/violations`

#### Response (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "_id": "speeding",
      "count": 67,
      "severityBreakdown": ["minor", "moderate", "severe"],
      "avgFineAmount": 300
    }
  ]
}
```

---

### 4. الرؤى الرئيسية | Key Insights

**GET** `/api/traffic-accidents/analytics/key-insights`

#### Response (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "type": "CASE_VOLUME",
      "title": "حجم القضايا",
      "value": 156,
      "description": "تم تسجيل 156 حادثة مرورية"
    },
    {
      "type": "CRITICAL_CASES",
      "title": "الحالات الحرجة",
      "value": 12,
      "percentage": "7.7",
      "description": "7.7% من الحوادث حالات حرجة",
      "alert": true
    },
    {
      "type": "HOTSPOT",
      "title": "منطقة الخطر",
      "location": "الرياض",
      "count": 45,
      "description": "أكثر المناطق خطورة: الرياض"
    }
  ]
}
```

---

### 5. الملخص الشامل | Comprehensive Summary

**GET** `/api/traffic-accidents/analytics/comprehensive-summary`

#### Response (200 OK):
```json
{
  "success": true,
  "data": {
    "generatedAt": "2026-02-18T14:50:00Z",
    "summary": { ... },
    "hotspots": [...],
    "violationPatterns": [...],
    "injuryRates": {...},
    "financialImpact": {...},
    "investigatorPerformance": [...],
    "seasonalTrends": [...]
  }
}
```

---

## Export Endpoints

### 1. تصدير PDF | Export PDF

**GET** `/api/traffic-accidents/:id/export/pdf`

#### Response:
يتم تحميل ملف PDF للتقرير

---

### 2. تصدير Excel | Export Excel

**GET** `/api/traffic-accidents/export/excel`

#### Query Parameters:
| Parameter | Type | Description |
|-----------|------|-------------|
| `startDate` | date | تاريخ البداية |
| `endDate` | date | تاريخ النهاية |
| `city` | string | المدينة |
| `severity` | string | الشدة |

#### Response:
يتم تحميل ملف Excel بقائمة التقارير

---

## Error Handling

### Standard Error Response:
```json
{
  "success": false,
  "message": "وصف الخطأ بالعربية"
}
```

### Common HTTP Status Codes:
| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |

### Error Examples:
```json
{
  "success": false,
  "message": "التقرير غير موجود"
}

{
  "success": false,
  "message": "بيانات الحادث مطلوبة"
}
```

---

## Examples

### Complete Workflow Example:

#### 1. Create Report
```bash
curl -X POST http://localhost:3001/api/traffic-accidents \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"accidentData":{...}}'
```

#### 2. Get Report Details
```bash
curl -X GET http://localhost:3001/api/traffic-accidents/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer <token>"
```

#### 3. Start Investigation
```bash
curl -X POST http://localhost:3001/api/traffic-accidents/507f1f77bcf86cd799439011/investigation/start \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"investigatingOfficerId":"507f1f77bcf86cd799439012"}'
```

#### 4. Add Witness
```bash
curl -X POST http://localhost:3001/api/traffic-accidents/507f1f77bcf86cd799439011/witnesses \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"محمد أحمد",...}'
```

#### 5. Complete Investigation
```bash
curl -X POST http://localhost:3001/api/traffic-accidents/507f1f77bcf86cd799439011/investigation/complete \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"findings":"...",...}'
```

#### 6. Export Report
```bash
curl -X GET http://localhost:3001/api/traffic-accidents/507f1f77bcf86cd799439011/export/pdf \
  -H "Authorization: Bearer <token>" \
  -o report.pdf
```

---

## Rate Limiting

- الحد الأقصى: 100 طلب لكل دقيقة
- الحد المسموح للتصدير: 10 طلبات لكل ساعة

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-18 | Initial Release |

---

## Support

للمزيد من المساعدة، يرجى التواصل مع فريق الدعم:
- Email: support@transport.system
- Phone: +966123456789

---

**آخر تحديث: 18 فبراير 2026**

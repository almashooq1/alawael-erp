# Finance Module - API Documentation

**Base URL**: `http://localhost:5000/api/finance`

**Version**: 1.0.0  
**Last Updated**: February 16, 2025

---

## 📋 Table of Contents

1. [Authentication](#authentication)
2. [Validation Endpoints](#validation-endpoints)
3. [Cash Flow Endpoints](#cash-flow-endpoints)
4. [Risk Endpoints](#risk-endpoints)
5. [Error Handling](#error-handling)
6. [Example Workflows](#example-workflows)

---

## Authentication

All endpoints require JWT Bearer token authentication.

### Headers
```
Authorization: Bearer <token>
Content-Type: application/json
```

### Token Format
```json
{
  "userId": "user_id",
  "role": "manager|auditor|director|admin",
  "iat": 1234567890,
  "exp": 1234571490
}
```

---

## Validation Endpoints

### GET /validation/violations

Get all violations with optional filtering.

**Query Parameters**:
- `status` (string): Filter by status - `detected`, `investigating`, `resolved`, `waived`
- `severity` (string): Filter by severity - `critical`, `high`, `medium`, `low`
- `type` (string): Filter by type - `amount_mismatch`, `missing_entry`, `incorrect_account`, `invalid_date`, `duplicate`, `unauthorized`
- `skip` (number): Pagination skip (default: 0)
- `limit` (number): Pagination limit (default: 20)

**Example Request**:
```bash
GET /validation/violations?severity=critical&status=detected&limit=10
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "60d5ec49c1234567890abcd1",
      "transactionId": "60d5ec49c1234567890abcd2",
      "violationType": "amount_mismatch",
      "severity": "critical",
      "description": "Invoice amount does not match payment",
      "amount": 5000,
      "expectedValue": 5000,
      "actualValue": 4500,
      "status": "detected",
      "detectionDate": "2025-02-16T10:30:00Z",
      "resolution": null,
      "auditTrail": [
        {
          "action": "detected",
          "timestamp": "2025-02-16T10:30:00Z",
          "performedBy": "system",
          "notes": "Automated validation check"
        }
      ]
    }
  ],
  "pagination": {
    "total": 42,
    "skip": 0,
    "limit": 10,
    "pages": 5
  }
}
```

---

### GET /validation/violations/:id

Get a specific violation with full details.

**Path Parameters**:
- `id` (string): Violation ID

**Example Request**:
```bash
GET /validation/violations/60d5ec49c1234567890abcd1
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "_id": "60d5ec49c1234567890abcd1",
    "transactionId": {
      "_id": "60d5ec49c1234567890abcd2",
      "date": "2025-02-15T00:00:00Z",
      "amount": 5000,
      "description": "Invoice #2025-001"
    },
    "violationType": "amount_mismatch",
    "severity": "critical",
    "description": "Invoice amount mismatch",
    "amount": 500,
    "expectedValue": 5000,
    "actualValue": 4500,
    "status": "detected",
    "detectionDate": "2025-02-16T10:30:00Z",
    "resolution": null,
    "relatedTransactions": [],
    "evidenceDocuments": [],
    "auditTrail": []
  }
}
```

---

### POST /validation/violations/:id/resolve

Resolve a violation.

**Path Parameters**:
- `id` (string): Violation ID

**Request Body**:
```json
{
  "status": "resolved",
  "resolution_notes": "Amount difference was due to early payment discount",
  "correctionAmount": -500
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "_id": "60d5ec49c1234567890abcd1",
    "status": "resolved",
    "resolution": {
      "resolvedBy": {
        "_id": "user_12345",
        "name": "John Manager",
        "email": "john@example.com"
      },
      "resolvedAt": "2025-02-16T11:00:00Z",
      "resolution_notes": "Amount difference was due to early payment discount",
      "correctionAmount": -500
    }
  }
}
```

---

### GET /validation/violations-report

Get violations report with statistics.

**Query Parameters**:
- `startDate` (string): ISO date format
- `endDate` (string): ISO date format

**Response (200 OK)**:
```json
{
  "success": true,
  "data": [],
  "stats": {
    "total": 42,
    "bySeverity": {
      "critical": 5,
      "high": 12,
      "medium": 18,
      "low": 7
    },
    "byType": {
      "amount_mismatch": 10,
      "missing_entry": 8,
      "incorrect_account": 12,
      "invalid_date": 5,
      "duplicate": 4,
      "unauthorized": 3
    },
    "byStatus": {
      "detected": 15,
      "investigating": 10,
      "resolved": 16,
      "waived": 1
    },
    "complianceRate": 65.5
  }
}
```

---

### POST /validation/reports/generate

Generate a compliance validation report.

**Request Body**:
```json
{
  "startDate": "2025-02-01",
  "endDate": "2025-02-28"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "_id": "60d5ec49c1234567890abcd1",
    "reportPeriod": {
      "startDate": "2025-02-01T00:00:00Z",
      "endDate": "2025-02-28T23:59:59Z"
    },
    "generatedAt": "2025-02-16T12:00:00Z",
    "generatedBy": {
      "_id": "user_12345",
      "name": "Audit Manager",
      "email": "audit@example.com"
    },
    "violationCountByType": {
      "amount_mismatch": 10,
      "missing_entry": 8,
      "incorrect_account": 12,
      "invalid_date": 5,
      "duplicate": 4,
      "unauthorized": 3
    },
    "violationsCount": {
      "critical": 5,
      "high": 12,
      "medium": 18,
      "low": 7
    },
    "complianceMetrics": {
      "totalTransactions": 1000,
      "violatedTransactions": 42,
      "complianceRate": 95.8,
      "resolvedViolations": 25,
      "outstandingViolations": 15,
      "waivedViolations": 2,
      "resolutionRate": 59.5
    },
    "summary": {
      "overallRating": "good",
      "keyFindings": [
        "5 critical violations detected",
        "25 violations resolved",
        "Compliance rate: 95.8%"
      ],
      "recommendations": [
        "Implement automated validation checks",
        "Enhance segregation of duties",
        "Improve transaction documentation"
      ],
      "riskAssessment": {
        "financialLoss": 50000,
        "fraudRisk": "low"
      }
    },
    "status": "approved",
    "approvals": [
      {
        "approvedBy": {
          "_id": "user_67890",
          "name": "Director",
          "email": "director@example.com"
        },
        "approvedAt": "2025-02-16T13:00:00Z",
        "level": "director",
        "comments": "Approved for distribution"
      }
    ]
  }
}
```

---

## Cash Flow Endpoints

### GET /cashflow/summary

Get cash flow summary with trend data.

**Query Parameters**:
- `startDate` (string): ISO date format
- `endDate` (string): ISO date format

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "totalInflows": 500000,
    "totalOutflows": 420000,
    "netCashFlow": 80000,
    "periods": [
      {
        "period": {
          "startDate": "2025-02-01T00:00:00Z",
          "endDate": "2025-02-07T23:59:59Z"
        },
        "inflows": 150000,
        "outflows": 120000,
        "netFlow": 30000,
        "closingBalance": 380000
      }
    ]
  }
}
```

---

### POST /cashflow/create

Create a new cash flow entry.

**Request Body**:
```json
{
  "period": {
    "startDate": "2025-02-16",
    "endDate": "2025-02-22"
  },
  "inflows": [
    {
      "category": "revenue",
      "subcategory": "Product Sales",
      "description": "Weekly sales revenue",
      "amount": 150000,
      "date": "2025-02-16",
      "status": "actual"
    }
  ],
  "outflows": [
    {
      "category": "expense",
      "subcategory": "Payroll",
      "description": "Employee salaries",
      "amount": 80000,
      "date": "2025-02-15",
      "status": "actual"
    }
  ],
  "openingBalance": 300000
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "_id": "60d5ec49c1234567890abcd1",
    "summary": {
      "totalInflows": 150000,
      "totalOutflows": 80000,
      "netCashFlow": 70000,
      "openingBalance": 300000,
      "closingBalance": 370000
    },
    "status": "draft"
  }
}
```

---

### GET /cashflow/forecasts/all

Get all forecasts.

**Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "60d5ec49c1234567890abcd1",
      "forecastPeriod": {
        "startDate": "2025-03-01T00:00:00Z",
        "endDate": "2025-05-31T23:59:59Z"
      },
      "baseline": {
        "month1": {
          "inflows": 500000,
          "outflows": 420000
        },
        "month2": {
          "inflows": 510000,
          "outflows": 424200
        },
        "month3": {
          "inflows": 525000,
          "outflows": 429000
        }
      },
      "scenarios": [
        {
          "name": "optimistic",
          "month1": { "inflows": 600000, "outflows": 378000 },
          "month2": { "inflows": 612000, "outflows": 381780 },
          "month3": { "inflows": 630000, "outflows": 387100 },
          "probability": 25
        },
        {
          "name": "pessimistic",
          "month1": { "inflows": 400000, "outflows": 462000 },
          "month2": { "inflows": 408000, "outflows": 466620 },
          "month3": { "inflows": 420000, "outflows": 471900 },
          "probability": 25
        },
        {
          "name": "conservative",
          "month1": { "inflows": 475000, "outflows": 441000 },
          "month2": { "inflows": 484500, "outflows": 444420 },
          "month3": { "inflows": 498750, "outflows": 449450 },
          "probability": 50
        }
      ],
      "confidenceIntervals": {
        "lower": {
          "month1": { "inflows": 425000, "outflows": 483000 },
          "month2": { "inflows": 433500, "outflows": 486828 },
          "month3": { "inflows": 446250, "outflows": 491850 }
        },
        "upper": {
          "month1": { "inflows": 575000, "outflows": 357000 },
          "month2": { "inflows": 586500, "outflows": 361572 },
          "month3": { "inflows": 603750, "outflows": 366150 }
        }
      },
      "status": "approved"
    }
  ]
}
```

---

### POST /cashflow/forecasts/generate

Generate a new forecast.

**Request Body**:
```json
{
  "startDate": "2025-03-01",
  "endDate": "2025-05-31",
  "assumptions": [
    "Market growth continues at 5%",
    "No major customer losses",
    "Operational costs increase by 3%"
  ]
}
```

**Response (200 OK)**: Same as GET /cashflow/forecasts/all item

---

### GET /cashflow/reserves/all

Get all reserves.

**Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "60d5ec49c1234567890abcd1",
      "name": "operating_reserve",
      "targetAmount": 500000,
      "currentAmount": 450000,
      "adequacyRatio": {
        "actual": 0.9,
        "minimum": 0.8,
        "required": 1.0,
        "status": "adequate"
      },
      "allocation": [
        {
          "purpose": "Emergency fund",
          "amount": 250000,
          "percentage": 55.6
        },
        {
          "purpose": "Maintenance fund",
          "amount": 200000,
          "percentage": 44.4
        }
      ],
      "transactions": [
        {
          "date": "2025-02-15T10:00:00Z",
          "type": "deposit",
          "amount": 50000,
          "description": "Monthly contribution",
          "approvedBy": {
            "_id": "user_12345",
            "name": "Manager"
          }
        }
      ]
    }
  ]
}
```

---

### POST /cashflow/reserves/:id/transaction

Record a reserve transaction (deposit/withdrawal).

**Path Parameters**:
- `id` (string): Reserve ID

**Request Body**:
```json
{
  "type": "deposit",
  "amount": 50000,
  "description": "Monthly contribution from operations"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "_id": "60d5ec49c1234567890abcd1",
    "name": "operating_reserve",
    "currentAmount": 500000,
    "adequacyRatio": {
      "actual": 1.0,
      "status": "adequate"
    }
  }
}
```

---

## Risk Endpoints

### GET /risk/matrix

Get the active risk matrix.

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "_id": "60d5ec49c1234567890abcd1",
    "assessmentPeriod": {
      "startDate": "2025-02-16T00:00:00Z",
      "endDate": "2025-02-28T23:59:59Z"
    },
    "riskItems": [
      {
        "_id": "60d5ec49c1234567890abcd2",
        "riskId": "RISK-001",
        "title": "Currency Exchange Risk",
        "description": "Exposure to foreign currency fluctuations",
        "category": "market",
        "probability": {
          "value": 6,
          "description": "Medium-High probability"
        },
        "impact": {
          "value": 7,
          "financial": 500000
        },
        "severity": {
          "probabilityScore": 6,
          "impactScore": 7,
          "riskScore": 42,
          "zone": "orange"
        },
        "status": "mitigating",
        "owner": {
          "_id": "user_12345",
          "name": "Risk Manager"
        },
        "mitigationStrategies": [
          {
            "strategy": "Hedging program",
            "description": "Implement currency hedging for major exposures",
            "status": "in_progress",
            "expectedImpactReduction": 40
          }
        ]
      }
    ],
    "matrixStats": {
      "totalIdentifiedRisks": 15,
      "risksByZone": {
        "green": 5,
        "yellow": 4,
        "orange": 4,
        "red": 2
      },
      "averageRiskScore": 38.5,
      "trend": "stable"
    },
    "topRisks": [
      {
        "riskId": "60d5ec49c1234567890abcd2",
        "riskScore": 80,
        "priority": "critical",
        "mitigationProgress": 30
      }
    ]
  }
}
```

---

### GET /risk/heatmap

Get heatmap data for 10x10 matrix visualization.

**Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    [
      { "probability": 1, "impact": 1, "count": 0, "risks": [] },
      ...
    ]
  ]
}
```

---

### POST /risk/create

Create a new risk item.

**Request Body**:
```json
{
  "riskId": "RISK-NEW-001",
  "title": "Cybersecurity Breach",
  "description": "Potential unauthorized access to financial systems",
  "category": "compliance",
  "probability": {
    "value": 4,
    "description": "Low-Medium probability",
    "historicalOccurrence": 2
  },
  "impact": {
    "value": 9,
    "financial": 2000000,
    "operational": "System shutdown, data loss",
    "reputational": "Loss of customer trust"
  }
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "_id": "60d5ec49c1234567890abcd3",
    "riskId": "RISK-NEW-001",
    "severity": {
      "riskScore": 36,
      "zone": "yellow"
    }
  }
}
```

---

### PUT /risk/:id

Update a risk item.

**Path Parameters**:
- `id` (string): Risk Item ID

**Request Body** (partial update):
```json
{
  "probability": {
    "value": 5
  },
  "impact": {
    "value": 8
  },
  "status": "monitored"
}
```

**Response (200 OK)**: Updated risk item object

---

### POST /risk/:id/mitigation

Add mitigation strategy to risk.

**Path Parameters**:
- `id` (string): Risk Item ID

**Request Body**:
```json
{
  "strategy": "Security Audit",
  "description": "Conduct quarterly security audits",
  "targetDate": "2025-05-31",
  "expectedImpactReduction": 25
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "_id": "60d5ec49c1234567890abcd3",
    "mitigationStrategies": [
      {
        "strategy": "Security Audit",
        "description": "Conduct quarterly security audits",
        "owner": "user_12345",
        "targetDate": "2025-05-31T00:00:00Z",
        "status": "planned",
        "expectedImpactReduction": 25
      }
    ]
  }
}
```

---

## Error Handling

### Error Response Format

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "errorCode": "CODE_001",
  "details": {}
}
```

### Common Error Codes

| Code | Status | Message |
|------|--------|---------|
| 400 | Bad Request | Invalid input data |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Duplicate resource |
| 500 | Server Error | Internal server error |

### Example Error Response

```json
{
  "success": false,
  "message": "Violation not found",
  "errorCode": "VALIDATION_NOT_FOUND",
  "details": {
    "id": "invalid-id-format"
  }
}
```

---

## Example Workflows

### 1. Compliance Violation Resolution Workflow

```
1. GET /validation/violations?severity=critical
   → Retrieve critical violations

2. GET /validation/violations/:id
   → View violation details

3. POST /validation/violations/:id/resolve
   → Resolve with notes and correction

4. GET /validation/violations-report
   → View updated compliance metrics
```

### 2. Cash Flow Forecasting Workflow

```
1. GET /cashflow/summary
   → Get current cash position

2. POST /cashflow/forecasts/generate
   → Create 3-month forecast with scenarios

3. GET /cashflow/forecasts/all
   → View all forecasts

4. POST /cashflow/reserves/:id/transaction
   → Record reserve adjustments
```

### 3. Risk Assessment Workflow

```
1. POST /risk/create
   → Identify new risk

2. GET /risk/matrix
   → View risk matrix

3. POST /risk/:id/mitigation
   → Add mitigation strategy

4. PUT /risk/:id
   → Update risk status as mitigation progresses

5. GET /risk/heatmap
   → View updated heatmap
```

---

**Documentation Version**: 1.0.0
**Last Updated**: Feb 16, 2025

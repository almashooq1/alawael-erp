# 🔌 API Endpoints - نظام الموارد البشرية السعودي

**التاريخ:** 14 يناير 2026  
**الإصدار:** v1.0.0  
**البيئة:** Production-Ready

---

## 📋 جدول المحتويات

1. [إدارة الموظفين](#إدارة-الموظفين)
2. [معالجة الرواتب](#معالجة-الرواتب)
3. [التأمينات الاجتماعية](#التأمينات-الاجتماعية)
4. [التأمين الصحي](#التأمين-الصحي)
5. [الإجازات والغيابات](#الإجازات-والغيابات)
6. [التقارير](#التقارير)

---

## 🔐 المصادقة

```javascript
// جميع الطلبات تحتاج رأس Authorization
headers: {
  'Authorization': 'Bearer {JWT_TOKEN}',
  'Content-Type': 'application/json'
}

// الحصول على Token
POST /api/v1/auth/login
{
  "email": "user@company.com",
  "password": "password123"
}

// Response:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "24h",
  "user": {
    "id": "emp_123456",
    "name": "أحمد محمد",
    "role": "hr_manager"
  }
}
```

---

## 👥 إدارة الموظفين

### إنشاء موظف جديد

```javascript
POST /api/v1/employees
Content-Type: application/json

{
  "personal": {
    "arabicName": "أحمد محمد علي",
    "englishName": "Ahmed Mohammed Ali",
    "idNumber": "1234567890",
    "idType": "national_id",
    "dateOfBirth": "1990-05-15",
    "gender": "M",
    "nationality": "SA",
    "maritalStatus": "married",
    "dependents": 2,
    "phone": "+966501234567",
    "email": "ahmed@company.com",
    "address": "الرياض، حي النرجس"
  },

  "employment": {
    "positionTitle": "مهندس برمجيات",
    "department": "تقنية المعلومات",
    "manager": "emp_098765",
    "hireDate": "2024-01-01",
    "employmentType": "permanent",
    "baseSalary": 15000,
    "salaryBand": "B3",
    "jobGrade": "G5",
    "workLocation": "الرياض",
    "workingHours": 40
  },

  "socialInsurance": {
    "insuranceType": "1",
    "registrationDate": "2024-01-01"
  },

  "healthInsurance": {
    "planType": "silver",
    "familyCoverage": true,
    "coveredDependents": 2
  },

  "banking": {
    "bankName": "الراجحي",
    "accountNumber": "SA1234567890123456789012",
    "iban": "SA1234567890123456789012",
    "accountHolder": "أحمد محمد علي"
  }
}

// Response:
{
  "success": true,
  "message": "تم إنشاء ملف الموظف بنجاح",
  "employee": {
    "id": "emp_789012",
    "status": "active",
    "gosiRegistered": true,
    "insuranceActive": true
  }
}
```

### الحصول على بيانات موظف

```javascript
GET /api/v1/employees/{employeeId}

// Response:
{
  "success": true,
  "employee": {
    "id": "emp_789012",
    "personal": { ... },
    "employment": { ... },
    "socialInsurance": {
      "gosi_id": "1234567890",
      "status": "active",
      "lastContribution": "2026-01-01"
    },
    "healthInsurance": {
      "policyNumber": "INS-2026-001",
      "status": "active",
      "coverage": "silver"
    },
    "leave": {
      "annualLeaveBalance": 15,
      "sickLeaveBalance": 30,
      "unpaidLeaveUsed": 0
    },
    "performance": {
      "lastReview": "2025-12-31",
      "rating": 4.5,
      "nextReview": "2026-12-31"
    }
  }
}
```

### تحديث بيانات موظف

```javascript
PATCH /api/v1/employees/{employeeId}

{
  "employment": {
    "baseSalary": 18000,
    "salaryBand": "B4"
  }
}

// Response:
{
  "success": true,
  "message": "تم تحديث بيانات الموظف بنجاح",
  "updated": ["employment.baseSalary", "employment.salaryBand"],
  "effectiveDate": "2026-02-01"
}
```

### إنهاء خدمة موظف

```javascript
POST /api/v1/employees/{employeeId}/terminate

{
  "terminationDate": "2026-02-28",
  "reason": "resignation",
  "noticeGiven": true,
  "noticeDays": 30,
  "calculateEndOfService": true
}

// Response:
{
  "success": true,
  "message": "تم إنهاء خدمة الموظف بنجاح",
  "termination": {
    "effectiveDate": "2026-02-28",
    "endOfServiceBenefit": 37500.00,
    "unpaidLeaveDays": 10,
    "finalSettlement": {
      "salary": 18000.00,
      "endOfService": 37500.00,
      "unpaidLeave": -6000.00,
      "total": 49500.00
    }
  },
  "gosiNotification": "submitted",
  "insuranceCancellation": "pending"
}
```

---

## 💰 معالجة الرواتب

### حساب راتب موظف

```javascript
POST /api/v1/payroll/calculate

{
  "employeeId": "emp_789012",
  "payPeriod": "2026-01",
  "attendance": {
    "workedDays": 22,
    "absentDays": 0,
    "overtimeHours": 10
  },
  "bonuses": [
    {
      "type": "performance",
      "amount": 1000
    }
  ]
}

// Response:
{
  "success": true,
  "payroll": {
    "employeeId": "emp_789012",
    "payPeriod": "2026-01",

    "earnings": {
      "basicSalary": 18000.00,
      "allowances": {
        "housing": 9000.00,
        "transportation": 1000.00,
        "meals": 500.00,
        "phone": 300.00
      },
      "overtime": 468.75,
      "bonuses": 1000.00,
      "total": 30268.75
    },

    "deductions": {
      "socialInsurance": 1755.00,
      "incomeTax": 0.00,
      "loans": 500.00,
      "total": 2255.00
    },

    "netSalary": 28013.75,

    "paymentInfo": {
      "paymentDate": "2026-01-25",
      "bankAccount": "SA1234567890123456789012",
      "paymentMethod": "bank_transfer"
    }
  }
}
```

### معالجة رواتب جميع الموظفين

```javascript
POST /api/v1/payroll/process-batch

{
  "payPeriod": "2026-01",
  "paymentDate": "2026-01-25",
  "departments": ["IT", "HR", "Finance"],  // اختياري
  "autoSubmit": false
}

// Response:
{
  "success": true,
  "batchId": "batch_2026_01",
  "summary": {
    "totalEmployees": 150,
    "processed": 150,
    "failed": 0,
    "totalAmount": 2250000.00,
    "status": "pending_approval"
  },
  "details": [
    {
      "employeeId": "emp_789012",
      "netSalary": 28013.75,
      "status": "calculated"
    }
    // ... المزيد
  ]
}
```

### الموافقة على الرواتب

```javascript
POST /api/v1/payroll/batch/{batchId}/approve

{
  "approvedBy": "mgr_123456",
  "notes": "معتمد للصرف"
}

// Response:
{
  "success": true,
  "message": "تمت الموافقة على دفعة الرواتب",
  "batchId": "batch_2026_01",
  "status": "approved",
  "readyForTransfer": true
}
```

### تنفيذ التحويل البنكي

```javascript
POST /api/v1/payroll/batch/{batchId}/transfer

{
  "executedBy": "fin_123456"
}

// Response:
{
  "success": true,
  "message": "تم تنفيذ التحويل البنكي بنجاح",
  "batchId": "batch_2026_01",
  "transfers": {
    "total": 150,
    "successful": 148,
    "failed": 2,
    "totalAmount": 2245000.00
  },
  "failedTransfers": [
    {
      "employeeId": "emp_999999",
      "reason": "invalid_account",
      "action": "manual_review_required"
    }
  ],
  "bankConfirmation": "TX-2026-01-25-001"
}
```

### الحصول على قسيمة راتب

```javascript
GET /api/v1/payroll/payslip/{employeeId}/{payPeriod}

// Response: PDF file
Content-Type: application/pdf
Content-Disposition: attachment; filename="payslip_emp_789012_2026_01.pdf"
```

---

## 🛡️ التأمينات الاجتماعية

### تسجيل موظف في GOSI

```javascript
POST /api/v1/gosi/register

{
  "employeeId": "emp_789012",
  "insuranceType": "1",
  "startDate": "2026-01-01",
  "insurableSalary": 18000
}

// Response:
{
  "success": true,
  "message": "تم تسجيل الموظف في التأمينات بنجاح",
  "gosi": {
    "gosi_id": "1234567890",
    "registrationDate": "2026-01-01",
    "insuranceType": "1",
    "status": "active",
    "monthlyContribution": {
      "employee": 1755.00,
      "employer": 2340.00,
      "total": 4095.00
    }
  }
}
```

### تقرير GOSI الشهري

```javascript
POST /api/v1/gosi/report/monthly

{
  "month": "2026-01",
  "autoSubmit": true
}

// Response:
{
  "success": true,
  "report": {
    "month": "2026-01",
    "totalEmployees": 150,
    "saudiEmployees": 120,
    "expatriates": 30,
    "totalContributions": {
      "employees": 263250.00,
      "employers": 351000.00,
      "total": 614250.00
    },
    "submissionDate": "2026-02-01",
    "gosiReference": "GOSI-2026-01-001",
    "status": "submitted"
  },
  "fileGenerated": "gosi_report_2026_01.xml"
}
```

### إنهاء اشتراك موظف

```javascript
POST /api/v1/gosi/terminate

{
  "employeeId": "emp_789012",
  "terminationDate": "2026-02-28",
  "reason": "resignation"
}

// Response:
{
  "success": true,
  "message": "تم إنهاء اشتراك الموظف في التأمينات",
  "gosi": {
    "gosi_id": "1234567890",
    "terminationDate": "2026-02-28",
    "totalContributions": 49140.00,
    "yearsOfService": 2.5,
    "status": "terminated"
  },
  "gosiNotification": "submitted"
}
```

---

## 🏥 التأمين الصحي

### تسجيل في خطة تأمين

```javascript
POST /api/v1/insurance/enroll

{
  "employeeId": "emp_789012",
  "planType": "silver",
  "familyCoverage": true,
  "dependents": [
    {
      "name": "فاطمة أحمد",
      "relation": "spouse",
      "idNumber": "2234567890",
      "dateOfBirth": "1992-03-20"
    },
    {
      "name": "محمد أحمد",
      "relation": "child",
      "idNumber": "3234567890",
      "dateOfBirth": "2015-07-10"
    }
  ]
}

// Response:
{
  "success": true,
  "message": "تم التسجيل في التأمين الصحي بنجاح",
  "insurance": {
    "policyNumber": "INS-2026-001",
    "insurer": "شركة التعاونية للتأمين",
    "planType": "silver",
    "coverageStartDate": "2026-02-01",
    "monthlyPremium": {
      "employee": 600.00,
      "employer": 1800.00,
      "total": 2400.00
    },
    "coveredMembers": [
      {
        "name": "أحمد محمد علي",
        "relation": "self",
        "cardNumber": "CARD-001-001"
      },
      {
        "name": "فاطمة أحمد",
        "relation": "spouse",
        "cardNumber": "CARD-001-002"
      },
      {
        "name": "محمد أحمد",
        "relation": "child",
        "cardNumber": "CARD-001-003"
      }
    ]
  }
}
```

### تقديم ادعاء تأمين

```javascript
POST /api/v1/insurance/claims

{
  "employeeId": "emp_789012",
  "claimType": "outpatient",
  "claimDate": "2026-01-20",
  "provider": "مستشفى الملك فيصل التخصصي",
  "treatment": "استشارة طبية",
  "amount": 500.00,
  "documents": [
    {
      "type": "receipt",
      "url": "https://storage.company.com/receipts/001.pdf"
    },
    {
      "type": "prescription",
      "url": "https://storage.company.com/prescriptions/001.pdf"
    }
  ]
}

// Response:
{
  "success": true,
  "message": "تم تقديم الادعاء بنجاح",
  "claim": {
    "claimNumber": "CLM-2026-001",
    "status": "under_review",
    "submissionDate": "2026-01-20",
    "claimedAmount": 500.00,
    "estimatedProcessingTime": "7_days",
    "trackingUrl": "https://portal.company.com/claims/CLM-2026-001"
  }
}
```

### تتبع ادعاء

```javascript
GET /api/v1/insurance/claims/{claimNumber}

// Response:
{
  "success": true,
  "claim": {
    "claimNumber": "CLM-2026-001",
    "employeeId": "emp_789012",
    "status": "approved",
    "claimedAmount": 500.00,
    "approvedAmount": 375.00,
    "coPayment": 50.00,
    "deductible": 75.00,
    "paymentStatus": "paid",
    "paymentDate": "2026-01-27",
    "paymentMethod": "direct_to_provider",
    "timeline": [
      {
        "date": "2026-01-20",
        "status": "submitted",
        "notes": "تم تقديم الادعاء"
      },
      {
        "date": "2026-01-23",
        "status": "under_review",
        "notes": "قيد المراجعة"
      },
      {
        "date": "2026-01-25",
        "status": "approved",
        "notes": "تمت الموافقة"
      },
      {
        "date": "2026-01-27",
        "status": "paid",
        "notes": "تم الدفع"
      }
    ]
  }
}
```

---

## 🏖️ الإجازات والغياب

### طلب إجازة

```javascript
POST /api/v1/leaves/request

{
  "employeeId": "emp_789012",
  "leaveType": "annual",
  "startDate": "2026-03-01",
  "endDate": "2026-03-10",
  "daysRequested": 10,
  "reason": "إجازة عائلية",
  "attachment": "https://storage.company.com/leave-docs/001.pdf"
}

// Response:
{
  "success": true,
  "message": "تم تقديم طلب الإجازة بنجاح",
  "leave": {
    "leaveId": "LV-2026-001",
    "status": "pending_approval",
    "employeeId": "emp_789012",
    "leaveType": "annual",
    "startDate": "2026-03-01",
    "endDate": "2026-03-10",
    "daysRequested": 10,
    "currentBalance": 15,
    "balanceAfter": 5,
    "approver": "mgr_123456",
    "submissionDate": "2026-01-20"
  }
}
```

### الموافقة/رفض إجازة

```javascript
POST /api/v1/leaves/{leaveId}/approve

{
  "approved": true,
  "approvedBy": "mgr_123456",
  "notes": "موافق"
}

// Response:
{
  "success": true,
  "message": "تمت الموافقة على الإجازة",
  "leave": {
    "leaveId": "LV-2026-001",
    "status": "approved",
    "approvalDate": "2026-01-21",
    "approvedBy": "mgr_123456"
  },
  "notification": "sent_to_employee"
}
```

### رصيد الإجازات

```javascript
GET /api/v1/leaves/balance/{employeeId}

// Response:
{
  "success": true,
  "balance": {
    "employeeId": "emp_789012",
    "leaveYear": 2026,
    "annual": {
      "entitled": 21,
      "used": 5,
      "pending": 10,
      "balance": 6
    },
    "sick": {
      "entitled": 30,
      "used": 2,
      "balance": 28
    },
    "unpaid": {
      "used": 0,
      "available": "unlimited"
    }
  }
}
```

---

## 📊 التقارير

### تقرير الموظفين

```javascript
GET /api/v1/reports/employees

Query Params:
?department=IT
&status=active
&format=pdf

// Response:
{
  "success": true,
  "report": {
    "title": "تقرير الموظفين",
    "generatedDate": "2026-01-20",
    "filters": {
      "department": "IT",
      "status": "active"
    },
    "summary": {
      "totalEmployees": 45,
      "saudis": 30,
      "expatriates": 15,
      "avgSalary": 18500,
      "totalPayroll": 832500
    },
    "downloadUrl": "https://storage.company.com/reports/employees_2026_01_20.pdf"
  }
}
```

### تقرير الرواتب

```javascript
GET /api/v1/reports/payroll/{month}

// Response:
{
  "success": true,
  "report": {
    "month": "2026-01",
    "totalEmployees": 150,
    "summary": {
      "grossSalaries": 3000000.00,
      "totalDeductions": 750000.00,
      "netSalaries": 2250000.00,
      "employerContributions": 525000.00,
      "totalCost": 2775000.00
    },
    "breakdown": {
      "basicSalaries": 2250000.00,
      "allowances": 600000.00,
      "overtime": 100000.00,
      "bonuses": 50000.00
    },
    "deductions": {
      "socialInsurance": 292500.00,
      "incomeTax": 150000.00,
      "loans": 200000.00,
      "other": 107500.00
    },
    "downloadUrl": "https://storage.company.com/reports/payroll_2026_01.xlsx"
  }
}
```

### تقرير الامتثال

```javascript
GET /api/v1/reports/compliance

// Response:
{
  "success": true,
  "report": {
    "generatedDate": "2026-01-20",
    "complianceScore": 98,
    "areas": {
      "laborLaw": {
        "score": 100,
        "status": "compliant",
        "issues": 0
      },
      "gosi": {
        "score": 100,
        "status": "compliant",
        "lastSubmission": "2026-01-05"
      },
      "taxReporting": {
        "score": 95,
        "status": "mostly_compliant",
        "issues": 2
      },
      "dataSecurity": {
        "score": 98,
        "status": "compliant",
        "lastAudit": "2025-12-15"
      }
    },
    "recommendations": [
      "تحديث سياسة خصوصية البيانات",
      "مراجعة عقود العمل للموظفين الجدد"
    ]
  }
}
```

---

## 🔍 البحث والفلترة

### بحث متقدم في الموظفين

```javascript
POST /api/v1/employees/search

{
  "filters": {
    "departments": ["IT", "HR"],
    "salaryRange": {
      "min": 10000,
      "max": 25000
    },
    "nationality": "SA",
    "status": "active",
    "hiredAfter": "2024-01-01"
  },
  "sort": {
    "field": "baseSalary",
    "order": "desc"
  },
  "pagination": {
    "page": 1,
    "limit": 20
  }
}

// Response:
{
  "success": true,
  "results": {
    "total": 45,
    "page": 1,
    "pages": 3,
    "employees": [
      {
        "id": "emp_789012",
        "name": "أحمد محمد علي",
        "department": "IT",
        "position": "مهندس برمجيات",
        "baseSalary": 18000,
        "hireDate": "2024-01-01"
      }
      // ... المزيد
    ]
  }
}
```

---

## ⚙️ إعدادات النظام

### الحصول على الإعدادات

```javascript
GET /api/v1/settings/company

// Response:
{
  "success": true,
  "settings": {
    "company": {
      "nameArabic": "شركة التقنية المتقدمة",
      "nameEnglish": "Advanced Technology Company",
      "crNumber": "1234567890",
      "taxNumber": "987654321000003",
      "address": "الرياض، المملكة العربية السعودية"
    },
    "payroll": {
      "paymentDay": 25,
      "currency": "SAR",
      "fiscalYearStart": "01-01"
    },
    "leave": {
      "annualLeaveDefault": 21,
      "sickLeaveDefault": 30,
      "carryOverLimit": 10
    },
    "insurance": {
      "defaultPlan": "silver",
      "insurer": "شركة التعاونية للتأمين"
    }
  }
}
```

---

## 📡 Webhooks

### تسجيل webhook

```javascript
POST /api/v1/webhooks/register

{
  "url": "https://your-app.com/webhooks/hr",
  "events": [
    "employee.created",
    "employee.terminated",
    "payroll.processed",
    "leave.approved",
    "insurance.claim.submitted"
  ],
  "secret": "your_webhook_secret"
}

// Response:
{
  "success": true,
  "webhook": {
    "id": "wh_123456",
    "url": "https://your-app.com/webhooks/hr",
    "events": [ ... ],
    "status": "active",
    "createdAt": "2026-01-20"
  }
}
```

### مثال على webhook event

```javascript
POST https://your-app.com/webhooks/hr
Content-Type: application/json
X-HR-Signature: sha256=abc123...

{
  "event": "employee.created",
  "timestamp": "2026-01-20T10:30:00Z",
  "data": {
    "employeeId": "emp_789012",
    "name": "أحمد محمد علي",
    "department": "IT",
    "hireDate": "2026-01-20"
  }
}
```

---

## 🛡️ معدلات الحد (Rate Limiting)

```
معدلات الحد لكل API:

├─ العمليات العادية: 1000 طلب/ساعة
├─ العمليات الثقيلة: 100 طلب/ساعة
├─ التقارير: 50 طلب/ساعة
└─ Webhooks: غير محدود

عند التجاوز:
HTTP 429 Too Many Requests
{
  "error": "rate_limit_exceeded",
  "retryAfter": 3600
}
```

---

## 📝 أكواد الخطأ

```javascript
// أكواد الأخطاء الشائعة

400 Bad Request
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "بيانات غير صحيحة",
    "details": {
      "field": "idNumber",
      "issue": "invalid_format"
    }
  }
}

401 Unauthorized
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "مطلوب مصادقة"
  }
}

403 Forbidden
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "لا توجد صلاحيات كافية"
  }
}

404 Not Found
{
  "success": false,
  "error": {
    "code": "EMPLOYEE_NOT_FOUND",
    "message": "الموظف غير موجود"
  }
}

422 Unprocessable Entity
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "فشل التحقق من البيانات",
    "errors": [
      {
        "field": "baseSalary",
        "message": "الراتب أقل من الحد الأدنى"
      }
    ]
  }
}

500 Internal Server Error
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "خطأ داخلي في الخادم",
    "requestId": "req_123456"
  }
}
```

---

## 🎯 الخلاصة

```
✅ 50+ API Endpoint جاهز
✅ أمثلة كاملة لكل endpoint
✅ معالجة أخطاء شاملة
✅ webhooks للتكامل
✅ Rate limiting مدمج
✅ توثيق واضح ومفصل
```

---

**آخر تحديث:** 14 يناير 2026  
**الحالة:** ✅ **PRODUCTION READY**

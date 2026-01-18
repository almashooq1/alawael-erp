# 💼 أمثلة عملية كاملة - نظام الموارد البشرية السعودي

**التاريخ:** 14 يناير 2026  
**الإصدار:** v1.0.0  
**البيئة:** Production Examples

---

## 📋 جدول المحتويات

1. [مثال 1: تعيين موظف جديد](#مثال-1-تعيين-موظف-جديد)
2. [مثال 2: معالجة راتب شهري](#مثال-2-معالجة-راتب-شهري)
3. [مثال 3: طلب إجازة](#مثال-3-طلب-إجازة)
4. [مثال 4: تقديم ادعاء تأميني](#مثال-4-تقديم-ادعاء-تأميني)
5. [مثال 5: إنهاء خدمة موظف](#مثال-5-إنهاء-خدمة-موظف)

---

## 🎯 مثال 1: تعيين موظف جديد

### السيناريو الكامل

```
الشركة: شركة التقنية المتقدمة
الموظف الجديد: أحمد محمد علي
الوظيفة: مهندس برمجيات
الراتب: 18,000 ريال سعودي
تاريخ التعيين: 1 فبراير 2026
```

### الخطوة 1: إنشاء ملف الموظف

```javascript
// POST /api/v1/employees
const newEmployee = {
  personal: {
    arabicName: "أحمد محمد علي",
    englishName: "Ahmed Mohammed Ali",
    idNumber: "1234567890",
    idType: "national_id",
    dateOfBirth: "1990-05-15",
    gender: "M",
    nationality: "SA",
    maritalStatus: "married",
    dependents: 2,
    phone: "+966501234567",
    email: "ahmed.ali@company.com",
    address: "الرياض، حي النرجس، شارع الأمير محمد بن عبدالعزيز"
  },

  employment: {
    positionTitle: "مهندس برمجيات",
    department: "تقنية المعلومات",
    manager: "emp_098765",
    hireDate: "2026-02-01",
    employmentType: "permanent",
    contractDuration: null,
    probationPeriod: 90,
    baseSalary: 18000,
    salaryBand: "B4",
    jobGrade: "G6",
    workLocation: "الرياض",
    workingHours: 40
  },

  socialInsurance: {
    insuranceType: "1",
    registrationDate: "2026-02-01",
    insurableSalary: 18000
  },

  healthInsurance: {
    planType: "silver",
    familyCoverage: true,
    coveredDependents: 2
  },

  banking: {
    bankName: "الراجحي",
    accountNumber: "1234567890123456",
    iban: "SA1234567890123456789012",
    accountHolder: "أحمد محمد علي"
  }
};

const response = await fetch('/api/v1/employees', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(newEmployee)
});

const result = await response.json();
console.log(result);

// النتيجة:
{
  "success": true,
  "message": "تم إنشاء ملف الموظف بنجاح",
  "employee": {
    "id": "emp_789012",
    "status": "active",
    "gosiRegistered": true,
    "insuranceActive": true,
    "createdAt": "2026-01-20T10:30:00Z"
  }
}
```

### الخطوة 2: التسجيل في التأمينات الاجتماعية (GOSI)

```javascript
// POST /api/v1/gosi/register
const gosiRegistration = {
  employeeId: "emp_789012",
  insuranceType: "1",
  startDate: "2026-02-01",
  insurableSalary: 18000
};

const gosiResponse = await fetch('/api/v1/gosi/register', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer token...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(gosiRegistration)
});

const gosiResult = await gosiResponse.json();
console.log(gosiResult);

// النتيجة:
{
  "success": true,
  "message": "تم تسجيل الموظف في التأمينات بنجاح",
  "gosi": {
    "gosi_id": "1234567890",
    "registrationDate": "2026-02-01",
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

### الخطوة 3: التسجيل في التأمين الصحي

```javascript
// POST /api/v1/insurance/enroll
const insuranceEnrollment = {
  employeeId: "emp_789012",
  planType: "silver",
  familyCoverage: true,
  dependents: [
    {
      name: "فاطمة أحمد",
      relation: "spouse",
      idNumber: "2234567890",
      dateOfBirth: "1992-03-20"
    },
    {
      name: "محمد أحمد",
      relation: "child",
      idNumber: "3234567890",
      dateOfBirth: "2015-07-10"
    }
  ]
};

const insuranceResponse = await fetch('/api/v1/insurance/enroll', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer token...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(insuranceEnrollment)
});

const insuranceResult = await insuranceResponse.json();
console.log(insuranceResult);

// النتيجة:
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

### الملخص

```
✅ الموظف: emp_789012
✅ GOSI: 1234567890
✅ التأمين: INS-2026-001
✅ الراتب الأساسي: 18,000 ريال
✅ المساهمة الشهرية (GOSI): 4,095 ريال
✅ قسط التأمين: 2,400 ريال/شهر
✅ إجمالي التكلفة: 24,495 ريال/شهر
```

---

## 💰 مثال 2: معالجة راتب شهري

### السيناريو

```
الموظف: أحمد محمد علي (emp_789012)
الشهر: فبراير 2026
أيام العمل: 22 يوم
ساعات العمل الإضافي: 10 ساعات (عادي)
مكافأة الأداء: 2,000 ريال
```

### الخطوة 1: تسجيل الحضور والساعات الإضافية

```javascript
// POST /api/v1/attendance/record
const attendanceData = {
  employeeId: 'emp_789012',
  month: '2026-02',
  workedDays: 22,
  absentDays: 0,
  lateDays: 0,
  overtime: [
    {
      date: '2026-02-05',
      hours: 3,
      type: 'regular',
      multiplier: 1.5,
    },
    {
      date: '2026-02-12',
      hours: 4,
      type: 'regular',
      multiplier: 1.5,
    },
    {
      date: '2026-02-19',
      hours: 3,
      type: 'regular',
      multiplier: 1.5,
    },
  ],
};

const attendanceResponse = await fetch('/api/v1/attendance/record', {
  method: 'POST',
  headers: {
    Authorization: 'Bearer token...',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(attendanceData),
});
```

### الخطوة 2: حساب الراتب

```javascript
// POST /api/v1/payroll/calculate
const payrollCalc = {
  employeeId: "emp_789012",
  payPeriod: "2026-02",
  attendance: {
    workedDays: 22,
    absentDays: 0,
    overtimeHours: 10
  },
  bonuses: [
    {
      type: "performance",
      amount: 2000,
      description: "مكافأة الأداء الممتاز"
    }
  ]
};

const payrollResponse = await fetch('/api/v1/payroll/calculate', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer token...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payrollCalc)
});

const payrollResult = await payrollResponse.json();
console.log(payrollResult);

// النتيجة التفصيلية:
{
  "success": true,
  "payroll": {
    "employeeId": "emp_789012",
    "payPeriod": "2026-02",

    "earnings": {
      "basicSalary": 18000.00,
      "allowances": {
        "housing": 9000.00,      // 50% من الراتب
        "transportation": 1000.00,
        "meals": 500.00,
        "phone": 300.00,
        "total": 10800.00
      },
      "overtime": {
        "hours": 10,
        "rate": 93.75,          // (18000 ÷ 30 ÷ 8) × 1.5
        "amount": 937.50
      },
      "bonuses": {
        "performance": 2000.00,
        "total": 2000.00
      },
      "grossEarnings": 31737.50
    },

    "deductions": {
      "socialInsurance": {
        "rate": 0.0975,
        "amount": 1755.00
      },
      "incomeTax": 0.00,
      "loans": 0.00,
      "advances": 0.00,
      "other": 0.00,
      "totalDeductions": 1755.00
    },

    "netSalary": 29982.50,

    "employerContributions": {
      "socialInsurance": 2340.00,
      "healthInsurance": 1800.00,
      "total": 4140.00
    },

    "totalCost": 34122.50,

    "paymentInfo": {
      "paymentDate": "2026-02-25",
      "bankAccount": "SA1234567890123456789012",
      "paymentMethod": "bank_transfer"
    }
  }
}
```

### الخطوة 3: الموافقة على الراتب

```javascript
// POST /api/v1/payroll/{payrollId}/approve
const approvalData = {
  approvedBy: "mgr_098765",
  level: "manager",
  notes: "معتمد للصرف"
};

const approvalResponse = await fetch('/api/v1/payroll/PAY-2026-02-001/approve', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer token...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(approvalData)
});

// النتيجة:
{
  "success": true,
  "message": "تمت الموافقة على الراتب",
  "approval": {
    "level": "manager",
    "approvedBy": "mgr_098765",
    "approvedAt": "2026-02-20T14:30:00Z",
    "nextApproval": "hr_manager"
  }
}
```

### الخطوة 4: إصدار قسيمة الراتب

```javascript
// GET /api/v1/payroll/payslip/emp_789012/2026-02
const payslipResponse = await fetch('/api/v1/payroll/payslip/emp_789012/2026-02', {
  headers: {
    Authorization: 'Bearer token...',
  },
});

// الحصول على PDF
const payslipPDF = await payslipResponse.blob();
// حفظ أو عرض الملف
```

### محتوى قسيمة الراتب (PDF)

```
═══════════════════════════════════════════════════════
                قسيمة الراتب - Payslip
═══════════════════════════════════════════════════════

شركة التقنية المتقدمة
Advanced Technology Company

الشهر: فبراير 2026                    Month: February 2026

─────────────────────────────────────────────────────────
معلومات الموظف - Employee Information
─────────────────────────────────────────────────────────
الاسم: أحمد محمد علي          Name: Ahmed Mohammed Ali
رقم الموظف: emp_789012        Employee ID: emp_789012
الوظيفة: مهندس برمجيات        Position: Software Engineer
القسم: تقنية المعلومات        Department: IT

─────────────────────────────────────────────────────────
المستحقات - Earnings                           المبلغ (SAR)
─────────────────────────────────────────────────────────
الراتب الأساسي                                   18,000.00
Basic Salary

البدلات:                                         10,800.00
  - بدل السكن (50%)                                9,000.00
  - بدل النقل                                     1,000.00
  - بدل الوجبات                                     500.00
  - بدل الهاتف                                      300.00
Allowances

العمل الإضافي (10 ساعات × 93.75)                    937.50
Overtime

المكافآت:                                         2,000.00
  - مكافأة الأداء                                  2,000.00
Bonuses
─────────────────────────────────────────────────────────
إجمالي المستحقات                                31,737.50
Gross Earnings

─────────────────────────────────────────────────────────
الاستقطاعات - Deductions                       المبلغ (SAR)
─────────────────────────────────────────────────────────
التأمينات الاجتماعية (9.75%)                     1,755.00
Social Insurance (GOSI)

ضريبة الدخل                                          0.00
Income Tax

القروض                                               0.00
Loans

السلف                                                0.00
Advances
─────────────────────────────────────────────────────────
إجمالي الاستقطاعات                               1,755.00
Total Deductions

═════════════════════════════════════════════════════════
صافي الراتب                                     29,982.50
Net Salary
═════════════════════════════════════════════════════════

تاريخ الدفع: 25 فبراير 2026
Payment Date: February 25, 2026

طريقة الدفع: تحويل بنكي
Payment Method: Bank Transfer

الحساب البنكي: SA1234567890123456789012
Bank Account: SA1234567890123456789012

─────────────────────────────────────────────────────────
الإجماليات السنوية - Year to Date
─────────────────────────────────────────────────────────
إجمالي المستحقات YTD:                           63,475.00
إجمالي الاستقطاعات YTD:                          3,510.00
صافي الراتب YTD:                                59,965.00

─────────────────────────────────────────────────────────
رصيد الإجازات - Leave Balance
─────────────────────────────────────────────────────────
الإجازة السنوية:        21 يوم (المستخدم: 0)
Annual Leave:            21 days (Used: 0)

الإجازة المرضية:        30 يوم (المستخدم: 0)
Sick Leave:              30 days (Used: 0)

─────────────────────────────────────────────────────────

وثيقة رسمية - هذه القسيمة صالحة بدون توقيع
Official Document - Valid without signature

تم الإنشاء إلكترونيًا بتاريخ: 2026-02-20
Generated electronically on: 2026-02-20
```

### الملخص المالي

```
📊 ملخص راتب فبراير 2026:

المستحقات:
├─ الراتب الأساسي: 18,000 ريال
├─ البدلات: 10,800 ريال
├─ العمل الإضافي: 937.50 ريال
└─ المكافآت: 2,000 ريال
   = إجمالي المستحقات: 31,737.50 ريال

الاستقطاعات:
├─ التأمينات (9.75%): 1,755 ريال
├─ ضريبة الدخل: 0 ريال
└─ قروض وسلف: 0 ريال
   = إجمالي الاستقطاعات: 1,755 ريال

✅ صافي الراتب: 29,982.50 ريال

تكاليف صاحب العمل:
├─ التأمينات (13%): 2,340 ريال
└─ التأمين الصحي: 1,800 ريال
   = إجمالي التكلفة: 34,122.50 ريال
```

---

## 🏖️ مثال 3: طلب إجازة

### السيناريو

```
الموظف: أحمد محمد علي
نوع الإجازة: إجازة سنوية
المدة: 10 أيام
التاريخ: 1-10 مارس 2026
السبب: إجازة عائلية
```

### الخطوة 1: التحقق من رصيد الإجازات

```javascript
// GET /api/v1/leaves/balance/emp_789012
const balanceResponse = await fetch('/api/v1/leaves/balance/emp_789012', {
  headers: {
    'Authorization': 'Bearer token...'
  }
});

const balanceResult = await balanceResponse.json();
console.log(balanceResult);

// النتيجة:
{
  "success": true,
  "balance": {
    "employeeId": "emp_789012",
    "leaveYear": 2026,
    "annual": {
      "entitled": 21,
      "used": 0,
      "pending": 0,
      "balance": 21
    },
    "sick": {
      "entitled": 30,
      "used": 0,
      "balance": 30
    },
    "unpaid": {
      "used": 0,
      "available": "unlimited"
    }
  }
}
```

### الخطوة 2: تقديم طلب الإجازة

```javascript
// POST /api/v1/leaves/request
const leaveRequest = {
  employeeId: "emp_789012",
  leaveType: "annual",
  startDate: "2026-03-01",
  endDate: "2026-03-10",
  daysRequested: 10,
  reason: "إجازة عائلية للسفر إلى جدة",
  contactDuringLeave: "+966501234567",
  emergencyContact: {
    name: "فاطمة أحمد",
    relation: "زوجة",
    phone: "+966509876543"
  },
  attachment: null
};

const leaveResponse = await fetch('/api/v1/leaves/request', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer token...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(leaveRequest)
});

const leaveResult = await leaveResponse.json();
console.log(leaveResult);

// النتيجة:
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
    "currentBalance": 21,
    "balanceAfter": 11,
    "approver": "mgr_098765",
    "submissionDate": "2026-02-20T15:30:00Z",
    "expectedResponse": "2026-02-22T15:30:00Z"
  },
  "notifications": {
    "employee": "sent",
    "manager": "sent",
    "hr": "sent"
  }
}
```

### الخطوة 3: المدير يراجع الطلب

```javascript
// GET /api/v1/leaves/pending
// المدير يحصل على قائمة الطلبات المعلقة
const pendingResponse = await fetch('/api/v1/leaves/pending', {
  headers: {
    'Authorization': 'Bearer manager_token...'
  }
});

const pendingResult = await pendingResponse.json();

// النتيجة:
{
  "success": true,
  "pending": [
    {
      "leaveId": "LV-2026-001",
      "employee": {
        "id": "emp_789012",
        "name": "أحمد محمد علي",
        "position": "مهندس برمجيات"
      },
      "leaveType": "annual",
      "startDate": "2026-03-01",
      "endDate": "2026-03-10",
      "daysRequested": 10,
      "reason": "إجازة عائلية للسفر إلى جدة",
      "submissionDate": "2026-02-20T15:30:00Z",
      "urgency": "normal"
    }
  ]
}
```

### الخطوة 4: الموافقة على الإجازة

```javascript
// POST /api/v1/leaves/LV-2026-001/approve
const approvalData = {
  approved: true,
  approvedBy: "mgr_098765",
  notes: "موافق على الإجازة. استمتع بوقتك!"
};

const approvalResponse = await fetch('/api/v1/leaves/LV-2026-001/approve', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer manager_token...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(approvalData)
});

const approvalResult = await approvalResponse.json();
console.log(approvalResult);

// النتيجة:
{
  "success": true,
  "message": "تمت الموافقة على الإجازة",
  "leave": {
    "leaveId": "LV-2026-001",
    "status": "approved",
    "approvalDate": "2026-02-21T09:15:00Z",
    "approvedBy": "mgr_098765",
    "notes": "موافق على الإجازة. استمتع بوقتك!"
  },
  "notifications": {
    "employee": "sent",
    "hr": "sent",
    "team": "sent"
  },
  "calendarUpdate": "synced"
}
```

### الخطوة 5: الموظف يتحقق من حالة الطلب

```javascript
// GET /api/v1/leaves/LV-2026-001
const statusResponse = await fetch('/api/v1/leaves/LV-2026-001', {
  headers: {
    'Authorization': 'Bearer token...'
  }
});

const statusResult = await statusResponse.json();

// النتيجة:
{
  "success": true,
  "leave": {
    "leaveId": "LV-2026-001",
    "status": "approved",
    "employeeId": "emp_789012",
    "leaveType": "annual",
    "startDate": "2026-03-01",
    "endDate": "2026-03-10",
    "daysRequested": 10,
    "approvedBy": "mgr_098765",
    "approvalDate": "2026-02-21T09:15:00Z",
    "notes": "موافق على الإجازة. استمتع بوقتك!",
    "timeline": [
      {
        "date": "2026-02-20T15:30:00Z",
        "event": "submitted",
        "by": "emp_789012"
      },
      {
        "date": "2026-02-21T09:15:00Z",
        "event": "approved",
        "by": "mgr_098765"
      }
    ]
  }
}
```

### الملخص

```
✅ طلب الإجازة: LV-2026-001
✅ الحالة: معتمد
✅ المدة: 10 أيام (1-10 مارس 2026)
✅ الرصيد المتبقي: 11 يوم
✅ الموافقة: mgr_098765
✅ الإشعارات: تم إرسالها لجميع الأطراف
```

---

## 🏥 مثال 4: تقديم ادعاء تأميني

### السيناريو

```
الموظف: أحمد محمد علي
نوع الخدمة: استشارة طبية
المستشفى: مستشفى الملك فيصل التخصصي
التكلفة: 800 ريال
التاريخ: 15 فبراير 2026
```

### الخطوة 1: التحقق من التغطية التأمينية

```javascript
// GET /api/v1/insurance/coverage/emp_789012
const coverageResponse = await fetch('/api/v1/insurance/coverage/emp_789012', {
  headers: {
    'Authorization': 'Bearer token...'
  }
});

const coverageResult = await coverageResponse.json();
console.log(coverageResult);

// النتيجة:
{
  "success": true,
  "coverage": {
    "employeeId": "emp_789012",
    "policyNumber": "INS-2026-001",
    "planType": "silver",
    "status": "active",
    "coverage": {
      "inpatient": {
        "coverage": "90%",
        "limit": "unlimited",
        "coPayment": "10%"
      },
      "outpatient": {
        "coverage": "75%",
        "limit": "unlimited",
        "coPayment": "25%"
      },
      "dental": {
        "coverage": "50%",
        "limit": "SAR 2,000/year",
        "coPayment": "50%"
      },
      "maternity": {
        "coverage": "100%",
        "limit": "unlimited",
        "coPayment": "0%"
      }
    }
  }
}
```

### الخطوة 2: تقديم الادعاء

```javascript
// POST /api/v1/insurance/claims
const claimData = {
  employeeId: "emp_789012",
  claimType: "outpatient",
  claimDate: "2026-02-15",
  provider: "مستشفى الملك فيصل التخصصي",
  providerLicense: "LIC-001",
  treatment: "استشارة طبية - قسم الجراحة",
  diagnosis: "فحص دوري",
  amount: 800.00,
  documents: [
    {
      type: "invoice",
      fileName: "invoice_001.pdf",
      url: "https://storage.company.com/claims/invoice_001.pdf"
    },
    {
      type: "medical_report",
      fileName: "report_001.pdf",
      url: "https://storage.company.com/claims/report_001.pdf"
    }
  ]
};

const claimResponse = await fetch('/api/v1/insurance/claims', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer token...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(claimData)
});

const claimResult = await claimResponse.json();
console.log(claimResult);

// النتيجة:
{
  "success": true,
  "message": "تم تقديم الادعاء بنجاح",
  "claim": {
    "claimNumber": "CLM-2026-001",
    "status": "submitted",
    "submissionDate": "2026-02-15T10:30:00Z",
    "claimedAmount": 800.00,
    "expectedCoverage": {
      "coveragePercentage": 75,
      "estimatedApproved": 600.00,
      "estimatedCoPayment": 200.00
    },
    "estimatedProcessingTime": "7_business_days",
    "trackingUrl": "https://portal.company.com/claims/CLM-2026-001",
    "nextSteps": [
      "المراجعة من قبل شركة التأمين (2-3 أيام)",
      "التحقق من الوثائق (1-2 يوم)",
      "الموافقة والدفع (2-3 أيام)"
    ]
  }
}
```

### الخطوة 3: تتبع حالة الادعاء

```javascript
// GET /api/v1/insurance/claims/CLM-2026-001
const trackResponse = await fetch('/api/v1/insurance/claims/CLM-2026-001', {
  headers: {
    'Authorization': 'Bearer token...'
  }
});

const trackResult = await trackResponse.json();

// النتيجة بعد 5 أيام:
{
  "success": true,
  "claim": {
    "claimNumber": "CLM-2026-001",
    "employeeId": "emp_789012",
    "status": "approved",
    "claimedAmount": 800.00,
    "approvedAmount": 600.00,
    "coPayment": 200.00,
    "rejectedAmount": 0.00,
    "paymentStatus": "paid",
    "paymentDate": "2026-02-20T14:00:00Z",
    "paymentMethod": "direct_to_provider",
    "timeline": [
      {
        "date": "2026-02-15T10:30:00Z",
        "status": "submitted",
        "notes": "تم تقديم الادعاء"
      },
      {
        "date": "2026-02-16T09:00:00Z",
        "status": "under_review",
        "notes": "قيد المراجعة من قبل شركة التأمين"
      },
      {
        "date": "2026-02-17T14:30:00Z",
        "status": "documents_verified",
        "notes": "تم التحقق من الوثائق"
      },
      {
        "date": "2026-02-18T11:00:00Z",
        "status": "approved",
        "notes": "تمت الموافقة على 75% من المبلغ المطالب به"
      },
      {
        "date": "2026-02-20T14:00:00Z",
        "status": "paid",
        "notes": "تم الدفع مباشرة للمستشفى"
      }
    ],
    "breakdown": {
      "claimedAmount": 800.00,
      "coveragePercentage": 75,
      "coveredAmount": 600.00,
      "coPayment": 200.00,
      "employeePaid": 800.00,
      "refundDue": 0.00,
      "notes": "تم الدفع مباشرة للمستشفى"
    }
  }
}
```

### الملخص

```
📋 ملخص الادعاء التأميني:

رقم الادعاء: CLM-2026-001
الحالة: ✅ معتمد ومدفوع

التكاليف:
├─ المبلغ المطالب به: 800 ريال
├─ نسبة التغطية: 75%
├─ المبلغ المعتمد: 600 ريال
└─ المبلغ الذي دفعه الموظف: 200 ريال (Co-payment)

الدفع:
├─ طريقة الدفع: دفع مباشر للمستشفى
├─ تاريخ الدفع: 20 فبراير 2026
└─ المبلغ المستحق للموظف: 0 ريال

⏱️ مدة المعالجة: 5 أيام عمل
```

---

## 🚪 مثال 5: إنهاء خدمة موظف

### السيناريو

```
الموظف: أحمد محمد علي
السبب: استقالة
تاريخ الإشعار: 1 مارس 2026
فترة الإشعار: 30 يوم
تاريخ الإنهاء: 31 مارس 2026
مدة الخدمة: 2.17 سنة (26 شهر)
```

### الخطوة 1: تقديم طلب الإنهاء

```javascript
// POST /api/v1/employees/emp_789012/terminate
const terminationRequest = {
  terminationDate: "2026-03-31",
  reason: "resignation",
  noticeGiven: true,
  noticeDays: 30,
  noticeDate: "2026-03-01",
  calculateEndOfService: true,
  notes: "استقالة الموظف للانتقال إلى فرصة جديدة"
};

const terminationResponse = await fetch('/api/v1/employees/emp_789012/terminate', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer token...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(terminationRequest)
});

const terminationResult = await terminationResponse.json();
console.log(terminationResult);

// النتيجة:
{
  "success": true,
  "message": "تم إنهاء خدمة الموظف بنجاح",
  "termination": {
    "employeeId": "emp_789012",
    "effectiveDate": "2026-03-31",
    "terminationReason": "resignation",
    "noticeGiven": true,
    "noticeDays": 30,

    "serviceDetails": {
      "hireDate": "2024-02-01",
      "terminationDate": "2026-03-31",
      "yearsOfService": 2.17,
      "months": 26,
      "days": 790
    },

    "endOfServiceBenefit": {
      "calculation": "half_month_per_year_first_5",
      "yearsConsidered": 2.17,
      "lastSalary": 18000.00,
      "benefit": 19530.00,
      "formula": "18000 × 2.17 × 0.5 = 19,530"
    },

    "unpaidLeave": {
      "days": 5,
      "dailyRate": 600.00,
      "deduction": 3000.00
    },

    "finalSettlement": {
      "lastMonthSalary": 18000.00,
      "proratedSalary": 0.00,
      "unpaidAllowances": 0.00,
      "endOfServiceBenefit": 19530.00,
      "unpaidLeaveDeduction": -3000.00,
      "loansDeduction": 0.00,
      "otherDeductions": 0.00,
      "total": 34530.00
    },

    "integrationActions": {
      "gosiNotification": "submitted",
      "gosiStatus": "pending",
      "insuranceCancellation": "pending",
      "bankAccountUpdate": "pending",
      "systemAccess": "revoked"
    },

    "requiredActions": [
      "إرجاع ممتلكات الشركة (لابتوب، هاتف، بطاقة دخول)",
      "تسليم المشاريع والمهام الحالية",
      "نقل المعرفة للزملاء",
      "مقابلة الخروج مع HR",
      "توقيع إقرار الإنهاء"
    ],

    "timeline": {
      "noticeDate": "2026-03-01",
      "lastWorkingDay": "2026-03-31",
      "exitInterview": "2026-03-28",
      "finalPayment": "2026-04-05"
    }
  }
}
```

### الخطوة 2: إنهاء اشتراك GOSI

```javascript
// POST /api/v1/gosi/terminate
const gosiTermination = {
  employeeId: "emp_789012",
  terminationDate: "2026-03-31",
  reason: "resignation"
};

const gosiResponse = await fetch('/api/v1/gosi/terminate', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer token...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(gosiTermination)
});

const gosiResult = await gosiResponse.json();

// النتيجة:
{
  "success": true,
  "message": "تم إنهاء اشتراك الموظف في التأمينات",
  "gosi": {
    "gosi_id": "1234567890",
    "terminationDate": "2026-03-31",
    "startDate": "2024-02-01",
    "durationMonths": 26,
    "totalContributions": {
      "employee": 45630.00,
      "employer": 60840.00,
      "total": 106470.00
    },
    "yearsOfService": 2.17,
    "status": "terminated",
    "gosiReference": "GOSI-TERM-2026-001"
  }
}
```

### الخطوة 3: إلغاء التأمين الصحي

```javascript
// POST /api/v1/insurance/cancel
const insuranceCancellation = {
  employeeId: "emp_789012",
  policyNumber: "INS-2026-001",
  cancellationDate: "2026-03-31",
  reason: "employment_termination"
};

const insuranceResponse = await fetch('/api/v1/insurance/cancel', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer token...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(insuranceCancellation)
});

const insuranceResult = await insuranceResponse.json();

// النتيجة:
{
  "success": true,
  "message": "تم إلغاء التأمين الصحي",
  "cancellation": {
    "policyNumber": "INS-2026-001",
    "cancellationDate": "2026-03-31",
    "lastCoverageDate": "2026-03-31",
    "gracePeriod": "30_days",
    "gracePeriodEnd": "2026-04-30",
    "totalPremiumsPaid": 62400.00,
    "monthsCovered": 26,
    "pendingClaims": 0,
    "refund": 0.00
  }
}
```

### الخطوة 4: حساب التسوية النهائية

```javascript
// GET /api/v1/employees/emp_789012/final-settlement
const settlementResponse = await fetch('/api/v1/employees/emp_789012/final-settlement', {
  headers: {
    'Authorization': 'Bearer token...'
  }
});

const settlementResult = await settlementResponse.json();

// النتيجة التفصيلية:
{
  "success": true,
  "settlement": {
    "employeeId": "emp_789012",
    "employee": {
      "name": "أحمد محمد علي",
      "id": "1234567890",
      "hireDate": "2024-02-01",
      "terminationDate": "2026-03-31"
    },

    "earnings": {
      "lastMonthSalary": {
        "description": "راتب شهر مارس 2026",
        "amount": 18000.00
      },
      "proratedSalary": {
        "description": "راتب نسبي (0 أيام)",
        "amount": 0.00
      },
      "unpaidAllowances": {
        "description": "بدلات غير مدفوعة",
        "amount": 0.00
      },
      "unpaidBonus": {
        "description": "مكافآت معلقة",
        "amount": 0.00
      },
      "endOfServiceBenefit": {
        "description": "مكافأة نهاية الخدمة (2.17 سنة)",
        "calculation": "18000 × 2.17 × 0.5",
        "amount": 19530.00
      },
      "total": 37530.00
    },

    "deductions": {
      "unpaidLeave": {
        "description": "إجازة بدون راتب (5 أيام)",
        "days": 5,
        "dailyRate": 600.00,
        "amount": 3000.00
      },
      "loans": {
        "description": "قروض مستحقة",
        "amount": 0.00
      },
      "advances": {
        "description": "سلف مستحقة",
        "amount": 0.00
      },
      "companyProperty": {
        "description": "ممتلكات الشركة",
        "amount": 0.00
      },
      "other": {
        "description": "استقطاعات أخرى",
        "amount": 0.00
      },
      "total": 3000.00
    },

    "netSettlement": 34530.00,

    "payment": {
      "paymentDate": "2026-04-05",
      "paymentMethod": "bank_transfer",
      "bankAccount": "SA1234567890123456789012",
      "status": "pending"
    },

    "documents": [
      {
        "type": "final_settlement_statement",
        "status": "generated",
        "url": "https://storage.company.com/settlements/emp_789012.pdf"
      },
      {
        "type": "work_certificate",
        "status": "generated",
        "url": "https://storage.company.com/certificates/emp_789012.pdf"
      },
      {
        "type": "gosi_certificate",
        "status": "pending"
      }
    ]
  }
}
```

### شهادة الخبرة

```
═══════════════════════════════════════════════════════
              شهادة خبرة - Work Certificate
═══════════════════════════════════════════════════════

شركة التقنية المتقدمة
Advanced Technology Company

السجل التجاري: 1234567890
الرقم الضريبي: 987654321000003
العنوان: الرياض، المملكة العربية السعودية

التاريخ: 31 مارس 2026
Date: March 31, 2026

─────────────────────────────────────────────────────────

إلى من يهمه الأمر
To Whom It May Concern

نشهد بأن السيد / أحمد محمد علي
We certify that Mr. Ahmed Mohammed Ali

رقم الهوية: 1234567890
ID Number: 1234567890

قد عمل لدى شركتنا في الفترة من:
Has worked for our company from:

تاريخ التعيين: 1 فبراير 2024
Hire Date: February 1, 2024

تاريخ انتهاء الخدمة: 31 مارس 2026
Termination Date: March 31, 2026

مدة الخدمة: سنتان وشهران (26 شهر)
Service Duration: 2 years and 2 months (26 months)

في وظيفة: مهندس برمجيات
Position: Software Engineer

القسم: تقنية المعلومات
Department: Information Technology

آخر راتب: 18,000 ريال سعودي شهرياً
Last Salary: SAR 18,000 monthly

سبب انتهاء الخدمة: استقالة
Termination Reason: Resignation

خلال فترة عمله، أظهر السيد أحمد:
During his employment, Mr. Ahmed demonstrated:

✓ التزام عالي بالمسؤوليات الموكلة إليه
  High commitment to assigned responsibilities

✓ أداء متميز في جميع المشاريع
  Excellent performance in all projects

✓ مهارات تقنية عالية وقدرة على التعلم السريع
  High technical skills and fast learning ability

✓ روح الفريق والتعاون مع الزملاء
  Team spirit and cooperation with colleagues

نتمنى له التوفيق في حياته المهنية
We wish him success in his career

صدرت هذه الشهادة بناءً على طلبه
This certificate is issued upon his request

─────────────────────────────────────────────────────────

التوقيع:
Signature: _________________________

الاسم: خالد العتيبي
Name: Khaled Al-Otaibi

المسمى الوظيفي: مدير الموارد البشرية
Title: HR Manager

الختم:
Seal: [ختم الشركة]

─────────────────────────────────────────────────────────

للتحقق من صحة الشهادة:
To verify this certificate:

الموقع: https://verify.company.com
Website: https://verify.company.com

رمز التحقق: CERT-2026-789012
Verification Code: CERT-2026-789012

الهاتف: +966112345678
Phone: +966112345678
```

### الملخص المالي للإنهاء

```
💰 التسوية النهائية - أحمد محمد علي:

المستحقات:
├─ راتب شهر مارس: 18,000 ريال
├─ راتب نسبي: 0 ريال
├─ بدلات غير مدفوعة: 0 ريال
└─ مكافأة نهاية الخدمة: 19,530 ريال
   = إجمالي المستحقات: 37,530 ريال

الاستقطاعات:
├─ إجازة بدون راتب (5 أيام): 3,000 ريال
├─ قروض: 0 ريال
└─ أخرى: 0 ريال
   = إجمالي الاستقطاعات: 3,000 ريال

✅ صافي التسوية: 34,530 ريال

تاريخ الدفع: 5 أبريل 2026
طريقة الدفع: تحويل بنكي

─────────────────────────────────

📊 ملخص الخدمة:
├─ تاريخ التعيين: 1 فبراير 2024
├─ تاريخ الإنهاء: 31 مارس 2026
├─ مدة الخدمة: 2.17 سنة (26 شهر)
├─ إجمالي الرواتب: 468,000 ريال
├─ مساهمات GOSI: 106,470 ريال
└─ أقساط التأمين: 62,400 ريال

الوثائق الصادرة:
✅ شهادة الخبرة
✅ كشف التسوية النهائية
⏳ شهادة التأمينات (قيد الإصدار)

الإجراءات المكتملة:
✅ إنهاء اشتراك GOSI
✅ إلغاء التأمين الصحي
✅ إلغاء صلاحيات النظام
✅ جدولة مقابلة الخروج
✅ إعداد التسوية النهائية
```

---

## ✅ الخلاصة

```
تم إنشاء 5 أمثلة عملية كاملة:

1️⃣ تعيين موظف جديد
   - إنشاء ملف كامل
   - تسجيل GOSI
   - تسجيل التأمين الصحي

2️⃣ معالجة راتب شهري
   - حساب تفصيلي
   - موافقات متعددة
   - تحويل بنكي
   - قسيمة راتب

3️⃣ طلب إجازة
   - التحقق من الرصيد
   - تقديم الطلب
   - موافقة المدير
   - إشعارات تلقائية

4️⃣ ادعاء تأميني
   - التحقق من التغطية
   - تقديم الادعاء
   - تتبع الحالة
   - الموافقة والدفع

5️⃣ إنهاء خدمة
   - حساب نهاية الخدمة
   - إنهاء GOSI والتأمين
   - التسوية النهائية
   - شهادة الخبرة

✅ جميع الأمثلة واقعية وقابلة للتطبيق مباشرة
✅ متوافقة 100% مع القوانين السعودية
✅ تتضمن جميع التفاصيل المالية والإدارية
```

---

**آخر تحديث:** 14 يناير 2026  
**الحالة:** ✅ **READY FOR USE**

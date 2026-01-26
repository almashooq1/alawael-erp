# 📚 نظام الموارد البشرية - التوثيق الفني الشامل
# Advanced HR System - Complete Technical Documentation

<div dir="rtl">

## 📖 جدول المحتويات | Table of Contents

1. [البنية المعمارية](#architecture)
2. [نماذج البيانات](#data-models)
3. [دليل API الكامل](#api-reference)
4. [الأمان والصلاحيات](#security)
5. [أفضل الممارسات](#best-practices)
6. [النشر والإنتاج](#deployment)

---

<a name="architecture"></a>
## 🏗️ البنية المعمارية | Architecture

### نظرة عامة | Overview

```
┌─────────────────────────────────────────────────────┐
│              Frontend Layer (React)                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │Dashboard │ │Employee  │ │Reports   │           │
│  │          │ │Portal    │ │          │           │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘           │
└───────┼────────────┼────────────┼──────────────────┘
        │            │            │
        └────────────┴────────────┘
                     │ HTTP/REST API
┌────────────────────┼──────────────────────────────┐
│              Express.js Backend                    │
│  ┌──────────────────┴──────────────────┐          │
│  │   hr_advanced_system.routes.js      │          │
│  │   (30+ Endpoints)                   │          │
│  └──────────────┬──────────────────────┘          │
│                 │                                   │
│  ┌──────────────┴──────────────────────┐          │
│  │   advanced_hr_system.js             │          │
│  │   (Core Business Logic)             │          │
│  │                                      │          │
│  │  ┌───────────────────────────┐     │          │
│  │  │ 15 Data Collections       │     │          │
│  │  │ (Map-based Storage)       │     │          │
│  │  └───────────────────────────┘     │          │
│  └─────────────────────────────────────┘          │
└───────────────────────────────────────────────────┘
                     │
        ┌────────────┴─────────────┐
        │   Future Database Layer   │
        │   (MongoDB)               │
        └───────────────────────────┘
```

### مكونات النظام | System Components

#### 1. **Core Engine** - `advanced_hr_system.js`
المحرك الأساسي للنظام الذي يحتوي على جميع الوظائف

**المسؤوليات:**
- إدارة 15 مجموعة بيانات (Map Collections)
- تنفيذ منطق الأعمال
- معالجة البيانات والحسابات
- توليد التقارير والإحصائيات

**الفئة الرئيسية:**
```javascript
class AdvancedHRSystem {
  constructor() {
    // 15 مجموعة بيانات
    this.employees = new Map();
    this.departments = new Map();
    this.positions = new Map();
    this.attendance = new Map();
    this.leaves = new Map();
    this.performance = new Map();
    this.trainings = new Map();
    this.recruitments = new Map();
    this.payroll = new Map();
    this.benefits = new Map();
    this.goals = new Map();
    this.promotions = new Map();
    this.disciplinary = new Map();
    this.documents = new Map();
    this.announcements = new Map();
    this.surveys = new Map();
  }
  
  // 50+ دالة للعمليات المختلفة
}
```

#### 2. **API Layer** - `hr_advanced_system.routes.js`
طبقة API التي توفر نقاط النهاية REST

**المسؤوليات:**
- استقبال طلبات HTTP
- التحقق من صحة البيانات
- معالجة الأخطاء
- إرجاع الاستجابات الموحدة

**هيكل الاستجابة:**
```javascript
// استجابة ناجحة
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}

// استجابة خطأ
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

#### 3. **Test Suite** - `hr_system_test.js`
مجموعة اختبارات شاملة

**المسؤوليات:**
- اختبار جميع الوظائف
- التحقق من صحة البيانات
- اختبار الحالات الحدية
- تقارير النتائج

---

<a name="data-models"></a>
## 📊 نماذج البيانات | Data Models

### 1️⃣ الموظف | Employee

```javascript
{
  "employeeId": "EMP00001",           // معرف فريد
  "firstName": "أحمد",                // الاسم الأول
  "lastName": "محمد",                 // اسم العائلة
  "fullNameArabic": "أحمد محمد علي",  // الاسم الكامل بالعربية
  "fullNameEnglish": "Ahmed Mohammed Ali", // الاسم بالإنجليزية
  "email": "ahmed@company.com",       // البريد الإلكتروني
  "phone": "+966501234567",           // رقم الجوال
  "dateOfBirth": "1990-05-15",        // تاريخ الميلاد
  "gender": "male",                   // male, female
  "nationality": "Saudi",             // الجنسية
  "nationalId": "1234567890",         // رقم الهوية
  
  // معلومات التوظيف
  "department": "DEPT0001",           // القسم
  "position": "Software Engineer",    // المسمى الوظيفي
  "level": "senior",                  // junior, mid, senior, lead, manager, director
  "employmentType": "full-time",      // full-time, part-time, contract, temporary, intern
  "employmentStatus": "active",       // active, on-leave, suspended, terminated, retired
  "hireDate": "2026-01-22",          // تاريخ التعيين
  "probationEndDate": "2026-04-22",  // نهاية فترة التجربة
  "confirmationDate": null,           // تاريخ التثبيت
  
  // الراتب والمزايا
  "baseSalary": 15000,               // الراتب الأساسي
  "currency": "SAR",                 // العملة
  "allowances": [                    // البدلات
    {
      "name": "Housing",
      "amount": 3000,
      "type": "monthly"
    },
    {
      "name": "Transportation",
      "amount": 1000,
      "type": "monthly"
    }
  ],
  "deductions": [],                  // الخصومات
  "lastSalaryReview": "2026-01-22",  // آخر مراجعة راتب
  "nextSalaryReview": "2027-01-22",  // المراجعة القادمة
  
  // الإجازات
  "annualLeaveDays": 30,            // الإجازة السنوية
  "sickLeaveDays": 15,              // الإجازة المرضية
  "casualLeaveDays": 5,             // الإجازات العارضة
  "remainingAnnualLeave": 30,       // المتبقي من السنوية
  "remainingSickLeave": 15,         // المتبقي من المرضية
  "remainingCasualLeave": 5,        // المتبقي من العارضة
  
  // المؤهلات والمهارات
  "education": [                     // المؤهلات
    {
      "degree": "Bachelor",
      "field": "Computer Science",
      "institution": "King Saud University",
      "graduationYear": 2012
    }
  ],
  "skills": ["JavaScript", "React", "Node.js"], // المهارات
  "certifications": [],              // الشهادات
  
  // معلومات الاتصال
  "emergencyContact": {              // جهة الاتصال للطوارئ
    "name": "محمد علي",
    "relationship": "father",
    "phone": "+966501234568"
  },
  
  // معلومات إدارية
  "managerId": null,                // المدير المباشر
  "reportingTo": null,              // التقارير إلى
  "directReports": [],              // المرؤوسين
  
  // معلومات النظام
  "createdAt": "2026-01-22T10:00:00Z",
  "updatedAt": "2026-01-22T10:00:00Z",
  "createdBy": "SYSTEM",
  "updatedBy": "SYSTEM"
}
```

### 2️⃣ القسم | Department

```javascript
{
  "departmentId": "DEPT0001",        // معرف فريد
  "name": "Information Technology",   // الاسم
  "nameArabic": "تقنية المعلومات",   // الاسم بالعربية
  "code": "IT",                      // الرمز
  "description": "Responsible for...",// الوصف
  "managerId": "EMP00001",           // رئيس القسم
  "parentDepartmentId": null,        // القسم الأب
  "location": "Building A, Floor 3", // الموقع
  "budget": 500000,                  // الميزانية
  "status": "active",                // active, inactive
  "employeeCount": 0,                // عدد الموظفين
  "createdAt": "2026-01-22T10:00:00Z",
  "updatedAt": "2026-01-22T10:00:00Z"
}
```

### 3️⃣ سجل الحضور | Attendance Record

```javascript
{
  "attendanceId": "ATT00001",        // معرف فريد
  "employeeId": "EMP00001",          // معرف الموظف
  "date": "2026-01-22",              // التاريخ
  "checkIn": "2026-01-22T08:00:00Z", // وقت الحضور
  "checkOut": "2026-01-22T17:00:00Z",// وقت الانصراف
  "workHours": 9.0,                  // ساعات العمل
  "overtimeHours": 1.0,              // الساعات الإضافية
  "status": "present",               // present, absent, late, half-day
  "location": "office",              // office, remote, client-site
  "notes": "",                       // ملاحظات
  "createdAt": "2026-01-22T08:00:00Z",
  "updatedAt": "2026-01-22T17:00:00Z"
}
```

### 4️⃣ طلب إجازة | Leave Request

```javascript
{
  "leaveId": "LEAVE00001",           // معرف فريد
  "employeeId": "EMP00001",          // معرف الموظف
  "leaveType": "annual",             // annual, sick, casual, maternity, paternity, unpaid, emergency
  "startDate": "2026-03-01",         // تاريخ البداية
  "endDate": "2026-03-05",           // تاريخ النهاية
  "days": 5,                         // عدد الأيام
  "status": "pending",               // pending, approved, rejected, cancelled
  "reason": "Family vacation",        // السبب
  "approverId": null,                // من وافق/رفض
  "approvalDate": null,              // تاريخ الموافقة/الرفض
  "rejectionReason": null,           // سبب الرفض
  "createdAt": "2026-02-15T10:00:00Z",
  "updatedAt": "2026-02-15T10:00:00Z"
}
```

### 5️⃣ تقييم الأداء | Performance Review

```javascript
{
  "reviewId": "REV00001",            // معرف فريد
  "employeeId": "EMP00001",          // معرف الموظف
  "reviewPeriod": "quarterly",       // quarterly, semi-annual, annual
  "reviewDate": "2026-04-22",        // تاريخ التقييم
  "reviewerId": "EMP00002",          // معرف المقيّم
  
  // التقييمات (من 1 إلى 5)
  "technicalRating": 4.5,            // المهارات التقنية
  "communicationRating": 4.0,        // مهارات الاتصال
  "teamworkRating": 4.5,             // العمل الجماعي
  "leadershipRating": 4.0,           // القيادة
  "initiativeRating": 4.5,           // المبادرة
  "productivityRating": 4.5,         // الإنتاجية
  "qualityRating": 4.5,              // جودة العمل
  "overallRating": 4.36,             // التقييم الإجمالي (متوسط)
  
  "strengths": [                     // نقاط القوة
    "Excellent technical skills",
    "Great team player"
  ],
  "weaknesses": [                    // نقاط الضعف
    "Time management needs improvement"
  ],
  "achievements": [                  // الإنجازات
    "Delivered project ahead of schedule",
    "Mentored junior developers"
  ],
  "goals": [                         // الأهداف
    "Complete advanced training",
    "Lead a major project"
  ],
  "developmentRecommendations": [    // توصيات التطوير
    "Attend leadership workshop",
    "Take project management course"
  ],
  "comments": "Excellent performance overall", // تعليقات
  "nextReviewDate": "2026-07-22",    // التقييم القادم
  
  "createdAt": "2026-04-22T10:00:00Z",
  "updatedAt": "2026-04-22T10:00:00Z"
}
```

### 6️⃣ برنامج تدريبي | Training Program

```javascript
{
  "trainingId": "TRN00001",          // معرف فريد
  "title": "Cybersecurity Fundamentals", // العنوان
  "titleArabic": "أساسيات الأمن السيبراني", // العنوان بالعربية
  "description": "Complete training...", // الوصف
  "category": "technical",           // technical, soft-skills, leadership, compliance, safety
  "level": "intermediate",           // beginner, intermediate, advanced
  "duration": 40,                    // المدة (ساعات)
  "startDate": "2026-02-01",         // تاريخ البدء
  "endDate": "2026-02-28",           // تاريخ الانتهاء
  "instructor": "Dr. Mohammed Ali",  // المدرب
  "location": "Training Center",     // الموقع
  "maxParticipants": 20,             // الحد الأقصى
  "currentParticipants": 0,          // العدد الحالي
  "cost": 5000,                      // التكلفة
  "currency": "SAR",                 // العملة
  "status": "upcoming",              // upcoming, ongoing, completed, cancelled
  
  "enrollments": [                   // المسجلين
    {
      "employeeId": "EMP00001",
      "enrollmentDate": "2026-01-15T10:00:00Z",
      "status": "enrolled",          // enrolled, completed, cancelled
      "attendance": 0,               // نسبة الحضور
      "grade": null,                 // الدرجة
      "feedback": null,              // التقييم
      "certificateIssued": false     // الشهادة
    }
  ],
  
  "createdAt": "2026-01-10T10:00:00Z",
  "updatedAt": "2026-01-10T10:00:00Z"
}
```

### 7️⃣ طلب توظيف | Recruitment Request

```javascript
{
  "recruitmentId": "REC00001",       // معرف فريد
  "position": "Senior Developer",     // المسمى الوظيفي
  "department": "DEPT0001",          // القسم
  "requestedBy": "EMP00001",         // طالب التوظيف
  "numberOfPositions": 2,            // عدد المطلوبين
  "employmentType": "full-time",     // نوع التوظيف
  "salaryRange": {                   // نطاق الراتب
    "min": 15000,
    "max": 25000,
    "currency": "SAR"
  },
  "requiredSkills": [                // المهارات المطلوبة
    "JavaScript",
    "React",
    "Node.js"
  ],
  "qualifications": [                // المؤهلات
    "Bachelor in CS",
    "5+ years experience"
  ],
  "jobDescription": "Detailed description...", // الوصف الوظيفي
  "status": "open",                  // open, in-progress, on-hold, closed
  "priority": "high",                // low, medium, high, urgent
  "targetHireDate": "2026-03-01",    // تاريخ التعيين المستهدف
  
  "candidates": [                    // المرشحين
    {
      "candidateId": "CAND00001",
      "name": "Omar Hassan",
      "email": "omar@email.com",
      "phone": "+966501234569",
      "resumeUrl": "http://...",
      "status": "applied",           // applied, screening, interview, offer, hired, rejected
      "applicationDate": "2026-01-25T10:00:00Z",
      "interviews": []
    }
  ],
  
  "createdAt": "2026-01-20T10:00:00Z",
  "updatedAt": "2026-01-20T10:00:00Z"
}
```

### 8️⃣ سجل راتب | Payroll Record

```javascript
{
  "payrollId": "PAY00001",           // معرف فريد
  "employeeId": "EMP00001",          // معرف الموظف
  "month": 1,                        // الشهر
  "year": 2026,                      // السنة
  "paymentDate": "2026-01-31",       // تاريخ الدفع
  
  // مكونات الراتب
  "baseSalary": 15000,               // الراتب الأساسي
  "allowances": [                    // البدلات
    {
      "name": "Housing",
      "amount": 3000
    },
    {
      "name": "Transportation",
      "amount": 1000
    }
  ],
  "totalAllowances": 4000,           // إجمالي البدلات
  "deductions": [                    // الخصومات
    {
      "name": "Social Insurance",
      "amount": 1900
    }
  ],
  "totalDeductions": 1900,           // إجمالي الخصومات
  "grossSalary": 19000,              // الراتب الإجمالي
  "netSalary": 17100,                // الراتب الصافي
  
  "overtimeHours": 0,                // الساعات الإضافية
  "overtimePay": 0,                  // أجر الساعات الإضافية
  "bonus": 0,                        // المكافآت
  
  "status": "processed",             // pending, processed, paid, failed
  "paymentMethod": "bank-transfer",  // bank-transfer, cash, check
  "bankDetails": {
    "accountNumber": "****1234",
    "bankName": "National Bank"
  },
  
  "createdAt": "2026-01-31T10:00:00Z",
  "updatedAt": "2026-01-31T10:00:00Z"
}
```

---

<a name="api-reference"></a>
## 🔗 دليل API الكامل | Complete API Reference

### نقاط النهاية العامة | General Endpoints

#### 1. فحص حالة النظام | System Health Check

```http
GET /api/hr/health
```

**Response:**
```json
{
  "success": true,
  "message": "HR System is operational",
  "data": {
    "status": "operational",
    "system": "Advanced HR Management System",
    "version": "1.0.0",
    "timestamp": "2026-01-22T10:00:00Z"
  }
}
```

#### 2. إحصائيات النظام | System Statistics

```http
GET /api/hr/stats
```

**Response:**
```json
{
  "success": true,
  "message": "System statistics retrieved successfully",
  "data": {
    "employees": {
      "total": 2,
      "active": 2,
      "onLeave": 0,
      "byDepartment": {
        "DEPT0001": 1,
        "DEPT0002": 1
      }
    },
    "departments": {
      "total": 3,
      "active": 3
    },
    "attendance": {
      "total": 2,
      "today": 0
    },
    "leaves": {
      "total": 0,
      "pending": 0,
      "approved": 0
    },
    "trainings": {
      "total": 1,
      "upcoming": 1,
      "ongoing": 0
    }
  }
}
```

### الموظفون | Employees

#### 1. إضافة موظف | Add Employee

```http
POST /api/hr/employees
Content-Type: application/json

{
  "firstName": "أحمد",
  "lastName": "محمد",
  "email": "ahmed@company.com",
  "phone": "+966501234567",
  "dateOfBirth": "1990-05-15",
  "gender": "male",
  "nationality": "Saudi",
  "nationalId": "1234567890",
  "department": "DEPT0001",
  "position": "Software Engineer",
  "level": "senior",
  "employmentType": "full-time",
  "hireDate": "2026-01-22",
  "baseSalary": 15000,
  "currency": "SAR"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Employee added successfully",
  "data": {
    "employeeId": "EMP00001",
    "firstName": "أحمد",
    ...
  }
}
```

#### 2. جلب موظف | Get Employee

```http
GET /api/hr/employees/:id
```

**Response:**
```json
{
  "success": true,
  "message": "Employee retrieved successfully",
  "data": {
    "employeeId": "EMP00001",
    ...
  }
}
```

#### 3. تحديث موظف | Update Employee

```http
PUT /api/hr/employees/:id
Content-Type: application/json

{
  "position": "Senior Software Engineer",
  "baseSalary": 18000
}
```

**Response:**
```json
{
  "success": true,
  "message": "Employee updated successfully",
  "data": {
    "employeeId": "EMP00001",
    "position": "Senior Software Engineer",
    "baseSalary": 18000,
    ...
  }
}
```

#### 4. جلب جميع الموظفين | Get All Employees

```http
GET /api/hr/employees
GET /api/hr/employees?department=DEPT0001
GET /api/hr/employees?status=active
GET /api/hr/employees?level=senior
GET /api/hr/employees?search=ahmed
```

**Response:**
```json
{
  "success": true,
  "message": "Employees retrieved successfully",
  "data": [
    {
      "employeeId": "EMP00001",
      ...
    }
  ]
}
```

#### 5. تعطيل موظف | Deactivate Employee

```http
DELETE /api/hr/employees/:id
Content-Type: application/json

{
  "reason": "Resignation"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Employee deactivated successfully",
  "data": {
    "employeeId": "EMP00001",
    "employmentStatus": "terminated",
    ...
  }
}
```

#### 6. تقرير موظف شامل | Employee Report

```http
GET /api/hr/employees/:id/report
```

**Response:**
```json
{
  "success": true,
  "message": "Employee report generated successfully",
  "data": {
    "employee": { ... },
    "compensation": { ... },
    "attendance": { ... },
    "leaves": { ... },
    "performance": { ... },
    "trainings": { ... }
  }
}
```

### الحضور | Attendance

#### 1. تسجيل حضور | Record Attendance

```http
POST /api/hr/attendance
Content-Type: application/json

{
  "employeeId": "EMP00001",
  "date": "2026-01-22",
  "checkIn": "2026-01-22T08:00:00Z",
  "status": "present"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Attendance recorded successfully",
  "data": {
    "attendanceId": "ATT00001",
    "employeeId": "EMP00001",
    "checkIn": "2026-01-22T08:00:00Z",
    ...
  }
}
```

#### 2. تحديث حضور (تسجيل خروج) | Update Attendance

```http
PUT /api/hr/attendance/:id
Content-Type: application/json

{
  "checkOut": "2026-01-22T17:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Attendance updated successfully",
  "data": {
    "attendanceId": "ATT00001",
    "checkOut": "2026-01-22T17:00:00Z",
    "workHours": 9.0,
    "overtimeHours": 1.0,
    ...
  }
}
```

---

<a name="security"></a>
## 🔒 الأمان والصلاحيات | Security & Permissions

### المصادقة | Authentication

**التوصيات:**
- استخدام JWT للمصادقة
- تشفير كلمات المرور باستخدام bcrypt
- انتهاء صلاحية الجلسات
- تحديث التوكن الدوري

**مثال التكامل:**

```javascript
const jwt = require('jsonwebtoken');

// Middleware للمصادقة
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Invalid token'
      });
    }
    req.user = user;
    next();
  });
};

// تطبيق على جميع مسارات HR
router.use(authenticateToken);
```

### التفويض | Authorization

**نظام الأدوار:**

| الدور | الصلاحيات |
|-------|-----------|
| **Admin** | الوصول الكامل |
| **HR Manager** | جميع عمليات HR |
| **Manager** | قسمه فقط + الموافقات |
| **Employee** | بياناته فقط |

**مثال التكامل:**

```javascript
const authorize = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }
    next();
  };
};

// أمثلة الاستخدام
router.post('/employees', authorize(['admin', 'hr-manager']), ...);
router.put('/employees/:id', authorize(['admin', 'hr-manager', 'manager']), ...);
```

### حماية البيانات | Data Protection

**التوصيات:**
1. **تشفير البيانات الحساسة**
   - أرقام الهويات
   - أرقام الحسابات البنكية
   - معلومات الاتصال

2. **تسجيل الأنشطة (Audit Log)**
```javascript
const auditLog = {
  userId: req.user.id,
  action: 'UPDATE_EMPLOYEE',
  target: employeeId,
  timestamp: new Date(),
  changes: {...}
};
```

3. **التحقق من صحة البيانات**
```javascript
const { body, validationResult } = require('express-validator');

router.post('/employees',
  body('email').isEmail(),
  body('phone').matches(/^\+966[0-9]{9}$/),
  body('nationalId').isLength({ min: 10, max: 10 }),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // ...
  }
);
```

---

<a name="best-practices"></a>
## ✅ أفضل الممارسات | Best Practices

### 1. إدارة الأخطاء | Error Handling

```javascript
// مثال شامل
router.post('/employees', async (req, res) => {
  try {
    // التحقق من صحة البيانات
    if (!req.body.email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }
    
    // تنفيذ العملية
    const employee = await hrSystem.addEmployee(req.body);
    
    // استجابة ناجحة
    res.status(201).json({
      success: true,
      message: 'Employee added successfully',
      data: employee
    });
    
  } catch (error) {
    console.error('Error adding employee:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add employee',
      error: error.message
    });
  }
});
```

### 2. التحسين والأداء | Optimization & Performance

```javascript
// استخدام الذاكرة المؤقتة (Caching)
const cache = new Map();

router.get('/employees', (req, res) => {
  const cacheKey = JSON.stringify(req.query);
  
  // تحقق من الذاكرة المؤقتة
  if (cache.has(cacheKey)) {
    return res.json({
      success: true,
      data: cache.get(cacheKey),
      cached: true
    });
  }
  
  // جلب البيانات
  const employees = hrSystem.getAllEmployees(req.query);
  
  // حفظ في الذاكرة المؤقتة لمدة 5 دقائق
  cache.set(cacheKey, employees);
  setTimeout(() => cache.delete(cacheKey), 5 * 60 * 1000);
  
  res.json({
    success: true,
    data: employees,
    cached: false
  });
});
```

### 3. التوثيق التلقائي | Auto Documentation

```javascript
/**
 * @swagger
 * /api/hr/employees:
 *   post:
 *     summary: Add new employee
 *     tags: [Employees]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - email
 *     responses:
 *       201:
 *         description: Employee added successfully
 */
```

---

<a name="deployment"></a>
## 🚀 النشر والإنتاج | Deployment & Production

### التحضير للإنتاج | Production Preparation

#### 1. متغيرات البيئة | Environment Variables

```bash
# .env
NODE_ENV=production
PORT=3001

# Database
MONGODB_URI=mongodb://localhost:27017/hr_system

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRY=24h

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@company.com
SMTP_PASS=your-password
```

#### 2. التكامل مع MongoDB | MongoDB Integration

```javascript
const mongoose = require('mongoose');

// نموذج الموظف
const employeeSchema = new mongoose.Schema({
  employeeId: { type: String, unique: true, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  // ... باقي الحقول
}, {
  timestamps: true
});

const Employee = mongoose.model('Employee', employeeSchema);

// التحويل من Map إلى MongoDB
class AdvancedHRSystem {
  async addEmployee(employeeData) {
    const employee = new Employee({
      employeeId: this.generateEmployeeId(),
      ...employeeData
    });
    
    await employee.save();
    return employee.toObject();
  }
  
  async getEmployee(employeeId) {
    return await Employee.findOne({ employeeId });
  }
  
  async getAllEmployees(filters = {}) {
    const query = {};
    
    if (filters.department) query.department = filters.department;
    if (filters.status) query.employmentStatus = filters.status;
    
    return await Employee.find(query);
  }
}
```

#### 3. PM2 للإنتاج | PM2 Configuration

```json
{
  "apps": [{
    "name": "hr-system",
    "script": "./server.js",
    "instances": 4,
    "exec_mode": "cluster",
    "env": {
      "NODE_ENV": "production",
      "PORT": 3001
    },
    "error_file": "./logs/err.log",
    "out_file": "./logs/out.log",
    "log_date_format": "YYYY-MM-DD HH:mm:ss"
  }]
}
```

```bash
# تشغيل مع PM2
pm2 start ecosystem.config.json
pm2 save
pm2 startup
```

#### 4. Nginx للإنتاج | Nginx Configuration

```nginx
server {
    listen 80;
    server_name hr.company.com;
    
    location /api/hr {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### النسخ الاحتياطي | Backup Strategy

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/hr-system"

# نسخ قاعدة البيانات
mongodump --uri="mongodb://localhost:27017/hr_system" --out="$BACKUP_DIR/db_$DATE"

# ضغط النسخة
tar -czf "$BACKUP_DIR/db_$DATE.tar.gz" "$BACKUP_DIR/db_$DATE"
rm -rf "$BACKUP_DIR/db_$DATE"

# حذف النسخ القديمة (أكثر من 30 يوم)
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
```

---

## 📈 المراقبة | Monitoring

### تتبع الأداء | Performance Tracking

```javascript
const prometheus = require('prom-client');

// مقاييس مخصصة
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status']
});

// middleware للمراقبة
router.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration
      .labels(req.method, req.route.path, res.statusCode)
      .observe(duration);
  });
  
  next();
});
```

---

<div align="center">

## 📖 التوثيق الكامل والشامل
## Complete & Comprehensive Documentation

**تاريخ التحديث:** 22 يناير 2026  
**الإصدار:** 1.0.0

</div>

</div>

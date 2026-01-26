# 🚀 دليل الاستخدام السريع - نظام الموارد البشرية المتقدم

# Quick Usage Guide - Advanced HR System

---

## 📍 الحالة الحالية / Current Status

```
✅ جميع الحاويات صحية وتعمل / All containers healthy
✅ API متاح على المنفذ 3001 / API available on port 3001
✅ 30 نقطة نهاية جاهزة للاستخدام / 30 endpoints ready
✅ التوثيق الكامل متوفر / Complete documentation available
```

---

## 🎯 العنوان الأساسي / Base URL

```
http://localhost:3001/api/hr
أو / or
http://localhost:3001/api/v1/hr
```

---

## 🔐 المصادقة / Authentication

جميع النقاط تتطلب توكن JWT: All endpoints require JWT token:

```javascript
Headers: {
  'Authorization': 'Bearer <YOUR_JWT_TOKEN>',
  'Content-Type': 'application/json'
}
```

---

## 📋 أمثلة الاستخدام / Usage Examples

### 1️⃣ إدارة الأداء / Performance Management

#### إنشاء تقييم أداء / Create Performance Review

```bash
POST /api/hr/performance/reviews

{
  "employeeId": "emp-123",
  "reviewerId": "reviewer-456",
  "reviewCycle": "annual",
  "ratings": {
    "jobKnowledge": 5,
    "communication": 4,
    "teamwork": 5,
    "initiative": 4,
    "reliability": 5,
    "customerService": 4,
    "productivity": 5
  },
  "overallAssessment": "excellent",
  "strengths": "مهارات تقنية قوية / Strong technical skills",
  "areasForImprovement": "إدارة الوقت / Time management",
  "recommendedSalaryIncrease": 10,
  "promotionRecommended": true
}
```

#### الحصول على سجل الأداء / Get Performance History

```bash
GET /api/hr/performance/emp-123/history?months=12
```

#### تقرير الأداء للقسم / Department Performance Report

```bash
GET /api/hr/performance/report/dept-456
```

---

### 2️⃣ إدارة الإجازات / Leave Management

#### تقديم طلب إجازة / Submit Leave Request

```bash
POST /api/hr/leave/request

{
  "leaveType": "annual",
  "startDate": "2026-03-01",
  "endDate": "2026-03-05",
  "reason": "إجازة عائلية / Family vacation"
}
```

#### التحقق من رصيد الإجازات / Check Leave Balance

```bash
GET /api/hr/leave/balance
```

#### الموافقة على طلب إجازة / Approve Leave Request

```bash
PUT /api/hr/leave/request/req-123

{
  "approved": true,
  "comments": "تمت الموافقة / Approved"
}
```

#### قائمة طلبات إجازات الموظف / Employee Leave Requests List

```bash
GET /api/hr/leave/requests/emp-123
```

---

### 3️⃣ تتبع الحضور / Attendance Tracking

#### تسجيل الدخول / Check-In

```bash
POST /api/hr/attendance/checkin

{
  "location": {
    "latitude": 25.2048,
    "longitude": 55.2708
  }
}
```

#### تسجيل الخروج / Check-Out

```bash
POST /api/hr/attendance/checkout
```

#### تقرير الحضور الشهري / Monthly Attendance Report

```bash
GET /api/hr/attendance/report/2026-01
```

#### تقرير حضور القسم / Department Attendance Report

```bash
GET /api/hr/attendance/department/dept-123/2026-01
```

---

### 4️⃣ نظام الرواتب / Payroll System

#### حساب الراتب / Calculate Payroll

```bash
POST /api/hr/payroll/calculate

{
  "employeeId": "emp-123",
  "payPeriod": {
    "startDate": "2026-01-01",
    "endDate": "2026-01-31"
  }
}
```

#### إنشاء قسيمة راتب / Generate Payslip

```bash
GET /api/hr/payroll/payroll-123/payslip
```

#### معالجة الدفع / Process Payment

```bash
PUT /api/hr/payroll/payroll-123/process
```

#### سجل الرواتب / Payroll History

```bash
GET /api/hr/payroll/history/emp-123?months=6
```

---

### 5️⃣ التدريب والتطوير / Training & Development

#### إنشاء برنامج تدريبي / Create Training Program

```bash
POST /api/hr/training

{
  "trainingName": "القيادة المتقدمة / Advanced Leadership",
  "description": "برنامج تنفيذي / Executive program",
  "category": "management",
  "trainer": "د. أحمد محمد / Dr. Ahmad Mohammad",
  "venue": "قاعة التدريب أ / Training Hall A",
  "startDate": "2026-03-15",
  "endDate": "2026-03-17",
  "budget": 5000
}
```

#### تسجيل موظف / Register Employee

```bash
POST /api/hr/training/training-123/register

{
  "employeeId": "emp-456"
}
```

#### تسجيل الحضور / Mark Attendance

```bash
PUT /api/hr/training/training-123/attendance

{
  "employeeId": "emp-456",
  "status": "attended",
  "score": 85
}
```

#### قائمة جميع البرامج / List All Training Programs

```bash
GET /api/hr/training
```

#### تفاصيل البرنامج / Training Details

```bash
GET /api/hr/training/training-123
```

---

### 6️⃣ التحليلات / Analytics

#### إنشاء تقرير تحليلي / Generate Analytics Report

```bash
POST /api/hr/analytics/generate

{
  "departmentId": "dept-123",
  "month": "2026-01"
}
```

#### الحصول على التحليلات / Get Analytics

```bash
GET /api/hr/analytics/dept-123/2026-01
```

---

## 📊 أنواع البيانات / Data Types

### أنواع الإجازات / Leave Types

```
- annual (سنوية)
- sick (مرضية)
- maternity (أمومة)
- paternity (أبوة)
- unpaid (بدون راتب)
- emergency (طارئة)
- study (دراسية)
```

### دورات التقييم / Review Cycles

```
- quarterly (ربع سنوية)
- semi-annual (نصف سنوية)
- annual (سنوية)
```

### التقييمات / Assessments

```
- excellent (ممتاز)
- good (جيد)
- satisfactory (مُرضي)
- needs-improvement (يحتاج تحسين)
- unsatisfactory (غير مُرضي)
```

### حالات الحضور / Attendance Status

```
- present (حاضر)
- absent (غائب)
- late (متأخر)
- half-day (نصف يوم)
- on-leave (في إجازة)
```

### فئات التدريب / Training Categories

```
- technical (تقني)
- soft-skills (مهارات شخصية)
- compliance (امتثال)
- management (إدارة)
- other (أخرى)
```

---

## 🔍 أمثلة الردود / Response Examples

### نجاح تقييم الأداء / Performance Review Success

```json
{
  "message": "تم إنشاء تقييم الأداء بنجاح / Performance review created successfully",
  "review": {
    "_id": "review-123",
    "employeeId": "emp-456",
    "averageRating": 4.57,
    "overallAssessment": "excellent",
    "nextReviewDate": "2027-01-15T00:00:00.000Z"
  }
}
```

### رصيد الإجازات / Leave Balance

```json
{
  "message": "تم استرجاع رصيد الإجازات / Leave balance retrieved",
  "balance": {
    "annualLeave": 18,
    "sickLeave": 10,
    "personalDays": 3,
    "carryover": 2
  }
}
```

### تقرير الحضور / Attendance Report

```json
{
  "message": "تم استرجاع تقرير الحضور / Attendance report retrieved",
  "report": {
    "month": "2026-01",
    "attendanceRate": "96.5%",
    "stats": {
      "presentDays": 21,
      "absentDays": 1,
      "lateDays": 0,
      "totalHours": 168,
      "totalOvertime": 4.5
    }
  }
}
```

### قسيمة الراتب / Payslip

```json
{
  "message": "تم إنشاء قسيمة الراتب بنجاح / Payslip generated successfully",
  "payslip": {
    "payslipNumber": "PS-payroll-123",
    "employee": {
      "firstName": "أحمد / Ahmad",
      "lastName": "محمد / Mohammad"
    },
    "baseSalary": 5000,
    "totalAllowances": 1000,
    "totalDeductions": 1250,
    "grossSalary": 6000,
    "netSalary": 4750,
    "generatedDate": "2026-02-01T10:00:00.000Z"
  }
}
```

---

## ⚠️ معالجة الأخطاء / Error Handling

### خطأ في المصادقة / Authentication Error

```json
{
  "error": "غير مصرح / Unauthorized",
  "status": 401
}
```

### حقول مفقودة / Missing Fields

```json
{
  "error": "حقول مطلوبة مفقودة: employeeId, ratings / Missing required fields: employeeId, ratings",
  "status": 400
}
```

### رصيد إجازة غير كافٍ / Insufficient Leave Balance

```json
{
  "error": "رصيد الإجازة غير كافٍ / Insufficient leave balance",
  "status": 400
}
```

### موظف غير موجود / Employee Not Found

```json
{
  "error": "الموظف غير موجود / Employee not found",
  "status": 404
}
```

---

## 🛠️ نصائح الاستخدام / Usage Tips

### 1. المصادقة / Authentication

```javascript
// احفظ التوكن بعد تسجيل الدخول
// Save token after login
const token = localStorage.getItem('jwt_token');

// استخدمه في جميع الطلبات
// Use it in all requests
const headers = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
};
```

### 2. معالجة الردود / Response Handling

```javascript
try {
  const response = await fetch('/api/hr/leave/balance', { headers });
  const data = await response.json();

  if (response.ok) {
    console.log('نجاح / Success:', data);
  } else {
    console.error('خطأ / Error:', data.error);
  }
} catch (error) {
  console.error('خطأ في الشبكة / Network error:', error);
}
```

### 3. التحقق من البيانات / Data Validation

```javascript
// تحقق من البيانات قبل الإرسال
// Validate data before sending
function validateLeaveRequest(data) {
  const validTypes = [
    'annual',
    'sick',
    'maternity',
    'paternity',
    'unpaid',
    'emergency',
    'study',
  ];

  if (!validTypes.includes(data.leaveType)) {
    throw new Error('نوع إجازة غير صالح / Invalid leave type');
  }

  if (new Date(data.endDate) < new Date(data.startDate)) {
    throw new Error('تاريخ انتهاء غير صالح / Invalid end date');
  }

  return true;
}
```

---

## 📚 الوثائق الكاملة / Complete Documentation

للحصول على التوثيق الكامل، راجع: For complete documentation, see:

- `ADVANCED_HR_SYSTEM_DOCS.md` - مرجع API الكامل / Full API Reference
- `✅_ADVANCED_HR_SYSTEM_COMPLETE.md` - ملخص التطبيق / Implementation Summary
- `⚡_QUICK_START_ADVANCED_HR.md` - دليل البدء السريع / Quick Start Guide

---

## 🧪 الاختبار / Testing

### تشغيل الاختبارات / Run Tests

```bash
npm test backend/tests/hr.enterprise.test.js
```

### اختبار يدوي / Manual Testing

```bash
# استخدم curl أو Postman
# Use curl or Postman

curl -X POST http://localhost:3001/api/hr/performance/reviews \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"employeeId":"emp-123","reviewerId":"rev-456","ratings":{...}}'
```

---

## 🔧 استكشاف الأخطاء / Troubleshooting

### المشكلة / Problem: Token expired

**الحل / Solution**: احصل على توكن جديد من `/api/auth/login` Get new token from
`/api/auth/login`

### المشكلة / Problem: 404 Not Found

**الحل / Solution**: تحقق من عنوان URL والمنفذ Check URL and port number

### المشكلة / Problem: 500 Internal Server Error

**الحل / Solution**: تحقق من سجلات الخادم Check server logs:
`docker logs alaweal-api`

---

## 📞 الدعم / Support

للمساعدة أو الأسئلة: For help or questions:

1. راجع التوثيق الكامل / Review complete documentation
2. تحقق من ملفات الاختبار للأمثلة / Check test files for examples
3. راجع سجلات النظام / Review system logs

---

## 🎯 الحالة / Status

```
✅ النظام: يعمل / System: Running
✅ الحاويات: صحية / Containers: Healthy
✅ API: متاح / API: Available
✅ قاعدة البيانات: متصلة / Database: Connected
✅ التخزين المؤقت: نشط / Cache: Active
```

---

**نظام الموارد البشرية المتقدم v1.0**  
**Advanced HR System v1.0**

**الحالة / Status**: 🟢 جاهز للإنتاج / Production Ready  
**التاريخ / Date**: 19 يناير 2026 / January 19, 2026

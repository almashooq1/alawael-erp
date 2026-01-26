/\*\*

- Advanced HR System Documentation
- نظام الموارد البشرية المتقدم
-
- Complete API Documentation for Enterprise HR Features \*/

# 🏢 Advanced HR System - Complete Documentation

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [API Endpoints](#api-endpoints)
4. [Data Models](#data-models)
5. [Usage Examples](#usage-examples)
6. [Integration Guide](#integration-guide)

---

## Overview

The Advanced HR System provides enterprise-grade human resources management
with:

### ✨ Key Features

| Feature                    | Description                                              |
| -------------------------- | -------------------------------------------------------- |
| **Performance Management** | KPI tracking, review cycles, ratings, goal management    |
| **Leave Management**       | Request submission, approval workflows, balance tracking |
| **Attendance Tracking**    | Check-in/out, biometric integration, shift validation    |
| **Payroll System**         | Salary calculations, deductions, tax handling, payslips  |
| **Training & Development** | Program creation, registration, attendance tracking      |
| **Employee Benefits**      | Health insurance, retirement plans, stock options, PTO   |
| **Disciplinary Actions**   | Warnings, suspensions, terminations with audit trails    |
| **HR Analytics**           | Workforce metrics, trends, predictive analytics          |

---

## Architecture

### Database Models

```
Employee ──┬─→ PerformanceReview
           ├─→ LeaveRequest
           ├─→ Attendance
           ├─→ Payroll
           ├─→ Training
           ├─→ EmployeeBenefits
           ├─→ DisciplinaryAction
           └─→ HRAnalytics
```

### Services Layer

- **PerformanceManagementService** - Performance reviews, ratings, trends
- **LeaveManagementService** - Leave requests, approvals, balance tracking
- **AttendanceService** - Check-in/out, reports, department analytics
- **PayrollService** - Salary calculation, payments, payslips
- **TrainingService** - Program management, registration, tracking

### API Routes

- `/api/hr/performance/*` - Performance management
- `/api/hr/leave/*` - Leave management
- `/api/hr/attendance/*` - Attendance tracking
- `/api/hr/payroll/*` - Payroll operations
- `/api/hr/training/*` - Training programs
- `/api/hr/analytics/*` - HR analytics

---

## API Endpoints

### 🎯 Performance Management

#### Create Performance Review

```
POST /api/hr/performance/reviews
Authorization: Bearer <token>

Body:
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
  "strengths": "Strong technical skills and leadership",
  "areasForImprovement": "Time management in complex projects",
  "goals": [
    {
      "goal": "Lead new API project",
      "targetDate": "2026-06-30",
      "status": "in-progress"
    }
  ],
  "recommendedSalaryIncrease": 10,
  "promotionRecommended": true
}

Response: 201
{
  "message": "Performance review created successfully",
  "review": { ...review data }
}
```

#### Get Performance History

```
GET /api/hr/performance/:employeeId/history?months=12
Authorization: Bearer <token>

Response: 200
{
  "message": "Performance history retrieved",
  "data": {
    "reviews": [...],
    "averageRating": 4.5,
    "trend": [...],
    "improvementArea": "Time management",
    "strengths": "Leadership skills"
  }
}
```

#### Generate Performance Report

```
GET /api/hr/performance/report/:departmentId
Authorization: Bearer <token>

Response: 200
{
  "message": "Performance report generated",
  "report": {
    "totalEmployees": 25,
    "highPerformers": 5,
    "averagePerformers": 18,
    "needsImprovement": 2,
    "performanceBreakdown": [...],
    "recommendedActions": [...]
  }
}
```

---

### 🏖️ Leave Management

#### Submit Leave Request

```
POST /api/hr/leave/request
Authorization: Bearer <token>

Body:
{
  "leaveType": "annual",
  "startDate": "2026-03-01",
  "endDate": "2026-03-05",
  "reason": "Family vacation"
}

Response: 201
{
  "message": "Leave request submitted successfully",
  "leaveRequest": {
    "_id": "req-123",
    "status": "pending",
    "numberOfDays": 5
  }
}
```

#### Approve/Reject Leave Request

```
PUT /api/hr/leave/request/:leaveRequestId
Authorization: Bearer <token>

Body:
{
  "approved": true,
  "comments": "Approved. Enjoy your vacation!"
}

Response: 200
{
  "message": "Leave request approved successfully",
  "leaveRequest": { ...approved request }
}
```

#### Get Leave Balance

```
GET /api/hr/leave/balance
Authorization: Bearer <token>

Response: 200
{
  "message": "Leave balance retrieved",
  "balance": {
    "annualLeave": 18,
    "sickLeave": 10,
    "personalDays": 3,
    "carryover": 2
  }
}
```

#### Get Employee Leave Requests

```
GET /api/hr/leave/requests/:employeeId
Authorization: Bearer <token>

Response: 200
{
  "message": "Leave requests retrieved",
  "requests": [...]
}
```

---

### 👥 Attendance Tracking

#### Record Check-In

```
POST /api/hr/attendance/checkin
Authorization: Bearer <token>

Body:
{
  "location": {
    "latitude": 25.2048,
    "longitude": 55.2708
  }
}

Response: 201
{
  "message": "Check-in recorded successfully",
  "attendance": {
    "_id": "att-123",
    "status": "present",
    "checkInTime": "2026-01-20T08:30:00Z"
  }
}
```

#### Record Check-Out

```
POST /api/hr/attendance/checkout
Authorization: Bearer <token>

Response: 200
{
  "message": "Check-out recorded successfully",
  "attendance": {
    "checkOutTime": "2026-01-20T17:45:00Z",
    "hoursWorked": 9.25,
    "overtime": 1.25
  }
}
```

#### Get Attendance Report

```
GET /api/hr/attendance/report/2026-01
Authorization: Bearer <token>

Response: 200
{
  "message": "Attendance report retrieved",
  "report": {
    "month": "2026-01",
    "attendanceRate": "95.5%",
    "stats": {
      "presentDays": 21,
      "absentDays": 1,
      "totalHours": 168,
      "totalOvertime": 4.5
    },
    "records": [...]
  }
}
```

#### Get Department Attendance Report

```
GET /api/hr/attendance/department/:departmentId/2026-01
Authorization: Bearer <token>

Response: 200
{
  "message": "Department attendance report retrieved",
  "month": "2026-01",
  "stats": {
    "totalPresent": 480,
    "totalAbsent": 15,
    "totalLate": 8,
    "averageAttendanceRate": "96.3%"
  },
  "records": [...]
}
```

---

### 💰 Payroll System

#### Calculate Payroll

```
POST /api/hr/payroll/calculate
Authorization: Bearer <token>

Body:
{
  "employeeId": "emp-123",
  "payPeriod": {
    "startDate": "2026-01-01",
    "endDate": "2026-01-31"
  }
}

Response: 201
{
  "message": "Payroll calculated successfully",
  "payroll": {
    "_id": "payroll-123",
    "baseSalary": 5000,
    "allowances": {
      "housing": 500,
      "transportation": 300,
      "food": 200
    },
    "totalAllowances": 1000,
    "deductions": {
      "incomeTax": 1000,
      "socialSecurity": 250
    },
    "totalDeductions": 1250,
    "grossSalary": 6000,
    "netSalary": 4750
  }
}
```

#### Process Payment

```
PUT /api/hr/payroll/:payrollId/process
Authorization: Bearer <token>

Response: 200
{
  "message": "Payment processed successfully",
  "payroll": {
    "paymentStatus": "processed",
    "paymentDate": "2026-02-01T10:00:00Z"
  }
}
```

#### Generate Payslip

```
GET /api/hr/payroll/:payrollId/payslip
Authorization: Bearer <token>

Response: 200
{
  "message": "Payslip generated successfully",
  "payslip": {
    "payslipNumber": "PS-payroll-123",
    "employee": { ...employee data },
    "baseSalary": 5000,
    "totalAllowances": 1000,
    "totalDeductions": 1250,
    "grossSalary": 6000,
    "netSalary": 4750,
    "generatedDate": "2026-02-01T10:00:00Z"
  }
}
```

#### Get Payroll History

```
GET /api/hr/payroll/history/:employeeId?months=6
Authorization: Bearer <token>

Response: 200
{
  "message": "Payroll history retrieved",
  "payrolls": [...]
}
```

---

### 📚 Training & Development

#### Create Training Program

```
POST /api/hr/training
Authorization: Bearer <token>

Body:
{
  "trainingName": "Advanced Leadership",
  "description": "Executive leadership program",
  "category": "management",
  "trainer": "Dr. John Smith",
  "venue": "Training Hall A",
  "startDate": "2026-03-15",
  "endDate": "2026-03-17",
  "objectives": ["Lead teams effectively", "Strategic planning"],
  "budget": 5000
}

Response: 201
{
  "message": "Training program created successfully",
  "training": { ...training data }
}
```

#### Register Employee for Training

```
POST /api/hr/training/:trainingId/register
Authorization: Bearer <token>

Body:
{
  "employeeId": "emp-123"
}

Response: 201
{
  "message": "Employee registered for training successfully",
  "training": { ...updated training data }
}
```

#### Mark Training Attendance

```
PUT /api/hr/training/:trainingId/attendance
Authorization: Bearer <token>

Body:
{
  "employeeId": "emp-123",
  "status": "attended",
  "score": 85
}

Response: 200
{
  "message": "Attendance marked successfully",
  "training": { ...updated training data }
}
```

#### Get Training Programs

```
GET /api/hr/training
Authorization: Bearer <token>

Response: 200
{
  "message": "Training programs retrieved",
  "trainings": [...]
}
```

#### Get Training Details

```
GET /api/hr/training/:trainingId
Authorization: Bearer <token>

Response: 200
{
  "message": "Training details retrieved",
  "training": {
    ...training data,
    "participants": [...]
  }
}
```

---

### 📊 HR Analytics

#### Get HR Analytics Dashboard

```
GET /api/hr/analytics/:departmentId/2026-01
Authorization: Bearer <token>

Response: 200
{
  "message": "HR analytics retrieved",
  "analytics": {
    "month": "2026-01",
    "totalEmployees": 25,
    "newHires": 2,
    "attrition": 0,
    "attritionRate": 0,
    "averagePerformanceRating": 4.3,
    "highPerformers": 5,
    "avgAttendanceRate": "96.5%",
    "totalLeaveRequests": 8,
    "approvedLeave": 7,
    "totalPayrollCost": 118750,
    "avgSalary": 4750
  }
}
```

#### Generate HR Analytics Report

```
POST /api/hr/analytics/generate
Authorization: Bearer <token>

Body:
{
  "departmentId": "dept-123",
  "month": "2026-01"
}

Response: 201
{
  "message": "HR analytics generated successfully",
  "analytics": { ...analytics data }
}
```

---

## Data Models

### PerformanceReview Schema

```javascript
{
  employeeId: ObjectId,
  reviewerId: ObjectId,
  reviewCycle: 'quarterly' | 'semi-annual' | 'annual',
  ratings: {
    jobKnowledge: 1-5,
    communication: 1-5,
    teamwork: 1-5,
    initiative: 1-5,
    reliability: 1-5,
    customerService: 1-5,
    productivity: 1-5
  },
  averageRating: Number,
  strengths: String,
  areasForImprovement: String,
  goals: [{
    goal: String,
    targetDate: Date,
    status: 'pending' | 'in-progress' | 'completed' | 'failed'
  }],
  overallAssessment: 'excellent' | 'good' | 'satisfactory' | 'needs-improvement' | 'unsatisfactory',
  recommendedSalaryIncrease: Number,
  promotionRecommended: Boolean,
  nextReviewDate: Date
}
```

### LeaveRequest Schema

```javascript
{
  employeeId: ObjectId,
  leaveType: 'annual' | 'sick' | 'maternity' | 'paternity' | 'unpaid' | 'emergency' | 'study',
  startDate: Date,
  endDate: Date,
  numberOfDays: Number,
  reason: String,
  approverId: ObjectId,
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
}
```

### Attendance Schema

```javascript
{
  employeeId: ObjectId,
  date: Date,
  checkInTime: Date,
  checkOutTime: Date,
  status: 'present' | 'absent' | 'late' | 'half-day' | 'on-leave',
  hoursWorked: Number,
  overtime: Number,
  location: { latitude: Number, longitude: Number }
}
```

### Payroll Schema

```javascript
{
  employeeId: ObjectId,
  payPeriod: { startDate: Date, endDate: Date },
  baseSalary: Number,
  allowances: { housing, transportation, food, medical, other },
  deductions: { incomeTax, socialSecurity, insurance, loanRepayment, other },
  overtimeHours: Number,
  bonus: Number,
  grossSalary: Number,
  netSalary: Number,
  paymentStatus: 'pending' | 'processed' | 'failed'
}
```

### Training Schema

```javascript
{
  trainingName: String,
  description: String,
  category: 'technical' | 'soft-skills' | 'compliance' | 'management' | 'other',
  trainer: String,
  startDate: Date,
  endDate: Date,
  duration: Number,
  participants: [{
    employeeId: ObjectId,
    attendanceStatus: 'attended' | 'absent' | 'partial',
    score: Number
  }],
  budget: Number,
  actualCost: Number
}
```

---

## Usage Examples

### Example 1: Complete Performance Review Cycle

```javascript
// 1. Create performance review
const review = await PerformanceManagementService.createPerformanceReview({
  employeeId: "emp-123",
  reviewerId: "reviewer-456",
  reviewCycle: "annual",
  ratings: { ... },
  overallAssessment: "excellent"
});

// 2. Get performance history
const history = await PerformanceManagementService.getPerformanceHistory("emp-123", 12);

// 3. Generate department report
const report = await PerformanceManagementService.generatePerformanceReport("dept-789");
```

### Example 2: Leave Request Workflow

```javascript
// 1. Submit leave request
const request = await LeaveManagementService.submitLeaveRequest('emp-123', {
  leaveType: 'annual',
  startDate: '2026-03-01',
  endDate: '2026-03-05',
  reason: 'Vacation',
});

// 2. Check leave balance
const balance = await LeaveManagementService.getLeaveBalance('emp-123');

// 3. Approve leave
const approved = await LeaveManagementService.approveLeaveRequest(
  request._id,
  'reviewer-456',
  true,
  'Approved'
);
```

### Example 3: Daily Attendance Tracking

```javascript
// 1. Record check-in
const checkin = await AttendanceService.recordCheckIn('emp-123', {
  latitude: 25.2048,
  longitude: 55.2708,
});

// 2. Record check-out
const checkout = await AttendanceService.recordCheckOut('emp-123');

// 3. Get monthly report
const report = await AttendanceService.getAttendanceReport(
  'emp-123',
  '2026-01'
);
```

### Example 4: Payroll Processing

```javascript
// 1. Calculate payroll
const payroll = await PayrollService.calculatePayroll('emp-123', {
  startDate: '2026-01-01',
  endDate: '2026-01-31',
});

// 2. Generate payslip
const payslip = await PayrollService.generatePayslip(payroll._id);

// 3. Process payment
const processed = await PayrollService.processPayment(payroll._id);
```

---

## Integration Guide

### Step 1: Install Dependencies

```bash
cd backend
npm install
```

### Step 2: Import Routes in server.js

```javascript
const hrEnterpriseRoutes = require('./routes/hr.enterprise.routes');
app.use('/api/hr', hrEnterpriseRoutes);
```

### Step 3: Database Connection

```javascript
// Ensure MongoDB is running and connected
const { connectDB } = require('./config/database');
await connectDB();
```

### Step 4: Test Endpoints

```bash
# Test check-in
curl -X POST http://localhost:5000/api/hr/attendance/checkin \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"location": {"latitude": 25.2048, "longitude": 55.2708}}'

# Get leave balance
curl -X GET http://localhost:5000/api/hr/leave/balance \
  -H "Authorization: Bearer <token>"
```

---

## Features Summary

### ✅ Implemented

- ✅ Performance Management System with KPI tracking
- ✅ Leave Management with approval workflows
- ✅ Attendance Tracking with geolocation
- ✅ Payroll Calculation with deductions & allowances
- ✅ Training & Development programs
- ✅ Employee Benefits management
- ✅ Disciplinary Action tracking
- ✅ HR Analytics & Reporting

### 🔄 In Progress

- 🔄 Advanced predictive analytics for turnover
- 🔄 Biometric integration for attendance
- 🔄 Automated compliance reports

### 📋 Upcoming

- 📋 Multi-currency payroll support
- 📋 Compensation benchmarking
- 📋 Talent succession planning
- 📋 Employee engagement surveys

---

## Support & Troubleshooting

### Common Issues

**Issue: Leave request fails with "Employee benefits not found"**

- Solution: Ensure EmployeeBenefits record is created for the employee

**Issue: Check-in already recorded error**

- Solution: Ensure check-in is only done once per day. Check-out to complete the
  day's attendance.

**Issue: Payroll calculation includes negative values**

- Solution: Verify employee salary is set correctly in Employee model

---

## Security & Compliance

- ✅ All endpoints require JWT authentication
- ✅ Role-based access control (RBAC) enforced
- ✅ All operations logged in audit trail
- ✅ Data encryption for sensitive fields
- ✅ GDPR compliance for employee data
- ✅ Rate limiting on all API endpoints

---

## Performance Metrics

- Response time: < 100ms for most operations
- Database queries optimized with indexes
- Caching enabled for analytics reports
- Batch processing for payroll calculations

---

**Last Updated:** January 20, 2026 **Version:** 1.0.0 **Status:** Production
Ready ✅

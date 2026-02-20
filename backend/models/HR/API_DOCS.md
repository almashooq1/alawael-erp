# HR System API Documentation

## Overview

This document describes the RESTful API endpoints for the Human Resources (HR)
system, including authentication, RBAC, and usage examples for each resource.

---

## Authentication & Authorization

- All endpoints require JWT authentication via the
  `Authorization: Bearer <token>` header.
- Access is controlled by RBAC (admin, hr, manager, user) for each route.

---

## Endpoints

### Employee

- `POST   /api/hr/employees` (admin, hr): Create employee
- `GET    /api/hr/employees` (admin, hr, manager): List employees
- `GET    /api/hr/employees/:id` (admin, hr, manager, user): Get employee by ID
- `PUT    /api/hr/employees/:id` (admin, hr): Update employee
- `DELETE /api/hr/employees/:id` (admin): Delete employee

### Attendance

- `POST   /api/hr/attendance` (admin, hr, manager): Create attendance record
- `GET    /api/hr/attendance` (admin, hr, manager): List attendance records
- `GET    /api/hr/attendance/:id` (admin, hr, manager, user): Get attendance by
  ID
- `PUT    /api/hr/attendance/:id` (admin, hr, manager): Update attendance
- `DELETE /api/hr/attendance/:id` (admin, hr): Delete attendance

### Leave

- `POST   /api/hr/leaves` (admin, hr, manager, user): Create leave request
- `GET    /api/hr/leaves` (admin, hr, manager): List leave requests
- `GET    /api/hr/leaves/:id` (admin, hr, manager, user): Get leave by ID
- `PUT    /api/hr/leaves/:id` (admin, hr, manager): Update leave
- `DELETE /api/hr/leaves/:id` (admin, hr): Delete leave

### Payroll

- `POST   /api/hr/payroll` (admin, hr): Create payroll record
- `GET    /api/hr/payroll` (admin, hr, manager): List payroll records
- `GET    /api/hr/payroll/:id` (admin, hr, manager, user): Get payroll by ID
- `PUT    /api/hr/payroll/:id` (admin, hr): Update payroll
- `DELETE /api/hr/payroll/:id` (admin): Delete payroll

### Performance Evaluation

- `POST   /api/hr/performance-evaluations` (admin, hr, manager): Create
  evaluation
- `GET    /api/hr/performance-evaluations` (admin, hr, manager): List
  evaluations
- `GET    /api/hr/performance-evaluations/:id` (admin, hr, manager, user): Get
  evaluation by ID
- `PUT    /api/hr/performance-evaluations/:id` (admin, hr, manager): Update
  evaluation
- `DELETE /api/hr/performance-evaluations/:id` (admin, hr): Delete evaluation

---

## Usage Example

### Create Employee

```http
POST /api/hr/employees
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "...",
  "personalInfo": { "firstName": "...", ... },
  "jobInfo": { "department": "...", ... }
}
```

### Response

```json
{
  "_id": "...",
  "userId": "...",
  ...
}
```

---

## Notes

- All endpoints return standard JSON responses.
- Errors include HTTP status and error message.
- RBAC is enforced automatically; unauthorized access returns 401/403.

---

For full model details, see the model files in this directory.

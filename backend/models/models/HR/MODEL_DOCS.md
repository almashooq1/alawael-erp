# HR System Model Documentation

## Employee Model

- **userId**: ObjectId (User reference, unique)
- **personalInfo**: { firstName, lastName, dateOfBirth, nationality, ... }
- **jobInfo**: { department, position, employmentType, joinDate, ... }
- **status**: active | inactive | on_leave | terminated
- **terminationReason**, **terminationDate**
- **createdAt**, **updatedAt**, **createdBy**, **updatedBy**

## Attendance Model

- **employeeId**: ObjectId (Employee reference)
- **checkInTime**, **checkOutTime**: Date
- **checkInLocation**, **checkOutLocation**: { latitude, longitude, address,
  accuracy }
- **status**: حاضر | غياب | متأخر | إجازة | عطلة | مرض | وقت مرن
- **latenessMinutes**, **overtimeMinutes**, **notes**, **date**
- **createdAt**, **updatedAt**

## Leave Model

- **employeeId**: ObjectId (Employee reference)
- **leaveType**: إجازة سنوية | إجازة مرضية | ...
- **startDate**, **endDate**, **duration**, **reason**
- **status**: مرسل | قيد المراجعة | موافق عليه | مرفوض
- **approvedBy**, **approvalDate**, **rejectionReason**
- **isPaidLeave**, **leaveBalance**, **documents**, **attachments**
- **createdAt**, **updatedAt**

## Payroll Model

- **employeeId**: ObjectId (Employee reference)
- **month**, **year**
- **baseSalary**, **allowances[]**, **deductions[]**, **totalGross**,
  **totalDeductions**, **totalNet**
- **attendance**: { presentDays, absentDays, ... }
- **bonuses[]**, **penalties[]**, **paymentStatus**, **paymentDate**,
  **paymentMethod**
- **taxes**: { incomeTax, socialSecurity, healthInsurance }
- **notes**, **approvedBy**, **approvalDate**
- **createdAt**, **updatedAt**

## Performance Evaluation Model

- **employeeId**: ObjectId (Employee reference)
- **evaluationPeriod**: { startDate, endDate }
- **evaluations**: { managementEvaluation, peerEvaluations[],
  recipientEvaluations[], selfEvaluation }
- **summary**: { weightedScores, overallScore, overallRating, executiveSummary,
  ... }
- **hrNotes**, **approvedBy**, **approvalDate**, **status**
- **createdAt**, **updatedAt**, **submittedAt**, **reviewedAt**

---

- All models are extensible and indexed for performance.
- See each model file for full schema and field details.
- All references are enforced via ObjectId and RBAC.

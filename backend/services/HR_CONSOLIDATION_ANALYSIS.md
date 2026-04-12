# HR Services Consolidation Analysis

## 1. FILE SUMMARY

| # | File | Lines | Export Style | Export Name |
|---|------|------:|-------------|-------------|
| 1 | `hrCore.service.js` | 78 | Class + instance | `HRCoreService` + `.instance` |
| 2 | `hr-advanced.service.js` | 443 | Instance | `new HRService()` |
| 3 | `hr-dashboard.service.js` | 589 | Instance | `new HRDashboardService()` |
| 4 | `hr.advanced.service.js` | 630 | Named object (5 classes) | `{ PerformanceManagementService, LeaveManagementService, AttendanceService, PayrollService, TrainingService }` |
| 5 | `hrPhase6Service.js` | 145 | Class | `HRPhase6Service` |
| 6 | `employeeAffairs.service.js` | 1052 | Instance | `new EmployeeAffairsService()` |
| 7 | `employeeAffairs.expanded.service.js` | 998 | Instance | `new EmployeeAffairsExpandedService()` |
| 8 | `employeeAffairs.phase2.service.js` | 806 | Instance | `new EmployeeAffairsPhase2Service()` |
| 9 | `employeeAffairs.phase3.service.js` | 651 | Instance | `new EmployeeAffairsPhase3Service()` |

**Total: 5,392 lines across 9 files**

---

## 2. COMPLETE EXPORTS PER FILE

### File 1: `hrCore.service.js` (78 lines)
```
module.exports = HRCoreService;
module.exports.instance = new HRCoreService();
```
**Exported methods (static):**
1. `checkExpiringContracts()` — Contract expiry alerts (mock data)
2. `generatePayrollRun(month, year)` — Monthly payroll calc with deductions/bonuses (mock data)

---

### File 2: `hr-advanced.service.js` (443 lines)
```
module.exports = new HRService();
```
**Exported methods (instance):**
1. `createEmployee(employeeData)`
2. `updateEmployee(employeeId, updateData)`
3. `getEmployee(employeeId)`
4. `getAllEmployees(filters)`
5. `deleteEmployee(employeeId)`
6. `getEmployeeProfile(employeeId)`
7. `generatePayroll(month, employeeData)`
8. `processPayroll(month)`
9. `transferPayroll(month)`
10. `getMonthlyPayrollSummary(month)`
11. `createTrainingProgram(trainingData)`
12. `enrollEmployees(trainingId, employeeIds)`
13. `completeTraining(trainingId, employeeId, score)`
14. `createPerformanceReview(employeeId, reviewData)`
15. `addInterimReview(employeeId, rating, comments)`
16. `getHRAnalytics()`
17. `getExpiringContracts(daysThreshold)`
18. `getPendingReviews()`
19. `getPendingPayrolls()`
20. `searchEmployees(searchTerm, filters)`

---

### File 3: `hr-dashboard.service.js` (589 lines)
```
module.exports = new HRDashboardService();
```
**Exported methods (instance):**
1. `getHRDashboard(filters)`
2. `getEmployeeDetails(employeeId)`
3. `exportHRReport(format)`

---

### File 4: `hr.advanced.service.js` (630 lines)
```
module.exports = {
  PerformanceManagementService,
  LeaveManagementService,
  AttendanceService,
  PayrollService,
  TrainingService,
};
```
**Exported static methods per class:**

**PerformanceManagementService:**
1. `createPerformanceReview(reviewData)`
2. `getPerformanceHistory(employeeId, months)`
3. `generatePerformanceReport(departmentId)`

**LeaveManagementService:**
4. `submitLeaveRequest(employeeId, leaveData)`
5. `approveLeaveRequest(leaveRequestId, approverId, approved, comments)`
6. `getLeaveBalance(employeeId)`

**AttendanceService:**
7. `recordCheckIn(employeeId, location)`
8. `recordCheckOut(employeeId)`
9. `getAttendanceReport(employeeId, month)`

**PayrollService:**
10. `calculatePayroll(employeeId, payPeriod)`
11. `processPayment(payrollId)`
12. `generatePayslip(payrollId)`

**TrainingService:**
13. `createTraining(trainingData)`
14. `registerEmployee(trainingId, employeeId)`
15. `markAttendance(trainingId, employeeId, status, score)`
16. `calculateDuration(startDate, endDate)` *(non-async helper)*

---

### File 5: `hrPhase6Service.js` (145 lines)
```
module.exports = HRPhase6Service;
```
**Exported methods (instance – class not auto-instantiated):**
1. `getEmployees(filter)`
2. `getEmployeeById(id)`
3. `generatePayroll(month, year)`
4. `getPayrollRecords(month, year)`
5. `checkIn(employeeId, location)`
6. `checkOut(employeeId)`
7. `getAttendance(date)`
8. `requestLeave(leaveData)`
9. `approveLeave(leaveId, approverId)`
10. `getLeaves(status)`
11. `createAppraisal(appraisalData)`
12. `getEmployeePerformance(employeeId)`

---

### File 6: `employeeAffairs.service.js` (1052 lines)
```
module.exports = new EmployeeAffairsService();
```
**Exported methods (instance, 34 methods):**
1. `createEmployee(data)`
2. `getEmployeeById(id)`
3. `listEmployees(filters)`
4. `updateEmployee(id, updates)`
5. `terminateEmployee(id, reason, terminationDate)`
6. `getEmployeeProfile(id)`
7. `requestLeave(data)`
8. `approveLeaveByManager(leaveId, approverId, approverName, comments)`
9. `approveLeaveByHR(leaveId, approverId, approverName, comments)`
10. `rejectLeave(leaveId, rejecterId, rejectorName, comments, stage)`
11. `cancelLeave(leaveId, userId, reason)`
12. `getLeaveBalance(employeeId)`
13. `listLeaves(filters)`
14. `checkIn(employeeId, data)`
15. `checkOut(employeeId, data)`
16. `getMonthlyAttendanceReport(employeeId, month, year)`
17. `createPerformanceReview(employeeId, data)`
18. `getPerformanceHistory(employeeId)`
19. `setEmployeeGoals(employeeId, goals)`
20. `getExpiringContracts(daysThreshold)`
21. `renewContract(employeeId, newEndDate, contractType)`
22. `promoteEmployee(employeeId, toPosition, newSalary, reason)`
23. `addCertification(employeeId, certification)`
24. `addTraining(employeeId, training)`
25. `addSkill(employeeId, skillData)`
26. `addDocument(employeeId, document)`
27. `getDocuments(employeeId)`
28. `getDashboard()`
29. `getDepartmentStatistics(department)`
30. `getEmployeeGovernmentSummary(employeeId)`
31. `updateEmployeeMOLData(employeeId, molData)`
32. `updateEmployeeSponsorshipData(employeeId, sponsorshipData)`
33. `getExpiringDocumentsReport(daysThreshold)`
34. `getSaudizationReport()`

---

### File 7: `employeeAffairs.expanded.service.js` (998 lines)
```
module.exports = new EmployeeAffairsExpandedService();
```
**Exported methods (instance, 34 methods):**
1. `createComplaint(data)`
2. `listComplaints(filters)`
3. `getComplaintById(id)`
4. `updateComplaintStatus(id, data)`
5. `getComplaintStats()`
6. `createLoan(data)`
7. `listLoans(filters)`
8. `getLoanById(id)`
9. `approveLoanStep(id, data)`
10. `recordInstallmentPayment(loanId, installmentNumber)`
11. `getLoanStats()`
12. `createDisciplinaryAction(data)`
13. `listDisciplinaryActions(filters)`
14. `getDisciplinaryActionById(id)`
15. `approveDisciplinaryAction(id, data)`
16. `fileAppeal(id, data)`
17. `getEmployeeDisciplinaryRecord(employeeId)`
18. `createLetterRequest(data)`
19. `listLetters(filters)`
20. `getLetterById(id)`
21. `updateLetterStatus(id, data)`
22. `getLetterStats()`
23. `createPromotionTransfer(data)`
24. `listPromotionTransfers(filters)`
25. `getPromotionTransferById(id)`
26. `approvePromotionTransferStep(id, data)`
27. `executePromotionTransfer(id, data)`
28. `createOvertimeRequest(data)`
29. `listOvertimeRequests(filters)`
30. `getOvertimeRequestById(id)`
31. `approveOvertimeStep(id, data)`
32. `getOvertimeMonthlyReport(month, year)`
33. `getOvertimeStats()`
34. `getExpandedDashboard()`

---

### File 8: `employeeAffairs.phase2.service.js` (806 lines)
```
module.exports = new EmployeeAffairsPhase2Service();
```
**Exported methods (instance, 47 methods):**
1. `createTask(data)`
2. `listTasks(filters)`
3. `getTaskById(id)`
4. `updateTaskStatus(id, data)`
5. `addTaskComment(id, data)`
6. `delegateTask(id, data)`
7. `rateTask(id, data)`
8. `getTaskStats(filters)`
9. `createHousingUnit(data)`
10. `listHousingUnits(filters)`
11. `assignHousing(data)`
12. `listHousingAssignments(filters)`
13. `createTransportationRoute(data)`
14. `listTransportationRoutes(filters)`
15. `assignEmployeeToRoute(routeId, employeeId)`
16. `getHousingStats()`
17. `createCustody(data)`
18. `listCustodies(filters)`
19. `getCustodyById(id)`
20. `returnCustody(id, data)`
21. `reportCustodyIssue(id, data)`
22. `getEmployeeCustodies(employeeId)`
23. `getCustodyStats()`
24. `createWorkPermit(data)`
25. `listWorkPermits(filters)`
26. `getWorkPermitById(id)`
27. `renewWorkPermit(id, data)`
28. `getExpiringPermits(days)`
29. `getWorkPermitStats()`
30. `createReward(data)`
31. `listRewards(filters)`
32. `getRewardById(id)`
33. `approveReward(id, data)`
34. `disburseReward(id, data)`
35. `getEmployeeRewardPoints(employeeId)`
36. `getRewardStats()`
37. `createShiftDefinition(data)`
38. `listShiftDefinitions()`
39. `createShiftAssignment(data)`
40. `bulkCreateShiftAssignments(assignments)`
41. `getEmployeeSchedule(employeeId, startDate, endDate)`
42. `getDepartmentSchedule(department, date)`
43. `recordShiftAttendance(assignmentId, data)`
44. `createShiftSwapRequest(data)`
45. `approveShiftSwap(id, data)`
46. `getShiftStats(department)`
47. `getPhase2Dashboard()`

---

### File 9: `employeeAffairs.phase3.service.js` (651 lines)
```
module.exports = new EmployeeAffairsPhase3Service();
```
**Exported methods (instance, 47 methods):**
1. `createContract(data)`
2. `listContracts(query)`
3. `getContractById(id)`
4. `renewContract(id, data)`
5. `addContractAmendment(id, amendment)`
6. `terminateContract(id, data)`
7. `getExpiringContracts(days)`
8. `getContractStats()`
9. `createSettlement(data)`
10. `listSettlements(query)`
11. `getSettlementById(id)`
12. `approveSettlement(id, data)`
13. `disburseSettlement(id, paymentData)`
14. `getSettlementStats()`
15. `createWarning(data)`
16. `listWarnings(query)`
17. `getWarningById(id)`
18. `issueWarning(id)`
19. `acknowledgeWarning(id, data)`
20. `appealWarning(id, appealData)`
21. `getEmployeeWarningHistory(employeeId)`
22. `getWarningStats()`
23. `initiateClearance(data)`
24. `listClearances(query)`
25. `getClearanceById(id)`
26. `updateClearanceItem(clearanceId, itemId, data)`
27. `calculateFinalSettlement(clearanceId, data)`
28. `conductExitInterview(clearanceId, data)`
29. `getClearanceStats()`
30. `createVisaRequest(data)`
31. `listVisaRequests(query)`
32. `getVisaRequestById(id)`
33. `approveVisaRequest(id, data)`
34. `issueVisa(id, visaDetails)`
35. `recordTravel(id, travelData)`
36. `recordReturn(id)`
37. `getExpiringVisas(days)`
38. `getVisaStats()`
39. `createBenefitPackage(data)`
40. `listBenefitPackages()`
41. `assignBenefit(data)`
42. `listEmployeeBenefits(query)`
43. `getEmployeeBenefitById(id)`
44. `adjustBenefitAllowance(id, adjustment)`
45. `claimAirTicket(benefitId, claimData)`
46. `getBenefitStats()`
47. `getPhase3Dashboard()`

---

## 3. OVERLAP ANALYSIS — Functions That Exist in Multiple Files

### 🔴 Employee CRUD (4 overlapping implementations)
| Function | hr-advanced | hrPhase6 | empAffairs |
|----------|:-----------:|:--------:|:----------:|
| `createEmployee` | ✅ | — | ✅ |
| `getEmployee` / `getEmployeeById` | ✅ | ✅ | ✅ |
| `getAllEmployees` / `getEmployees` / `listEmployees` | ✅ | ✅ | ✅ |
| `updateEmployee` | ✅ | — | ✅ |
| `deleteEmployee` | ✅ | — | — |
| `getEmployeeProfile` | ✅ | — | ✅ |

### 🔴 Leave Management (4 overlapping implementations)
| Function | hr.advanced | hrPhase6 | empAffairs | hr-advanced* |
|----------|:-----------:|:--------:|:----------:|:----------:|
| `requestLeave` / `submitLeaveRequest` | ✅ | ✅ | ✅ | — |
| `approveLeave` / `approveLeaveRequest` | ✅ | ✅ | ✅ (2-stage) | — |
| `getLeaveBalance` | ✅ | — | ✅ | — |
| `getLeaves` / `listLeaves` | — | ✅ | ✅ | — |

### 🔴 Attendance (4 overlapping implementations)
| Function | hr.advanced | hrPhase6 | empAffairs | phase2 |
|----------|:-----------:|:--------:|:----------:|:------:|
| `checkIn` / `recordCheckIn` | ✅ | ✅ | ✅ | — |
| `checkOut` / `recordCheckOut` | ✅ | ✅ | ✅ | — |
| `getAttendance` / `getAttendanceReport` / `getMonthlyAttendanceReport` | ✅ | ✅ | ✅ | — |
| `recordShiftAttendance` | — | — | — | ✅ |

### 🔴 Performance Reviews (4 overlapping implementations)
| Function | hr.advanced | hr-advanced | hrPhase6 | empAffairs |
|----------|:-----------:|:-----------:|:--------:|:----------:|
| `createPerformanceReview` | ✅ | ✅ | ✅ (`createAppraisal`) | ✅ |
| `getPerformanceHistory` / `getEmployeePerformance` | ✅ | — | ✅ | ✅ |
| `generatePerformanceReport` | ✅ | — | — | — |

### 🔴 Payroll (4 overlapping implementations)
| Function | hrCore | hr.advanced | hr-advanced | hrPhase6 |
|----------|:------:|:-----------:|:-----------:|:--------:|
| `generatePayrollRun` / `calculatePayroll` / `generatePayroll` | ✅ | ✅ | ✅ | ✅ |
| `processPayroll` / `processPayment` | — | ✅ | ✅ | — |
| `transferPayroll` | — | — | ✅ | — |
| `getMonthlyPayrollSummary` / `getPayrollRecords` | — | — | ✅ | ✅ |
| `generatePayslip` | — | ✅ | — | — |

### 🔴 Training (3 overlapping implementations)
| Function | hr.advanced | hr-advanced | empAffairs |
|----------|:-----------:|:-----------:|:----------:|
| `createTraining` / `createTrainingProgram` | ✅ | ✅ | — |
| `registerEmployee` / `enrollEmployees` | ✅ | ✅ | — |
| `markAttendance` / `completeTraining` | ✅ | ✅ | — |
| `addTraining` (to employee record) | — | — | ✅ |

### 🔴 Contract Expiry (3 overlapping implementations)
| Function | hrCore | hr-advanced | empAffairs | phase3 |
|----------|:------:|:-----------:|:----------:|:------:|
| `checkExpiringContracts` / `getExpiringContracts` | ✅ (mock) | ✅ | ✅ | ✅ |
| `renewContract` | — | — | ✅ | ✅ |

### 🔴 Dashboard/Analytics (4 overlapping implementations)
| Function | hr-advanced | hr-dashboard | empAffairs | expanded | phase2 | phase3 |
|----------|:-----------:|:------------:|:----------:|:--------:|:------:|:------:|
| `getHRAnalytics` / `getHRDashboard` / `getDashboard` | ✅ | ✅ | ✅ | — | — | — |
| `getExpandedDashboard` | — | — | — | ✅ | — | — |
| `getPhase2Dashboard` | — | — | — | — | ✅ | — |
| `getPhase3Dashboard` | — | — | — | — | — | ✅ |
| `exportHRReport` | — | ✅ | — | — | — | — |

---

## 4. UNIQUE CAPABILITIES PER FILE

| File | Unique Capabilities |
|------|-------------------|
| **hrCore.service.js** | Mock-based payroll prototype (oldest/simplest implementation) |
| **hr-advanced.service.js** | `searchEmployees`, `addInterimReview`, `transferPayroll`, `getPendingPayrolls`, `getPendingReviews` |
| **hr-dashboard.service.js** | `exportHRReport`, comprehensive `getHRDashboard` with 8 sections, `getEmployeeDetails` with full profile |
| **hr.advanced.service.js** | `generatePerformanceReport(departmentId)`, `generatePayslip(payrollId)`, proper 5-class separation by domain |
| **hrPhase6Service.js** | Compact CRUD-first design for Employee+Payroll+Attendance+Leave+Performance |
| **employeeAffairs.service.js** | `terminateEmployee`, `setEmployeeGoals`, `promoteEmployee`, `addCertification`, `addSkill`, `addDocument`, `getDocuments`, `getDepartmentStatistics`, `getEmployeeGovernmentSummary`, `updateEmployeeMOLData`, `updateEmployeeSponsorshipData`, `getExpiringDocumentsReport`, `getSaudizationReport`, 2-stage leave approval (Manager+HR) |
| **employeeAffairs.expanded.service.js** | Complaints, Loans (with installments), Disciplinary Actions (with appeals), Letter Requests, Promotions/Transfers (multi-step approval), Overtime Requests |
| **employeeAffairs.phase2.service.js** | Tasks (with delegation/rating), Housing (units + assignments), Transportation Routes, Custody (asset management), Work Permits, Rewards & Points, Shift Management (definitions, assignments, swaps, schedules) |
| **employeeAffairs.phase3.service.js** | Contract Management (amendments, termination), Settlements (final pay), Warnings (issuance/acknowledgment/appeal), Clearance (exit process, exit interview), Visa Management (travel tracking), Employee Benefits (packages, allowances, air tickets) |

---

## 5. COMPLETE LIST OF ALL 249 UNIQUE EXPORTED FUNCTIONS

### Sorted alphabetically:

1. `acknowledgeWarning`
2. `addCertification`
3. `addContractAmendment`
4. `addDocument`
5. `addInterimReview`
6. `addSkill`
7. `addTaskComment`
8. `addTraining`
9. `adjustBenefitAllowance`
10. `appealWarning`
11. `approveDisciplinaryAction`
12. `approveLeave` / `approveLeaveByHR` / `approveLeaveByManager` / `approveLeaveRequest`
13. `approveLoanStep`
14. `approveOvertimeStep`
15. `approvePromotionTransferStep`
16. `approveReward`
17. `approveSettlement`
18. `approveShiftSwap`
19. `approveVisaRequest`
20. `assignBenefit`
21. `assignEmployeeToRoute`
22. `assignHousing`
23. `bulkCreateShiftAssignments`
24. `calculateDuration`
25. `calculateFinalSettlement`
26. `calculatePayroll`
27. `cancelLeave`
28. `checkExpiringContracts`
29. `checkIn` / `recordCheckIn`
30. `checkOut` / `recordCheckOut`
31. `claimAirTicket`
32. `completeTraining`
33. `conductExitInterview`
34. `createAppraisal`
35. `createBenefitPackage`
36. `createComplaint`
37. `createContract`
38. `createCustody`
39. `createDisciplinaryAction`
40. `createEmployee`
41. `createHousingUnit`
42. `createLetterRequest`
43. `createLoan`
44. `createOvertimeRequest`
45. `createPerformanceReview`
46. `createPromotionTransfer`
47. `createReward`
48. `createSettlement`
49. `createShiftAssignment`
50. `createShiftDefinition`
51. `createShiftSwapRequest`
52. `createTask`
53. `createTraining` / `createTrainingProgram`
54. `createTransportationRoute`
55. `createVisaRequest`
56. `createWarning`
57. `createWorkPermit`
58. `delegateTask`
59. `deleteEmployee`
60. `disburseReward`
61. `disburseSettlement`
62. `enrollEmployees` / `registerEmployee`
63. `executePromotionTransfer`
64. `exportHRReport`
65. `fileAppeal`
66. `generatePayroll` / `generatePayrollRun`
67. `generatePayslip`
68. `generatePerformanceReport`
69. `getAttendance` / `getAttendanceReport` / `getMonthlyAttendanceReport`
70. `getBenefitStats`
71. `getClearanceById`
72. `getClearanceStats`
73. `getComplaintById`
74. `getComplaintStats`
75. `getContractById`
76. `getContractStats`
77. `getCustodyById`
78. `getCustodyStats`
79. `getDashboard` / `getHRAnalytics` / `getHRDashboard`
80. `getDepartmentSchedule`
81. `getDepartmentStatistics`
82. `getDisciplinaryActionById`
83. `getDocuments`
84. `getEmployee` / `getEmployeeById`
85. `getEmployeeBenefitById`
86. `getEmployeeCustodies`
87. `getEmployeeDetails`
88. `getEmployeeDisciplinaryRecord`
89. `getEmployeeGovernmentSummary`
90. `getEmployeePerformance`
91. `getEmployeeProfile`
92. `getEmployeeRewardPoints`
93. `getEmployeeSchedule`
94. `getEmployeeWarningHistory`
95. `getEmployees` / `getAllEmployees` / `listEmployees`
96. `getExpandedDashboard`
97. `getExpiringContracts` / `checkExpiringContracts`
98. `getExpiringDocumentsReport`
99. `getExpiringPermits`
100. `getExpiringVisas`
101. `getHousingStats`
102. `getLeaveBalance`
103. `getLeaves` / `listLeaves`
104. `getLetterById`
105. `getLetterStats`
106. `getLoanById`
107. `getLoanStats`
108. `getMonthlyPayrollSummary` / `getPayrollRecords`
109. `getOvertimeMonthlyReport`
110. `getOvertimeRequestById`
111. `getOvertimeStats`
112. `getPendingPayrolls`
113. `getPendingReviews`
114. `getPerformanceHistory`
115. `getPhase2Dashboard`
116. `getPhase3Dashboard`
117. `getPromotionTransferById`
118. `getRewardById`
119. `getRewardStats`
120. `getSaudizationReport`
121. `getSettlementById`
122. `getSettlementStats`
123. `getShiftStats`
124. `getTaskById`
125. `getTaskStats`
126. `getVisaRequestById`
127. `getVisaStats`
128. `getWarningById`
129. `getWarningStats`
130. `getWorkPermitById`
131. `getWorkPermitStats`
132. `initiateClearance`
133. `issueVisa`
134. `issueWarning`
135. `listBenefitPackages`
136. `listClearances`
137. `listComplaints`
138. `listContracts`
139. `listCustodies`
140. `listDisciplinaryActions`
141. `listEmployeeBenefits`
142. `listHousingAssignments`
143. `listHousingUnits`
144. `listLetters`
145. `listLoans`
146. `listOvertimeRequests`
147. `listPromotionTransfers`
148. `listRewards`
149. `listSettlements`
150. `listShiftDefinitions`
151. `listTasks`
152. `listTransportationRoutes`
153. `listVisaRequests`
154. `listWarnings`
155. `listWorkPermits`
156. `markAttendance`
157. `processPayment` / `processPayroll`
158. `promoteEmployee`
159. `rateTask`
160. `recordInstallmentPayment`
161. `recordReturn`
162. `recordShiftAttendance`
163. `recordTravel`
164. `rejectLeave`
165. `renewContract`
166. `renewWorkPermit`
167. `reportCustodyIssue`
168. `requestLeave` / `submitLeaveRequest`
169. `returnCustody`
170. `searchEmployees`
171. `setEmployeeGoals`
172. `terminateContract`
173. `terminateEmployee`
174. `transferPayroll`
175. `updateClearanceItem`
176. `updateComplaintStatus`
177. `updateEmployee`
178. `updateEmployeeMOLData`
179. `updateEmployeeSponsorshipData`
180. `updateLetterStatus`
181. `updateTaskStatus`

**181 unique function names** (after deduplication of overlapping names)

---

## 6. PROPOSED CONSOLIDATED SUB-MODULE GROUPING

### Module A: `hr.employee` — Employee Core (Lifecycle & Profile)
| Consolidated Function | Source File(s) | Priority Source |
|----------------------|---------------|----------------|
| `createEmployee` | hr-advanced, empAffairs | **empAffairs** |
| `getEmployeeById` | hr-advanced, hrPhase6, empAffairs | **empAffairs** |
| `listEmployees` | hr-advanced, hrPhase6, empAffairs | **empAffairs** |
| `updateEmployee` | hr-advanced, empAffairs | **empAffairs** |
| `deleteEmployee` | hr-advanced | **hr-advanced** |
| `terminateEmployee` | empAffairs | **empAffairs** |
| `getEmployeeProfile` | hr-advanced, empAffairs | **empAffairs** |
| `searchEmployees` | hr-advanced | **hr-advanced** |
| `promoteEmployee` | empAffairs | **empAffairs** |
| `getEmployeeDetails` | hr-dashboard | **hr-dashboard** |

### Module B: `hr.leave` — Leave Management
| Consolidated Function | Source File(s) | Priority Source |
|----------------------|---------------|----------------|
| `requestLeave` | hr.advanced, hrPhase6, empAffairs | **empAffairs** |
| `approveLeaveByManager` | empAffairs | **empAffairs** |
| `approveLeaveByHR` | empAffairs | **empAffairs** |
| `approveLeave` | hr.advanced, hrPhase6 | **empAffairs** (2-stage) |
| `rejectLeave` | empAffairs | **empAffairs** |
| `cancelLeave` | empAffairs | **empAffairs** |
| `getLeaveBalance` | hr.advanced, empAffairs | **empAffairs** |
| `listLeaves` | hrPhase6, empAffairs | **empAffairs** |

### Module C: `hr.attendance` — Attendance & Time Tracking
| Consolidated Function | Source File(s) | Priority Source |
|----------------------|---------------|----------------|
| `checkIn` | hr.advanced, hrPhase6, empAffairs | **empAffairs** |
| `checkOut` | hr.advanced, hrPhase6, empAffairs | **empAffairs** |
| `getMonthlyAttendanceReport` | hr.advanced, hrPhase6, empAffairs | **empAffairs** |

### Module D: `hr.payroll` — Payroll & Compensation
| Consolidated Function | Source File(s) | Priority Source |
|----------------------|---------------|----------------|
| `generatePayroll` | hrCore, hr.advanced, hr-advanced, hrPhase6 | **hr.advanced (PayrollService)** |
| `processPayroll` | hr.advanced, hr-advanced | **hr.advanced** |
| `transferPayroll` | hr-advanced | **hr-advanced** |
| `getMonthlyPayrollSummary` | hr-advanced, hrPhase6 | **hr-advanced** |
| `generatePayslip` | hr.advanced | **hr.advanced** |
| `getPendingPayrolls` | hr-advanced | **hr-advanced** |

### Module E: `hr.performance` — Performance & Goals
| Consolidated Function | Source File(s) | Priority Source |
|----------------------|---------------|----------------|
| `createPerformanceReview` | hr.advanced, hr-advanced, hrPhase6, empAffairs | **empAffairs** |
| `getPerformanceHistory` | hr.advanced, hrPhase6, empAffairs | **empAffairs** |
| `generatePerformanceReport` | hr.advanced | **hr.advanced** |
| `addInterimReview` | hr-advanced | **hr-advanced** |
| `getPendingReviews` | hr-advanced | **hr-advanced** |
| `setEmployeeGoals` | empAffairs | **empAffairs** |

### Module F: `hr.training` — Training & Development
| Consolidated Function | Source File(s) | Priority Source |
|----------------------|---------------|----------------|
| `createTrainingProgram` | hr.advanced, hr-advanced | **hr-advanced** |
| `enrollEmployees` | hr.advanced, hr-advanced | **hr-advanced** |
| `completeTraining` | hr-advanced | **hr-advanced** |
| `markAttendance` | hr.advanced | **hr.advanced** |
| `addTraining` (to record) | empAffairs | **empAffairs** |
| `addCertification` | empAffairs | **empAffairs** |
| `addSkill` | empAffairs | **empAffairs** |
| `calculateDuration` | hr.advanced | **hr.advanced** |

### Module G: `hr.contracts` — Contract Management
| Consolidated Function | Source File(s) | Priority Source |
|----------------------|---------------|----------------|
| `createContract` | phase3 | **phase3** |
| `listContracts` | phase3 | **phase3** |
| `getContractById` | phase3 | **phase3** |
| `renewContract` | empAffairs, phase3 | **phase3** |
| `addContractAmendment` | phase3 | **phase3** |
| `terminateContract` | phase3 | **phase3** |
| `getExpiringContracts` | hrCore, hr-advanced, empAffairs, phase3 | **phase3** |
| `getContractStats` | phase3 | **phase3** |

### Module H: `hr.complaints` — Complaints & Disciplinary
| Consolidated Function | Source File(s) | Priority Source |
|----------------------|---------------|----------------|
| `createComplaint` | expanded | **expanded** |
| `listComplaints` | expanded | **expanded** |
| `getComplaintById` | expanded | **expanded** |
| `updateComplaintStatus` | expanded | **expanded** |
| `getComplaintStats` | expanded | **expanded** |
| `createDisciplinaryAction` | expanded | **expanded** |
| `listDisciplinaryActions` | expanded | **expanded** |
| `getDisciplinaryActionById` | expanded | **expanded** |
| `approveDisciplinaryAction` | expanded | **expanded** |
| `fileAppeal` | expanded | **expanded** |
| `getEmployeeDisciplinaryRecord` | expanded | **expanded** |
| `createWarning` | phase3 | **phase3** |
| `listWarnings` | phase3 | **phase3** |
| `getWarningById` | phase3 | **phase3** |
| `issueWarning` | phase3 | **phase3** |
| `acknowledgeWarning` | phase3 | **phase3** |
| `appealWarning` | phase3 | **phase3** |
| `getEmployeeWarningHistory` | phase3 | **phase3** |
| `getWarningStats` | phase3 | **phase3** |

### Module I: `hr.loans` — Loans & Financial
| Consolidated Function | Source File(s) | Priority Source |
|----------------------|---------------|----------------|
| `createLoan` | expanded | **expanded** |
| `listLoans` | expanded | **expanded** |
| `getLoanById` | expanded | **expanded** |
| `approveLoanStep` | expanded | **expanded** |
| `recordInstallmentPayment` | expanded | **expanded** |
| `getLoanStats` | expanded | **expanded** |

### Module J: `hr.letters` — Official Letters
| Consolidated Function | Source File(s) | Priority Source |
|----------------------|---------------|----------------|
| `createLetterRequest` | expanded | **expanded** |
| `listLetters` | expanded | **expanded** |
| `getLetterById` | expanded | **expanded** |
| `updateLetterStatus` | expanded | **expanded** |
| `getLetterStats` | expanded | **expanded** |

### Module K: `hr.promotions` — Promotions & Transfers
| Consolidated Function | Source File(s) | Priority Source |
|----------------------|---------------|----------------|
| `createPromotionTransfer` | expanded | **expanded** |
| `listPromotionTransfers` | expanded | **expanded** |
| `getPromotionTransferById` | expanded | **expanded** |
| `approvePromotionTransferStep` | expanded | **expanded** |
| `executePromotionTransfer` | expanded | **expanded** |
| `promoteEmployee` | empAffairs | **empAffairs** |

### Module L: `hr.overtime` — Overtime
| Consolidated Function | Source File(s) | Priority Source |
|----------------------|---------------|----------------|
| `createOvertimeRequest` | expanded | **expanded** |
| `listOvertimeRequests` | expanded | **expanded** |
| `getOvertimeRequestById` | expanded | **expanded** |
| `approveOvertimeStep` | expanded | **expanded** |
| `getOvertimeMonthlyReport` | expanded | **expanded** |
| `getOvertimeStats` | expanded | **expanded** |

### Module M: `hr.tasks` — Task Management
| Consolidated Function | Source File(s) | Priority Source |
|----------------------|---------------|----------------|
| `createTask` | phase2 | **phase2** |
| `listTasks` | phase2 | **phase2** |
| `getTaskById` | phase2 | **phase2** |
| `updateTaskStatus` | phase2 | **phase2** |
| `addTaskComment` | phase2 | **phase2** |
| `delegateTask` | phase2 | **phase2** |
| `rateTask` | phase2 | **phase2** |
| `getTaskStats` | phase2 | **phase2** |

### Module N: `hr.housing` — Housing & Transportation
| Consolidated Function | Source File(s) | Priority Source |
|----------------------|---------------|----------------|
| `createHousingUnit` | phase2 | **phase2** |
| `listHousingUnits` | phase2 | **phase2** |
| `assignHousing` | phase2 | **phase2** |
| `listHousingAssignments` | phase2 | **phase2** |
| `createTransportationRoute` | phase2 | **phase2** |
| `listTransportationRoutes` | phase2 | **phase2** |
| `assignEmployeeToRoute` | phase2 | **phase2** |
| `getHousingStats` | phase2 | **phase2** |

### Module O: `hr.custody` — Asset Custody
| Consolidated Function | Source File(s) | Priority Source |
|----------------------|---------------|----------------|
| `createCustody` | phase2 | **phase2** |
| `listCustodies` | phase2 | **phase2** |
| `getCustodyById` | phase2 | **phase2** |
| `returnCustody` | phase2 | **phase2** |
| `reportCustodyIssue` | phase2 | **phase2** |
| `getEmployeeCustodies` | phase2 | **phase2** |
| `getCustodyStats` | phase2 | **phase2** |

### Module P: `hr.permits` — Work Permits
| Consolidated Function | Source File(s) | Priority Source |
|----------------------|---------------|----------------|
| `createWorkPermit` | phase2 | **phase2** |
| `listWorkPermits` | phase2 | **phase2** |
| `getWorkPermitById` | phase2 | **phase2** |
| `renewWorkPermit` | phase2 | **phase2** |
| `getExpiringPermits` | phase2 | **phase2** |
| `getWorkPermitStats` | phase2 | **phase2** |

### Module Q: `hr.rewards` — Rewards & Recognition
| Consolidated Function | Source File(s) | Priority Source |
|----------------------|---------------|----------------|
| `createReward` | phase2 | **phase2** |
| `listRewards` | phase2 | **phase2** |
| `getRewardById` | phase2 | **phase2** |
| `approveReward` | phase2 | **phase2** |
| `disburseReward` | phase2 | **phase2** |
| `getEmployeeRewardPoints` | phase2 | **phase2** |
| `getRewardStats` | phase2 | **phase2** |

### Module R: `hr.shifts` — Shift & Schedule Management
| Consolidated Function | Source File(s) | Priority Source |
|----------------------|---------------|----------------|
| `createShiftDefinition` | phase2 | **phase2** |
| `listShiftDefinitions` | phase2 | **phase2** |
| `createShiftAssignment` | phase2 | **phase2** |
| `bulkCreateShiftAssignments` | phase2 | **phase2** |
| `getEmployeeSchedule` | phase2 | **phase2** |
| `getDepartmentSchedule` | phase2 | **phase2** |
| `recordShiftAttendance` | phase2 | **phase2** |
| `createShiftSwapRequest` | phase2 | **phase2** |
| `approveShiftSwap` | phase2 | **phase2** |
| `getShiftStats` | phase2 | **phase2** |

### Module S: `hr.settlements` — End of Service / Clearance
| Consolidated Function | Source File(s) | Priority Source |
|----------------------|---------------|----------------|
| `createSettlement` | phase3 | **phase3** |
| `listSettlements` | phase3 | **phase3** |
| `getSettlementById` | phase3 | **phase3** |
| `approveSettlement` | phase3 | **phase3** |
| `disburseSettlement` | phase3 | **phase3** |
| `getSettlementStats` | phase3 | **phase3** |
| `initiateClearance` | phase3 | **phase3** |
| `listClearances` | phase3 | **phase3** |
| `getClearanceById` | phase3 | **phase3** |
| `updateClearanceItem` | phase3 | **phase3** |
| `calculateFinalSettlement` | phase3 | **phase3** |
| `conductExitInterview` | phase3 | **phase3** |
| `getClearanceStats` | phase3 | **phase3** |

### Module T: `hr.visa` — Visa & Travel
| Consolidated Function | Source File(s) | Priority Source |
|----------------------|---------------|----------------|
| `createVisaRequest` | phase3 | **phase3** |
| `listVisaRequests` | phase3 | **phase3** |
| `getVisaRequestById` | phase3 | **phase3** |
| `approveVisaRequest` | phase3 | **phase3** |
| `issueVisa` | phase3 | **phase3** |
| `recordTravel` | phase3 | **phase3** |
| `recordReturn` | phase3 | **phase3** |
| `getExpiringVisas` | phase3 | **phase3** |
| `getVisaStats` | phase3 | **phase3** |

### Module U: `hr.benefits` — Employee Benefits
| Consolidated Function | Source File(s) | Priority Source |
|----------------------|---------------|----------------|
| `createBenefitPackage` | phase3 | **phase3** |
| `listBenefitPackages` | phase3 | **phase3** |
| `assignBenefit` | phase3 | **phase3** |
| `listEmployeeBenefits` | phase3 | **phase3** |
| `getEmployeeBenefitById` | phase3 | **phase3** |
| `adjustBenefitAllowance` | phase3 | **phase3** |
| `claimAirTicket` | phase3 | **phase3** |
| `getBenefitStats` | phase3 | **phase3** |

### Module V: `hr.documents` — Documents & Government
| Consolidated Function | Source File(s) | Priority Source |
|----------------------|---------------|----------------|
| `addDocument` | empAffairs | **empAffairs** |
| `getDocuments` | empAffairs | **empAffairs** |
| `getEmployeeGovernmentSummary` | empAffairs | **empAffairs** |
| `updateEmployeeMOLData` | empAffairs | **empAffairs** |
| `updateEmployeeSponsorshipData` | empAffairs | **empAffairs** |
| `getExpiringDocumentsReport` | empAffairs | **empAffairs** |
| `getSaudizationReport` | empAffairs | **empAffairs** |

### Module W: `hr.dashboard` — Analytics & Reporting
| Consolidated Function | Source File(s) | Priority Source |
|----------------------|---------------|----------------|
| `getHRDashboard` | hr-dashboard, hr-advanced, empAffairs | **hr-dashboard** |
| `getExpandedDashboard` | expanded | **expanded** |
| `getPhase2Dashboard` | phase2 | **phase2** |
| `getPhase3Dashboard` | phase3 | **phase3** |
| `exportHRReport` | hr-dashboard | **hr-dashboard** |
| `getHRAnalytics` | hr-advanced | **hr-advanced** |
| `getDepartmentStatistics` | empAffairs | **empAffairs** |

---

## 7. RECOMMENDED CONSOLIDATION PRIORITY

### Phase 1 — Eliminate Duplicates (High-Impact)
Files to **deprecate** after consolidation:
- `hrCore.service.js` (78 lines) → 100% overlap, mock-only
- `hrPhase6Service.js` (145 lines) → 100% overlap with empAffairs + hr.advanced

### Phase 2 — Merge Core HR
- Merge `hr-advanced.service.js` + `hr.advanced.service.js` → they cover the same domains (Performance, Leave, Attendance, Payroll, Training) with different APIs

### Phase 3 — Create Facade
- Build `hr.consolidated.service.js` as a facade that delegates to the 23 sub-modules (A–W), re-exporting from the 4 surviving source files:
  - `employeeAffairs.service.js`
  - `employeeAffairs.expanded.service.js`
  - `employeeAffairs.phase2.service.js`
  - `employeeAffairs.phase3.service.js`
  - `hr-dashboard.service.js` (dashboards only)
  - One merged `hr-advanced.unified.service.js`

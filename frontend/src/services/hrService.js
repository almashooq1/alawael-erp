/**
 * HR Service — Barrel re-export (backward-compatible)
 * يعيد تصدير جميع خدمات الموارد البشرية من الوحدات الفرعية
 *
 * Split into:
 *   hr/demoData.js      — Fallback mock data (~530L)
 *   hr/safeFetch.js     — Shared API wrapper
 *   hr/employeeService  — CRUD employees
 *   hr/attendanceService — Check-in/out
 *   hr/leaveService     — Leave requests
 *   hr/payrollPerformanceDashboardService — Payroll, reviews, KPIs
 */
import {
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} from './hr/employeeService';
import {
  getAttendance,
  checkIn,
  checkOut,
  getMonthlyReport,
  getMyStats,
  getComprehensiveReport,
  getEmployeeAttendance,
  updateAttendanceRecord,
  approveAttendance,
  rejectAttendance,
} from './hr/attendanceService';
import { getLeaves, approveLeave, rejectLeave, createLeaveRequest } from './hr/leaveService';
import {
  getPayroll,
  getPerformanceReviews,
  createPerformanceReview,
  getDashboardKPIs,
} from './hr/payrollPerformanceDashboardService';
import {
  DEMO_EMPLOYEES,
  DEMO_ATTENDANCE,
  DEMO_PAYROLL,
  DEMO_LEAVES,
  DEMO_REVIEWS,
} from './hr/demoData';

// Employee Affairs Expanded — شؤون الموظفين الموسّعة
export * from './hr/employeeAffairsExpandedService';

// Employee Affairs Phase 2 — شؤون الموظفين المرحلة الثانية
export * from './hr/employeeAffairsPhase2Service';

// Employee Affairs Phase 3 — شؤون الموظفين المرحلة الثالثة
export * from './hr/employeeAffairsPhase3Service';

/* --- Named re-exports --- */
export {
  DEMO_EMPLOYEES,
  DEMO_ATTENDANCE,
  DEMO_PAYROLL,
  DEMO_LEAVES,
  DEMO_REVIEWS,
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getAttendance,
  checkIn,
  checkOut,
  getMonthlyReport,
  getMyStats,
  getComprehensiveReport,
  getEmployeeAttendance,
  updateAttendanceRecord,
  approveAttendance,
  rejectAttendance,
  getLeaves,
  approveLeave,
  rejectLeave,
  createLeaveRequest,
  getPayroll,
  getPerformanceReviews,
  createPerformanceReview,
  getDashboardKPIs,
};

/* --- Default export (object shape for backward compat) --- */
export const hrService = {
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getAttendance,
  checkIn,
  checkOut,
  getMonthlyReport,
  getMyStats,
  getComprehensiveReport,
  getEmployeeAttendance,
  updateAttendanceRecord,
  approveAttendance,
  rejectAttendance,
  getPayroll,
  getLeaves,
  approveLeave,
  rejectLeave,
  createLeaveRequest,
  getPerformanceReviews,
  createPerformanceReview,
  getDashboardKPIs,
  DEMO_EMPLOYEES,
  DEMO_ATTENDANCE,
  DEMO_PAYROLL,
  DEMO_LEAVES,
  DEMO_REVIEWS,
};

export default hrService;

/**
 * Consolidated HR Service — خدمة الموارد البشرية الموحدة
 * ══════════════════════════════════════════════════════════════════════════
 * Single facade for all HR operations.
 * Consolidates 9 fragmented files (~5,400 lines → ~1 facade + delegates)
 *
 * Strategy: This facade delegates to the richest implementation for each
 * sub-domain. Over time, implementations should be inlined here.
 *
 * Replaces: hrCore.service, hr-advanced.service, hr-dashboard.service,
 *   hr.advanced.service, hrPhase6Service, employeeAffairs.service,
 *   employeeAffairs.expanded.service, employeeAffairs.phase2.service,
 *   employeeAffairs.phase3.service
 *
 * @module domains/hr/services/hrService
 * @version 3.0.0
 */

const _logger = require('../../../utils/logger');

// ── Lazy-load delegates ───────────────────────────────────────────────
//
// Of the five originally-replaced services, only `employeeAffairs.service`
// is still on disk; the four phase-2 / phase-3 / advanced / dashboard
// services were retired and their functionality moved under
// `services/hr/*` (Phase-11 HRIS rewrite — see employeeAdminService,
// employeeSelfServiceService, hrDashboardService, etc.). The four
// retired delegates are kept as `{}` no-ops so any caller that still
// happens to call e.g. `hrService.compensation.calculate(...)` quietly
// returns undefined rather than crashing — matching the runtime behavior
// these stubs always had after the require() failed in the catch.
//
// Future cleanup: replace the no-op delegates with the modern
// `services/hr/*` services (different surface, requires per-method
// adapter glue) and inline the rest of this facade.

let _empAffairs;
const _emptyDelegate = Object.freeze({});

function empAffairs() {
  if (!_empAffairs) {
    try {
      _empAffairs = require('../../../services/employeeAffairs.service');
    } catch {
      _empAffairs = _emptyDelegate;
    }
  }
  return _empAffairs;
}

const empPhase2 = () => _emptyDelegate;
const empPhase3 = () => _emptyDelegate;
const hrAdvanced = () => _emptyDelegate;
const hrDashboard = () => _emptyDelegate;

// ═══════════════════════════════════════════════════════════════════════════
// 1. EMPLOYEE CRUD — إدارة الموظفين
// ═══════════════════════════════════════════════════════════════════════════

const employee = {
  create: (...args) => empAffairs().createEmployee?.(...args),
  getById: (...args) => empAffairs().getEmployeeById?.(...args),
  getAll: (...args) => empAffairs().getAllEmployees?.(...args),
  update: (...args) => empAffairs().updateEmployee?.(...args),
  deactivate: (...args) => empAffairs().deactivateEmployee?.(...args),
  search: (...args) => empAffairs().searchEmployees?.(...args),
  getProfile: (...args) => empAffairs().getEmployeeProfile?.(...args),
};

// ═══════════════════════════════════════════════════════════════════════════
// 2. LEAVE — الإجازات
// ═══════════════════════════════════════════════════════════════════════════

const leave = {
  request: (...args) => empAffairs().requestLeave?.(...args),
  approve: (...args) => empAffairs().approveLeave?.(...args),
  reject: (...args) => empAffairs().rejectLeave?.(...args),
  cancel: (...args) => empAffairs().cancelLeave?.(...args),
  getBalance: (...args) => empAffairs().getLeaveBalance?.(...args),
  getByEmployee: (...args) => empAffairs().getEmployeeLeaves?.(...args),
  getReport: (...args) => empPhase2().getLeaveReport?.(...args),
};

// ═══════════════════════════════════════════════════════════════════════════
// 3. ATTENDANCE — الحضور والانصراف
// ═══════════════════════════════════════════════════════════════════════════

const attendance = {
  checkIn: (...args) => empAffairs().checkIn?.(...args),
  checkOut: (...args) => empAffairs().checkOut?.(...args),
  getRecords: (...args) => empAffairs().getAttendanceRecords?.(...args),
  getReport: (...args) => empPhase2().getAttendanceReport?.(...args),
  getSummary: (...args) => hrAdvanced().getAttendanceSummary?.(...args),
};

// ═══════════════════════════════════════════════════════════════════════════
// 4. PAYROLL — الرواتب
// ═══════════════════════════════════════════════════════════════════════════

const payroll = {
  calculate: (...args) => hrAdvanced().calculatePayroll?.(...args),
  getSlip: (...args) => empAffairs().getPayslip?.(...args),
  generateBatch: (...args) => empPhase2().generatePayrollBatch?.(...args),
  getReport: (...args) => empPhase2().getPayrollReport?.(...args),
};

// ═══════════════════════════════════════════════════════════════════════════
// 5. PERFORMANCE — تقييم الأداء
// ═══════════════════════════════════════════════════════════════════════════

const performance = {
  createReview: (...args) => hrAdvanced().createPerformanceReview?.(...args),
  getReviews: (...args) => hrAdvanced().getPerformanceReviews?.(...args),
  submitReview: (...args) => empPhase2().submitPerformanceReview?.(...args),
  getReport: (...args) => empPhase2().getPerformanceReport?.(...args),
};

// ═══════════════════════════════════════════════════════════════════════════
// 6. TRAINING — التدريب
// ═══════════════════════════════════════════════════════════════════════════

const training = {
  createProgram: (...args) => hrAdvanced().createTrainingProgram?.(...args),
  enroll: (...args) => hrAdvanced().enrollInTraining?.(...args),
  complete: (...args) => empPhase3().completeTraining?.(...args),
  getHistory: (...args) => empPhase2().getTrainingHistory?.(...args),
  getNeeds: (...args) => empPhase3().getTrainingNeeds?.(...args),
};

// ═══════════════════════════════════════════════════════════════════════════
// 7. OTHER SUB-DOMAINS — أقسام فرعية أخرى
// ═══════════════════════════════════════════════════════════════════════════

const contracts = {
  create: (...args) => empAffairs().createContract?.(...args),
  renew: (...args) => empAffairs().renewContract?.(...args),
  getExpiring: (...args) => empPhase2().getExpiringContracts?.(...args),
};

const complaints = {
  submit: (...args) => empPhase2().submitComplaint?.(...args),
  resolve: (...args) => empPhase2().resolveComplaint?.(...args),
  getAll: (...args) => empPhase2().getComplaints?.(...args),
};

const loans = {
  request: (...args) => empPhase3().requestLoan?.(...args),
  approve: (...args) => empPhase3().approveLoan?.(...args),
  getAll: (...args) => empPhase3().getLoans?.(...args),
};

const letters = {
  generate: (...args) => empPhase2().generateLetter?.(...args),
  getTemplates: (...args) => empPhase2().getLetterTemplates?.(...args),
};

const promotions = {
  request: (...args) => empPhase3().requestPromotion?.(...args),
  approve: (...args) => empPhase3().approvePromotion?.(...args),
};

const overtime = {
  submit: (...args) => empPhase3().submitOvertime?.(...args),
  approve: (...args) => empPhase3().approveOvertime?.(...args),
  getReport: (...args) => empPhase3().getOvertimeReport?.(...args),
};

const dashboard = {
  getSummary: (...args) => hrDashboard().getHRDashboardSummary?.(...args),
  getMetrics: (...args) => hrDashboard().getHRMetrics?.(...args),
  getReport: (...args) => hrDashboard().generateHRReport?.(...args),
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS — مُصدّرات
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
  // Sub-domain namespaces
  employee,
  leave,
  attendance,
  payroll,
  performance,
  training,
  contracts,
  complaints,
  loans,
  letters,
  promotions,
  overtime,
  dashboard,

  // Flat aliases for backward compatibility
  createEmployee: employee.create,
  getEmployeeById: employee.getById,
  getAllEmployees: employee.getAll,
  updateEmployee: employee.update,
  searchEmployees: employee.search,
  requestLeave: leave.request,
  approveLeave: leave.approve,
  checkIn: attendance.checkIn,
  checkOut: attendance.checkOut,
  calculatePayroll: payroll.calculate,
  getHRDashboardSummary: dashboard.getSummary,
};

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

const logger = require('../../../utils/logger');

// ── Lazy-load delegates (richest implementation per sub-domain) ─────────

let _empAffairs, _empPhase2, _empPhase3, _hrAdvanced, _hrDashboard;

function empAffairs() {
  if (!_empAffairs) {
    try {
      _empAffairs = require('../../../services/employeeAffairs.service');
    } catch {
      _empAffairs = {};
    }
  }
  return _empAffairs;
}

function empPhase2() {
  if (!_empPhase2) {
    try {
      _empPhase2 = require('../../../services/employeeAffairs.phase2.service');
    } catch {
      _empPhase2 = {};
    }
  }
  return _empPhase2;
}

function empPhase3() {
  if (!_empPhase3) {
    try {
      _empPhase3 = require('../../../services/employeeAffairs.phase3.service');
    } catch {
      _empPhase3 = {};
    }
  }
  return _empPhase3;
}

function hrAdvanced() {
  if (!_hrAdvanced) {
    try {
      _hrAdvanced = require('../../../services/hr-advanced.service');
    } catch {
      _hrAdvanced = {};
    }
  }
  return _hrAdvanced;
}

function hrDashboard() {
  if (!_hrDashboard) {
    try {
      _hrDashboard = require('../../../services/hr-dashboard.service');
    } catch {
      _hrDashboard = {};
    }
  }
  return _hrDashboard;
}

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

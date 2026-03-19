/**
 * Employee Affairs Routes — مسارات شؤون الموظفين
 *
 * 30+ endpoints covering the full employee lifecycle.
 * IMPORTANT: Specific paths (/leaves, /dashboard, etc.) MUST be declared
 *            BEFORE the /:id wildcard to avoid route-shadowing.
 */

const express = require('express');
const router = express.Router();
const { authenticateToken, authorize } = require('../middleware/auth');
const service = require('../services/employeeAffairs.service');
const logger = require('../utils/logger');

// ─── Async wrapper ──────────────────────────────────────────────────────────
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ═══════════════════════════════════════════════════════════════════════════
// لوحة المعلومات (MUST come before /:id)
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/dashboard',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const data = await service.getDashboard();
    res.json({ success: true, data });
  })
);

router.get(
  '/stats/department/:department',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const data = await service.getDepartmentStatistics(req.params.department);
    res.json({ success: true, data });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
// الإجازات (MUST come before /:id)
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/leaves',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await service.listLeaves(req.query);
    res.json({ success: true, ...result });
  })
);

router.post(
  '/leaves',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const leave = await service.requestLeave({
      ...req.body,
      createdBy: req.user?.id || req.user?._id,
    });
    res.status(201).json({ success: true, data: leave });
  })
);

router.get(
  '/leaves/balance/:employeeId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const balance = await service.getLeaveBalance(req.params.employeeId);
    res.json({ success: true, data: balance });
  })
);

router.post(
  '/leaves/:id/approve-manager',
  authenticateToken,
  authorize(['admin', 'hr_manager', 'manager']),
  asyncHandler(async (req, res) => {
    const leave = await service.approveLeaveByManager(
      req.params.id,
      req.user?.id || req.user?._id,
      req.user?.name || 'Manager',
      req.body.comments
    );
    res.json({ success: true, data: leave });
  })
);

router.post(
  '/leaves/:id/approve-hr',
  authenticateToken,
  authorize(['admin', 'hr_manager', 'hr']),
  asyncHandler(async (req, res) => {
    const leave = await service.approveLeaveByHR(
      req.params.id,
      req.user?.id || req.user?._id,
      req.user?.name || 'HR',
      req.body.comments
    );
    res.json({ success: true, data: leave });
  })
);

router.post(
  '/leaves/:id/reject',
  authenticateToken,
  authorize(['admin', 'hr_manager', 'hr', 'manager']),
  asyncHandler(async (req, res) => {
    const leave = await service.rejectLeave(
      req.params.id,
      req.user?.id || req.user?._id,
      req.user?.name || 'Reviewer',
      req.body.comments,
      req.body.stage
    );
    res.json({ success: true, data: leave });
  })
);

router.post(
  '/leaves/:id/cancel',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const leave = await service.cancelLeave(
      req.params.id,
      req.user?.id || req.user?._id,
      req.body.reason
    );
    res.json({ success: true, data: leave });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
// الحضور والانصراف (MUST come before /:id)
// ═══════════════════════════════════════════════════════════════════════════

router.post(
  '/attendance/check-in',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const record = await service.checkIn(req.body.employeeId || req.user?.id, req.body);
    res.json({ success: true, data: record });
  })
);

router.post(
  '/attendance/check-out',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const record = await service.checkOut(req.body.employeeId || req.user?.id, req.body);
    res.json({ success: true, data: record });
  })
);

router.get(
  '/attendance/report/:employeeId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { month = new Date().getMonth() + 1, year = new Date().getFullYear() } = req.query;
    const report = await service.getMonthlyAttendanceReport(req.params.employeeId, month, year);
    res.json({ success: true, data: report });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
// تقييم الأداء (MUST come before /:id)
// ═══════════════════════════════════════════════════════════════════════════

router.post(
  '/performance/:employeeId',
  authenticateToken,
  authorize(['admin', 'hr_manager', 'hr', 'manager']),
  asyncHandler(async (req, res) => {
    const review = await service.createPerformanceReview(req.params.employeeId, {
      ...req.body,
      reviewer: req.user?.id || req.user?._id,
    });
    res.status(201).json({ success: true, data: review });
  })
);

router.get(
  '/performance/:employeeId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const history = await service.getPerformanceHistory(req.params.employeeId);
    res.json({ success: true, data: history });
  })
);

router.put(
  '/performance/:employeeId/goals',
  authenticateToken,
  authorize(['admin', 'hr_manager', 'hr', 'manager']),
  asyncHandler(async (req, res) => {
    const goals = await service.setEmployeeGoals(req.params.employeeId, req.body.goals);
    res.json({ success: true, data: goals });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
// العقود (MUST come before /:id)
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/contracts/expiring',
  authenticateToken,
  authorize(['admin', 'hr_manager', 'hr']),
  asyncHandler(async (req, res) => {
    const days = parseInt(req.query.days) || 30;
    const contracts = await service.getExpiringContracts(days);
    res.json({ success: true, data: contracts, count: contracts.length });
  })
);

router.post(
  '/contracts/:employeeId/renew',
  authenticateToken,
  authorize(['admin', 'hr_manager']),
  asyncHandler(async (req, res) => {
    const { endDate, contractType } = req.body;
    const employee = await service.renewContract(req.params.employeeId, endDate, contractType);
    res.json({ success: true, data: employee });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
// التطور الوظيفي (MUST come before /:id)
// ═══════════════════════════════════════════════════════════════════════════

router.post(
  '/career/:employeeId/promote',
  authenticateToken,
  authorize(['admin', 'hr_manager']),
  asyncHandler(async (req, res) => {
    const { toPosition, newSalary, reason } = req.body;
    const result = await service.promoteEmployee(
      req.params.employeeId,
      toPosition,
      newSalary,
      reason
    );
    res.json({ success: true, data: result });
  })
);

router.post(
  '/career/:employeeId/certification',
  authenticateToken,
  authorize(['admin', 'hr_manager', 'hr']),
  asyncHandler(async (req, res) => {
    const certs = await service.addCertification(req.params.employeeId, req.body);
    res.json({ success: true, data: certs });
  })
);

router.post(
  '/career/:employeeId/training',
  authenticateToken,
  authorize(['admin', 'hr_manager', 'hr']),
  asyncHandler(async (req, res) => {
    const trainings = await service.addTraining(req.params.employeeId, req.body);
    res.json({ success: true, data: trainings });
  })
);

router.post(
  '/career/:employeeId/skill',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const skills = await service.addSkill(req.params.employeeId, req.body);
    res.json({ success: true, data: skills });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
// المستندات (MUST come before /:id)
// ═══════════════════════════════════════════════════════════════════════════

router.post(
  '/documents/:employeeId',
  authenticateToken,
  authorize(['admin', 'hr_manager', 'hr']),
  asyncHandler(async (req, res) => {
    const docs = await service.addDocument(req.params.employeeId, req.body);
    res.json({ success: true, data: docs });
  })
);

router.get(
  '/documents/:employeeId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const docs = await service.getDocuments(req.params.employeeId);
    res.json({ success: true, data: docs });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
// إدارة الموظفين (CRUD) — /:id LAST to avoid shadowing
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await service.listEmployees(req.query);
    res.json({ success: true, ...result });
  })
);

router.post(
  '/',
  authenticateToken,
  authorize(['admin', 'hr_manager', 'hr']),
  asyncHandler(async (req, res) => {
    const employee = await service.createEmployee(req.body);
    res.status(201).json({ success: true, data: employee });
  })
);

router.get(
  '/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const employee = await service.getEmployeeById(req.params.id);
    res.json({ success: true, data: employee });
  })
);

router.get(
  '/:id/profile',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const profile = await service.getEmployeeProfile(req.params.id);
    res.json({ success: true, data: profile });
  })
);

router.put(
  '/:id',
  authenticateToken,
  authorize(['admin', 'hr_manager', 'hr']),
  asyncHandler(async (req, res) => {
    const employee = await service.updateEmployee(req.params.id, req.body);
    res.json({ success: true, data: employee });
  })
);

router.post(
  '/:id/terminate',
  authenticateToken,
  authorize(['admin', 'hr_manager']),
  asyncHandler(async (req, res) => {
    const { reason, terminationDate } = req.body;
    const employee = await service.terminateEmployee(req.params.id, reason, terminationDate);
    res.json({ success: true, data: employee });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
// التكامل الحكومي — Government Integration endpoints
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/government/saudization',
  authenticateToken,
  authorize(['admin', 'hr_manager', 'hr']),
  asyncHandler(async (req, res) => {
    const data = await service.getSaudizationReport();
    res.json({ success: true, data });
  })
);

router.get(
  '/government/expiring-documents',
  authenticateToken,
  authorize(['admin', 'hr_manager', 'hr']),
  asyncHandler(async (req, res) => {
    const days = parseInt(req.query.days, 10) || 30;
    const data = await service.getExpiringDocumentsReport(days);
    res.json({ success: true, data });
  })
);

router.get(
  '/:id/government-summary',
  authenticateToken,
  authorize(['admin', 'hr_manager', 'hr']),
  asyncHandler(async (req, res) => {
    const data = await service.getEmployeeGovernmentSummary(req.params.id);
    res.json({ success: true, data });
  })
);

router.put(
  '/:id/mol',
  authenticateToken,
  authorize(['admin', 'hr_manager']),
  asyncHandler(async (req, res) => {
    const data = await service.updateEmployeeMOLData(req.params.id, req.body);
    res.json({ success: true, data });
  })
);

router.put(
  '/:id/sponsorship',
  authenticateToken,
  authorize(['admin', 'hr_manager']),
  asyncHandler(async (req, res) => {
    const data = await service.updateEmployeeSponsorshipData(req.params.id, req.body);
    res.json({ success: true, data });
  })
);

// ─── Error handler ──────────────────────────────────────────────────────────
router.use((err, req, res, _next) => {
  logger.error(`[EmployeeAffairs Route Error] ${err.message}`);
  const statusCode = err.message.includes('غير موجود')
    ? 404
    : err.message.includes('مستخدم بالفعل')
      ? 409
      : err.message.includes('غير كافٍ') || err.message.includes('تعارض')
        ? 400
        : err.message.includes('لا يمكن') || err.message.includes('يجب')
          ? 422
          : 500;
  res.status(statusCode).json({ success: false, message: err.message });
});

module.exports = router;

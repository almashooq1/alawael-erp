/**
 * HR Domain Routes — مسارات API للموارد البشرية الموحدة
 *
 * الهدف التشغيلي: واجهة /api/hr موحدة للعمليات المتكاملة —
 * الموظفون، الإجازات، الحضور، الرواتب، التقييم، التدريب.
 *
 * @module domains/hr/routes/hr.routes
 */

'use strict';

const express = require('express');
const router = express.Router();

let hr;
try {
  hr = require('../index'); // re-exports hrService facade
} catch (_e) {
  hr = null;
}

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const {
  validateCreateEmployee,
  validateUpdateEmployee,
  validateRequestLeave,
  validateCheckIn,
  validate,
} = require('../validators/hr.validator');

const requireService = (req, res, next) => {
  if (!hr) {
    return res.status(503).json({ success: false, message: 'HR service unavailable' });
  }
  return next();
};

// ═══════════════════════════════════════════════════════════════════════════════
// Employees
// ═══════════════════════════════════════════════════════════════════════════════

/** GET /employees — قائمة الموظفين */
router.get(
  '/employees',
  requireService,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, branchId, department, status } = req.query;
    const result = await hr.employee.getAll({
      page: parseInt(page, 10),
      limit: Math.min(parseInt(limit, 10), 100),
      branchId: branchId || req.user?.branchId,
      department,
      status,
    });
    res.json({ success: true, ...result });
  })
);

/** POST /employees — إضافة موظف */
router.post(
  '/employees',
  requireService,
  validate(validateCreateEmployee),
  asyncHandler(async (req, res) => {
    const employee = await hr.employee.create(req.body);
    res.status(201).json({ success: true, data: employee });
  })
);

/** GET /employees/:id — موظف واحد */
router.get(
  '/employees/:id',
  requireService,
  asyncHandler(async (req, res) => {
    const employee = await hr.employee.getById(req.params.id);
    res.json({ success: true, data: employee });
  })
);

/** GET /employees/:id/profile — ملف الموظف الكامل */
router.get(
  '/employees/:id/profile',
  requireService,
  asyncHandler(async (req, res) => {
    const profile = await hr.employee.getProfile(req.params.id);
    res.json({ success: true, data: profile });
  })
);

/** PUT /employees/:id — تحديث بيانات موظف */
router.put(
  '/employees/:id',
  requireService,
  validate(validateUpdateEmployee),
  asyncHandler(async (req, res) => {
    const updated = await hr.employee.update(req.params.id, req.body);
    res.json({ success: true, data: updated });
  })
);

/** PATCH /employees/:id/deactivate — إيقاف موظف */
router.patch(
  '/employees/:id/deactivate',
  requireService,
  asyncHandler(async (req, res) => {
    const result = await hr.employee.deactivate(req.params.id, req.body.reason);
    res.json({ success: true, data: result });
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// Leave management
// ═══════════════════════════════════════════════════════════════════════════════

/** POST /leaves — طلب إجازة */
router.post(
  '/leaves',
  requireService,
  validate(validateRequestLeave),
  asyncHandler(async (req, res) => {
    const leave = await hr.leave.request({ ...req.body, employeeId: req.user?._id });
    res.status(201).json({ success: true, data: leave });
  })
);

/** GET /leaves/employee/:employeeId — إجازات موظف */
router.get(
  '/leaves/employee/:employeeId',
  requireService,
  asyncHandler(async (req, res) => {
    const leaves = await hr.leave.getByEmployee(req.params.employeeId, req.query);
    res.json({ success: true, data: leaves });
  })
);

/** GET /leaves/balance/:employeeId — رصيد الإجازات */
router.get(
  '/leaves/balance/:employeeId',
  requireService,
  asyncHandler(async (req, res) => {
    const balance = await hr.leave.getBalance(req.params.employeeId);
    res.json({ success: true, data: balance });
  })
);

/** PATCH /leaves/:id/approve — اعتماد إجازة */
router.patch(
  '/leaves/:id/approve',
  requireService,
  asyncHandler(async (req, res) => {
    const result = await hr.leave.approve(req.params.id, req.user?._id);
    res.json({ success: true, data: result });
  })
);

/** PATCH /leaves/:id/reject — رفض إجازة */
router.patch(
  '/leaves/:id/reject',
  requireService,
  asyncHandler(async (req, res) => {
    const result = await hr.leave.reject(req.params.id, req.body.reason, req.user?._id);
    res.json({ success: true, data: result });
  })
);

/** PATCH /leaves/:id/cancel — إلغاء إجازة */
router.patch(
  '/leaves/:id/cancel',
  requireService,
  asyncHandler(async (req, res) => {
    const result = await hr.leave.cancel(req.params.id);
    res.json({ success: true, data: result });
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// Attendance
// ═══════════════════════════════════════════════════════════════════════════════

/** POST /attendance/check-in — تسجيل حضور */
router.post(
  '/attendance/check-in',
  requireService,
  validate(validateCheckIn),
  asyncHandler(async (req, res) => {
    const record = await hr.attendance.checkIn({ employeeId: req.user?._id, ...req.body });
    res.status(201).json({ success: true, data: record });
  })
);

/** POST /attendance/check-out — تسجيل انصراف */
router.post(
  '/attendance/check-out',
  requireService,
  asyncHandler(async (req, res) => {
    const record = await hr.attendance.checkOut({ employeeId: req.user?._id, ...req.body });
    res.json({ success: true, data: record });
  })
);

/** GET /attendance/employee/:employeeId — سجل حضور موظف */
router.get(
  '/attendance/employee/:employeeId',
  requireService,
  asyncHandler(async (req, res) => {
    const records = await hr.attendance.getRecords(req.params.employeeId, req.query);
    res.json({ success: true, data: records });
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// Health check
// ═══════════════════════════════════════════════════════════════════════════════

/** GET /health — حالة خدمة HR */
router.get('/health', (req, res) => {
  res.json({ success: true, data: { status: hr ? 'available' : 'degraded' } });
});

module.exports = router;

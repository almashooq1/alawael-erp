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

const { requireBranchAccess } = require('../../../middleware/branchScope.middleware');
const {
  effectiveBranchScope,
  enforceEmployeeBranch,
  assertBranchMatch,
} = require('../../../middleware/assertBranchMatch');

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

// W269 — cross-branch isolation. dualMountAuth applies only `authenticate`, so we
// populate req.branchScope here and gate every employee/leave-keyed route below.
// Without this, any authed user could read/update/deactivate ANY employee and
// read/approve ANY leave across branches (IDOR). Each guard returns `true` (after
// sending 403/404/503) when access is denied, `false` when allowed.
router.use(requireBranchAccess);

async function guardEmployeeBranch(req, res, employeeId) {
  try {
    await enforceEmployeeBranch(req, employeeId);
    return false;
  } catch (err) {
    res.status(err.status || 403).json({ success: false, message: err.message });
    return true;
  }
}

async function guardLeaveBranch(req, res, leaveId) {
  try {
    const mongoose = require('mongoose');
    let LeaveRequest;
    try {
      LeaveRequest = mongoose.model('LeaveRequest');
    } catch {
      try {
        require('../../../models/LeaveRequest');
        LeaveRequest = mongoose.model('LeaveRequest');
      } catch {
        res.status(503).json({ success: false, message: 'LeaveRequest model unavailable' });
        return true;
      }
    }
    const lv = await LeaveRequest.findById(leaveId).select('branchId').lean();
    if (!lv) {
      res.status(404).json({ success: false, message: 'leave not found' });
      return true;
    }
    assertBranchMatch(req, lv.branchId, 'leave request');
    return false;
  } catch (err) {
    res.status(err.status || 403).json({ success: false, message: err.message });
    return true;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Employees
// ═══════════════════════════════════════════════════════════════════════════════

/** GET /employees — قائمة الموظفين */
router.get(
  '/employees',
  requireService,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, department, status } = req.query;
    const result = await hr.employee.getAll({
      page: parseInt(page, 10),
      limit: Math.min(parseInt(limit, 10), 100),
      branchId: effectiveBranchScope(req), // W269 — ignore ?branchId spoof for restricted users
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
    // W1178 — restricted callers cannot spoof branchId on create; pin to own branch
    const createScope = effectiveBranchScope(req);
    const employee = await hr.employee.create({
      ...req.body,
      ...(createScope ? { branchId: createScope } : {}),
    });
    res.status(201).json({ success: true, data: employee });
  })
);

/** GET /employees/:id — موظف واحد */
router.get(
  '/employees/:id',
  requireService,
  asyncHandler(async (req, res) => {
    if (await guardEmployeeBranch(req, res, req.params.id)) return; // W269
    const employee = await hr.employee.getById(req.params.id);
    res.json({ success: true, data: employee });
  })
);

/** GET /employees/:id/profile — ملف الموظف الكامل */
router.get(
  '/employees/:id/profile',
  requireService,
  asyncHandler(async (req, res) => {
    if (await guardEmployeeBranch(req, res, req.params.id)) return; // W269
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
    if (await guardEmployeeBranch(req, res, req.params.id)) return; // W269
    const updated = await hr.employee.update(req.params.id, req.body);
    res.json({ success: true, data: updated });
  })
);

/** PATCH /employees/:id/deactivate — إيقاف موظف */
router.patch(
  '/employees/:id/deactivate',
  requireService,
  asyncHandler(async (req, res) => {
    if (await guardEmployeeBranch(req, res, req.params.id)) return; // W269
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
    if (await guardEmployeeBranch(req, res, req.params.employeeId)) return; // W269
    const leaves = await hr.leave.getByEmployee(req.params.employeeId, req.query);
    res.json({ success: true, data: leaves });
  })
);

/** GET /leaves/balance/:employeeId — رصيد الإجازات */
router.get(
  '/leaves/balance/:employeeId',
  requireService,
  asyncHandler(async (req, res) => {
    if (await guardEmployeeBranch(req, res, req.params.employeeId)) return; // W269
    const balance = await hr.leave.getBalance(req.params.employeeId);
    res.json({ success: true, data: balance });
  })
);

/** PATCH /leaves/:id/approve — اعتماد إجازة */
router.patch(
  '/leaves/:id/approve',
  requireService,
  asyncHandler(async (req, res) => {
    if (await guardLeaveBranch(req, res, req.params.id)) return; // W269
    const result = await hr.leave.approve(req.params.id, req.user?._id);
    res.json({ success: true, data: result });
  })
);

/** PATCH /leaves/:id/reject — رفض إجازة */
router.patch(
  '/leaves/:id/reject',
  requireService,
  asyncHandler(async (req, res) => {
    if (await guardLeaveBranch(req, res, req.params.id)) return; // W269
    const result = await hr.leave.reject(req.params.id, req.body.reason, req.user?._id);
    res.json({ success: true, data: result });
  })
);

/** PATCH /leaves/:id/cancel — إلغاء إجازة */
router.patch(
  '/leaves/:id/cancel',
  requireService,
  asyncHandler(async (req, res) => {
    if (await guardLeaveBranch(req, res, req.params.id)) return; // W269
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
    // W1176 — pin employeeId AFTER the spread: a body-carried employeeId must
    // never let a caller check in on behalf of another employee.
    const record = await hr.attendance.checkIn({ ...req.body, employeeId: req.user?._id });
    res.status(201).json({ success: true, data: record });
  })
);

/** POST /attendance/check-out — تسجيل انصراف */
router.post(
  '/attendance/check-out',
  requireService,
  asyncHandler(async (req, res) => {
    // W1176 — same identity pin as check-in.
    const record = await hr.attendance.checkOut({ ...req.body, employeeId: req.user?._id });
    res.json({ success: true, data: record });
  })
);

/** GET /attendance/employee/:employeeId — سجل حضور موظف */
router.get(
  '/attendance/employee/:employeeId',
  requireService,
  asyncHandler(async (req, res) => {
    if (await guardEmployeeBranch(req, res, req.params.employeeId)) return; // W269
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

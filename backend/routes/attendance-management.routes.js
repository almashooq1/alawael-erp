'use strict';

/**
 * Attendance Management Routes — مسارات نظام الحضور والانصراف
 * ==============================================================
 * Base prefix registered in _registry.js as:  /api/v1/attendance-mgmt
 *
 * Endpoints:
 *  GET    /dashboard                       — KPI snapshot
 *  POST   /check-in                        — Employee check-in
 *  POST   /check-out                       — Employee check-out
 *  GET    /today                           — Today's attendance list
 *  GET    /employee/:employeeId/history    — Employee history
 *  GET    /report/monthly                  — Monthly report (all employees)
 *  POST   /manual                          — Admin: manual record
 *  POST   /leave/request                   — Submit leave request
 *  GET    /leave/requests                  — List leave requests
 *  PATCH  /leave/:leaveId/decision         — Approve / reject leave
 *  GET    /analytics                       — Analytics data
 *  GET    /patterns/:employeeId            — Pattern analysis
 *  GET    /export/monthly                  — Export CSV/JSON
 *  GET    /shifts                          — List shifts (reference)
 */

const express = require('express');
const router = express.Router();
const { param, query, body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const AttendanceMgmt = require('../services/attendanceManagement.service');
const Shift = require('../models/Shift');
const logger = require('../utils/logger');

// ── Auth shorthand ─────────────────────────────────────────────────────────
const auth = authenticateToken;
const adminOrHR = [authenticateToken, authorizeRole(['admin', 'hr', 'manager'])];

// ── Validation helpers ─────────────────────────────────────────────────────
const v = {
  objectId: field => param(field).isMongoId().withMessage(`${field} غير صالح`),
  month: query('month').optional().isInt({ min: 1, max: 12 }).toInt(),
  year: query('year').optional().isInt({ min: 2020, max: 2099 }).toInt(),
  page: query('page').optional().isInt({ min: 1 }).toInt(),
  limit: query('limit').optional().isInt({ min: 1, max: 200 }).toInt(),
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /attendance-mgmt/dashboard
 * Returns today's KPIs, weekly trend, department breakdown.
 */
router.get('/dashboard', auth, async (req, res) => {
  const { branchId, department } = req.query;
  const data = await AttendanceMgmt.getDashboardStats({ branchId, department });
  res.json({ success: true, data });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. CHECK-IN
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /attendance-mgmt/check-in
 * Body: { employeeId?, location: {lat, lng}, device?, notes?, source? }
 * If employeeId omitted, uses req.user.employeeId (self check-in).
 */
router.post(
  '/check-in',
  auth,
  [
    body('location.lat').optional().isFloat({ min: -90, max: 90 }),
    body('location.lng').optional().isFloat({ min: -180, max: 180 }),
    body('source').optional().isIn(['manual', 'biometric', 'mobile', 'zkteco', 'camera', 'system']),
  ],
  validate,
  async (req, res) => {
    const employeeId = req.body.employeeId || req.user?.employeeId;
    if (!employeeId) return res.status(400).json({ success: false, message: 'employeeId مطلوب' });

    const result = await AttendanceMgmt.checkIn(employeeId, {
      location: req.body.location,
      device: req.body.device,
      source: req.body.source || 'manual',
      notes: req.body.notes,
      recordedBy: req.user?._id,
      department: req.body.department,
    });

    const code = result.success ? 200 : 409;
    res.status(code).json(result);
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 3. CHECK-OUT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /attendance-mgmt/check-out
 */
router.post(
  '/check-out',
  auth,
  [body('notes').optional().isString().isLength({ max: 500 })],
  validate,
  async (req, res) => {
    const employeeId = req.body.employeeId || req.user?.employeeId;
    if (!employeeId) return res.status(400).json({ success: false, message: 'employeeId مطلوب' });

    const result = await AttendanceMgmt.checkOut(employeeId, {
      notes: req.body.notes,
    });

    const code = result.success ? 200 : 409;
    res.status(code).json(result);
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 4. TODAY'S LIST
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /attendance-mgmt/today
 * Query: status, department, branchId, page, limit
 */
router.get(
  '/today',
  auth,
  [
    v.page,
    v.limit,
    query('status').optional().isIn(['present', 'absent', 'late', 'half_day', 'leave', 'remote']),
  ],
  validate,
  async (req, res) => {
    const { status, department, branchId, page, limit } = req.query;
    const data = await AttendanceMgmt.getTodayAttendance({
      status,
      department,
      branchId,
      page,
      limit,
    });
    res.json({ success: true, ...data });
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 5. EMPLOYEE HISTORY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /attendance-mgmt/employee/:employeeId/history
 * Query: month, year, fromDate, toDate
 */
router.get(
  '/employee/:employeeId/history',
  auth,
  [v.objectId('employeeId'), v.month, v.year],
  validate,
  async (req, res) => {
    const data = await AttendanceMgmt.getEmployeeHistory(req.params.employeeId, req.query);
    res.json({ success: true, ...data });
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 6. MONTHLY REPORT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /attendance-mgmt/report/monthly
 * Query: month, year, department, branchId, page, limit
 */
router.get(
  '/report/monthly',
  adminOrHR,
  [v.month, v.year, v.page, v.limit],
  validate,
  async (req, res) => {
    const { month, year, department, branchId, page, limit } = req.query;
    const data = await AttendanceMgmt.getMonthlyReport({
      month,
      year,
      department,
      branchId,
      page,
      limit,
    });
    res.json({ success: true, ...data });
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 7. MANUAL RECORD (ADMIN)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /attendance-mgmt/manual
 * Body: { employeeId, date, status, checkIn, checkOut, notes, source }
 */
router.post(
  '/manual',
  adminOrHR,
  [
    body('employeeId').isMongoId().withMessage('employeeId غير صالح'),
    body('date').isISO8601().withMessage('تاريخ غير صالح'),
    body('status')
      .isIn(['present', 'absent', 'late', 'half_day', 'leave', 'remote', 'holiday'])
      .withMessage('حالة غير صالحة'),
    body('checkIn')
      .optional()
      .matches(/^\d{2}:\d{2}$/)
      .withMessage('صيغة وقت الحضور غير صحيحة (HH:MM)'),
    body('checkOut')
      .optional()
      .matches(/^\d{2}:\d{2}$/)
      .withMessage('صيغة وقت الانصراف غير صحيحة (HH:MM)'),
  ],
  validate,
  async (req, res) => {
    const { employeeId, date, status, checkIn, checkOut, notes, source } = req.body;
    const result = await AttendanceMgmt.createManualRecord(employeeId, {
      date,
      status,
      checkIn,
      checkOut,
      notes,
      source,
      recordedBy: req.user?._id,
    });
    res.json(result);
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 8. LEAVE MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /attendance-mgmt/leave/request
 */
router.post(
  '/leave/request',
  auth,
  [
    body('leaveType').notEmpty().withMessage('نوع الإجازة مطلوب'),
    body('startDate').isISO8601().withMessage('تاريخ البداية غير صالح'),
    body('endDate').isISO8601().withMessage('تاريخ النهاية غير صالح'),
    body('reason').notEmpty().isLength({ max: 500 }).withMessage('السبب مطلوب'),
  ],
  validate,
  async (req, res) => {
    const employeeId = req.body.employeeId || req.user?.employeeId;
    if (!employeeId) return res.status(400).json({ success: false, message: 'employeeId مطلوب' });

    const result = await AttendanceMgmt.submitLeaveRequest(employeeId, req.body);
    const code = result.success ? 201 : 409;
    res.status(code).json(result);
  }
);

/**
 * GET /attendance-mgmt/leave/requests
 * Query: status, employeeId, month, year, page, limit
 */
router.get(
  '/leave/requests',
  auth,
  [
    v.month,
    v.year,
    v.page,
    v.limit,
    query('status').optional().isIn(['pending', 'approved', 'rejected']),
  ],
  validate,
  async (req, res) => {
    const { status, employeeId, month, year, page, limit } = req.query;
    const data = await AttendanceMgmt.getLeaveRequests({
      status,
      employeeId,
      month,
      year,
      page,
      limit,
    });
    res.json({ success: true, ...data });
  }
);

/**
 * PATCH /attendance-mgmt/leave/:leaveId/decision
 * Body: { decision: 'approved'|'rejected', managerNotes? }
 */
router.patch(
  '/leave/:leaveId/decision',
  adminOrHR,
  [
    v.objectId('leaveId'),
    body('decision')
      .isIn(['approved', 'rejected'])
      .withMessage('القرار يجب أن يكون approved أو rejected'),
  ],
  validate,
  async (req, res) => {
    const result = await AttendanceMgmt.processLeaveRequest(req.params.leaveId, {
      decision: req.body.decision,
      managerId: req.user?._id,
      managerNotes: req.body.managerNotes,
    });
    res.json(result);
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 9. ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /attendance-mgmt/analytics
 * Query: period (days, default 30), branchId, department
 */
router.get(
  '/analytics',
  adminOrHR,
  [query('period').optional().isInt({ min: 7, max: 365 }).toInt()],
  validate,
  async (req, res) => {
    const { period, branchId, department } = req.query;
    const data = await AttendanceMgmt.getAnalytics({ period, branchId, department });
    res.json({ success: true, data });
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 10. PATTERN ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /attendance-mgmt/patterns/:employeeId
 * Query: months (default 3)
 */
router.get(
  '/patterns/:employeeId',
  adminOrHR,
  [v.objectId('employeeId'), query('months').optional().isInt({ min: 1, max: 12 }).toInt()],
  validate,
  async (req, res) => {
    const { months } = req.query;
    const data = await AttendanceMgmt.analyzePatterns(req.params.employeeId, months || 3);
    res.json({ success: true, data });
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 11. EXPORT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /attendance-mgmt/export/monthly
 * Returns JSON rows ready for CSV conversion by frontend.
 * Query: month, year, department
 */
router.get('/export/monthly', adminOrHR, [v.month, v.year], validate, async (req, res) => {
  const m = req.query.month || new Date().getMonth() + 1;
  const y = req.query.year || new Date().getFullYear();
  const rows = await AttendanceMgmt.exportMonthlyData(m, y, req.query);
  res.json({ success: true, count: rows.length, data: rows });
});

// ─────────────────────────────────────────────────────────────────────────────
// 12. SHIFTS REFERENCE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /attendance-mgmt/shifts
 */
router.get('/shifts', auth, async (req, res) => {
  const shifts = await Shift.find({ isActive: true }).lean();
  res.json({ success: true, data: shifts });
});

// ─────────────────────────────────────────────────────────────────────────────
// 13. LEAVE BALANCE
// ─────────────────────────────────────────────────────────────────────────────

const LeaveBalance = require('../models/HR/LeaveBalance');

/**
 * GET /attendance-mgmt/leave/balance
 * Returns leave balance for the requesting employee (or ?employeeId for HR/Admin).
 * Query: employeeId (admin only), year (default current year)
 */
router.get(
  '/leave/balance',
  auth,
  [
    query('year').optional().isInt({ min: 2020, max: 2050 }).toInt(),
    query('employeeId').optional().isMongoId(),
  ],
  validate,
  async (req, res) => {
    const year = req.query.year || new Date().getFullYear();
    const employeeId =
      req.user?.role === 'admin' || req.user?.role === 'hr'
        ? req.query.employeeId || req.user?.employeeId
        : req.user?.employeeId;

    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'employeeId مطلوب' });
    }

    const balance = await LeaveBalance.getOrCreate(employeeId, year);
    res.json({
      success: true,
      data: {
        year,
        annual_entitled: balance.annual_entitled,
        annual_used: balance.annual_used,
        annual_remaining: balance.annual_remaining,
        sick_used: balance.sick_used,
        hajj_used: balance.hajj_used,
        compensatory_earned: balance.compensatory_earned,
        compensatory_used: balance.compensatory_used,
        compensatory_remaining: balance.compensatory_remaining,
        carried_over_from_last_year: balance.carried_over_from_last_year,
      },
    });
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 14. OVERTIME REQUESTS
// ─────────────────────────────────────────────────────────────────────────────

const OvertimeRequest = require('../models/HR/OvertimeRequest');

/**
 * POST /attendance-mgmt/overtime/request
 * Body: { date, type, startTime, endTime, totalHours, reason }
 */
router.post(
  '/overtime/request',
  auth,
  [
    body('date').isISO8601().withMessage('التاريخ غير صالح'),
    body('type')
      .isIn(['عمل إضافي عادي', 'عمل يوم راحة', 'عمل يوم عطلة رسمية', 'عمل ليلي'])
      .withMessage('نوع العمل الإضافي غير صالح'),
    body('startTime').notEmpty().withMessage('وقت البداية مطلوب'),
    body('endTime').notEmpty().withMessage('وقت النهاية مطلوب'),
    body('totalHours').isFloat({ min: 0.5, max: 12 }).withMessage('عدد الساعات غير صالح'),
    body('reason').notEmpty().isLength({ max: 500 }).withMessage('السبب مطلوب'),
  ],
  validate,
  async (req, res) => {
    const employeeId = req.body.employeeId || req.user?.employeeId;
    if (!employeeId) return res.status(400).json({ success: false, message: 'employeeId مطلوب' });

    const requestNumber = `OT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const overtime = await OvertimeRequest.create({
      requestNumber,
      employeeId,
      date: req.body.date,
      type: req.body.type,
      startTime: req.body.startTime,
      endTime: req.body.endTime,
      totalHours: req.body.totalHours,
      reason: req.body.reason,
      status: 'مقدم',
    });

    res.status(201).json({
      success: true,
      message: 'تم تقديم طلب العمل الإضافي بنجاح',
      data: overtime,
    });
  }
);

/**
 * GET /attendance-mgmt/overtime/requests
 * Query: status, page, limit
 */
router.get(
  '/overtime/requests',
  auth,
  [
    v.page,
    v.limit,
    query('status')
      .optional()
      .isIn(['مقدم', 'موافقة المدير', 'موافقة الموارد البشرية', 'معتمد', 'مرفوض', 'ملغي']),
  ],
  validate,
  async (req, res) => {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (req.user?.role !== 'admin' && req.user?.role !== 'hr') {
      filter.employeeId = req.user?.employeeId;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [records, total] = await Promise.all([
      OvertimeRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('employeeId', 'name_ar employee_number department')
        .lean(),
      OvertimeRequest.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: records,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  }
);

/**
 * PATCH /attendance-mgmt/overtime/:overtimeId/decision
 * Body: { decision: 'معتمد'|'مرفوض', notes? }
 */
router.patch(
  '/overtime/:overtimeId/decision',
  adminOrHR,
  [
    v.objectId('overtimeId'),
    body('decision').isIn(['معتمد', 'مرفوض']).withMessage('القرار غير صالح'),
  ],
  validate,
  async (req, res) => {
    const ot = await OvertimeRequest.findByIdAndUpdate(
      req.params.overtimeId,
      { status: req.body.decision },
      { new: true }
    );
    if (!ot) return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    res.json({
      success: true,
      message: `تم ${req.body.decision === 'معتمد' ? 'اعتماد' : 'رفض'} طلب العمل الإضافي`,
      data: ot,
    });
  }
);

module.exports = router;

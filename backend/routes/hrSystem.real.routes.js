const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');

/* ── Field whitelists (prevent mass-assignment) ──────────────────────── */
const PERF_REVIEW_FIELDS = [
  'employeeId',
  'period',
  'department',
  'rating',
  'score',
  'strengths',
  'improvements',
  'goals',
  'comments',
  'reviewDate',
];
const LEAVE_FIELDS = ['type', 'startDate', 'endDate', 'reason', 'department', 'attachments'];

function pick(src, fields) {
  const out = {};
  for (const f of fields) if (src[f] !== undefined) out[f] = src[f];
  return out;
}

router.use(authenticate);

// GET /attendance
router.get('/attendance', async (req, res) => {
  try {
    const Attendance = require('../models/HR/Attendance');
    const { page = 1, limit = 20, date } = req.query;
    const filter = {};
    if (date) filter.date = new Date(date);
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      Attendance.find(filter).sort({ createdAt: -1 }).skip(skip).limit(+limit).lean(),
      Attendance.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    logger.error('HR attendance error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب بيانات الحضور' });
  }
});

// GET /payroll — restricted to HR/finance/admin roles with minimal projection
router.get('/payroll', authorize(['admin', 'hr_manager', 'finance']), async (req, res) => {
  try {
    const Payroll = require('../models/HR/Payroll');
    const { month, year } = req.query;
    const filter = {};
    if (month) filter.month = +month;
    if (year) filter.year = +year;
    const data = await Payroll.find(filter)
      .select('employeeId month year paymentStatus totalGross totalNet attendance createdAt')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data });
  } catch (err) {
    logger.error('HR payroll error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب بيانات الرواتب' });
  }
});

// GET /leaves
router.get('/leaves', async (req, res) => {
  try {
    const Leave = require('../models/HR/Leave');
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const data = await Leave.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data });
  } catch (err) {
    logger.error('HR leaves error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب بيانات الإجازات' });
  }
});

// POST /attendance/checkin
router.post('/attendance/checkin', async (req, res) => {
  try {
    const Attendance = require('../models/HR/Attendance');
    const record = await Attendance.create({
      ...req.body,
      employeeId: req.user?.id,
      checkIn: new Date(),
    });
    res.status(201).json({ success: true, data: record, message: 'تم تسجيل الحضور' });
  } catch (err) {
    logger.error('HR checkin error:', err);
    res.status(500).json({ success: false, message: 'خطأ في تسجيل الحضور' });
  }
});

// POST /attendance/checkout — IDOR fix: non-admin users can only checkout themselves
router.post('/attendance/checkout', async (req, res) => {
  try {
    const Attendance = require('../models/HR/Attendance');
    const userRole = req.user?.role;
    const isPrivileged = ['admin', 'super_admin', 'hr_manager'].includes(userRole);
    // Only privileged users may check out other employees
    const targetEmpId = isPrivileged && req.body.employeeId ? req.body.employeeId : req.user?.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const record = await Attendance.findOneAndUpdate(
      { employeeId: targetEmpId, checkIn: { $gte: today }, checkOut: null },
      { checkOut: new Date() },
      { new: true, sort: { checkIn: -1 } }
    );
    if (!record) {
      return res
        .status(404)
        .json({ success: false, message: 'لا يوجد سجل حضور مفتوح لهذا الموظف' });
    }
    res.json({ success: true, data: record, message: 'تم تسجيل الانصراف' });
  } catch (err) {
    logger.error('HR checkout error:', err);
    res.status(500).json({ success: false, message: 'خطأ في تسجيل الانصراف' });
  }
});

// GET /performance-reviews
router.get('/performance-reviews', async (req, res) => {
  try {
    const PerformanceEvaluation = require('../models/HR/PerformanceEvaluation');
    const { department, period } = req.query;
    const filter = {};
    if (department) filter.department = department;
    if (period) filter.period = period;
    const data = await PerformanceEvaluation.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data });
  } catch (err) {
    logger.error('HR performance-reviews error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب تقييمات الأداء' });
  }
});

// POST /performance-reviews — require manager+ & whitelist fields
router.post(
  '/performance-reviews',
  authorize(['admin', 'hr_manager', 'manager']),
  async (req, res) => {
    try {
      const PerformanceEvaluation = require('../models/HR/PerformanceEvaluation');
      const fields = pick(req.body, PERF_REVIEW_FIELDS);
      const review = await PerformanceEvaluation.create({ ...fields, evaluator: req.user?.id });
      res.status(201).json({ success: true, data: review, message: 'تم إنشاء تقييم الأداء' });
    } catch (err) {
      logger.error('HR create performance-review error:', err);
      res.status(500).json({ success: false, message: 'خطأ في إنشاء تقييم الأداء' });
    }
  }
);

// POST /leaves
router.post('/leaves', async (req, res) => {
  try {
    const Leave = require('../models/HR/Leave');
    const fields = pick(req.body, LEAVE_FIELDS);
    const leave = await Leave.create({ ...fields, requestedBy: req.user?.id, status: 'pending' });
    res.status(201).json({ success: true, data: leave, message: 'تم تقديم طلب الإجازة' });
  } catch (err) {
    logger.error('HR create leave error:', err);
    res.status(500).json({ success: false, message: 'خطأ في تقديم طلب الإجازة' });
  }
});

module.exports = router;

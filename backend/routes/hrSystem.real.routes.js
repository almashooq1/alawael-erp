/* eslint-disable no-unused-vars */
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

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

// GET /payroll
router.get('/payroll', async (req, res) => {
  try {
    const Payroll = require('../models/HR/Payroll');
    const { month, year } = req.query;
    const filter = {};
    if (month) filter.month = +month;
    if (year) filter.year = +year;
    const data = await Payroll.find(filter).sort({ createdAt: -1 }).lean();
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

// POST /attendance/checkout
router.post('/attendance/checkout', async (req, res) => {
  try {
    const Attendance = require('../models/HR/Attendance');
    const { employeeId } = req.body;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const record = await Attendance.findOneAndUpdate(
      { employeeId: employeeId || req.user?.id, checkIn: { $gte: today }, checkOut: null },
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

// POST /performance-reviews
router.post('/performance-reviews', async (req, res) => {
  try {
    const PerformanceEvaluation = require('../models/HR/PerformanceEvaluation');
    const review = await PerformanceEvaluation.create({ ...req.body, evaluator: req.user?.id });
    res.status(201).json({ success: true, data: review, message: 'تم إنشاء تقييم الأداء' });
  } catch (err) {
    logger.error('HR create performance-review error:', err);
    res.status(500).json({ success: false, message: 'خطأ في إنشاء تقييم الأداء' });
  }
});

// POST /leaves
router.post('/leaves', async (req, res) => {
  try {
    const Leave = require('../models/HR/Leave');
    const leave = await Leave.create({ ...req.body, requestedBy: req.user?.id, status: 'pending' });
    res.status(201).json({ success: true, data: leave, message: 'تم تقديم طلب الإجازة' });
  } catch (err) {
    logger.error('HR create leave error:', err);
    res.status(500).json({ success: false, message: 'خطأ في تقديم طلب الإجازة' });
  }
});

module.exports = router;

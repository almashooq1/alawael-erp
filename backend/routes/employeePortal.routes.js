/* eslint-disable no-unused-vars */
/**
 * Employee Portal Routes
 * مسارات بوابة الموظف
 */
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');
const Employee = require('../models/Employee');

router.use(authenticate);

// ─── Root endpoint — GET /api/employee-portal ────────────────────────────────
router.get('/', async (req, res) => {
  res.json({
    success: true,
    module: 'employee-portal',
    data: {
      userId: req.user.id,
      name: req.user.name || req.user.email,
      role: req.user.role,
    },
    endpoints: [
      'GET  /profile',
      'PUT  /profile',
      'GET  /leaves/balance',
      'POST /leaves',
      'GET  /leaves',
      'GET  /payslips',
      'GET  /documents',
      'POST /requests',
      'GET  /requests',
    ],
    message: 'بوابة الموظف — Employee Portal',
  });
});

// ─── Get profile ─────────────────────────────────────────────────────────────
router.get('/profile', async (req, res) => {
  try {
    const employee = await Employee.findOne({ userId: req.user.id }).lean();
    if (!employee) {
      // Return basic profile from auth user
      return res.json({
        success: true,
        data: { userId: req.user.id, name: req.user.name || req.user.email, email: req.user.email, role: req.user.role },
        message: 'بيانات الملف الشخصي',
      });
    }
    res.json({ success: true, data: employee, message: 'بيانات الملف الشخصي' });
  } catch (error) {
    logger.error('Error fetching profile:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب الملف الشخصي' });
  }
});

// ─── Update profile ──────────────────────────────────────────────────────────
router.put('/profile', async (req, res) => {
  try {
    const allowed = ['phone', 'address', 'emergencyContact', 'avatar'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    const employee = await Employee.findOneAndUpdate({ userId: req.user.id }, updates, { new: true, upsert: false }).lean();
    if (!employee) return res.status(404).json({ success: false, message: 'الموظف غير موجود' });
    res.json({ success: true, data: employee, message: 'تم تحديث الملف الشخصي' });
  } catch (error) {
    logger.error('Error updating profile:', error);
    res.status(500).json({ success: false, message: 'خطأ في تحديث الملف الشخصي' });
  }
});

// ─── Leave balance ───────────────────────────────────────────────────────────
router.get('/leaves/balance', async (req, res) => {
  try {
    // Placeholder — in production, query a LeaveBalance model
    res.json({
      success: true,
      data: {
        annual: { total: 30, used: 12, remaining: 18 },
        sick: { total: 15, used: 3, remaining: 12 },
        personal: { total: 5, used: 1, remaining: 4 },
      },
      message: 'رصيد الإجازات',
    });
  } catch (error) {
    logger.error('Error fetching leave balance:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب رصيد الإجازات' });
  }
});

// ─── Request leave ───────────────────────────────────────────────────────────
router.post('/leaves', async (req, res) => {
  try {
    const { type, startDate, endDate, reason } = req.body;
    if (!type || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'نوع الإجازة وتواريخها مطلوبة' });
    }
    // Store as embedded doc or separate model if exists
    const leaveRequest = {
      _id: Date.now().toString(36),
      employeeId: req.user.id, type, startDate, endDate, reason,
      status: 'pending', requestedAt: new Date(),
    };
    res.status(201).json({ success: true, data: leaveRequest, message: 'تم تقديم طلب الإجازة' });
  } catch (error) {
    logger.error('Error requesting leave:', error);
    res.status(500).json({ success: false, message: 'خطأ في تقديم طلب الإجازة' });
  }
});

// ─── List leaves ─────────────────────────────────────────────────────────────
router.get('/leaves', async (req, res) => {
  try {
    res.json({ success: true, data: [], pagination: { page: 1, limit: 20, total: 0 }, message: 'قائمة الإجازات' });
  } catch (error) {
    logger.error('Error fetching leaves:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب الإجازات' });
  }
});

// ─── Payslips ────────────────────────────────────────────────────────────────
router.get('/payslips', async (req, res) => {
  try {
    // Placeholder — connect to payroll model
    res.json({
      success: true,
      data: [],
      message: 'قسائم الرواتب',
    });
  } catch (error) {
    logger.error('Error fetching payslips:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب قسائم الرواتب' });
  }
});

// ─── Documents ───────────────────────────────────────────────────────────────
router.get('/documents', async (req, res) => {
  try {
    res.json({ success: true, data: [], message: 'المستندات' });
  } catch (error) {
    logger.error('Error fetching documents:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب المستندات' });
  }
});

// ─── Submit request ──────────────────────────────────────────────────────────
router.post('/requests', async (req, res) => {
  try {
    const { type, subject, description } = req.body;
    if (!type || !subject) {
      return res.status(400).json({ success: false, message: 'النوع والموضوع مطلوبان' });
    }
    const request = {
      _id: Date.now().toString(36), employeeId: req.user.id,
      type, subject, description, status: 'pending', submittedAt: new Date(),
    };
    res.status(201).json({ success: true, data: request, message: 'تم تقديم الطلب' });
  } catch (error) {
    logger.error('Error submitting request:', error);
    res.status(500).json({ success: false, message: 'خطأ في تقديم الطلب' });
  }
});

// ─── List requests ───────────────────────────────────────────────────────────
router.get('/requests', async (req, res) => {
  try {
    res.json({ success: true, data: [], pagination: { page: 1, limit: 20, total: 0 }, message: 'قائمة الطلبات' });
  } catch (error) {
    logger.error('Error fetching requests:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب الطلبات' });
  }
});

module.exports = router;

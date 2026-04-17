/**
 * Employee Portal Routes — مسارات بوابة الموظف
 *
 * Full CRUD for employee self-service:
 *  - Profile (view/update)
 *  - Leave balance & requests (real DB queries via LeaveRequest model)
 *  - Payslips (via Payroll model)
 *  - Documents (via Document model)
 *  - Generic requests (via EmployeeRequest model)
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const logger = require('../utils/logger');
const Employee = require('../models/Employee');
const LeaveRequest = require('../models/LeaveRequest');
const Payroll = require('../models/payroll.model');
const Document = require('../models/Document');
const EmployeeRequest = require('../models/EmployeeRequest');
const safeError = require('../utils/safeError');

router.use(authenticate);
router.use(requireBranchAccess);
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
      return res.json({
        success: true,
        data: {
          userId: req.user.id,
          name: req.user.name || req.user.email,
          email: req.user.email,
          role: req.user.role,
        },
        message: 'بيانات الملف الشخصي',
      });
    }
    res.json({ success: true, data: employee, message: 'بيانات الملف الشخصي' });
  } catch (error) {
    safeError(res, error, 'fetching profile');
  }
});

// ─── Update profile ──────────────────────────────────────────────────────────
router.put('/profile', async (req, res) => {
  try {
    const allowed = ['phone', 'address', 'emergencyContact', 'avatar'];
    const updates = {};
    allowed.forEach(f => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });
    const employee = await Employee.findOneAndUpdate({ userId: req.user.id }, updates, {
      new: true,
      upsert: false,
    }).lean();
    if (!employee) {
      return res.status(404).json({ success: false, message: 'الموظف غير موجود' });
    }
    res.json({ success: true, data: employee, message: 'تم تحديث الملف الشخصي' });
  } catch (error) {
    safeError(res, error, 'updating profile');
  }
});

// ─── Leave balance (real DB query) ───────────────────────────────────────────
router.get('/leaves/balance', async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31);

    // Count approved leaves per type for the current year
    const approvedLeaves = await LeaveRequest.aggregate([
      {
        $match: {
          $or: [{ employee: req.user._id }, { employeeId: req.user.id }],
          status: 'approved',
          startDate: { $gte: yearStart, $lte: yearEnd },
        },
      },
      {
        $group: {
          _id: '$leaveType',
          totalDays: { $sum: '$totalDays' },
          count: { $sum: 1 },
        },
      },
    ]);

    // Build balance map — default entitlements (configurable per organization)
    const entitlements = {
      annual: 30,
      sick: 15,
      personal: 5,
      emergency: 5,
      maternity: 70,
      paternity: 3,
    };

    const balance = {};
    for (const [type, total] of Object.entries(entitlements)) {
      const used = approvedLeaves.find(l => l._id === type);
      const usedDays = used ? used.totalDays : 0;
      balance[type] = { total, used: usedDays, remaining: total - usedDays };
    }

    res.json({ success: true, data: balance, message: 'رصيد الإجازات' });
  } catch (error) {
    safeError(res, error, 'fetching leave balance');
  }
});

// ─── Request leave (persisted to DB) ─────────────────────────────────────────
router.post('/leaves', async (req, res) => {
  try {
    const { type, startDate, endDate, reason, isHalfDay, halfDayPeriod } = req.body;
    if (!type || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'نوع الإجازة وتواريخها مطلوبة' });
    }

    // Calculate total days
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffMs = end - start;
    const totalDays = isHalfDay ? 0.5 : Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1);

    // Look up employee info for denormalized fields
    const employee = await Employee.findOne({ userId: req.user.id }).lean();

    const leaveRequest = await LeaveRequest.create({
      employee: req.user._id,
      employeeId: req.user.id,
      employeeName: employee?.name || req.user.name || req.user.email,
      department: employee?.department || 'غير محدد',
      leaveType: type,
      startDate: start,
      endDate: end,
      totalDays,
      isHalfDay: !!isHalfDay,
      halfDayPeriod,
      reason: reason || '',
      status: 'pending',
    });

    res.status(201).json({
      success: true,
      data: leaveRequest,
      message: 'تم تقديم طلب الإجازة بنجاح',
    });
  } catch (error) {
    logger.error('Error requesting leave:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: safeError(error) });
    }
    safeError(res, error, 'employeePortal');
  }
});

// ─── List leaves (real DB query) ─────────────────────────────────────────────
router.get('/leaves', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;
    const statusFilter = req.query.status;

    const filter = {
      $or: [{ employee: req.user._id }, { employeeId: req.user.id }],
    };
    if (statusFilter) filter.status = statusFilter;

    const [leaves, total] = await Promise.all([
      LeaveRequest.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      LeaveRequest.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: leaves,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      message: 'قائمة الإجازات',
    });
  } catch (error) {
    safeError(res, error, 'fetching leaves');
  }
});

// ─── Payslips (real DB query via Payroll model) ──────────────────────────────
router.get('/payslips', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 12, 50);
    const skip = (page - 1) * limit;

    const filter = { employeeId: req.user._id };

    const [payslips, total] = await Promise.all([
      Payroll.find(filter)
        .select(
          'month year baseSalary allowances deductions netSalary grossSalary status paymentDate'
        )
        .sort({ year: -1, month: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Payroll.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: payslips,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      message: 'قسائم الرواتب',
    });
  } catch (error) {
    safeError(res, error, 'fetching payslips');
  }
});

// ─── Documents (real DB query) ───────────────────────────────────────────────
router.get('/documents', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const filter = {
      $or: [
        { uploadedBy: req.user._id },
        { createdBy: req.user._id },
        { 'permissions.userId': req.user._id },
      ],
    };

    const [documents, total] = await Promise.all([
      Document.find(filter)
        .select('fileName originalFileName fileType fileSize category status createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Document.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: documents,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      message: 'المستندات',
    });
  } catch (error) {
    safeError(res, error, 'fetching documents');
  }
});

// ─── Submit request (persisted to DB) ────────────────────────────────────────
router.post('/requests', async (req, res) => {
  try {
    const { type, subject, description, priority, attachments } = req.body;
    if (!type || !subject) {
      return res.status(400).json({ success: false, message: 'النوع والموضوع مطلوبان' });
    }

    const request = await EmployeeRequest.create({
      employeeId: req.user._id,
      type,
      subject,
      description: description || '',
      priority: priority || 'medium',
      attachments: attachments || [],
      status: 'pending',
    });

    res.status(201).json({
      success: true,
      data: request,
      message: 'تم تقديم الطلب بنجاح',
    });
  } catch (error) {
    logger.error('Error submitting request:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: safeError(error) });
    }
    safeError(res, error, 'employeePortal');
  }
});

// ─── List requests (real DB query) ───────────────────────────────────────────
router.get('/requests', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;
    const statusFilter = req.query.status;
    const typeFilter = req.query.type;

    const filter = { employeeId: req.user._id };
    if (statusFilter) filter.status = statusFilter;
    if (typeFilter) filter.type = typeFilter;

    const [requests, total] = await Promise.all([
      EmployeeRequest.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      EmployeeRequest.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: requests,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      message: 'قائمة الطلبات',
    });
  } catch (error) {
    safeError(res, error, 'fetching requests');
  }
});

module.exports = router;

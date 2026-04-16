const express = require('express');
const safeError = require('../utils/safeError');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const { stripUpdateMeta } = require('../utils/sanitize');
const Employee = require('../models/HR/Employee');
const EmploymentContract = require('../models/HR/EmploymentContract');
const PayrollRecord = require('../models/HR/PayrollRecord');
const Leave = require('../models/HR/Leave');
const LeaveBalance = require('../models/HR/LeaveBalance');
const AttendanceRecord = require('../models/HR/AttendanceRecord');
const Certification = require('../models/HR/Certification');
const PerformanceReview = require('../models/HR/PerformanceReview');
const EndOfServiceCalculation = require('../models/HR/EndOfServiceCalculation');
const {
  PayrollCalculationService,
  EndOfServiceService,
  LeaveService,
  HRAlertService,
} = require('../services/hr/HRService');

// ===== الموظفون =====
router.get('/employees', authenticate, requireBranchAccess, authorize('hr.view'), async (req, res) => {
  try {
    const {
      branch_id,
      department,
      specialization,
      status,
      search,
      page = 1,
      limit = 25,
    } = req.query;
    const query = { deleted_at: null };
    if (branch_id) query.branch_id = branch_id;
    if (department) query.department = department;
    if (specialization) query.specialization = specialization;
    if (status) query.status = status;
    if (search) {
      const safe = escapeRegex(String(search));
      query.$or = [
        { full_name_ar: new RegExp(safe, 'i') },
        { employee_number: new RegExp(safe, 'i') },
        { national_id: new RegExp(safe, 'i') },
      ];
    }
    const total = await Employee.countDocuments(query);
    const employees = await Employee.find(query)
      .populate('branch_id', 'name_ar')
      .skip((page - 1) * limit)
      .limit(+limit)
      .sort({ hire_date: -1 })
      .lean();
    res.json({ data: employees, total, page: +page, pages: Math.ceil(total / limit) });
  } catch (err) {
    safeError(res, err);
  }
});

router.post('/employees', authenticate, requireBranchAccess, authorize('hr.create'), async (req, res) => {
  try {
    const employee = await Employee.create({
      ...stripUpdateMeta(req.body),
      created_by: req.user._id,
    });
    res.status(201).json({ data: employee });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/employees/:id', authenticate, requireBranchAccess, authorize('hr.view'), async (req, res) => {
  try {
    const emp = await Employee.findOne({ _id: req.params.id, deleted_at: null }).populate(
      'branch_id'
    );
    if (!emp) return res.status(404).json({ error: 'الموظف غير موجود' });
    res.json({ data: emp });
  } catch (err) {
    safeError(res, err);
  }
});

router.put('/employees/:id', authenticate, requireBranchAccess, authorize('hr.edit'), async (req, res) => {
  try {
    const emp = await Employee.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null },
      stripUpdateMeta(req.body),
      { new: true }
    );
    if (!emp) return res.status(404).json({ error: 'الموظف غير موجود' });
    res.json({ data: emp });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/employees/:id', authenticate, requireBranchAccess, authorize('hr.delete'), async (req, res) => {
  try {
    await Employee.findByIdAndUpdate(req.params.id, { deleted_at: new Date() });
    res.json({ message: 'تم حذف الموظف بنجاح' });
  } catch (err) {
    safeError(res, err);
  }
});

// ===== كشوف الرواتب =====
router.post('/payroll/calculate', authenticate, requireBranchAccess, authorize('hr.payroll'), async (req, res) => {
  try {
    const { employee_id, month, year } = req.body;
    const data = await PayrollCalculationService.calculatePayroll(employee_id, month, year);
    res.json({ data });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post(
  '/payroll/generate-monthly',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize('hr.payroll'),
  async (req, res) => {
    try {
      const { branch_id, month, year } = req.body;
      const results = await PayrollCalculationService.generateMonthlyPayroll(
        branch_id,
        month,
        year
      );
      res.json({ data: results });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

router.get('/payroll', authenticate, requireBranchAccess, authorize('hr.payroll'), async (req, res) => {
  try {
    const { branch_id, month, year, status, page = 1, limit = 25 } = req.query;
    const query = { deleted_at: null };
    if (branch_id) query.branch_id = branch_id;
    if (month) query.month = +month;
    if (year) query.year = +year;
    if (status) query.status = status;
    const total = await PayrollRecord.countDocuments(query);
    const records = await PayrollRecord.find(query)
      .populate('employee_id', 'full_name_ar employee_number')
      .skip((page - 1) * limit)
      .limit(+limit)
      .sort({ year: -1, month: -1 });
    res.json({ data: records, total });
  } catch (err) {
    safeError(res, err);
  }
});

router.patch('/payroll/:id/approve', authenticate, requireBranchAccess, authorize('hr.payroll'), async (req, res) => {
  try {
    const record = await PayrollRecord.findByIdAndUpdate(
      req.params.id,
      { status: 'approved', approved_by: req.user._id, approved_at: new Date() },
      { new: true }
    );
    res.json({ data: record });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ===== الإجازات =====
router.post('/leaves', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { employee_id, leave_type, start_date, end_date, reason } = req.body;
    const leave = await LeaveService.applyLeave(
      employee_id,
      req.user.branch_id,
      leave_type,
      start_date,
      end_date,
      reason,
      req.user._id
    );
    res.status(201).json({ data: leave });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/leaves', authenticate, requireBranchAccess, authorize('hr.view'), async (req, res) => {
  try {
    const { employee_id, leave_type, status, branch_id, page = 1, limit = 25 } = req.query;
    const query = { deleted_at: null };
    if (employee_id) query.employee_id = employee_id;
    if (leave_type) query.leave_type = leave_type;
    if (status) query.status = status;
    if (branch_id) query.branch_id = branch_id;
    const total = await Leave.countDocuments(query);
    const leaves = await Leave.find(query)
      .populate('employee_id', 'full_name_ar employee_number')
      .skip((page - 1) * limit)
      .limit(+limit)
      .sort({ createdAt: -1 });
    res.json({ data: leaves, total });
  } catch (err) {
    safeError(res, err);
  }
});

router.patch(
  '/leaves/:id/approve',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize('hr.approve_leave'),
  async (req, res) => {
    try {
      const leave = await LeaveService.approveLeave(
        req.params.id,
        req.user._id,
        req.body.days_approved
      );
      res.json({ data: leave });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

router.patch(
  '/leaves/:id/reject',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize('hr.approve_leave'),
  async (req, res) => {
    try {
      const leave = await LeaveService.rejectLeave(
        req.params.id,
        req.user._id,
        req.body.rejection_reason
      );
      res.json({ data: leave });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

router.get('/leave-balance/:employee_id', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const year = req.query.year || new Date().getFullYear();
    const balance = await LeaveBalance.getOrCreate(req.params.employee_id, +year);
    res.json({ data: balance });
  } catch (err) {
    safeError(res, err);
  }
});

// ===== الحضور =====
router.post('/attendance', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const record = await AttendanceRecord.create({
      ...stripUpdateMeta(req.body),
      approved_by: req.user._id,
    });
    res.status(201).json({ data: record });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/attendance', authenticate, requireBranchAccess, authorize('hr.view'), async (req, res) => {
  try {
    const { employee_id, branch_id, date_from, date_to, status, page = 1, limit = 50 } = req.query;
    const query = { deleted_at: null };
    if (employee_id) query.employee_id = employee_id;
    if (branch_id) query.branch_id = branch_id;
    if (status) query.status = status;
    if (date_from || date_to) {
      query.date = {};
      if (date_from) query.date.$gte = new Date(date_from);
      if (date_to) query.date.$lte = new Date(date_to);
    }
    const total = await AttendanceRecord.countDocuments(query);
    const records = await AttendanceRecord.find(query)
      .populate('employee_id', 'full_name_ar employee_number')
      .skip((page - 1) * limit)
      .limit(+limit)
      .sort({ date: -1 });
    res.json({ data: records, total });
  } catch (err) {
    safeError(res, err);
  }
});

// ===== نهاية الخدمة =====
router.post('/end-of-service', authenticate, requireBranchAccess, authorize('hr.eos'), async (req, res) => {
  try {
    const { employee_id, termination_date, termination_reason } = req.body;
    const eos = await EndOfServiceService.calculate(
      employee_id,
      termination_date,
      termination_reason
    );
    res.status(201).json({ data: eos });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/end-of-service/:id/approve', authenticate, requireBranchAccess, authorize('hr.eos'), async (req, res) => {
  try {
    const eos = await EndOfServiceCalculation.findByIdAndUpdate(
      req.params.id,
      { status: 'approved', approved_by: req.user._id, approved_at: new Date() },
      { new: true }
    );
    res.json({ data: eos });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ===== التنبيهات =====
router.get('/alerts/expiring-documents', authenticate, requireBranchAccess, authorize('hr.view'), async (req, res) => {
  try {
    const alerts = await HRAlertService.getExpiringDocuments(
      req.query.branch_id,
      +(req.query.days || 30)
    );
    res.json({ data: alerts });
  } catch (err) {
    safeError(res, err);
  }
});

router.get('/alerts/probation-ending', authenticate, requireBranchAccess, authorize('hr.view'), async (req, res) => {
  try {
    const employees = await HRAlertService.getProbationEndingSoon(
      req.query.branch_id,
      +(req.query.days || 7)
    );
    res.json({ data: employees });
  } catch (err) {
    safeError(res, err);
  }
});

module.exports = router;

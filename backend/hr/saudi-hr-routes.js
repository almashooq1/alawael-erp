/* eslint-disable no-unused-vars */
/**
 * Saudi HR Routes - API Endpoints
 * مسارات API لنظام الموارد البشرية السعودي
 */

const express = require('express');
const router = express.Router();
const {
  SaudiHRService,
  Employee,
  LeaveRequest,
  Attendance,
  Payroll,
} = require('./saudi-hr-service');
const authMiddleware = require('../middleware/auth');
const { checkPermission } = require('../permissions/permission-middleware');
const { escapeRegex } = require('../utils/sanitize');
const safeError = require('../utils/safeError');

const hrService = new SaudiHRService();

// ============================================
// EMPLOYEE ROUTES
// ============================================

/**
 * @route   GET /api/hr/employees
 * @desc    Get all employees
 * @access  Private (hr.view)
 */
router.get('/employees', authMiddleware, checkPermission('hr.view'), async (req, res) => {
  try {
    const { page = 1, limit = 20, status, department, nationality, search } = req.query;

    const query = {};
    if (status) query.status = status;
    if (department) query.department = department;
    if (nationality) query.nationality = nationality;
    if (search) {
      query.$or = [
        { firstNameAr: { $regex: escapeRegex(search), $options: 'i' } },
        { lastNameAr: { $regex: escapeRegex(search), $options: 'i' } },
        { nationalId: { $regex: escapeRegex(search) } },
        { employeeId: { $regex: escapeRegex(search) } },
      ];
    }

    const employees = await Employee.find(query)
      .populate('department', 'nameAr nameEn')
      .populate('branch', 'nameAr nameEn')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Employee.countDocuments(query);

    res.json({
      success: true,
      data: employees,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    safeError(res, error, 'saudi-hr');
  }
});

/**
 * @route   GET /api/hr/employees/:id
 * @desc    Get employee by ID
 * @access  Private (hr.view)
 */
router.get('/employees/:id', authMiddleware, checkPermission('hr.view'), async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .populate('department', 'nameAr nameEn')
      .populate('branch', 'nameAr nameEn')
      .populate('createdBy', 'name');

    if (!employee) {
      return res.status(404).json({ success: false, message: 'الموظف غير موجود' });
    }

    res.json({ success: true, data: employee });
  } catch (error) {
    safeError(res, error, 'saudi-hr');
  }
});

/**
 * @route   POST /api/hr/employees
 * @desc    Create new employee
 * @access  Private (hr.create)
 */
router.post('/employees', authMiddleware, checkPermission('hr.create'), async (req, res) => {
  try {
    req.body.createdBy = req.user.id;
    const employee = await hrService.createEmployee(req.body);
    res.status(201).json({ success: true, data: employee, message: 'تم إضافة الموظف بنجاح' });
  } catch (error) {
    res.status(400).json({ success: false, message: 'حدث خطأ داخلي' });
  }
});

/**
 * @route   PUT /api/hr/employees/:id
 * @desc    Update employee
 * @access  Private (hr.edit)
 */
router.put('/employees/:id', authMiddleware, checkPermission('hr.edit'), async (req, res) => {
  try {
    // ── Mass-assignment protection: whitelist allowed fields ──
    const allowedFields = [
      'firstNameAr',
      'lastNameAr',
      'firstNameEn',
      'lastNameEn',
      'email',
      'phone',
      'mobile',
      'department',
      'branch',
      'jobTitle',
      'jobTitleAr',
      'nationality',
      'nationalId',
      'iqamaNumber',
      'gender',
      'dateOfBirth',
      'maritalStatus',
      'address',
      'bankName',
      'iban',
      'salary',
      'allowances',
      'contractType',
      'startDate',
      'endDate',
      'emergencyContact',
      'notes',
    ];
    const updates = { updatedBy: req.user.id };
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!employee) {
      return res.status(404).json({ success: false, message: 'الموظف غير موجود' });
    }

    res.json({ success: true, data: employee, message: 'تم تحديث بيانات الموظف' });
  } catch (error) {
    res.status(400).json({ success: false, message: 'حدث خطأ داخلي' });
  }
});

/**
 * @route   DELETE /api/hr/employees/:id
 * @desc    Terminate employee
 * @access  Private (hr.delete)
 */
router.delete('/employees/:id', authMiddleware, checkPermission('hr.delete'), async (req, res) => {
  try {
    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      { status: 'terminated' },
      { new: true }
    );

    if (!employee) {
      return res.status(404).json({ success: false, message: 'الموظف غير موجود' });
    }

    res.json({ success: true, message: 'تم إنهاء خدمة الموظف' });
  } catch (error) {
    safeError(res, error, 'saudi-hr');
  }
});

// ============================================
// GOSI ROUTES
// ============================================

/**
 * @route   POST /api/hr/employees/:id/gosi/register
 * @desc    Register employee with GOSI
 * @access  Private (hr.gosi)
 */
router.post(
  '/employees/:id/gosi/register',
  authMiddleware,
  checkPermission('hr.gosi'),
  async (req, res) => {
    try {
      const gosiData = await hrService.registerWithGOSI(req.params.id);
      res.json({ success: true, data: gosiData, message: 'تم التسجيل في التأمينات الاجتماعية' });
    } catch (error) {
      res.status(400).json({ success: false, message: 'حدث خطأ داخلي' });
    }
  }
);

/**
 * @route   GET /api/hr/employees/:id/gosi/deduction
 * @desc    Calculate GOSI deduction
 * @access  Private (hr.view)
 */
router.get(
  '/employees/:id/gosi/deduction',
  authMiddleware,
  checkPermission('hr.view'),
  async (req, res) => {
    try {
      const employee = await Employee.findById(req.params.id);
      if (!employee) {
        return res.status(404).json({ success: false, message: 'الموظف غير موجود' });
      }

      const deduction = hrService.calculateGOSIDeduction(employee);
      res.json({ success: true, data: deduction });
    } catch (error) {
      safeError(res, error, 'saudi-hr');
    }
  }
);

// ============================================
// NITAQAT/SAUDIZATION ROUTES
// ============================================

/**
 * @route   GET /api/hr/saudization/:departmentId
 * @desc    Calculate Saudization percentage for department
 * @access  Private (hr.view)
 */
router.get(
  '/saudization/:departmentId',
  authMiddleware,
  checkPermission('hr.view'),
  async (req, res) => {
    try {
      const data = await hrService.calculateSaudization(req.params.departmentId);
      res.json({ success: true, data });
    } catch (error) {
      safeError(res, error, 'saudi-hr');
    }
  }
);

/**
 * @route   GET /api/hr/nitaqat/requirements
 * @desc    Get Nitaqat requirements
 * @access  Private (hr.view)
 */
router.get(
  '/nitaqat/requirements',
  authMiddleware,
  checkPermission('hr.view'),
  async (req, res) => {
    try {
      const { activityType, totalEmployees } = req.query;
      const requirements = hrService.getNitaqatRequirements(activityType, totalEmployees);
      res.json({ success: true, data: requirements });
    } catch (error) {
      safeError(res, error, 'saudi-hr');
    }
  }
);

// ============================================
// LEAVE MANAGEMENT ROUTES
// ============================================

/**
 * @route   GET /api/hr/leave-entitlements
 * @desc    Get Saudi leave entitlements
 * @access  Private
 */
router.get('/leave-entitlements', authMiddleware, async (req, res) => {
  try {
    const entitlements = hrService.getSaudiLeaveEntitlements();
    res.json({ success: true, data: entitlements });
  } catch (error) {
    safeError(res, error, 'saudi-hr');
  }
});

/**
 * @route   GET /api/hr/leave-requests
 * @desc    Get all leave requests
 * @access  Private (hr.view)
 */
router.get('/leave-requests', authMiddleware, checkPermission('hr.view'), async (req, res) => {
  try {
    const { status, employee, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (employee) query.employee = employee;

    const requests = await LeaveRequest.find(query)
      .populate('employee', 'firstNameAr lastNameAr employeeId')
      .populate('approvedBy', 'firstNameAr lastNameAr')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await LeaveRequest.countDocuments(query);

    res.json({
      success: true,
      data: requests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    safeError(res, error, 'saudi-hr');
  }
});

/**
 * @route   POST /api/hr/leave-requests
 * @desc    Submit leave request
 * @access  Private
 */
router.post('/leave-requests', authMiddleware, async (req, res) => {
  try {
    // If employee is submitting for themselves
    if (!req.body.employee && req.user.employee) {
      req.body.employee = req.user.employee;
    }

    const leaveRequest = await hrService.requestLeave(req.body);
    res.status(201).json({ success: true, data: leaveRequest, message: 'تم تقديم طلب الإجازة' });
  } catch (error) {
    res.status(400).json({ success: false, message: 'حدث خطأ داخلي' });
  }
});

/**
 * @route   PUT /api/hr/leave-requests/:id/approve
 * @desc    Approve leave request
 * @access  Private (hr.approve_leave)
 */
router.put(
  '/leave-requests/:id/approve',
  authMiddleware,
  checkPermission('hr.approve_leave'),
  async (req, res) => {
    try {
      const leaveRequest = await hrService.approveLeave(req.params.id, req.user.employee);
      res.json({ success: true, data: leaveRequest, message: 'تم الموافقة على الإجازة' });
    } catch (error) {
      res.status(400).json({ success: false, message: 'حدث خطأ داخلي' });
    }
  }
);

/**
 * @route   PUT /api/hr/leave-requests/:id/reject
 * @desc    Reject leave request
 * @access  Private (hr.approve_leave)
 */
router.put(
  '/leave-requests/:id/reject',
  authMiddleware,
  checkPermission('hr.approve_leave'),
  async (req, res) => {
    try {
      const { rejectionReason } = req.body;
      const leaveRequest = await LeaveRequest.findByIdAndUpdate(
        req.params.id,
        {
          status: 'rejected',
          rejectionReason,
          approvedBy: req.user.employee,
          approvedAt: new Date(),
        },
        { new: true }
      );

      if (!leaveRequest) {
        return res.status(404).json({ success: false, message: 'طلب الإجازة غير موجود' });
      }

      res.json({ success: true, data: leaveRequest, message: 'تم رفض الإجازة' });
    } catch (error) {
      safeError(res, error, 'saudi-hr');
    }
  }
);

// ============================================
// ATTENDANCE ROUTES
// ============================================

/**
 * @route   POST /api/hr/attendance/check-in
 * @desc    Check in
 * @access  Private
 */
router.post('/attendance/check-in', authMiddleware, async (req, res) => {
  try {
    const employeeId = req.body.employeeId || req.user.employee;
    const { location } = req.body;

    const attendance = await hrService.checkIn(employeeId, location);
    res.json({ success: true, data: attendance, message: 'تم تسجيل الحضور' });
  } catch (error) {
    res.status(400).json({ success: false, message: 'حدث خطأ داخلي' });
  }
});

/**
 * @route   POST /api/hr/attendance/check-out
 * @desc    Check out
 * @access  Private
 */
router.post('/attendance/check-out', authMiddleware, async (req, res) => {
  try {
    const employeeId = req.body.employeeId || req.user.employee;
    const { location } = req.body;

    const attendance = await hrService.checkOut(employeeId, location);
    res.json({ success: true, data: attendance, message: 'تم تسجيل الانصراف' });
  } catch (error) {
    res.status(400).json({ success: false, message: 'حدث خطأ داخلي' });
  }
});

/**
 * @route   GET /api/hr/attendance/report
 * @desc    Get attendance report
 * @access  Private (hr.view)
 */
router.get('/attendance/report', authMiddleware, checkPermission('hr.view'), async (req, res) => {
  try {
    const { startDate, endDate, department } = req.query;
    const report = await hrService.getAttendanceReport(startDate, endDate, department);
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'saudi-hr');
  }
});

// ============================================
// PAYROLL ROUTES
// ============================================

/**
 * @route   POST /api/hr/payroll/calculate
 * @desc    Calculate payroll for employee
 * @access  Private (hr.payroll)
 */
router.post(
  '/payroll/calculate',
  authMiddleware,
  checkPermission('hr.payroll'),
  async (req, res) => {
    try {
      const { employeeId, month, year } = req.body;
      const payroll = await hrService.calculatePayroll(employeeId, month, year);
      res.json({ success: true, data: payroll, message: 'تم حساب الراتب' });
    } catch (error) {
      res.status(400).json({ success: false, message: 'حدث خطأ داخلي' });
    }
  }
);

/**
 * @route   POST /api/hr/payroll/process-monthly
 * @desc    Process monthly payroll
 * @access  Private (hr.payroll)
 */
router.post(
  '/payroll/process-monthly',
  authMiddleware,
  checkPermission('hr.payroll'),
  async (req, res) => {
    try {
      const { month, year, departmentId } = req.body;
      const results = await hrService.processMonthlyPayroll(month, year, departmentId);
      res.json({ success: true, data: results, message: 'تم معالجة الرواتب' });
    } catch (error) {
      safeError(res, error, 'saudi-hr');
    }
  }
);

/**
 * @route   GET /api/hr/payroll/wps/:month/:year
 * @desc    Generate WPS file
 * @access  Private (hr.payroll)
 */
router.get(
  '/payroll/wps/:month/:year',
  authMiddleware,
  checkPermission('hr.payroll'),
  async (req, res) => {
    try {
      const { month, year } = req.params;
      const wpsFile = await hrService.generateWPSFile(parseInt(month), parseInt(year));
      res.json({ success: true, data: wpsFile });
    } catch (error) {
      safeError(res, error, 'saudi-hr');
    }
  }
);

/**
 * @route   GET /api/hr/payroll/:employeeId/:month/:year
 * @desc    Get payroll slip
 * @access  Private (hr.view)
 */
router.get(
  '/payroll/:employeeId/:month/:year',
  authMiddleware,
  checkPermission('hr.view'),
  async (req, res) => {
    try {
      const { employeeId, month, year } = req.params;
      const payroll = await Payroll.findOne({
        employee: employeeId,
        month: parseInt(month),
        year: parseInt(year),
      }).populate('employee');

      if (!payroll) {
        return res.status(404).json({ success: false, message: 'كشف الراتب غير موجود' });
      }

      res.json({ success: true, data: payroll });
    } catch (error) {
      safeError(res, error, 'saudi-hr');
    }
  }
);

// ============================================
// REPORTS ROUTES
// ============================================

/**
 * @route   GET /api/hr/statistics
 * @desc    Get employee statistics
 * @access  Private (hr.view)
 */
router.get('/statistics', authMiddleware, checkPermission('hr.view'), async (req, res) => {
  try {
    const stats = await hrService.getEmployeeStatistics();
    res.json({ success: true, data: stats });
  } catch (error) {
    safeError(res, error, 'saudi-hr');
  }
});

module.exports = router;

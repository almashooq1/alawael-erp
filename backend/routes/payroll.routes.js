/**
 * Payroll & Compensation API Routes
 * مسارات API الرواتب والحوافز
 */

const express = require('express');
const mongoose = require('mongoose');
const logger = require('../utils/logger');
const router = express.Router();
const Payroll = require('../models/payroll.model');
const Employee = require('../models/HR/Employee');
const {
  CompensationStructure,
  IndividualIncentive,
  PerformancePenalty,
  BenefitsSummary,
} = require('../models/compensation.model');
const PayrollCalculationService = require('../services/payrollCalculationService');
const PayrollReportService = require('../services/payrollReportService');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const { body, param: _param, validationResult } = require('express-validator');
const safeError = require('../utils/safeError');
const { stripUpdateMeta } = require('../utils/sanitize');

/** Validation error handler */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array().map(e => e.msg) });
  }
  next();
};

/** Payroll rows carry employeeId only — scope via Employee.branch_id (W904). */
function employeeBranchFilter(req) {
  const scope = branchFilter(req);
  return scope.branchId ? { branch_id: scope.branchId } : {};
}

async function payrollEmployeeIdFilter(req) {
  const branchPart = employeeBranchFilter(req);
  if (!branchPart.branch_id) return {};
  const ids = await Employee.find(branchPart).distinct('_id');
  return { employeeId: { $in: ids } };
}

async function assertPayrollEmployeeInScope(
  req,
  employeeId,
  res,
  notFoundMsg = 'الراتب غير موجود'
) {
  if (!employeeId || !mongoose.isValidObjectId(String(employeeId))) {
    return res.status(400).json({ success: false, error: 'معرّف الموظف غير صالح' });
  }
  const branchPart = employeeBranchFilter(req);
  if (!branchPart.branch_id) return null;
  const hit = await Employee.findOne({ _id: employeeId, ...branchPart })
    .select('_id')
    .lean();
  if (!hit) {
    return res.status(404).json({ success: false, error: notFoundMsg });
  }
  return null;
}

async function loadPayrollScoped(req, res, payrollId) {
  if (!mongoose.isValidObjectId(payrollId)) {
    res.status(400).json({ success: false, error: 'معرّف غير صالح' });
    return null;
  }
  const gate = await Payroll.findById(payrollId).select('employeeId').lean();
  if (!gate) {
    res.status(404).json({ success: false, error: 'الراتب غير موجود' });
    return null;
  }
  const denied = await assertPayrollEmployeeInScope(req, gate.employeeId, res);
  if (denied) return null;
  return Payroll.findById(payrollId);
}

async function loadEmployeeOwnedScoped(Model, req, res, id, notFoundMsg) {
  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ success: false, error: 'معرّف غير صالح' });
    return null;
  }
  const gate = await Model.findById(id).select('employeeId').lean();
  if (!gate) {
    res.status(404).json({ success: false, error: notFoundMsg });
    return null;
  }
  const denied = await assertPayrollEmployeeInScope(req, gate.employeeId, res, notFoundMsg);
  if (denied) return null;
  return Model.findById(id);
}

// ============= مسارات الرواتب =============

/**
 * الحصول على كشف الرواتب الشهري
 * GET /api/payroll/monthly/:month/:year
 */

// Root handler — requires auth so smoke test can detect route exists
router.get('/', authenticateToken, (req, res) => {
  res.json({
    message: 'Payroll API',
    endpoints: ['/monthly/:month/:year', '/:payrollId', '/stats/:month/:year', '/compensation/structures'],
  });
});

router.get('/monthly/:month/:year', authenticateToken, requireBranchAccess, async (req, res) => {
  try {
    const { month, year } = req.params;
    const empScope = await payrollEmployeeIdFilter(req);
    let monthlyQuery = Payroll.getMonthlyPayroll(month, parseInt(year));
    if (empScope.employeeId) monthlyQuery = monthlyQuery.where(empScope);
    const payrolls = await monthlyQuery.select(
      'employeeName departmentName baseSalary calculations_totalGross calculations.totalNet payment.status'
    );

    res.json({
      success: true,
      data: payrolls,
      count: payrolls.length,
    });
  } catch (error) {
    const status = error.name === 'ValidationError' || error.name === 'CastError' ? 400 : 500;
    logger.error('Payroll error:', { message: error.message });
    res.status(status).json({
      success: false,
      error: status === 400 ? 'خطأ في البيانات المدخلة' : 'خطأ في الخادم',
    });
  }
});

/**
 * الحصول على تفاصيل راتب الموظف
 * GET /api/payroll/:payrollId
 */
router.get('/:payrollId', authenticateToken, requireBranchAccess, async (req, res) => {
  try {
    const payroll = await loadPayrollScoped(req, res, req.params.payrollId);
    if (!payroll) return;

    res.json({
      success: true,
      data: payroll,
    });
  } catch (error) {
    const status = error.name === 'ValidationError' || error.name === 'CastError' ? 400 : 500;
    logger.error('Payroll error:', { message: error.message });
    res.status(status).json({
      success: false,
      error: status === 400 ? 'خطأ في البيانات المدخلة' : 'خطأ في الخادم',
    });
  }
});

/**
 * الحصول على رواتب الموظف السنوية
 * GET /api/payroll/employee/:employeeId/year/:year
 */
router.get(
  '/employee/:employeeId/year/:year',
  authenticateToken,
  requireBranchAccess,
  async (req, res) => {
    try {
      const { employeeId, year } = req.params;
      const denied = await assertPayrollEmployeeInScope(req, employeeId, res);
      if (denied) return;
      const payrolls = await Payroll.getEmployeePayrolls(employeeId, parseInt(year));

      const summary = {
        employeeId,
        year: parseInt(year),
        payrolls: payrolls,
        totals: {
          totalGross: payrolls.reduce((sum, p) => sum + (p.calculations?.totalGross || 0), 0),
          totalNet: payrolls.reduce((sum, p) => sum + (p.calculations?.totalNet || 0), 0),
          totalDeductions: payrolls.reduce(
            (sum, p) => sum + (p.calculations?.totalDeductions || 0),
            0
          ),
          totalIncentives: payrolls.reduce(
            (sum, p) => sum + (p.calculations?.totalIncentives || 0),
            0
          ),
        },
      };

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      const status = error.name === 'ValidationError' || error.name === 'CastError' ? 400 : 500;
      logger.error('Payroll error:', { message: error.message });
      res.status(status).json({
        success: false,
        error: status === 400 ? 'خطأ في البيانات المدخلة' : 'خطأ في الخادم',
      });
    }
  }
);

/**
 * إنشاء أو تحديث كشف راتب
 * POST /api/payroll/create
 */
router.post(
  '/create',
  authenticateToken,
  requireBranchAccess,
  requireBranchAccess,
  requireRole('hr', 'admin', 'payroll'),
  [
    body('employeeId').isMongoId().withMessage('معرف الموظف غير صالح'),
    body('month').isInt({ min: 1, max: 12 }).withMessage('الشهر يجب أن يكون بين 1-12'),
    body('year').isInt({ min: 2020, max: 2100 }).withMessage('السنة غير صالحة'),
    validate,
  ],
  async (req, res) => {
    try {
      const { employeeId, month, year } = req.body;
      const denied = await assertPayrollEmployeeInScope(req, employeeId, res);
      if (denied) return;

      // حساب الراتب
      const payroll = await PayrollCalculationService.calculateMonthlyPayroll(
        employeeId,
        month,
        year
      );

      // تحديث إذا كان موجوداً
      const existingPayroll = await Payroll.findOne({
        employeeId,
        month,
        year,
      });

      if (existingPayroll) {
        // تحديث البيانات
        Object.assign(existingPayroll, payroll.toObject());
        await existingPayroll.save();
        return res.json({
          success: true,
          data: existingPayroll,
          message: 'تم تحديث الراتب بنجاح',
        });
      }

      // حفظ راتب جديد
      const savedPayroll = await payroll.save();

      res.json({
        success: true,
        data: savedPayroll,
        message: 'تم إنشاء الراتب بنجاح',
      });
    } catch (error) {
      const status = error.name === 'ValidationError' || error.name === 'CastError' ? 400 : 500;
      logger.error('Payroll error:', { message: error.message });
      res.status(status).json({
        success: false,
        error: status === 400 ? 'خطأ في البيانات المدخلة' : 'خطأ في الخادم',
      });
    }
  }
);

/**
 * معالجة رواتب الشهر بالكامل
 * POST /api/payroll/process-monthly
 */
router.post(
  '/process-monthly',
  authenticateToken,
  requireBranchAccess,
  requireBranchAccess,
  requireRole('admin', 'payroll'),
  [
    body('month').isInt({ min: 1, max: 12 }).withMessage('الشهر يجب أن يكون بين 1-12'),
    body('year').isInt({ min: 2020, max: 2100 }).withMessage('السنة غير صالحة'),
    validate,
  ],
  async (req, res) => {
    try {
      const { month, year } = req.body;

      const results = await PayrollCalculationService.processMonthlyPayrollBatch(month, year);

      res.json({
        success: true,
        data: results,
      });
    } catch (error) {
      const status = error.name === 'ValidationError' || error.name === 'CastError' ? 400 : 500;
      logger.error('Payroll error:', { message: error.message });
      res.status(status).json({
        success: false,
        error: status === 400 ? 'خطأ في البيانات المدخلة' : 'خطأ في الخادم',
      });
    }
  }
);

/**
 * إرسال راتب للموافقة
 * PUT /api/payroll/:payrollId/submit-approval
 */
router.put(
  '/:payrollId/submit-approval',
  authenticateToken,
  requireBranchAccess,
  requireBranchAccess,
  requireRole('hr', 'admin'),
  async (req, res) => {
    try {
      const payroll = await loadPayrollScoped(req, res, req.params.payrollId);
      if (!payroll) return;

      payroll.submitForApproval(req.user._id, req.user.name);
      await payroll.save();

      res.json({
        success: true,
        data: payroll,
        message: 'تم إرسال الراتب للموافقة',
      });
    } catch (error) {
      const status = error.name === 'ValidationError' || error.name === 'CastError' ? 400 : 500;
      logger.error('Payroll error:', { message: error.message });
      res.status(status).json({
        success: false,
        error: status === 400 ? 'خطأ في البيانات المدخلة' : 'خطأ في الخادم',
      });
    }
  }
);

/**
 * موافقة على الراتب
 * PUT /api/payroll/:payrollId/approve
 */
router.put(
  '/:payrollId/approve',
  authenticateToken,
  requireBranchAccess,
  requireBranchAccess,
  requireRole('admin', 'director'),
  async (req, res) => {
    try {
      const payroll = await loadPayrollScoped(req, res, req.params.payrollId);
      if (!payroll) return;

      payroll.approve(req.user._id, req.user.name);
      await payroll.save();

      res.json({
        success: true,
        data: payroll,
        message: 'تم الموافقة على الراتب',
      });
    } catch (error) {
      const status = error.name === 'ValidationError' || error.name === 'CastError' ? 400 : 500;
      logger.error('Payroll error:', { message: error.message });
      res.status(status).json({
        success: false,
        error: status === 400 ? 'خطأ في البيانات المدخلة' : 'خطأ في الخادم',
      });
    }
  }
);

/**
 * إعادة احتساب الحضور على كشف راتب قائم
 * PUT /api/payroll/:payrollId/recalculate-attendance
 * يُعيد جلب بيانات الحضور والإجازات من المصدر الحقيقي ويُعيد حساب الخصومات والإضافات.
 */
router.put(
  '/:payrollId/recalculate-attendance',
  authenticateToken,
  requireBranchAccess,
  requireRole('hr', 'admin', 'payroll'),
  async (req, res) => {
    try {
      const payroll = await loadPayrollScoped(req, res, req.params.payrollId);
      if (!payroll) return;
      if (payroll.payment?.status === 'paid') {
        return res.status(409).json({ success: false, error: 'لا يمكن تعديل راتب مدفوع' });
      }

      // جلب بيانات الحضور والإجازات الحالية
      const attendanceData = await PayrollCalculationService.getAttendanceData(
        payroll.employeeId,
        payroll.month,
        payroll.year
      );
      const leaveData = await PayrollCalculationService.getLeaveData(
        payroll.employeeId,
        payroll.month,
        payroll.year
      );

      // إعادة تصفير خصومات الحضور والسجلات المرتبطة
      payroll.penalties.attendance = 0;
      payroll.allowances = (payroll.allowances || []).filter(
        a => a.description == null || !a.description.startsWith('عمل إضافي')
      );

      // إعادة الحساب
      PayrollCalculationService.calculateAttendance(payroll, attendanceData, leaveData);
      payroll.recalculateAll();
      await payroll.save();

      res.json({
        success: true,
        data: payroll,
        message: 'تم إعادة احتساب بيانات الحضور بنجاح',
        attendanceSummary: attendanceData,
      });
    } catch (error) {
      const status = error.name === 'ValidationError' || error.name === 'CastError' ? 400 : 500;
      logger.error('Payroll recalculate error:', { message: error.message });
      res.status(status).json({
        success: false,
        error: status === 400 ? 'خطأ في البيانات المدخلة' : 'خطأ في الخادم',
      });
    }
  }
);

/**
 * معالجة الراتب للدفع
 * PUT /api/payroll/:payrollId/process
 */
router.put(
  '/:payrollId/process',
  authenticateToken,
  requireBranchAccess,
  requireBranchAccess,
  requireRole('admin', 'payroll'),
  async (req, res) => {
    try {
      const payroll = await loadPayrollScoped(req, res, req.params.payrollId);
      if (!payroll) return;

      payroll.process(req.user._id, req.user.name);
      await payroll.save();

      res.json({
        success: true,
        data: payroll,
        message: 'تم معالجة الراتب بنجاح',
      });
    } catch (error) {
      const status = error.name === 'ValidationError' || error.name === 'CastError' ? 400 : 500;
      logger.error('Payroll error:', { message: error.message });
      res.status(status).json({
        success: false,
        error: status === 400 ? 'خطأ في البيانات المدخلة' : 'خطأ في الخادم',
      });
    }
  }
);

/**
 * تحويل الراتب
 * PUT /api/payroll/:payrollId/transfer
 */
router.put(
  '/:payrollId/transfer',
  authenticateToken,
  requireBranchAccess,
  requireBranchAccess,
  requireRole('admin', 'payroll'),
  async (req, res) => {
    try {
      const { transactionRef, bankName } = req.body;
      const payroll = await loadPayrollScoped(req, res, req.params.payrollId);
      if (!payroll) return;

      payroll.transfer(transactionRef, bankName);
      await payroll.save();

      res.json({
        success: true,
        data: payroll,
        message: 'تم تحويل الراتب بنجاح',
      });
    } catch (error) {
      const status = error.name === 'ValidationError' || error.name === 'CastError' ? 400 : 500;
      logger.error('Payroll error:', { message: error.message });
      res.status(status).json({
        success: false,
        error: status === 400 ? 'خطأ في البيانات المدخلة' : 'خطأ في الخادم',
      });
    }
  }
);

/**
 * تأكيد دفع الراتب
 * PUT /api/payroll/:payrollId/confirm-payment
 */
router.put(
  '/:payrollId/confirm-payment',
  authenticateToken,
  requireBranchAccess,
  requireBranchAccess,
  requireRole('admin', 'payroll'),
  async (req, res) => {
    try {
      const payroll = await loadPayrollScoped(req, res, req.params.payrollId);
      if (!payroll) return;

      payroll.confirmPayment();
      await payroll.save();

      res.json({
        success: true,
        data: payroll,
        message: 'تم تأكيد دفع الراتب',
      });
    } catch (error) {
      const status = error.name === 'ValidationError' || error.name === 'CastError' ? 400 : 500;
      logger.error('Payroll error:', { message: error.message });
      res.status(status).json({
        success: false,
        error: status === 400 ? 'خطأ في البيانات المدخلة' : 'خطأ في الخادم',
      });
    }
  }
);

/**
 * الحصول على إحصائيات الرواتب
 * GET /api/payroll/stats/:month/:year
 */
router.get('/stats/:month/:year', authenticateToken, requireBranchAccess, async (req, res) => {
  try {
    const { month, year } = req.params;

    const [monthlyTotal] = await Payroll.getMonthlyTotal(month, parseInt(year));
    const byDepartment = await Payroll.getSalaryByDepartment(month, parseInt(year));
    const stats = await Payroll.getPayrollStatistics(month, parseInt(year));

    res.json({
      success: true,
      data: {
        monthly: monthlyTotal,
        byDepartment,
        statistics: stats[0],
      },
    });
  } catch (error) {
    const status = error.name === 'ValidationError' || error.name === 'CastError' ? 400 : 500;
    logger.error('Payroll error:', { message: error.message });
    res.status(status).json({
      success: false,
      error: status === 400 ? 'خطأ في البيانات المدخلة' : 'خطأ في الخادم',
    });
  }
});

// ============= مسارات الحوافز والمزايا =============

/**
 * الحصول على هياكل الحوافز
 * GET /api/compensation/structures
 */
router.get('/compensation/structures', authenticateToken, requireBranchAccess, async (req, res) => {
  try {
    const structures = await CompensationStructure.find({ isActive: true }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: structures,
      count: structures.length,
    });
  } catch (error) {
    const status = error.name === 'ValidationError' || error.name === 'CastError' ? 400 : 500;
    logger.error('Payroll error:', { message: error.message });
    res.status(status).json({
      success: false,
      error: status === 400 ? 'خطأ في البيانات المدخلة' : 'خطأ في الخادم',
    });
  }
});

/**
 * إنشاء هيكل حوافز
 * POST /api/compensation/structures
 */
router.post(
  '/compensation/structures',
  authenticateToken,
  requireBranchAccess,
  requireBranchAccess,
  requireRole('admin', 'hr'),
  async (req, res) => {
    try {
      const structure = new CompensationStructure(stripUpdateMeta(req.body));
      structure.createdBy = req.user._id;
      await structure.save();

      res.json({
        success: true,
        data: structure,
        message: 'تم إنشاء هيكل الحوافز بنجاح',
      });
    } catch (error) {
      const status = error.name === 'ValidationError' || error.name === 'CastError' ? 400 : 500;
      logger.error('Payroll error:', { message: error.message });
      res.status(status).json({
        success: false,
        error: status === 400 ? 'خطأ في البيانات المدخلة' : 'خطأ في الخادم',
      });
    }
  }
);

/**
 * الحصول على الحوافز الفردية المعلقة
 * GET /api/compensation/incentives/pending
 */
router.get(
  '/compensation/incentives/pending',
  authenticateToken,
  requireBranchAccess,
  async (req, res) => {
    try {
      const incentives = await IndividualIncentive.getPendingIncentives();

      res.json({
        success: true,
        data: incentives,
        count: incentives.length,
      });
    } catch (error) {
      const status = error.name === 'ValidationError' || error.name === 'CastError' ? 400 : 500;
      logger.error('Payroll error:', { message: error.message });
      res.status(status).json({
        success: false,
        error: status === 400 ? 'خطأ في البيانات المدخلة' : 'خطأ في الخادم',
      });
    }
  }
);

/**
 * إنشاء حافز فردي
 * POST /api/compensation/incentives
 */
router.post(
  '/compensation/incentives',
  authenticateToken,
  requireBranchAccess,
  requireBranchAccess,
  requireRole('hr', 'manager', 'admin'),
  async (req, res) => {
    try {
      const incentive = new IndividualIncentive(stripUpdateMeta(req.body));
      incentive.recommendedBy = {
        userId: req.user._id,
        name: req.user.name,
        date: new Date(),
      };
      await incentive.save();

      res.json({
        success: true,
        data: incentive,
        message: 'تم إنشاء الحافز بنجاح',
      });
    } catch (error) {
      const status = error.name === 'ValidationError' || error.name === 'CastError' ? 400 : 500;
      logger.error('Payroll error:', { message: error.message });
      res.status(status).json({
        success: false,
        error: status === 400 ? 'خطأ في البيانات المدخلة' : 'خطأ في الخادم',
      });
    }
  }
);

/**
 * موافقة على الحافز
 * PUT /api/compensation/incentives/:incentiveId/approve
 */
router.put(
  '/compensation/incentives/:incentiveId/approve',
  authenticateToken,
  requireBranchAccess,
  requireBranchAccess,
  requireRole('admin', 'hr'),
  async (req, res) => {
    try {
      const incentive = await loadEmployeeOwnedScoped(
        IndividualIncentive,
        req,
        res,
        req.params.incentiveId,
        'الحافز غير موجود'
      );
      if (!incentive) return;

      incentive.approve(req.user._id, req.user.name);
      await incentive.save();

      res.json({
        success: true,
        data: incentive,
        message: 'تم الموافقة على الحافز',
      });
    } catch (error) {
      const status = error.name === 'ValidationError' || error.name === 'CastError' ? 400 : 500;
      logger.error('Payroll error:', { message: error.message });
      res.status(status).json({
        success: false,
        error: status === 400 ? 'خطأ في البيانات المدخلة' : 'خطأ في الخادم',
      });
    }
  }
);

/**
 * تحديد الحافز كمدفوع
 * PUT /api/compensation/incentives/:incentiveId/mark-paid
 */
router.put(
  '/compensation/incentives/:incentiveId/mark-paid',
  authenticateToken,
  requireBranchAccess,
  requireBranchAccess,
  requireRole('admin', 'payroll'),
  async (req, res) => {
    try {
      const { transactionRef } = req.body;
      const incentive = await loadEmployeeOwnedScoped(
        IndividualIncentive,
        req,
        res,
        req.params.incentiveId,
        'الحافز غير موجود'
      );
      if (!incentive) return;

      incentive.markAsPaid(transactionRef);
      await incentive.save();

      res.json({
        success: true,
        data: incentive,
        message: 'تم تحديد الحافز كمدفوع',
      });
    } catch (error) {
      const status = error.name === 'ValidationError' || error.name === 'CastError' ? 400 : 500;
      logger.error('Payroll error:', { message: error.message });
      res.status(status).json({
        success: false,
        error: status === 400 ? 'خطأ في البيانات المدخلة' : 'خطأ في الخادم',
      });
    }
  }
);

// ============= مسارات العقوبات =============

/**
 * إنشاء عقوبة/تنبيه
 * POST /api/compensation/penalties
 */
router.post(
  '/compensation/penalties',
  authenticateToken,
  requireBranchAccess,
  requireBranchAccess,
  requireRole('manager', 'hr', 'admin'),
  async (req, res) => {
    try {
      const penalty = new PerformancePenalty(stripUpdateMeta(req.body));
      await penalty.save();

      res.json({
        success: true,
        data: penalty,
        message: 'تم تسجيل العقوبة بنجاح',
      });
    } catch (error) {
      const status = error.name === 'ValidationError' || error.name === 'CastError' ? 400 : 500;
      logger.error('Payroll error:', { message: error.message });
      res.status(status).json({
        success: false,
        error: status === 400 ? 'خطأ في البيانات المدخلة' : 'خطأ في الخادم',
      });
    }
  }
);

/**
 * موافقة على العقوبة
 * PUT /api/compensation/penalties/:penaltyId/approve
 */
router.put(
  '/compensation/penalties/:penaltyId/approve',
  authenticateToken,
  requireBranchAccess,
  requireBranchAccess,
  requireRole('admin', 'director'),
  async (req, res) => {
    try {
      const penalty = await loadEmployeeOwnedScoped(
        PerformancePenalty,
        req,
        res,
        req.params.penaltyId,
        'العقوبة غير موجودة'
      );
      if (!penalty) return;

      penalty.approve(req.user._id, req.user.name);
      await penalty.save();

      res.json({
        success: true,
        data: penalty,
        message: 'تم الموافقة على العقوبة',
      });
    } catch (error) {
      const status = error.name === 'ValidationError' || error.name === 'CastError' ? 400 : 500;
      logger.error('Payroll error:', { message: error.message });
      res.status(status).json({
        success: false,
        error: status === 400 ? 'خطأ في البيانات المدخلة' : 'خطأ في الخادم',
      });
    }
  }
);

/**
 * تقديم استئناف على العقوبة
 * POST /api/compensation/penalties/:penaltyId/appeal
 */
router.post(
  '/compensation/penalties/:penaltyId/appeal',
  authenticateToken,
  requireBranchAccess,
  async (req, res) => {
    try {
      const { reason } = req.body;
      const penalty = await loadEmployeeOwnedScoped(
        PerformancePenalty,
        req,
        res,
        req.params.penaltyId,
        'العقوبة غير موجودة'
      );
      if (!penalty) return;

      penalty.appeal(reason);
      await penalty.save();

      res.json({
        success: true,
        data: penalty,
        message: 'تم تقديم الاستئناف بنجاح',
      });
    } catch (error) {
      const status = error.name === 'ValidationError' || error.name === 'CastError' ? 400 : 500;
      logger.error('Payroll error:', { message: error.message });
      res.status(status).json({
        success: false,
        error: status === 400 ? 'خطأ في البيانات المدخلة' : 'خطأ في الخادم',
      });
    }
  }
);

// ============= مسارات كشف المزايا السنوي =============

/**
 * إنشاء كشف المزايا السنوي
 * POST /api/compensation/benefits-summary
 */
router.post(
  '/compensation/benefits-summary',
  authenticateToken,
  requireBranchAccess,
  requireBranchAccess,
  requireRole(['hr', 'admin']),
  async (req, res) => {
    try {
      const summary = new BenefitsSummary(stripUpdateMeta(req.body));
      await summary.save();

      res.json({
        success: true,
        data: summary,
        message: 'تم إنشاء كشف المزايا بنجاح',
      });
    } catch (error) {
      const status = error.name === 'ValidationError' || error.name === 'CastError' ? 400 : 500;
      logger.error('Payroll error:', { message: error.message });
      res.status(status).json({
        success: false,
        error: status === 400 ? 'خطأ في البيانات المدخلة' : 'خطأ في الخادم',
      });
    }
  }
);

/**
 * الحصول على كشف المزايا للموظف
 * GET /api/compensation/benefits-summary/:employeeId/:year
 */
router.get(
  '/compensation/benefits-summary/:employeeId/:year',
  authenticateToken,
  requireBranchAccess,
  requireBranchAccess,
  async (req, res) => {
    try {
      const { employeeId, year } = req.params;
      const summary = await BenefitsSummary.findOne({
        employeeId,
        year,
      });

      if (!summary) {
        return res.status(404).json({
          success: false,
          error: 'كشف المزايا غير موجود',
        });
      }

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      const status = error.name === 'ValidationError' || error.name === 'CastError' ? 400 : 500;
      logger.error('Payroll error:', { message: error.message });
      res.status(status).json({
        success: false,
        error: status === 400 ? 'خطأ في البيانات المدخلة' : 'خطأ في الخادم',
      });
    }
  }
);

// ============= مسارات التقارير المتقدمة =============

/**
 * تقرير حماية الأجور (WPS)
 * GET /api/payroll/reports/wps/:month/:year
 */
router.get(
  '/reports/wps/:month/:year',
  authenticateToken,
  requireBranchAccess,
  async (req, res) => {
    try {
      const { month, year } = req.params;
      const report = await PayrollReportService.generateWPSReport(month, year);

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      safeError(res, error, 'payroll');
    }
  }
);

/**
 * تقرير التأمينات الاجتماعية (GOSI)
 * GET /api/payroll/reports/gosi/:month/:year
 */
router.get(
  '/reports/gosi/:month/:year',
  authenticateToken,
  requireBranchAccess,
  async (req, res) => {
    try {
      const { month, year } = req.params;
      const report = await PayrollReportService.generateGOSIReport(month, year);

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      safeError(res, error, 'payroll');
    }
  }
);

/**
 * ملف التحويل البنكي
 * GET /api/payroll/reports/bank-transfer/:month/:year
 */
router.get(
  '/reports/bank-transfer/:month/:year',
  authenticateToken,
  requireBranchAccess,
  async (req, res) => {
    try {
      const { month, year } = req.params;
      const report = await PayrollReportService.generateBankTransferReport(month, year);

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      safeError(res, error, 'payroll');
    }
  }
);

/**
 * تقرير مقارنة الأقسام
 * GET /api/payroll/reports/department-comparison/:month/:year
 */
router.get(
  '/reports/department-comparison/:month/:year',
  authenticateToken,
  requireBranchAccess,
  async (req, res) => {
    try {
      const { month, year } = req.params;
      const report = await PayrollReportService.generateDepartmentComparisonReport(month, year);

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      safeError(res, error, 'payroll');
    }
  }
);

/**
 * التقرير السنوي للرواتب
 * GET /api/payroll/reports/annual-summary/:year
 */
router.get(
  '/reports/annual-summary/:year',
  authenticateToken,
  requireBranchAccess,
  async (req, res) => {
    try {
      const { year } = req.params;
      const report = await PayrollReportService.generateAnnualSummaryReport(year);

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      safeError(res, error, 'payroll');
    }
  }
);

/**
 * تقرير الفروقات الشهرية
 * GET /api/payroll/reports/variance/:month/:year
 */
router.get(
  '/reports/variance/:month/:year',
  authenticateToken,
  requireBranchAccess,
  async (req, res) => {
    try {
      const { month, year } = req.params;
      const report = await PayrollReportService.generateVarianceReport(month, year);

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      safeError(res, error, 'payroll');
    }
  }
);

/**
 * تقرير تكلفة الموظف
 * GET /api/payroll/reports/employee-cost/:employeeId/:year
 */
router.get(
  '/reports/employee-cost/:employeeId/:year',
  authenticateToken,
  requireBranchAccess,
  async (req, res) => {
    try {
      const { employeeId, year } = req.params;
      const report = await PayrollReportService.generateEmployeeCostReport(employeeId, year);

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      safeError(res, error, 'payroll');
    }
  }
);

/**
 * تقرير الخصومات التفصيلي
 * GET /api/payroll/reports/deductions/:month/:year
 */
router.get(
  '/reports/deductions/:month/:year',
  authenticateToken,
  requireBranchAccess,
  async (req, res) => {
    try {
      const { month, year } = req.params;
      const report = await PayrollReportService.generateDeductionsReport(month, year);

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      safeError(res, error, 'payroll');
    }
  }
);

module.exports = router;

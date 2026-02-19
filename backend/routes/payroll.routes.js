/**
 * Payroll & Compensation API Routes
 * مسارات API الرواتب والحوافز
 */

const express = require('express');
const router = express.Router();
const Payroll = require('../models/payroll.model');
const {
  CompensationStructure,
  IndividualIncentive,
  PerformancePenalty,
  BenefitsSummary,
} = require('../models/compensation.model');
const PayrollCalculationService = require('../services/payrollCalculationService');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');

// ============= مسارات الرواتب =============

/**
 * الحصول على كشف الرواتب الشهري
 * GET /api/payroll/monthly/:month/:year
 */
router.get('/monthly/:month/:year', authMiddleware, async (req, res) => {
  try {
    const { month, year } = req.params;
    const payrolls = await Payroll.getMonthlyPayroll(month, parseInt(year)).select(
      'employeeName departmentName baseSalary calculations_totalGross calculations.totalNet payment.status'
    );

    res.json({
      success: true,
      data: payrolls,
      count: payrolls.length,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * الحصول على تفاصيل راتب الموظف
 * GET /api/payroll/:payrollId
 */
router.get('/:payrollId', authMiddleware, async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.payrollId);
    if (!payroll) {
      return res.status(404).json({
        success: false,
        error: 'الراتب غير موجود',
      });
    }

    res.json({
      success: true,
      data: payroll,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * الحصول على رواتب الموظف السنوية
 * GET /api/payroll/employee/:employeeId/year/:year
 */
router.get('/employee/:employeeId/year/:year', authMiddleware, async (req, res) => {
  try {
    const { employeeId, year } = req.params;
    const payrolls = await Payroll.getEmployeePayrolls(employeeId, parseInt(year));

    const summary = {
      employeeId,
      year: parseInt(year),
      payrolls: payrolls,
      totals: {
        totalGross: payrolls.reduce((sum, p) => sum + (p.calculations?.totalGross || 0), 0),
        totalNet: payrolls.reduce((sum, p) => sum + (p.calculations?.totalNet || 0), 0),
        totalDeductions: payrolls.reduce((sum, p) => sum + (p.calculations?.totalDeductions || 0), 0),
        totalIncentives: payrolls.reduce((sum, p) => sum + (p.calculations?.totalIncentives || 0), 0),
      },
    };

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * إنشاء أو تحديث كشف راتب
 * POST /api/payroll/create
 */
router.post('/create', authMiddleware, roleMiddleware(['hr', 'admin', 'payroll']), async (req, res) => {
  try {
    const { employeeId, month, year } = req.body;

    // حساب الراتب
    const payroll = await PayrollCalculationService.calculateMonthlyPayroll(employeeId, month, year);

    // تحديث إذا كان موجوداً
    let existingPayroll = await Payroll.findOne({
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
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * معالجة رواتب الشهر بالكامل
 * POST /api/payroll/process-monthly
 */
router.post('/process-monthly', authMiddleware, roleMiddleware(['admin', 'payroll']), async (req, res) => {
  try {
    const { month, year } = req.body;

    const results = await PayrollCalculationService.processMonthlyPayrollBatch(month, year);

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * إرسال راتب للموافقة
 * PUT /api/payroll/:payrollId/submit-approval
 */
router.put('/:payrollId/submit-approval', authMiddleware, roleMiddleware(['hr', 'admin']), async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.payrollId);
    if (!payroll) {
      return res.status(404).json({
        success: false,
        error: 'الراتب غير موجود',
      });
    }

    payroll.submitForApproval(req.user._id, req.user.name);
    await payroll.save();

    res.json({
      success: true,
      data: payroll,
      message: 'تم إرسال الراتب للموافقة',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * موافقة على الراتب
 * PUT /api/payroll/:payrollId/approve
 */
router.put('/:payrollId/approve', authMiddleware, roleMiddleware(['admin', 'director']), async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.payrollId);
    if (!payroll) {
      return res.status(404).json({
        success: false,
        error: 'الراتب غير موجود',
      });
    }

    payroll.approve(req.user._id, req.user.name);
    await payroll.save();

    res.json({
      success: true,
      data: payroll,
      message: 'تم الموافقة على الراتب',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * معالجة الراتب للدفع
 * PUT /api/payroll/:payrollId/process
 */
router.put('/:payrollId/process', authMiddleware, roleMiddleware(['Admin', 'payroll']), async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.payrollId);
    if (!payroll) {
      return res.status(404).json({
        success: false,
        error: 'الراتب غير موجود',
      });
    }

    payroll.process(req.user._id, req.user.name);
    await payroll.save();

    res.json({
      success: true,
      data: payroll,
      message: 'تم معالجة الراتب بنجاح',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * تحويل الراتب
 * PUT /api/payroll/:payrollId/transfer
 */
router.put('/:payrollId/transfer', authMiddleware, roleMiddleware(['admin', 'payroll']), async (req, res) => {
  try {
    const { transactionRef, bankName } = req.body;
    const payroll = await Payroll.findById(req.params.payrollId);

    if (!payroll) {
      return res.status(404).json({
        success: false,
        error: 'الراتب غير موجود',
      });
    }

    payroll.transfer(transactionRef, bankName);
    await payroll.save();

    res.json({
      success: true,
      data: payroll,
      message: 'تم تحويل الراتب بنجاح',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * تأكيد دفع الراتب
 * PUT /api/payroll/:payrollId/confirm-payment
 */
router.put('/:payrollId/confirm-payment', authMiddleware, roleMiddleware(['admin', 'payroll']), async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.payrollId);
    if (!payroll) {
      return res.status(404).json({
        success: false,
        error: 'الراتب غير موجود',
      });
    }

    payroll.confirmPayment();
    await payroll.save();

    res.json({
      success: true,
      data: payroll,
      message: 'تم تأكيد دفع الراتب',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * الحصول على إحصائيات الرواتب
 * GET /api/payroll/stats/:month/:year
 */
router.get('/stats/:month/:year', authMiddleware, async (req, res) => {
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
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// ============= مسارات الحوافز والمزايا =============

/**
 * الحصول على هياكل الحوافز
 * GET /api/compensation/structures
 */
router.get('/compensation/structures', authMiddleware, async (req, res) => {
  try {
    const structures = await CompensationStructure.find({ isActive: true }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: structures,
      count: structures.length,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * إنشاء هيكل حوافز
 * POST /api/compensation/structures
 */
router.post(
  '/compensation/structures',
  authMiddleware,
  roleMiddleware(['admin', 'hr']),
  async (req, res) => {
    try {
      const structure = new CompensationStructure(req.body);
      structure.createdBy = req.user._id;
      await structure.save();

      res.json({
        success: true,
        data: structure,
        message: 'تم إنشاء هيكل الحوافز بنجاح',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * الحصول على الحوافز الفردية المعلقة
 * GET /api/compensation/incentives/pending
 */
router.get('/compensation/incentives/pending', authMiddleware, async (req, res) => {
  try {
    const incentives = await IndividualIncentive.getPendingIncentives();

    res.json({
      success: true,
      data: incentives,
      count: incentives.length,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * إنشاء حافز فردي
 * POST /api/compensation/incentives
 */
router.post('/compensation/incentives', authMiddleware, roleMiddleware(['hr', 'manager', 'admin']), async (req, res) => {
  try {
    const incentive = new IndividualIncentive(req.body);
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
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * موافقة على الحافز
 * PUT /api/compensation/incentives/:incentiveId/approve
 */
router.put(
  '/compensation/incentives/:incentiveId/approve',
  authMiddleware,
  roleMiddleware(['admin', 'hr']),
  async (req, res) => {
    try {
      const incentive = await IndividualIncentive.findById(req.params.incentiveId);
      if (!incentive) {
        return res.status(404).json({
          success: false,
          error: 'الحافز غير موجود',
        });
      }

      incentive.approve(req.user._id, req.user.name);
      await incentive.save();

      res.json({
        success: true,
        data: incentive,
        message: 'تم الموافقة على الحافز',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * تحديد الحافز كمدفوع
 * PUT /api/compensation/incentives/:incentiveId/mark-paid
 */
router.put('/compensation/incentives/:incentiveId/mark-paid', authMiddleware, roleMiddleware(['admin', 'payroll']), async (req, res) => {
  try {
    const { transactionRef } = req.body;
    const incentive = await IndividualIncentive.findById(req.params.incentiveId);

    if (!incentive) {
      return res.status(404).json({
        success: false,
        error: 'الحافز غير موجود',
      });
    }

    incentive.markAsPaid(transactionRef);
    await incentive.save();

    res.json({
      success: true,
      data: incentive,
      message: 'تم تحديد الحافز كمدفوع',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// ============= مسارات العقوبات =============

/**
 * إنشاء عقوبة/تنبيه
 * POST /api/compensation/penalties
 */
router.post('/compensation/penalties', authMiddleware, roleMiddleware(['manager', 'hr', 'admin']), async (req, res) => {
  try {
    const penalty = new PerformancePenalty(req.body);
    await penalty.save();

    res.json({
      success: true,
      data: penalty,
      message: 'تم تسجيل العقوبة بنجاح',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * موافقة على العقوبة
 * PUT /api/compensation/penalties/:penaltyId/approve
 */
router.put('/compensation/penalties/:penaltyId/approve', authMiddleware, roleMiddleware(['admin', 'director']), async (req, res) => {
  try {
    const penalty = await PerformancePenalty.findById(req.params.penaltyId);
    if (!penalty) {
      return res.status(404).json({
        success: false,
        error: 'العقوبة غير موجودة',
      });
    }

    penalty.approve(req.user._id, req.user.name);
    await penalty.save();

    res.json({
      success: true,
      data: penalty,
      message: 'تم الموافقة على العقوبة',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * تقديم استئناف على العقوبة
 * POST /api/compensation/penalties/:penaltyId/appeal
 */
router.post('/compensation/penalties/:penaltyId/appeal', authMiddleware, async (req, res) => {
  try {
    const { reason } = req.body;
    const penalty = await PerformancePenalty.findById(req.params.penaltyId);

    if (!penalty) {
      return res.status(404).json({
        success: false,
        error: 'العقوبة غير موجودة',
      });
    }

    penalty.appeal(reason);
    await penalty.save();

    res.json({
      success: true,
      data: penalty,
      message: 'تم تقديم الاستئناف بنجاح',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// ============= مسارات كشف المزايا السنوي =============

/**
 * إنشاء كشف المزايا السنوي
 * POST /api/compensation/benefits-summary
 */
router.post('/compensation/benefits-summary', authMiddleware, roleMiddleware(['hr', 'admin']), async (req, res) => {
  try {
    const summary = new BenefitsSummary(req.body);
    await summary.save();

    res.json({
      success: true,
      data: summary,
      message: 'تم إنشاء كشف المزايا بنجاح',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * الحصول على كشف المزايا للموظف
 * GET /api/compensation/benefits-summary/:employeeId/:year
 */
router.get('/compensation/benefits-summary/:employeeId/:year', authMiddleware, async (req, res) => {
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
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;

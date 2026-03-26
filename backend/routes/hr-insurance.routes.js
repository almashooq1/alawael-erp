/**
 * HR Insurance Routes — مسارات تأمين الموظفين الصحي
 *
 * تكامل شؤون الموظفين مع شركات التأمين السعودية
 *
 * ✅ لوحة معلومات التأمين الصحي
 * ✅ إدارة وثائق التأمين (CRUD)
 * ✅ إدارة المعالين (التابعين)
 * ✅ المطالبات الطبية
 * ✅ التجديد والتنبيهات
 * ✅ التسجيل الجماعي
 * ✅ التقارير والإحصائيات
 * ✅ تكامل الرواتب
 */

const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const { authenticateToken, authorize } = require('../middleware/auth');
const authorizeRole = authorize;
const {
  EmployeeInsurance,
  SAUDI_HEALTH_INSURANCE_COMPANIES,
  COVERAGE_CLASSES,
} = require('../models/EmployeeInsurance');
const { escapeRegex } = require('../utils/sanitize');
const safeError = require('../utils/safeError');

// ═══════════════════════════════════════════════════════════════════════════════
// البيانات المرجعية (Reference Data)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /companies — قائمة شركات التأمين الصحي السعودية
 */
router.get('/companies', authenticateToken, (req, res) => {
  const companies = Object.entries(SAUDI_HEALTH_INSURANCE_COMPANIES).map(([key, val]) => ({
    id: key,
    ...val,
  }));
  res.json({ success: true, data: companies });
});

/**
 * GET /coverage-classes — فئات التغطية (CCHI)
 */
router.get('/coverage-classes', authenticateToken, (req, res) => {
  const classes = Object.entries(COVERAGE_CLASSES).map(([key, val]) => ({
    id: key,
    ...val,
  }));
  res.json({ success: true, data: classes });
});

// ═══════════════════════════════════════════════════════════════════════════════
// الإحصائيات ولوحة المعلومات (Dashboard & Statistics)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /stats — إحصائيات التأمين الصحي الشاملة
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await EmployeeInsurance.getInsuranceStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'خطأ في جلب الإحصائيات', error: safeError(error) });
  }
});

/**
 * GET /expiring — الوثائق المنتهية قريباً
 */
router.get('/expiring', authenticateToken, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const policies = await EmployeeInsurance.getExpiringPolicies(days);
    res.json({ success: true, data: policies, total: policies.length });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'خطأ في جلب الوثائق المنتهية', error: safeError(error) });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// إدارة وثائق التأمين (Policy CRUD)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET / — قائمة وثائق التأمين مع الفلترة والبحث
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      insuranceCompany,
      coverageClass,
      department,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (insuranceCompany) filter.insuranceCompany = insuranceCompany;
    if (coverageClass) filter.coverageClass = coverageClass;
    if (department) filter.department = department;
    if (search) {
      filter.$or = [
        { employeeName: { $regex: escapeRegex(search), $options: 'i' } },
        { employeeNameEn: { $regex: escapeRegex(search), $options: 'i' } },
        { employeeId: { $regex: escapeRegex(search), $options: 'i' } },
        { policyNumber: { $regex: escapeRegex(search), $options: 'i' } },
        { nationalId: { $regex: escapeRegex(search), $options: 'i' } },
        { memberNumber: { $regex: escapeRegex(search), $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [policies, total] = await Promise.all([
      EmployeeInsurance.find(filter)
        .populate('employee', 'firstName lastName employeeId department position')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      EmployeeInsurance.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: policies,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'خطأ في جلب وثائق التأمين', error: safeError(error) });
  }
});

/**
 * GET /:id — تفاصيل وثيقة تأمين
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const policy = await EmployeeInsurance.findById(req.params.id).populate(
      'employee',
      'firstName lastName employeeId department position phone email nationalId'
    );
    if (!policy) {
      return res.status(404).json({ success: false, message: 'وثيقة التأمين غير موجودة' });
    }
    res.json({ success: true, data: policy });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'خطأ في جلب تفاصيل الوثيقة', error: safeError(error) });
  }
});

/**
 * POST / — إنشاء وثيقة تأمين جديدة
 */
router.post(
  '/',
  authenticateToken,
  authorizeRole(['Admin', 'HR', 'admin', 'hr_manager']),
  async (req, res) => {
    try {
      const policy = new EmployeeInsurance({
        ...req.body,
        createdBy: req.user.id,
        activityLog: [
          {
            action: 'POLICY_CREATED',
            actionAr: 'تم إنشاء الوثيقة',
            performedBy: req.user.id,
            performedByName: req.user.name || req.user.email,
            details: { source: 'manual' },
          },
        ],
      });

      await policy.save();
      res
        .status(201)
        .json({ success: true, message: 'تم إنشاء وثيقة التأمين بنجاح', data: policy });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({ success: false, message: 'رقم الوثيقة مكرر' });
      }
      res
        .status(400)
        .json({ success: false, message: 'خطأ في إنشاء الوثيقة', error: safeError(error) });
    }
  }
);

/**
 * PUT /:id — تحديث وثيقة تأمين
 */
router.put(
  '/:id',
  authenticateToken,
  authorizeRole(['Admin', 'HR', 'admin', 'hr_manager']),
  async (req, res) => {
    try {
      const policy = await EmployeeInsurance.findById(req.params.id);
      if (!policy) {
        return res.status(404).json({ success: false, message: 'وثيقة التأمين غير موجودة' });
      }

      Object.assign(policy, req.body);
      policy.updatedBy = req.user.id;
      policy.activityLog.push({
        action: 'POLICY_UPDATED',
        actionAr: 'تم تحديث الوثيقة',
        performedBy: req.user.id,
        performedByName: req.user.name || req.user.email,
        details: { updatedFields: Object.keys(req.body) },
      });

      await policy.save();
      res.json({ success: true, message: 'تم تحديث الوثيقة بنجاح', data: policy });
    } catch (error) {
      res
        .status(400)
        .json({ success: false, message: 'خطأ في تحديث الوثيقة', error: safeError(error) });
    }
  }
);

/**
 * DELETE /:id — حذف/إلغاء وثيقة تأمين
 */
router.delete('/:id', authenticateToken, authorizeRole(['Admin', 'admin']), async (req, res) => {
  try {
    const policy = await EmployeeInsurance.findById(req.params.id);
    if (!policy) {
      return res.status(404).json({ success: false, message: 'وثيقة التأمين غير موجودة' });
    }

    policy.status = 'cancelled';
    policy.activityLog.push({
      action: 'POLICY_CANCELLED',
      actionAr: 'تم إلغاء الوثيقة',
      performedBy: req.user.id,
      performedByName: req.user.name || req.user.email,
    });
    await policy.save();

    res.json({ success: true, message: 'تم إلغاء وثيقة التأمين بنجاح' });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'خطأ في إلغاء الوثيقة', error: safeError(error) });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// إدارة المعالين / التابعين (Dependents Management)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /:id/dependents — إضافة تابع جديد
 */
router.post(
  '/:id/dependents',
  authenticateToken,
  authorizeRole(['Admin', 'HR', 'admin', 'hr_manager']),
  async (req, res) => {
    try {
      const policy = await EmployeeInsurance.findById(req.params.id);
      if (!policy) {
        return res.status(404).json({ success: false, message: 'وثيقة التأمين غير موجودة' });
      }

      policy.dependents.push(req.body);
      policy.activityLog.push({
        action: 'DEPENDENT_ADDED',
        actionAr: 'تم إضافة تابع',
        performedBy: req.user.id,
        performedByName: req.user.name || req.user.email,
        details: { dependentName: req.body.name, relationship: req.body.relationship },
      });

      await policy.save();
      res.status(201).json({
        success: true,
        message: 'تم إضافة التابع بنجاح',
        data: policy.dependents[policy.dependents.length - 1],
      });
    } catch (error) {
      res
        .status(400)
        .json({ success: false, message: 'خطأ في إضافة التابع', error: safeError(error) });
    }
  }
);

/**
 * PUT /:id/dependents/:depId — تحديث بيانات تابع
 */
router.put(
  '/:id/dependents/:depId',
  authenticateToken,
  authorizeRole(['Admin', 'HR', 'admin', 'hr_manager']),
  async (req, res) => {
    try {
      const policy = await EmployeeInsurance.findById(req.params.id);
      if (!policy) {
        return res.status(404).json({ success: false, message: 'وثيقة التأمين غير موجودة' });
      }

      const dep = policy.dependents.id(req.params.depId);
      if (!dep) {
        return res.status(404).json({ success: false, message: 'التابع غير موجود' });
      }

      Object.assign(dep, req.body);
      policy.activityLog.push({
        action: 'DEPENDENT_UPDATED',
        actionAr: 'تم تحديث بيانات تابع',
        performedBy: req.user.id,
        performedByName: req.user.name || req.user.email,
        details: { dependentName: dep.name },
      });

      await policy.save();
      res.json({ success: true, message: 'تم تحديث بيانات التابع', data: dep });
    } catch (error) {
      res
        .status(400)
        .json({ success: false, message: 'خطأ في تحديث التابع', error: safeError(error) });
    }
  }
);

/**
 * DELETE /:id/dependents/:depId — إزالة تابع
 */
router.delete(
  '/:id/dependents/:depId',
  authenticateToken,
  authorizeRole(['Admin', 'HR', 'admin', 'hr_manager']),
  async (req, res) => {
    try {
      const policy = await EmployeeInsurance.findById(req.params.id);
      if (!policy) {
        return res.status(404).json({ success: false, message: 'وثيقة التأمين غير موجودة' });
      }

      const dep = policy.dependents.id(req.params.depId);
      if (!dep) {
        return res.status(404).json({ success: false, message: 'التابع غير موجود' });
      }

      dep.status = 'cancelled';
      dep.removedDate = new Date();
      dep.removalReason = req.body.reason || 'إلغاء يدوي';

      policy.activityLog.push({
        action: 'DEPENDENT_REMOVED',
        actionAr: 'تم إزالة تابع',
        performedBy: req.user.id,
        performedByName: req.user.name || req.user.email,
        details: { dependentName: dep.name, reason: dep.removalReason },
      });

      await policy.save();
      res.json({ success: true, message: 'تم إزالة التابع بنجاح' });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: 'خطأ في إزالة التابع', error: safeError(error) });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// المطالبات الطبية (Medical Claims)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /:id/claims — مطالبات وثيقة تأمين
 */
router.get('/:id/claims', authenticateToken, async (req, res) => {
  try {
    const policy = await EmployeeInsurance.findById(req.params.id).select(
      'claims employeeName policyNumber'
    );
    if (!policy) {
      return res.status(404).json({ success: false, message: 'وثيقة التأمين غير موجودة' });
    }
    res.json({ success: true, data: policy.claims, total: policy.claims.length });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'خطأ في جلب المطالبات', error: safeError(error) });
  }
});

/**
 * POST /:id/claims — تقديم مطالبة طبية جديدة
 */
router.post('/:id/claims', authenticateToken, async (req, res) => {
  try {
    const policy = await EmployeeInsurance.findById(req.params.id);
    if (!policy) {
      return res.status(404).json({ success: false, message: 'وثيقة التأمين غير موجودة' });
    }
    if (policy.status !== 'active') {
      return res
        .status(400)
        .json({ success: false, message: 'الوثيقة غير نشطة — لا يمكن تقديم مطالبة' });
    }

    const claimNumber = `CLM-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const claim = { ...req.body, claimNumber, status: 'submitted', submittedDate: new Date() };

    policy.claims.push(claim);
    policy.activityLog.push({
      action: 'CLAIM_SUBMITTED',
      actionAr: 'تم تقديم مطالبة طبية',
      performedBy: req.user.id,
      performedByName: req.user.name || req.user.email,
      details: { claimNumber, claimType: req.body.claimType, amount: req.body.amounts?.claimed },
    });

    await policy.save();
    res.status(201).json({
      success: true,
      message: 'تم تقديم المطالبة بنجاح',
      data: policy.claims[policy.claims.length - 1],
    });
  } catch (error) {
    res
      .status(400)
      .json({ success: false, message: 'خطأ في تقديم المطالبة', error: safeError(error) });
  }
});

/**
 * PUT /:id/claims/:claimId — تحديث حالة مطالبة
 */
router.put(
  '/:id/claims/:claimId',
  authenticateToken,
  authorizeRole(['Admin', 'HR', 'admin', 'hr_manager']),
  async (req, res) => {
    try {
      const policy = await EmployeeInsurance.findById(req.params.id);
      if (!policy) {
        return res.status(404).json({ success: false, message: 'وثيقة التأمين غير موجودة' });
      }

      const claim = policy.claims.id(req.params.claimId);
      if (!claim) {
        return res.status(404).json({ success: false, message: 'المطالبة غير موجودة' });
      }

      const oldStatus = claim.status;
      Object.assign(claim, req.body);

      if (req.body.status === 'approved' || req.body.status === 'partially_approved') {
        claim.reviewedDate = new Date();
        // Update used amount
        policy.usedAmount = (policy.usedAmount || 0) + (claim.amounts.approved || 0);
      }
      if (req.body.status === 'paid') {
        claim.paidDate = new Date();
      }

      policy.activityLog.push({
        action: 'CLAIM_STATUS_UPDATED',
        actionAr: 'تم تحديث حالة المطالبة',
        performedBy: req.user.id,
        performedByName: req.user.name || req.user.email,
        details: { claimNumber: claim.claimNumber, oldStatus, newStatus: req.body.status },
      });

      await policy.save();
      res.json({ success: true, message: 'تم تحديث المطالبة بنجاح', data: claim });
    } catch (error) {
      res
        .status(400)
        .json({ success: false, message: 'خطأ في تحديث المطالبة', error: safeError(error) });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// التجديد (Renewal)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /:id/renew — تجديد وثيقة تأمين
 */
router.post(
  '/:id/renew',
  authenticateToken,
  authorizeRole(['Admin', 'HR', 'admin', 'hr_manager']),
  async (req, res) => {
    try {
      const policy = await EmployeeInsurance.findById(req.params.id);
      if (!policy) {
        return res.status(404).json({ success: false, message: 'وثيقة التأمين غير موجودة' });
      }

      const { newEndDate, newPremium, newCoverageClass } = req.body;

      // Save renewal history
      policy.renewal.renewalHistory.push({
        fromDate: policy.startDate,
        toDate: policy.endDate,
        premium: policy.premium.totalAnnualPremium,
        renewedAt: new Date(),
        renewedBy: req.user.id,
      });

      // Update policy
      policy.startDate = policy.endDate;
      policy.endDate = new Date(newEndDate);
      if (newPremium) policy.premium.employeePremium = newPremium;
      if (newCoverageClass) policy.coverageClass = newCoverageClass;
      policy.status = 'active';
      policy.usedAmount = 0;
      policy.renewal.renewalStatus = 'completed';

      policy.activityLog.push({
        action: 'POLICY_RENEWED',
        actionAr: 'تم تجديد الوثيقة',
        performedBy: req.user.id,
        performedByName: req.user.name || req.user.email,
        details: { newEndDate, newPremium, newCoverageClass },
      });

      await policy.save();
      res.json({ success: true, message: 'تم تجديد الوثيقة بنجاح', data: policy });
    } catch (error) {
      res
        .status(400)
        .json({ success: false, message: 'خطأ في تجديد الوثيقة', error: safeError(error) });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// التسجيل الجماعي (Bulk Enrollment)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /bulk-enroll — تسجيل مجموعة موظفين
 */
router.post(
  '/bulk-enroll',
  authenticateToken,
  authorizeRole(['Admin', 'admin']),
  async (req, res) => {
    try {
      const {
        employees,
        insuranceCompany,
        coverageClass,
        startDate,
        endDate,
        groupPolicyNumber,
        premium,
      } = req.body;

      if (!employees || !Array.isArray(employees) || employees.length === 0) {
        return res.status(400).json({ success: false, message: 'قائمة الموظفين مطلوبة' });
      }

      const results = { success: [], failed: [] };

      for (const emp of employees) {
        try {
          const policyNum = `POL-${insuranceCompany.toUpperCase()}-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
          const newPolicy = new EmployeeInsurance({
            employee: emp.employeeObjectId,
            employeeId: emp.employeeId,
            employeeName: emp.name,
            department: emp.department,
            position: emp.position,
            nationalId: emp.nationalId,
            insuranceCompany,
            coverageClass: coverageClass || 'B',
            policyNumber: policyNum,
            groupPolicyNumber,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            status: 'active',
            premium: { employeePremium: premium || 0, employerSharePercent: 100 },
            createdBy: req.user.id,
            activityLog: [
              {
                action: 'BULK_ENROLLED',
                actionAr: 'تسجيل جماعي',
                performedBy: req.user.id,
                performedByName: req.user.name || req.user.email,
              },
            ],
          });
          await newPolicy.save();
          results.success.push({ employeeId: emp.employeeId, policyNumber: policyNum });
        } catch (err) {
          results.failed.push({ employeeId: emp.employeeId, error: err.message });
        }
      }

      res.json({
        success: true,
        message: `تم تسجيل ${results.success.length} من ${employees.length} موظف`,
        data: results,
      });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: 'خطأ في التسجيل الجماعي', error: safeError(error) });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// التقارير (Reports)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /reports/summary — تقرير ملخص التأمين الصحي
 */
router.get('/reports/summary', authenticateToken, async (req, res) => {
  try {
    const stats = await EmployeeInsurance.getInsuranceStats();

    const monthlyCost = await EmployeeInsurance.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: { $month: '$startDate' },
          totalPremium: { $sum: '$premium.totalAnnualPremium' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const claimsByType = await EmployeeInsurance.aggregate([
      { $unwind: '$claims' },
      {
        $group: {
          _id: '$claims.claimType',
          count: { $sum: 1 },
          totalClaimed: { $sum: '$claims.amounts.claimed' },
          totalApproved: { $sum: { $ifNull: ['$claims.amounts.approved', 0] } },
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.json({
      success: true,
      data: { ...stats, monthlyCost, claimsByType },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'خطأ في إنشاء التقرير', error: safeError(error) });
  }
});

/**
 * GET /reports/payroll-deductions — تقرير خصومات التأمين من الرواتب
 */
router.get('/reports/payroll-deductions', authenticateToken, async (req, res) => {
  try {
    const { month, year } = req.query;

    const deductions = await EmployeeInsurance.find({ status: 'active' })
      .select(
        'employeeId employeeName department premium.monthlyDeduction premium.employeeShare premium.employerShare'
      )
      .sort({ department: 1, employeeName: 1 });

    const summary = deductions.reduce(
      (acc, d) => {
        acc.totalEmployeeShare += d.premium?.employeeShare || 0;
        acc.totalEmployerShare += d.premium?.employerShare || 0;
        acc.totalMonthlyDeduction += d.premium?.monthlyDeduction || 0;
        return acc;
      },
      { totalEmployeeShare: 0, totalEmployerShare: 0, totalMonthlyDeduction: 0 }
    );

    res.json({
      success: true,
      data: { deductions, summary, period: { month, year } },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'خطأ في تقرير الخصومات', error: safeError(error) });
  }
});

/**
 * GET /employee/:employeeId — وثائق تأمين موظف محدد
 */
router.get('/employee/:employeeId', authenticateToken, async (req, res) => {
  try {
    const policies = await EmployeeInsurance.find({
      $or: [{ employee: req.params.employeeId }, { employeeId: req.params.employeeId }],
    }).sort({ createdAt: -1 });

    res.json({ success: true, data: policies, total: policies.length });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'خطأ في جلب وثائق الموظف', error: safeError(error) });
  }
});

module.exports = router;

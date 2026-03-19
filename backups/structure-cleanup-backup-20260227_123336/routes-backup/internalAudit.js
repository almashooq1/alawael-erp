const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');

// استيراد النماذج
const {
  AnnualAuditPlan,
  SurpriseAudit,
  NonConformanceReport,
  CorrectivePreventiveAction,
  ClosureFollowUp,
} = require('../models/internalAudit');

// ==========================================
// 1. ANNUAL AUDIT PLAN ROUTES - خطط التدقيق السنوية
// ==========================================

// إنشاء خطة تدقيق سنوية جديدة
router.post('/audit-plans', authenticate, authorize('admin', 'audit_manager'), async (req, res) => {
  try {
    const plan = new AnnualAuditPlan({
      ...req.body,
      createdBy: req.user._id,
    });
    await plan.save();
    res.status(201).json({
      success: true,
      message: 'تم إنشاء خطة التدقيق بنجاح',
      data: plan,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء خطة التدقيق',
      error: error.message,
    });
  }
});

// الحصول على جميع خطط التدقيق
router.get('/audit-plans', authenticate, async (req, res) => {
  try {
    const { year, status, page = 1, limit = 10 } = req.query;
    const filter = {};
    if (year) filter.year = year;
    if (status) filter.status = status;

    const plans = await AnnualAuditPlan.find(filter)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdDate: -1 });

    const total = await AnnualAuditPlan.countDocuments(filter);

    res.json({
      success: true,
      data: plans,
      total,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// الحصول على خطة تدقيق محددة
router.get('/audit-plans/:planId', authenticate, async (req, res) => {
  try {
    const plan = await AnnualAuditPlan.findOne({ planId: req.params.planId });
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'خطة التدقيق غير موجودة',
      });
    }
    res.json({ success: true, data: plan });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// تحديث خطة تدقيق
router.put(
  '/audit-plans/:planId',
  authenticate,
  authorize('admin', 'audit_manager'),
  async (req, res) => {
    try {
      const plan = await AnnualAuditPlan.findOneAndUpdate(
        { planId: req.params.planId },
        {
          ...req.body,
          lastModifiedBy: req.user._id,
          lastModifiedDate: new Date(),
        },
        { new: true }
      );
      res.json({
        success: true,
        message: 'تم تحديث خطة التدقيق بنجاح',
        data: plan,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// ==========================================
// 2. SURPRISE AUDIT ROUTES - عمليات التدقيق المفاجئة
// ==========================================

// إنشاء تدقيق مفاجئ
router.post(
  '/surprise-audits',
  authenticate,
  authorize('admin', 'audit_manager'),
  async (req, res) => {
    try {
      const audit = new SurpriseAudit({
        ...req.body,
        createdBy: req.user._id,
      });
      await audit.save();
      res.status(201).json({
        success: true,
        message: 'تم إنشاء عملية التدقيق المفاجئة بنجاح',
        data: audit,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// الحصول على عمليات التدقيق المفاجئة
router.get('/surprise-audits', authenticate, async (req, res) => {
  try {
    const { status, department, page = 1, limit = 10 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (department) filter['auditScope.departmentId'] = department;

    const audits = await SurpriseAudit.find(filter)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdDate: -1 });

    const total = await SurpriseAudit.countDocuments(filter);

    res.json({
      success: true,
      data: audits,
      total,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// الحصول على تفاصيل تدقيق محدد
router.get('/surprise-audits/:auditId', authenticate, async (req, res) => {
  try {
    const audit = await SurpriseAudit.findOne({ auditId: req.params.auditId });
    if (!audit) {
      return res.status(404).json({
        success: false,
        message: 'عملية التدقيق غير موجودة',
      });
    }
    res.json({ success: true, data: audit });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// تحديث حالة التدقيق
router.put(
  '/surprise-audits/:auditId',
  authenticate,
  authorize('admin', 'audit_manager'),
  async (req, res) => {
    try {
      const audit = await SurpriseAudit.findOneAndUpdate(
        { auditId: req.params.auditId },
        {
          ...req.body,
          lastModifiedBy: req.user._id,
          lastModifiedDate: new Date(),
        },
        { new: true }
      );
      res.json({
        success: true,
        message: 'تم تحديث عملية التدقيق بنجاح',
        data: audit,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// إضافة ملاحظات تدقيق
router.post(
  '/surprise-audits/:auditId/observations',
  authenticate,
  authorize('admin', 'audit_manager'),
  async (req, res) => {
    try {
      const audit = await SurpriseAudit.findOneAndUpdate(
        { auditId: req.params.auditId },
        {
          $push: { observations: req.body },
          lastModifiedBy: req.user._id,
          lastModifiedDate: new Date(),
        },
        { new: true }
      );
      res.json({
        success: true,
        message: 'تمت إضافة الملاحظة بنجاح',
        data: audit,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// ==========================================
// 3. NON-CONFORMANCE REPORTS ROUTES - تقارير عدم المطابقة
// ==========================================

// إنشاء تقرير عدم مطابقة
router.post('/non-conformance-reports', authenticate, async (req, res) => {
  try {
    const report = new NonConformanceReport({
      ...req.body,
      reportedBy: req.user._id,
      createdBy: req.user._id,
    });
    await report.save();
    res.status(201).json({
      success: true,
      message: 'تم إنشاء تقرير عدم المطابقة بنجاح',
      data: report,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// الحصول على جميع تقارير عدم المطابقة
router.get('/non-conformance-reports', authenticate, async (req, res) => {
  try {
    const { status, category, department, page = 1, limit = 10 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (category) filter['classification.category'] = category;
    if (department) filter['details.affectedDepartment'] = department;

    const reports = await NonConformanceReport.find(filter)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdDate: -1 });

    const total = await NonConformanceReport.countDocuments(filter);

    res.json({
      success: true,
      data: reports,
      total,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// الحصول على تقرير محدد
router.get('/non-conformance-reports/:ncrId', authenticate, async (req, res) => {
  try {
    const report = await NonConformanceReport.findOne({ ncrId: req.params.ncrId });
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'التقرير غير موجود',
      });
    }
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// تحديث تقرير عدم المطابقة
router.put('/non-conformance-reports/:ncrId', authenticate, async (req, res) => {
  try {
    const report = await NonConformanceReport.findOneAndUpdate(
      { ncrId: req.params.ncrId },
      {
        ...req.body,
        lastModifiedBy: req.user._id,
        lastModifiedDate: new Date(),
      },
      { new: true }
    );
    res.json({
      success: true,
      message: 'تم تحديث التقرير بنجاح',
      data: report,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// تعيين المالك للتقرير
router.put(
  '/non-conformance-reports/:ncrId/assign',
  authenticate,
  authorize('admin', 'audit_manager'),
  async (req, res) => {
    try {
      const report = await NonConformanceReport.findOneAndUpdate(
        { ncrId: req.params.ncrId },
        {
          'ownership.ownerId': req.body.ownerId,
          'ownership.ownerName': req.body.ownerName,
          'ownership.ownerDepartment': req.body.ownerDepartment,
          'ownership.ownerEmail': req.body.ownerEmail,
          'ownership.assignmentDate': new Date(),
          status: 'acknowledged',
          lastModifiedBy: req.user._id,
          lastModifiedDate: new Date(),
        },
        { new: true }
      );
      res.json({
        success: true,
        message: 'تم تعيين المالك بنجاح',
        data: report,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// إغلاق تقرير عدم المطابقة
router.put(
  '/non-conformance-reports/:ncrId/close',
  authenticate,
  authorize('admin', 'audit_manager'),
  async (req, res) => {
    try {
      const report = await NonConformanceReport.findOneAndUpdate(
        { ncrId: req.params.ncrId },
        {
          status: 'closed',
          'closingInfo.closedDate': new Date(),
          'closingInfo.closedBy': req.user._id,
          'closingInfo.verificationMethod': req.body.verificationMethod,
          'closingInfo.closingComments': req.body.comments,
          lastModifiedDate: new Date(),
        },
        { new: true }
      );
      res.json({
        success: true,
        message: 'تم إغلاق التقرير بنجاح',
        data: report,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// ==========================================
// 4. CORRECTIVE/PREVENTIVE ACTIONS ROUTES - الخطط التصحيحية والوقائية
// ==========================================

// إنشاء إجراء تصحيحي أو وقائي
router.post('/corrective-preventive-actions', authenticate, async (req, res) => {
  try {
    const action = new CorrectivePreventiveAction({
      ...req.body,
      createdBy: req.user._id,
    });
    await action.save();
    res.status(201).json({
      success: true,
      message: 'تم إنشاء الإجراء بنجاح',
      data: action,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// الحصول على جميع الإجراءات
router.get('/corrective-preventive-actions', authenticate, async (req, res) => {
  try {
    const { type, status, page = 1, limit = 10 } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (status) filter['implementation.status'] = status;

    const actions = await CorrectivePreventiveAction.find(filter)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdDate: -1 });

    const total = await CorrectivePreventiveAction.countDocuments(filter);

    res.json({
      success: true,
      data: actions,
      total,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// الحصول على إجراء محدد
router.get('/corrective-preventive-actions/:actionId', authenticate, async (req, res) => {
  try {
    const action = await CorrectivePreventiveAction.findOne({ actionId: req.params.actionId });
    if (!action) {
      return res.status(404).json({
        success: false,
        message: 'الإجراء غير موجود',
      });
    }
    res.json({ success: true, data: action });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// تحديث الإجراء
router.put('/corrective-preventive-actions/:actionId', authenticate, async (req, res) => {
  try {
    const action = await CorrectivePreventiveAction.findOneAndUpdate(
      { actionId: req.params.actionId },
      {
        ...req.body,
        lastModifiedBy: req.user._id,
        lastModifiedDate: new Date(),
      },
      { new: true }
    );
    res.json({
      success: true,
      message: 'تم تحديث الإجراء بنجاح',
      data: action,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// تحديث التقدم
router.put('/corrective-preventive-actions/:actionId/progress', authenticate, async (req, res) => {
  try {
    const action = await CorrectivePreventiveAction.findOneAndUpdate(
      { actionId: req.params.actionId },
      {
        'implementation.progressPercentage': req.body.progressPercentage,
        'implementation.status': req.body.status,
        lastModifiedDate: new Date(),
      },
      { new: true }
    );
    res.json({
      success: true,
      message: 'تم تحديث التقدم بنجاح',
      data: action,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// التحقق من الفعالية
router.put(
  '/corrective-preventive-actions/:actionId/verify-effectiveness',
  authenticate,
  authorize('admin', 'audit_manager'),
  async (req, res) => {
    try {
      const action = await CorrectivePreventiveAction.findOneAndUpdate(
        { actionId: req.params.actionId },
        {
          'effectiveness.verificationDate': new Date(),
          'effectiveness.verificationResults': req.body.results,
          'effectiveness.isEffective': req.body.isEffective,
          'effectiveness.effectivenessScore': req.body.score,
          'effectiveness.verificationBy': req.user._id,
          overallStatus: req.body.isEffective ? 'effective' : 'ineffective',
          lastModifiedDate: new Date(),
        },
        { new: true }
      );
      res.json({
        success: true,
        message: 'تم التحقق من الفعالية بنجاح',
        data: action,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// إغلاق الإجراء
router.put(
  '/corrective-preventive-actions/:actionId/close',
  authenticate,
  authorize('admin', 'audit_manager'),
  async (req, res) => {
    try {
      const action = await CorrectivePreventiveAction.findOneAndUpdate(
        { actionId: req.params.actionId },
        {
          'closure.closureDate': new Date(),
          'closure.closedBy': req.user._id,
          'closure.closureComment': req.body.comment,
          overallStatus: 'closed',
          lastModifiedDate: new Date(),
        },
        { new: true }
      );
      res.json({
        success: true,
        message: 'تم إغلاق الإجراء بنجاح',
        data: action,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// ==========================================
// 5. CLOSURE FOLLOW-UP ROUTES - متابعة الإغلاق
// ==========================================

// إنشاء متابعة إغلاق
router.post('/closure-followups', authenticate, async (req, res) => {
  try {
    const followUp = new ClosureFollowUp({
      ...req.body,
      createdBy: req.user._id,
    });
    await followUp.save();
    res.status(201).json({
      success: true,
      message: 'تم إنشاء متابعة الإغلاق بنجاح',
      data: followUp,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// الحصول على متابعات الإغلاق
router.get('/closure-followups', authenticate, async (req, res) => {
  try {
    const { status, linkedType, page = 1, limit = 10 } = req.query;
    const filter = {};
    if (status) filter.statusOverall = status;
    if (linkedType) filter['linkedTo.type'] = linkedType;

    const followUps = await ClosureFollowUp.find(filter)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdDate: -1 });

    const total = await ClosureFollowUp.countDocuments(filter);

    res.json({
      success: true,
      data: followUps,
      total,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// الحصول على متابعة محددة
router.get('/closure-followups/:followUpId', authenticate, async (req, res) => {
  try {
    const followUp = await ClosureFollowUp.findOne({ followUpId: req.params.followUpId });
    if (!followUp) {
      return res.status(404).json({
        success: false,
        message: 'المتابعة غير موجودة',
      });
    }
    res.json({ success: true, data: followUp });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// تحديث متابعة الإغلاق
router.put('/closure-followups/:followUpId', authenticate, async (req, res) => {
  try {
    const followUp = await ClosureFollowUp.findOneAndUpdate(
      { followUpId: req.params.followUpId },
      {
        ...req.body,
        lastModifiedBy: req.user._id,
        lastModifiedDate: new Date(),
      },
      { new: true }
    );
    res.json({
      success: true,
      message: 'تم تحديث المتابعة بنجاح',
      data: followUp,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// التحقق من معايير الإغلاق
router.put(
  '/closure-followups/:followUpId/verify-closure',
  authenticate,
  authorize('admin', 'audit_manager'),
  async (req, res) => {
    try {
      const followUp = await ClosureFollowUp.findOneAndUpdate(
        { followUpId: req.params.followUpId },
        {
          'closureVerification.verificationDate': new Date(),
          'closureVerification.verifiedBy': req.user._id,
          'closureVerification.allCriteriaMet': req.body.allMet,
          'closureVerification.verificationNotes': req.body.notes,
          'followUpInfo.status': req.body.allMet ? 'completed' : 'awaiting-evidence',
          lastModifiedDate: new Date(),
        },
        { new: true }
      );
      res.json({
        success: true,
        message: 'تم التحقق من معايير الإغلاق بنجاح',
        data: followUp,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// الموافقة النهائية والإغلاق
router.put(
  '/closure-followups/:followUpId/final-closure',
  authenticate,
  authorize('admin', 'audit_manager'),
  async (req, res) => {
    try {
      const followUp = await ClosureFollowUp.findOneAndUpdate(
        { followUpId: req.params.followUpId },
        {
          'finalApproval.approvalStatus': req.body.approvalStatus,
          'finalApproval.approvedBy': req.user._id,
          'finalApproval.approvalDate': new Date(),
          'finalApproval.rejectionReason': req.body.rejectionReason,
          'finalClosure.closureDate': req.body.approvalStatus === 'approved' ? new Date() : null,
          'finalClosure.closedBy': req.body.approvalStatus === 'approved' ? req.user._id : null,
          statusOverall: req.body.approvalStatus === 'approved' ? 'closed' : 'pending',
          lastModifiedDate: new Date(),
        },
        { new: true }
      );
      res.json({
        success: true,
        message: 'تم الموافقة والإغلاق بنجاح',
        data: followUp,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// ==========================================
// DASHBOARD AND REPORTS
// ==========================================

// لوحة تحكم التدقيق الداخلي
router.get('/internal-audit-dashboard', authenticate, async (req, res) => {
  try {
    const totalPlans = await AnnualAuditPlan.countDocuments();
    const activePlans = await AnnualAuditPlan.countDocuments({ status: 'active' });

    const totalAudits = await SurpriseAudit.countDocuments();
    const completedAudits = await SurpriseAudit.countDocuments({ status: 'completed' });

    const totalNCRs = await NonConformanceReport.countDocuments();
    const openNCRs = await NonConformanceReport.countDocuments({ status: 'open' });
    const criticalNCRs = await NonConformanceReport.countDocuments({
      'classification.category': 'critical',
    });

    const totalActions = await CorrectivePreventiveAction.countDocuments();
    const completeActions = await CorrectivePreventiveAction.countDocuments({
      'implementation.status': 'completed',
    });

    const totalFollowUps = await ClosureFollowUp.countDocuments();
    const closedFollowUps = await ClosureFollowUp.countDocuments({ statusOverall: 'closed' });

    res.json({
      success: true,
      data: {
        auditPlans: {
          total: totalPlans,
          active: activePlans,
          completionRate: totalPlans > 0 ? ((activePlans / totalPlans) * 100).toFixed(2) : 0,
        },
        surpriseAudits: {
          total: totalAudits,
          completed: completedAudits,
          completionRate: totalAudits > 0 ? ((completedAudits / totalAudits) * 100).toFixed(2) : 0,
        },
        nonConformances: {
          total: totalNCRs,
          open: openNCRs,
          critical: criticalNCRs,
          openRate: totalNCRs > 0 ? ((openNCRs / totalNCRs) * 100).toFixed(2) : 0,
        },
        actions: {
          total: totalActions,
          completed: completeActions,
          completionRate:
            totalActions > 0 ? ((completeActions / totalActions) * 100).toFixed(2) : 0,
        },
        followUps: {
          total: totalFollowUps,
          closed: closedFollowUps,
          closureRate:
            totalFollowUps > 0 ? ((closedFollowUps / totalFollowUps) * 100).toFixed(2) : 0,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// تقرير الامتثال بواسطة القسم
router.get('/reports/compliance-by-department', authenticate, async (req, res) => {
  try {
    const report = await NonConformanceReport.aggregate([
      {
        $group: {
          _id: '$details.affectedDepartment',
          totalNCRs: { $sum: 1 },
          criticalCount: {
            $sum: {
              $cond: [{ $eq: ['$classification.category', 'critical'] }, 1, 0],
            },
          },
          majorCount: {
            $sum: {
              $cond: [{ $eq: ['$classification.category', 'major'] }, 1, 0],
            },
          },
          minorCount: {
            $sum: {
              $cond: [{ $eq: ['$classification.category', 'minor'] }, 1, 0],
            },
          },
        },
      },
      { $sort: { totalNCRs: -1 } },
    ]);

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// تقرير حالة الإجراءات التصحيحية
router.get('/reports/actions-status', authenticate, async (req, res) => {
  try {
    const report = await CorrectivePreventiveAction.aggregate([
      {
        $group: {
          _id: '$implementation.status',
          count: { $sum: 1 },
          avgProgress: { $avg: '$implementation.progressPercentage' },
        },
      },
    ]);

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

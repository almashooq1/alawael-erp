/* eslint-disable no-unused-vars */
/**
 * مسارات تخطيط التعاقب الوظيفي
 * Succession Planning Routes
 */

const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validate');
const SuccessionPlan = require('../models/SuccessionPlan');
const DevelopmentPlan = require('../models/DevelopmentPlan');
const { authenticate: authMiddleware, authorize } = require('../middleware/auth');
const adminOnly = authorize(['admin', 'super_admin', 'manager']);
const logger = require('../utils/logger');

// ═══════════════════════════════════════════════════════════════
//  LIST, STATS & CREATE (frontend-compatible)
// ═══════════════════════════════════════════════════════════════

// GET / — List all succession plans (paginated)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, department, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (department) filter.department = department;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      SuccessionPlan.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      SuccessionPlan.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (error) {
    logger.error('Succession plans list error:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب خطط التعاقب' });
  }
});

// GET /stats — Succession planning statistics
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const [total, byStatus, byRisk, avgReadiness] = await Promise.all([
      SuccessionPlan.countDocuments(),
      SuccessionPlan.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      SuccessionPlan.aggregate([
        { $group: { _id: '$currentHolder.riskLevel', count: { $sum: 1 } } },
      ]),
      SuccessionPlan.aggregate([
        { $unwind: '$successors' },
        { $group: { _id: null, avg: { $avg: '$successors.readinessPercentage' } } },
      ]),
    ]);

    const active = byStatus.find(s => s._id === 'active')?.count || 0;
    const withSuccessors = await SuccessionPlan.countDocuments({
      'successors.0': { $exists: true },
    });

    res.json({
      success: true,
      data: {
        total,
        active,
        withSuccessors,
        coverageRate: total > 0 ? Math.round((withSuccessors / total) * 100) : 0,
        avgReadiness: avgReadiness[0]?.avg ? Math.round(avgReadiness[0].avg) : 0,
        byStatus,
        byRisk,
      },
    });
  } catch (error) {
    logger.error('Succession stats error:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب الإحصائيات' });
  }
});

// GET /reports/top-candidates — Alias for frontend compatibility
router.get('/reports/top-candidates', authMiddleware, async (req, res) => {
  try {
    const plans = await SuccessionPlan.find({ status: { $in: ['active', 'approved'] } }).lean();
    const candidates = [];
    plans.forEach(plan => {
      if (plan.successors && plan.successors.length > 0) {
        const sorted = [...plan.successors].sort(
          (a, b) => (b.readinessPercentage || 0) - (a.readinessPercentage || 0)
        );
        candidates.push({
          position: plan.positionTitle,
          positionId: plan.positionId,
          department: plan.department,
          bestCandidate: sorted[0],
          totalCandidates: sorted.length,
        });
      }
    });
    res.json({ success: true, data: candidates });
  } catch (error) {
    logger.error('Top candidates report error:', error);
    res.status(500).json({ success: false, message: 'خطأ في إنشاء التقرير' });
  }
});

// POST / — Create plan (frontend-compatible alias)
router.post(
  '/',
  authMiddleware,
  adminOnly,
  validate([
    body('positionTitle').trim().notEmpty().withMessage('عنوان المنصب مطلوب'),
    body('department').trim().notEmpty().withMessage('القسم مطلوب'),
    body('requiredCompetencies').optional().isArray().withMessage('الكفاءات يجب أن تكون قائمة'),
  ]),
  async (req, res) => {
    try {
      const plan = new SuccessionPlan({
        ...req.body,
        status: 'draft',
        createdBy: req.userId || (req.user && req.user._id),
      });
      await plan.save();
      res.status(201).json({ success: true, message: 'تم إنشاء خطة التعاقب بنجاح', data: plan });
    } catch (error) {
      logger.error('Succession plan create error:', error);
      res.status(500).json({ success: false, message: 'خطأ في إنشاء خطة التعاقب' });
    }
  }
);

// POST /create — Original create endpoint (kept for backward compatibility)
router.post('/create', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { positionId, positionTitle, department, currentHolder, requiredCompetencies } = req.body;

    const plan = new SuccessionPlan({
      positionId,
      positionTitle,
      department,
      currentHolder,
      requiredCompetencies,
      status: 'draft',
      createdBy: req.userId,
    });

    await plan.save();

    res.status(201).json({
      success: true,
      message: 'تم إنشاء خطة التعاقب بنجاح',
      data: plan,
    });
  } catch (error) {
    logger.error('Succession plan create (legacy) error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء خطة التعاقب',
    });
  }
});

// POST /:planId/candidates — Add candidate (frontend-compatible alias)
router.post('/:planId/candidates', authMiddleware, adminOnly, async (req, res) => {
  try {
    const plan = await SuccessionPlan.findByIdAndUpdate(
      req.params.planId,
      {
        $push: {
          successors: {
            ...req.body,
            assessedBy: req.userId,
            assessmentDate: new Date(),
          },
        },
      },
      { new: true }
    );
    if (!plan) return res.status(404).json({ success: false, message: 'الخطة غير موجودة' });
    res.json({ success: true, message: 'تم إضافة المرشح بنجاح', data: plan });
  } catch (error) {
    logger.error('Add candidate error:', error);
    res.status(500).json({ success: false, message: 'خطأ في إضافة المرشح' });
  }
});

// PUT /:planId/candidates/:candidateId — Update candidate
router.put('/:planId/candidates/:candidateId', authMiddleware, adminOnly, async (req, res) => {
  try {
    const updateFields = {};
    Object.keys(req.body).forEach(key => {
      updateFields[`successors.$[elem].${key}`] = req.body[key];
    });
    const plan = await SuccessionPlan.findByIdAndUpdate(
      req.params.planId,
      { $set: updateFields },
      { arrayFilters: [{ 'elem._id': req.params.candidateId }], new: true }
    );
    if (!plan) return res.status(404).json({ success: false, message: 'الخطة غير موجودة' });
    res.json({ success: true, message: 'تم تحديث المرشح بنجاح', data: plan });
  } catch (error) {
    logger.error('Update candidate error:', error);
    res.status(500).json({ success: false, message: 'خطأ في تحديث المرشح' });
  }
});

// GET /:planId/candidates/:candidateId/development — Get candidate development plan
router.get('/:planId/candidates/:candidateId/development', authMiddleware, async (req, res) => {
  try {
    const devPlan = await DevelopmentPlan.findOne({
      employeeId: req.params.candidateId,
    }).lean();
    if (!devPlan) {
      return res.json({ success: true, data: null, message: 'لا توجد خطة تطوير' });
    }
    res.json({ success: true, data: devPlan });
  } catch (error) {
    logger.error('Get candidate development error:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب خطة التطوير' });
  }
});

// POST /:planId/candidates/:candidateId/readiness — Assess readiness
router.post(
  '/:planId/candidates/:candidateId/readiness',
  authMiddleware,
  adminOnly,
  async (req, res) => {
    try {
      const { readinessLevel, readinessPercentage, assessmentComments } = req.body;
      const plan = await SuccessionPlan.findByIdAndUpdate(
        req.params.planId,
        {
          $set: {
            'successors.$[elem].readinessLevel': readinessLevel,
            'successors.$[elem].readinessPercentage': readinessPercentage,
            'successors.$[elem].assessmentComments': assessmentComments,
            'successors.$[elem].assessedBy': req.userId,
            'successors.$[elem].assessmentDate': new Date(),
          },
        },
        { arrayFilters: [{ 'elem.candidateId': req.params.candidateId }], new: true }
      );
      if (!plan) return res.status(404).json({ success: false, message: 'الخطة غير موجودة' });
      res.json({ success: true, message: 'تم تقييم الجاهزية بنجاح', data: plan });
    } catch (error) {
      logger.error('Readiness assessment error:', error);
      res.status(500).json({ success: false, message: 'خطأ في تقييم الجاهزية' });
    }
  }
);

// PUT /:planId — Update plan
router.put(
  '/:planId',
  authMiddleware,
  adminOnly,
  validate([
    param('planId').isMongoId().withMessage('معرف الخطة غير صالح'),
    body('riskLevel')
      .optional()
      .isIn(['low', 'medium', 'high', 'critical'])
      .withMessage('مستوى المخاطر غير صالح'),
    body('status')
      .optional()
      .isIn(['draft', 'active', 'completed', 'on_hold'])
      .withMessage('حالة الخطة غير صالحة'),
  ]),
  async (req, res) => {
    try {
      const plan = await SuccessionPlan.findByIdAndUpdate(req.params.planId, req.body, {
        new: true,
        runValidators: true,
      });
      if (!plan) return res.status(404).json({ success: false, message: 'الخطة غير موجودة' });
      res.json({ success: true, message: 'تم تحديث خطة التعاقب بنجاح', data: plan });
    } catch (error) {
      logger.error('Succession plan update error:', error);
      res.status(500).json({ success: false, message: 'خطأ في تحديث خطة التعاقب' });
    }
  }
);

// POST /:planId/add-successor — Original add-successor (kept for backward compatibility)
router.post('/:planId/add-successor', authMiddleware, adminOnly, async (req, res) => {
  try {
    const {
      candidateId,
      readinessLevel,
      readinessPercentage,
      keyStrengths,
      developmentNeeds,
      assessmentComments,
    } = req.body;

    const plan = await SuccessionPlan.findByIdAndUpdate(
      req.params.planId,
      {
        $push: {
          successors: {
            candidateId,
            readinessLevel,
            readinessPercentage,
            keyStrengths,
            developmentNeeds,
            assessmentComments,
            assessedBy: req.userId,
            assessmentDate: new Date(),
          },
        },
      },
      { new: true }
    );

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    res.json({
      success: true,
      message: 'تم إضافة مرشح الخلافة بنجاح',
      data: plan,
    });
  } catch (error) {
    logger.error('Add successor (legacy) error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إضافة مرشح الخلافة',
    });
  }
});

// POST - إنشاء خطة تطوير فردية
router.post(
  '/:planId/create-development-plan/:successorId',
  authMiddleware,
  adminOnly,
  async (req, res) => {
    try {
      const { developmentGoals, plannedTrainings, expandedResponsibilities } = req.body;

      const developmentPlan = new DevelopmentPlan({
        employeeId: req.params.successorId,
        developmentGoals,
        plannedTrainings,
        expandedResponsibilities,
        createdBy: req.userId,
      });

      await developmentPlan.save();

      // تحديث خطة التعاقب بالإشارة للخطة التطويرية
      await SuccessionPlan.findByIdAndUpdate(
        req.params.planId,
        {
          $set: {
            'successors.$[elem].developmentPlanId': developmentPlan._id,
          },
        },
        {
          arrayFilters: [{ 'elem.candidateId': req.params.successorId }],
          new: true,
        }
      );

      res.status(201).json({
        success: true,
        message: 'تم إنشاء خطة التطوير بنجاح',
        data: developmentPlan,
      });
    } catch (error) {
      logger.error('Create development plan error:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في إنشاء خطة التطوير',
      });
    }
  }
);

// PUT - تحديث خطة التطوير
router.put('/development-plan/:planId/update', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { developmentGoals, plannedTrainings, expandedResponsibilities, notes } = req.body;

    const plan = await DevelopmentPlan.findByIdAndUpdate(
      req.params.planId,
      {
        developmentGoals,
        plannedTrainings,
        expandedResponsibilities,
        notes,
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    res.json({
      success: true,
      message: 'تم تحديث خطة التطوير بنجاح',
      data: plan,
    });
  } catch (error) {
    logger.error('Update development plan error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث خطة التطوير',
    });
  }
});

// PUT - تحديث حالة الهدف التطويري
router.put(
  '/development-plan/:planId/goal-status/:goalIndex',
  authMiddleware,
  adminOnly,
  async (req, res) => {
    try {
      const { status, completionPercentage } = req.body;

      const plan = await DevelopmentPlan.findByIdAndUpdate(
        req.params.planId,
        {
          $set: {
            [`developmentGoals.${req.params.goalIndex}.status`]: status,
            [`developmentGoals.${req.params.goalIndex}.completionPercentage`]: completionPercentage,
          },
        },
        { new: true }
      );

      if (!plan) {
        return res.status(404).json({ success: false, message: 'Plan not found' });
      }

      res.json({
        success: true,
        message: 'تم تحديث حالة الهدف بنجاح',
        data: plan,
      });
    } catch (error) {
      logger.error('Goal status update error:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في تحديث حالة الهدف',
      });
    }
  }
);

// POST - إضافة برنامج الإعداد القيادي
router.post('/:planId/add-leadership-program', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { programName, provider, startDate, endDate, objectives, participants } = req.body;

    const plan = await SuccessionPlan.findByIdAndUpdate(
      req.params.planId,
      {
        leadershipProgram: {
          programName,
          provider,
          startDate,
          endDate,
          objectives,
          participants,
          status: 'planned',
        },
      },
      { new: true }
    );

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    res.json({
      success: true,
      message: 'تم إضافة برنامج الإعداد القيادي بنجاح',
      data: plan,
    });
  } catch (error) {
    logger.error('Leadership program error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إضافة برنامج الإعداد',
    });
  }
});

// POST - إضافة برنامج التوجيه الفردي (Mentorship)
router.post('/:planId/add-mentorship/:successorId', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { mentorId, startDate, objectives } = req.body;

    const plan = await SuccessionPlan.findByIdAndUpdate(
      req.params.planId,
      {
        mentorshipProgram: {
          mentorId,
          startDate,
          objectives,
          status: 'active',
        },
      },
      { new: true }
    );

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    res.json({
      success: true,
      message: 'تم إضافة برنامج التوجيه بنجاح',
      data: plan,
    });
  } catch (error) {
    logger.error('Mentorship program error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إضافة برنامج التوجيه',
    });
  }
});

// GET - الحصول على خطة تطوير
router.get('/development-plan/:planId', authMiddleware, async (req, res) => {
  try {
    const plan = await DevelopmentPlan.findById(req.params.planId).populate(
      'employeeId',
      'email name'
    );

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على خطة التطوير',
      });
    }

    res.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    logger.error('Get development plan error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الحصول على خطة التطوير',
    });
  }
});

// GET - الحصول على خطط التعاقب للموضع
router.get('/position/:positionId/plans', authMiddleware, async (req, res) => {
  try {
    const plans = await SuccessionPlan.find({ positionId: req.params.positionId }).sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      count: plans.length,
      data: plans,
    });
  } catch (error) {
    logger.error('Position plans error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الحصول على خطط التعاقب',
    });
  }
});

// GET - تقرير أفضل مرشحي الخلافة
router.get('/reports/best-candidates', authMiddleware, async (req, res) => {
  try {
    const plans = await SuccessionPlan.find({ status: { $in: ['active', 'approved'] } }).populate(
      'successors.candidateId',
      'email name'
    );

    const candidates = plans.map(plan => ({
      position: plan.positionTitle,
      positionId: plan.positionId,
      bestCandidate: plan.getBestCandidate(),
      overallReadiness: plan.overallReadiness,
      riskLevel: plan.riskLevel,
    }));

    res.json({
      success: true,
      data: candidates,
    });
  } catch (error) {
    logger.error('Best candidates report error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء التقرير',
    });
  }
});

// GET - تقرير مؤشرات المخاطر
router.get('/reports/risk-assessment', authMiddleware, async (req, res) => {
  try {
    const plans = await SuccessionPlan.find();

    const riskAssessment = {
      totalPositions: plans.length,
      criticalRisk: plans.filter(p => p.riskLevel === 'critical').length,
      highRisk: plans.filter(p => p.riskLevel === 'high').length,
      mediumRisk: plans.filter(p => p.riskLevel === 'medium').length,
      lowRisk: plans.filter(p => p.riskLevel === 'low').length,
      noSuccessors: plans.filter(p => !p.successors || p.successors.length === 0).length,
      readySuccessors: plans.filter(
        p => p.successors && p.successors.some(s => s.readinessLevel === 'ready_now')
      ).length,
    };

    res.json({
      success: true,
      data: riskAssessment,
    });
  } catch (error) {
    logger.error('Risk assessment error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تقييم المخاطر',
    });
  }
});

// GET - الحصول على خطة تعاقب
router.get('/:planId', authMiddleware, async (req, res) => {
  try {
    const plan = await SuccessionPlan.findById(req.params.planId)
      .populate('currentHolder', 'email name')
      .populate('successors.candidateId', 'email name')
      .populate('mentorshipProgram.mentorId', 'email name')
      .populate('leadershipProgram.participants', 'email name');

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على خطة التعاقب',
      });
    }

    res.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    logger.error('Get succession plan error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الحصول على خطة التعاقب',
    });
  }
});

// DELETE - حذف خطة تعاقب
router.delete('/:planId', authMiddleware, adminOnly, async (req, res) => {
  try {
    const plan = await SuccessionPlan.findByIdAndDelete(req.params.planId);

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    res.json({
      success: true,
      message: 'تم حذف خطة التعاقب بنجاح',
    });
  } catch (error) {
    logger.error('Delete succession plan error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في حذف خطة التعاقب',
    });
  }
});

// DELETE - حذف خطة تطوير
router.delete('/development-plan/:planId', authMiddleware, adminOnly, async (req, res) => {
  try {
    const plan = await DevelopmentPlan.findByIdAndDelete(req.params.planId);

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    res.json({
      success: true,
      message: 'تم حذف خطة التطوير بنجاح',
    });
  } catch (error) {
    logger.error('Delete development plan error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في حذف خطة التطوير',
    });
  }
});

module.exports = router;

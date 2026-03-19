/**
 * مسارات تخطيط التعاقب الوظيفي
 * Succession Planning Routes
 */

const express = require('express');
const router = express.Router();
const SuccessionPlan = require('../models/SuccessionPlan');
const DevelopmentPlan = require('../models/DevelopmentPlan');
const authMiddleware = require('../middleware/auth');

// POST - إنشاء خطة تعاقب جديدة
router.post('/create', authMiddleware, async (req, res) => {
  try {
    const { positionId, positionTitle, department, currentHolder, requiredCompetencies } = req.body;

    const plan = new SuccessionPlan({
      positionId,
      positionTitle,
      department,
      currentHolder,
      requiredCompetencies,
      status: 'draft',
      createdBy: req.userId
    });

    await plan.save();

    res.status(201).json({
      success: true,
      message: 'تم إنشاء خطة التعاقب بنجاح',
      data: plan
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء خطة التعاقب',
      error: error.message
    });
  }
});

// POST - إضافة مرشح خلافة
router.post('/:planId/add-successor', authMiddleware, async (req, res) => {
  try {
    const { candidateId, readinessLevel, readinessPercentage, keyStrengths, developmentNeeds, assessmentComments } = req.body;

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
            assessmentDate: new Date()
          }
        }
      },
      { new: true }
    );

    res.json({
      success: true,
      message: 'تم إضافة مرشح الخلافة بنجاح',
      data: plan
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في إضافة مرشح الخلافة',
      error: error.message
    });
  }
});

// POST - إنشاء خطة تطوير فردية
router.post('/:planId/create-development-plan/:successorId', authMiddleware, async (req, res) => {
  try {
    const { developmentGoals, plannedTrainings, expandedResponsibilities } = req.body;

    const developmentPlan = new DevelopmentPlan({
      employeeId: req.params.successorId,
      developmentGoals,
      plannedTrainings,
      expandedResponsibilities,
      createdBy: req.userId
    });

    await developmentPlan.save();

    // تحديث خطة التعاقب بالإشارة للخطة التطويرية
    await SuccessionPlan.findByIdAndUpdate(
      req.params.planId,
      {
        $set: {
          'successors.$[elem].developmentPlanId': developmentPlan._id
        }
      },
      {
        arrayFilters: [{ 'elem.candidateId': req.params.successorId }],
        new: true
      }
    );

    res.status(201).json({
      success: true,
      message: 'تم إنشاء خطة التطوير بنجاح',
      data: developmentPlan
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء خطة التطوير',
      error: error.message
    });
  }
});

// PUT - تحديث خطة التطوير
router.put('/development-plan/:planId/update', authMiddleware, async (req, res) => {
  try {
    const { developmentGoals, plannedTrainings, expandedResponsibilities, notes } = req.body;

    const plan = await DevelopmentPlan.findByIdAndUpdate(
      req.params.planId,
      {
        developmentGoals,
        plannedTrainings,
        expandedResponsibilities,
        notes,
        updatedAt: new Date()
      },
      { new: true }
    );

    res.json({
      success: true,
      message: 'تم تحديث خطة التطوير بنجاح',
      data: plan
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث خطة التطوير',
      error: error.message
    });
  }
});

// PUT - تحديث حالة الهدف التطويري
router.put('/development-plan/:planId/goal-status/:goalIndex', authMiddleware, async (req, res) => {
  try {
    const { status, completionPercentage } = req.body;

    const plan = await DevelopmentPlan.findByIdAndUpdate(
      req.params.planId,
      {
        $set: {
          'developmentGoals.$.status': status,
          'developmentGoals.$.completionPercentage': completionPercentage
        }
      },
      { new: true }
    );

    res.json({
      success: true,
      message: 'تم تحديث حالة الهدف بنجاح',
      data: plan
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث حالة الهدف',
      error: error.message
    });
  }
});

// POST - إضافة برنامج الإعداد القيادي
router.post('/:planId/add-leadership-program', authMiddleware, async (req, res) => {
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
          status: 'planned'
        }
      },
      { new: true }
    );

    res.json({
      success: true,
      message: 'تم إضافة برنامج الإعداد القيادي بنجاح',
      data: plan
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في إضافة برنامج الإعداد',
      error: error.message
    });
  }
});

// POST - إضافة برنامج التوجيه الفردي (Mentorship)
router.post('/:planId/add-mentorship/:successorId', authMiddleware, async (req, res) => {
  try {
    const { mentorId, startDate, objectives } = req.body;

    const plan = await SuccessionPlan.findByIdAndUpdate(
      req.params.planId,
      {
        mentorshipProgram: {
          mentorId,
          startDate,
          objectives,
          status: 'active'
        }
      },
      { new: true }
    );

    res.json({
      success: true,
      message: 'تم إضافة برنامج التوجيه بنجاح',
      data: plan
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في إضافة برنامج التوجيه',
      error: error.message
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
        message: 'لم يتم العثور على خطة التعاقب'
      });
    }

    res.json({
      success: true,
      data: plan
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في الحصول على خطة التعاقب',
      error: error.message
    });
  }
});

// GET - الحصول على خطة تطوير
router.get('/development-plan/:planId', authMiddleware, async (req, res) => {
  try {
    const plan = await DevelopmentPlan.findById(req.params.planId)
      .populate('employeeId', 'email name');

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على خطة التطوير'
      });
    }

    res.json({
      success: true,
      data: plan
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في الحصول على خطة التطوير',
      error: error.message
    });
  }
});

// GET - الحصول على خطط التعاقب للموضع
router.get('/position/:positionId/plans', authMiddleware, async (req, res) => {
  try {
    const plans = await SuccessionPlan.find({ positionId: req.params.positionId })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: plans.length,
      data: plans
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في الحصول على خطط التعاقب',
      error: error.message
    });
  }
});

// GET - تقرير أفضل مرشحي الخلافة
router.get('/reports/best-candidates', authMiddleware, async (req, res) => {
  try {
    const plans = await SuccessionPlan.find({ status: { $in: ['active', 'approved'] } })
      .populate('successors.candidateId', 'email name');

    const candidates = plans.map(plan => ({
      position: plan.positionTitle,
      positionId: plan.positionId,
      bestCandidate: plan.getBestCandidate(),
      overallReadiness: plan.overallReadiness,
      riskLevel: plan.riskLevel
    }));

    res.json({
      success: true,
      data: candidates
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء التقرير',
      error: error.message
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
      readySuccessors: plans.filter(p => p.successors && p.successors.some(s => s.readinessLevel === 'ready_now')).length
    };

    res.json({
      success: true,
      data: riskAssessment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في تقييم المخاطر',
      error: error.message
    });
  }
});

module.exports = router;

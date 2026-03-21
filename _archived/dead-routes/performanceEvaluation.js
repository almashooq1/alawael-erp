/* eslint-disable no-unused-vars */
/**
 * مسارات نظام التقييم المتقدم
 * Performance Evaluation Routes
 */

const express = require('express');
const router = express.Router();
const PerformanceEvaluation = require('../models/PerformanceEvaluation');
const { authenticate } = require('../middleware/auth');

// POST - إنشاء دورة تقييم جديدة
router.post('/create', authenticate, async (req, res) => {
  try {
    const { employeeId, evaluationPeriod } = req.body;

    const evaluation = new PerformanceEvaluation({
      employeeId,
      evaluationPeriod,
      summary: {
        weightedScores: {},
        overallRating: 'مقبول',
      },
    });

    await evaluation.save();

    res.status(201).json({
      success: true,
      message: 'تم إنشاء دورة التقييم بنجاح',
      data: evaluation,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء دورة التقييم',
      error: 'حدث خطأ في الخادم',
    });
  }
});

// POST - إضافة تقييم من الإدارة
router.post('/:evaluationId/management-evaluation', authenticate, async (req, res) => {
  try {
    const { scores, comments, strengths, areasForImprovement, recommendations, score } = req.body;

    const evaluation = await PerformanceEvaluation.findByIdAndUpdate(
      req.params.evaluationId,
      {
        'evaluations.managementEvaluation': {
          evaluatedBy: req.user.id,
          evaluationType: 'management',
          score,
          scores,
          comments,
          strengths,
          areasForImprovement,
          recommendations,
          createdAt: new Date(),
        },
      },
      { new: true }
    );

    // إعادة حساب النتيجة النهائية
    if (evaluation) {
      evaluation.calculateOverallScore();
      await evaluation.save();
    }

    res.json({
      success: true,
      message: 'تم إضافة تقييم الإدارة بنجاح',
      data: evaluation,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في إضافة تقييم الإدارة',
      error: 'حدث خطأ في الخادم',
    });
  }
});

// POST - إضافة تقييم من الزملاء
router.post('/:evaluationId/peer-evaluation', authenticate, async (req, res) => {
  try {
    const { scores, comments, strengths, areasForImprovement, recommendations, score } = req.body;

    const evaluation = await PerformanceEvaluation.findByIdAndUpdate(
      req.params.evaluationId,
      {
        $push: {
          'evaluations.peerEvaluations': {
            evaluatedBy: req.user.id,
            evaluationType: 'peer',
            score,
            scores,
            comments,
            strengths,
            areasForImprovement,
            recommendations,
            createdAt: new Date(),
          },
        },
      },
      { new: true }
    );

    // إعادة حساب النتيجة
    if (evaluation) {
      evaluation.calculateOverallScore();
      await evaluation.save();
    }

    res.json({
      success: true,
      message: 'تم إضافة تقييم الزملاء بنجاح',
      data: evaluation,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في إضافة تقييم الزملاء',
      error: 'حدث خطأ في الخادم',
    });
  }
});

// POST - إضافة تقييم من المستفيدين
router.post('/:evaluationId/recipient-evaluation', authenticate, async (req, res) => {
  try {
    const { scores, comments, strengths, areasForImprovement, recommendations, score } = req.body;

    const evaluation = await PerformanceEvaluation.findByIdAndUpdate(
      req.params.evaluationId,
      {
        $push: {
          'evaluations.recipientEvaluations': {
            evaluatedBy: req.user.id,
            evaluationType: 'recipient',
            score,
            scores,
            comments,
            strengths,
            areasForImprovement,
            recommendations,
            createdAt: new Date(),
          },
        },
      },
      { new: true }
    );

    // إعادة حساب النتيجة
    if (evaluation) {
      evaluation.calculateOverallScore();
      await evaluation.save();
    }

    res.json({
      success: true,
      message: 'تم إضافة تقييم المستفيدين بنجاح',
      data: evaluation,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في إضافة تقييم المستفيدين',
      error: 'حدث خطأ في الخادم',
    });
  }
});

// POST - إضافة التقييم الذاتي
router.post('/:evaluationId/self-evaluation', authenticate, async (req, res) => {
  try {
    const { scores, comments, strengths, areasForImprovement, recommendations, score } = req.body;

    const evaluation = await PerformanceEvaluation.findByIdAndUpdate(
      req.params.evaluationId,
      {
        'evaluations.selfEvaluation': {
          evaluatedBy: req.user.id,
          evaluationType: 'self',
          score,
          scores,
          comments,
          strengths,
          areasForImprovement,
          recommendations,
          createdAt: new Date(),
        },
      },
      { new: true }
    );

    // إعادة حساب النتيجة
    if (evaluation) {
      evaluation.calculateOverallScore();
      await evaluation.save();
    }

    res.json({
      success: true,
      message: 'تم إضافة التقييم الذاتي بنجاح',
      data: evaluation,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في إضافة التقييم الذاتي',
      error: 'حدث خطأ في الخادم',
    });
  }
});

// PUT - إكمال التقييم وإضافة الملخص
router.put('/:evaluationId/finalize', authenticate, async (req, res) => {
  try {
    const {
      executiveSummary,
      keyAchievements,
      mainChallenges,
      trainingNeeds,
      careerPathRecommendation,
      promotionRecommended,
      salaryAdjustmentRecommended,
      salaryAdjustmentPercentage,
    } = req.body;

    const evaluation = await PerformanceEvaluation.findById(req.params.evaluationId);

    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على التقييم',
      });
    }

    evaluation.summary = {
      ...evaluation.summary,
      executiveSummary,
      keyAchievements,
      mainChallenges,
      trainingNeeds,
      careerPathRecommendation,
      promotionRecommended,
      salaryAdjustmentRecommended,
      salaryAdjustmentPercentage,
    };

    evaluation.approvedBy = req.user.id;
    evaluation.approvalDate = new Date();
    evaluation.status = 'approved';

    await evaluation.save();

    res.json({
      success: true,
      message: 'تم إكمال التقييم بنجاح',
      data: evaluation,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في إكمال التقييم',
      error: 'حدث خطأ في الخادم',
    });
  }
});

// GET - الحصول على تقييمات موظف (MUST be before /:evaluationId)
router.get('/employee/:employeeId', authenticate, async (req, res) => {
  try {
    const evaluations = await PerformanceEvaluation.find({
      employeeId: req.params.employeeId,
    }).sort({ 'evaluationPeriod.startDate': -1 });

    res.json({
      success: true,
      count: evaluations.length,
      data: evaluations,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في الحصول على التقييمات',
      error: 'حدث خطأ في الخادم',
    });
  }
});

// GET - تقارير التقييمات (MUST be before /:evaluationId)
router.get('/reports/statistics', authenticate, async (req, res) => {
  try {
    const { department, period } = req.query;
    const filter = { status: 'approved' };

    if (period) {
      const startDate = new Date(period);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      filter['evaluationPeriod.startDate'] = { $gte: startDate, $lt: endDate };
    }

    const evaluations = await PerformanceEvaluation.find(filter);

    const statistics = {
      totalEvaluations: evaluations.length,
      averageScore:
        evaluations.length > 0
          ? (
              evaluations.reduce((sum, e) => sum + (e.summary.overallScore || 0), 0) /
              evaluations.length
            ).toFixed(2)
          : 0,
      ratingDistribution: {
        excellent: evaluations.filter(e => e.summary.overallRating === 'ممتاز').length,
        veryGood: evaluations.filter(e => e.summary.overallRating === 'جيد جداً').length,
        good: evaluations.filter(e => e.summary.overallRating === 'جيد').length,
        acceptable: evaluations.filter(e => e.summary.overallRating === 'مقبول').length,
        poor: evaluations.filter(e => e.summary.overallRating === 'ضعيف').length,
      },
      promotionRecommendations: evaluations.filter(e => e.summary.promotionRecommended).length,
      trainingNeeded: evaluations.filter(
        e => e.summary.trainingNeeds && e.summary.trainingNeeds.length > 0
      ).length,
    };

    res.json({
      success: true,
      data: statistics,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء التقارير',
      error: 'حدث خطأ في الخادم',
    });
  }
});

// GET - الحصول على تقييم محدد
router.get('/:evaluationId', authenticate, async (req, res) => {
  try {
    const evaluation = await PerformanceEvaluation.findById(req.params.evaluationId)
      .populate('employeeId', 'email name')
      .populate('approvedBy', 'email name');

    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على التقييم',
      });
    }

    res.json({
      success: true,
      data: evaluation,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في الحصول على التقييم',
      error: 'حدث خطأ في الخادم',
    });
  }
});

// DELETE - حذف تقييم
router.delete('/:evaluationId', authenticate, async (req, res) => {
  try {
    const evaluation = await PerformanceEvaluation.findById(req.params.evaluationId);

    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على التقييم',
      });
    }

    await PerformanceEvaluation.findByIdAndDelete(req.params.evaluationId);

    res.json({
      success: true,
      message: 'تم حذف التقييم بنجاح',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في حذف التقييم',
      error: 'حدث خطأ في الخادم',
    });
  }
});

module.exports = router;

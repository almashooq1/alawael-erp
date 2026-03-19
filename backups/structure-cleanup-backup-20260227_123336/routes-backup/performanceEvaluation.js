/**
 * مسارات نظام التقييم المتقدم
 * Performance Evaluation Routes
 */

const express = require('express');
const router = express.Router();
const PerformanceEvaluation = require('../models/PerformanceEvaluation');
const authMiddleware = require('../middleware/auth');

// POST - إنشاء دورة تقييم جديدة
router.post('/create', authMiddleware, async (req, res) => {
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
      error: error.message,
    });
  }
});

// POST - إضافة تقييم من الإدارة
router.post('/:evaluationId/management-evaluation', authMiddleware, async (req, res) => {
  try {
    const { scores, comments, strengths, areasForImprovement, recommendations, score } = req.body;

    const evaluation = await PerformanceEvaluation.findByIdAndUpdate(
      req.params.evaluationId,
      {
        'evaluations.managementEvaluation': {
          evaluatedBy: req.userId,
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
      error: error.message,
    });
  }
});

// POST - إضافة تقييم من الزملاء
router.post('/:evaluationId/peer-evaluation', authMiddleware, async (req, res) => {
  try {
    const { scores, comments, strengths, areasForImprovement, recommendations, score } = req.body;

    const evaluation = await PerformanceEvaluation.findByIdAndUpdate(
      req.params.evaluationId,
      {
        $push: {
          'evaluations.peerEvaluations': {
            evaluatedBy: req.userId,
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
      error: error.message,
    });
  }
});

// POST - إضافة تقييم من المستفيدين
router.post('/:evaluationId/recipient-evaluation', authMiddleware, async (req, res) => {
  try {
    const { scores, comments, strengths, areasForImprovement, recommendations, score } = req.body;

    const evaluation = await PerformanceEvaluation.findByIdAndUpdate(
      req.params.evaluationId,
      {
        $push: {
          'evaluations.recipientEvaluations': {
            evaluatedBy: req.userId,
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
      error: error.message,
    });
  }
});

// POST - إضافة التقييم الذاتي
router.post('/:evaluationId/self-evaluation', authMiddleware, async (req, res) => {
  try {
    const { scores, comments, strengths, areasForImprovement, recommendations, score } = req.body;

    const evaluation = await PerformanceEvaluation.findByIdAndUpdate(
      req.params.evaluationId,
      {
        'evaluations.selfEvaluation': {
          evaluatedBy: req.userId,
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
      error: error.message,
    });
  }
});

// PUT - إكمال التقييم وإضافة الملخص
router.put('/:evaluationId/finalize', authMiddleware, async (req, res) => {
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

    evaluation.approvedBy = req.userId;
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
      error: error.message,
    });
  }
});

// GET - الحصول على تقييم محدد
router.get('/:evaluationId', authMiddleware, async (req, res) => {
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
      error: error.message,
    });
  }
});

// GET - الحصول على تقييمات موظف
router.get('/employee/:employeeId', authMiddleware, async (req, res) => {
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
      error: error.message,
    });
  }
});

// GET - تقارير التقييمات
router.get('/reports/statistics', authMiddleware, async (req, res) => {
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
      error: error.message,
    });
  }
});

module.exports = router;

/* eslint-disable no-unused-vars */
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

router.use(authenticate);

/* ─────────────────────── Beneficiary List (for assessors) ─────────────────────── */

// GET /beneficiaries — list beneficiaries eligible for assessment
router.get('/beneficiaries', async (req, res) => {
  try {
    const Beneficiary = require('../models/Beneficiary');
    const data = await Beneficiary.find({ status: 'ACTIVE' })
      .select('name mrn dob status')
      .sort({ name: 1 })
      .lean();

    // Map to the shape the frontend expects
    const mapped = data.map(b => ({
      id: b._id.toString(),
      name: b.name,
      mrn: b.mrn || '',
      age: b.dob ? Math.floor((Date.now() - new Date(b.dob).getTime()) / 31557600000) : null,
      disabilityType: 'general',
      therapist: '',
    }));

    res.json({ success: true, data: mapped, count: mapped.length });
  } catch (err) {
    logger.error('Beneficiary list error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب قائمة المستفيدين' });
  }
});

/* ─────────────────────── Assessment Scale Results ─────────────────────── */

// GET /assessment/scale-results
router.get('/assessment/scale-results', async (req, res) => {
  try {
    const DisabilityAssessment = require('../models/disability-assessment.model');
    const filters = { type: 'scale' };
    if (req.query.beneficiaryId) filters.beneficiary_id = req.query.beneficiaryId;
    if (req.query.scaleId) filters['scales.who_disability_assessment.domain'] = req.query.scaleId;

    const data = await DisabilityAssessment.find(filters).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data, count: data.length });
  } catch (err) {
    logger.error('Disability scale results error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب نتائج المقاييس' });
  }
});

// GET /assessment/test-results
router.get('/assessment/test-results', async (req, res) => {
  try {
    const DisabilityAssessment = require('../models/disability-assessment.model');
    const filters = { type: 'test' };
    if (req.query.beneficiaryId) filters.beneficiary_id = req.query.beneficiaryId;
    if (req.query.testId) filters['scales.who_disability_assessment.domain'] = req.query.testId;

    const data = await DisabilityAssessment.find(filters).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data, count: data.length });
  } catch (err) {
    logger.error('Disability test results error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب نتائج الاختبارات' });
  }
});

// POST /assessment/scale-results
router.post('/assessment/scale-results', async (req, res) => {
  try {
    const DisabilityAssessment = require('../models/disability-assessment.model');
    const assessment = await DisabilityAssessment.create({
      ...req.body,
      type: 'scale',
      created_by: req.user?.id,
    });
    res.status(201).json({ success: true, data: assessment, message: 'تم حفظ نتائج المقياس' });
  } catch (err) {
    logger.error('Disability scale save error:', err);
    res.status(500).json({ success: false, message: 'خطأ في حفظ نتائج المقياس' });
  }
});

// POST /assessment/test-results
router.post('/assessment/test-results', async (req, res) => {
  try {
    const DisabilityAssessment = require('../models/disability-assessment.model');
    const assessment = await DisabilityAssessment.create({
      ...req.body,
      type: 'test',
      created_by: req.user?.id,
    });
    res.status(201).json({ success: true, data: assessment, message: 'تم حفظ نتائج الاختبار' });
  } catch (err) {
    logger.error('Disability test save error:', err);
    res.status(500).json({ success: false, message: 'خطأ في حفظ نتائج الاختبار' });
  }
});

/* ─────────────────────── Statistics ─────────────────────── */

// GET /statistics
router.get('/statistics', async (req, res) => {
  try {
    const DisabilityAssessment = require('../models/disability-assessment.model');
    const stats = await DisabilityAssessment.getAssessmentStatistics();
    res.json({ success: true, data: stats });
  } catch (err) {
    logger.error('Disability statistics error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب الإحصائيات' });
  }
});

/* ═══════════════════════════════════════════════════════════════
 * Phase 5 — Enhanced Assessment Scale Endpoints
 * مسارات متقدمة لمقاييس تقييم الإعاقة
 * ═══════════════════════════════════════════════════════════════ */

// GET /assessment/scales — قائمة جميع المقاييس المتاحة مع تفاصيلها
router.get('/assessment/scales', async (_req, res) => {
  try {
    const {
      UnifiedAssessmentService,
    } = require('../rehabilitation-services/unified-assessment-service');
    const svc = new UnifiedAssessmentService();
    const scales = svc.scales;
    const scaleList = Object.entries(scales).map(([key, scale]) => ({
      key,
      name: scale.name,
      nameEn: scale.nameEn || key,
      domains: scale.domains,
      maxScore: scale.maxScore,
      interpretation: scale.interpretation,
    }));
    res.json({ success: true, data: scaleList, count: scaleList.length });
  } catch (err) {
    logger.error('List scales error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب قائمة المقاييس' });
  }
});

// GET /assessment/scales/:scaleKey — تفاصيل مقياس محدد
router.get('/assessment/scales/:scaleKey', async (req, res) => {
  try {
    const {
      UnifiedAssessmentService,
    } = require('../rehabilitation-services/unified-assessment-service');
    const svc = new UnifiedAssessmentService();
    const scale = svc.scales[req.params.scaleKey];
    if (!scale) {
      return res.status(404).json({ success: false, message: 'المقياس غير موجود' });
    }
    res.json({ success: true, data: { key: req.params.scaleKey, ...scale } });
  } catch (err) {
    logger.error('Get scale error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب بيانات المقياس' });
  }
});

// GET /assessment/recommended-scales/:disabilityType — المقاييس الموصى بها لنوع إعاقة
router.get('/assessment/recommended-scales/:disabilityType', async (req, res) => {
  try {
    const {
      UnifiedAssessmentService,
    } = require('../rehabilitation-services/unified-assessment-service');
    const svc = new UnifiedAssessmentService();
    const recommended = svc.getRecommendedScales(req.params.disabilityType);
    res.json({
      success: true,
      data: recommended,
      disabilityType: req.params.disabilityType,
      count: recommended.length,
    });
  } catch (err) {
    logger.error('Recommended scales error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب المقاييس الموصى بها' });
  }
});

// POST /assessment/perform — تنفيذ تقييم بمقياس محدد
router.post('/assessment/perform', async (req, res) => {
  try {
    const { beneficiaryId, scaleKey, domainScores, notes } = req.body;
    if (!beneficiaryId || !scaleKey || !domainScores) {
      return res.status(400).json({
        success: false,
        message: 'يلزم تحديد المستفيد والمقياس والدرجات',
      });
    }

    const {
      UnifiedAssessmentService,
    } = require('../rehabilitation-services/unified-assessment-service');
    const svc = new UnifiedAssessmentService();
    const result = await svc.performScaleAssessment(beneficiaryId, scaleKey, domainScores, {
      assessorId: req.user?.id,
      assessorName: req.user?.name || 'مقيّم',
      notes,
    });

    // حفظ في قاعدة البيانات أيضاً
    let persisted = true;
    try {
      const DisabilityAssessment = require('../models/disability-assessment.model');
      await DisabilityAssessment.create({
        beneficiary_id: beneficiaryId,
        beneficiary_name: req.body.beneficiaryName || '',
        date_of_birth: req.body.dateOfBirth || new Date('2000-01-01'),
        gender: req.body.gender || 'male',
        type: 'scale',
        scales: {
          who_disability_assessment: {
            score: result.percentage,
            domain: scaleKey,
            completed_date: new Date(),
          },
        },
        assessment_status: 'completed',
        created_by: req.user?.id,
      });
    } catch (dbErr) {
      persisted = false;
      logger.error('CRITICAL: Failed to persist assessment to DB:', dbErr.message);
    }

    res.status(201).json({
      success: true,
      data: result,
      persisted,
      message: persisted
        ? 'تم تنفيذ التقييم بنجاح'
        : 'تم تنفيذ التقييم لكن فشل الحفظ في قاعدة البيانات. يرجى إعادة المحاولة.',
    });
  } catch (err) {
    logger.error('Perform assessment error:', err);
    res.status(500).json({ success: false, message: err.message || 'خطأ في تنفيذ التقييم' });
  }
});

// POST /assessment/batch — تقييم متعدد المقاييس دفعة واحدة
router.post('/assessment/batch', async (req, res) => {
  try {
    const { beneficiaryId, scaleAssessments } = req.body;
    if (!beneficiaryId || !Array.isArray(scaleAssessments) || scaleAssessments.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'يلزم تحديد المستفيد ومقاييس التقييم',
      });
    }

    const {
      UnifiedAssessmentService,
    } = require('../rehabilitation-services/unified-assessment-service');
    const svc = new UnifiedAssessmentService();
    const batchResult = await svc.performBatchAssessment(beneficiaryId, scaleAssessments, {
      assessorId: req.user?.id,
      assessorName: req.user?.name || 'مقيّم',
      notes: req.body.notes,
    });

    res.status(201).json({
      success: true,
      data: batchResult,
      message: `تم تنفيذ ${batchResult.summary.totalScales} تقييم بنجاح`,
    });
  } catch (err) {
    logger.error('Batch assessment error:', err);
    res.status(500).json({ success: false, message: err.message || 'خطأ في التقييم المتعدد' });
  }
});

// GET /assessment/progress/:beneficiaryId/:scaleKey — مقارنة التقدم عبر الزمن
router.get('/assessment/progress/:beneficiaryId/:scaleKey', async (req, res) => {
  try {
    const { beneficiaryId, scaleKey } = req.params;
    const DisabilityAssessment = require('../models/disability-assessment.model');

    // جلب جميع التقييمات لهذا المستفيد وهذا المقياس
    const assessments = await DisabilityAssessment.find({
      beneficiary_id: beneficiaryId,
      'scales.who_disability_assessment.domain': scaleKey,
    })
      .sort({ createdAt: 1 })
      .lean();

    if (assessments.length < 2) {
      return res.json({
        success: true,
        data: {
          trend: 'insufficient_data',
          results: assessments,
          message: 'تحتاج تقييمَين على الأقل للمقارنة',
        },
      });
    }

    const first = assessments[0];
    const last = assessments[assessments.length - 1];
    const firstScore = first.scales?.who_disability_assessment?.score || 0;
    const lastScore = last.scales?.who_disability_assessment?.score || 0;
    const changePercent = lastScore - firstScore;

    res.json({
      success: true,
      data: {
        trend: changePercent > 5 ? 'improving' : changePercent < -5 ? 'declining' : 'stable',
        overallChange: changePercent,
        firstAssessment: { date: first.createdAt, score: firstScore },
        lastAssessment: { date: last.createdAt, score: lastScore },
        totalAssessments: assessments.length,
        history: assessments.map(a => ({
          date: a.createdAt,
          score: a.scales?.who_disability_assessment?.score || 0,
        })),
      },
    });
  } catch (err) {
    logger.error('Progress comparison error:', err);
    res.status(500).json({ success: false, message: 'خطأ في مقارنة التقدم' });
  }
});

// GET /assessment/profile/:beneficiaryId — ملف التقييم الشامل
router.get('/assessment/profile/:beneficiaryId', async (req, res) => {
  try {
    const { beneficiaryId } = req.params;
    const DisabilityAssessment = require('../models/disability-assessment.model');

    const allAssessments = await DisabilityAssessment.find({
      beneficiary_id: beneficiaryId,
    })
      .sort({ createdAt: -1 })
      .lean();

    // آخر تقييم لكل مقياس
    const latestByScale = {};
    allAssessments.forEach(a => {
      const domain = a.scales?.who_disability_assessment?.domain;
      if (domain && !latestByScale[domain]) {
        latestByScale[domain] = {
          scaleKey: domain,
          score: a.scales.who_disability_assessment.score,
          date: a.createdAt,
        };
      }
    });

    const scalesSummary = Object.values(latestByScale);
    const avgScore = scalesSummary.length
      ? Math.round(scalesSummary.reduce((s, sc) => s + sc.score, 0) / scalesSummary.length)
      : 0;

    res.json({
      success: true,
      data: {
        beneficiaryId,
        totalAssessments: allAssessments.length,
        uniqueScales: scalesSummary.length,
        averageScore: avgScore,
        scalesSummary,
        recentAssessments: allAssessments.slice(0, 10),
        areasOfStrength: scalesSummary.filter(s => s.score >= 75),
        areasNeedingSupport: scalesSummary.filter(s => s.score < 50),
      },
    });
  } catch (err) {
    logger.error('Assessment profile error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب ملف التقييم' });
  }
});

// GET /assessment/analytics — تحليلات شاملة لجميع التقييمات
router.get('/assessment/analytics', async (req, res) => {
  try {
    const DisabilityAssessment = require('../models/disability-assessment.model');

    const [totalCount, byType, bySeverity, recentAssessments] = await Promise.all([
      DisabilityAssessment.countDocuments(),
      DisabilityAssessment.aggregate([
        { $group: { _id: '$disability_profile.type', count: { $sum: 1 } } },
      ]),
      DisabilityAssessment.aggregate([
        { $group: { _id: '$disability_profile.severity', count: { $sum: 1 } } },
      ]),
      DisabilityAssessment.find()
        .sort({ createdAt: -1 })
        .limit(20)
        .select('beneficiary_id beneficiary_name scales createdAt disability_profile')
        .lean(),
    ]);

    // متوسط الدرجات حسب المقياس
    const byScale = await DisabilityAssessment.aggregate([
      { $match: { 'scales.who_disability_assessment.domain': { $exists: true } } },
      {
        $group: {
          _id: '$scales.who_disability_assessment.domain',
          avgScore: { $avg: '$scales.who_disability_assessment.score' },
          count: { $sum: 1 },
        },
      },
    ]);

    // توزيع الدرجات
    const scoreDistribution = await DisabilityAssessment.aggregate([
      { $match: { 'scales.who_disability_assessment.score': { $exists: true } } },
      {
        $bucket: {
          groupBy: '$scales.who_disability_assessment.score',
          boundaries: [0, 25, 50, 75, 101],
          default: 'other',
          output: { count: { $sum: 1 } },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        totalAssessments: totalCount,
        byDisabilityType: byType,
        bySeverity,
        byScale,
        scoreDistribution,
        recentAssessments,
      },
    });
  } catch (err) {
    logger.error('Assessment analytics error:', err);
    res.status(500).json({ success: false, message: 'خطأ في التحليلات' });
  }
});

// GET /assessment/compare/:beneficiaryId — مقارنة جميع المقاييس لمستفيد
router.get('/assessment/compare/:beneficiaryId', async (req, res) => {
  try {
    const { beneficiaryId } = req.params;
    const DisabilityAssessment = require('../models/disability-assessment.model');

    const assessments = await DisabilityAssessment.find({
      beneficiary_id: beneficiaryId,
      'scales.who_disability_assessment': { $exists: true },
    })
      .sort({ createdAt: -1 })
      .lean();

    // تجميع حسب المقياس
    const scaleData = {};
    assessments.forEach(a => {
      const domain = a.scales?.who_disability_assessment?.domain;
      const score = a.scales?.who_disability_assessment?.score;
      if (domain && score != null) {
        if (!scaleData[domain]) scaleData[domain] = [];
        scaleData[domain].push({ date: a.createdAt, score });
      }
    });

    // حساب الفارق
    const comparison = Object.entries(scaleData).map(([scaleKey, entries]) => {
      const sorted = entries.sort((a, b) => new Date(a.date) - new Date(b.date));
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      return {
        scaleKey,
        assessmentCount: sorted.length,
        firstScore: first.score,
        lastScore: last.score,
        change: last.score - first.score,
        trend:
          last.score - first.score > 5
            ? 'improving'
            : last.score - first.score < -5
              ? 'declining'
              : 'stable',
        history: sorted,
      };
    });

    res.json({ success: true, data: comparison, beneficiaryId });
  } catch (err) {
    logger.error('Compare assessments error:', err);
    res.status(500).json({ success: false, message: 'خطأ في المقارنة' });
  }
});

module.exports = router;

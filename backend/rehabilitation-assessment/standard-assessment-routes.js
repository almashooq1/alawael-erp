/**
 * standard-assessment-routes.js
 * مسارات API لأدوات التقييم المعيارية
 * VABS-3 | CARS-2 | PEP-3 | ICF | Developmental Milestones
 */

'use strict';

const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');

const {
  VABSAssessment,
  CARS2Assessment,
  PEP3Assessment,
  ICFAssessment,
  DevelopmentalMilestones,
  AssessmentHistory,
} = require('../models/StandardAssessment');

const {
  VABS3Service,
  CARS2Service,
  PEP3Service,
  DevelopmentalMilestonesService,
  AssessmentHistoryService,
  DEVELOPMENTAL_MILESTONES_BANK,
} = require('./standard-assessment-service');

// Middleware للتحقق من الأخطاء
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

// ═══════════════════════════════════════════════════════════════
// ── VABS-3 Routes
// ═══════════════════════════════════════════════════════════════

/**
 * POST /standard-assessments/vabs3
 * إنشاء تقييم VABS-3 جديد
 */
router.post(
  '/vabs3',
  [
    body('beneficiary_id').isMongoId().withMessage('معرف المستفيد غير صحيح'),
    body('chronological_age_months').isInt({ min: 0, max: 1000 }).withMessage('العمر غير صحيح'),
    body('form_type').optional().isIn(['interview', 'parent_caregiver', 'teacher']),
  ],
  validate,
  async (req, res) => {
    try {
      const assessment = new VABSAssessment({
        ...req.body,
        assessor_id: req.user?.id || req.body.assessor_id,
      });
      await assessment.save();
      res.status(201).json({
        success: true,
        message: 'تم إنشاء تقييم VABS-3 بنجاح',
        data: assessment,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

/**
 * POST /standard-assessments/vabs3/:id/score
 * تصحيح تقييم VABS-3 تلقائياً
 */
router.post('/vabs3/:id/score', async (req, res) => {
  try {
    const result = await VABS3Service.scoreAssessment(req.params.id);
    res.json({
      success: true,
      message: 'تم التصحيح التلقائي لتقييم VABS-3 بنجاح',
      data: result,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /standard-assessments/vabs3/beneficiary/:beneficiaryId
 * جلب تاريخ تقييمات VABS-3 للمستفيد
 */
router.get('/vabs3/beneficiary/:beneficiaryId', async (req, res) => {
  try {
    const assessments = await VABSAssessment.find({
      beneficiary_id: req.params.beneficiaryId,
    })
      .sort({ assessment_date: -1 })
      .populate('assessor_id', 'name role')
      .lean();

    // تحليل اتجاه التحسن
    const trend =
      assessments.length >= 2
        ? {
            composite_change:
              (assessments[0].standard_scores?.adaptive_behavior_composite || 0) -
              (assessments[1].standard_scores?.adaptive_behavior_composite || 0),
            trend_direction:
              (assessments[0].standard_scores?.adaptive_behavior_composite || 0) >
              (assessments[1].standard_scores?.adaptive_behavior_composite || 0)
                ? 'improving'
                : 'declining',
          }
        : null;

    res.json({
      success: true,
      data: { assessments, trend },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /standard-assessments/vabs3/:id
 * جلب تفاصيل تقييم VABS-3
 */
router.get('/vabs3/:id', async (req, res) => {
  try {
    const assessment = await VABSAssessment.findById(req.params.id)
      .populate('assessor_id', 'name role')
      .populate('beneficiary_id', 'name date_of_birth disability_type')
      .lean();
    if (!assessment) return res.status(404).json({ success: false, message: 'التقييم غير موجود' });
    res.json({ success: true, data: assessment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PATCH /standard-assessments/vabs3/:id/items
 * إضافة/تحديث بنود التقييم
 */
router.patch('/vabs3/:id/items', async (req, res) => {
  try {
    const assessment = await VABSAssessment.findByIdAndUpdate(
      req.params.id,
      { items: req.body.items },
      { new: true }
    );
    res.json({ success: true, data: assessment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// ── CARS-2 Routes
// ═══════════════════════════════════════════════════════════════

/**
 * POST /standard-assessments/cars2
 * إنشاء تقييم CARS-2 جديد
 */
router.post(
  '/cars2',
  [
    body('beneficiary_id').isMongoId(),
    body('chronological_age_months').isInt({ min: 18, max: 600 }),
    body('form_used').optional().isIn(['ST', 'HF']),
  ],
  validate,
  async (req, res) => {
    try {
      const assessment = new CARS2Assessment({
        ...req.body,
        assessor_id: req.user?.id || req.body.assessor_id,
      });
      await assessment.save();
      res.status(201).json({ success: true, data: assessment });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

/**
 * POST /standard-assessments/cars2/:id/score
 * تصحيح CARS-2 تلقائياً وتصنيف مستوى التوحد
 */
router.post('/cars2/:id/score', async (req, res) => {
  try {
    const result = await CARS2Service.scoreAssessment(req.params.id);
    res.json({
      success: true,
      message: 'تم التصحيح التلقائي وتصنيف مستوى التوحد',
      data: result,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /standard-assessments/cars2/beneficiary/:beneficiaryId
 */
router.get('/cars2/beneficiary/:beneficiaryId', async (req, res) => {
  try {
    const assessments = await CARS2Assessment.find({
      beneficiary_id: req.params.beneficiaryId,
    })
      .sort({ assessment_date: -1 })
      .populate('assessor_id', 'name')
      .lean();
    res.json({ success: true, data: assessments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /standard-assessments/cars2/:id
 */
router.get('/cars2/:id', async (req, res) => {
  try {
    const assessment = await CARS2Assessment.findById(req.params.id)
      .populate('assessor_id', 'name role')
      .populate('beneficiary_id', 'name date_of_birth disability_type')
      .lean();
    if (!assessment) return res.status(404).json({ success: false, message: 'التقييم غير موجود' });
    res.json({ success: true, data: assessment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// ── PEP-3 Routes
// ═══════════════════════════════════════════════════════════════

/**
 * POST /standard-assessments/pep3
 */
router.post(
  '/pep3',
  [
    body('beneficiary_id').isMongoId(),
    body('chronological_age_months').isInt({ min: 24, max: 90 }),
  ],
  validate,
  async (req, res) => {
    try {
      const assessment = new PEP3Assessment({
        ...req.body,
        assessor_id: req.user?.id || req.body.assessor_id,
      });
      await assessment.save();
      res.status(201).json({ success: true, data: assessment });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

/**
 * POST /standard-assessments/pep3/:id/score
 * تصحيح PEP-3 وبناء ملف الأداء الفردي
 */
router.post('/pep3/:id/score', async (req, res) => {
  try {
    const result = await PEP3Service.scoreAssessment(req.params.id);
    res.json({
      success: true,
      message: 'تم التصحيح وبناء ملف الأداء الفردي',
      data: result,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /standard-assessments/pep3/beneficiary/:beneficiaryId
 */
router.get('/pep3/beneficiary/:beneficiaryId', async (req, res) => {
  try {
    const assessments = await PEP3Assessment.find({ beneficiary_id: req.params.beneficiaryId })
      .sort({ assessment_date: -1 })
      .lean();
    res.json({ success: true, data: assessments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// ── ICF Routes
// ═══════════════════════════════════════════════════════════════

/**
 * POST /standard-assessments/icf
 */
router.post('/icf', [body('beneficiary_id').isMongoId()], validate, async (req, res) => {
  try {
    const assessment = new ICFAssessment({
      ...req.body,
      assessor_id: req.user?.id || req.body.assessor_id,
    });
    await assessment.save();
    res.status(201).json({ success: true, data: assessment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /standard-assessments/icf/beneficiary/:beneficiaryId
 */
router.get('/icf/beneficiary/:beneficiaryId', async (req, res) => {
  try {
    const assessments = await ICFAssessment.find({ beneficiary_id: req.params.beneficiaryId })
      .sort({ assessment_date: -1 })
      .lean();
    res.json({ success: true, data: assessments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /standard-assessments/icf/codes
 * جلب الأكواد الشائعة في ICF للأطفال ذوي الإعاقة
 */
router.get('/icf/codes/common', (req, res) => {
  const commonICFCodes = {
    body_functions: [
      { code: 'b117', title_ar: 'وظائف الذكاء', chapter: 'b1' },
      { code: 'b122', title_ar: 'وظائف النمو النفسي العام', chapter: 'b1' },
      { code: 'b167', title_ar: 'وظائف اللغة العقلية', chapter: 'b1' },
      { code: 'b280', title_ar: 'إحساس بالألم', chapter: 'b2' },
      { code: 'b310', title_ar: 'وظائف الصوت', chapter: 'b3' },
      { code: 'b320', title_ar: 'وظائف نطق الكلام', chapter: 'b3' },
      { code: 'b710', title_ar: 'حركة المفاصل', chapter: 'b7' },
      { code: 'b730', title_ar: 'قوة العضلات', chapter: 'b7' },
      { code: 'b760', title_ar: 'السيطرة على الحركات الإرادية', chapter: 'b7' },
    ],
    activities_participation: [
      { code: 'd115', title_ar: 'الإصغاء', chapter: 'd1' },
      { code: 'd130', title_ar: 'التقليد', chapter: 'd1' },
      { code: 'd137', title_ar: 'اكتساب المفاهيم', chapter: 'd1' },
      { code: 'd310', title_ar: 'التواصل بالرسائل اللفظية المُستقبَلة', chapter: 'd3' },
      { code: 'd330', title_ar: 'الكلام', chapter: 'd3' },
      { code: 'd335', title_ar: 'إنتاج رسائل غير لفظية', chapter: 'd3' },
      { code: 'd410', title_ar: 'تغيير أوضاع الجسم الأساسية', chapter: 'd4' },
      { code: 'd415', title_ar: 'المحافظة على وضعية الجسم', chapter: 'd4' },
      { code: 'd430', title_ar: 'رفع الأشياء وحملها', chapter: 'd4' },
      { code: 'd510', title_ar: 'غسل الجسم', chapter: 'd5' },
      { code: 'd520', title_ar: 'العناية بأجزاء الجسم', chapter: 'd5' },
      { code: 'd530', title_ar: 'متطلبات المرحاض', chapter: 'd5' },
      { code: 'd540', title_ar: 'الارتداء', chapter: 'd5' },
      { code: 'd550', title_ar: 'الأكل', chapter: 'd5' },
      { code: 'd710', title_ar: 'التفاعلات الشخصية البسيطة', chapter: 'd7' },
      { code: 'd720', title_ar: 'التفاعلات الشخصية المعقدة', chapter: 'd7' },
      { code: 'd760', title_ar: 'علاقات الأسرة', chapter: 'd7' },
      { code: 'd820', title_ar: 'التعليم المدرسي', chapter: 'd8' },
    ],
    environmental_factors: [
      { code: 'e115', title_ar: 'المنتجات للاستخدام الشخصي في الحياة اليومية', chapter: 'e1' },
      { code: 'e310', title_ar: 'الأسرة المباشرة', chapter: 'e3' },
      { code: 'e315', title_ar: 'الأسرة الممتدة', chapter: 'e3' },
      { code: 'e320', title_ar: 'الأصدقاء', chapter: 'e3' },
      { code: 'e330', title_ar: 'الأشخاص ذوو السلطة', chapter: 'e3' },
      { code: 'e355', title_ar: 'المهنيون الصحيون', chapter: 'e3' },
      { code: 'e360', title_ar: 'المهنيون الآخرون', chapter: 'e3' },
      { code: 'e410', title_ar: 'المواقف الفردية في الأسرة المباشرة', chapter: 'e4' },
      { code: 'e570', title_ar: 'خدمات الضمان الاجتماعي', chapter: 'e5' },
      { code: 'e585', title_ar: 'خدمات التعليم والتدريب', chapter: 'e5' },
    ],
  };
  res.json({ success: true, data: commonICFCodes });
});

// ═══════════════════════════════════════════════════════════════
// ── Developmental Milestones Routes
// ═══════════════════════════════════════════════════════════════

/**
 * POST /standard-assessments/milestones/:beneficiaryId/initialize
 * تهيئة سجل معالم التطور لمستفيد جديد
 */
router.post('/milestones/:beneficiaryId/initialize', async (req, res) => {
  try {
    const existing = await DevelopmentalMilestones.findOne({
      beneficiary_id: req.params.beneficiaryId,
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'سجل معالم التطور موجود مسبقاً لهذا المستفيد',
        data: existing,
      });
    }

    const milestones = DevelopmentalMilestonesService.createInitialMilestones();
    const record = new DevelopmentalMilestones({
      beneficiary_id: req.params.beneficiaryId,
      assessor_id: req.user?.id || req.body.assessor_id,
      branch_id: req.body.branch_id,
      milestones,
    });
    await record.save();
    res.status(201).json({
      success: true,
      message: `تم تهيئة ${milestones.length} معلماً تطورياً`,
      data: record,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /standard-assessments/milestones/:beneficiaryId
 * جلب معالم التطور والملخص التطوري
 */
router.get('/milestones/:beneficiaryId', async (req, res) => {
  try {
    const record = await DevelopmentalMilestones.findOne({
      beneficiary_id: req.params.beneficiaryId,
    })
      .populate('beneficiary_id', 'name date_of_birth')
      .lean();

    if (!record)
      return res.status(404).json({ success: false, message: 'سجل معالم التطور غير موجود' });

    // تنظيم المعالم حسب المجال
    const milestonesByDomain = {};
    for (const m of record.milestones) {
      if (!milestonesByDomain[m.domain]) milestonesByDomain[m.domain] = [];
      milestonesByDomain[m.domain].push(m);
    }

    res.json({
      success: true,
      data: {
        ...record,
        milestones_by_domain: milestonesByDomain,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PATCH /standard-assessments/milestones/:beneficiaryId/update
 * تحديث حالة معالم التطور وحساب ملخص جديد
 */
router.patch(
  '/milestones/:beneficiaryId/update',
  [body('chronological_age_months').isInt({ min: 0 })],
  validate,
  async (req, res) => {
    try {
      const { updates, chronological_age_months } = req.body;

      // تحديث حالات المعالم المُرسلة
      if (updates && updates.length > 0) {
        const record = await DevelopmentalMilestones.findOne({
          beneficiary_id: req.params.beneficiaryId,
        });
        if (!record) return res.status(404).json({ success: false, message: 'السجل غير موجود' });

        for (const update of updates) {
          const milestone = record.milestones.find(
            m => m.domain === update.domain && m.expected_age_months === update.expected_age_months
          );
          if (milestone) {
            milestone.status = update.status;
            if (update.status === 'achieved') {
              milestone.achieved_at_age_months = chronological_age_months;
              milestone.achievement_date = new Date();
            }
            if (update.notes) milestone.notes = update.notes;
          }
        }
        await record.save();
      }

      // إعادة حساب الملخص
      const result = await DevelopmentalMilestonesService.updateAndSnapshot(
        req.params.beneficiaryId,
        chronological_age_months
      );

      res.json({
        success: true,
        message: 'تم تحديث معالم التطور وإعادة حساب الملخص التطوري',
        data: result,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

/**
 * GET /standard-assessments/milestones/:beneficiaryId/chart
 * بيانات منحنى التطور للرسم البياني
 */
router.get('/milestones/:beneficiaryId/chart', async (req, res) => {
  try {
    const record = await DevelopmentalMilestones.findOne({
      beneficiary_id: req.params.beneficiaryId,
    }).lean();

    if (!record) return res.status(404).json({ success: false, message: 'السجل غير موجود' });

    // تحضير بيانات الرسم البياني
    const chartData = {
      labels: record.progress_snapshots.map(s =>
        new Date(s.snapshot_date).toLocaleDateString('ar-SA')
      ),
      datasets: [
        {
          label: 'الحركة الكبيرة',
          data: record.progress_snapshots.map(s => s.domains_scores?.gross_motor || 0),
        },
        {
          label: 'الحركة الدقيقة',
          data: record.progress_snapshots.map(s => s.domains_scores?.fine_motor || 0),
        },
        {
          label: 'اللغة الاستقبالية',
          data: record.progress_snapshots.map(s => s.domains_scores?.language_receptive || 0),
        },
        {
          label: 'اللغة التعبيرية',
          data: record.progress_snapshots.map(s => s.domains_scores?.language_expressive || 0),
        },
        {
          label: 'الإدراك',
          data: record.progress_snapshots.map(s => s.domains_scores?.cognitive || 0),
        },
        {
          label: 'الاجتماعي العاطفي',
          data: record.progress_snapshots.map(s => s.domains_scores?.social_emotional || 0),
        },
        {
          label: 'العناية بالذات',
          data: record.progress_snapshots.map(s => s.domains_scores?.self_care || 0),
        },
      ],
      overall: record.progress_snapshots.map(s => ({
        date: s.snapshot_date,
        score: s.overall_score,
      })),
      current_summary: record.developmental_summary,
    };

    res.json({ success: true, data: chartData });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// ── Assessment History Routes
// ═══════════════════════════════════════════════════════════════

/**
 * GET /standard-assessments/history/:beneficiaryId
 * سجل تاريخ جميع التقييمات للمستفيد
 */
router.get('/history/:beneficiaryId', async (req, res) => {
  try {
    const history = await AssessmentHistoryService.getBeneficiaryHistory(req.params.beneficiaryId);
    res.json({ success: true, data: history });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /standard-assessments/upcoming
 * التقييمات المقبلة (للإنذار المبكر)
 */
router.get('/upcoming', async (req, res) => {
  try {
    const daysAhead = parseInt(req.query.days) || 30;
    const upcoming = await AssessmentHistoryService.getUpcomingAssessments(
      req.query.branch_id,
      daysAhead
    );
    res.json({
      success: true,
      count: upcoming.length,
      data: upcoming,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /standard-assessments/summary/:beneficiaryId
 * ملخص شامل لجميع التقييمات المعيارية لمستفيد واحد
 */
router.get('/summary/:beneficiaryId', async (req, res) => {
  try {
    const beneficiaryId = req.params.beneficiaryId;

    const [vabsLatest, cars2Latest, pep3Latest, icfLatest, milestonesRecord, history] =
      await Promise.all([
        VABSAssessment.findOne({ beneficiary_id: beneficiaryId, status: 'completed' })
          .sort({ assessment_date: -1 })
          .lean(),
        CARS2Assessment.findOne({ beneficiary_id: beneficiaryId, status: 'completed' })
          .sort({ assessment_date: -1 })
          .lean(),
        PEP3Assessment.findOne({ beneficiary_id: beneficiaryId, status: 'completed' })
          .sort({ assessment_date: -1 })
          .lean(),
        ICFAssessment.findOne({ beneficiary_id: beneficiaryId, status: 'completed' })
          .sort({ assessment_date: -1 })
          .lean(),
        DevelopmentalMilestones.findOne({ beneficiary_id: beneficiaryId }).lean(),
        AssessmentHistory.find({ beneficiary_id: beneficiaryId })
          .sort({ assessment_date: -1 })
          .limit(10)
          .lean(),
      ]);

    res.json({
      success: true,
      data: {
        beneficiary_id: beneficiaryId,
        latest_assessments: {
          vabs3: vabsLatest
            ? {
                date: vabsLatest.assessment_date,
                composite_score: vabsLatest.standard_scores?.adaptive_behavior_composite,
                adaptive_level: vabsLatest.composite_interpretation?.level,
                description: vabsLatest.composite_interpretation?.description_ar,
              }
            : null,
          cars2: cars2Latest
            ? {
                date: cars2Latest.assessment_date,
                total_score: cars2Latest.total_score,
                classification: cars2Latest.classification,
                classification_ar: cars2Latest.classification_ar,
              }
            : null,
          pep3: pep3Latest
            ? {
                date: pep3Latest.assessment_date,
                strengths_count: pep3Latest.performance_profile?.strengths?.length || 0,
                needs_count: pep3Latest.performance_profile?.areas_of_need?.length || 0,
              }
            : null,
          icf: icfLatest
            ? {
                date: icfLatest.assessment_date,
                functioning_summary: icfLatest.functioning_profile?.functional_summary_ar,
              }
            : null,
        },
        developmental_milestones: milestonesRecord
          ? {
              developmental_quotient:
                milestonesRecord.developmental_summary?.developmental_quotient,
              profile: milestonesRecord.developmental_summary?.profile_description_ar,
              delays: milestonesRecord.developmental_summary?.domains_delayed?.length || 0,
            }
          : null,
        assessment_history: history,
        next_assessments_due: history
          .filter(h => h.next_assessment_due > new Date())
          .map(h => ({
            type: h.assessment_type,
            due_date: h.next_assessment_due,
          })),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /standard-assessments/milestones/bank
 * بنك معالم التطور المعياري
 */
router.get('/milestones-bank', (req, res) => {
  const domain = req.query.domain;
  const bank = domain
    ? DEVELOPMENTAL_MILESTONES_BANK.filter(m => m.domain === domain)
    : DEVELOPMENTAL_MILESTONES_BANK;
  res.json({ success: true, count: bank.length, data: bank });
});

module.exports = router;

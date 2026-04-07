/**
 * ═══════════════════════════════════════════════════════════════
 * 📊 Assessment Scales Routes — مسارات وحدة المقاييس والتقييمات السريرية
 * ═══════════════════════════════════════════════════════════════
 *
 * prompt_06: وحدة المقاييس والتقييمات (Assessments & Scales Module)
 *
 * المسارات:
 *  /api/assessment-scales/tools/...              — مكتبة المقاييس
 *  /api/assessment-scales/clinical/...           — التقييمات السريرية
 *  /api/assessment-scales/clinical/:id/administer — تطبيق التقييم
 *  /api/assessment-scales/clinical/:id/report     — توليد التقارير
 */

'use strict';

const express = require('express');
const safeError = require('../utils/safeError');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

// Models
const AssessmentTool = require('../models/assessmentScales/AssessmentTool');
const AssessmentToolDomain = require('../models/assessmentScales/AssessmentToolDomain');
const AssessmentToolItem = require('../models/assessmentScales/AssessmentToolItem');
const ClinicalAssessment = require('../models/assessmentScales/ClinicalAssessment');
const AssessmentDomainScore = require('../models/assessmentScales/AssessmentDomainScore');
const AssessmentItemResponse = require('../models/assessmentScales/AssessmentItemResponse');
const AssessmentReport = require('../models/assessmentScales/AssessmentReport');

// Services
const {
  AssessmentService,
  ToolLibraryService,
  ComparisonService,
  ReportService,
} = require('../services/assessmentScales/AssessmentScalesService');

// ─── Health ──────────────────────────────────────────────────────
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    module: 'assessment-scales',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ── Auth middleware لجميع المسارات التالية ──────────────────────
router.use(authenticate);

// ════════════════════════════════════════════════════════════════
// 1. مكتبة المقاييس — Assessment Tools Library
// ════════════════════════════════════════════════════════════════

/**
 * GET /tools — قائمة المقاييس مع فلاتر
 */
router.get('/tools', async (req, res) => {
  try {
    const {
      category,
      specialization,
      search,
      age_months,
      is_active,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = { is_deleted: { $ne: true } };
    if (is_active !== undefined) filter.is_active = is_active === 'true';
    else filter.is_active = true;
    if (category) filter.category = category;
    if (specialization) filter.specializations = specialization;

    if (search) {
      const rx = new RegExp(search, 'i');
      filter.$or = [{ name_ar: rx }, { name_en: rx }, { abbreviation: rx }, { code: rx }];
    }

    if (age_months) {
      const age = parseFloat(age_months);
      filter.min_age_months = { $lte: age };
      filter.$or = filter.$or || [];
      filter.$and = [
        ...(filter.$and || []),
        { $or: [{ max_age_months: null }, { max_age_months: { $gte: age } }] },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [tools, total] = await Promise.all([
      AssessmentTool.find(filter)
        .sort({ sort_order: 1, name_ar: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      AssessmentTool.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: tools,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    safeError(res, err);
  }
});

/**
 * GET /tools/stats — إحصائيات مكتبة المقاييس
 */
router.get('/tools/stats', async (req, res) => {
  try {
    const stats = await ToolLibraryService.getLibraryStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    safeError(res, err);
  }
});

/**
 * GET /tools/suitable — المقاييس المناسبة لعمر/تخصص معين
 */
router.get('/tools/suitable', async (req, res) => {
  try {
    const { age_months, specialization, category } = req.query;
    if (!age_months) return res.status(400).json({ success: false, error: 'age_months مطلوب' });
    const tools = await ToolLibraryService.findSuitableTools(
      parseFloat(age_months),
      specialization || null,
      category || null
    );
    res.json({ success: true, data: tools });
  } catch (err) {
    safeError(res, err);
  }
});

/**
 * GET /tools/:id — تفاصيل مقياس
 */
router.get('/tools/:id', async (req, res) => {
  try {
    const tool = await ToolLibraryService.getFullTool(req.params.id);
    if (!tool) return res.status(404).json({ success: false, error: 'المقياس غير موجود' });
    res.json({ success: true, data: tool });
  } catch (err) {
    safeError(res, err);
  }
});

/**
 * POST /tools — إنشاء مقياس جديد (Admin)
 */
router.post('/tools', async (req, res) => {
  try {
    const tool = await AssessmentTool.create({ ...req.body, created_by: req.user._id });
    res.status(201).json({ success: true, data: tool, message: 'تم إنشاء المقياس بنجاح' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * PUT /tools/:id — تعديل مقياس
 */
router.put('/tools/:id', async (req, res) => {
  try {
    const tool = await AssessmentTool.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!tool) return res.status(404).json({ success: false, error: 'المقياس غير موجود' });
    res.json({ success: true, data: tool, message: 'تم تعديل المقياس بنجاح' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /tools/:toolId/domains — إضافة مجال لمقياس
 */
router.post('/tools/:toolId/domains', async (req, res) => {
  try {
    const tool = await AssessmentTool.findById(req.params.toolId);
    if (!tool) return res.status(404).json({ success: false, error: 'المقياس غير موجود' });
    const maxOrder = await AssessmentToolDomain.findOne({ tool_id: tool._id })
      .sort({ sort_order: -1 })
      .select('sort_order')
      .lean();
    const domain = await AssessmentToolDomain.create({
      ...req.body,
      tool_id: tool._id,
      sort_order: (maxOrder?.sort_order || 0) + 1,
    });
    res.status(201).json({ success: true, data: domain, message: 'تم إضافة المجال بنجاح' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /tools/domains/:domainId/items — إضافة بنود لمجال
 */
router.post('/tools/domains/:domainId/items', async (req, res) => {
  try {
    const domain = await AssessmentToolDomain.findById(req.params.domainId);
    if (!domain) return res.status(404).json({ success: false, error: 'المجال غير موجود' });

    const items = Array.isArray(req.body.items) ? req.body.items : [req.body];
    const created = await AssessmentToolItem.insertMany(
      items.map((item, i) => ({
        ...item,
        tool_id: domain.tool_id,
        domain_id: domain._id,
        sort_order: item.sort_order ?? i + 1,
      }))
    );

    await AssessmentToolDomain.findByIdAndUpdate(domain._id, {
      items_count: await AssessmentToolItem.countDocuments({ domain_id: domain._id }),
    });

    res
      .status(201)
      .json({ success: true, data: created, message: `تم إضافة ${created.length} بند بنجاح` });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════
// 2. التقييمات السريرية — Clinical Assessments
// ════════════════════════════════════════════════════════════════

/**
 * GET /clinical — قائمة التقييمات مع فلاتر
 */
router.get('/clinical', async (req, res) => {
  try {
    const {
      beneficiary_id,
      tool_id,
      assessor_id,
      branch_id,
      status,
      assessment_type,
      date_from,
      date_to,
      search,
      page = 1,
      limit = 25,
    } = req.query;

    const filter = { is_deleted: { $ne: true } };
    if (beneficiary_id) filter.beneficiary_id = beneficiary_id;
    if (tool_id) filter.tool_id = tool_id;
    if (assessor_id) filter.assessor_id = assessor_id;
    if (branch_id) filter.branch_id = branch_id;
    if (status) filter.status = status;
    if (assessment_type) filter.assessment_type = assessment_type;
    if (date_from || date_to) {
      filter.assessment_date = {};
      if (date_from) filter.assessment_date.$gte = new Date(date_from);
      if (date_to) filter.assessment_date.$lte = new Date(date_to);
    }
    if (search) {
      filter.$or = [{ assessment_number: new RegExp(search, 'i') }];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [assessments, total] = await Promise.all([
      ClinicalAssessment.find(filter)
        .populate('beneficiary_id', 'full_name_ar file_number')
        .populate('tool_id', 'name_ar abbreviation category')
        .populate('assessor_id', 'name')
        .sort({ assessment_date: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      ClinicalAssessment.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: assessments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    safeError(res, err);
  }
});

/**
 * GET /clinical/stats — إحصائيات التقييمات
 */
router.get('/clinical/stats', async (req, res) => {
  try {
    const filters = {};
    if (req.query.branch_id) filters.branch_id = req.query.branch_id;
    if (req.query.assessor_id) filters.assessor_id = req.query.assessor_id;
    const stats = await ClinicalAssessment.getStats(filters);
    res.json({ success: true, data: stats });
  } catch (err) {
    safeError(res, err);
  }
});

/**
 * GET /clinical/beneficiary/:beneficiaryId/timeline — الخط الزمني لمستفيد
 */
router.get('/clinical/beneficiary/:beneficiaryId/timeline', async (req, res) => {
  try {
    const timeline = await ClinicalAssessment.getBeneficiaryTimeline(req.params.beneficiaryId);
    res.json({ success: true, data: timeline });
  } catch (err) {
    safeError(res, err);
  }
});

/**
 * GET /clinical/beneficiary/:beneficiaryId/chart — رسم بياني تطور المستفيد
 */
router.get('/clinical/beneficiary/:beneficiaryId/chart', async (req, res) => {
  try {
    const { tool_id } = req.query;
    if (!tool_id) return res.status(400).json({ success: false, error: 'tool_id مطلوب' });
    const chartData = await AssessmentService.getProgressChartData(
      req.params.beneficiaryId,
      tool_id
    );
    res.json({ success: true, data: chartData });
  } catch (err) {
    safeError(res, err);
  }
});

/**
 * POST /clinical — إنشاء تقييم جديد
 */
router.post('/clinical', async (req, res) => {
  try {
    const assessment = await AssessmentService.createAssessment(req.body, req.user._id);
    res.status(201).json({
      success: true,
      data: assessment,
      message: 'تم إنشاء التقييم. ابدأ التطبيق الآن.',
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * GET /clinical/:id — تفاصيل تقييم
 */
router.get('/clinical/:id', async (req, res) => {
  try {
    const assessment = await ClinicalAssessment.findById(req.params.id)
      .populate('tool_id', 'name_ar name_en abbreviation category code scoring_system version')
      .populate('beneficiary_id', 'full_name_ar file_number date_of_birth disability_type')
      .populate('assessor_id', 'name')
      .populate('branch_id', 'name_ar')
      .populate('reviewed_by', 'name')
      .populate('approved_by', 'name')
      .lean();
    if (!assessment || assessment.is_deleted) {
      return res.status(404).json({ success: false, error: 'التقييم غير موجود' });
    }

    // درجات المجالات
    const domainScores = await AssessmentDomainScore.find({ assessment_id: assessment._id })
      .populate('domain_id', 'name_ar name_en code sort_order')
      .lean();

    // التقرير (إن وُجد)
    const report = await AssessmentReport.findOne({ assessment_id: assessment._id }).lean();

    res.json({ success: true, data: { ...assessment, domain_scores: domainScores, report } });
  } catch (err) {
    safeError(res, err);
  }
});

/**
 * GET /clinical/:id/administer — صفحة تطبيق التقييم (الأهم)
 * تُعيد التقييم + المقياس الكامل + الإجابات المحفوظة + التقييم السابق
 */
router.get('/clinical/:id/administer', async (req, res) => {
  try {
    const assessment = await ClinicalAssessment.findById(req.params.id)
      .populate('beneficiary_id', 'full_name_ar file_number date_of_birth')
      .lean();
    if (!assessment || assessment.is_deleted) {
      return res.status(404).json({ success: false, error: 'التقييم غير موجود' });
    }

    // المقياس الكامل مع مجالاته وبنوده
    const fullTool = await ToolLibraryService.getFullTool(assessment.tool_id);

    // الإجابات المحفوظة
    const responsesMap = await AssessmentItemResponse.getResponsesMap(assessment._id);

    // التقييم السابق للمقارنة
    let previousResponses = {};
    if (assessment.previous_assessment_id) {
      previousResponses = await AssessmentItemResponse.getResponsesMap(
        assessment.previous_assessment_id
      );
    }

    // عمر المستفيد بالأشهر
    const dob = assessment.beneficiary_id?.date_of_birth;
    const ageMonths = dob
      ? Math.floor((Date.now() - new Date(dob)) / (1000 * 60 * 60 * 24 * 30.44))
      : null;

    res.json({
      success: true,
      data: {
        assessment,
        tool: fullTool,
        responses_map: responsesMap,
        previous_responses: previousResponses,
        beneficiary_age_months: ageMonths,
      },
    });
  } catch (err) {
    safeError(res, err);
  }
});

/**
 * POST /clinical/:id/save-item — حفظ إجابة بند (للحفظ الفوري / AutoSave)
 */
router.post('/clinical/:id/save-item', async (req, res) => {
  try {
    const result = await AssessmentService.saveItemResponse(req.params.id, req.body, req.user._id);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /clinical/:id/batch-save — حفظ دفعة من الإجابات
 */
router.post('/clinical/:id/batch-save', async (req, res) => {
  try {
    const { responses } = req.body;
    if (!Array.isArray(responses)) {
      return res.status(400).json({ success: false, error: 'responses يجب أن يكون مصفوفة' });
    }
    const result = await AssessmentService.batchSaveResponses(
      req.params.id,
      responses,
      req.user._id
    );
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /clinical/:id/complete — إكمال التقييم وحساب النتائج
 */
router.post('/clinical/:id/complete', async (req, res) => {
  try {
    const {
      behavioral_observations,
      clinical_interpretation_ar,
      clinical_interpretation_en,
      strengths_ar,
      weaknesses_ar,
      recommendations_ar,
      recommendations_en,
    } = req.body;

    const assessment = await AssessmentService.completeAssessment(
      req.params.id,
      {
        behavioral_observations,
        clinical_interpretation_ar,
        clinical_interpretation_en,
        strengths_ar,
        weaknesses_ar,
        recommendations_ar,
        recommendations_en,
      },
      req.user._id
    );
    res.json({ success: true, data: assessment, message: 'تم إكمال التقييم وحساب النتائج بنجاح' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * PUT /clinical/:id — تعديل تقييم (معلومات عامة)
 */
router.put('/clinical/:id', async (req, res) => {
  try {
    const assessment = await ClinicalAssessment.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updated_by: req.user._id },
      { new: true, runValidators: true }
    );
    if (!assessment) return res.status(404).json({ success: false, error: 'التقييم غير موجود' });
    res.json({ success: true, data: assessment, message: 'تم تعديل التقييم' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /clinical/:id/review — مراجعة التقييم
 */
router.post('/clinical/:id/review', async (req, res) => {
  try {
    const assessment = await ClinicalAssessment.findByIdAndUpdate(
      req.params.id,
      {
        status: 'reviewed',
        reviewed_by: req.user._id,
        reviewed_at: new Date(),
        review_notes: req.body.review_notes,
      },
      { new: true }
    );
    if (!assessment) return res.status(404).json({ success: false, error: 'التقييم غير موجود' });
    res.json({ success: true, data: assessment, message: 'تمت مراجعة التقييم بنجاح' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /clinical/:id/approve — اعتماد التقييم
 */
router.post('/clinical/:id/approve', async (req, res) => {
  try {
    const assessment = await ClinicalAssessment.findByIdAndUpdate(
      req.params.id,
      {
        status: 'approved',
        approved_by: req.user._id,
        approved_at: new Date(),
      },
      { new: true }
    );
    if (!assessment) return res.status(404).json({ success: false, error: 'التقييم غير موجود' });
    res.json({ success: true, data: assessment, message: 'تم اعتماد التقييم بنجاح' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /clinical/:id — حذف ناعم للتقييم
 */
router.delete('/clinical/:id', async (req, res) => {
  try {
    await ClinicalAssessment.findByIdAndUpdate(req.params.id, {
      is_deleted: true,
      deleted_at: new Date(),
    });
    res.json({ success: true, message: 'تم حذف التقييم' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════
// 3. التقارير — Reports
// ════════════════════════════════════════════════════════════════

/**
 * POST /clinical/:id/generate-report — توليد تقرير
 */
router.post('/clinical/:id/generate-report', async (req, res) => {
  try {
    const report = await ReportService.generateReport(req.params.id, req.user._id);
    res.json({ success: true, data: report, message: 'تم توليد التقرير بنجاح' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * GET /clinical/:id/report — الحصول على تقرير تقييم
 */
router.get('/clinical/:id/report', async (req, res) => {
  try {
    const report = await AssessmentReport.findOne({ assessment_id: req.params.id })
      .populate('generated_by', 'name')
      .populate('signed_by', 'name')
      .lean();
    if (!report) return res.status(404).json({ success: false, error: 'لم يُولَّد تقرير بعد' });
    res.json({ success: true, data: report });
  } catch (err) {
    safeError(res, err);
  }
});

/**
 * POST /clinical/:id/report/sign — توقيع التقرير
 */
router.post('/clinical/:id/report/sign', async (req, res) => {
  try {
    const report = await AssessmentReport.findOneAndUpdate(
      { assessment_id: req.params.id },
      { status: 'signed', signed_by: req.user._id, signed_at: new Date() },
      { new: true }
    );
    if (!report) return res.status(404).json({ success: false, error: 'التقرير غير موجود' });
    res.json({ success: true, data: report, message: 'تم توقيع التقرير' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════
// 4. المقارنات — Comparisons
// ════════════════════════════════════════════════════════════════

/**
 * POST /compare — مقارنة تقييمين
 */
router.post('/compare', async (req, res) => {
  try {
    const { assessment_1_id, assessment_2_id } = req.body;
    if (!assessment_1_id || !assessment_2_id) {
      return res.status(400).json({ success: false, error: 'كلا التقييمين مطلوبان' });
    }
    const comparison = await ComparisonService.generateComparison(assessment_2_id, assessment_1_id);
    res.json({ success: true, data: comparison });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * GET /clinical/:id/domain-scores — درجات مجالات تقييم
 */
router.get('/clinical/:id/domain-scores', async (req, res) => {
  try {
    const scores = await AssessmentDomainScore.find({ assessment_id: req.params.id })
      .populate('domain_id', 'name_ar name_en code sort_order scoring_type')
      .sort({ 'domain_id.sort_order': 1 })
      .lean();
    res.json({ success: true, data: scores });
  } catch (err) {
    safeError(res, err);
  }
});

module.exports = router;

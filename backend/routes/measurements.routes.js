// Route - Measurements
const express = require('express');
const { safeError } = require('../utils/safeError');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { paginate } = require('../utils/paginate');

const MAX_PAGE_LIMIT = 100;

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Measurements module active' });
});

const {
  MeasurementType,
  MeasurementMaster,
  MeasurementResult,
  IndividualRehabPlan,
  QuickAssessment,
} = require('../models/MeasurementModels');

const {
  RehabilitationProgram,
  ProgramProgress,
  ProgramCategory,
  ProgramSession,
} = require('../models/RehabilitationProgramModels');

const MeasurementService = require('../services/MeasurementService');
const SmartEngine = require('../services/SmartMeasurementProgramEngine');
const measurementService = new MeasurementService();

// All data routes require authentication
router.use(authenticate);

// ============================
// 1. مسارات أنواع المقاييس
// ============================

/**
 * الحصول على جميع أنواع المقاييس
 * GET /api/measurements/types
 */
router.get('/types', async (req, res) => {
  try {
    const { category, targetDisability } = req.query;

    const query = { isActive: true };
    if (category) query.category = category;
    if (targetDisability) query.targetDisabilities = targetDisability;

    const q = MeasurementType.find(query).select(
      'code nameAr nameEn category description targetDisabilities'
    );
    const { data, meta } = await paginate(q, req.query);

    res.json({
      success: true,
      data,
      ...meta,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم' });
  }
});

/**
 * إنشاء نوع مقياس جديد
 * POST /api/measurements/types
 */
router.post('/types', async (req, res) => {
  try {
    const newType = await measurementService.createMeasurementType(req.body);

    res.status(201).json({
      success: true,
      message: 'تم إنشاء نوع المقياس بنجاح',
      data: newType,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: 'خطأ في البيانات المدخلة' });
  }
});

// ============================
// 2. مسارات المقاييس الرئيسية
// ============================

/**
 * الحصول على جميع المقاييس
 * GET /api/measurements/masters
 */
router.get('/masters', async (req, res) => {
  try {
    const { typeId, targetDisability } = req.query;

    const query = { isActive: true };
    if (typeId) query.typeId = typeId;
    if (targetDisability) query.targetDisabilities = targetDisability;

    const q = MeasurementMaster.find(query)
      .populate('typeId')
      .select('code nameAr nameEn version ageRange estimatedDuration');
    const { data, meta } = await paginate(q, req.query);

    res.json({
      success: true,
      data,
      ...meta,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم' });
  }
});

/**
 * إنشاء مقياس رئيسي
 * POST /api/measurements/masters
 */
router.post('/masters', async (req, res) => {
  try {
    const newMaster = await measurementService.createMeasurementMaster(req.body);

    res.status(201).json({
      success: true,
      message: 'تم إنشاء المقياس بنجاح',
      data: newMaster,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: 'خطأ في البيانات المدخلة' });
  }
});

/**
 * الحصول على تفاصيل المقياس
 * GET /api/measurements/masters/:id
 */
router.get('/masters/:id', async (req, res) => {
  try {
    const master = await MeasurementMaster.findById(req.params.id).populate('typeId');

    if (!master) {
      return res.status(404).json({ success: false, error: 'المقياس غير موجود' });
    }

    res.json({
      success: true,
      data: master,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم' });
  }
});

// ============================
// 3. مسارات نتائج القياسات
// ============================

/**
 * تسجيل نتيجة قياس جديدة
 * POST /api/measurements/results/:beneficiaryId
 */
router.post('/results/:beneficiaryId', async (req, res) => {
  try {
    const { beneficiaryId } = req.params;

    const result = await measurementService.recordMeasurementResult(beneficiaryId, req.body);

    res.status(201).json({
      success: true,
      message: 'تم تسجيل نتيجة القياس بنجاح وتم تفعيل البرامج المناسبة',
      data: result,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: 'خطأ في البيانات المدخلة' });
  }
});

/**
 * الحصول على نتائج المستفيد
 * GET /api/measurements/results/:beneficiaryId
 */
router.get('/results/:beneficiaryId', async (req, res) => {
  try {
    const results = await measurementService.getBeneficiaryLatestResults(req.params.beneficiaryId);

    res.json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم' });
  }
});

/**
 * مقارنة نتائج القياس عبر الزمن
 * GET /api/measurements/results/:beneficiaryId/compare/:typeId
 */
router.get('/results/:beneficiaryId/compare/:typeId', async (req, res) => {
  try {
    const comparison = await measurementService.compareMeasurementResults(
      req.params.beneficiaryId,
      req.params.typeId
    );

    res.json({
      success: true,
      data: comparison,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم' });
  }
});

/**
 * الموافقة على نتيجة قياس
 * PUT /api/measurements/results/:resultId/approve
 */
router.put('/results/:resultId/approve', async (req, res) => {
  try {
    const updated = await MeasurementResult.findByIdAndUpdate(
      req.params.resultId,
      {
        status: 'APPROVED',
        approvalInfo: {
          approvedBy: req.user._id,
          approvalDate: new Date(),
          approvalNotes: req.body.approvalNotes,
        },
      },
      { new: true }
    );

    res.json({
      success: true,
      message: 'تم الموافقة على نتيجة القياس',
      data: updated,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم' });
  }
});

// ============================
// 4. مسارات الخطط التأهيلية الفردية
// ============================

/**
 * إنشاء خطة تأهيلية فردية
 * POST /api/rehabilitation-plans/:beneficiaryId
 */
router.post('/:beneficiaryId', async (req, res) => {
  try {
    const plan = await measurementService.createIndividualRehabPlan(
      req.params.beneficiaryId,
      req.body
    );

    res.status(201).json({
      success: true,
      message: 'تم إنشاء خطة التأهيل الفردية بنجاح',
      data: plan,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: 'خطأ في البيانات المدخلة' });
  }
});

/**
 * الحصول على خطة التأهيل الفردية
 * GET /api/rehabilitation-plans/:beneficiaryId
 */
router.get('/:beneficiaryId', async (req, res) => {
  try {
    const plan = await measurementService.getIndividualRehabPlan(req.params.beneficiaryId);

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'لم يتم العثور على خطة التأهيل',
      });
    }

    res.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم' });
  }
});

/**
 * تحديث خطة التأهيل الفردية
 * PUT /api/rehabilitation-plans/:planId
 */
router.put('/:planId', async (req, res) => {
  try {
    const updated = await measurementService.updateIndividualRehabPlan(req.params.planId, req.body);

    res.json({
      success: true,
      message: 'تم تحديث خطة التأهيل بنجاح',
      data: updated,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: 'خطأ في البيانات المدخلة' });
  }
});

/**
 * الموافقة على خطة التأهيل
 * PUT /api/rehabilitation-plans/:planId/approve
 */
router.put('/:planId/approve', async (req, res) => {
  try {
    const updated = await IndividualRehabPlan.findByIdAndUpdate(
      req.params.planId,
      {
        status: 'ACTIVE',
        approvalInfo: {
          approvedBy: req.user._id,
          approvalDate: new Date(),
          approvalNotes: req.body.approvalNotes,
        },
      },
      { new: true }
    );

    res.json({
      success: true,
      message: 'تم الموافقة على خطة التأهيل',
      data: updated,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم' });
  }
});

// ============================
// 5. مسارات البرامج التأهيلية
// ============================

/**
 * الحصول على جميع فئات البرامج
 * GET /api/programs/categories
 */
router.get('/categories', async (req, res) => {
  try {
    const q = ProgramCategory.find({ isActive: true });
    const { data, meta } = await paginate(q, req.query);

    res.json({
      success: true,
      data,
      ...meta,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم' });
  }
});

/**
 * الحصول على البرامج المتاحة
 * GET /api/programs
 */
router.get('/programs', async (req, res) => {
  try {
    const { category, disability, severity } = req.query;

    const query = { isActive: true, status: 'APPROVED' };
    if (category) query.categoryId = category;
    if (disability) query.targetDisabilities = disability;
    if (severity) query.suitableSeverityLevels = severity;

    const q = RehabilitationProgram.find(query)
      .populate('categoryId')
      .select('code nameAr nameEn categoryId targetDisabilities objectives');
    const { data, meta } = await paginate(q, req.query);

    res.json({
      success: true,
      data,
      ...meta,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم' });
  }
});

/**
 * الحصول على تفاصيل برنامج
 * GET /api/programs/:programId
 */
router.get('/programs/:programId', async (req, res) => {
  try {
    const program = await RehabilitationProgram.findById(req.params.programId).populate(
      'categoryId'
    );

    if (!program) {
      return res.status(404).json({ success: false, error: 'البرنامج غير موجود' });
    }

    res.json({
      success: true,
      data: program,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم' });
  }
});

// ============================
// 6. مسارات جلسات البرامج
// ============================

/**
 * تسجيل جلسة برنامج
 * POST /api/programs/sessions/:beneficiaryId/:programId
 */
router.post('/sessions/:beneficiaryId/:programId', async (req, res) => {
  try {
    const session = await measurementService.recordProgramSession(
      req.params.beneficiaryId,
      req.params.programId,
      req.body
    );

    res.status(201).json({
      success: true,
      message: 'تم تسجيل الجلسة بنجاح',
      data: session,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: 'خطأ في البيانات المدخلة' });
  }
});

/**
 * الحصول على جلسات برنامج
 * GET /api/programs/sessions/:beneficiaryId/:programId
 */
router.get('/sessions/:beneficiaryId/:programId', async (req, res) => {
  try {
    const q = ProgramSession.find({
      beneficiaryId: req.params.beneficiaryId,
      programId: req.params.programId,
    }).sort({ scheduledDate: -1 });
    const { data, meta } = await paginate(q, req.query);

    res.json({
      success: true,
      data,
      ...meta,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم' });
  }
});

// ============================
// 7. مسارات التقارير الشاملة
// ============================

/**
 * إنشاء تقرير شامل للمستفيد
 * GET /api/reports/:beneficiaryId/comprehensive
 */
router.get('/reports/:beneficiaryId/comprehensive', async (req, res) => {
  try {
    const report = await measurementService.generateComprehensiveReport(req.params.beneficiaryId);

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم' });
  }
});

/**
 * تتبع فعالية البرنامج
 * GET /api/programs/effectiveness/:progressId
 */
router.get('/programs/effectiveness/:progressId', async (req, res) => {
  try {
    const smartEngine = new SmartEngine();
    const effectiveness = await smartEngine.trackProgramEffectiveness(req.params.progressId);

    res.json({
      success: true,
      data: effectiveness,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم' });
  }
});

/**
 * الحصول على البرامج النشطة للمستفيد
 * GET /api/programs/active/:beneficiaryId
 */
router.get('/active/:beneficiaryId', async (req, res) => {
  try {
    const q = ProgramProgress.find({
      beneficiaryId: req.params.beneficiaryId,
      overallStatus: 'ACTIVE',
    })
      .populate('programId')
      .select(
        'programId enrollmentDate expectedCompletionDate completedSessions totalPlannedSessions'
      );
    const { data, meta } = await paginate(q, req.query);

    res.json({
      success: true,
      data,
      ...meta,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم' });
  }
});

/**
 * تقييم سريع (Quick Assessment)
 * POST /api/measurements/quick-assessment/:beneficiaryId
 */
router.post('/quick-assessment/:beneficiaryId', async (req, res) => {
  try {
    // جلب آخر تقييم سريع سابق لحساب الفرق
    const previousAssessment = await QuickAssessment.findOne({
      beneficiaryId: req.params.beneficiaryId,
      assessmentType: req.body.assessmentType,
    }).sort({ date: -1 });

    const assessmentData = {
      beneficiaryId: req.params.beneficiaryId,
      assessmentType: req.body.assessmentType,
      items: req.body.items,
      totalScore: req.body.totalScore,
      maxScore: req.body.maxScore,
      level: req.body.level,
      performedBy: req.user._id,
      duration: req.body.duration,
      environment: req.body.environment,
      observations: req.body.observations,
    };

    if (previousAssessment) {
      assessmentData.previousScoreRef = {
        assessmentId: previousAssessment._id,
        score: previousAssessment.totalScore,
        date: previousAssessment.date,
      };
    }

    const assessment = new QuickAssessment(assessmentData);
    await assessment.save();

    res.status(201).json({
      success: true,
      message: 'تم حفظ التقييم السريع',
      data: assessment,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: 'خطأ في البيانات المدخلة' });
  }
});

// ============================
// 8. مسارات لوحة المعلومات والتحليلات
// ============================

/**
 * لوحة معلومات المقاييس
 * GET /api/measurements/dashboard
 */
router.get('/dashboard', async (req, res) => {
  try {
    const filters = {};
    if (req.query.beneficiaryId) filters.beneficiaryId = req.query.beneficiaryId;
    if (req.query.status) filters.status = req.query.status;
    if (req.query.fromDate) filters.fromDate = req.query.fromDate;

    const stats = await MeasurementResult.getDashboardStats(filters);

    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم' });
  }
});

/**
 * تحليل اتجاه المستفيد عبر الزمن
 * GET /api/measurements/trend/:beneficiaryId/:typeId
 */
router.get('/trend/:beneficiaryId/:typeId', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, MAX_PAGE_LIMIT);
    const trend = await MeasurementResult.getTrend(
      req.params.beneficiaryId,
      req.params.typeId,
      limit
    );

    res.json({ success: true, data: trend });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم' });
  }
});

/**
 * إحصائيات التقييم السريع حسب النوع
 * GET /api/measurements/quick-assessment/stats/:beneficiaryId
 */
router.get('/quick-assessment/stats/:beneficiaryId', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const beneficiaryId = new mongoose.Types.ObjectId(req.params.beneficiaryId);
    const stats = await QuickAssessment.getStatsByType(beneficiaryId);

    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم' });
  }
});

/**
 * تحديث نوع مقياس
 * PUT /api/measurements/types/:id
 */
router.put('/types/:id', async (req, res) => {
  try {
    const updated = await MeasurementType.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, error: 'نوع المقياس غير موجود' });
    }

    res.json({ success: true, message: 'تم تحديث نوع المقياس', data: updated });
  } catch (error) {
    res.status(400).json({ success: false, error: 'خطأ في البيانات المدخلة' });
  }
});

/**
 * حذف نوع مقياس (إلغاء تفعيل)
 * DELETE /api/measurements/types/:id
 */
router.delete('/types/:id', async (req, res) => {
  try {
    const updated = await MeasurementType.findByIdAndUpdate(
      req.params.id,
      { isActive: false, updatedAt: new Date() },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, error: 'نوع المقياس غير موجود' });
    }

    res.json({ success: true, message: 'تم إلغاء تفعيل نوع المقياس' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم' });
  }
});

/**
 * تحديث مقياس رئيسي
 * PUT /api/measurements/masters/:id
 */
router.put('/masters/:id', async (req, res) => {
  try {
    const updated = await MeasurementMaster.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, error: 'المقياس غير موجود' });
    }

    res.json({ success: true, message: 'تم تحديث المقياس', data: updated });
  } catch (error) {
    res.status(400).json({ success: false, error: 'خطأ في البيانات المدخلة' });
  }
});

/**
 * حذف مقياس رئيسي (إلغاء تفعيل)
 * DELETE /api/measurements/masters/:id
 */
router.delete('/masters/:id', async (req, res) => {
  try {
    const updated = await MeasurementMaster.findByIdAndUpdate(
      req.params.id,
      { isActive: false, updatedAt: new Date() },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, error: 'المقياس غير موجود' });
    }

    res.json({ success: true, message: 'تم إلغاء تفعيل المقياس' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم' });
  }
});

/**
 * تقييم جماعي (Batch)
 * POST /api/measurements/batch-assessment
 */
router.post('/batch-assessment', async (req, res) => {
  try {
    const { beneficiaryId, assessments } = req.body;
    if (!beneficiaryId || !Array.isArray(assessments) || assessments.length === 0) {
      return res.status(400).json({ success: false, error: 'بيانات غير صالحة' });
    }

    const results = [];
    const errors = [];

    for (const assessment of assessments) {
      try {
        const result = await measurementService.recordMeasurementResult(beneficiaryId, assessment);
        results.push(result);
      } catch (err) {
        errors.push({ assessment: assessment.measurementId, error: safeError(err) });
      }
    }

    res.status(results.length > 0 ? 201 : 400).json({
      success: results.length > 0,
      message: `تم تسجيل ${results.length} من ${assessments.length} نتائج`,
      data: results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: 'خطأ في البيانات المدخلة' });
  }
});

/**
 * ملخص تقدم خطة التأهيل
 * GET /api/measurements/rehab-plan/:beneficiaryId/progress
 */
router.get('/rehab-plan/:beneficiaryId/progress', async (req, res) => {
  try {
    const plan = await measurementService.getIndividualRehabPlan(req.params.beneficiaryId);

    if (!plan) {
      return res.status(404).json({ success: false, error: 'لم يتم العثور على خطة التأهيل' });
    }

    const summary = plan.getProgressSummary();

    res.json({
      success: true,
      data: {
        planCode: plan.planCode,
        status: plan.status,
        progress: summary,
        milestones: plan.milestones,
        lastReview: plan.reviews?.length ? plan.reviews[plan.reviews.length - 1] : null,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم' });
  }
});

module.exports = router;

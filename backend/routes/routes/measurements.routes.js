// Stub route - Measurements
const express = require('express');
const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'unavailable', message: 'Measurements module not ready' });
});

// Catch-all
router.all('*', (req, res) => {
  res.status(503).json({
    success: false,
    message: 'Measurements service unavailable',
    status: 'UNAVAILABLE'
  });
});
const { 
  MeasurementType,
  MeasurementMaster,
  MeasurementResult,
  IndividualRehabPlan,
  QuickAssessment
} = require('../models/MeasurementModels');

const {
  RehabilitationProgram,
  ProgramProgress,
  ProgramCategory,
  ProgramSession
} = require('../models/RehabilitationProgramModels');

const measurementService = new MeasurementService();

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
    
    let query = { isActive: true };
    if (category) query.category = category;
    if (targetDisability) query.targetDisabilities = targetDisability;

    const types = await MeasurementType.find(query)
      .select('code nameAr nameEn category description targetDisabilities');

    res.json({
      success: true,
      count: types.length,
      data: types
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
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
      data: newType
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
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
    
    let query = { isActive: true };
    if (typeId) query.typeId = typeId;
    if (targetDisability) query.targetDisabilities = targetDisability;

    const masters = await MeasurementMaster.find(query)
      .populate('typeId')
      .select('code nameAr nameEn version ageRange estimatedDuration');

    res.json({
      success: true,
      count: masters.length,
      data: masters
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
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
      data: newMaster
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * الحصول على تفاصيل المقياس
 * GET /api/measurements/masters/:id
 */
router.get('/masters/:id', async (req, res) => {
  try {
    const master = await MeasurementMaster.findById(req.params.id)
      .populate('typeId');

    if (!master) {
      return res.status(404).json({ success: false, error: 'المقياس غير موجود' });
    }

    res.json({
      success: true,
      data: master
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
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
    
    const result = await measurementService.recordMeasurementResult(
      beneficiaryId,
      req.body
    );

    res.status(201).json({
      success: true,
      message: 'تم تسجيل نتيجة القياس بنجاح وتم تفعيل البرامج المناسبة',
      data: result
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * الحصول على نتائج المستفيد
 * GET /api/measurements/results/:beneficiaryId
 */
router.get('/results/:beneficiaryId', async (req, res) => {
  try {
    const results = await measurementService.getBeneficiaryLatestResults(
      req.params.beneficiaryId
    );

    res.json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
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
      data: comparison
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
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
          approvalNotes: req.body.approvalNotes
        }
      },
      { new: true }
    );

    res.json({
      success: true,
      message: 'تم الموافقة على نتيجة القياس',
      data: updated
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
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
      data: plan
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * الحصول على خطة التأهيل الفردية
 * GET /api/rehabilitation-plans/:beneficiaryId
 */
router.get('/:beneficiaryId', async (req, res) => {
  try {
    const plan = await measurementService.getIndividualRehabPlan(
      req.params.beneficiaryId
    );

    if (!plan) {
      return res.status(404).json({ 
        success: false, 
        error: 'لم يتم العثور على خطة التأهيل' 
      });
    }

    res.json({
      success: true,
      data: plan
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * تحديث خطة التأهيل الفردية
 * PUT /api/rehabilitation-plans/:planId
 */
router.put('/:planId', async (req, res) => {
  try {
    const updated = await measurementService.updateIndividualRehabPlan(
      req.params.planId,
      req.body
    );

    res.json({
      success: true,
      message: 'تم تحديث خطة التأهيل بنجاح',
      data: updated
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
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
          approvalNotes: req.body.approvalNotes
        }
      },
      { new: true }
    );

    res.json({
      success: true,
      message: 'تم الموافقة على خطة التأهيل',
      data: updated
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
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
    const categories = await ProgramCategory.find({ isActive: true });
    
    res.json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * الحصول على البرامج المتاحة
 * GET /api/programs
 */
router.get('/programs', async (req, res) => {
  try {
    const { category, disability, severity } = req.query;
    
    let query = { isActive: true, status: 'APPROVED' };
    if (category) query.categoryId = category;
    if (disability) query.targetDisabilities = disability;
    if (severity) query.suitableSeverityLevels = severity;

    const programs = await RehabilitationProgram.find(query)
      .populate('categoryId')
      .select('code nameAr nameEn categoryId targetDisabilities objectives');

    res.json({
      success: true,
      count: programs.length,
      data: programs
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * الحصول على تفاصيل برنامج
 * GET /api/programs/:programId
 */
router.get('/programs/:programId', async (req, res) => {
  try {
    const program = await RehabilitationProgram.findById(req.params.programId)
      .populate('categoryId');

    if (!program) {
      return res.status(404).json({ success: false, error: 'البرنامج غير موجود' });
    }

    res.json({
      success: true,
      data: program
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
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
      data: session
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * الحصول على جلسات برنامج
 * GET /api/programs/sessions/:beneficiaryId/:programId
 */
router.get('/sessions/:beneficiaryId/:programId', async (req, res) => {
  try {
    const sessions = await ProgramSession.find({
      beneficiaryId: req.params.beneficiaryId,
      programId: req.params.programId
    }).sort({ scheduledDate: -1 });

    res.json({
      success: true,
      count: sessions.length,
      data: sessions
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
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
    const report = await measurementService.generateComprehensiveReport(
      req.params.beneficiaryId
    );

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * تتبع فعالية البرنامج
 * GET /api/programs/effectiveness/:progressId
 */
router.get('/programs/effectiveness/:progressId', async (req, res) => {
  try {
    const smartEngine = new SmartEngine();
    const effectiveness = await smartEngine.trackProgramEffectiveness(
      req.params.progressId
    );

    res.json({
      success: true,
      data: effectiveness
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * الحصول على البرامج النشطة للمستفيد
 * GET /api/programs/active/:beneficiaryId
 */
router.get('/active/:beneficiaryId', async (req, res) => {
  try {
    const activePrograms = await ProgramProgress.find({
      beneficiaryId: req.params.beneficiaryId,
      overallStatus: 'ACTIVE'
    })
      .populate('programId')
      .select('programId enrollmentDate expectedCompletionDate completedSessions totalPlannedSessions');

    res.json({
      success: true,
      count: activePrograms.length,
      data: activePrograms
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * تقييم سريع (Quick Assessment)
 * POST /api/measurements/quick-assessment/:beneficiaryId
 */
router.post('/quick-assessment/:beneficiaryId', async (req, res) => {
  try {
    const assessment = new QuickAssessment({
      beneficiaryId: req.params.beneficiaryId,
      assessmentType: req.body.assessmentType,
      items: req.body.items,
      totalScore: req.body.totalScore,
      level: req.body.level,
      performedBy: req.user._id
    });

    await assessment.save();

    res.status(201).json({
      success: true,
      message: 'تم حفظ التقييم السريع',
      data: assessment
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;

/**
 * AI Diagnostic Routes — مسارات الذكاء الاصطناعي للتشخيص
 * Phase 17
 */
const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { authenticateToken: authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const svc = require('../services/aiDiagnostic.service');

const router = express.Router();

/* ── helpers ── */
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
};
const _getUserId = req => req.user?.id || req.user?.userId || 'u1';
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/* ────────────────────────────────────────────
   DASHBOARD — لوحة التحكم
   ──────────────────────────────────────────── */
router.get(
  '/dashboard',
  authenticate, requireBranchAccess, requireBranchAccess,
  wrap((req, res) => {
    const data = svc.getDashboard();
    res.json({ success: true, data });
  })
);

/* ────────────────────────────────────────────
   REFERENCE DATA — بيانات مرجعية
   ──────────────────────────────────────────── */
router.get('/scales', authenticate, requireBranchAccess, (req, res) =>
  res.json({ success: true, data: svc.getClinicalScales() })
);
router.get('/disability-types', authenticate, requireBranchAccess, (req, res) =>
  res.json({ success: true, data: svc.getDisabilityTypes() })
);
router.get('/therapy-types', authenticate, requireBranchAccess, (req, res) =>
  res.json({ success: true, data: svc.getTherapyTypes() })
);
router.get('/ai-models', authenticate, requireBranchAccess, (req, res) =>
  res.json({ success: true, data: svc.getAIModels() })
);

/* ────────────────────────────────────────────
   BENEFICIARIES — المستفيدون
   ──────────────────────────────────────────── */
router.get(
  '/beneficiaries',
  authenticate, requireBranchAccess, requireBranchAccess,
  wrap((req, res) => {
    const { page, limit, status, disabilityType, search } = req.query;
    const data = svc.listBeneficiaries({
      page: page ? +page : 1,
      limit: limit ? +limit : 20,
      status,
      disabilityType,
      search,
    });
    res.json({ success: true, ...data });
  })
);

router.get(
  '/beneficiaries/:id',
  authenticate, requireBranchAccess, requireBranchAccess,
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.getBeneficiary(req.params.id);
    res.json({ success: true, data });
  })
);

router.post(
  '/beneficiaries',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'manager', 'doctor']),
  [
    body('name').notEmpty().withMessage('اسم المستفيد مطلوب'),
    body('nationalId').notEmpty().withMessage('رقم الهوية مطلوب'),
    body('disabilityType').notEmpty().withMessage('نوع الإعاقة مطلوب'),
  ],
  handleValidation,
  wrap((req, res) => {
    const data = svc.createBeneficiary(req.body);
    res.status(201).json({ success: true, data });
  })
);

router.put(
  '/beneficiaries/:id',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'manager', 'doctor']),
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.updateBeneficiary(req.params.id, req.body);
    res.json({ success: true, data });
  })
);

/* ────────────────────────────────────────────
   ASSESSMENTS — التقييمات السريرية
   ──────────────────────────────────────────── */
router.get(
  '/beneficiaries/:beneficiaryId/assessments',
  authenticate, requireBranchAccess, requireBranchAccess,
  param('beneficiaryId').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const { scale, domain } = req.query;
    const data = svc.listAssessments(req.params.beneficiaryId, { scale, domain });
    res.json({ success: true, data });
  })
);

router.get(
  '/assessments/:id',
  authenticate, requireBranchAccess, requireBranchAccess,
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.getAssessment(req.params.id);
    res.json({ success: true, data });
  })
);

router.post(
  '/beneficiaries/:beneficiaryId/assessments',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'manager', 'doctor', 'therapist']),
  [
    param('beneficiaryId').notEmpty(),
    body('scale').notEmpty().withMessage('المقياس مطلوب'),
    body('score').isNumeric().withMessage('الدرجة مطلوبة'),
    body('assessor').notEmpty().withMessage('المقيّم مطلوب'),
  ],
  handleValidation,
  wrap((req, res) => {
    const data = svc.createAssessment({ ...req.body, beneficiaryId: req.params.beneficiaryId });
    res.status(201).json({ success: true, data });
  })
);

router.get(
  '/beneficiaries/:beneficiaryId/assessments/compare',
  authenticate, requireBranchAccess, requireBranchAccess,
  [
    param('beneficiaryId').notEmpty(),
    query('id1').notEmpty().withMessage('معرف التقييم الأول مطلوب'),
    query('id2').notEmpty().withMessage('معرف التقييم الثاني مطلوب'),
  ],
  handleValidation,
  wrap((req, res) => {
    const data = svc.compareAssessments(req.params.beneficiaryId, req.query.id1, req.query.id2);
    res.json({ success: true, data });
  })
);

/* ────────────────────────────────────────────
   SESSIONS — الجلسات العلاجية
   ──────────────────────────────────────────── */
router.get(
  '/beneficiaries/:beneficiaryId/sessions',
  authenticate, requireBranchAccess, requireBranchAccess,
  param('beneficiaryId').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const { therapyType, status } = req.query;
    const data = svc.listSessions(req.params.beneficiaryId, { therapyType, status });
    res.json({ success: true, data });
  })
);

router.get(
  '/sessions/:id',
  authenticate, requireBranchAccess, requireBranchAccess,
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.getSession(req.params.id);
    res.json({ success: true, data });
  })
);

router.post(
  '/beneficiaries/:beneficiaryId/sessions',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'manager', 'doctor', 'therapist']),
  [
    param('beneficiaryId').notEmpty(),
    body('therapistId').notEmpty().withMessage('معرف المعالج مطلوب'),
    body('therapyType').notEmpty().withMessage('نوع العلاج مطلوب'),
  ],
  handleValidation,
  wrap((req, res) => {
    const data = svc.createSession({ ...req.body, beneficiaryId: req.params.beneficiaryId });
    res.status(201).json({ success: true, data });
  })
);

router.put(
  '/sessions/:id/complete',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'manager', 'doctor', 'therapist']),
  [
    param('id').notEmpty(),
    body('engagement').isNumeric().withMessage('مستوى المشاركة مطلوب'),
    body('progressRating').isNumeric().withMessage('تقييم التقدم مطلوب'),
  ],
  handleValidation,
  wrap((req, res) => {
    const data = svc.completeSession(req.params.id, req.body);
    res.json({ success: true, data });
  })
);

/* ────────────────────────────────────────────
   GOALS — الأهداف العلاجية
   ──────────────────────────────────────────── */
router.get(
  '/beneficiaries/:beneficiaryId/goals',
  authenticate, requireBranchAccess, requireBranchAccess,
  param('beneficiaryId').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const { category, status } = req.query;
    const data = svc.listGoals(req.params.beneficiaryId, { category, status });
    res.json({ success: true, data });
  })
);

router.get(
  '/goals/:id',
  authenticate, requireBranchAccess, requireBranchAccess,
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.getGoal(req.params.id);
    res.json({ success: true, data });
  })
);

router.post(
  '/beneficiaries/:beneficiaryId/goals',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'manager', 'doctor']),
  [
    param('beneficiaryId').notEmpty(),
    body('category').notEmpty().withMessage('فئة الهدف مطلوبة'),
    body('title').notEmpty().withMessage('عنوان الهدف مطلوب'),
    body('targetDate').notEmpty().withMessage('تاريخ الهدف مطلوب'),
  ],
  handleValidation,
  wrap((req, res) => {
    const data = svc.createGoal({ ...req.body, beneficiaryId: req.params.beneficiaryId });
    res.status(201).json({ success: true, data });
  })
);

router.put(
  '/goals/:id/progress',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'manager', 'doctor', 'therapist']),
  [param('id').notEmpty(), body('progress').isNumeric().withMessage('نسبة التقدم مطلوبة')],
  handleValidation,
  wrap((req, res) => {
    const data = svc.updateGoalProgress(req.params.id, +req.body.progress, req.body.milestoneIndex);
    res.json({ success: true, data });
  })
);

/* ────────────────────────────────────────────
   TREATMENT PLANS — الخطط العلاجية
   ──────────────────────────────────────────── */
router.get(
  '/treatment-plans',
  authenticate, requireBranchAccess, requireBranchAccess,
  wrap((req, res) => {
    const { beneficiaryId, status } = req.query;
    const data = svc.listTreatmentPlans({ beneficiaryId, status });
    res.json({ success: true, data });
  })
);

router.get(
  '/treatment-plans/:id',
  authenticate, requireBranchAccess, requireBranchAccess,
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.getTreatmentPlan(req.params.id);
    res.json({ success: true, data });
  })
);

router.post(
  '/treatment-plans',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'manager', 'doctor']),
  [
    body('beneficiaryId').notEmpty().withMessage('معرف المستفيد مطلوب'),
    body('diagnosis').notEmpty().withMessage('التشخيص مطلوب'),
  ],
  handleValidation,
  wrap((req, res) => {
    const data = svc.createTreatmentPlan(req.body);
    res.status(201).json({ success: true, data });
  })
);

router.put(
  '/treatment-plans/:id',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'manager', 'doctor']),
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.updateTreatmentPlan(req.params.id, req.body);
    res.json({ success: true, data });
  })
);

router.post(
  '/treatment-plans/:id/optimize',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'manager', 'doctor']),
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.optimizeTreatmentPlan(req.params.id);
    res.json({ success: true, data });
  })
);

/* ────────────────────────────────────────────
   AI ANALYSIS — تحليل الذكاء الاصطناعي
   ──────────────────────────────────────────── */
router.get(
  '/beneficiaries/:beneficiaryId/analysis',
  authenticate, requireBranchAccess, requireBranchAccess,
  param('beneficiaryId').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.analyzeProgress(req.params.beneficiaryId);
    res.json({ success: true, data });
  })
);

router.get(
  '/beneficiaries/:beneficiaryId/recommendations',
  authenticate, requireBranchAccess, requireBranchAccess,
  param('beneficiaryId').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.generateRecommendations(req.params.beneficiaryId);
    res.json({ success: true, data });
  })
);

router.get(
  '/beneficiaries/:beneficiaryId/predictions/:goalId',
  authenticate, requireBranchAccess, requireBranchAccess,
  [param('beneficiaryId').notEmpty(), param('goalId').notEmpty()],
  handleValidation,
  wrap((req, res) => {
    const data = svc.predictOutcome(req.params.beneficiaryId, req.params.goalId);
    res.json({ success: true, data });
  })
);

router.get(
  '/beneficiaries/:beneficiaryId/patterns',
  authenticate, requireBranchAccess, requireBranchAccess,
  param('beneficiaryId').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.detectPatterns(req.params.beneficiaryId);
    res.json({ success: true, data });
  })
);

router.get(
  '/beneficiaries/:beneficiaryId/risk',
  authenticate, requireBranchAccess, requireBranchAccess,
  param('beneficiaryId').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.assessRisk(req.params.beneficiaryId);
    res.json({ success: true, data });
  })
);

router.get(
  '/beneficiaries/:beneficiaryId/report',
  authenticate, requireBranchAccess, requireBranchAccess,
  param('beneficiaryId').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.generateAIReport(req.params.beneficiaryId);
    res.json({ success: true, data });
  })
);

/* ────────────────────────────────────────────
   BEHAVIOR LOGS — سجل السلوكيات
   ──────────────────────────────────────────── */
router.get(
  '/beneficiaries/:beneficiaryId/behaviors',
  authenticate, requireBranchAccess, requireBranchAccess,
  param('beneficiaryId').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const { type } = req.query;
    const data = svc.listBehaviorLogs(req.params.beneficiaryId, { type });
    res.json({ success: true, data });
  })
);

router.post(
  '/beneficiaries/:beneficiaryId/behaviors',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'manager', 'doctor', 'therapist']),
  [
    param('beneficiaryId').notEmpty(),
    body('type').isIn(['positive', 'challenging']).withMessage('نوع السلوك مطلوب'),
    body('behavior').notEmpty().withMessage('وصف السلوك مطلوب'),
    body('observer').notEmpty().withMessage('المراقب مطلوب'),
  ],
  handleValidation,
  wrap((req, res) => {
    const data = svc.createBehaviorLog({ ...req.body, beneficiaryId: req.params.beneficiaryId });
    res.status(201).json({ success: true, data });
  })
);

/* ────────────────────────────────────────────
   ALERTS — التنبيهات
   ──────────────────────────────────────────── */
router.get(
  '/alerts',
  authenticate, requireBranchAccess, requireBranchAccess,
  wrap((req, res) => {
    const { beneficiaryId, resolved, severity } = req.query;
    const data = svc.listAlerts({
      beneficiaryId,
      resolved: resolved !== undefined ? resolved === 'true' : undefined,
      severity,
    });
    res.json({ success: true, data });
  })
);

router.put(
  '/alerts/:id/resolve',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'manager', 'doctor']),
  param('id').notEmpty(),
  handleValidation,
  wrap((req, res) => {
    const data = svc.resolveAlert(req.params.id);
    res.json({ success: true, data });
  })
);

module.exports = router;

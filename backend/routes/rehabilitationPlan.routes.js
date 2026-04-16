/**
 * 🏥 Rehabilitation Plan Routes — مسارات API خطط التأهيل المتكاملة
 * الإصدار 3.0.0
 */

'use strict';

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/rehabilitationPlan.controller');

// ── المصادقة الحقيقية ────────────────────────────────────────────────────
const { authenticateToken: authGuard } = require('../middleware/auth');

const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
// ── القوالب المتاحة ──────────────────────────────────────────────────────
// GET /api/rehab-plans/templates
router.get('/templates', ctrl.getTemplates);

// ── بنك الأهداف ─────────────────────────────────────────────────────────
// GET /api/rehab-plans/goal-bank?domain=motorSkills&area=grossMotor
router.get('/goal-bank', ctrl.getGoalBank);

// ── لوحة تحكم المعالج ───────────────────────────────────────────────────
// GET /api/rehab-plans/dashboard/:therapistId
router.get('/dashboard/:therapistId', authGuard, requireBranchAccess, ctrl.getTherapistDashboard);

// ── إنشاء خطة جديدة ─────────────────────────────────────────────────────
// POST /api/rehab-plans
router.post('/', authGuard, requireBranchAccess, ctrl.createPlan);

// ── استرجاع خطط مستفيد ──────────────────────────────────────────────────
// GET /api/rehab-plans/beneficiary/:beneficiaryId
router.get('/beneficiary/:beneficiaryId', authGuard, requireBranchAccess, ctrl.getBeneficiaryPlans);

// ── تقييم AI للمستفيد ────────────────────────────────────────────────────
// POST /api/rehab-plans/beneficiary/:beneficiaryId/ai-assessment
router.post('/beneficiary/:beneficiaryId/ai-assessment', authGuard, requireBranchAccess, ctrl.conductAIAssessment);

// ── توقع النتائج ─────────────────────────────────────────────────────────
// POST /api/rehab-plans/beneficiary/:beneficiaryId/predict
router.post('/beneficiary/:beneficiaryId/predict', authGuard, requireBranchAccess, ctrl.predictOutcomes);

// ── خطة بعينها ───────────────────────────────────────────────────────────
// GET  /api/rehab-plans/:planId
router.get('/:planId', authGuard, requireBranchAccess, ctrl.getPlan);

// ── مراجعة الخطة ─────────────────────────────────────────────────────────
// POST /api/rehab-plans/:planId/review
router.post('/:planId/review', authGuard, requireBranchAccess, ctrl.reviewPlan);

// ── تقرير التقدم ─────────────────────────────────────────────────────────
// GET  /api/rehab-plans/:planId/report?type=quarterly&startDate=&endDate=
router.get('/:planId/report', authGuard, requireBranchAccess, ctrl.generateProgressReport);

// ── مؤشرات الجودة ────────────────────────────────────────────────────────
// GET  /api/rehab-plans/:planId/quality
router.get('/:planId/quality', authGuard, requireBranchAccess, ctrl.getQualityMetrics);

// ── جلسة تيلي-ريهاب ─────────────────────────────────────────────────────
// POST /api/rehab-plans/:planId/tele-session
router.post('/:planId/tele-session', authGuard, requireBranchAccess, ctrl.scheduleTeleSession);

// ── الأهداف ──────────────────────────────────────────────────────────────
// POST /api/rehab-plans/:planId/goals
router.post('/:planId/goals', authGuard, requireBranchAccess, ctrl.addGoal);

// PUT  /api/rehab-plans/:planId/goals/:goalId/progress
router.put('/:planId/goals/:goalId/progress', authGuard, requireBranchAccess, ctrl.updateGoalProgress);

// ── الخدمات ──────────────────────────────────────────────────────────────
// POST /api/rehab-plans/:planId/services
router.post('/:planId/services', authGuard, requireBranchAccess, ctrl.addService);

// POST /api/rehab-plans/:planId/services/:serviceId/sessions
router.post('/:planId/services/:serviceId/sessions', authGuard, requireBranchAccess, ctrl.recordSession);

module.exports = router;

/**
 * AI Recommendations Routes — مسارات API للتوصيات الذكية والمخاطر
 *
 * @module domains/ai-recommendations/routes/recommendations.routes
 */

const express = require('express');
const router = express.Router();
// W1140 — cross-branch isolation (W269 doctrine): auto-enforce beneficiary
// ownership on every :beneficiaryId param + body-carried beneficiary ids.
// W1168 — requireBranchAccess populates req.branchScope BEFORE the guards
// below (without it every assertBranchMatch helper silently no-ops) +
// effectiveBranchScope pins branchId reads against query/body spoofing.
const {
  branchScopedBeneficiaryParam,
  bodyScopedBeneficiaryGuard,
  effectiveBranchScope,
} = require('../../../middleware/assertBranchMatch');
const { requireBranchAccess } = require('../../../middleware/branchScope.middleware');
router.use(requireBranchAccess); // W1168 — must run before the param/body guards
router.param('beneficiaryId', branchScopedBeneficiaryParam);
router.use(bodyScopedBeneficiaryGuard);
const { riskScoringService } = require('../services/RiskScoringService');
const {
  validateCalculateBatch,
  validateFeedback,
  validate,
} = require('../validators/ai-recommendations.validator');

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function getUserId(req) {
  return req.user?._id || req.user?.id || null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Risk Scoring
// ═══════════════════════════════════════════════════════════════════════════════

/** POST /risk/calculate/:beneficiaryId — حساب المخاطر لمستفيد */
router.post(
  '/risk/calculate/:beneficiaryId',
  asyncHandler(async (req, res) => {
    const result = await riskScoringService.calculateRisk(req.params.beneficiaryId, {
      episodeId: req.body.episodeId,
      triggerEvent: req.body.triggerEvent || 'manual_request',
      calculatedBy: 'manual_request',
    });
    res.status(201).json({ success: true, data: result });
  })
);

/** POST /risk/calculate-batch — حساب دفعة لكل المستفيدين */
router.post(
  '/risk/calculate-batch',
  validate(validateCalculateBatch),
  asyncHandler(async (req, res) => {
    const result = await riskScoringService.calculateBatch(
      effectiveBranchScope(req) || req.body.branchId || req.user?.branchId
    );
    res.json({ success: true, data: result });
  })
);

/** GET /risk/latest/:beneficiaryId — آخر تسجيل مخاطر */
router.get(
  '/risk/latest/:beneficiaryId',
  asyncHandler(async (req, res) => {
    const data = await riskScoringService.getLatestRiskScore(req.params.beneficiaryId);
    res.json({ success: true, data });
  })
);

/** GET /risk/history/:beneficiaryId — سجل المخاطر */
router.get(
  '/risk/history/:beneficiaryId',
  asyncHandler(async (req, res) => {
    const data = await riskScoringService.getRiskHistory(
      req.params.beneficiaryId,
      parseInt(req.query.limit) || 20
    );
    res.json({ success: true, data, total: data.length });
  })
);

/** GET /risk/high-risk — قائمة الحالات عالية المخاطر */
router.get(
  '/risk/high-risk',
  asyncHandler(async (req, res) => {
    const data = await riskScoringService.getHighRiskBeneficiaries(
      effectiveBranchScope(req) || req.query.branchId || req.user?.branchId,
      parseInt(req.query.limit) || 50
    );
    res.json({ success: true, data, total: data.length });
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// Recommendations
// ═══════════════════════════════════════════════════════════════════════════════

/** GET /recommendations/:beneficiaryId — توصيات المستفيد القائمة */
router.get(
  '/recommendations/:beneficiaryId',
  asyncHandler(async (req, res) => {
    const data = await riskScoringService.getPendingRecommendations(req.params.beneficiaryId);
    res.json({ success: true, data, total: data.length });
  })
);

/** GET /recommendations/:beneficiaryId/all — جميع التوصيات */
router.get(
  '/recommendations/:beneficiaryId/all',
  asyncHandler(async (req, res) => {
    const data = await riskScoringService.getAllRecommendations(req.params.beneficiaryId, {
      status: req.query.status,
      type: req.query.type,
      limit: parseInt(req.query.limit) || 30,
    });
    res.json({ success: true, data, total: data.length });
  })
);

/** POST /recommendations/:id/respond — الرد على توصية */
router.post(
  '/recommendations/:id/respond',
  validate(validateFeedback),
  asyncHandler(async (req, res) => {
    const data = await riskScoringService.respondToRecommendation(req.params.id, getUserId(req), {
      action: req.body.action,
      note: req.body.note,
    });
    res.json({ success: true, data });
  })
);

/** POST /recommendations/:id/view — تسجيل مشاهدة */
router.post(
  '/recommendations/:id/view',
  asyncHandler(async (req, res) => {
    const data = await riskScoringService.markViewed(req.params.id, getUserId(req));
    res.json({ success: true, data });
  })
);

/** POST /recommendations/:id/rate — تقييم التوصية */
router.post(
  '/recommendations/:id/rate',
  asyncHandler(async (req, res) => {
    const data = await riskScoringService.rateRecommendation(req.params.id, getUserId(req), {
      wasHelpful: req.body.wasHelpful,
      impactNote: req.body.impactNote,
    });
    res.json({ success: true, data });
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// Dashboard & Priorities
// ═══════════════════════════════════════════════════════════════════════════════

/** GET /dashboard — لوحة تحكم التوصيات والمخاطر */
router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const data = await riskScoringService.getDashboard(
      effectiveBranchScope(req) || req.query.branchId || req.user?.branchId
    );
    res.json({ success: true, data });
  })
);

/** GET /priorities/:therapistId — أولويات الأخصائي اليومية */
router.get(
  '/priorities/:therapistId',
  asyncHandler(async (req, res) => {
    const data = await riskScoringService.getTherapistPriorities(req.params.therapistId);
    res.json({ success: true, data });
  })
);

/** GET /rules — قائمة القواعد المتاحة */
router.get(
  '/rules',
  asyncHandler(async (_req, res) => {
    const data = riskScoringService.listRules();
    res.json({ success: true, data, total: data.length });
  })
);

module.exports = router;

/**
 * Measures Library Routes — مسارات API لمكتبة المقاييس المتقدمة
 *
 * يوفر: تطبيق المقياس، التاريخ، المقارنة، التوصيات، لوحة تحكم المقاييس
 *
 * @module domains/goals/routes/measures.routes
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
const { measuresLibraryService } = require('../services/MeasuresLibraryService');

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function getUserId(req) {
  return req.user?._id || req.user?.id || null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Application (تطبيق مقياس)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /measures/apply
 * تطبيق مقياس على مستفيد مع تصحيح آلي ومقارنة
 *
 * Body: { beneficiaryId, measureId, episodeId?, domainScores[], purpose?, setting?, notes?, targetScore? }
 */
router.post(
  '/measures/apply',
  asyncHandler(async (req, res) => {
    const {
      beneficiaryId,
      measureId,
      episodeId,
      domainScores,
      purpose,
      setting,
      notes,
      clinicalObservations,
      targetScore,
    } = req.body;

    if (!beneficiaryId || !measureId || !domainScores) {
      return res.status(400).json({
        success: false,
        message: 'معرّف المستفيد والمقياس والدرجات مطلوبة',
      });
    }

    const result = await measuresLibraryService.applyMeasure({
      beneficiaryId,
      episodeId,
      measureId,
      domainScores,
      purpose,
      assessorId: getUserId(req),
      setting,
      notes,
      clinicalObservations,
      targetScore,
      branchId: effectiveBranchScope(req) || req.user?.branchId || req.body.branchId,
      organizationId: req.user?.organizationId || req.body.organizationId,
    });

    res.status(201).json({ success: true, data: result });
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// History (تاريخ التطبيقات)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /measures/history/:beneficiaryId/:measureId
 * تاريخ تطبيقات مقياس معين لمستفيد (مع بيانات الرسم البياني)
 */
router.get(
  '/measures/history/:beneficiaryId/:measureId',
  asyncHandler(async (req, res) => {
    const data = await measuresLibraryService.getMeasureHistory(
      req.params.beneficiaryId,
      req.params.measureId
    );
    res.json({ success: true, data });
  })
);

/**
 * GET /measures/beneficiary/:beneficiaryId/summary
 * ملخص جميع المقاييس المطبقة على مستفيد (آخر تطبيق لكل مقياس)
 */
router.get(
  '/measures/beneficiary/:beneficiaryId/summary',
  asyncHandler(async (req, res) => {
    const data = await measuresLibraryService.getBeneficiaryMeasuresSummary(
      req.params.beneficiaryId
    );
    res.json({ success: true, data, total: data.length });
  })
);

/**
 * GET /measures/beneficiary/:beneficiaryId/cross-compare
 * مقارنة عبر المقاييس لمستفيد (grouped by category)
 */
router.get(
  '/measures/beneficiary/:beneficiaryId/cross-compare',
  asyncHandler(async (req, res) => {
    const data = await measuresLibraryService.crossMeasureComparison(req.params.beneficiaryId);
    res.json({ success: true, data });
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// Recommendations (التوصيات)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /measures/recommendations/:beneficiaryId
 * توصيات المقاييس المناسبة لمستفيد
 */
router.get(
  '/measures/recommendations/:beneficiaryId',
  asyncHandler(async (req, res) => {
    const data = await measuresLibraryService.getRecommendations(req.params.beneficiaryId);
    res.json({ success: true, data, total: data.length });
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// Re-application (إعادة التطبيق)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /measures/overdue-reapplications
 * التطبيقات المتأخرة (overdue)
 */
router.get(
  '/measures/overdue-reapplications',
  asyncHandler(async (req, res) => {
    const data = await measuresLibraryService.getOverdueReapplications(
      effectiveBranchScope(req) || req.query.branchId || req.user?.branchId
    );
    res.json({ success: true, data, total: data.length });
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// Dashboard (لوحة التحكم)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /measures/:measureId/dashboard
 * لوحة تحكم مقياس معين (إحصائيات وتوزيع النتائج)
 */
router.get(
  '/measures/:measureId/dashboard',
  asyncHandler(async (req, res) => {
    const data = await measuresLibraryService.getMeasureDashboard(req.params.measureId, {
      branchId: effectiveBranchScope(req) || req.query.branchId,
      from: req.query.from,
    });
    res.json({ success: true, data });
  })
);

module.exports = router;

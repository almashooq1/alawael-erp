/**
 * Quality Routes — مسارات API لمركز الجودة والامتثال
 *
 * @module domains/quality/routes/quality.routes
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
const { qualityEngine } = require('../services/QualityEngine');
const { validateResolveAction, validate } = require('../validators/quality.validator');

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function getUserId(req) {
  return req.user?._id || req.user?.id || null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Audits
// ═══════════════════════════════════════════════════════════════════════════════

/** POST /audit/:beneficiaryId — تدقيق ملف مستفيد */
router.post(
  '/audit/:beneficiaryId',
  asyncHandler(async (req, res) => {
    const result = await qualityEngine.auditBeneficiary(req.params.beneficiaryId, {
      episodeId: req.body.episodeId,
      auditedBy: getUserId(req),
      auditType: 'manual',
    });
    res.status(201).json({ success: true, data: result });
  })
);

/** POST /audit/batch — تدقيق دفعة لجميع المستفيدين */
router.post(
  '/audit/batch',
  asyncHandler(async (req, res) => {
    const result = await qualityEngine.auditBatch(
      effectiveBranchScope(req) || req.body.branchId || req.user?.branchId
    );
    res.json({ success: true, data: result });
  })
);

/** GET /audit/latest/:beneficiaryId — آخر تدقيق */
router.get(
  '/audit/latest/:beneficiaryId',
  asyncHandler(async (req, res) => {
    const data = await qualityEngine.getLatestAudit(req.params.beneficiaryId);
    res.json({ success: true, data });
  })
);

/** GET /audit/history/:beneficiaryId — سجل التدقيقات */
router.get(
  '/audit/history/:beneficiaryId',
  asyncHandler(async (req, res) => {
    const data = await qualityEngine.getAuditHistory(
      req.params.beneficiaryId,
      parseInt(req.query.limit) || 10
    );
    res.json({ success: true, data, total: data.length });
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// Corrective Actions
// ═══════════════════════════════════════════════════════════════════════════════

/** GET /actions — قائمة الإجراءات التصحيحية المفتوحة */
router.get(
  '/actions',
  asyncHandler(async (req, res) => {
    const data = await qualityEngine.getOpenActions({
      assignedTo: req.query.assignedTo,
      branchId: effectiveBranchScope(req) || req.query.branchId || req.user?.branchId,
      severity: req.query.severity,
      limit: parseInt(req.query.limit) || 50,
    });
    res.json({ success: true, data, total: data.length });
  })
);

/** POST /actions/:id/resolve — حل إجراء تصحيحي */
router.post(
  '/actions/:id/resolve',
  validate(validateResolveAction),
  asyncHandler(async (req, res) => {
    const data = await qualityEngine.resolveAction(req.params.id, getUserId(req), req.body.note);
    res.json({ success: true, data });
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// Dashboard & Comparison
// ═══════════════════════════════════════════════════════════════════════════════

/** GET /dashboard — لوحة تحكم الجودة */
router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const data = await qualityEngine.getDashboard(
      effectiveBranchScope(req) || req.query.branchId || req.user?.branchId
    );
    res.json({ success: true, data });
  })
);

/** GET /compare-branches — مقارنة الأداء بين الفروع */
router.get(
  '/compare-branches',
  asyncHandler(async (_req, res) => {
    const data = await qualityEngine.compareBranches();
    res.json({ success: true, data });
  })
);

/** GET /rules — قائمة قواعد التدقيق */
router.get(
  '/rules',
  asyncHandler(async (_req, res) => {
    const data = qualityEngine.listRules();
    res.json({ success: true, data, total: data.length });
  })
);

module.exports = router;

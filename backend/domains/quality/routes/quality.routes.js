/**
 * Quality Routes — مسارات API لمركز الجودة والامتثال
 *
 * @module domains/quality/routes/quality.routes
 */

const express = require('express');
const router = express.Router();
const { qualityEngine } = require('../services/QualityEngine');

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function getUserId(req) {
  return req.user?._id || req.user?.id || req.headers['x-user-id'];
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
    const result = await qualityEngine.auditBatch(req.body.branchId || req.user?.branchId);
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
      branchId: req.query.branchId || req.user?.branchId,
      severity: req.query.severity,
      limit: parseInt(req.query.limit) || 50,
    });
    res.json({ success: true, data, total: data.length });
  })
);

/** POST /actions/:id/resolve — حل إجراء تصحيحي */
router.post(
  '/actions/:id/resolve',
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
    const data = await qualityEngine.getDashboard(req.query.branchId || req.user?.branchId);
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

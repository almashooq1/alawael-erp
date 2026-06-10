/**
 * Reports Routes — مسارات API لمحرك التقارير
 *
 * @module domains/reports/routes/reports.routes
 */

const express = require('express');
const router = express.Router();
const { reportsEngine } = require('../services/ReportsEngine');
const { validateGenerateReport, validate } = require('../validators/reports.validator');
// W1166 — cross-branch isolation (W269 doctrine). Generated reports are
// branch-scoped PHI aggregates: before this wave any authed user could spoof
// ?branchId= / body.branchId to generate or list a foreign branch's reports
// and read ANY report by id (IDOR).
const { requireBranchAccess } = require('../../../middleware/branchScope.middleware');
const {
  effectiveBranchScope,
  branchScopedResourceParam,
} = require('../../../middleware/assertBranchMatch');

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function getUserId(req) {
  return req.user?._id || req.user?.id || null;
}

router.use(requireBranchAccess); // W1166 — populate req.branchScope

// W1166 — report-keyed ownership: restricted callers only reach reports of
// their own branch (fail-closed 404 on foreign/unknown ids).
router.param(
  'reportId',
  branchScopedResourceParam({
    modelName: 'GeneratedReport',
    label: 'report',
    loadModel: () => require('../models/GeneratedReport'),
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// Report Generation
// ═══════════════════════════════════════════════════════════════════════════════

/** POST /generate/:templateCode — توليد تقرير */
router.post(
  '/generate/:templateCode',
  validate(validateGenerateReport),
  asyncHandler(async (req, res) => {
    const report = await reportsEngine.generateReport(req.params.templateCode, {
      ...req.body,
      userId: getUserId(req),
      // W1166 — restricted callers are pinned to their branch (no body spoof)
      branchId: effectiveBranchScope(req) || req.user?.branchId || req.body.branchId,
      organizationId: req.user?.organizationId || req.body.organizationId,
    });
    res.status(201).json({ success: true, data: report });
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// Queries
// ═══════════════════════════════════════════════════════════════════════════════

/** GET /list — قائمة التقارير المُنشأة */
router.get(
  '/list',
  asyncHandler(async (req, res) => {
    const result = await reportsEngine.listReports({
      beneficiaryId: req.query.beneficiaryId,
      // W1166 — restricted callers are pinned to their branch (no ?branchId spoof)
      branchId: effectiveBranchScope(req) || req.query.branchId || req.user?.branchId,
      templateCode: req.query.templateCode,
      status: req.query.status,
      limit: parseInt(req.query.limit) || 20,
      page: parseInt(req.query.page) || 1,
    });
    res.json({ success: true, ...result });
  })
);

/** GET /templates — قائمة القوالب */
router.get(
  '/templates',
  asyncHandler(async (req, res) => {
    const data = await reportsEngine.listTemplates({
      category: req.query.category,
      scope: req.query.scope,
      status: req.query.status,
    });
    res.json({ success: true, data, total: data.length });
  })
);

/** GET /builtin — قائمة التقارير المدمجة */
router.get(
  '/builtin',
  asyncHandler(async (_req, res) => {
    const data = await reportsEngine.listBuiltinReports();
    res.json({ success: true, data, total: data.length });
  })
);

/** GET /dashboard — لوحة تحكم التقارير */
router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    // W1166 — restricted callers are pinned to their branch (no ?branchId spoof)
    const data = await reportsEngine.getDashboard(
      effectiveBranchScope(req) || req.query.branchId || req.user?.branchId
    );
    res.json({ success: true, data });
  })
);

/** GET /:reportId — تقرير محدد (W1166 — خطاف ملكية الفرع يسري) */
router.get(
  '/:reportId',
  asyncHandler(async (req, res) => {
    const data = await reportsEngine.getReport(req.params.reportId);
    if (!data) return res.status(404).json({ success: false, message: 'التقرير غير موجود' });
    res.json({ success: true, data });
  })
);

module.exports = router;

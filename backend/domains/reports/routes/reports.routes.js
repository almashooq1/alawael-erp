/**
 * Reports Routes — مسارات API لمحرك التقارير
 *
 * @module domains/reports/routes/reports.routes
 */

const express = require('express');
const router = express.Router();
const { reportsEngine } = require('../services/ReportsEngine');

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function getUserId(req) {
  return req.user?._id || req.user?.id || req.headers['x-user-id'];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Report Generation
// ═══════════════════════════════════════════════════════════════════════════════

/** POST /generate/:templateCode — توليد تقرير */
router.post(
  '/generate/:templateCode',
  asyncHandler(async (req, res) => {
    const report = await reportsEngine.generateReport(req.params.templateCode, {
      ...req.body,
      userId: getUserId(req),
      branchId: req.user?.branchId || req.body.branchId,
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
      branchId: req.query.branchId || req.user?.branchId,
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
    const data = await reportsEngine.getDashboard(req.query.branchId || req.user?.branchId);
    res.json({ success: true, data });
  })
);

/** GET /:id — تقرير محدد */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const data = await reportsEngine.getReport(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'التقرير غير موجود' });
    res.json({ success: true, data });
  })
);

module.exports = router;

/**
 * Dashboards & Decision Support Routes — مسارات API للوحات المعلومات ودعم القرار
 */

const express = require('express');
const router = express.Router();
const { dashboardService } = require('../services/DashboardService');
const { decisionSupportEngine } = require('../services/DecisionSupportEngine');

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
function getUserId(req) {
  return req.user?._id || req.user?.id || req.headers['x-user-id'];
}

/* ═══════════════════ EXECUTIVE SUMMARY ═══════════════════ */
router.get(
  '/executive-summary',
  asyncHandler(async (req, res) => {
    const data = await dashboardService.getExecutiveSummary(
      req.query.branchId || req.user?.branchId
    );
    res.json({ success: true, data });
  })
);

/* ═══════════════════ DASHBOARD CONFIGS ═══════════════════ */
router.post(
  '/configs',
  asyncHandler(async (req, res) => {
    const data = await dashboardService.createDashboard({
      ...req.body,
      userId: getUserId(req),
      createdBy: getUserId(req),
    });
    res.status(201).json({ success: true, data });
  })
);
router.get(
  '/configs',
  asyncHandler(async (req, res) => {
    const result = await dashboardService.listDashboards({
      userId: getUserId(req),
      role: req.query.role,
      type: req.query.type,
      category: req.query.category,
      page: req.query.page,
      limit: req.query.limit,
    });
    res.json({ success: true, ...result });
  })
);
router.get(
  '/configs/:id',
  asyncHandler(async (req, res) => {
    const data = await dashboardService.getDashboard(req.params.id);
    res.json({ success: true, data });
  })
);
router.put(
  '/configs/:id',
  asyncHandler(async (req, res) => {
    const data = await dashboardService.updateDashboard(req.params.id, req.body);
    res.json({ success: true, data });
  })
);
router.delete(
  '/configs/:id',
  asyncHandler(async (req, res) => {
    await dashboardService.deleteDashboard(req.params.id);
    res.json({ success: true, message: 'Dashboard deleted' });
  })
);

/* ── Widgets ── */
router.post(
  '/configs/:id/widgets',
  asyncHandler(async (req, res) => {
    const data = await dashboardService.addWidget(req.params.id, req.body);
    res.json({ success: true, data });
  })
);
router.delete(
  '/configs/:id/widgets/:widgetId',
  asyncHandler(async (req, res) => {
    const data = await dashboardService.removeWidget(req.params.id, req.params.widgetId);
    res.json({ success: true, data });
  })
);
router.put(
  '/configs/:id/layout',
  asyncHandler(async (req, res) => {
    const data = await dashboardService.updateWidgetLayout(req.params.id, req.body.widgets);
    res.json({ success: true, data });
  })
);

/* ═══════════════════ KPI DEFINITIONS ═══════════════════ */
router.post(
  '/kpis',
  asyncHandler(async (req, res) => {
    const data = await dashboardService.createKPI({ ...req.body, createdBy: getUserId(req) });
    res.status(201).json({ success: true, data });
  })
);
router.get(
  '/kpis',
  asyncHandler(async (req, res) => {
    const result = await dashboardService.listKPIs({
      category: req.query.category,
      domain: req.query.domain,
      status: req.query.status,
      page: req.query.page,
      limit: req.query.limit,
    });
    res.json({ success: true, ...result });
  })
);
router.get(
  '/kpis/latest',
  asyncHandler(async (req, res) => {
    const data = await dashboardService.getLatestSnapshots(
      req.query.branchId || req.user?.branchId
    );
    res.json({ success: true, data, total: data.length });
  })
);
router.get(
  '/kpis/:id',
  asyncHandler(async (req, res) => {
    const data = await dashboardService.getKPI(req.params.id);
    res.json({ success: true, data });
  })
);
router.put(
  '/kpis/:id',
  asyncHandler(async (req, res) => {
    const data = await dashboardService.updateKPI(req.params.id, req.body);
    res.json({ success: true, data });
  })
);

/* ── KPI Snapshots ── */
router.post(
  '/kpis/:id/snapshots',
  asyncHandler(async (req, res) => {
    const data = await dashboardService.recordSnapshot({ ...req.body, kpiId: req.params.id });
    res.status(201).json({ success: true, data });
  })
);
router.get(
  '/kpis/:id/trend',
  asyncHandler(async (req, res) => {
    const data = await dashboardService.getKPITrend(
      req.params.id,
      req.query.periodType,
      parseInt(req.query.limit) || 12
    );
    res.json({ success: true, data, total: data.length });
  })
);

/* ═══════════════════ ALERTS ═══════════════════ */
router.get(
  '/alerts',
  asyncHandler(async (req, res) => {
    const result = await dashboardService.listAlerts({
      status: req.query.status,
      severity: req.query.severity,
      category: req.query.category,
      assignedTo: req.query.assignedTo,
      beneficiaryId: req.query.beneficiaryId,
      branchId: req.query.branchId || req.user?.branchId,
      page: req.query.page,
      limit: req.query.limit,
    });
    res.json({ success: true, ...result });
  })
);
router.get(
  '/alerts/analytics',
  asyncHandler(async (req, res) => {
    const data = await dashboardService.getAlertAnalytics(
      req.query.branchId || req.user?.branchId,
      parseInt(req.query.days) || 30
    );
    res.json({ success: true, data });
  })
);
router.post(
  '/alerts',
  asyncHandler(async (req, res) => {
    const data = await dashboardService.createAlert({ ...req.body, createdBy: getUserId(req) });
    res.status(201).json({ success: true, data });
  })
);
router.get(
  '/alerts/:id',
  asyncHandler(async (req, res) => {
    const data = await dashboardService.getAlert(req.params.id);
    res.json({ success: true, data });
  })
);
router.put(
  '/alerts/:id/acknowledge',
  asyncHandler(async (req, res) => {
    const data = await dashboardService.acknowledgeAlert(req.params.id, getUserId(req));
    res.json({ success: true, data });
  })
);
router.put(
  '/alerts/:id/resolve',
  asyncHandler(async (req, res) => {
    const data = await dashboardService.resolveAlert(req.params.id, getUserId(req), req.body.notes);
    res.json({ success: true, data });
  })
);
router.put(
  '/alerts/:id/dismiss',
  asyncHandler(async (req, res) => {
    const data = await dashboardService.dismissAlert(
      req.params.id,
      getUserId(req),
      req.body.reason
    );
    res.json({ success: true, data });
  })
);
router.put(
  '/alerts/:id/escalate',
  asyncHandler(async (req, res) => {
    const data = await dashboardService.escalateAlert(req.params.id, req.body.escalateTo);
    res.json({ success: true, data });
  })
);
router.put(
  '/alerts/:id/assign',
  asyncHandler(async (req, res) => {
    const data = await dashboardService.assignAlert(req.params.id, req.body.assignedTo);
    res.json({ success: true, data });
  })
);

/* ═══════════════════ DECISION SUPPORT ENGINE ═══════════════════ */
router.get(
  '/decision/rules',
  asyncHandler(async (req, res) => {
    const data = decisionSupportEngine.listRules();
    res.json({ success: true, data, total: data.length });
  })
);
router.post(
  '/decision/run-all',
  asyncHandler(async (req, res) => {
    const data = await decisionSupportEngine.runAllRules(req.query.branchId || req.user?.branchId);
    res.json({ success: true, data });
  })
);
router.post(
  '/decision/run/:ruleId',
  asyncHandler(async (req, res) => {
    const data = await decisionSupportEngine.runRule(
      req.params.ruleId,
      req.query.branchId || req.user?.branchId
    );
    res.json({ success: true, data });
  })
);

module.exports = router;

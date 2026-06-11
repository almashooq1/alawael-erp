/**
 * Dashboards & Decision Support Routes — مسارات API للوحات المعلومات ودعم القرار
 */

const express = require('express');
const router = express.Router();
// W1160 — cross-branch isolation (W269 doctrine): file had NO guards.
//   - /configs/:id → /configs/:dashboardConfigId (DashboardConfig),
//     /kpis/:id → /kpis/:kpiId (DashboardKPIDefinition),
//     /alerts/:id → /alerts/:alertId (DecisionAlert) so ownership hooks fire
//   - executive-summary / kpis/latest / alerts / analytics / decision runs
//     use effectiveBranchScope (no ?branchId= spoofing)
const {
  branchScopedResourceParam,
  bodyScopedBeneficiaryGuard,
  effectiveBranchScope,
} = require('../../../middleware/assertBranchMatch');
router.param(
  'dashboardConfigId',
  branchScopedResourceParam({
    modelName: 'DashboardConfig',
    label: 'dashboard config',
    loadModel: () => require('../models/DashboardConfig'),
  })
);
router.param(
  'kpiId',
  branchScopedResourceParam({
    modelName: 'DashboardKPIDefinition',
    label: 'KPI definition',
    loadModel: () => require('../models/KPIDefinition'),
  })
);
router.param(
  'alertId',
  branchScopedResourceParam({
    modelName: 'DecisionAlert',
    label: 'decision alert',
    loadModel: () => require('../models/DecisionAlert'),
  })
);
router.use(bodyScopedBeneficiaryGuard);
const { dashboardService } = require('../services/DashboardService');
const { decisionSupportEngine } = require('../services/DecisionSupportEngine');

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
function getUserId(req) {
  return req.user?._id || req.user?.id || null;
}

/* ═══════════════════ EXECUTIVE SUMMARY ═══════════════════ */
router.get(
  '/executive-summary',
  asyncHandler(async (req, res) => {
    const data = await dashboardService.getExecutiveSummary(
      effectiveBranchScope(req) || req.user?.branchId
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
  '/configs/:dashboardConfigId',
  asyncHandler(async (req, res) => {
    const data = await dashboardService.getDashboard(req.params.dashboardConfigId);
    res.json({ success: true, data });
  })
);
router.put(
  '/configs/:dashboardConfigId',
  asyncHandler(async (req, res) => {
    const data = await dashboardService.updateDashboard(req.params.dashboardConfigId, req.body);
    res.json({ success: true, data });
  })
);
router.delete(
  '/configs/:dashboardConfigId',
  asyncHandler(async (req, res) => {
    await dashboardService.deleteDashboard(req.params.dashboardConfigId);
    res.json({ success: true, message: 'Dashboard deleted' });
  })
);

/* ── Widgets ── */
router.post(
  '/configs/:dashboardConfigId/widgets',
  asyncHandler(async (req, res) => {
    const data = await dashboardService.addWidget(req.params.dashboardConfigId, req.body);
    res.json({ success: true, data });
  })
);
router.delete(
  '/configs/:dashboardConfigId/widgets/:widgetId',
  asyncHandler(async (req, res) => {
    const data = await dashboardService.removeWidget(
      req.params.dashboardConfigId,
      req.params.widgetId
    );
    res.json({ success: true, data });
  })
);
router.put(
  '/configs/:dashboardConfigId/layout',
  asyncHandler(async (req, res) => {
    const data = await dashboardService.updateWidgetLayout(
      req.params.dashboardConfigId,
      req.body.widgets
    );
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
      effectiveBranchScope(req) || req.user?.branchId
    );
    res.json({ success: true, data, total: data.length });
  })
);
router.get(
  '/kpis/:kpiId',
  asyncHandler(async (req, res) => {
    const data = await dashboardService.getKPI(req.params.kpiId);
    res.json({ success: true, data });
  })
);
router.put(
  '/kpis/:kpiId',
  asyncHandler(async (req, res) => {
    const data = await dashboardService.updateKPI(req.params.kpiId, req.body);
    res.json({ success: true, data });
  })
);

/* ── KPI Snapshots ── */
router.post(
  '/kpis/:kpiId/snapshots',
  asyncHandler(async (req, res) => {
    const data = await dashboardService.recordSnapshot({ ...req.body, kpiId: req.params.kpiId });
    res.status(201).json({ success: true, data });
  })
);
router.get(
  '/kpis/:kpiId/trend',
  asyncHandler(async (req, res) => {
    const data = await dashboardService.getKPITrend(
      req.params.kpiId,
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
      branchId: effectiveBranchScope(req) || req.user?.branchId,
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
      effectiveBranchScope(req) || req.user?.branchId,
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
  '/alerts/:alertId',
  asyncHandler(async (req, res) => {
    const data = await dashboardService.getAlert(req.params.alertId);
    res.json({ success: true, data });
  })
);
router.put(
  '/alerts/:alertId/acknowledge',
  asyncHandler(async (req, res) => {
    const data = await dashboardService.acknowledgeAlert(req.params.alertId, getUserId(req));
    res.json({ success: true, data });
  })
);
router.put(
  '/alerts/:alertId/resolve',
  asyncHandler(async (req, res) => {
    const data = await dashboardService.resolveAlert(
      req.params.alertId,
      getUserId(req),
      req.body.notes
    );
    res.json({ success: true, data });
  })
);
router.put(
  '/alerts/:alertId/dismiss',
  asyncHandler(async (req, res) => {
    const data = await dashboardService.dismissAlert(
      req.params.alertId,
      getUserId(req),
      req.body.reason
    );
    res.json({ success: true, data });
  })
);
router.put(
  '/alerts/:alertId/escalate',
  asyncHandler(async (req, res) => {
    const data = await dashboardService.escalateAlert(req.params.alertId, req.body.escalateTo);
    res.json({ success: true, data });
  })
);
router.put(
  '/alerts/:alertId/assign',
  asyncHandler(async (req, res) => {
    const data = await dashboardService.assignAlert(req.params.alertId, req.body.assignedTo);
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
    const data = await decisionSupportEngine.runAllRules(
      effectiveBranchScope(req) || req.user?.branchId
    );
    res.json({ success: true, data });
  })
);
router.post(
  '/decision/run/:ruleId',
  asyncHandler(async (req, res) => {
    const data = await decisionSupportEngine.runRule(
      req.params.ruleId,
      effectiveBranchScope(req) || req.user?.branchId
    );
    res.json({ success: true, data });
  })
);

module.exports = router;

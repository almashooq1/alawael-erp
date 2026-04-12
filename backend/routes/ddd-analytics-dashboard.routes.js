'use strict';
/**
 * AnalyticsDashboard Routes
 * Auto-extracted from services/dddAnalyticsDashboard.js
 * 10 endpoints — Auth required on all
 */

const { Router } = require('express');
const router = Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

const { getAnalyticsDashboard, executeWidget, upsertWidget, loadDashboardLayout, saveDashboardLayout, getTrend, recordSnapshot, runCohortAnalysis, seedWidgets } = require('../services/dddAnalyticsDashboard');
const { DDDWidget } = require('../models/DddAnalyticsDashboard');
const { validate } = require('../middleware/validate');
const v = require('../validations/analytics-dashboard.validation');

  router.get('/analytics-dashboard', authenticate, async (_req, res) => {
    try {
    res.json({ success: true, data: await getAnalyticsDashboard() });
    } catch (e) {
      safeError(res, e, 'analytics-dashboard');
    }
  });

  router.get('/analytics-dashboard/widgets', authenticate, async (_req, res) => {
    try {
    const widgets = await DDDWidget.find({ isActive: true }).lean();
    res.json({ success: true, data: widgets });
    } catch (e) {
      safeError(res, e, 'analytics-dashboard');
    }
  });

  router.get('/analytics-dashboard/widget/:widgetId', authenticate, async (req, res) => {
    try {
    res.json({ success: true, data: await executeWidget(req.params.widgetId, req.query) });
    } catch (e) {
      safeError(res, e, 'analytics-dashboard');
    }
  });

  router.post('/analytics-dashboard/widgets', authenticate, validate(v.createWidget), async (req, res) => {
    try {
    res.json({ success: true, data: await upsertWidget(req.body) });
    } catch (e) {
      safeError(res, e, 'analytics-dashboard');
    }
  });

  router.get('/analytics-dashboard/layouts/:layoutId', authenticate, async (req, res) => {
    try {
    res.json({ success: true, data: await loadDashboardLayout(req.params.layoutId) });
    } catch (e) {
      safeError(res, e, 'analytics-dashboard');
    }
  });

  router.post('/analytics-dashboard/layouts', authenticate, async (req, res) => {
    try {
    res.json({ success: true, data: await saveDashboardLayout(req.body) });
    } catch (e) {
      safeError(res, e, 'analytics-dashboard');
    }
  });

  router.get('/analytics-dashboard/trend/:domain/:metricKey', authenticate, async (req, res) => {
    try {
    const data = await getTrend(req.params.domain, req.params.metricKey, req.query);
    res.json({ success: true, data });
    } catch (e) {
      safeError(res, e, 'analytics-dashboard');
    }
  });

  router.post('/analytics-dashboard/snapshot', authenticate, async (req, res) => {
    try {
    const { domain, metricKey, value, dimensions, period } = req.body;
    const snap = await recordSnapshot(domain, metricKey, value, dimensions, period);
    res.json({ success: true, data: snap });
    } catch (e) {
      safeError(res, e, 'analytics-dashboard');
    }
  });

  router.get('/analytics-dashboard/cohort/:cohortId', authenticate, async (req, res) => {
    try {
    res.json({ success: true, data: await runCohortAnalysis(req.params.cohortId, req.query) });
    } catch (e) {
      safeError(res, e, 'analytics-dashboard');
    }
  });

  router.post('/analytics-dashboard/seed', authenticate, async (_req, res) => {
    try {
    res.json({ success: true, data: await seedWidgets() });
    } catch (e) {
      safeError(res, e, 'analytics-dashboard');
    }
  });

module.exports = router;

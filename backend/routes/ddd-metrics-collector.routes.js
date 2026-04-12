'use strict';
/**
 * MetricsCollector Routes
 * Auto-extracted from services/dddMetricsCollector.js
 * 6 endpoints — Auth required on all
 */

const { Router } = require('express');
const router = Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

const { getMetricsDashboard, queryMetrics, flushBuffer } = require('../services/dddMetricsCollector');

  router.get('/metrics/prometheus', authenticate, async (_req, res) => {
    try {
      res.json({ success: true });
    } catch (e) {
      safeError(res, e, 'metrics-collector');
    }
  });

  router.get('/metrics/dashboard', authenticate, async (_req, res) => {
    try {
    const dashboard = await getMetricsDashboard();
    res.json({ success: true, ...dashboard });
    } catch (e) {
      safeError(res, e, 'metrics-collector');
    }
  });

  router.post('/metrics/record', authenticate, async (req, res) => {
    try {
    const { name, value, type, tags } = req.body;
    recordMetric(name, value, type, tags);
    res.json({ success: true, message: 'Metric recorded' });
    } catch (e) {
      safeError(res, e, 'metrics-collector');
    }
  });

  router.get('/metrics/query', authenticate, async (req, res) => {
    try {
    const metrics = await queryMetrics(req.query.name, req.query);
    res.json({ success: true, count: metrics.length, metrics });
    } catch (e) {
      safeError(res, e, 'metrics-collector');
    }
  });

  router.post('/metrics/flush', authenticate, async (_req, res) => {
    try {
    const result = await flushBuffer();
    res.json({ success: true, ...result });
    } catch (e) {
      safeError(res, e, 'metrics-collector');
    }
  });

  router.get('/metrics/memory', authenticate, async (_req, res) => {
    try {
      res.json({ success: true });
    } catch (e) {
      safeError(res, e, 'metrics-collector');
    }
  });

module.exports = router;

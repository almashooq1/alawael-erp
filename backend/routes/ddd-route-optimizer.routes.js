'use strict';
/**
 * RouteOptimizer Routes
 * Auto-extracted from services/dddRouteOptimizer.js
 * 11 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddRouteOptimizer');
const { validate } = require('../middleware/validate');
const v = require('../validations/route-optimizer.validation');


  // Service imported as singleton above;

  /* Routes */
  router.get('/routes/list', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listRoutes(req.query) });
    } catch (e) {
      safeError(res, e, 'route-optimizer');
    }
  });
  router.get('/routes/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getRoute(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'route-optimizer');
    }
  });
  router.post('/routes', authenticate, validate(v.createRoute), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createRoute(req.body) });
    } catch (e) {
      safeError(res, e, 'route-optimizer');
    }
  });
  router.post('/routes/:id/optimize', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.optimizeRoute(req.params.id) });
    } catch (e) {
      safeError(res, e, 'route-optimizer');
    }
  });

  /* Executions */
  router.get('/routes/executions/list', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listExecutions(req.query) });
    } catch (e) {
      safeError(res, e, 'route-optimizer');
    }
  });
  router.post('/routes/executions/start', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.startExecution(req.body) });
    } catch (e) {
      safeError(res, e, 'route-optimizer');
    }
  });

  /* Zones */
  router.get('/routes/zones/list', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listZones(req.query) });
    } catch (e) {
      safeError(res, e, 'route-optimizer');
    }
  });
  router.post('/routes/zones', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createZone(req.body) });
    } catch (e) {
      safeError(res, e, 'route-optimizer');
    }
  });

  /* ETA */
  router.post('/routes/eta/calculate', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.calculateETA(req.body) });
    } catch (e) {
      safeError(res, e, 'route-optimizer');
    }
  });

  /* Analytics & Health */
  router.get('/routes/analytics/summary', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getRouteAnalytics() });
    } catch (e) {
      safeError(res, e, 'route-optimizer');
    }
  });
  router.get('/routes/health/check', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'route-optimizer');
    }
  });


module.exports = router;

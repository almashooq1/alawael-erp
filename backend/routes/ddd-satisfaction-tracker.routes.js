'use strict';
/**
 * SatisfactionTracker Routes
 * Auto-extracted from services/dddSatisfactionTracker.js
 * 13 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddSatisfactionTracker');
const { validate } = require('../middleware/validate');
const v = require('../validations/satisfaction-tracker.validation');

  router.get('/satisfaction-tracker/scores', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listScores(req.query) });
    } catch (e) {
      safeError(res, e, 'satisfaction-tracker');
    }
  });

  router.get('/satisfaction-tracker/scores/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getScore(req.params.id) });
    } catch (e) {
      safeError(res, e, 'satisfaction-tracker');
    }
  });

  router.post('/satisfaction-tracker/scores', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.recordScore(req.body) });
    } catch (e) {
      safeError(res, e, 'satisfaction-tracker');
    }
  });

  router.get('/satisfaction-tracker/trends', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listTrends(req.query) });
    } catch (e) {
      safeError(res, e, 'satisfaction-tracker');
    }
  });

  router.post('/satisfaction-tracker/trends', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.generateTrend(req.body) });
    } catch (e) {
      safeError(res, e, 'satisfaction-tracker');
    }
  });

  router.get('/satisfaction-tracker/benchmarks', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listBenchmarks(req.query) });
    } catch (e) {
      safeError(res, e, 'satisfaction-tracker');
    }
  });

  router.post('/satisfaction-tracker/benchmarks', authenticate, validate(v.createBenchmark), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createBenchmark(req.body) });
    } catch (e) {
      safeError(res, e, 'satisfaction-tracker');
    }
  });

  router.put('/satisfaction-tracker/benchmarks/:id', authenticate, validate(v.updateBenchmark), async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateBenchmark(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'satisfaction-tracker');
    }
  });

  router.get('/satisfaction-tracker/alerts', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listAlerts(req.query) });
    } catch (e) {
      safeError(res, e, 'satisfaction-tracker');
    }
  });

  router.post('/satisfaction-tracker/alerts', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createAlert(req.body) });
    } catch (e) {
      safeError(res, e, 'satisfaction-tracker');
    }
  });

  router.put('/satisfaction-tracker/alerts/:id/resolve', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.resolveAlert(req.params.id) });
    } catch (e) {
      safeError(res, e, 'satisfaction-tracker');
    }
  });

  router.get('/satisfaction-tracker/analytics', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getSatisfactionAnalytics(req.query) });
    } catch (e) {
      safeError(res, e, 'satisfaction-tracker');
    }
  });

  router.get('/satisfaction-tracker/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'satisfaction-tracker');
    }
  });

module.exports = router;

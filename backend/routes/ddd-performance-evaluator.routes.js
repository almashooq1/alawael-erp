'use strict';
/**
 * PerformanceEvaluator Routes
 * Auto-extracted from services/dddPerformanceEvaluator.js
 * 20 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddPerformanceEvaluator');
const { validate } = require('../middleware/validate');
const v = require('../validations/performance-evaluator.validation');


  // Service imported as singleton above;

  /* Reviews */
  router.get('/performance/reviews', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listReviews(req.query) });
    } catch (e) {
      safeError(res, e, 'performance-evaluator');
    }
  });
  router.get('/performance/reviews/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getReview(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'performance-evaluator');
    }
  });
  router.post('/performance/reviews', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createReview(req.body) });
    } catch (e) {
      safeError(res, e, 'performance-evaluator');
    }
  });
  router.put('/performance/reviews/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateReview(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'performance-evaluator');
    }
  });
  router.post('/performance/reviews/:id/submit', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.submitReview(req.params.id) });
    } catch (e) {
      safeError(res, e, 'performance-evaluator');
    }
  });
  router.post('/performance/reviews/:id/approve', authenticate, async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.approveReview(req.params.id, req.body.rating, req.body.score),
      });
    } catch (e) {
      safeError(res, e, 'performance-evaluator');
    }
  });
  router.post('/performance/reviews/:id/acknowledge', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.acknowledgeReview(req.params.id) });
    } catch (e) {
      safeError(res, e, 'performance-evaluator');
    }
  });
  router.post('/performance/reviews/:id/complete', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.completeReview(req.params.id) });
    } catch (e) {
      safeError(res, e, 'performance-evaluator');
    }
  });

  /* Goals */
  router.get('/performance/goals/:staffId', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listGoals(req.params.staffId, req.query) });
    } catch (e) {
      safeError(res, e, 'performance-evaluator');
    }
  });
  router.post('/performance/goals', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createGoal(req.body) });
    } catch (e) {
      safeError(res, e, 'performance-evaluator');
    }
  });
  router.put('/performance/goals/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateGoal(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'performance-evaluator');
    }
  });
  router.post('/performance/goals/:id/progress', authenticate, async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.updateGoalProgress(req.params.id, req.body.currentValue),
      });
    } catch (e) {
      safeError(res, e, 'performance-evaluator');
    }
  });
  router.post('/performance/goals/:id/complete', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.completeGoal(req.params.id, req.body.rating) });
    } catch (e) {
      safeError(res, e, 'performance-evaluator');
    }
  });

  /* Feedback */
  router.get('/performance/feedback/:staffId', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listFeedback(req.params.staffId, req.query) });
    } catch (e) {
      safeError(res, e, 'performance-evaluator');
    }
  });
  router.post('/performance/feedback', authenticate, validate(v.createFeedback), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.submitFeedback(req.body) });
    } catch (e) {
      safeError(res, e, 'performance-evaluator');
    }
  });

  /* KPIs */
  router.get('/performance/kpis', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listKPIs(req.query) });
    } catch (e) {
      safeError(res, e, 'performance-evaluator');
    }
  });
  router.post('/performance/kpis', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createKPI(req.body) });
    } catch (e) {
      safeError(res, e, 'performance-evaluator');
    }
  });
  router.put('/performance/kpis/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateKPI(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'performance-evaluator');
    }
  });

  /* Analytics & Health */
  router.get('/performance/analytics', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getPerformanceAnalytics() });
    } catch (e) {
      safeError(res, e, 'performance-evaluator');
    }
  });
  router.get('/performance/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'performance-evaluator');
    }
  });


module.exports = router;

'use strict';
/**
 * BusinessContinuity Routes
 * Auto-extracted from services/dddBusinessContinuity.js
 * 11 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddBusinessContinuity');


  // Service imported as singleton above;

  router.get('/business-continuity/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'business-continuity');
    }
  });

  router.post('/business-continuity/plans', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createPlan(req.body) });
    } catch (e) {
      safeError(res, e, 'business-continuity');
    }
  });
  router.get('/business-continuity/plans', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listPlans(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'business-continuity');
    }
  });
  router.put('/business-continuity/plans/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updatePlan(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'business-continuity');
    }
  });

  router.post('/business-continuity/impact-analyses', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createImpactAnalysis(req.body) });
    } catch (e) {
      safeError(res, e, 'business-continuity');
    }
  });
  router.get('/business-continuity/impact-analyses', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listImpactAnalyses(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'business-continuity');
    }
  });

  router.post('/business-continuity/exercises', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createExercise(req.body) });
    } catch (e) {
      safeError(res, e, 'business-continuity');
    }
  });
  router.get('/business-continuity/exercises', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listExercises(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'business-continuity');
    }
  });

  router.post('/business-continuity/assessments', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createAssessment(req.body) });
    } catch (e) {
      safeError(res, e, 'business-continuity');
    }
  });
  router.get('/business-continuity/assessments', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listAssessments(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'business-continuity');
    }
  });

  router.get('/business-continuity/stats', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getContinuityStats() });
    } catch (e) {
      safeError(res, e, 'business-continuity');
    }
  });

module.exports = router;

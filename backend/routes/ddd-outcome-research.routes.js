'use strict';
/**
 * OutcomeResearch Routes
 * Auto-extracted from services/dddOutcomeResearch.js
 * 11 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddOutcomeResearch');


  // Service imported as singleton above;

  router.get('/outcome-research/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'outcome-research');
    }
  });
  router.post('/outcome-research/measures', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createMeasure(req.body) });
    } catch (e) {
      safeError(res, e, 'outcome-research');
    }
  });
  router.get('/outcome-research/measures', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listMeasures(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'outcome-research');
    }
  });
  router.put('/outcome-research/measures/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateMeasure(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'outcome-research');
    }
  });
  router.post('/outcome-research/collections', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.collectData(req.body) });
    } catch (e) {
      safeError(res, e, 'outcome-research');
    }
  });
  router.get('/outcome-research/collections', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listCollections(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'outcome-research');
    }
  });
  router.post('/outcome-research/cohorts', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createCohort(req.body) });
    } catch (e) {
      safeError(res, e, 'outcome-research');
    }
  });
  router.get('/outcome-research/cohorts', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listCohorts(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'outcome-research');
    }
  });
  router.post('/outcome-research/analyses', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.saveAnalysis(req.body) });
    } catch (e) {
      safeError(res, e, 'outcome-research');
    }
  });
  router.get('/outcome-research/analyses', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listAnalyses(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'outcome-research');
    }
  });
  router.get('/outcome-research/stats', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getOutcomeStats() });
    } catch (e) {
      safeError(res, e, 'outcome-research');
    }
  });

module.exports = router;

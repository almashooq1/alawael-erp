'use strict';
/**
 * StandardsCompliance Routes
 * Auto-extracted from services/dddStandardsCompliance.js
 * 13 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddStandardsCompliance');


  // Service imported as singleton above;

  router.get('/standards-compliance/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'standards-compliance');
    }
  });

  router.post('/standards-compliance/standards', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createStandard(req.body) });
    } catch (e) {
      safeError(res, e, 'standards-compliance');
    }
  });
  router.get('/standards-compliance/standards', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listStandards(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'standards-compliance');
    }
  });
  router.put('/standards-compliance/standards/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateStandard(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'standards-compliance');
    }
  });

  router.post('/standards-compliance/assessments', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createAssessment(req.body) });
    } catch (e) {
      safeError(res, e, 'standards-compliance');
    }
  });
  router.get('/standards-compliance/assessments', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listAssessments(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'standards-compliance');
    }
  });

  router.post('/standards-compliance/gaps', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createGapAnalysis(req.body) });
    } catch (e) {
      safeError(res, e, 'standards-compliance');
    }
  });
  router.get('/standards-compliance/gaps', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listGapAnalyses(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'standards-compliance');
    }
  });
  router.put('/standards-compliance/gaps/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateGapAnalysis(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'standards-compliance');
    }
  });

  router.post('/standards-compliance/scores', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.recordScore(req.body) });
    } catch (e) {
      safeError(res, e, 'standards-compliance');
    }
  });
  router.get('/standards-compliance/scores', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listScores(req.query) });
    } catch (e) {
      safeError(res, e, 'standards-compliance');
    }
  });

  router.get('/standards-compliance/frameworks/:fw', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getFrameworkCompliance(req.params.fw) });
    } catch (e) {
      safeError(res, e, 'standards-compliance');
    }
  });
  router.get('/standards-compliance/open-gaps', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getOpenGaps() });
    } catch (e) {
      safeError(res, e, 'standards-compliance');
    }
  });

module.exports = router;

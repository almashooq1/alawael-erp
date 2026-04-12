'use strict';
/**
 * ClinicalResearch Routes
 * Auto-extracted from services/dddClinicalResearch.js
 * 11 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddClinicalResearch');


  // Service imported as singleton above;

  router.get('/clinical-research/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'clinical-research');
    }
  });
  router.post('/clinical-research/studies', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createStudy(req.body) });
    } catch (e) {
      safeError(res, e, 'clinical-research');
    }
  });
  router.get('/clinical-research/studies', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listStudies(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'clinical-research');
    }
  });
  router.put('/clinical-research/studies/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateStudy(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'clinical-research');
    }
  });
  router.post('/clinical-research/irb', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.submitIrb(req.body) });
    } catch (e) {
      safeError(res, e, 'clinical-research');
    }
  });
  router.get('/clinical-research/irb', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listIrbSubmissions(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'clinical-research');
    }
  });
  router.post('/clinical-research/ethics', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createEthicsReview(req.body) });
    } catch (e) {
      safeError(res, e, 'clinical-research');
    }
  });
  router.get('/clinical-research/ethics', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listEthicsReviews(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'clinical-research');
    }
  });
  router.post('/clinical-research/funding', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createFunding(req.body) });
    } catch (e) {
      safeError(res, e, 'clinical-research');
    }
  });
  router.get('/clinical-research/funding', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listFunding(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'clinical-research');
    }
  });
  router.get('/clinical-research/stats', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getResearchStats() });
    } catch (e) {
      safeError(res, e, 'clinical-research');
    }
  });

module.exports = router;

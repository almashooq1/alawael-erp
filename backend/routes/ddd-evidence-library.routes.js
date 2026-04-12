'use strict';
/**
 * EvidenceLibrary Routes
 * Auto-extracted from services/dddEvidenceLibrary.js
 * 13 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddEvidenceLibrary');
const { validate } = require('../middleware/validate');
const v = require('../validations/evidence-library.validation');

  router.get('/evidence-library/evidence', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listEvidence(req.query) });
    } catch (e) {
      safeError(res, e, 'evidence-library');
    }
  });

  router.get('/evidence-library/evidence/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getEvidence(req.params.id) });
    } catch (e) {
      safeError(res, e, 'evidence-library');
    }
  });

  router.post('/evidence-library/evidence', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.addEvidence(req.body) });
    } catch (e) {
      safeError(res, e, 'evidence-library');
    }
  });

  router.put('/evidence-library/evidence/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateEvidence(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'evidence-library');
    }
  });

  router.get('/evidence-library/guidelines', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listGuidelines(req.query) });
    } catch (e) {
      safeError(res, e, 'evidence-library');
    }
  });

  router.get('/evidence-library/guidelines/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getGuideline(req.params.id) });
    } catch (e) {
      safeError(res, e, 'evidence-library');
    }
  });

  router.post('/evidence-library/guidelines', authenticate, validate(v.createGuideline), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createGuideline(req.body) });
    } catch (e) {
      safeError(res, e, 'evidence-library');
    }
  });

  router.get('/evidence-library/reviews', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listReviews(req.query) });
    } catch (e) {
      safeError(res, e, 'evidence-library');
    }
  });

  router.post('/evidence-library/reviews', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.submitReview(req.body) });
    } catch (e) {
      safeError(res, e, 'evidence-library');
    }
  });

  router.get('/evidence-library/summaries', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listSummaries(req.query) });
    } catch (e) {
      safeError(res, e, 'evidence-library');
    }
  });

  router.post('/evidence-library/summaries', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.generateSummary(req.body) });
    } catch (e) {
      safeError(res, e, 'evidence-library');
    }
  });

  router.get('/evidence-library/analytics', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getEvidenceAnalytics(req.query) });
    } catch (e) {
      safeError(res, e, 'evidence-library');
    }
  });

  router.get('/evidence-library/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'evidence-library');
    }
  });

module.exports = router;

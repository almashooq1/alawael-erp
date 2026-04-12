'use strict';
/**
 * PublicationTracker Routes
 * Auto-extracted from services/dddPublicationTracker.js
 * 12 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddPublicationTracker');
const { validate } = require('../middleware/validate');
const v = require('../validations/publication-tracker.validation');

  router.get('/publication-tracker/publications', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listPublications(req.query) });
    } catch (e) {
      safeError(res, e, 'publication-tracker');
    }
  });

  router.get('/publication-tracker/publications/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getPublication(req.params.id) });
    } catch (e) {
      safeError(res, e, 'publication-tracker');
    }
  });

  router.post('/publication-tracker/publications', authenticate, validate(v.createPublication), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createPublication(req.body) });
    } catch (e) {
      safeError(res, e, 'publication-tracker');
    }
  });

  router.put('/publication-tracker/publications/:id', authenticate, validate(v.updatePublication), async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updatePublication(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'publication-tracker');
    }
  });

  router.get('/publication-tracker/citations', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listCitations(req.query) });
    } catch (e) {
      safeError(res, e, 'publication-tracker');
    }
  });

  router.post('/publication-tracker/citations', authenticate, validate(v.createCitation), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.addCitation(req.body) });
    } catch (e) {
      safeError(res, e, 'publication-tracker');
    }
  });

  router.get('/publication-tracker/impact', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listImpactRecords(req.query) });
    } catch (e) {
      safeError(res, e, 'publication-tracker');
    }
  });

  router.post('/publication-tracker/impact', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.recordImpact(req.body) });
    } catch (e) {
      safeError(res, e, 'publication-tracker');
    }
  });

  router.get('/publication-tracker/disseminations', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listDisseminations(req.query) });
    } catch (e) {
      safeError(res, e, 'publication-tracker');
    }
  });

  router.post('/publication-tracker/disseminations', authenticate, validate(v.createDissemination), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createDissemination(req.body) });
    } catch (e) {
      safeError(res, e, 'publication-tracker');
    }
  });

  router.get('/publication-tracker/analytics', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getPublicationAnalytics(req.query) });
    } catch (e) {
      safeError(res, e, 'publication-tracker');
    }
  });

  router.get('/publication-tracker/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'publication-tracker');
    }
  });

module.exports = router;

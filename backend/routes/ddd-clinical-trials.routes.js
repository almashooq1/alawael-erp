'use strict';
/**
 * ClinicalTrials Routes
 * Auto-extracted from services/dddClinicalTrials.js
 * 11 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddClinicalTrials');
const { validate } = require('../middleware/validate');
const v = require('../validations/clinical-trials.validation');


  // Service imported as singleton above;

  router.get('/clinical-trials/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'clinical-trials');
    }
  });
  router.post('/clinical-trials/trials', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createTrial(req.body) });
    } catch (e) {
      safeError(res, e, 'clinical-trials');
    }
  });
  router.get('/clinical-trials/trials', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listTrials(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'clinical-trials');
    }
  });
  router.put('/clinical-trials/trials/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateTrial(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'clinical-trials');
    }
  });
  router.post('/clinical-trials/enrollments', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.enrollParticipant(req.body) });
    } catch (e) {
      safeError(res, e, 'clinical-trials');
    }
  });
  router.get('/clinical-trials/enrollments', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listEnrollments(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'clinical-trials');
    }
  });
  router.post('/clinical-trials/adverse-events', authenticate, validate(v.createAdverseEvent), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.reportAdverseEvent(req.body) });
    } catch (e) {
      safeError(res, e, 'clinical-trials');
    }
  });
  router.get('/clinical-trials/adverse-events', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listAdverseEvents(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'clinical-trials');
    }
  });
  router.post('/clinical-trials/endpoints', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createEndpoint(req.body) });
    } catch (e) {
      safeError(res, e, 'clinical-trials');
    }
  });
  router.get('/clinical-trials/endpoints', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listEndpoints(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'clinical-trials');
    }
  });
  router.get('/clinical-trials/stats', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getTrialStats() });
    } catch (e) {
      safeError(res, e, 'clinical-trials');
    }
  });

module.exports = router;

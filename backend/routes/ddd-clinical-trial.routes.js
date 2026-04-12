'use strict';
/**
 * ClinicalTrial Routes
 * Auto-extracted from services/dddClinicalTrial.js
 * 13 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddClinicalTrial');
const { validate } = require('../middleware/validate');
const v = require('../validations/clinical-trial.validation');

  router.get('/clinical-trial/trials', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listTrials(req.query) });
    } catch (e) {
      safeError(res, e, 'clinical-trial');
    }
  });

  router.get('/clinical-trial/trials/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getTrial(req.params.id) });
    } catch (e) {
      safeError(res, e, 'clinical-trial');
    }
  });

  router.post('/clinical-trial/trials', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createTrial(req.body) });
    } catch (e) {
      safeError(res, e, 'clinical-trial');
    }
  });

  router.put('/clinical-trial/trials/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateTrial(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'clinical-trial');
    }
  });

  router.get('/clinical-trial/participants', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listParticipants(req.query) });
    } catch (e) {
      safeError(res, e, 'clinical-trial');
    }
  });

  router.post('/clinical-trial/participants', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.enrollParticipant(req.body) });
    } catch (e) {
      safeError(res, e, 'clinical-trial');
    }
  });

  router.put('/clinical-trial/participants/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateParticipant(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'clinical-trial');
    }
  });

  router.get('/clinical-trial/monitoring', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listMonitoringEvents(req.query) });
    } catch (e) {
      safeError(res, e, 'clinical-trial');
    }
  });

  router.post('/clinical-trial/monitoring', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.recordMonitoringEvent(req.body) });
    } catch (e) {
      safeError(res, e, 'clinical-trial');
    }
  });

  router.get('/clinical-trial/adverse-events', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listAdverseEvents(req.query) });
    } catch (e) {
      safeError(res, e, 'clinical-trial');
    }
  });

  router.post('/clinical-trial/adverse-events', authenticate, validate(v.createAdverseEvent), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.reportAdverseEvent(req.body) });
    } catch (e) {
      safeError(res, e, 'clinical-trial');
    }
  });

  router.get('/clinical-trial/analytics', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getTrialAnalytics(req.query) });
    } catch (e) {
      safeError(res, e, 'clinical-trial');
    }
  });

  router.get('/clinical-trial/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'clinical-trial');
    }
  });

module.exports = router;

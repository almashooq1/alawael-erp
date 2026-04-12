'use strict';
/**
 * PatientExperience Routes
 * Auto-extracted from services/dddPatientExperience.js
 * 14 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddPatientExperience');
const { validate } = require('../middleware/validate');
const v = require('../validations/patient-experience.validation');

  router.get('/patient-experience/journeys', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listJourneys(req.query) });
    } catch (e) {
      safeError(res, e, 'patient-experience');
    }
  });

  router.get('/patient-experience/journeys/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getJourney(req.params.id) });
    } catch (e) {
      safeError(res, e, 'patient-experience');
    }
  });

  router.post('/patient-experience/journeys', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createJourney(req.body) });
    } catch (e) {
      safeError(res, e, 'patient-experience');
    }
  });

  router.put('/patient-experience/journeys/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateJourney(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'patient-experience');
    }
  });

  router.post('/patient-experience/journeys/:id/advance', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.advanceStage(req.params.id, req.body.stage) });
    } catch (e) {
      safeError(res, e, 'patient-experience');
    }
  });

  router.get('/patient-experience/touchpoints', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listTouchpoints(req.query) });
    } catch (e) {
      safeError(res, e, 'patient-experience');
    }
  });

  router.post('/patient-experience/touchpoints', authenticate, validate(v.createTouchpoint), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.recordTouchpoint(req.body) });
    } catch (e) {
      safeError(res, e, 'patient-experience');
    }
  });

  router.put('/patient-experience/touchpoints/:id', authenticate, validate(v.updateTouchpoint), async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateTouchpoint(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'patient-experience');
    }
  });

  router.get('/patient-experience/scores', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listExperienceScores(req.query) });
    } catch (e) {
      safeError(res, e, 'patient-experience');
    }
  });

  router.post('/patient-experience/scores', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.recordExperienceScore(req.body) });
    } catch (e) {
      safeError(res, e, 'patient-experience');
    }
  });

  router.get('/patient-experience/insights', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listInsights(req.query) });
    } catch (e) {
      safeError(res, e, 'patient-experience');
    }
  });

  router.post('/patient-experience/insights', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.generateInsight(req.body) });
    } catch (e) {
      safeError(res, e, 'patient-experience');
    }
  });

  router.get('/patient-experience/analytics', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getExperienceAnalytics(req.query) });
    } catch (e) {
      safeError(res, e, 'patient-experience');
    }
  });

  router.get('/patient-experience/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'patient-experience');
    }
  });

module.exports = router;

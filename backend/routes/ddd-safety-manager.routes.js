'use strict';
/**
 * SafetyManager Routes
 * Auto-extracted from services/dddSafetyManager.js
 * 14 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddSafetyManager');


  // Service imported as singleton above;

  /* Inspections */
  router.get('/safety/inspections', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listInspections(req.query) });
    } catch (e) {
      safeError(res, e, 'safety-manager');
    }
  });
  router.get('/safety/inspections/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getInspection(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'safety-manager');
    }
  });
  router.post('/safety/inspections', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.scheduleInspection(req.body) });
    } catch (e) {
      safeError(res, e, 'safety-manager');
    }
  });
  router.post('/safety/inspections/:id/complete', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.completeInspection(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'safety-manager');
    }
  });

  /* Hazards */
  router.get('/safety/hazards', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listHazards(req.query) });
    } catch (e) {
      safeError(res, e, 'safety-manager');
    }
  });
  router.post('/safety/hazards', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.reportHazard(req.body) });
    } catch (e) {
      safeError(res, e, 'safety-manager');
    }
  });
  router.post('/safety/hazards/:id/resolve', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.resolveHazard(req.params.id, req.body.rootCause) });
    } catch (e) {
      safeError(res, e, 'safety-manager');
    }
  });

  /* Policies */
  router.get('/safety/policies', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listPolicies(req.query) });
    } catch (e) {
      safeError(res, e, 'safety-manager');
    }
  });
  router.get('/safety/policies/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getPolicy(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'safety-manager');
    }
  });
  router.post('/safety/policies', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createPolicy(req.body) });
    } catch (e) {
      safeError(res, e, 'safety-manager');
    }
  });

  /* Training */
  router.get('/safety/trainings', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listTrainings(req.query) });
    } catch (e) {
      safeError(res, e, 'safety-manager');
    }
  });
  router.post('/safety/trainings', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.scheduleTraining(req.body) });
    } catch (e) {
      safeError(res, e, 'safety-manager');
    }
  });

  /* Analytics & Health */
  router.get('/safety/analytics', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getSafetyAnalytics() });
    } catch (e) {
      safeError(res, e, 'safety-manager');
    }
  });
  router.get('/safety/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'safety-manager');
    }
  });


module.exports = router;

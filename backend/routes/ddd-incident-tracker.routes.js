'use strict';
/**
 * IncidentTracker Routes
 * Auto-extracted from services/dddIncidentTracker.js
 * 14 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddIncidentTracker');
const { validate } = require('../middleware/validate');
const v = require('../validations/incident-tracker.validation');


  // Service imported as singleton above;

  /* Incidents */
  router.get('/incidents', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listIncidents(req.query) });
    } catch (e) {
      safeError(res, e, 'incident-tracker');
    }
  });
  router.get('/incidents/search', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.searchIncidents(req.query.q || '') });
    } catch (e) {
      safeError(res, e, 'incident-tracker');
    }
  });
  router.get('/incidents/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getIncident(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'incident-tracker');
    }
  });
  router.post('/incidents', authenticate, validate(v.createIncident), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.reportIncident(req.body) });
    } catch (e) {
      safeError(res, e, 'incident-tracker');
    }
  });
  router.put('/incidents/:id', authenticate, validate(v.updateIncident), async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateIncident(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'incident-tracker');
    }
  });
  router.post('/incidents/:id/resolve', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.resolveIncident(req.params.id, req.body.userId) });
    } catch (e) {
      safeError(res, e, 'incident-tracker');
    }
  });

  /* Categories */
  router.get('/incidents/categories', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.listCategories() });
    } catch (e) {
      safeError(res, e, 'incident-tracker');
    }
  });

  /* Investigations */
  router.get('/incidents/investigations', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listInvestigations(req.query) });
    } catch (e) {
      safeError(res, e, 'incident-tracker');
    }
  });
  router.post('/incidents/investigations', authenticate, validate(v.createInvestigation), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createInvestigation(req.body) });
    } catch (e) {
      safeError(res, e, 'incident-tracker');
    }
  });
  router.put('/incidents/investigations/:id', authenticate, validate(v.updateInvestigation), async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateInvestigation(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'incident-tracker');
    }
  });

  /* Corrective Actions */
  router.get('/incidents/corrective-actions', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listCorrectiveActions(req.query) });
    } catch (e) {
      safeError(res, e, 'incident-tracker');
    }
  });
  router.post('/incidents/corrective-actions', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createCorrectiveAction(req.body) });
    } catch (e) {
      safeError(res, e, 'incident-tracker');
    }
  });

  /* Analytics & Health */
  router.get('/incidents/analytics', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getIncidentAnalytics() });
    } catch (e) {
      safeError(res, e, 'incident-tracker');
    }
  });
  router.get('/incidents/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'incident-tracker');
    }
  });


module.exports = router;

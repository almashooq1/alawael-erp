'use strict';
/**
 * IncidentResponse Routes
 * Auto-extracted from services/dddIncidentResponse.js
 * 11 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddIncidentResponse');
const { validate } = require('../middleware/validate');
const v = require('../validations/incident-response.validation');


  // Service imported as singleton above;

  router.get('/incident-response/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'incident-response');
    }
  });

  router.post('/incident-response/incidents', authenticate, validate(v.createIncident), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createIncident(req.body) });
    } catch (e) {
      safeError(res, e, 'incident-response');
    }
  });
  router.get('/incident-response/incidents', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listIncidents(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'incident-response');
    }
  });
  router.put('/incident-response/incidents/:id', authenticate, validate(v.updateIncident), async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateIncident(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'incident-response');
    }
  });

  router.post('/incident-response/actions', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.addAction(req.body) });
    } catch (e) {
      safeError(res, e, 'incident-response');
    }
  });
  router.get('/incident-response/actions', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 50, ...f } = req.query;
      res.json({ success: true, data: await svc.listActions(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'incident-response');
    }
  });

  router.post('/incident-response/post-mortems', authenticate, validate(v.createPostMortem), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createPostMortem(req.body) });
    } catch (e) {
      safeError(res, e, 'incident-response');
    }
  });
  router.get('/incident-response/post-mortems', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listPostMortems(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'incident-response');
    }
  });

  router.post('/incident-response/communications', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.addCommunication(req.body) });
    } catch (e) {
      safeError(res, e, 'incident-response');
    }
  });
  router.get('/incident-response/communications', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 50, ...f } = req.query;
      res.json({ success: true, data: await svc.listCommunications(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'incident-response');
    }
  });

  router.get('/incident-response/stats', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getIncidentStats() });
    } catch (e) {
      safeError(res, e, 'incident-response');
    }
  });

module.exports = router;

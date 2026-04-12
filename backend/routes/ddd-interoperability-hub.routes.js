'use strict';
/**
 * InteroperabilityHub Routes
 * Auto-extracted from services/dddInteroperabilityHub.js
 * 11 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddInteroperabilityHub');


  // Service imported as singleton above;

  router.get('/interoperability-hub/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'interoperability-hub');
    }
  });

  router.post('/interoperability-hub/connections', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createConnection(req.body) });
    } catch (e) {
      safeError(res, e, 'interoperability-hub');
    }
  });
  router.get('/interoperability-hub/connections', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listConnections(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'interoperability-hub');
    }
  });
  router.put('/interoperability-hub/connections/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateConnection(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'interoperability-hub');
    }
  });

  router.post('/interoperability-hub/subscriptions', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createSubscription(req.body) });
    } catch (e) {
      safeError(res, e, 'interoperability-hub');
    }
  });
  router.get('/interoperability-hub/subscriptions', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listSubscriptions(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'interoperability-hub');
    }
  });

  router.post('/interoperability-hub/events', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createEvent(req.body) });
    } catch (e) {
      safeError(res, e, 'interoperability-hub');
    }
  });
  router.get('/interoperability-hub/events', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 50, ...f } = req.query;
      res.json({ success: true, data: await svc.listEvents(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'interoperability-hub');
    }
  });

  router.post('/interoperability-hub/apis', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.registerApi(req.body) });
    } catch (e) {
      safeError(res, e, 'interoperability-hub');
    }
  });
  router.get('/interoperability-hub/apis', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listApis(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'interoperability-hub');
    }
  });

  router.get('/interoperability-hub/stats', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getHubStats() });
    } catch (e) {
      safeError(res, e, 'interoperability-hub');
    }
  });

module.exports = router;

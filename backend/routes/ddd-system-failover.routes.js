'use strict';
/**
 * SystemFailover Routes
 * Auto-extracted from services/dddSystemFailover.js
 * 11 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddSystemFailover');


  // Service imported as singleton above;

  router.get('/system-failover/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'system-failover');
    }
  });

  router.post('/system-failover/configs', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createConfig(req.body) });
    } catch (e) {
      safeError(res, e, 'system-failover');
    }
  });
  router.get('/system-failover/configs', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listConfigs(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'system-failover');
    }
  });
  router.put('/system-failover/configs/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateConfig(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'system-failover');
    }
  });

  router.post('/system-failover/probes', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.recordProbe(req.body) });
    } catch (e) {
      safeError(res, e, 'system-failover');
    }
  });
  router.get('/system-failover/probes', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 50, ...f } = req.query;
      res.json({ success: true, data: await svc.listProbes(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'system-failover');
    }
  });

  router.post('/system-failover/switchovers', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createSwitchover(req.body) });
    } catch (e) {
      safeError(res, e, 'system-failover');
    }
  });
  router.get('/system-failover/switchovers', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listSwitchovers(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'system-failover');
    }
  });

  router.post('/system-failover/tests', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createTest(req.body) });
    } catch (e) {
      safeError(res, e, 'system-failover');
    }
  });
  router.get('/system-failover/tests', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listTests(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'system-failover');
    }
  });

  router.get('/system-failover/stats', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getFailoverStats() });
    } catch (e) {
      safeError(res, e, 'system-failover');
    }
  });

module.exports = router;

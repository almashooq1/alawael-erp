'use strict';
/**
 * RemoteMonitoring Routes
 * Auto-extracted from services/dddRemoteMonitoring.js
 * 11 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddRemoteMonitoring');


  // Service imported as singleton above;

  router.get('/remote-monitoring/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'remote-monitoring');
    }
  });

  router.post('/remote-monitoring/devices', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.registerDevice(req.body) });
    } catch (e) {
      safeError(res, e, 'remote-monitoring');
    }
  });
  router.get('/remote-monitoring/devices', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listDevices(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'remote-monitoring');
    }
  });
  router.put('/remote-monitoring/devices/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateDevice(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'remote-monitoring');
    }
  });

  router.post('/remote-monitoring/vitals', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.recordVital(req.body) });
    } catch (e) {
      safeError(res, e, 'remote-monitoring');
    }
  });
  router.get('/remote-monitoring/vitals', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 50, ...f } = req.query;
      res.json({ success: true, data: await svc.listVitals(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'remote-monitoring');
    }
  });

  router.post('/remote-monitoring/alerts', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createAlert(req.body) });
    } catch (e) {
      safeError(res, e, 'remote-monitoring');
    }
  });
  router.get('/remote-monitoring/alerts', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listAlerts(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'remote-monitoring');
    }
  });

  router.post('/remote-monitoring/escalations', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createEscalation(req.body) });
    } catch (e) {
      safeError(res, e, 'remote-monitoring');
    }
  });
  router.get('/remote-monitoring/escalations', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listEscalations(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'remote-monitoring');
    }
  });

  router.get('/remote-monitoring/stats', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getMonitoringStats() });
    } catch (e) {
      safeError(res, e, 'remote-monitoring');
    }
  });

module.exports = router;

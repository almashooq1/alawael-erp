'use strict';
/**
 * EnvironmentalMonitor Routes
 * Auto-extracted from services/dddEnvironmentalMonitor.js
 * 15 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddEnvironmentalMonitor');
const { validate } = require('../middleware/validate');
const v = require('../validations/environmental-monitor.validation');


  // Service imported as singleton above;

  /* Sensors */
  router.get('/environment/sensors', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listSensors(req.query) });
    } catch (e) {
      safeError(res, e, 'environmental-monitor');
    }
  });
  router.get('/environment/sensors/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getSensor(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'environmental-monitor');
    }
  });
  router.post('/environment/sensors', authenticate, validate(v.createSensor), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createSensor(req.body) });
    } catch (e) {
      safeError(res, e, 'environmental-monitor');
    }
  });
  router.put('/environment/sensors/:id', authenticate, validate(v.updateSensor), async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateSensor(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'environmental-monitor');
    }
  });

  /* Readings */
  router.get('/environment/sensors/:id/readings', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getReadings(req.params.id, req.query) });
    } catch (e) {
      safeError(res, e, 'environmental-monitor');
    }
  });
  router.get('/environment/sensors/:id/latest', authenticate, async (req, res) => {
    try {
      const d = await svc.getLatestReading(req.params.id);
      res.json({ success: true, data: d });
    } catch (e) {
      safeError(res, e, 'environmental-monitor');
    }
  });
  router.post('/environment/readings', authenticate, async (req, res) => {
    try {
      res
        .status(201)
        .json({
          success: true,
          data: await svc.recordReading(req.body.sensorId, req.body.value, req.body),
        });
    } catch (e) {
      safeError(res, e, 'environmental-monitor');
    }
  });

  /* Alerts */
  router.get('/environment/alerts', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listAlerts(req.query) });
    } catch (e) {
      safeError(res, e, 'environmental-monitor');
    }
  });
  router.post('/environment/alerts/:id/acknowledge', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.acknowledgeAlert(req.params.id, req.body.userId) });
    } catch (e) {
      safeError(res, e, 'environmental-monitor');
    }
  });
  router.post('/environment/alerts/:id/resolve', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.resolveAlert(req.params.id, req.body.userId) });
    } catch (e) {
      safeError(res, e, 'environmental-monitor');
    }
  });

  /* Policies */
  router.get('/environment/policies', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listPolicies(req.query) });
    } catch (e) {
      safeError(res, e, 'environmental-monitor');
    }
  });
  router.post('/environment/policies', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createPolicy(req.body) });
    } catch (e) {
      safeError(res, e, 'environmental-monitor');
    }
  });
  router.put('/environment/policies/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updatePolicy(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'environmental-monitor');
    }
  });

  /* Analytics & Health */
  router.get('/environment/analytics', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getEnvironmentalAnalytics() });
    } catch (e) {
      safeError(res, e, 'environmental-monitor');
    }
  });
  router.get('/environment/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'environmental-monitor');
    }
  });


module.exports = router;

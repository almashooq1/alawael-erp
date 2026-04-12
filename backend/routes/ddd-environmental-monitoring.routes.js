'use strict';
/**
 * EnvironmentalMonitoring Routes
 * Auto-extracted from services/dddEnvironmentalMonitoring.js
 * 10 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddEnvironmentalMonitoring');


  // Service imported as singleton above;

  router.get('/environmental-monitoring/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'environmental-monitoring');
    }
  });
  router.post('/environmental-monitoring/sensors', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createSensor(req.body) });
    } catch (e) {
      safeError(res, e, 'environmental-monitoring');
    }
  });
  router.get('/environmental-monitoring/sensors', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listSensors(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'environmental-monitoring');
    }
  });
  router.post('/environmental-monitoring/readings', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.recordReading(req.body) });
    } catch (e) {
      safeError(res, e, 'environmental-monitoring');
    }
  });
  router.get('/environmental-monitoring/readings', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 50, ...f } = req.query;
      res.json({ success: true, data: await svc.listReadings(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'environmental-monitoring');
    }
  });
  router.post('/environmental-monitoring/alerts', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createAlert(req.body) });
    } catch (e) {
      safeError(res, e, 'environmental-monitoring');
    }
  });
  router.get('/environmental-monitoring/alerts', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listAlerts(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'environmental-monitoring');
    }
  });
  router.post('/environmental-monitoring/compliance', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createCompliance(req.body) });
    } catch (e) {
      safeError(res, e, 'environmental-monitoring');
    }
  });
  router.get('/environmental-monitoring/compliance', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listCompliance(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'environmental-monitoring');
    }
  });
  router.get('/environmental-monitoring/stats', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getEnvStats() });
    } catch (e) {
      safeError(res, e, 'environmental-monitoring');
    }
  });

module.exports = router;

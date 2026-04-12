'use strict';
/**
 * TransportManager Routes
 * Auto-extracted from services/dddTransportManager.js
 * 11 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddTransportManager');
const { validate } = require('../middleware/validate');
const v = require('../validations/transport-manager.validation');


  // Service imported as singleton above;

  /* Vehicles */
  router.get('/transport/vehicles', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listVehicles(req.query) });
    } catch (e) {
      safeError(res, e, 'transport-manager');
    }
  });
  router.get('/transport/vehicles/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getVehicle(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'transport-manager');
    }
  });
  router.post('/transport/vehicles', authenticate, validate(v.createVehicle), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.registerVehicle(req.body) });
    } catch (e) {
      safeError(res, e, 'transport-manager');
    }
  });
  router.put('/transport/vehicles/:id', authenticate, validate(v.updateVehicle), async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateVehicle(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'transport-manager');
    }
  });

  /* Drivers */
  router.get('/transport/drivers', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listDrivers(req.query) });
    } catch (e) {
      safeError(res, e, 'transport-manager');
    }
  });
  router.post('/transport/drivers', authenticate, validate(v.createDriver), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.registerDriver(req.body) });
    } catch (e) {
      safeError(res, e, 'transport-manager');
    }
  });

  /* Schedules */
  router.get('/transport/schedules', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listSchedules(req.query) });
    } catch (e) {
      safeError(res, e, 'transport-manager');
    }
  });
  router.post('/transport/schedules', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createSchedule(req.body) });
    } catch (e) {
      safeError(res, e, 'transport-manager');
    }
  });

  /* Policies */
  router.get('/transport/policies', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listPolicies(req.query) });
    } catch (e) {
      safeError(res, e, 'transport-manager');
    }
  });

  /* Analytics & Health */
  router.get('/transport/analytics', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getTransportAnalytics() });
    } catch (e) {
      safeError(res, e, 'transport-manager');
    }
  });
  router.get('/transport/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'transport-manager');
    }
  });


module.exports = router;

'use strict';
/**
 * FleetTracker Routes
 * Auto-extracted from services/dddFleetTracker.js
 * 13 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddFleetTracker');
const { validate } = require('../middleware/validate');
const v = require('../validations/fleet-tracker.validation');


  // Service imported as singleton above;

  /* Fuel */
  router.get('/fleet/fuel-logs', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listFuelLogs(req.query) });
    } catch (e) {
      safeError(res, e, 'fleet-tracker');
    }
  });
  router.post('/fleet/fuel-logs', authenticate, validate(v.createFuelLog), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.logFuel(req.body) });
    } catch (e) {
      safeError(res, e, 'fleet-tracker');
    }
  });

  /* GPS */
  router.get('/fleet/tracking/:vehicleId/latest', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getLatestPosition(req.params.vehicleId) });
    } catch (e) {
      safeError(res, e, 'fleet-tracker');
    }
  });
  router.get('/fleet/tracking/:vehicleId/history', authenticate, async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.getTrackingHistory(req.params.vehicleId, req.query.from, req.query.to),
      });
    } catch (e) {
      safeError(res, e, 'fleet-tracker');
    }
  });
  router.post('/fleet/tracking', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.recordPosition(req.body) });
    } catch (e) {
      safeError(res, e, 'fleet-tracker');
    }
  });

  /* Maintenance */
  router.get('/fleet/maintenance', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listMaintenance(req.query) });
    } catch (e) {
      safeError(res, e, 'fleet-tracker');
    }
  });
  router.post('/fleet/maintenance', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.scheduleMaintenance(req.body) });
    } catch (e) {
      safeError(res, e, 'fleet-tracker');
    }
  });
  router.post('/fleet/maintenance/:id/complete', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.completeMaintenance(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'fleet-tracker');
    }
  });

  /* Inspections */
  router.get('/fleet/inspections', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listInspections(req.query) });
    } catch (e) {
      safeError(res, e, 'fleet-tracker');
    }
  });
  router.post('/fleet/inspections', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.scheduleInspection(req.body) });
    } catch (e) {
      safeError(res, e, 'fleet-tracker');
    }
  });
  router.post('/fleet/inspections/:id/complete', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.completeInspection(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'fleet-tracker');
    }
  });

  /* Analytics & Health */
  router.get('/fleet/analytics', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getFleetAnalytics() });
    } catch (e) {
      safeError(res, e, 'fleet-tracker');
    }
  });
  router.get('/fleet/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'fleet-tracker');
    }
  });


module.exports = router;

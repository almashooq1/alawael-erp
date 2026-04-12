'use strict';
/**
 * MaintenanceTracker Routes
 * Auto-extracted from services/dddMaintenanceTracker.js
 * 20 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddMaintenanceTracker');
const { validate } = require('../middleware/validate');
const v = require('../validations/maintenance-tracker.validation');


  // Service imported as singleton above;

  /* Work Orders */
  router.get('/maintenance/work-orders', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listWorkOrders(req.query) });
    } catch (e) {
      safeError(res, e, 'maintenance-tracker');
    }
  });
  router.get('/maintenance/work-orders/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getWorkOrder(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'maintenance-tracker');
    }
  });
  router.post('/maintenance/work-orders', authenticate, validate(v.createWorkOrder), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createWorkOrder(req.body) });
    } catch (e) {
      safeError(res, e, 'maintenance-tracker');
    }
  });
  router.put('/maintenance/work-orders/:id', authenticate, validate(v.updateWorkOrder), async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateWorkOrder(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'maintenance-tracker');
    }
  });
  router.post('/maintenance/work-orders/:id/assign', authenticate, async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.assignWorkOrder(req.params.id, req.body.userId, req.body.team),
      });
    } catch (e) {
      safeError(res, e, 'maintenance-tracker');
    }
  });
  router.post('/maintenance/work-orders/:id/start', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.startWorkOrder(req.params.id) });
    } catch (e) {
      safeError(res, e, 'maintenance-tracker');
    }
  });
  router.post('/maintenance/work-orders/:id/complete', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.completeWorkOrder(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'maintenance-tracker');
    }
  });
  router.post('/maintenance/work-orders/:id/close', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.closeWorkOrder(req.params.id) });
    } catch (e) {
      safeError(res, e, 'maintenance-tracker');
    }
  });

  /* Preventive Schedules */
  router.get('/maintenance/preventive-schedules', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listPreventiveSchedules(req.query) });
    } catch (e) {
      safeError(res, e, 'maintenance-tracker');
    }
  });
  router.post('/maintenance/preventive-schedules', authenticate, validate(v.createPreventiveSchedule), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createPreventiveSchedule(req.body) });
    } catch (e) {
      safeError(res, e, 'maintenance-tracker');
    }
  });
  router.put('/maintenance/preventive-schedules/:id', authenticate, validate(v.updatePreventiveSchedule), async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.updatePreventiveSchedule(req.params.id, req.body),
      });
    } catch (e) {
      safeError(res, e, 'maintenance-tracker');
    }
  });
  router.get('/maintenance/preventive-schedules/overdue', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getOverdueSchedules() });
    } catch (e) {
      safeError(res, e, 'maintenance-tracker');
    }
  });

  /* Service Records */
  router.get('/maintenance/service-records', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listServiceRecords(req.query) });
    } catch (e) {
      safeError(res, e, 'maintenance-tracker');
    }
  });
  router.post('/maintenance/service-records', authenticate, validate(v.createServiceRecord), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createServiceRecord(req.body) });
    } catch (e) {
      safeError(res, e, 'maintenance-tracker');
    }
  });

  /* Assets */
  router.get('/maintenance/assets', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listAssets(req.query) });
    } catch (e) {
      safeError(res, e, 'maintenance-tracker');
    }
  });
  router.get('/maintenance/assets/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getAsset(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'maintenance-tracker');
    }
  });
  router.post('/maintenance/assets', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createAsset(req.body) });
    } catch (e) {
      safeError(res, e, 'maintenance-tracker');
    }
  });
  router.put('/maintenance/assets/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateAsset(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'maintenance-tracker');
    }
  });

  /* Analytics & Health */
  router.get('/maintenance/analytics', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getMaintenanceAnalytics() });
    } catch (e) {
      safeError(res, e, 'maintenance-tracker');
    }
  });
  router.get('/maintenance/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'maintenance-tracker');
    }
  });


module.exports = router;

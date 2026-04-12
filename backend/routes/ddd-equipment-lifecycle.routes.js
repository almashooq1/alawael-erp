'use strict';
/**
 * EquipmentLifecycle Routes
 * Auto-extracted from services/dddEquipmentLifecycle.js
 * 11 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddEquipmentLifecycle');


  // Service imported as singleton above;

  router.get('/equipment-lifecycle/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'equipment-lifecycle');
    }
  });
  router.post('/equipment-lifecycle/assets', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createAsset(req.body) });
    } catch (e) {
      safeError(res, e, 'equipment-lifecycle');
    }
  });
  router.get('/equipment-lifecycle/assets', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listAssets(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'equipment-lifecycle');
    }
  });
  router.put('/equipment-lifecycle/assets/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateAsset(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'equipment-lifecycle');
    }
  });
  router.post('/equipment-lifecycle/maintenance', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createMaintenance(req.body) });
    } catch (e) {
      safeError(res, e, 'equipment-lifecycle');
    }
  });
  router.get('/equipment-lifecycle/maintenance', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listMaintenance(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'equipment-lifecycle');
    }
  });
  router.post('/equipment-lifecycle/calibrations', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createCalibration(req.body) });
    } catch (e) {
      safeError(res, e, 'equipment-lifecycle');
    }
  });
  router.get('/equipment-lifecycle/calibrations', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listCalibrations(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'equipment-lifecycle');
    }
  });
  router.post('/equipment-lifecycle/disposals', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createDisposal(req.body) });
    } catch (e) {
      safeError(res, e, 'equipment-lifecycle');
    }
  });
  router.get('/equipment-lifecycle/disposals', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listDisposals(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'equipment-lifecycle');
    }
  });
  router.get('/equipment-lifecycle/stats', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getLifecycleStats() });
    } catch (e) {
      safeError(res, e, 'equipment-lifecycle');
    }
  });

module.exports = router;

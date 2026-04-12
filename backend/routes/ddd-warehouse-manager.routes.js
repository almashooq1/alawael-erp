'use strict';
/**
 * WarehouseManager Routes
 * Auto-extracted from services/dddWarehouseManager.js
 * 19 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddWarehouseManager');
const { validate } = require('../middleware/validate');
const v = require('../validations/warehouse-manager.validation');


  // Service imported as singleton above;

  /* Warehouses */
  router.get('/warehouse/warehouses', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listWarehouses(req.query) });
    } catch (e) {
      safeError(res, e, 'warehouse-manager');
    }
  });
  router.get('/warehouse/warehouses/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getWarehouse(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'warehouse-manager');
    }
  });
  router.post('/warehouse/warehouses', authenticate, validate(v.createWarehouse), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createWarehouse(req.body) });
    } catch (e) {
      safeError(res, e, 'warehouse-manager');
    }
  });
  router.put('/warehouse/warehouses/:id', authenticate, validate(v.updateWarehouse), async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateWarehouse(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'warehouse-manager');
    }
  });

  /* Storage Bins */
  router.get('/warehouse/:warehouseId/bins', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listBins(req.params.warehouseId, req.query) });
    } catch (e) {
      safeError(res, e, 'warehouse-manager');
    }
  });
  router.get('/warehouse/bins/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getBin(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'warehouse-manager');
    }
  });
  router.post('/warehouse/bins', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createBin(req.body) });
    } catch (e) {
      safeError(res, e, 'warehouse-manager');
    }
  });
  router.post('/warehouse/bins/:id/assign', authenticate, async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.assignItemToBin(
          req.params.id,
          req.body.itemId,
          req.body.quantity,
          req.body.lotNumber
        ),
      });
    } catch (e) {
      safeError(res, e, 'warehouse-manager');
    }
  });

  /* Pick Lists */
  router.get('/warehouse/:warehouseId/pick-lists', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listPickLists(req.params.warehouseId, req.query) });
    } catch (e) {
      safeError(res, e, 'warehouse-manager');
    }
  });
  router.get('/warehouse/pick-lists/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getPickList(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'warehouse-manager');
    }
  });
  router.post('/warehouse/pick-lists', authenticate, validate(v.createPickList), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createPickList(req.body) });
    } catch (e) {
      safeError(res, e, 'warehouse-manager');
    }
  });
  router.post('/warehouse/pick-lists/:id/pick-item', authenticate, async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.updatePickItem(req.params.id, req.body.itemIndex, req.body.pickedQty),
      });
    } catch (e) {
      safeError(res, e, 'warehouse-manager');
    }
  });

  /* Cycle Counts */
  router.get('/warehouse/:warehouseId/cycle-counts', authenticate, async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.listCycleCounts(req.params.warehouseId, req.query),
      });
    } catch (e) {
      safeError(res, e, 'warehouse-manager');
    }
  });
  router.get('/warehouse/cycle-counts/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getCycleCount(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'warehouse-manager');
    }
  });
  router.post('/warehouse/cycle-counts', authenticate, validate(v.createCycleCount), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createCycleCount(req.body) });
    } catch (e) {
      safeError(res, e, 'warehouse-manager');
    }
  });
  router.post('/warehouse/cycle-counts/:id/record', authenticate, async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.recordCount(req.params.id, req.body.itemIndex, req.body.countedQty),
      });
    } catch (e) {
      safeError(res, e, 'warehouse-manager');
    }
  });
  router.post('/warehouse/cycle-counts/:id/approve', authenticate, async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.approveCycleCount(req.params.id, req.body.userId),
      });
    } catch (e) {
      safeError(res, e, 'warehouse-manager');
    }
  });

  /* Analytics & Health */
  router.get('/warehouse/analytics', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getWarehouseAnalytics() });
    } catch (e) {
      safeError(res, e, 'warehouse-manager');
    }
  });
  router.get('/warehouse/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'warehouse-manager');
    }
  });


module.exports = router;

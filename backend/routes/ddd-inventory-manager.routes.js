'use strict';
/**
 * InventoryManager Routes
 * Auto-extracted from services/dddInventoryManager.js
 * 17 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddInventoryManager');
const { validate } = require('../middleware/validate');
const v = require('../validations/inventory-manager.validation');


  // Service imported as singleton above;

  /* Items */
  router.get('/inventory/items', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listItems(req.query) });
    } catch (e) {
      safeError(res, e, 'inventory-manager');
    }
  });
  router.get('/inventory/items/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getItem(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'inventory-manager');
    }
  });
  router.post('/inventory/items', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createItem(req.body) });
    } catch (e) {
      safeError(res, e, 'inventory-manager');
    }
  });
  router.put('/inventory/items/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateItem(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'inventory-manager');
    }
  });

  /* Stock Levels */
  router.get('/inventory/stock', authenticate, async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.getStockLevels(req.query.itemId, req.query.locationId),
      });
    } catch (e) {
      safeError(res, e, 'inventory-manager');
    }
  });
  router.post('/inventory/stock/receive', authenticate, async (req, res) => {
    try {
      const { itemId, locationId, quantity, unitCost, userId, ...opts } = req.body;
      res.json({
        success: true,
        data: await svc.receiveStock(itemId, locationId, quantity, unitCost, userId, opts),
      });
    } catch (e) {
      safeError(res, e, 'inventory-manager');
    }
  });
  router.post('/inventory/stock/issue', authenticate, async (req, res) => {
    try {
      const { itemId, locationId, quantity, userId, ...opts } = req.body;
      res.json({
        success: true,
        data: await svc.issueStock(itemId, locationId, quantity, userId, opts),
      });
    } catch (e) {
      safeError(res, e, 'inventory-manager');
    }
  });
  router.post('/inventory/stock/transfer', authenticate, async (req, res) => {
    try {
      const { itemId, fromLocationId, toLocationId, quantity, userId } = req.body;
      res.json({
        success: true,
        data: await svc.transferStock(itemId, fromLocationId, toLocationId, quantity, userId),
      });
    } catch (e) {
      safeError(res, e, 'inventory-manager');
    }
  });
  router.post('/inventory/stock/adjust', authenticate, async (req, res) => {
    try {
      const { itemId, locationId, quantityDelta, userId, reason } = req.body;
      res.json({
        success: true,
        data: await svc.adjustStock(itemId, locationId, quantityDelta, userId, reason),
      });
    } catch (e) {
      safeError(res, e, 'inventory-manager');
    }
  });

  /* Transactions */
  router.get('/inventory/transactions', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listTransactions(req.query) });
    } catch (e) {
      safeError(res, e, 'inventory-manager');
    }
  });

  /* Reorder Rules */
  router.get('/inventory/reorder-rules', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listReorderRules(req.query) });
    } catch (e) {
      safeError(res, e, 'inventory-manager');
    }
  });
  router.post('/inventory/reorder-rules', authenticate, validate(v.createReorderRule), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createReorderRule(req.body) });
    } catch (e) {
      safeError(res, e, 'inventory-manager');
    }
  });
  router.put('/inventory/reorder-rules/:id', authenticate, validate(v.updateReorderRule), async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateReorderRule(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'inventory-manager');
    }
  });

  /* Alerts & Expiry */
  router.get('/inventory/reorder-alerts', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.checkReorderAlerts() });
    } catch (e) {
      safeError(res, e, 'inventory-manager');
    }
  });
  router.get('/inventory/expiring', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getExpiringItems(Number(req.query.days) || 30) });
    } catch (e) {
      safeError(res, e, 'inventory-manager');
    }
  });

  /* Analytics & Health */
  router.get('/inventory/analytics', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getInventoryAnalytics() });
    } catch (e) {
      safeError(res, e, 'inventory-manager');
    }
  });
  router.get('/inventory/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'inventory-manager');
    }
  });


module.exports = router;

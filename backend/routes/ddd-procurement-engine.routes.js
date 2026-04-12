'use strict';
/**
 * ProcurementEngine Routes
 * Auto-extracted from services/dddProcurementEngine.js
 * 20 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddProcurementEngine');
const { validate } = require('../middleware/validate');
const v = require('../validations/procurement-engine.validation');


  // Service imported as singleton above;

  /* Suppliers */
  router.get('/procurement/suppliers', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listSuppliers(req.query) });
    } catch (e) {
      safeError(res, e, 'procurement-engine');
    }
  });
  router.get('/procurement/suppliers/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getSupplier(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'procurement-engine');
    }
  });
  router.post('/procurement/suppliers', authenticate, validate(v.createSupplier), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createSupplier(req.body) });
    } catch (e) {
      safeError(res, e, 'procurement-engine');
    }
  });
  router.put('/procurement/suppliers/:id', authenticate, validate(v.updateSupplier), async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateSupplier(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'procurement-engine');
    }
  });

  /* Purchase Orders */
  router.get('/procurement/purchase-orders', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listPurchaseOrders(req.query) });
    } catch (e) {
      safeError(res, e, 'procurement-engine');
    }
  });
  router.get('/procurement/purchase-orders/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getPurchaseOrder(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'procurement-engine');
    }
  });
  router.post('/procurement/purchase-orders', authenticate, validate(v.createPurchaseOrder), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createPurchaseOrder(req.body) });
    } catch (e) {
      safeError(res, e, 'procurement-engine');
    }
  });
  router.post('/procurement/purchase-orders/:id/approve', authenticate, async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.approvePurchaseOrder(req.params.id, req.body.userId),
      });
    } catch (e) {
      safeError(res, e, 'procurement-engine');
    }
  });
  router.post('/procurement/purchase-orders/:id/receive', authenticate, async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.receivePurchaseOrder(req.params.id, req.body.items),
      });
    } catch (e) {
      safeError(res, e, 'procurement-engine');
    }
  });
  router.post('/procurement/purchase-orders/:id/cancel', authenticate, async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.cancelPurchaseOrder(req.params.id, req.body.reason),
      });
    } catch (e) {
      safeError(res, e, 'procurement-engine');
    }
  });

  /* Requisitions */
  router.get('/procurement/requisitions', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listRequisitions(req.query) });
    } catch (e) {
      safeError(res, e, 'procurement-engine');
    }
  });
  router.get('/procurement/requisitions/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getRequisition(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'procurement-engine');
    }
  });
  router.post('/procurement/requisitions', authenticate, validate(v.createRequisition), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createRequisition(req.body) });
    } catch (e) {
      safeError(res, e, 'procurement-engine');
    }
  });
  router.post('/procurement/requisitions/:id/approve', authenticate, async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.approveRequisition(req.params.id, req.body.userId),
      });
    } catch (e) {
      safeError(res, e, 'procurement-engine');
    }
  });
  router.post('/procurement/requisitions/:id/reject', authenticate, async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.rejectRequisition(req.params.id, req.body.reason),
      });
    } catch (e) {
      safeError(res, e, 'procurement-engine');
    }
  });
  router.post('/procurement/requisitions/:id/convert-to-po', authenticate, async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.convertRequisitionToPO(req.params.id, req.body.supplierId, req.body.userId),
      });
    } catch (e) {
      safeError(res, e, 'procurement-engine');
    }
  });

  /* Evaluations */
  router.get('/procurement/suppliers/:id/evaluations', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listEvaluations(req.params.id) });
    } catch (e) {
      safeError(res, e, 'procurement-engine');
    }
  });
  router.post('/procurement/evaluations', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createEvaluation(req.body) });
    } catch (e) {
      safeError(res, e, 'procurement-engine');
    }
  });

  /* Analytics & Health */
  router.get('/procurement/analytics', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getProcurementAnalytics() });
    } catch (e) {
      safeError(res, e, 'procurement-engine');
    }
  });
  router.get('/procurement/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'procurement-engine');
    }
  });


module.exports = router;

'use strict';
/**
 * SupplyChainTracker Routes
 * Auto-extracted from services/dddSupplyChainTracker.js
 * 17 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddSupplyChainTracker');
const { validate } = require('../middleware/validate');
const v = require('../validations/supply-chain-tracker.validation');


  // Service imported as singleton above;

  /* Partners */
  router.get('/supply-chain/partners', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listPartners(req.query) });
    } catch (e) {
      safeError(res, e, 'supply-chain-tracker');
    }
  });
  router.get('/supply-chain/partners/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getPartner(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'supply-chain-tracker');
    }
  });
  router.post('/supply-chain/partners', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createPartner(req.body) });
    } catch (e) {
      safeError(res, e, 'supply-chain-tracker');
    }
  });
  router.put('/supply-chain/partners/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updatePartner(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'supply-chain-tracker');
    }
  });

  /* Shipments */
  router.get('/supply-chain/shipments', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listShipments(req.query) });
    } catch (e) {
      safeError(res, e, 'supply-chain-tracker');
    }
  });
  router.get('/supply-chain/shipments/track/:trackingNumber', authenticate, async (req, res) => {
    try {
      const d = await svc.getShipmentByTracking(req.params.trackingNumber);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'supply-chain-tracker');
    }
  });
  router.get('/supply-chain/shipments/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getShipment(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'supply-chain-tracker');
    }
  });
  router.post('/supply-chain/shipments', authenticate, validate(v.createShipment), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createShipment(req.body) });
    } catch (e) {
      safeError(res, e, 'supply-chain-tracker');
    }
  });
  router.post('/supply-chain/shipments/:id/status', authenticate, async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.updateShipmentStatus(req.params.id, req.body.status, req.body.eventData),
      });
    } catch (e) {
      safeError(res, e, 'supply-chain-tracker');
    }
  });

  /* Events */
  router.get('/supply-chain/shipments/:id/events', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listEvents(req.params.id) });
    } catch (e) {
      safeError(res, e, 'supply-chain-tracker');
    }
  });
  router.post('/supply-chain/events', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.addEvent(req.body) });
    } catch (e) {
      safeError(res, e, 'supply-chain-tracker');
    }
  });

  /* Routes */
  router.get('/supply-chain/routes', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listRoutes(req.query) });
    } catch (e) {
      safeError(res, e, 'supply-chain-tracker');
    }
  });
  router.get('/supply-chain/routes/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getRoute(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'supply-chain-tracker');
    }
  });
  router.post('/supply-chain/routes', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createRoute(req.body) });
    } catch (e) {
      safeError(res, e, 'supply-chain-tracker');
    }
  });
  router.put('/supply-chain/routes/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateRoute(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'supply-chain-tracker');
    }
  });

  /* Analytics & Health */
  router.get('/supply-chain/analytics', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getSupplyChainAnalytics() });
    } catch (e) {
      safeError(res, e, 'supply-chain-tracker');
    }
  });
  router.get('/supply-chain/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'supply-chain-tracker');
    }
  });


module.exports = router;

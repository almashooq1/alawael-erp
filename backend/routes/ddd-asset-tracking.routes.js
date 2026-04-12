'use strict';
/**
 * AssetTracking Routes
 * Auto-extracted from services/dddAssetTracking.js
 * 11 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddAssetTracking');


  // Service imported as singleton above;

  router.get('/asset-tracking/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'asset-tracking');
    }
  });
  router.post('/asset-tracking/assets', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createAsset(req.body) });
    } catch (e) {
      safeError(res, e, 'asset-tracking');
    }
  });
  router.get('/asset-tracking/assets', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listAssets(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'asset-tracking');
    }
  });
  router.put('/asset-tracking/assets/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateAsset(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'asset-tracking');
    }
  });
  router.post('/asset-tracking/checkouts', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.checkoutAsset(req.body) });
    } catch (e) {
      safeError(res, e, 'asset-tracking');
    }
  });
  router.get('/asset-tracking/checkouts', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listCheckouts(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'asset-tracking');
    }
  });
  router.post('/asset-tracking/audits', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createAudit(req.body) });
    } catch (e) {
      safeError(res, e, 'asset-tracking');
    }
  });
  router.get('/asset-tracking/audits', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 10, ...f } = req.query;
      res.json({ success: true, data: await svc.listAudits(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'asset-tracking');
    }
  });
  router.post('/asset-tracking/depreciation', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.logDepreciation(req.body) });
    } catch (e) {
      safeError(res, e, 'asset-tracking');
    }
  });
  router.get('/asset-tracking/depreciation', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listDepreciation(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'asset-tracking');
    }
  });
  router.get('/asset-tracking/stats', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getAssetStats() });
    } catch (e) {
      safeError(res, e, 'asset-tracking');
    }
  });

module.exports = router;

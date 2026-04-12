'use strict';
/**
 * DonorRelations Routes
 * Auto-extracted from services/dddDonorRelations.js
 * 11 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddDonorRelations');


  // Service imported as singleton above;

  router.get('/donor-relations/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'donor-relations');
    }
  });
  router.post('/donor-relations/donors', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createDonor(req.body) });
    } catch (e) {
      safeError(res, e, 'donor-relations');
    }
  });
  router.get('/donor-relations/donors', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listDonors(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'donor-relations');
    }
  });
  router.put('/donor-relations/donors/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateDonor(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'donor-relations');
    }
  });
  router.post('/donor-relations/donations', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.recordDonation(req.body) });
    } catch (e) {
      safeError(res, e, 'donor-relations');
    }
  });
  router.get('/donor-relations/donations', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listDonations(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'donor-relations');
    }
  });
  router.post('/donor-relations/campaigns', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createCampaign(req.body) });
    } catch (e) {
      safeError(res, e, 'donor-relations');
    }
  });
  router.get('/donor-relations/campaigns', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listCampaigns(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'donor-relations');
    }
  });
  router.post('/donor-relations/stewardship', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.logStewardship(req.body) });
    } catch (e) {
      safeError(res, e, 'donor-relations');
    }
  });
  router.get('/donor-relations/stewardship', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listStewardship(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'donor-relations');
    }
  });
  router.get('/donor-relations/stats', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getDonorStats() });
    } catch (e) {
      safeError(res, e, 'donor-relations');
    }
  });

module.exports = router;

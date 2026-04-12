'use strict';
/**
 * DonationManager Routes
 * Auto-extracted from services/dddDonationManager.js
 * 11 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddDonationManager');
const { validate } = require('../middleware/validate');
const v = require('../validations/donation-manager.validation');


  // Service imported as singleton above;

  router.get('/donations', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listDonations(req.query) });
    } catch (e) {
      safeError(res, e, 'donation-manager');
    }
  });
  router.post('/donations', authenticate, validate(v.createDonation), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.recordDonation(req.body) });
    } catch (e) {
      safeError(res, e, 'donation-manager');
    }
  });
  router.get('/donors', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listDonors(req.query) });
    } catch (e) {
      safeError(res, e, 'donation-manager');
    }
  });
  router.get('/donors/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getDonor(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'donation-manager');
    }
  });
  router.post('/donors', authenticate, validate(v.createDonor), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.registerDonor(req.body) });
    } catch (e) {
      safeError(res, e, 'donation-manager');
    }
  });
  router.get('/fundraisers', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listFundraisers(req.query) });
    } catch (e) {
      safeError(res, e, 'donation-manager');
    }
  });
  router.post('/fundraisers', authenticate, validate(v.createFundraiser), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createFundraiser(req.body) });
    } catch (e) {
      safeError(res, e, 'donation-manager');
    }
  });
  router.get('/donations/receipts', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listReceipts(req.query.donorId) });
    } catch (e) {
      safeError(res, e, 'donation-manager');
    }
  });
  router.post('/donations/receipts', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.issueReceipt(req.body) });
    } catch (e) {
      safeError(res, e, 'donation-manager');
    }
  });
  router.get('/donations/analytics', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getDonationAnalytics() });
    } catch (e) {
      safeError(res, e, 'donation-manager');
    }
  });
  router.get('/donations/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'donation-manager');
    }
  });


module.exports = router;

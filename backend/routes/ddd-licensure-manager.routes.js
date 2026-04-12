'use strict';
/**
 * LicensureManager Routes
 * Auto-extracted from services/dddLicensureManager.js
 * 14 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddLicensureManager');


  // Service imported as singleton above;

  router.get('/licensure-manager/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'licensure-manager');
    }
  });

  router.post('/licensure-manager/licenses', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createLicense(req.body) });
    } catch (e) {
      safeError(res, e, 'licensure-manager');
    }
  });
  router.get('/licensure-manager/licenses', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listLicenses(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'licensure-manager');
    }
  });
  router.get('/licensure-manager/licenses/expiring', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getExpiringLicenses(+(req.query.days || 60)) });
    } catch (e) {
      safeError(res, e, 'licensure-manager');
    }
  });
  router.get('/licensure-manager/licenses/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getLicenseById(req.params.id) });
    } catch (e) {
      safeError(res, e, 'licensure-manager');
    }
  });
  router.put('/licensure-manager/licenses/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateLicense(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'licensure-manager');
    }
  });

  router.post('/licensure-manager/renewals', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createRenewal(req.body) });
    } catch (e) {
      safeError(res, e, 'licensure-manager');
    }
  });
  router.get('/licensure-manager/renewals', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listRenewals(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'licensure-manager');
    }
  });
  router.put('/licensure-manager/renewals/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateRenewal(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'licensure-manager');
    }
  });

  router.post('/licensure-manager/reports', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createReport(req.body) });
    } catch (e) {
      safeError(res, e, 'licensure-manager');
    }
  });
  router.get('/licensure-manager/reports', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listReports(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'licensure-manager');
    }
  });
  router.put('/licensure-manager/reports/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateReport(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'licensure-manager');
    }
  });

  router.get('/licensure-manager/alerts', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listAlerts(req.query) });
    } catch (e) {
      safeError(res, e, 'licensure-manager');
    }
  });

  router.get('/licensure-manager/stats', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getLicenseSummary() });
    } catch (e) {
      safeError(res, e, 'licensure-manager');
    }
  });

module.exports = router;

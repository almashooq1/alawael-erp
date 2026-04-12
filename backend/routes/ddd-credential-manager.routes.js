'use strict';
/**
 * CredentialManager Routes
 * Auto-extracted from services/dddCredentialManager.js
 * 12 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddCredentialManager');
const { validate } = require('../middleware/validate');
const v = require('../validations/credential-manager.validation');


  // Service imported as singleton above;

  router.get('/credential-manager/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'credential-manager');
    }
  });

  /* Credentials */
  router.post('/credential-manager/credentials', authenticate, validate(v.createCredential), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createCredential(req.body) });
    } catch (e) {
      safeError(res, e, 'credential-manager');
    }
  });
  router.get('/credential-manager/credentials', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...filter } = req.query;
      res.json({ success: true, data: await svc.listCredentials(filter, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'credential-manager');
    }
  });
  router.get('/credential-manager/credentials/expiring', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getExpiringCredentials(+(req.query.days || 30)) });
    } catch (e) {
      safeError(res, e, 'credential-manager');
    }
  });
  router.put('/credential-manager/credentials/:id', authenticate, validate(v.updateCredential), async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateCredential(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'credential-manager');
    }
  });

  /* CEU Records */
  router.post('/credential-manager/ceu', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createCEURecord(req.body) });
    } catch (e) {
      safeError(res, e, 'credential-manager');
    }
  });
  router.get('/credential-manager/ceu', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...filter } = req.query;
      res.json({ success: true, data: await svc.listCEURecords(filter, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'credential-manager');
    }
  });
  router.get('/credential-manager/ceu/staff/:staffId/summary', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getStaffCEUSummary(req.params.staffId) });
    } catch (e) {
      safeError(res, e, 'credential-manager');
    }
  });

  /* Verification */
  router.post('/credential-manager/verification', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createVerificationLog(req.body) });
    } catch (e) {
      safeError(res, e, 'credential-manager');
    }
  });

  /* Compliance */
  router.post('/credential-manager/requirements', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createRequirement(req.body) });
    } catch (e) {
      safeError(res, e, 'credential-manager');
    }
  });
  router.get('/credential-manager/requirements', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listRequirements(req.query) });
    } catch (e) {
      safeError(res, e, 'credential-manager');
    }
  });

  /* Analytics */
  router.get('/credential-manager/stats', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getComplianceStats() });
    } catch (e) {
      safeError(res, e, 'credential-manager');
    }
  });

module.exports = router;

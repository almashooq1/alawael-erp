'use strict';
/**
 * BackupManager Routes
 * Auto-extracted from services/dddBackupManager.js
 * 10 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddBackupManager');


  // Service imported as singleton above;

  router.get('/backup-manager/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'backup-manager');
    }
  });

  router.post('/backup-manager/jobs', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createJob(req.body) });
    } catch (e) {
      safeError(res, e, 'backup-manager');
    }
  });
  router.get('/backup-manager/jobs', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listJobs(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'backup-manager');
    }
  });

  router.post('/backup-manager/restores', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createRestore(req.body) });
    } catch (e) {
      safeError(res, e, 'backup-manager');
    }
  });
  router.get('/backup-manager/restores', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listRestores(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'backup-manager');
    }
  });

  router.post('/backup-manager/policies', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createPolicy(req.body) });
    } catch (e) {
      safeError(res, e, 'backup-manager');
    }
  });
  router.get('/backup-manager/policies', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listPolicies(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'backup-manager');
    }
  });

  router.post('/backup-manager/verifications', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createVerification(req.body) });
    } catch (e) {
      safeError(res, e, 'backup-manager');
    }
  });
  router.get('/backup-manager/verifications', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listVerifications(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'backup-manager');
    }
  });

  router.get('/backup-manager/stats', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getBackupStats() });
    } catch (e) {
      safeError(res, e, 'backup-manager');
    }
  });

module.exports = router;

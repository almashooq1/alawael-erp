'use strict';
/**
 * ArchiveManager Routes
 * Auto-extracted from services/dddArchiveManager.js
 * 15 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddArchiveManager');


  // Service imported as singleton above;

  /* Archives */
  router.get('/archives', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listArchives(req.query) });
    } catch (e) {
      safeError(res, e, 'archive-manager');
    }
  });
  router.get('/archives/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getArchive(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'archive-manager');
    }
  });
  router.post('/archives', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createArchive(req.body) });
    } catch (e) {
      safeError(res, e, 'archive-manager');
    }
  });
  router.put('/archives/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateArchive(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'archive-manager');
    }
  });
  router.post('/archives/:id/restore', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.restoreArchive(req.params.id) });
    } catch (e) {
      safeError(res, e, 'archive-manager');
    }
  });

  /* Retention Policies */
  router.get('/archives/policies', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.listPolicies() });
    } catch (e) {
      safeError(res, e, 'archive-manager');
    }
  });
  router.post('/archives/policies', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createPolicy(req.body) });
    } catch (e) {
      safeError(res, e, 'archive-manager');
    }
  });

  /* Legal Holds */
  router.get('/archives/holds', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listHolds(req.query) });
    } catch (e) {
      safeError(res, e, 'archive-manager');
    }
  });
  router.post('/archives/holds', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createHold(req.body) });
    } catch (e) {
      safeError(res, e, 'archive-manager');
    }
  });
  router.post('/archives/holds/:id/release', authenticate, async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.releaseHold(req.params.id, req.body.userId, req.body.reason),
      });
    } catch (e) {
      safeError(res, e, 'archive-manager');
    }
  });

  /* Disposal */
  router.get('/archives/disposals', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listDisposals(req.query) });
    } catch (e) {
      safeError(res, e, 'archive-manager');
    }
  });
  router.post('/archives/disposals', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createDisposal(req.body) });
    } catch (e) {
      safeError(res, e, 'archive-manager');
    }
  });
  router.post('/archives/disposals/:id/approve', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.approveDisposal(req.params.id, req.body.userId) });
    } catch (e) {
      safeError(res, e, 'archive-manager');
    }
  });

  /* Analytics & Health */
  router.get('/archives/analytics', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getArchiveAnalytics() });
    } catch (e) {
      safeError(res, e, 'archive-manager');
    }
  });
  router.get('/archives/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'archive-manager');
    }
  });


module.exports = router;

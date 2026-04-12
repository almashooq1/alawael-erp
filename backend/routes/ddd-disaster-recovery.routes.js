'use strict';
/**
 * DisasterRecovery Routes
 * Auto-extracted from services/dddDisasterRecovery.js
 * 12 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddDisasterRecovery');


  // Service imported as singleton above;

  /* Plans */
  router.get('/disaster-recovery/plans', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listPlans(req.query) });
    } catch (e) {
      safeError(res, e, 'disaster-recovery');
    }
  });
  router.get('/disaster-recovery/plans/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getPlan(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'disaster-recovery');
    }
  });
  router.post('/disaster-recovery/plans', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createPlan(req.body) });
    } catch (e) {
      safeError(res, e, 'disaster-recovery');
    }
  });

  /* Backups */
  router.get('/disaster-recovery/backups', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listBackups(req.query) });
    } catch (e) {
      safeError(res, e, 'disaster-recovery');
    }
  });
  router.post('/disaster-recovery/backups', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createBackup(req.body) });
    } catch (e) {
      safeError(res, e, 'disaster-recovery');
    }
  });

  /* Tests */
  router.get('/disaster-recovery/tests', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listTests(req.query) });
    } catch (e) {
      safeError(res, e, 'disaster-recovery');
    }
  });
  router.post('/disaster-recovery/tests', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.scheduleTest(req.body) });
    } catch (e) {
      safeError(res, e, 'disaster-recovery');
    }
  });

  /* Recovery Logs */
  router.get('/disaster-recovery/logs', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.listLogs() });
    } catch (e) {
      safeError(res, e, 'disaster-recovery');
    }
  });
  router.post('/disaster-recovery/trigger', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.triggerRecovery(req.body) });
    } catch (e) {
      safeError(res, e, 'disaster-recovery');
    }
  });
  router.post('/disaster-recovery/logs/:id/resolve', authenticate, async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.resolveRecovery(req.params.id, req.body.postMortem),
      });
    } catch (e) {
      safeError(res, e, 'disaster-recovery');
    }
  });

  /* Analytics & Health */
  router.get('/disaster-recovery/analytics', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getRecoveryAnalytics() });
    } catch (e) {
      safeError(res, e, 'disaster-recovery');
    }
  });
  router.get('/disaster-recovery/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'disaster-recovery');
    }
  });


module.exports = router;

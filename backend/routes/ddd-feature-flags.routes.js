'use strict';
/**
 * FeatureFlags Routes
 * Auto-extracted from services/dddFeatureFlags.js
 * 9 endpoints — Auth required on all
 */

const { Router } = require('express');
const router = Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

const { listFlags, createFlag, getFlag, updateFlag, deleteFlag, evaluateFlag, seedDefaultFlags, getFlagDashboard } = require('../services/dddFeatureFlags');
const { DDDFlagAudit } = require('../models/DddFeatureFlags');
const { validate } = require('../middleware/validate');
const v = require('../validations/feature-flags.validation');

  router.get('/feature-flags', authenticate, async (req, res) => {
    try {
    const flags = await listFlags(req.query);
    res.json({ success: true, count: flags.length, flags });
    } catch (e) {
      safeError(res, e, 'feature-flags');
    }
  });

  router.post('/feature-flags', authenticate, validate(v.createFeatureFlag), async (req, res) => {
    try {
    const flag = await createFlag(req.body, req.user?._id);
    res.status(201).json({ success: true, flag });
    } catch (e) {
      safeError(res, e, 'feature-flags');
    }
  });

  router.get('/feature-flags/:key', authenticate, async (req, res) => {
    try {
    const flag = await getFlag(req.params.key);
    if (!flag) return res.status(404).json({ success: false, error: 'Flag not found' });
    res.json({ success: true, flag });
    } catch (e) {
      safeError(res, e, 'feature-flags');
    }
  });

  router.put('/feature-flags/:key', authenticate, validate(v.updateFeatureFlag), async (req, res) => {
    try {
    const flag = await updateFlag(req.params.key, req.body, req.user?._id, req.body.reason);
    res.json({ success: true, flag });
    } catch (e) {
      safeError(res, e, 'feature-flags');
    }
  });

  router.delete('/feature-flags/:key', authenticate, async (req, res) => {
    try {
    await deleteFlag(req.params.key, req.user?._id);
    res.json({ success: true, message: 'Flag deleted' });
    } catch (e) {
      safeError(res, e, 'feature-flags');
    }
  });

  router.post('/feature-flags/:key/evaluate', authenticate, async (req, res) => {
    try {
    const result = await evaluateFlag(req.params.key, req.body);
    res.json({ success: true, ...result });
    } catch (e) {
      safeError(res, e, 'feature-flags');
    }
  });

  router.post('/feature-flags/seed', authenticate, async (_req, res) => {
    try {
    const result = await seedDefaultFlags();
    res.json({ success: true, ...result });
    } catch (e) {
      safeError(res, e, 'feature-flags');
    }
  });

  router.get('/feature-flags-dashboard', authenticate, async (_req, res) => {
    try {
    const dashboard = await getFlagDashboard();
    res.json({ success: true, ...dashboard });
    } catch (e) {
      safeError(res, e, 'feature-flags');
    }
  });

  router.get('/feature-flags/:key/audit', authenticate, async (req, res) => {
    try {
    const logs = await DDDFlagAudit.find({ flagKey: req.params.key, isDeleted: { $ne: true } })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
    res.json({ success: true, count: logs.length, logs });
    } catch (e) {
      safeError(res, e, 'feature-flags');
    }
  });

module.exports = router;

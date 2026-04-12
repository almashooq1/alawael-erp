'use strict';
/**
 * DevPortal Routes
 * Auto-extracted from services/dddDevPortal.js
 * 8 endpoints — Auth required on all
 */

const { Router } = require('express');
const router = Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

const { getDevPortalDashboard, getChangelogs, addChangelog } = require('../services/dddDevPortal');
const { validate } = require('../middleware/validate');
const v = require('../validations/dev-portal.validation');

  router.get('/dev-portal/dashboard', authenticate, async (_req, res) => {
    try {
    res.json({ success: true, ...(await getDevPortalDashboard()) });
    } catch (e) {
      safeError(res, e, 'dev-portal');
    }
  });

  router.get('/dev-portal/openapi', authenticate, async (_req, res) => {
    try {
    res.json(generateOpenAPISpec());
    } catch (e) {
      safeError(res, e, 'dev-portal');
    }
  });

  router.get('/dev-portal/endpoints', authenticate, async (req, res) => {
    try {
      res.json({ success: true });
    } catch (e) {
      safeError(res, e, 'dev-portal');
    }
  });

  router.get('/dev-portal/sdks', authenticate, async (_req, res) => {
    try {
      res.json({ success: true });
    } catch (e) {
      safeError(res, e, 'dev-portal');
    }
  });

  router.get('/dev-portal/sdks/:language', authenticate, async (req, res) => {
    try {
      res.json({ success: true });
    } catch (e) {
      safeError(res, e, 'dev-portal');
    }
  });

  router.get('/dev-portal/changelog', authenticate, async (req, res) => {
    try {
    const logs = await getChangelogs({
    version: req.query.version,
    category: req.query.category,
    limit: parseInt(req.query.limit, 10) || 50,
    });
    res.json({ success: true, count: logs.length, changelog: logs });
    } catch (e) {
      safeError(res, e, 'dev-portal');
    }
  });

  router.post('/dev-portal/changelog', authenticate, validate(v.createChangelog), async (req, res) => {
    try {
    const entry = await addChangelog(req.body);
    res.status(201).json({ success: true, entry });
    } catch (e) {
      safeError(res, e, 'dev-portal');
    }
  });

  router.get('/dev-portal/domains/:domain', authenticate, async (req, res) => {
    try {
      res.json({ success: true });
    } catch (e) {
      safeError(res, e, 'dev-portal');
    }
  });

module.exports = router;

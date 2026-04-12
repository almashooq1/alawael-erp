'use strict';
/**
 * ApiGateway Routes
 * Auto-extracted from services/dddApiGateway.js
 * 9 endpoints — Auth required on all
 */

const { Router } = require('express');
const router = Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

const { getGatewayDashboard, getUsageTrend, createApiKey, revokeApiKey, suspendApiKey, reactivateApiKey, resetQuota } = require('../services/dddApiGateway');
const { DDDApiKey } = require('../models/DddApiGateway');

  router.get('/gateway/dashboard', authenticate, async (_req, res) => {
    try {
    res.json({ success: true, ...(await getGatewayDashboard()) });
    } catch (e) {
      safeError(res, e, 'api-gateway');
    }
  });

  router.get('/gateway/usage/trend', authenticate, async (req, res) => {
    try {
    const hours = parseInt(req.query.hours, 10) || 24;
    const trend = await getUsageTrend(hours);
    res.json({ success: true, count: trend.length, trend });
    } catch (e) {
      safeError(res, e, 'api-gateway');
    }
  });

  router.get('/gateway/keys', authenticate, async (req, res) => {
    try {
    const query = { isDeleted: { $ne: true } };
    if (req.query.status) query.status = req.query.status;
    const keys = await DDDApiKey.find(query).select('-hashedKey').sort({ createdAt: -1 }).lean();
    res.json({ success: true, count: keys.length, keys });
    } catch (e) {
      safeError(res, e, 'api-gateway');
    }
  });

  router.post('/gateway/keys', authenticate, async (req, res) => {
    try {
    const result = await createApiKey(req.body);
    res.status(201).json({ success: true, key: result });
    } catch (e) {
      safeError(res, e, 'api-gateway');
    }
  });

  router.post('/gateway/keys/:id/revoke', authenticate, async (req, res) => {
    try {
    const result = await revokeApiKey(req.params.id);
    res.json({ success: true, key: result });
    } catch (e) {
      safeError(res, e, 'api-gateway');
    }
  });

  router.post('/gateway/keys/:id/suspend', authenticate, async (req, res) => {
    try {
    const result = await suspendApiKey(req.params.id);
    res.json({ success: true, key: result });
    } catch (e) {
      safeError(res, e, 'api-gateway');
    }
  });

  router.post('/gateway/keys/:id/reactivate', authenticate, async (req, res) => {
    try {
    const result = await reactivateApiKey(req.params.id);
    res.json({ success: true, key: result });
    } catch (e) {
      safeError(res, e, 'api-gateway');
    }
  });

  router.post('/gateway/keys/:id/reset-quota', authenticate, async (req, res) => {
    try {
    const result = await resetQuota(req.params.id);
    res.json({ success: true, key: result });
    } catch (e) {
      safeError(res, e, 'api-gateway');
    }
  });

  router.get('/gateway/versions', authenticate, async (_req, res) => {
    try {
      res.json({ success: true });
    } catch (e) {
      safeError(res, e, 'api-gateway');
    }
  });

module.exports = router;

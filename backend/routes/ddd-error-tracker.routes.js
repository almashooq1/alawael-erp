'use strict';
/**
 * ErrorTracker Routes
 * Auto-extracted from services/dddErrorTracker.js
 * 9 endpoints — Auth required on all
 */

const { Router } = require('express');
const router = Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

const { getErrorDashboard, acknowledgeError, resolveError, ignoreError, getErrorTrend, trackError } = require('../services/dddErrorTracker');
const { DDDErrorLog } = require('../models/DddErrorTracker');

  router.get('/errors/dashboard', authenticate, async (_req, res) => {
    try {
    const dashboard = await getErrorDashboard();
    res.json({ success: true, ...dashboard });
    } catch (e) {
      safeError(res, e, 'error-tracker');
    }
  });

  router.get('/errors', authenticate, async (req, res) => {
    try {
    const query = { isDeleted: { $ne: true } };
    if (req.query.category) query.category = req.query.category;
    if (req.query.severity) query.severity = req.query.severity;
    if (req.query.status) query.status = req.query.status;
    if (req.query.domain) query.domain = req.query.domain;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const errors = await DDDErrorLog.find(query).sort({ lastSeen: -1 }).limit(limit).lean();
    res.json({ success: true, count: errors.length, errors });
    } catch (e) {
      safeError(res, e, 'error-tracker');
    }
  });

  router.get('/errors/:id', authenticate, async (req, res) => {
    try {
    const error = await DDDErrorLog.findById(req.params.id).lean();
    if (!error) return res.status(404).json({ success: false, error: 'Error not found' });
    res.json({ success: true, error });
    } catch (e) {
      safeError(res, e, 'error-tracker');
    }
  });

  router.post('/errors/:id/acknowledge', authenticate, async (req, res) => {
    try {
    const result = await acknowledgeError(req.params.id, req.user?._id);
    res.json({ success: true, error: result });
    } catch (e) {
      safeError(res, e, 'error-tracker');
    }
  });

  router.post('/errors/:id/resolve', authenticate, async (req, res) => {
    try {
    const result = await resolveError(req.params.id, req.user?._id, req.body.resolution);
    res.json({ success: true, error: result });
    } catch (e) {
      safeError(res, e, 'error-tracker');
    }
  });

  router.post('/errors/:id/ignore', authenticate, async (req, res) => {
    try {
    const result = await ignoreError(req.params.id);
    res.json({ success: true, error: result });
    } catch (e) {
      safeError(res, e, 'error-tracker');
    }
  });

  router.get('/errors/analytics/trend', authenticate, async (req, res) => {
    try {
    const hours = parseInt(req.query.hours, 10) || 24;
    const trend = await getErrorTrend(hours);
    res.json({ success: true, count: trend.length, trend });
    } catch (e) {
      safeError(res, e, 'error-tracker');
    }
  });

  router.post('/errors/track', authenticate, async (req, res) => {
    try {
    const err = new Error(req.body.message);
    err.name = req.body.name || 'Error';
    err.code = req.body.code;
    const result = await trackError(err, req.body);
    res.json({ success: true, error: result });
    } catch (e) {
      safeError(res, e, 'error-tracker');
    }
  });

  router.get('/errors/meta/categories', authenticate, async (_req, res) => {
    try {
      res.json({ success: true });
    } catch (e) {
      safeError(res, e, 'error-tracker');
    }
  });

module.exports = router;

'use strict';
/**
 * DataQualityMonitor Routes
 * Auto-extracted from services/dddDataQualityMonitor.js
 * 6 endpoints — Auth required on all
 */

const { Router } = require('express');
const router = Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

const { assessModelQuality, assessGlobalQuality, getQualityTrend } = require('../services/dddDataQualityMonitor');
const { DDDDataQualityReport } = require('../models/DddDataQualityMonitor');

  router.post('/data-quality/assess/:modelName', authenticate, async (req, res) => {
    try {
    const report = await assessModelQuality(req.params.modelName);
    res.json({ success: true, report });
    } catch (e) {
      safeError(res, e, 'data-quality-monitor');
    }
  });

  router.post('/data-quality/assess-global', authenticate, async (_req, res) => {
    try {
    const result = await assessGlobalQuality();
    res.json({ success: true, ...result });
    } catch (e) {
      safeError(res, e, 'data-quality-monitor');
    }
  });

  router.get('/data-quality/latest/:modelName', authenticate, async (req, res) => {
    try {
    const report = await DDDDataQualityReport.findOne({
    modelName: req.params.modelName,
    scope: 'model',
    isDeleted: { $ne: true },
    })
    .sort({ evaluatedAt: -1 })
    .lean();
    res.json({ success: true, report });
    } catch (e) {
      safeError(res, e, 'data-quality-monitor');
    }
  });

  router.get('/data-quality/dashboard', authenticate, async (_req, res) => {
    try {
    const report = await DDDDataQualityReport.findOne({
    scope: 'global',
    isDeleted: { $ne: true },
    })
    .sort({ evaluatedAt: -1 })
    .lean();
    res.json({ success: true, report });
    } catch (e) {
      safeError(res, e, 'data-quality-monitor');
    }
  });

  router.get('/data-quality/trend', authenticate, async (req, res) => {
    try {
    const trend = await getQualityTrend(req.query.modelName, parseInt(req.query.days, 10) || 30);
    res.json({ success: true, trend });
    } catch (e) {
      safeError(res, e, 'data-quality-monitor');
    }
  });

  router.get('/data-quality/models', authenticate, async (_req, res) => {
    try {
      res.json({ success: true });
    } catch (e) {
      safeError(res, e, 'data-quality-monitor');
    }
  });

module.exports = router;

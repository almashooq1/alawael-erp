'use strict';
/**
 * BusinessIntelligence Routes
 * Auto-extracted from services/dddBusinessIntelligence.js
 * 9 endpoints — Auth required on all
 */

const { Router } = require('express');
const router = Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

const { getBIDashboard, executeReport, calculateScorecard, executiveSummary, getBenchmarks, upsertBenchmark, seedReports } = require('../services/dddBusinessIntelligence');
const { DDDBIReport, DDDScorecard } = require('../models/DddBusinessIntelligence');
const { validate } = require('../middleware/validate');
const v = require('../validations/business-intelligence.validation');

  router.get('/business-intelligence', authenticate, async (_req, res) => {
    try {
    res.json({ success: true, data: await getBIDashboard() });
    } catch (e) {
      safeError(res, e, 'business-intelligence');
    }
  });

  router.get('/business-intelligence/reports', authenticate, async (req, res) => {
    try {
    const query = {};
    if (req.query.category) query.category = req.query.category;
    const reports = await DDDBIReport.find({ ...query, isActive: true }).lean();
    res.json({
    success: true,
    data: reports,
    builtin: BUILTIN_REPORTS,
    categories: REPORT_CATEGORIES,
    });
    } catch (e) {
      safeError(res, e, 'business-intelligence');
    }
  });

  router.post('/business-intelligence/reports/:reportId/execute', authenticate, async (req, res) => {
    try {
    res.json({ success: true, data: await executeReport(req.params.reportId, req.body) });
    } catch (e) {
      safeError(res, e, 'business-intelligence');
    }
  });

  router.get('/business-intelligence/scorecards', authenticate, async (_req, res) => {
    try {
    const scorecards = await DDDScorecard.find({ isActive: true }).lean();
    res.json({ success: true, data: scorecards, builtin: BUILTIN_SCORECARDS });
    } catch (e) {
      safeError(res, e, 'business-intelligence');
    }
  });

  router.get('/business-intelligence/scorecards/:scorecardId', authenticate, async (req, res) => {
    try {
    res.json({ success: true, data: await calculateScorecard(req.params.scorecardId) });
    } catch (e) {
      safeError(res, e, 'business-intelligence');
    }
  });

  router.get('/business-intelligence/executive-summary', authenticate, async (_req, res) => {
    try {
    res.json({ success: true, data: await executiveSummary() });
    } catch (e) {
      safeError(res, e, 'business-intelligence');
    }
  });

  router.get('/business-intelligence/benchmarks', authenticate, async (req, res) => {
    try {
    res.json({ success: true, data: await getBenchmarks(req.query.domain) });
    } catch (e) {
      safeError(res, e, 'business-intelligence');
    }
  });

  router.post('/business-intelligence/benchmarks', authenticate, validate(v.createBenchmark), async (req, res) => {
    try {
    res.json({ success: true, data: await upsertBenchmark(req.body) });
    } catch (e) {
      safeError(res, e, 'business-intelligence');
    }
  });

  router.post('/business-intelligence/seed', authenticate, async (_req, res) => {
    try {
    res.json({ success: true, data: await seedReports() });
    } catch (e) {
      safeError(res, e, 'business-intelligence');
    }
  });

module.exports = router;

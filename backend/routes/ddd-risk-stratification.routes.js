'use strict';
/**
 * RiskStratification Routes
 * Auto-extracted from services/dddRiskStratification.js
 * 7 endpoints — Auth required on all
 */

const { Router } = require('express');
const router = Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

const { stratifyBeneficiary, stratifyPopulation, getCaseloadPriorities, getWatchlist, reviewWatchlistEntry, getRiskDashboard, detectEarlyWarnings } = require('../services/dddRiskStratification');

  router.post('/risk-stratification/stratify/:beneficiaryId', authenticate, async (req, res) => {
    try {
    const result = await stratifyBeneficiary(req.params.beneficiaryId);
    res.json({ success: true, ...result });
    } catch (e) {
      safeError(res, e, 'risk-stratification');
    }
  });

  router.post('/risk-stratification/stratify-population', authenticate, async (req, res) => {
    try {
    const result = await stratifyPopulation(req.body.filter || {});
    res.json({ success: true, ...result });
    } catch (e) {
      safeError(res, e, 'risk-stratification');
    }
  });

  router.get('/risk-stratification/caseload/:therapistId', authenticate, async (req, res) => {
    try {
    const priorities = await getCaseloadPriorities(req.params.therapistId, req.query.branchId);
    res.json({ success: true, priorities });
    } catch (e) {
      safeError(res, e, 'risk-stratification');
    }
  });

  router.get('/risk-stratification/watchlist', authenticate, async (req, res) => {
    try {
    const entries = await getWatchlist({
    branchId: req.query.branchId,
    riskTier: req.query.riskTier,
    limit: parseInt(req.query.limit, 10) || 50,
    });
    res.json({ success: true, entries });
    } catch (e) {
      safeError(res, e, 'risk-stratification');
    }
  });

  router.post('/risk-stratification/watchlist/:id/review', authenticate, async (req, res) => {
    try {
    const entry = await reviewWatchlistEntry(req.params.id, req.body.userId, {
    notes: req.body.notes,
    status: req.body.status,
    });
    res.json({ success: true, entry });
    } catch (e) {
      safeError(res, e, 'risk-stratification');
    }
  });

  router.get('/risk-stratification/dashboard', authenticate, async (req, res) => {
    try {
    const dashboard = await getRiskDashboard(req.query.branchId);
    res.json({ success: true, dashboard });
    } catch (e) {
      safeError(res, e, 'risk-stratification');
    }
  });

  router.get('/risk-stratification/early-warnings', authenticate, async (req, res) => {
    try {
    const warnings = await detectEarlyWarnings(req.query.branchId);
    res.json({ success: true, warnings });
    } catch (e) {
      safeError(res, e, 'risk-stratification');
    }
  });

module.exports = router;

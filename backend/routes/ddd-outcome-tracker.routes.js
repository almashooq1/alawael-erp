'use strict';
/**
 * OutcomeTracker Routes
 * Auto-extracted from services/dddOutcomeTracker.js
 * 6 endpoints — Auth required on all
 */

const { Router } = require('express');
const router = Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

const { trackOutcome, getLatestOutcome, getOutcomeHistory, gatherOutcomeContext, getOutcomeDashboard, getInterventionComparison } = require('../services/dddOutcomeTracker');

  router.post('/outcome-tracker/track/:beneficiaryId', authenticate, async (req, res) => {
    try {
    const snapshot = await trackOutcome(req.params.beneficiaryId, {
    episodeId: req.body.episodeId,
    snapshotType: req.body.snapshotType || 'progress',
    evaluatedBy: 'user_request',
    });
    res.json({ success: true, snapshot });
    } catch (e) {
      safeError(res, e, 'outcome-tracker');
    }
  });

  router.get('/outcome-tracker/latest/:beneficiaryId', authenticate, async (req, res) => {
    try {
    const snapshot = await getLatestOutcome(req.params.beneficiaryId, req.query.episodeId);
    res.json({ success: true, snapshot });
    } catch (e) {
      safeError(res, e, 'outcome-tracker');
    }
  });

  router.get('/outcome-tracker/history/:beneficiaryId', authenticate, async (req, res) => {
    try {
    const snapshots = await getOutcomeHistory(
    req.params.beneficiaryId,
    req.query.episodeId,
    parseInt(req.query.limit, 10) || 20
    );
    res.json({ success: true, snapshots });
    } catch (e) {
      safeError(res, e, 'outcome-tracker');
    }
  });

  router.get('/outcome-tracker/discharge-readiness/:beneficiaryId', authenticate, async (req, res) => {
    try {
    const ctx = await gatherOutcomeContext(req.params.beneficiaryId, req.query.episodeId);
    const readiness = evaluateDischargeReadiness(ctx);
    res.json({ success: true, readiness });
    } catch (e) {
      safeError(res, e, 'outcome-tracker');
    }
  });

  router.get('/outcome-tracker/dashboard', authenticate, async (req, res) => {
    try {
    const dashboard = await getOutcomeDashboard(req.query.branchId);
    res.json({ success: true, dashboard });
    } catch (e) {
      safeError(res, e, 'outcome-tracker');
    }
  });

  router.get('/outcome-tracker/intervention-comparison', authenticate, async (req, res) => {
    try {
    const comparison = await getInterventionComparison(req.query.branchId);
    res.json({ success: true, comparison });
    } catch (e) {
      safeError(res, e, 'outcome-tracker');
    }
  });

module.exports = router;

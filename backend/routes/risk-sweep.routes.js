'use strict';
/**
 * risk-sweep.routes.js — Wave 289.
 *
 * Exposes the W288 Risk Sweeper service over HTTP so:
 *   - clinical leads can manually trigger a sweep for their branch
 *     (POST /api/risk-sweep/run)         — tier 2 (mutating + cost)
 *   - dashboards can list today's snapshots filtered by tier
 *     (GET  /api/risk-sweep/snapshots)   — tier 1 (read)
 *   - the longitudinal record for one beneficiary is queryable
 *     (GET  /api/risk-sweep/beneficiary/:id/trend) — tier 1 (read)
 *
 * Reuses the singleton `app._riskSweeperService` constructed by
 * `startup/riskSweeperBootstrap.js` (W288). No new persistence wiring
 * happens at the route layer.
 *
 * Read endpoints always scope by branchId, sourced first from the
 * authenticated user (req.user.branchId) and only overridable by
 * explicit query when the actor is a tier-2 (cross-branch) operator.
 */

const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/auth');
const { attachMfaActor, requireMfaTier } = require('../middleware/requireMfaTier');
const safeError = require('../utils/safeError');
const logger = require('../utils/logger');

function getService(req) {
  return req.app._riskSweeperService;
}

function actorBranchOrQuery(req) {
  const own = req.user && req.user.branchId;
  const queried = typeof req.query.branchId === 'string' ? req.query.branchId : null;
  // Tier-2 actors may scope to any branch via query; everyone else gets
  // forced to their own branch (defense-in-depth — no cross-branch peek).
  if (req.mfaActor && req.mfaActor.tier >= 2 && queried) return queried;
  return own || queried || null;
}

router.use(authenticate);
router.use(attachMfaActor);

// ── MANUAL TRIGGER ─────────────────────────────────────────────────────
// Tier 2: writes RiskSnapshot rows + can emit AiAlerts. Same trust level
// as the cron path it replicates.
router.post('/run', requireMfaTier(2), async (req, res) => {
  try {
    const svc = getService(req);
    if (!svc)
      return res.status(503).json({ success: false, code: 'RISK_SWEEPER_SERVICE_NOT_WIRED' });

    const branchId = actorBranchOrQuery(req) || req.body?.branchId;
    if (!branchId) return res.status(400).json({ success: false, code: 'BRANCH_REQUIRED' });

    const limit = Math.min(parseInt(req.body?.limit, 10) || 5000, 20000);
    const summary = await svc.runSweepForBranch({ branchId, limit });
    return res.json({ success: true, summary });
  } catch (err) {
    const status = err && err.reason === 'SUBJECT_REQUIRED' ? 400 : 500;
    logger.error('[risk-sweep] run error', { err: err && err.message });
    return res
      .status(status)
      .json({ success: false, code: err.reason || 'SWEEP_FAILED', error: safeError(err) });
  }
});

// ── LIST SNAPSHOTS ─────────────────────────────────────────────────────
// Tier 1 read. Defaults to today's sweepRunId unless ?sweepRunId is
// provided. Filterable by tier (?tier=high,critical) and delta
// (?delta=escalated,first).
router.get('/snapshots', requireMfaTier(1), async (req, res) => {
  try {
    const RiskSnapshot = require('../models/RiskSnapshot');
    const branchId = actorBranchOrQuery(req);
    if (!branchId) return res.status(400).json({ success: false, code: 'BRANCH_REQUIRED' });

    const filter = { branchId };
    if (req.query.sweepRunId) {
      filter.sweepRunId = String(req.query.sweepRunId);
    } else {
      const { todayRunId } = require('../services/risk-sweeper.service');
      filter.sweepRunId = todayRunId();
    }

    const tierList = String(req.query.tier || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    if (tierList.length) filter.overallTier = { $in: tierList };

    const deltaList = String(req.query.delta || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    if (deltaList.length) filter.tierDelta = { $in: deltaList };

    const limit = Math.min(parseInt(req.query.limit, 10) || 200, 1000);
    const items = await RiskSnapshot.find(filter)
      .sort({ overallScore: -1, computedAt: -1 })
      .limit(limit)
      .lean();

    return res.json({
      success: true,
      sweepRunId: filter.sweepRunId,
      branchId,
      total: items.length,
      items,
    });
  } catch (err) {
    logger.error('[risk-sweep] snapshots error', { err: err && err.message });
    return res
      .status(500)
      .json({ success: false, code: 'SNAPSHOTS_FAILED', error: safeError(err) });
  }
});

// ── BENEFICIARY TREND ──────────────────────────────────────────────────
// Tier 1 read. Returns chronological snapshot history (default last 30)
// so the UI can render a score timeline + tier transitions per beneficiary.
router.get('/beneficiary/:id/trend', requireMfaTier(1), async (req, res) => {
  try {
    const RiskSnapshot = require('../models/RiskSnapshot');
    const beneficiaryId = req.params.id;
    if (!beneficiaryId)
      return res.status(400).json({ success: false, code: 'BENEFICIARY_REQUIRED' });

    const limit = Math.min(parseInt(req.query.limit, 10) || 30, 365);
    const items = await RiskSnapshot.find({ beneficiaryId })
      .sort({ computedAt: -1 })
      .limit(limit)
      .select(
        'sweepRunId overallScore overallTier previousTier tierDelta topFactors composite computedAt'
      )
      .lean();

    // Branch scope enforcement: if any returned snapshot belongs to a
    // branch other than the actor's (and actor is tier <2), reject.
    if (req.mfaActor && req.mfaActor.tier < 2 && req.user && req.user.branchId) {
      const actorBranch = String(req.user.branchId);
      const foreign = items.find(i => i.branchId && String(i.branchId) !== actorBranch);
      if (foreign) return res.status(403).json({ success: false, code: 'CROSS_BRANCH_FORBIDDEN' });
    }

    // Newest-first from Mongo; reverse so the timeline reads left→right.
    items.reverse();
    return res.json({ success: true, beneficiaryId, total: items.length, items });
  } catch (err) {
    logger.error('[risk-sweep] trend error', { err: err && err.message });
    return res.status(500).json({ success: false, code: 'TREND_FAILED', error: safeError(err) });
  }
});

module.exports = router;

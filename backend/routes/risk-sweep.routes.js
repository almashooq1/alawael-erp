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

// ── W291: TRIGGERED CRITICAL REVIEWS DASHBOARD ─────────────────────────
// Tier 1 read. Returns CRITICAL PlanReviews opened by the W290 auto-
// trigger over the last N days (default 7, max 90), joined with the
// originating AiAlert + beneficiary identity. Scoped to actor branch.
router.get('/triggered-reviews', requireMfaTier(1), async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const branchId = actorBranchOrQuery(req);
    if (!branchId) return res.status(400).json({ success: false, code: 'BRANCH_REQUIRED' });

    const PlanReview = (() => {
      try {
        return mongoose.model('PlanReview');
      } catch {
        return null;
      }
    })();
    if (!PlanReview)
      return res.status(503).json({ success: false, code: 'PLAN_REVIEW_MODEL_NOT_REGISTERED' });

    const Beneficiary = (() => {
      try {
        return mongoose.model('Beneficiary');
      } catch {
        return null;
      }
    })();
    const AiAlert = (() => {
      try {
        return mongoose.model('AiAlert');
      } catch {
        return null;
      }
    })();

    const days = Math.min(Math.max(parseInt(req.query.days, 10) || 7, 1), 90);
    const since = new Date(Date.now() - days * 86400000);
    const limit = Math.min(parseInt(req.query.limit, 10) || 200, 1000);

    const reviews = await PlanReview.find({
      reviewType: 'CRITICAL',
      createdAt: { $gte: since },
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select(
        '_id carePlan beneficiary reviewDate nextReviewDate summary createdAt acknowledgedAt acknowledgedBy'
      )
      .lean();

    // Branch scope via beneficiary lookup (PlanReview has no branchId).
    const benIds = [...new Set(reviews.map(r => String(r.beneficiary)))];
    const bens = Beneficiary
      ? await Beneficiary.find({ _id: { $in: benIds }, branchId })
          .select('_id branchId firstName lastName fullName')
          .lean()
      : [];
    const benMap = new Map(bens.map(b => [String(b._id), b]));
    const inBranch = reviews.filter(r => benMap.has(String(r.beneficiary)));

    // Nearest AiAlert per beneficiary (same-window join, ±5min around the review).
    const alertsByBen = new Map();
    if (AiAlert && inBranch.length) {
      const alerts = await AiAlert.find({
        target_type: 'beneficiary',
        target_id: { $in: inBranch.map(r => r.beneficiary) },
        alert_type: 'dropout_risk',
        'data.code': { $in: ['RISK_TIER_ESCALATED', 'RISK_TIER_FIRST_CRITICAL'] },
        createdAt: { $gte: since },
      })
        .select('_id target_id severity data createdAt')
        .lean();
      for (const a of alerts) {
        const k = String(a.target_id);
        if (!alertsByBen.has(k)) alertsByBen.set(k, []);
        alertsByBen.get(k).push(a);
      }
    }

    const items = inBranch.map(r => {
      const ben = benMap.get(String(r.beneficiary)) || {};
      const candidates = alertsByBen.get(String(r.beneficiary)) || [];
      const reviewT = new Date(r.createdAt).getTime();
      let nearest = null;
      let nearestGap = Infinity;
      for (const a of candidates) {
        const gap = Math.abs(new Date(a.createdAt).getTime() - reviewT);
        if (gap < nearestGap && gap < 5 * 60_000) {
          nearest = a;
          nearestGap = gap;
        }
      }
      return {
        planReviewId: r._id,
        carePlanId: r.carePlan,
        beneficiaryId: r.beneficiary,
        beneficiaryName:
          ben.fullName || `${ben.firstName || ''} ${ben.lastName || ''}`.trim() || null,
        branchId: ben.branchId || null,
        reviewDate: r.reviewDate,
        nextReviewDate: r.nextReviewDate,
        summary: r.summary,
        createdAt: r.createdAt,
        acknowledgedAt: r.acknowledgedAt || null,
        acknowledgedBy: r.acknowledgedBy || null,
        linkedAlert: nearest
          ? {
              alertId: nearest._id,
              severity: nearest.severity,
              code: nearest.data && nearest.data.code,
              score: nearest.data && nearest.data.score,
              tier: nearest.data && nearest.data.tier,
              sweepRunId: (nearest.data && nearest.data.sweepRunId) || null,
            }
          : null,
      };
    });

    return res.json({
      success: true,
      branchId,
      windowDays: days,
      total: items.length,
      items,
    });
  } catch (err) {
    logger.error('[risk-sweep] triggered-reviews error', { err: err && err.message });
    return res
      .status(500)
      .json({ success: false, code: 'TRIGGERED_REVIEWS_FAILED', error: safeError(err) });
  }
});

// ── W292: ACKNOWLEDGE A CRITICAL PLAN REVIEW ──────────────────────────
// Tier 1 mutating. Clinician confirms they've seen the auto-opened
// CRITICAL review (stops the SLA sweep from escalating it).
router.post('/triggered-reviews/:id/acknowledge', requireMfaTier(1), async (req, res) => {
  try {
    const sla = req.app._planReviewSlaService;
    if (!sla) return res.status(503).json({ success: false, code: 'SLA_SERVICE_NOT_WIRED' });

    const branchId = actorBranchOrQuery(req);
    if (!branchId) return res.status(400).json({ success: false, code: 'BRANCH_REQUIRED' });

    const userId = req.user && (req.user._id || req.user.userId);
    const result = await sla.acknowledge({ planReviewId: req.params.id, userId });
    if (!result.ok) {
      const status =
        result.reason === 'PLAN_REVIEW_NOT_FOUND'
          ? 404
          : result.reason === 'ALREADY_ACKNOWLEDGED'
            ? 409
            : 400;
      return res.status(status).json({ success: false, code: result.reason });
    }

    // Defense-in-depth branch check: confirm the acknowledged review's
    // beneficiary lives in the actor's branch (tier <2 cannot cross).
    if (req.mfaActor && req.mfaActor.tier < 2 && result.review && result.review.beneficiary) {
      try {
        const mongoose = require('mongoose');
        const Beneficiary = mongoose.model('Beneficiary');
        const ben = await Beneficiary.findById(result.review.beneficiary).select('branchId').lean();
        if (ben && String(ben.branchId) !== String(branchId)) {
          return res.status(403).json({ success: false, code: 'CROSS_BRANCH_FORBIDDEN' });
        }
      } catch {
        /* Beneficiary model not registered → fall through (already acked) */
      }
    }

    return res.json({
      success: true,
      code: 'PLAN_REVIEW_ACKNOWLEDGED',
      planReviewId: req.params.id,
      acknowledgedAt: result.review.acknowledgedAt,
      acknowledgedBy: result.review.acknowledgedBy,
    });
  } catch (err) {
    logger.error('[risk-sweep] acknowledge error', { err: err && err.message });
    return res
      .status(500)
      .json({ success: false, code: 'ACKNOWLEDGE_FAILED', error: safeError(err) });
  }
});

// ── W295: VERIFY THE AUDIT CHAIN FOR ONE PLAN REVIEW ──────────────────
// Tier 2 (audit / quality function — not for routine clinical use).
router.get('/triggered-reviews/:id/audit', requireMfaTier(2), async (req, res) => {
  try {
    const audit = req.app._planReviewAckAuditService;
    if (!audit) return res.status(503).json({ success: false, code: 'AUDIT_SERVICE_NOT_WIRED' });
    const result = await audit.verify({ planReviewId: req.params.id });
    return res.json({ success: true, planReviewId: req.params.id, ...result });
  } catch (err) {
    logger.error('[risk-sweep] audit verify error', { err: err && err.message });
    return res
      .status(500)
      .json({ success: false, code: 'AUDIT_VERIFY_FAILED', error: safeError(err) });
  }
});

// ── W297: TELEMETRY SNAPSHOT ────────────────────────────────────
// Tier 1 (operational read). Returns in-memory counter snapshot for the
// W288─W295 risk-sweep / plan-review pipeline. Same shape Prometheus
// scraper consumes; safe to refresh from a dashboard.
router.get('/metrics', requireMfaTier(1), async (_req, res) => {
  try {
    const m = require('../intelligence/risk-metrics.registry');
    return res.json({ success: true, counters: m.snapshotGrouped() });
  } catch (err) {
    logger.error('[risk-sweep] metrics error', { err: err && err.message });
    return res.status(500).json({ success: false, code: 'METRICS_FAILED', error: safeError(err) });
  }
});

module.exports = router;

'use strict';

/**
 * measures-outcomes.routes.js — Wave 233
 * ════════════════════════════════════════════════════════════════════
 * HTTP surface for the W229 outcomes aggregator. Read-only — exposes
 * the three rollup queries that feed B360 panels, therapist workspace
 * dashboards, branch outcomes pages, and monthly reports.
 *
 * Endpoints (all under /api/v1/measures-outcomes):
 *
 *   GET   /_health                                  → registry sanity
 *   GET   /beneficiary/:beneficiaryId               → per-beneficiary
 *                                                    rollup w/ traffic-
 *                                                    light overallStatus
 *   GET   /branch/:branchId?from=&to=               → window rates
 *   GET   /branch/:branchId/timeseries
 *           ?bucket=month|quarter&months=N          → trend chart points
 *
 * Auth: all data routes require authenticate + requireBranchAccess.
 * _health is public (matches the W226 convention).
 *
 * Mounted via routes/registries/clinical-assessment.registry.js using
 * dualMount so legacy /api/measures-outcomes also works.
 *
 * Service errors:
 *   - Aggregator returns {error: 'models_unavailable'} when Mongoose
 *     models aren't registered yet (e.g. on a partial boot). We pass
 *     through as 503.
 *   - Other errors → 500 via safeError.
 * ════════════════════════════════════════════════════════════════════
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const safeError = require('../utils/safeError');
const logger = require('../utils/logger');

const aggregator = require('../services/measureOutcomesAggregator.service');

// ─── Health check (public — matches W226 convention) ─────────────
router.get('/_health', (_req, res) => {
  res.json({ status: 'ok', wave: 'W233', surface: 'measures-outcomes' });
});

// All data routes authenticated + branch-scoped.
router.use(authenticate);
router.use(requireBranchAccess);

// ─── Helpers ─────────────────────────────────────────────────────
function _toErrorResponse(err) {
  const msg = err && err.message ? String(err.message) : 'unknown error';
  if (msg.match(/required|invalid|must be|cannot be|missing|not found/i)) {
    return { status: 400, body: { success: false, error: msg } };
  }
  return { status: 500, body: safeError(err) };
}

function _passThroughOrError(out, res) {
  if (out && out.error === 'models_unavailable') {
    return res.status(503).json({
      success: false,
      error: 'models_unavailable',
      message: 'Required collections not registered yet',
    });
  }
  return res.json({ success: true, data: out });
}

function _parseDate(val, fallback) {
  if (!val) return fallback;
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

function _parsePositiveInt(val, fallback, max) {
  const n = parseInt(val, 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return max && n > max ? max : n;
}

// ════════════════════════════════════════════════════════════════════
// Per-beneficiary rollup
// ════════════════════════════════════════════════════════════════════

/**
 * GET /beneficiary/:beneficiaryId
 * → cross-measure latest+trend+alerts+goals+tasks + overallStatus
 */
router.get('/beneficiary/:beneficiaryId', async (req, res) => {
  try {
    const { beneficiaryId } = req.params;
    if (!beneficiaryId) {
      return res.status(400).json({ success: false, error: 'beneficiaryId required' });
    }
    const out = await aggregator.aggregateBeneficiary(beneficiaryId);
    return _passThroughOrError(out, res);
  } catch (err) {
    logger.warn('[measures-outcomes] /beneficiary failed: %s', err.message);
    const r = _toErrorResponse(err);
    return res.status(r.status).json(r.body);
  }
});

// ════════════════════════════════════════════════════════════════════
// Per-branch rollup
// ════════════════════════════════════════════════════════════════════

/**
 * GET /branch/:branchId?from=&to=
 * → window MCID-achievement-rate + alerts + goals
 *
 * Date params (ISO 8601). Defaults: last 90 days.
 */
router.get('/branch/:branchId', async (req, res) => {
  try {
    const { branchId } = req.params;
    if (!branchId) {
      return res.status(400).json({ success: false, error: 'branchId required' });
    }
    const from = _parseDate(req.query.from);
    const to = _parseDate(req.query.to);
    const opts = {};
    if (from) opts.from = from;
    if (to) opts.to = to;
    const out = await aggregator.aggregateBranch(branchId, opts);
    return _passThroughOrError(out, res);
  } catch (err) {
    logger.warn('[measures-outcomes] /branch failed: %s', err.message);
    const r = _toErrorResponse(err);
    return res.status(r.status).json(r.body);
  }
});

/**
 * GET /branch/:branchId/timeseries?bucket=month|quarter&months=N
 * → time series of administrations + alertsRaised per bucket
 *
 * bucket: 'month' (default) | 'quarter'
 * months: 1-24 (default 6)
 */
router.get('/branch/:branchId/timeseries', async (req, res) => {
  try {
    const { branchId } = req.params;
    if (!branchId) {
      return res.status(400).json({ success: false, error: 'branchId required' });
    }
    const bucket = req.query.bucket === 'quarter' ? 'quarter' : 'month';
    const months = _parsePositiveInt(req.query.months, 6, 24);
    const out = await aggregator.aggregateBranchTimeseries(branchId, { bucket, months });
    return _passThroughOrError(out, res);
  } catch (err) {
    logger.warn('[measures-outcomes] /branch/.../timeseries failed: %s', err.message);
    const r = _toErrorResponse(err);
    return res.status(r.status).json(r.body);
  }
});

module.exports = router;

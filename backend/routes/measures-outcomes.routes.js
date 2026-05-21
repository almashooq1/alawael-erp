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
 *   GET   /family-report/:beneficiaryId
 *           ?includeHidden=true                     → W240 family-friendly
 *                                                    Arabic report
 *   GET   /ministry-report/branch/:branchId
 *           ?year=YYYY&month=MM                     → W242 MOHRSD JSON
 *   GET   /ministry-report/branch/:branchId/csv/:year/:month
 *                                                   → W242 MOHRSD CSV
 *                                                    (Excel-compatible
 *                                                    attachment)
 *   GET   /clinical-report/:beneficiaryId
 *           ?includeCorrections=false               → W245 clinical
 *                                                    deep-dive (full
 *                                                    statistical detail
 *                                                    + admin history)
 *   GET   /ministry-comparison
 *           ?branchIds=a,b,c&year=YYYY&month=MM    → W250 multi-branch
 *                                                    ministry comparison
 *                                                    w/ leaderboards +
 *                                                    org totals
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
const logger = require('../utils/logger');

const aggregator = require('../services/measureOutcomesAggregator.service');
const familyReport = require('../services/measureFamilyReport.service');
const ministryReport = require('../services/measureMinistryReport.service');
const ministryComparison = require('../services/measureMinistryComparison.service');
const clinicalReport = require('../services/measureClinicalReport.service');

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
  // Production-safe body: in non-prod include err.message for debug,
  // in prod return only a generic. Matches the safeError() module's
  // intent but inline so we can return-and-respond from the caller.
  const body =
    process.env.NODE_ENV === 'production'
      ? { success: false, message: 'حدث خطأ داخلي' }
      : { success: false, message: msg };
  return { status: 500, body };
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

// ════════════════════════════════════════════════════════════════════
// W241 — Family-friendly Arabic report (W240 service surface)
// ════════════════════════════════════════════════════════════════════

/**
 * GET /family-report/:beneficiaryId
 *
 * Returns the W240 family-friendly Arabic report payload. Read-only
 * orchestration above W229 aggregateBeneficiary + W210 measure metadata.
 *
 * Query:
 *   includeHidden=true   → opt-in to include measures with
 *                          reporting.showInFamilyReport=false
 *
 * Responses:
 *   200 → { success: true, data: {<W240 report shape>} }
 *   400 → missing beneficiaryId
 *   503 → models_unavailable propagated from aggregator
 *   500 → unexpected failure
 *
 * Note: this surface is auth + branch-scoped exactly like the rollup
 * endpoints. A future wave can layer a print/PDF route on top.
 */
router.get('/family-report/:beneficiaryId', async (req, res) => {
  try {
    const { beneficiaryId } = req.params;
    if (!beneficiaryId) {
      return res.status(400).json({ success: false, error: 'beneficiaryId required' });
    }
    const opts = {};
    if (req.query.includeHidden === 'true' || req.query.includeHidden === '1') {
      opts.includeHiddenMeasures = true;
    }
    const out = await familyReport.generate(beneficiaryId, opts);
    return _passThroughOrError(out, res);
  } catch (err) {
    logger.warn('[measures-outcomes] /family-report failed: %s', err.message);
    const r = _toErrorResponse(err);
    return res.status(r.status).json(r.body);
  }
});

// ════════════════════════════════════════════════════════════════════
// W244 — MOHRSD monthly ministry report (W242 service surface)
// ════════════════════════════════════════════════════════════════════

/**
 * Parse {year, month} from the request — query params for the JSON
 * endpoint, route params for the CSV endpoint. Throws a 400-shaped
 * Error if invalid (caught by _toErrorResponse).
 */
function _parseMinistryPeriod(year, month) {
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  if (!Number.isInteger(y) || y < 2000 || y > 2100) {
    const err = new Error('year required (integer 2000-2100)');
    throw err;
  }
  if (!Number.isInteger(m) || m < 1 || m > 12) {
    const err = new Error('month required (integer 1-12)');
    throw err;
  }
  return { year: y, month: m };
}

/**
 * GET /ministry-report/branch/:branchId?year=YYYY&month=MM
 *
 * Returns the structured JSON ministry report — the same payload that
 * `generateCsv` builds its spreadsheet from. Used by web-admin to
 * preview the report before downloading.
 */
router.get('/ministry-report/branch/:branchId', async (req, res) => {
  try {
    const { branchId } = req.params;
    if (!branchId) {
      return res.status(400).json({ success: false, error: 'branchId required' });
    }
    const period = _parseMinistryPeriod(req.query.year, req.query.month);
    const out = await ministryReport.generate(branchId, period);
    return _passThroughOrError(out, res);
  } catch (err) {
    logger.warn('[measures-outcomes] /ministry-report failed: %s', err.message);
    const r = _toErrorResponse(err);
    return res.status(r.status).json(r.body);
  }
});

/**
 * GET /ministry-report/branch/:branchId/csv/:year/:month
 *
 * Returns the CSV variant as a downloadable attachment. Year and
 * month live in the route path (not query) so the filename can mirror
 * them naturally and the URL is share-friendly.
 *
 * Headers:
 *   Content-Type: text/csv; charset=utf-8
 *   Content-Disposition: attachment; filename="ministry-<branchId>-<year>-<MM>.csv"
 */
router.get('/ministry-report/branch/:branchId/csv/:year/:month', async (req, res) => {
  try {
    const { branchId, year, month } = req.params;
    if (!branchId) {
      return res.status(400).json({ success: false, error: 'branchId required' });
    }
    const period = _parseMinistryPeriod(year, month);
    const csv = await ministryReport.generateCsv(branchId, period);
    if (csv == null) {
      return res.status(503).json({
        success: false,
        error: 'models_unavailable',
        message: 'Required collections not registered yet',
      });
    }
    const monthPadded = String(period.month).padStart(2, '0');
    const filename = `ministry-${branchId}-${period.year}-${monthPadded}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csv);
  } catch (err) {
    logger.warn('[measures-outcomes] /ministry-report/.../csv failed: %s', err.message);
    const r = _toErrorResponse(err);
    return res.status(r.status).json(r.body);
  }
});

// ════════════════════════════════════════════════════════════════════
// W246 — Clinical deep-dive report (W245 service surface)
// ════════════════════════════════════════════════════════════════════

/**
 * GET /clinical-report/:beneficiaryId
 *
 * Returns the W245 clinical-deep-dive report — beneficiary-level
 * payload with FULL statistical detail (trend slope+CI95+R²,
 * frozen MCID/SDC snapshots, complete admin history with version
 * pinning, citations). Used by physicians + insurance review.
 *
 * Query:
 *   includeCorrections=false  → drop superseded records from
 *                               adminHistory (default true keeps
 *                               them for full audit trail).
 *
 * Responses:
 *   200 → { success: true, data: <W245 report shape> }
 *   400 → missing beneficiaryId
 *   503 → models_unavailable propagated from W229 aggregator
 *   500 → unexpected failure
 *
 * Note: this is the THIRD audience layer of the trilogy. Compare:
 *   /family-report/:id        (W241 — hides jargon)
 *   /ministry-report/branch/* (W244 — branch monthly rollup)
 *   /clinical-report/:id      (W246 — beneficiary deep-dive)
 */
router.get('/clinical-report/:beneficiaryId', async (req, res) => {
  try {
    const { beneficiaryId } = req.params;
    if (!beneficiaryId) {
      return res.status(400).json({ success: false, error: 'beneficiaryId required' });
    }
    // includeCorrections is opt-OUT (default true) — the medical
    // record wants the full audit trail unless explicitly stripped.
    const opts = {};
    if (req.query.includeCorrections === 'false' || req.query.includeCorrections === '0') {
      opts.includeCorrections = false;
    }
    const out = await clinicalReport.generate(beneficiaryId, opts);
    return _passThroughOrError(out, res);
  } catch (err) {
    logger.warn('[measures-outcomes] /clinical-report failed: %s', err.message);
    const r = _toErrorResponse(err);
    return res.status(r.status).json(r.body);
  }
});

// ════════════════════════════════════════════════════════════════════
// W251 — Multi-branch ministry comparison (W250 service surface)
// ════════════════════════════════════════════════════════════════════

/**
 * Parse the branchIds query param. Supports two forms:
 *   ?branchIds=a,b,c    (CSV — preferred for URL share-friendliness)
 *   ?branchIds=a&branchIds=b&branchIds=c  (Express array form)
 *
 * Returns trimmed string[] with empty entries dropped. Throws when
 * the result is empty (caller maps to 400).
 */
function _parseBranchIds(raw) {
  if (raw == null) throw new Error('branchIds required (comma-separated list)');
  let arr = Array.isArray(raw) ? raw : String(raw).split(',');
  arr = arr.map(s => String(s).trim()).filter(Boolean);
  if (arr.length === 0) throw new Error('branchIds required (≥1 non-empty id)');
  return arr;
}

/**
 * GET /ministry-comparison?branchIds=a,b,c&year=YYYY&month=MM
 *
 * Returns the W250 comparison payload (branches[] + organizationTotals
 * + leaderboards). Best read alongside W244 single-branch ministry
 * report when a director wants to drill into one branch's detail.
 *
 * Responses:
 *   200 → { success: true, data: <W250 report shape> }
 *   400 → missing/invalid branchIds, year, or month
 *   500 → unexpected service throw
 *
 * Note: This endpoint does NOT short-circuit on per-branch errors —
 * those land in `branches[N].error` and the report still ships.
 * Only validation errors (bad params) get a 400.
 */
router.get('/ministry-comparison', async (req, res) => {
  try {
    const branchIds = _parseBranchIds(req.query.branchIds);
    const y = parseInt(req.query.year, 10);
    const m = parseInt(req.query.month, 10);
    if (!Number.isInteger(y) || y < 2000 || y > 2100) {
      return res.status(400).json({ success: false, error: 'year required (integer 2000-2100)' });
    }
    if (!Number.isInteger(m) || m < 1 || m > 12) {
      return res.status(400).json({ success: false, error: 'month required (integer 1-12)' });
    }
    const out = await ministryComparison.compareBranches({ branchIds, year: y, month: m });
    return res.json({ success: true, data: out });
  } catch (err) {
    logger.warn('[measures-outcomes] /ministry-comparison failed: %s', err.message);
    const r = _toErrorResponse(err);
    return res.status(r.status).json(r.body);
  }
});

module.exports = router;

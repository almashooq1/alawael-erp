'use strict';

/**
 * pay-equity.routes.js — HR pay-equity analysis surface (W1193).
 *
 * Mount: /api/hr/pay-equity + /api/v1/hr/pay-equity (dualMountAuth).
 *
 *   GET  /analysis    — live demographic pay-gap + outlier summary (aggregates only)
 *   GET  /flagged     — below-cohort employees (identity-bearing; stricter role)
 *   POST /snapshot    — persist an aggregate-only snapshot for trend tracking
 *   GET  /snapshots   — snapshot history
 *   GET  /trends      — equity-score + gap-% series for charting
 *
 * SECURITY:
 *   - Salary data is sensitive: read is gated to HR/finance/compliance leadership.
 *   - Branch isolation via `effectiveBranchScope(req)` (W269) — a branch-restricted
 *     caller can ONLY analyse/list their own branch; a ?branchId spoof is ignored.
 *     HQ/cross-branch roles get org-wide (branchId=null → no branch filter).
 *   - /flagged returns individual identities → requires the stricter FLAGGED_ROLES.
 */

const express = require('express');
const router = express.Router();

const { authenticateToken, requireRole } = require('../../middleware/auth');
const { requireBranchAccess } = require('../../middleware/branchScope.middleware');
const { effectiveBranchScope } = require('../../middleware/assertBranchMatch');
const safeError = require('../../utils/safeError');
const svc = require('../../services/hr/payEquityService');

// Aggregate reads — HR/finance leadership + compliance.
const READ_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'hr_manager',
  'hr_director',
  'hr',
  'cfo',
  'finance_manager',
  'compliance',
  'compliance_officer',
];
// Identity-bearing flagged list — narrower (the people who can act on a case).
const FLAGGED_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'hr_director',
  'compliance',
  'compliance_officer',
  'cfo',
];
// Editing the job→band config (org-global reference data) — HR/admin only.
const CONFIG_ROLES = ['admin', 'superadmin', 'super_admin', 'hr_director', 'hr_manager'];

router.use(authenticateToken);
router.use(requireBranchAccess);

function parseOpts(req) {
  const department = req.query.department ? String(req.query.department) : null;
  const thresholdPct = req.query.thresholdPct;
  const byTitle = req.query.byTitle === 'true' || req.query.byTitle === '1';
  return { department, thresholdPct, byTitle };
}

function mapErr(res, err, ctx) {
  if (err && err.code === 'MODEL_UNAVAILABLE') {
    return res.status(503).json({ success: false, error: err.message });
  }
  if (err && err.code === 'VALIDATION') {
    return res.status(400).json({ success: false, error: err.message });
  }
  return safeError(res, err, ctx);
}

/** GET /analysis — aggregate gap + outlier summary (no individual identities). */
router.get('/analysis', requireRole(READ_ROLES), async (req, res) => {
  try {
    const { department, thresholdPct, byTitle } = parseOpts(req);
    const branchId = effectiveBranchScope(req); // W269 — own branch, or null for HQ
    const a = await svc.analyze({ branchId, department, thresholdPct, byTitle });
    const { flagged, ...summary } = a; // strip identities from the summary surface
    res.json({ success: true, data: { ...summary, flaggedCount: flagged.length } });
  } catch (err) {
    mapErr(res, err, 'pay-equity:analysis');
  }
});

/** GET /flagged — below-cohort employees (identities) — stricter role. */
router.get('/flagged', requireRole(FLAGGED_ROLES), async (req, res) => {
  try {
    const { department, thresholdPct, byTitle } = parseOpts(req);
    const branchId = effectiveBranchScope(req);
    const flagged = await svc.flaggedEmployees({ branchId, department, thresholdPct, byTitle });
    res.json({ success: true, data: { count: flagged.length, items: flagged } });
  } catch (err) {
    mapErr(res, err, 'pay-equity:flagged');
  }
});

/** POST /snapshot — persist an aggregate-only run. */
router.post('/snapshot', requireRole(READ_ROLES), async (req, res) => {
  try {
    const department = req.body && req.body.department ? String(req.body.department) : null;
    const thresholdPct = req.body && req.body.thresholdPct;
    const byTitle = !!(req.body && req.body.byTitle);
    const branchId = effectiveBranchScope(req);
    if (!branchId) {
      // a snapshot is a branch-scoped artifact; HQ must name a branch in body
      const bodyBranch = req.body && req.body.branchId;
      if (!bodyBranch) {
        return res
          .status(400)
          .json({
            success: false,
            error: 'branchId required (HQ must specify a branch to snapshot)',
          });
      }
    }
    const actor = req.user || {};
    const doc = await svc.snapshot({
      branchId: branchId || (req.body && req.body.branchId),
      department,
      thresholdPct,
      byTitle,
      computedBy: actor.id || actor._id || actor.userId || null,
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    mapErr(res, err, 'pay-equity:snapshot');
  }
});

/** GET /snapshots — history (branch-scoped). */
router.get('/snapshots', requireRole(READ_ROLES), async (req, res) => {
  try {
    const department = req.query.department ? String(req.query.department) : null;
    const branchId = effectiveBranchScope(req);
    const items = await svc.listSnapshots({ branchId, department, limit: req.query.limit });
    res.json({ success: true, data: { count: items.length, items } });
  } catch (err) {
    mapErr(res, err, 'pay-equity:snapshots');
  }
});

/** GET /trends — equity-score + gap series (branch-scoped). */
router.get('/trends', requireRole(READ_ROLES), async (req, res) => {
  try {
    const department = req.query.department ? String(req.query.department) : null;
    const branchId = effectiveBranchScope(req);
    const series = await svc.trends({ branchId, department, limit: req.query.limit });
    res.json({ success: true, data: { count: series.length, series } });
  } catch (err) {
    mapErr(res, err, 'pay-equity:trends');
  }
});

// ──────────────────────────────────────────────────────────────────────────
// compa-ratio (W1385) — salary vs the midpoint of the band the ROLE maps to.
// ──────────────────────────────────────────────────────────────────────────

/** GET /compa-ratio — aggregate compa-ratio distribution (no identities). */
router.get('/compa-ratio', requireRole(READ_ROLES), async (req, res) => {
  try {
    const department = req.query.department ? String(req.query.department) : null;
    const branchId = effectiveBranchScope(req); // W269 — own branch, or null for HQ
    const data = await svc.compaRatioAnalysis({ branchId, department });
    res.json({ success: true, data });
  } catch (err) {
    mapErr(res, err, 'pay-equity:compa-ratio');
  }
});

/** GET /below-band — employees paid below their band (identities) — stricter role. */
router.get('/below-band', requireRole(FLAGGED_ROLES), async (req, res) => {
  try {
    const department = req.query.department ? String(req.query.department) : null;
    const branchId = effectiveBranchScope(req);
    const items = await svc.belowBandEmployees({ branchId, department, belowThreshold: req.query.belowThreshold });
    res.json({ success: true, data: { count: items.length, items } });
  } catch (err) {
    mapErr(res, err, 'pay-equity:below-band');
  }
});

/** GET /band-mappings — list the job→band config (org-global reference). */
router.get('/band-mappings', requireRole(READ_ROLES), async (req, res) => {
  try {
    const items = await svc.listJobBandMappings();
    res.json({ success: true, data: { count: items.length, items } });
  } catch (err) {
    mapErr(res, err, 'pay-equity:band-mappings:list');
  }
});

/** POST /band-mappings — create/update a job→band mapping (HR/admin config). */
router.post('/band-mappings', requireRole(CONFIG_ROLES), async (req, res) => {
  try {
    const actor = req.user || {};
    const doc = await svc.upsertJobBandMapping({
      jobTitle: req.body && req.body.jobTitle,
      bandCode: req.body && req.body.bandCode,
      active: req.body && req.body.active !== undefined ? !!req.body.active : true,
      note: req.body && req.body.note ? String(req.body.note) : null,
      createdBy: actor.id || actor._id || actor.userId || null,
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    mapErr(res, err, 'pay-equity:band-mappings:upsert');
  }
});

module.exports = router;

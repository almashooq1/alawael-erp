'use strict';

/**
 * diversity.routes.js — HR Diversity & Inclusion analytics surface (W1199).
 *
 * Mount: /api/hr/diversity + /api/v1/hr/diversity (self-authed → safe under the
 * plain hr.registry app.use mount, W1190/W1191).
 *
 *   GET  /analysis   — live composition + diversity indices + Saudization + glass-ceiling
 *   POST /snapshot   — persist an aggregate-only snapshot for trends
 *   GET  /snapshots  — history
 *   GET  /trends     — Saudization + diversity-index series
 *
 * Aggregate-only (counts/%/indices — no salaries, no identities), so reads are
 * gated to HR/leadership but not as tightly as pay-equity. Branch isolation via
 * effectiveBranchScope(req) (W269); a ?branchId spoof is ignored.
 */

const express = require('express');
const router = express.Router();

const { authenticateToken, requireRole } = require('../../middleware/auth');
const { requireBranchAccess } = require('../../middleware/branchScope.middleware');
const { effectiveBranchScope } = require('../../middleware/assertBranchMatch');
const safeError = require('../../utils/safeError');
const svc = require('../../services/hr/diversityService');

const READ_ROLES = [
  'admin', 'superadmin', 'super_admin', 'hr_manager', 'hr_director', 'hr',
  'manager', 'compliance', 'compliance_officer',
];

router.use(authenticateToken);
router.use(requireBranchAccess);

function mapErr(res, err, ctx) {
  if (err && err.code === 'MODEL_UNAVAILABLE') return res.status(503).json({ success: false, error: err.message });
  return safeError(res, err, ctx);
}

/** GET /analysis — live D&I analysis (aggregate). */
router.get('/analysis', requireRole(READ_ROLES), async (req, res) => {
  try {
    const branchId = effectiveBranchScope(req); // W269 — own branch or null (HQ)
    const data = await svc.analyze({
      branchId,
      department: req.query.department ? String(req.query.department) : null,
      tiers: req.query.tiers,
    });
    res.json({ success: true, data });
  } catch (err) {
    mapErr(res, err, 'diversity:analysis');
  }
});

/** POST /snapshot — persist an aggregate-only run. */
router.post('/snapshot', requireRole(READ_ROLES), async (req, res) => {
  try {
    const department = req.body && req.body.department ? String(req.body.department) : null;
    const branchId = effectiveBranchScope(req);
    if (!branchId && !(req.body && req.body.branchId)) {
      return res.status(400).json({ success: false, error: 'branchId required (HQ must specify a branch to snapshot)' });
    }
    const actor = req.user || {};
    const doc = await svc.snapshot({
      branchId: branchId || (req.body && req.body.branchId),
      department,
      tiers: req.body && req.body.tiers,
      computedBy: actor.id || actor._id || actor.userId || null,
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    mapErr(res, err, 'diversity:snapshot');
  }
});

/** GET /snapshots — history (branch-scoped). */
router.get('/snapshots', requireRole(READ_ROLES), async (req, res) => {
  try {
    const branchId = effectiveBranchScope(req);
    const items = await svc.listSnapshots({
      branchId,
      department: req.query.department ? String(req.query.department) : null,
      limit: req.query.limit,
    });
    res.json({ success: true, data: { count: items.length, items } });
  } catch (err) {
    mapErr(res, err, 'diversity:snapshots');
  }
});

/** GET /trends — Saudization + diversity-index series (branch-scoped). */
router.get('/trends', requireRole(READ_ROLES), async (req, res) => {
  try {
    const branchId = effectiveBranchScope(req);
    const series = await svc.trends({
      branchId,
      department: req.query.department ? String(req.query.department) : null,
      limit: req.query.limit,
    });
    res.json({ success: true, data: { count: series.length, series } });
  } catch (err) {
    mapErr(res, err, 'diversity:trends');
  }
});

module.exports = router;

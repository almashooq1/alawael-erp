'use strict';

/**
 * headcount-planning.routes.js — HR workforce supply-planning surface (W1203).
 *
 * Mount: /api/hr/headcount-planning + /api/v1/... (self-authed → safe under the
 * plain hr.registry app.use mount, W1190/W1191).
 *
 *   GET  /current   — live active headcount + per-department breakdown
 *   POST /preview   — what-if hiring-need forecast (no persist)
 *   POST /plans     — build + persist a supply plan (current headcount pulled live)
 *   GET  /plans     — list saved plans
 *
 * Branch isolation via effectiveBranchScope (W269 — the caller's own branch only).
 * Headcount is org-operational (not PII): reads gated to HR/finance leadership.
 */

const express = require('express');
const router = express.Router();

const { authenticateToken, requireRole } = require('../../middleware/auth');
const { requireBranchAccess } = require('../../middleware/branchScope.middleware');
const { effectiveBranchScope } = require('../../middleware/assertBranchMatch');
const safeError = require('../../utils/safeError');
const svc = require('../../services/hr/headcountPlanningService');

const READ_ROLES = ['admin', 'superadmin', 'super_admin', 'hr_manager', 'hr_director', 'hr', 'manager', 'cfo', 'finance_manager'];
const WRITE_ROLES = ['admin', 'superadmin', 'super_admin', 'hr_manager', 'hr_director', 'cfo'];

router.use(authenticateToken);
router.use(requireBranchAccess);

function mapErr(res, err, ctx) {
  if (err && err.code === 'MODEL_UNAVAILABLE') return res.status(503).json({ success: false, error: err.message });
  if (err && err.code === 'VALIDATION') return res.status(400).json({ success: false, error: err.message });
  if (err && err.name === 'ValidationError') return res.status(400).json({ success: false, error: err.message });
  return safeError(res, err, ctx);
}

/** GET /current — live active headcount + per-department breakdown. */
router.get('/current', requireRole(READ_ROLES), async (req, res) => {
  try {
    const branchId = effectiveBranchScope(req); // W269 — own branch or null (HQ)
    const data = await svc.currentHeadcount({ branchId, department: req.query.department ? String(req.query.department) : null });
    res.json({ success: true, data });
  } catch (err) {
    mapErr(res, err, 'headcount:current');
  }
});

/** POST /preview — what-if forecast (no persist). */
router.post('/preview', requireRole(READ_ROLES), async (req, res) => {
  try {
    const b = req.body || {};
    const branchId = effectiveBranchScope(req);
    const data = await svc.previewForecast({
      branchId,
      department: b.department ? String(b.department) : null,
      targetHeadcount: b.targetHeadcount,
      attritionRatePct: b.attritionRatePct,
      periods: b.periods,
    });
    res.json({ success: true, data });
  } catch (err) {
    mapErr(res, err, 'headcount:preview');
  }
});

/** POST /plans — build + persist a supply plan. */
router.post('/plans', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const b = req.body || {};
    const branchId = effectiveBranchScope(req);
    if (!branchId && !b.branchId) {
      return res.status(400).json({ success: false, error: 'branchId required (HQ must specify a branch)' });
    }
    const actor = req.user || {};
    const doc = await svc.buildPlan({
      branchId: branchId || b.branchId,
      department: b.department ? String(b.department) : null,
      planLabel: b.planLabel,
      targetHeadcount: b.targetHeadcount,
      attritionRatePct: b.attritionRatePct,
      periods: b.periods,
      createdBy: actor.id || actor._id || actor.userId || null,
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    mapErr(res, err, 'headcount:plan');
  }
});

/** GET /plans — list saved plans (branch-scoped). */
router.get('/plans', requireRole(READ_ROLES), async (req, res) => {
  try {
    const branchId = effectiveBranchScope(req);
    const items = await svc.listPlans({ branchId, department: req.query.department ? String(req.query.department) : null, limit: req.query.limit });
    res.json({ success: true, data: { count: items.length, items } });
  } catch (err) {
    mapErr(res, err, 'headcount:plans');
  }
});

module.exports = router;

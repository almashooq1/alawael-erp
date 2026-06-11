'use strict';

/**
 * talent-grid.routes.js — HR 9-box talent-matrix surface (W1198).
 *
 * Mount: /api/hr/talent-grid + /api/v1/hr/talent-grid (self-authed → safe under
 * the plain hr.registry app.use mount, W1190/W1191 doctrine).
 *
 *   POST /reviews              — upsert a talent review (manager/HR)
 *   GET  /grid                 — 9-box distribution + hiPo/risk rates (aggregate)
 *   GET  /high-potentials      — employees in hiPo boxes (identity-bearing)
 *   GET  /risks                — employees in risk boxes (identity-bearing, stricter)
 *   GET  /employee/:employeeId — one employee's placement
 *
 * SECURITY: branch isolation (W269) — writes go through enforceEmployeeBranch on
 * the target employee; reads scope to effectiveBranchScope(req). Risk/hiPo lists
 * carry identities → role-gated.
 */

const express = require('express');
const router = express.Router();

const { authenticateToken, requireRole } = require('../../middleware/auth');
const { requireBranchAccess } = require('../../middleware/branchScope.middleware');
const { effectiveBranchScope, enforceEmployeeBranch } = require('../../middleware/assertBranchMatch');
const safeError = require('../../utils/safeError');
const svc = require('../../services/hr/talentGridService');

const READ_ROLES = ['admin', 'superadmin', 'super_admin', 'hr_manager', 'hr_director', 'hr', 'manager'];
const WRITE_ROLES = ['admin', 'superadmin', 'super_admin', 'hr_manager', 'hr_director', 'manager'];
// negative-label identity lists → narrower
const SENSITIVE_ROLES = ['admin', 'superadmin', 'super_admin', 'hr_director', 'hr_manager'];

router.use(authenticateToken);
router.use(requireBranchAccess);

function mapErr(res, err, ctx) {
  if (err && err.code === 'MODEL_UNAVAILABLE') return res.status(503).json({ success: false, error: err.message });
  if (err && (err.code === 'VALIDATION' || err.code === 'NO_PERFORMANCE')) {
    return res.status(400).json({ success: false, error: err.message });
  }
  if (err && err.name === 'ValidationError') return res.status(400).json({ success: false, error: err.message });
  if (err && err.status) return res.status(err.status).json({ success: false, error: err.message });
  return safeError(res, err, ctx);
}

async function guardEmployee(req, res, employeeId) {
  try {
    await enforceEmployeeBranch(req, employeeId); // W269 — throws 403/404 on cross-branch
    return false;
  } catch (err) {
    res.status(err.status || 403).json({ success: false, error: err.message });
    return true;
  }
}

/** POST /reviews — upsert a talent review for an employee. */
router.post('/reviews', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.employeeId) return res.status(400).json({ success: false, error: 'employeeId required' });
    if (await guardEmployee(req, res, body.employeeId)) return; // W269
    const actor = req.user || {};
    const doc = await svc.upsertReview({
      employeeId: body.employeeId,
      reviewCycle: body.reviewCycle,
      potentialBand: body.potentialBand,
      performanceBand: body.performanceBand, // optional → derived from PerformanceEvaluation
      notes: body.notes,
      reviewedBy: actor.id || actor._id || actor.userId || null,
      status: body.status,
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    mapErr(res, err, 'talent-grid:upsert');
  }
});

/** GET /grid — 9-box distribution (aggregate, no identities). */
router.get('/grid', requireRole(READ_ROLES), async (req, res) => {
  try {
    const branchId = effectiveBranchScope(req); // W269 — own branch or null (HQ)
    const data = await svc.gridSummary({ branchId, reviewCycle: req.query.reviewCycle || null });
    res.json({ success: true, data });
  } catch (err) {
    mapErr(res, err, 'talent-grid:grid');
  }
});

/** GET /high-potentials — hiPo employees (identities). */
router.get('/high-potentials', requireRole(READ_ROLES), async (req, res) => {
  try {
    const branchId = effectiveBranchScope(req);
    const items = await svc.highPotentials({ branchId, reviewCycle: req.query.reviewCycle || null });
    res.json({ success: true, data: { count: items.length, items } });
  } catch (err) {
    mapErr(res, err, 'talent-grid:hipo');
  }
});

/** GET /risks — at-risk employees (identities + negative labels) — stricter role. */
router.get('/risks', requireRole(SENSITIVE_ROLES), async (req, res) => {
  try {
    const branchId = effectiveBranchScope(req);
    const items = await svc.risks({ branchId, reviewCycle: req.query.reviewCycle || null });
    res.json({ success: true, data: { count: items.length, items } });
  } catch (err) {
    mapErr(res, err, 'talent-grid:risks');
  }
});

/** GET /employee/:employeeId — one employee's placement. */
router.get('/employee/:employeeId', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (await guardEmployee(req, res, req.params.employeeId)) return; // W269
    const branchId = effectiveBranchScope(req);
    const doc = await svc.getByEmployee({
      branchId,
      employeeId: req.params.employeeId,
      reviewCycle: req.query.reviewCycle || null,
    });
    if (!doc) return res.status(404).json({ success: false, error: 'no talent review found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    mapErr(res, err, 'talent-grid:employee');
  }
});

module.exports = router;

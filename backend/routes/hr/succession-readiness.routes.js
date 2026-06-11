'use strict';

/**
 * succession-readiness.routes.js — computed succession readiness surface (W1207).
 *
 * Mount: /api/hr/succession-readiness + /api/v1/... (self-authed → safe under the
 * plain hr.registry app.use mount, W1190/W1191).
 *
 *   GET /employee/:employeeId?targetRole=...  — computed readiness for one employee
 *   GET /candidates?targetRole=...            — branch employees ranked for a target role
 *
 * The data-driven SUGGESTION (9-box + target-role competency + tenure) the manual
 * succession-planning feature lacks. Branch isolation: enforceEmployeeBranch on the
 * per-employee read, effectiveBranchScope on the candidate ranking (W269 — caller's
 * own branch). Identity-bearing leadership data → role-gated.
 */

const express = require('express');
const router = express.Router();

const { authenticateToken, requireRole } = require('../../middleware/auth');
const { requireBranchAccess } = require('../../middleware/branchScope.middleware');
const { effectiveBranchScope, enforceEmployeeBranch } = require('../../middleware/assertBranchMatch');
const safeError = require('../../utils/safeError');
const svc = require('../../services/hr/successionReadinessService');

const READ_ROLES = ['admin', 'superadmin', 'super_admin', 'hr_manager', 'hr_director', 'manager'];

router.use(authenticateToken);
router.use(requireBranchAccess);

function mapErr(res, err, ctx) {
  if (err && err.code === 'MODEL_UNAVAILABLE') return res.status(503).json({ success: false, error: err.message });
  if (err && err.code === 'VALIDATION') return res.status(400).json({ success: false, error: err.message });
  return safeError(res, err, ctx);
}

async function guardEmployee(req, res, employeeId) {
  try {
    await enforceEmployeeBranch(req, employeeId); // W269 — throws 403/404 cross-branch
    return false;
  } catch (err) {
    res.status(err.status || 403).json({ success: false, error: err.message });
    return true;
  }
}

/** GET /employee/:employeeId — computed readiness for one employee. */
router.get('/employee/:employeeId', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (await guardEmployee(req, res, req.params.employeeId)) return; // W269
    const data = await svc.employeeReadiness({
      employeeId: req.params.employeeId,
      targetJobTitle: req.query.targetRole ? String(req.query.targetRole) : null,
    });
    if (!data) return res.status(404).json({ success: false, error: 'employee not found' });
    res.json({ success: true, data });
  } catch (err) {
    mapErr(res, err, 'succession-readiness:employee');
  }
});

/** GET /candidates?targetRole=... — branch employees ranked for a target role. */
router.get('/candidates', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!req.query.targetRole) {
      return res.status(400).json({ success: false, error: 'targetRole query param required' });
    }
    const branchId = effectiveBranchScope(req); // W269 — own branch or null (HQ)
    const data = await svc.candidatesForRole({ branchId, targetJobTitle: String(req.query.targetRole) });
    res.json({ success: true, data });
  } catch (err) {
    mapErr(res, err, 'succession-readiness:candidates');
  }
});

module.exports = router;

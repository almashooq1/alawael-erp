'use strict';

/**
 * workforce-intelligence.routes.js — branch workforce-health capstone (W1200).
 *
 * Mount: /api/hr/workforce-intelligence + /api/v1/... (self-authed → safe under the
 * plain hr.registry app.use mount, W1190/W1191).
 *
 *   GET /summary — one branch summary across pay-equity + talent 9-box + diversity,
 *                  with headline flags. Branch-isolated (effectiveBranchScope, W269).
 *
 * Carries pay-equity signals → gated to HR/finance leadership (the pay-equity
 * READ_ROLES set), not the broader diversity reader set.
 */

const express = require('express');
const router = express.Router();

const { authenticateToken, requireRole } = require('../../middleware/auth');
const { requireBranchAccess } = require('../../middleware/branchScope.middleware');
const { effectiveBranchScope } = require('../../middleware/assertBranchMatch');
const safeError = require('../../utils/safeError');
const svc = require('../../services/hr/workforceIntelligenceService');

const READ_ROLES = [
  'admin', 'superadmin', 'super_admin', 'hr_manager', 'hr_director', 'hr',
  'cfo', 'finance_manager', 'compliance', 'compliance_officer',
];

router.use(authenticateToken);
router.use(requireBranchAccess);

/** GET /summary — unified workforce-intelligence summary for the caller's branch. */
router.get('/summary', requireRole(READ_ROLES), async (req, res) => {
  try {
    const branchId = effectiveBranchScope(req); // W269 — own branch or null (HQ)
    const data = await svc.summary({
      branchId,
      department: req.query.department ? String(req.query.department) : null,
      reviewCycle: req.query.reviewCycle ? String(req.query.reviewCycle) : null,
    });
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'workforce-intelligence:summary');
  }
});

module.exports = router;

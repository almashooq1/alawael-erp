'use strict';

/**
 * Supervisor operations routes — documentation backlog (W1170).
 *
 * Exposes the W1169 supervisorOps "In-Process vs Complete" board as a LIVE,
 * branch-scoped endpoint so the supervisor UI can show which completed sessions
 * are still awaiting documentation (grouped by therapist) + the documentation
 * compliance rate — previously reachable only via the
 * audit:session-documentation CLI.
 *
 * Mounted by domains/goals/routes/index.routes.js at /api(/v1)/goals.
 * Auth applied by the dualMountAuth registry mount. READ-ONLY.
 *
 * @module domains/goals/routes/supervisor-ops.routes
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { effectiveBranchScope } = require('../../../middleware/assertBranchMatch');
const { documentationBacklog } = require('../../../services/supervisorOps.service');

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// ═══════════════════════════════════════════════════════════════════════════
// GET /supervisor-ops/documentation-backlog[?branchId=&days=]
//   The supervisor "In-Process" chase list: completed sessions still awaiting
//   documentation across a branch, grouped by therapist + documentedRate.
//   Branch-scoped (W269): restricted callers pinned to their branch
//   (effectiveBranchScope ignores ?branchId spoofing); a cross-branch role must
//   name a branch. Window default 7 days, capped at 90.
// ═══════════════════════════════════════════════════════════════════════════
router.get(
  '/supervisor-ops/documentation-backlog',
  asyncHandler(async (req, res) => {
    const scoped = effectiveBranchScope(req); // own branch when restricted; null for cross-branch
    let branchId = scoped || null;
    if (!branchId && req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      branchId = req.query.branchId;
    }
    if (!branchId) {
      return res.status(400).json({
        success: false,
        error: 'branchId required — a cross-branch role must specify ?branchId.',
      });
    }

    const sinceDays = Math.min(parseInt(req.query.days, 10) || 7, 90);
    const data = await documentationBacklog({ branchId, sinceDays });
    return res.json({ success: true, data: { branchId: String(branchId), ...data } });
  })
);

module.exports = router;

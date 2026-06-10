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
const {
  documentationBacklog,
  branchProductivity,
  summarizeOverdueReports,
} = require('../../../services/supervisorOps.service');
const reassessmentLifecycleService = require('../../../services/reassessmentLifecycle.service');

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

// ═══════════════════════════════════════════════════════════════════════════
// GET /supervisor-ops/productivity[?branchId=&days=]
//   Per-therapist productivity across a branch: completed (window + today),
//   therapy minutes delivered, documentation rate. Answers "how many sessions
//   did therapist X complete today? how many minutes did Y deliver this week?"
//   Same W269 branch scoping as the backlog route. (W1173)
// ═══════════════════════════════════════════════════════════════════════════
router.get(
  '/supervisor-ops/productivity',
  asyncHandler(async (req, res) => {
    const scoped = effectiveBranchScope(req);
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
    const data = await branchProductivity({ branchId, sinceDays });
    return res.json({ success: true, data: { branchId: String(branchId), ...data } });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
// GET /supervisor-ops/overdue-reports[?branchId=]
//   Which beneficiaries have an overdue periodic (reassessment) report —
//   phase OVERDUE / ESCALATED / BREACHED. Reuses the W222 reassessment
//   lifecycle (listByPhase) + the pure summarizeOverdueReports shaper. Same
//   W269 branch scoping. (W1174)
// ═══════════════════════════════════════════════════════════════════════════
router.get(
  '/supervisor-ops/overdue-reports',
  asyncHandler(async (req, res) => {
    const scoped = effectiveBranchScope(req);
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

    // listByPhase with no `phase` returns all pending/acknowledged tasks for the
    // branch; the pure shaper keeps only the overdue-spectrum phases.
    const tasks = await reassessmentLifecycleService.listByPhase({ branchId });
    const data = summarizeOverdueReports(tasks);
    return res.json({ success: true, data: { branchId: String(branchId), ...data } });
  })
);

module.exports = router;

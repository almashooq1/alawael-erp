'use strict';

/**
 * Rehabilitation Plan Health routes — per-beneficiary plan-on-track snapshot.
 *
 * Exposes the rehabPlanHealth service as a LIVE, branch-isolated endpoint so a
 * clinician/case-manager can pull "is this beneficiary's rehab plan on track?"
 * on-demand (the underlying W44 progress-reviewer + W50 review-cadence
 * intelligence otherwise only runs on cron). Fuses goal-progress + golden-thread
 * + review-cadence + safety into one grade + priority actions.
 *
 * Mounted by domains/goals/routes/index.routes.js at /api(/v1)/goals.
 * READ-ONLY. Per-beneficiary access is guarded by enforceBeneficiaryBranch
 * (W269 — loads the Beneficiary + throws 403 cross-branch / 404 missing).
 *
 * @module domains/goals/routes/rehab-plan-health.routes
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { enforceBeneficiaryBranch } = require('../../../middleware/assertBranchMatch');
const { assembleBeneficiaryPlanHealth } = require('../../../services/rehabPlanHealth.service');

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// ═══════════════════════════════════════════════════════════════════════════
// GET /rehab-plan-health/:beneficiaryId
//   The per-beneficiary rehab-plan-on-track snapshot: overall grade
//   (ON_TRACK / DISCHARGE_READY / NEEDS_ATTENTION / AT_RISK / NO_PLAN / NO_DATA)
//   + 0-100 composite + priority-ordered actions, fusing goal-progress (W44),
//   golden-thread completeness, review cadence, and safety triggers. READ-ONLY.
//   Branch isolation: enforceBeneficiaryBranch loads the beneficiary and rejects
//   a foreign-branch caller (403) before any plan data is read.
// ═══════════════════════════════════════════════════════════════════════════
router.get(
  '/rehab-plan-health/:beneficiaryId',
  asyncHandler(async (req, res) => {
    const { beneficiaryId } = req.params;
    if (!mongoose.isValidObjectId(beneficiaryId)) {
      return res.status(400).json({ success: false, error: 'invalid beneficiaryId' });
    }
    await enforceBeneficiaryBranch(req, beneficiaryId);
    const data = await assembleBeneficiaryPlanHealth(beneficiaryId);
    return res.json({ success: true, data });
  })
);

module.exports = router;

'use strict';

/**
 * Golden Thread routes — caseload Smart Attention Queue (W1167).
 *
 * Exposes the W1165 caseload triage (`attentionForBeneficiaries`) as a LIVE,
 * branch-scoped HTTP endpoint so the UI can render the clinician morning-triage
 * ("across my branch, who needs attention first?") — previously reachable only
 * via the `audit:golden-thread-attention` CLI.
 *
 * Mounted by domains/goals/routes/index.routes.js at /api(/v1)/goals.
 * Auth is applied by the dualMountAuth registry mount.
 *
 * READ-ONLY — only .find().lean() + the read-only service. No mutation.
 *
 * @module domains/goals/routes/golden-thread.routes
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { effectiveBranchScope } = require('../../../middleware/assertBranchMatch');
const { attentionForBeneficiaries } = require('../../../services/goldenThread.service');

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// ═══════════════════════════════════════════════════════════════════════════
// GET /golden-thread/caseload-attention[?branchId=&limit=]
//   Branch-scoped caseload triage. Restricted callers are pinned to their own
//   branch (effectiveBranchScope ignores ?branchId spoofing — W269). Cross-branch
//   roles must name a branch explicitly (we never scan ALL branches).
// ═══════════════════════════════════════════════════════════════════════════
router.get(
  '/golden-thread/caseload-attention',
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

    const limit = Math.min(parseInt(req.query.limit, 10) || 500, 2000);
    const Beneficiary = mongoose.model('Beneficiary');
    const beneficiaries = await Beneficiary.find({ branchId, isDeleted: { $ne: true } })
      .select('_id')
      .limit(limit)
      .lean();
    const ids = beneficiaries.map(b => b._id);
    const capped = beneficiaries.length >= limit;

    const { rows, summary } = await attentionForBeneficiaries(ids);

    return res.json({
      success: true,
      data: { branchId: String(branchId), scanned: ids.length, capped, summary, rows },
    });
  })
);

module.exports = router;

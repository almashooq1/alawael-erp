'use strict';

/**
 * next-best-action.routes.js — W1206 (Blueprint 43, R6)
 *
 * REST surface over services/nextBestAction.service.js — the unified CDSS
 * "what should I do next?" layer:
 *
 *   GET /catalogue                  — the frozen NBA action catalogue (no PHI)
 *   GET /beneficiary/:beneficiaryId — ranked action list for one beneficiary
 *   GET /caseload[?branchId=&limit=]— branch-scoped triage queue (rows with
 *                                     actions only, sorted most-urgent-first)
 *
 * READ-ONLY — no endpoint mutates. Mounted via features.registry
 * dualMountAuth at /api(/v1)/next-best-action. Branch isolation per W269.
 */

const express = require('express');
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const {
  enforceBeneficiaryBranch,
  effectiveBranchScope,
} = require('../middleware/assertBranchMatch');
const safeError = require('../utils/safeError');
const nbaService = require('../services/nextBestAction.service');
const { NBA_ACTIONS } = require('../intelligence/next-best-action.registry');

const router = express.Router();

const READ_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'therapist',
  'specialist',
  'social_worker',
  'coordinator',
];

router.use(authenticateToken);
router.use(requireBranchAccess);

// ── GET /catalogue — frozen action catalogue (pure registry data) ───────────
router.get('/catalogue', requireRole(READ_ROLES), (_req, res) => {
  res.json({ success: true, data: Object.values(NBA_ACTIONS) });
});

// ── GET /beneficiary/:beneficiaryId — ranked NBA list ───────────────────────
router.get('/beneficiary/:beneficiaryId', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.beneficiaryId))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    // W269 — cross-branch denial on the beneficiary key (throws 403/404)
    await enforceBeneficiaryBranch(req, req.params.beneficiaryId);

    const result = await nbaService.computeForBeneficiary(req.params.beneficiaryId);
    return res.json({ success: true, data: result });
  } catch (err) {
    if (err.statusCode)
      return res
        .status(err.statusCode || err.status)
        .json({ success: false, message: err.message });
    return safeError(res, err, 'next-best-action.beneficiary');
  }
});

// ── GET /caseload — branch triage queue ─────────────────────────────────────
// Restricted callers are pinned to their own branch (effectiveBranchScope
// ignores ?branchId spoofing — W269). Cross-branch roles must name a branch
// explicitly; we never scan ALL branches.
router.get('/caseload', requireRole(READ_ROLES), async (req, res) => {
  try {
    const scoped = effectiveBranchScope(req);
    let branchId = scoped || null;
    if (!branchId && req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      branchId = req.query.branchId;
    }
    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: 'branchId مطلوب — الدور العابر للفروع يجب أن يحدد ?branchId',
      });
    }

    // NBA compute fans out 5 queries per beneficiary — cap tighter than the
    // golden-thread endpoint (W1182 unbounded-limit doctrine).
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 300);
    const Beneficiary = mongoose.model('Beneficiary');
    const beneficiaries = await Beneficiary.find({ branchId, isDeleted: { $ne: true } })
      .select('_id')
      .limit(limit)
      .lean();
    const ids = beneficiaries.map(b => b._id);

    const { rows, summary } = await nbaService.computeForCaseload(ids);
    return res.json({
      success: true,
      data: {
        branchId: String(branchId),
        scanned: ids.length,
        capped: beneficiaries.length >= limit,
        summary,
        rows,
      },
    });
  } catch (err) {
    return safeError(res, err, 'next-best-action.caseload');
  }
});

module.exports = router;

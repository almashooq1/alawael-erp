'use strict';

/**
 * outcomes-rollup.routes.js — W1214 (Blueprint 43, §6.4 + R7)
 *
 * REST surface over services/outcomesRollup.service.js — the outcomes
 * roll-up ladder (هدف → مستفيد → برنامج → فرع → المركز):
 *
 *   GET /beneficiary/:beneficiaryId — tier 1 (goal outcomes for one beneficiary)
 *   GET /branch[?branchId=]         — tiers 2+3 (branch topline + per-domain
 *                                     program breakdown); restricted callers
 *                                     pinned to their own branch (W269)
 *   GET /center                     — tier 4 (one row per branch + executive
 *                                     topline); CROSS-BRANCH ROLES ONLY —
 *                                     a restricted caller gets 403
 *
 * READ-ONLY — no endpoint mutates. Mounted via features.registry
 * dualMountAuth at /api(/v1)/outcomes-rollup.
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
const rollup = require('../services/outcomesRollup.service');

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
  'quality',
];

router.use(authenticateToken);
router.use(requireBranchAccess);

// ── GET /beneficiary/:beneficiaryId — tier 1 ────────────────────────────────
router.get('/beneficiary/:beneficiaryId', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.beneficiaryId))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    // W269 — cross-branch denial on the beneficiary key (throws 403/404)
    await enforceBeneficiaryBranch(req, req.params.beneficiaryId);

    const data = await rollup.rollupForBeneficiary(req.params.beneficiaryId);
    return res.json({ success: true, data });
  } catch (err) {
    if (err.statusCode)
      return res
        .status(err.statusCode || err.status)
        .json({ success: false, message: err.message });
    return safeError(res, err, 'outcomes-rollup.beneficiary');
  }
});

// ── GET /branch — tiers 2+3 (branch + per-program breakdown) ────────────────
// Restricted callers are pinned to their own branch (effectiveBranchScope
// ignores ?branchId spoofing — W269); cross-branch roles must name a branch.
router.get('/branch', requireRole(READ_ROLES), async (req, res) => {
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
    const data = await rollup.rollupForBranch(branchId);
    return res.json({ success: true, data });
  } catch (err) {
    return safeError(res, err, 'outcomes-rollup.branch');
  }
});

// ── GET /center — tier 4 (executive, cross-branch roles ONLY) ───────────────
router.get('/center', requireRole(READ_ROLES), async (req, res) => {
  try {
    // A restricted caller has a concrete branch scope → the center tier is
    // out of bounds (it aggregates EVERY branch).
    if (effectiveBranchScope(req)) {
      return res.status(403).json({
        success: false,
        message: 'مستوى المركز متاح للأدوار العابرة للفروع فقط',
      });
    }
    const data = await rollup.rollupForCenter();
    return res.json({ success: true, data });
  } catch (err) {
    return safeError(res, err, 'outcomes-rollup.center');
  }
});

module.exports = router;

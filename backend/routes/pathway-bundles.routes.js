'use strict';

/**
 * pathway-bundles.routes.js — W1205 (Blueprint 43, R4 + Part V)
 *
 * REST surface over services/pathwayBundle.service.js — the per-disability-type
 * therapeutic-fingerprint bundles:
 *
 *   GET  /                          — registry catalogue (pure data, no PHI)
 *   GET  /suggest/:beneficiaryId    — READ-ONLY resolved suggestion for one
 *                                     beneficiary (live measures + goal bank +
 *                                     existing-pathway idempotency hint)
 *   POST /apply/:beneficiaryId      — materialize the clinician's EXPLICIT
 *                                     selection (pathway plan + draft goals
 *                                     pre-wired with PRIMARY measure links)
 *
 * Mounted via features.registry dualMountAuth at /api(/v1)/pathway-bundles.
 * Branch isolation per W269: beneficiary ownership asserted on both
 * beneficiary-keyed endpoints; apply pins branchId server-side (no spoofing).
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
const pathwayBundleService = require('../services/pathwayBundle.service');

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
const WRITE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'therapist',
  'specialist',
];

router.use(authenticateToken);
router.use(requireBranchAccess);

// ── GET / — registry catalogue (pure registry data, no beneficiary PHI) ─────
router.get('/', requireRole(READ_ROLES), (_req, res) => {
  const bundles = pathwayBundleService.listBundles().map(b => ({
    key: b.key,
    titleAr: b.titleAr,
    titleEn: b.titleEn,
    pathwayType: b.pathwayType,
    guidanceAssessments: b.guidanceAssessments,
    interventionsAr: b.interventionsAr,
    stageCount: b.defaultStages.length,
  }));
  res.json({ success: true, data: bundles });
});

// ── GET /suggest/:beneficiaryId — resolved suggestion (READ-ONLY) ───────────
router.get('/suggest/:beneficiaryId', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.beneficiaryId))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    // W269 — cross-branch denial on the beneficiary key (throws 403/404)
    await enforceBeneficiaryBranch(req, req.params.beneficiaryId);

    const suggestion = await pathwayBundleService.suggestForBeneficiary(req.params.beneficiaryId);
    return res.json({ success: true, data: suggestion });
  } catch (err) {
    if (err.statusCode || err.status)
      return res
        .status(err.statusCode || err.status)
        .json({ success: false, message: err.message });
    return safeError(res, err, 'pathway-bundles.suggest');
  }
});

// ── POST /apply/:beneficiaryId — materialize explicit selection ─────────────
router.post('/apply/:beneficiaryId', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.beneficiaryId))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    // W269 — cross-branch denial on the beneficiary key (throws 403/404)
    await enforceBeneficiaryBranch(req, req.params.beneficiaryId);

    // Pin fields explicitly — never spread req.body (mass-assignment doctrine).
    const selections = {
      createPathway: req.body && req.body.createPathway !== false,
      goalTemplateIds:
        req.body && Array.isArray(req.body.goalTemplateIds) ? req.body.goalTemplateIds : [],
      primaryMeasureId: (req.body && req.body.primaryMeasureId) || null,
      episodeId: (req.body && req.body.episodeId) || null,
      startDate: (req.body && req.body.startDate) || null,
    };

    const result = await pathwayBundleService.applyForBeneficiary({
      beneficiaryId: req.params.beneficiaryId,
      // Restricted callers are pinned to their own branch; cross-branch roles
      // fall back to the beneficiary's branch inside the service.
      branchId: effectiveBranchScope(req) || null,
      actorId: (req.user && (req.user.id || req.user._id)) || null,
      selections,
    });

    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    if (err.statusCode || err.status)
      return res
        .status(err.statusCode || err.status)
        .json({ success: false, message: err.message });
    return safeError(res, err, 'pathway-bundles.apply');
  }
});

module.exports = router;

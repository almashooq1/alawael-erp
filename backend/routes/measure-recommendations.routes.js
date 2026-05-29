'use strict';

/**
 * measure-recommendations.routes.js — Wave 562.
 *
 * REST surface for the W561 smart measure-recommendation engine. Given a
 * beneficiary, returns a ranked + bilingual-reasoned list of standardized
 * instruments to administer next (eligibility × coverage gap × reassessment
 * cadence), flagging which can be administered digitally in-app today.
 *
 * Mounted via dualMountAuth at /api/(v1/)?measure-recommendations.
 *
 * Endpoints:
 *   GET /:beneficiaryId        — ranked recommendations for one beneficiary
 *                                ?discipline= ?category= ?administrableOnly=1
 *                                ?includeCurrent=1 ?limit=N
 *
 * Cross-tenant isolation: enforceBeneficiaryBranch(req, :beneficiaryId)
 * verifies the caller owns the beneficiary (W269 doctrine) before any data
 * leaves the service.
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const { authenticateToken, requireRole } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const { enforceBeneficiaryBranch } = require('../middleware/assertBranchMatch');

const { measureRecommendationService } = require('../services/measureRecommendation.service');

router.use(authenticateToken);
router.use(requireBranchAccess);

const READ_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'therapist',
  'psychologist',
  'special_educator',
  'speech_language_pathologist',
  'occupational_therapist',
  'physical_therapist',
  'nurse',
  'case_manager',
  'social_worker',
  'quality',
];

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// ── GET /:beneficiaryId ──────────────────────────────────────────────────
router.get(
  '/:beneficiaryId',
  requireRole(READ_ROLES),
  asyncHandler(async (req, res) => {
    const { beneficiaryId } = req.params;
    if (!mongoose.isValidObjectId(beneficiaryId)) {
      return res.status(400).json({ success: false, message: 'beneficiaryId غير صالح' });
    }
    await enforceBeneficiaryBranch(req, beneficiaryId);

    const limitRaw = parseInt(req.query.limit, 10);
    try {
      const result = await measureRecommendationService.recommendForBeneficiary(beneficiaryId, {
        discipline: req.query.discipline || undefined,
        category: req.query.category || undefined,
        administrableOnly:
          req.query.administrableOnly === '1' || req.query.administrableOnly === 'true',
        includeCurrent: req.query.includeCurrent === '1' || req.query.includeCurrent === 'true',
        limit: Number.isInteger(limitRaw) && limitRaw > 0 ? limitRaw : undefined,
      });
      res.json({ success: true, data: result });
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ success: false, message: err.message });
      }
      throw err;
    }
  })
);

module.exports = router;

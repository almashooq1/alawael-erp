/**
 * emr.routes.js — مسارات السجل الطبي الإلكتروني (EMR Routes)
 * ══════════════════════════════════════════════════════════════════
 * Mounted at: /api/v1/emr
 */

'use strict';

const express = require('express');
const router = express.Router();
const emrService = require('../services/emr.service');
const { authenticate } = require('../middleware/auth');
const { body, param, validationResult } = require('express-validator');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const {
  branchScopedBeneficiaryParam,
  bodyScopedBeneficiaryGuard,
} = require('../middleware/assertBranchMatch');

// W269 cross-branch isolation: authenticate + scope, then branch-check every
// `:beneficiaryId` path lookup AND every body `beneficiary` on writes.
// W1549: the param guard only covers GET /:beneficiaryId reads — the 7 EMR POST
// endpoints (vital-signs, prescriptions, MAR, lab-results, allergies,
// immunizations, referrals) take the beneficiary from req.body, which the param
// guard never inspects, so a restricted staffer could write clinical PHI onto a
// foreign-branch beneficiary. bodyScopedBeneficiaryGuard closes that write path
// (it reads body.beneficiaryId|beneficiary_id|beneficiary, fail-opens for
// cross-branch roles, and 403s a restricted caller naming a foreign beneficiary).
router.use(authenticate);
router.use(requireBranchAccess);
router.use(bodyScopedBeneficiaryGuard);
router.param('beneficiaryId', branchScopedBeneficiaryParam);

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
}

function wrap(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

// ─── Prescriptions ───────────────────────────────────────────────────────────
router.post(
  '/prescriptions',
  authenticate,
  [
    body('beneficiary').notEmpty().withMessage('beneficiary required'),
    body('prescribedBy').notEmpty().withMessage('prescribedBy required'),
    body('medications').isArray({ min: 1 }).withMessage('medications array required'),
  ],
  handleValidation,
  wrap(async (req, res) => {
    const prescription = await emrService.createPrescription(req.body);
    res.status(201).json({ success: true, data: prescription });
  })
);

router.get(
  '/prescriptions/:beneficiaryId',
  authenticate,
  [param('beneficiaryId').notEmpty()],
  handleValidation,
  wrap(async (req, res) => {
    const list = await emrService.getPrescriptions(req.params.beneficiaryId);
    res.json({ success: true, data: list });
  })
);

// ─── Vital Signs ───────────────────────────────────────────────────────────
router.post(
  '/vital-signs',
  authenticate,
  [body('beneficiary').notEmpty().withMessage('beneficiary required')],
  handleValidation,
  wrap(async (req, res) => {
    const vital = await emrService.recordVitalSigns(req.body);
    res.status(201).json({ success: true, data: vital });
  })
);

router.get(
  '/vital-signs/:beneficiaryId',
  authenticate,
  [param('beneficiaryId').notEmpty()],
  handleValidation,
  wrap(async (req, res) => {
    const { type, days } = req.query;
    const list = await emrService.getVitalSignsHistory(
      req.params.beneficiaryId,
      type,
      days ? parseInt(days, 10) : 30
    );
    res.json({ success: true, data: list });
  })
);

// ─── Medication Administration ───────────────────────────────────────────
router.post(
  '/medication-administration',
  authenticate,
  [body('beneficiary').notEmpty(), body('medicationName').notEmpty(), body('dosage').notEmpty()],
  handleValidation,
  wrap(async (req, res) => {
    const mar = await emrService.administerMedication(req.body);
    res.status(201).json({ success: true, data: mar });
  })
);

router.get(
  '/medication-schedule/:beneficiaryId',
  authenticate,
  [param('beneficiaryId').notEmpty()],
  handleValidation,
  wrap(async (req, res) => {
    const schedule = await emrService.getMedicationSchedule(req.params.beneficiaryId);
    res.json({ success: true, data: schedule });
  })
);

// ─── Lab Results ───────────────────────────────────────────────────────────
router.post(
  '/lab-results',
  authenticate,
  [body('beneficiary').notEmpty(), body('orderedDate').notEmpty(), body('category').notEmpty()],
  handleValidation,
  wrap(async (req, res) => {
    const lab = await emrService.addLabResult(req.body);
    res.status(201).json({ success: true, data: lab });
  })
);

router.get(
  '/lab-results/:beneficiaryId',
  authenticate,
  [param('beneficiaryId').notEmpty()],
  handleValidation,
  wrap(async (req, res) => {
    const list = await emrService.getLabResults(req.params.beneficiaryId);
    res.json({ success: true, data: list });
  })
);

// ─── Allergies ───────────────────────────────────────────────────────────
router.post(
  '/allergies',
  authenticate,
  [body('beneficiaryId').notEmpty(), body('allergen').isObject(), body('reaction').isObject()],
  handleValidation,
  wrap(async (req, res) => {
    const { beneficiaryId, ...allergyData } = req.body;
    const allergy = await emrService.addAllergy(beneficiaryId, allergyData);
    res.status(201).json({ success: true, data: allergy });
  })
);

router.get(
  '/allergies/:beneficiaryId',
  authenticate,
  [param('beneficiaryId').notEmpty()],
  handleValidation,
  wrap(async (req, res) => {
    const list = await emrService.checkAllergyAlerts(
      req.params.beneficiaryId,
      req.query.medication
    );
    res.json({ success: true, data: list });
  })
);

// ─── Immunizations ───────────────────────────────────────────────────────────
router.post(
  '/immunizations',
  authenticate,
  [body('beneficiary').notEmpty(), body('dateAdministered').notEmpty()],
  handleValidation,
  wrap(async (req, res) => {
    const imm = await emrService.addImmunization(req.body);
    res.status(201).json({ success: true, data: imm });
  })
);

router.get(
  '/immunizations/:beneficiaryId',
  authenticate,
  [param('beneficiaryId').notEmpty()],
  handleValidation,
  wrap(async (req, res) => {
    const list = await emrService.getImmunizationSchedule(req.params.beneficiaryId);
    res.json({ success: true, data: list });
  })
);

// ─── Referrals ───────────────────────────────────────────────────────────
router.post(
  '/referrals',
  authenticate,
  [body('beneficiary').notEmpty(), body('referredBy').notEmpty(), body('reason').isObject()],
  handleValidation,
  wrap(async (req, res) => {
    const ref = await emrService.createReferral(req.body);
    res.status(201).json({ success: true, data: ref });
  })
);

router.get(
  '/referrals/:beneficiaryId',
  authenticate,
  [param('beneficiaryId').notEmpty()],
  handleValidation,
  wrap(async (req, res) => {
    const list = await emrService.getReferralsByBeneficiary(req.params.beneficiaryId);
    res.json({ success: true, data: list });
  })
);

module.exports = router;

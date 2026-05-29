'use strict';

/**
 * digital-assessment.routes.js — Wave 557.
 *
 * REST surface for the digital standardized-assessment administration
 * engine (W553–W556). Lets a clinician render a bilingual standardized
 * instrument item-by-item, auto-score it via the W212 registry, and
 * persist it as a MeasureApplication so it flows into outcome rollups,
 * goal auto-update (W216), reassessment auto-close (W214), trend
 * detection, and the family/clinical reports.
 *
 * Mounted via dualMountAuth at /api/(v1/)?digital-assessment.
 *
 * Endpoints:
 *   GET  /administrable                 — instruments that ship a digital item bank
 *   GET  /item-bank/:code               — the bilingual questionnaire for one instrument
 *   POST /preview                       — score raw items WITHOUT persisting (live preview)
 *   POST /administer                    — score + persist a MeasureApplication
 *   GET  /history/:beneficiaryId/:code  — administration history for a beneficiary + measure
 *
 * Cross-tenant isolation: bodyScopedBeneficiaryGuard (W441) auto-rejects
 * a foreign req.body.beneficiaryId; /history additionally calls
 * enforceBeneficiaryBranch on the path id. /administrable + /item-bank are
 * catalog reads (no beneficiary, no branch data).
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const { authenticateToken, requireRole } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const {
  bodyScopedBeneficiaryGuard,
  enforceBeneficiaryBranch,
} = require('../middleware/assertBranchMatch');
const safeError = require('../utils/safeError');

const engine = require('../services/measureScoringEngine.service');
const { digitalAssessmentService } = require('../services/digitalAssessment.service');
const { assessmentInsightService } = require('../services/assessmentInsight.service');

router.use(authenticateToken);
router.use(requireBranchAccess);
router.use(bodyScopedBeneficiaryGuard);

// Clinical raters who may view / administer standardized instruments.
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
const WRITE_ROLES = [
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
];

const VALID_PURPOSES = ['baseline', 'progress', 'discharge', 'screening', 'periodic', 'research'];

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function getUserId(req) {
  return req.user?._id || req.user?.id || null;
}

// ── GET /administrable ───────────────────────────────────────────────────
router.get(
  '/administrable',
  requireRole(READ_ROLES),
  asyncHandler(async (req, res) => {
    const list = engine.listAdministrable();
    res.json({ success: true, data: list, total: list.length });
  })
);

// ── GET /item-bank/:code ─────────────────────────────────────────────────
router.get(
  '/item-bank/:code',
  requireRole(READ_ROLES),
  asyncHandler(async (req, res) => {
    const bank = engine.getItemBank(req.params.code);
    if (!bank) {
      return res
        .status(404)
        .json({ success: false, message: `لا يوجد بنك بنود رقمي للمقياس '${req.params.code}'` });
    }
    res.json({ success: true, data: bank });
  })
);

// ── POST /preview ────────────────────────────────────────────────────────
// Score raw items without persisting — used by the live form preview.
router.post(
  '/preview',
  requireRole(WRITE_ROLES),
  asyncHandler(async (req, res) => {
    const { measureCode, rawItems, prevDerived } = req.body;
    if (!measureCode || !Array.isArray(rawItems)) {
      return res
        .status(400)
        .json({ success: false, message: 'measureCode و rawItems (مصفوفة) مطلوبان' });
    }
    try {
      const scored = await digitalAssessmentService.preview({ measureCode, rawItems, prevDerived });
      res.json({ success: true, data: scored });
    } catch (err) {
      if (err.code === 'INVALID_RAW') {
        return res.status(400).json({ success: false, message: err.message, errors: err.errors });
      }
      throw err;
    }
  })
);

// ── POST /administer ─────────────────────────────────────────────────────
router.post(
  '/administer',
  requireRole(WRITE_ROLES),
  asyncHandler(async (req, res) => {
    const {
      beneficiaryId,
      measureCode,
      rawItems,
      episodeId,
      purpose,
      setting,
      notes,
      clinicalObservations,
    } = req.body;

    if (!beneficiaryId || !mongoose.isValidObjectId(beneficiaryId)) {
      return res.status(400).json({ success: false, message: 'beneficiaryId صالح مطلوب' });
    }
    if (!measureCode || !Array.isArray(rawItems)) {
      return res
        .status(400)
        .json({ success: false, message: 'measureCode و rawItems (مصفوفة) مطلوبان' });
    }
    if (purpose && !VALID_PURPOSES.includes(purpose)) {
      return res
        .status(400)
        .json({
          success: false,
          message: `purpose غير صالح — المسموح: ${VALID_PURPOSES.join(', ')}`,
        });
    }

    // Defense-in-depth (bodyScopedBeneficiaryGuard already enforced this).
    await enforceBeneficiaryBranch(req, beneficiaryId);

    try {
      const result = await digitalAssessmentService.administer({
        beneficiaryId,
        measureCode,
        rawItems,
        episodeId: episodeId && mongoose.isValidObjectId(episodeId) ? episodeId : undefined,
        purpose,
        setting,
        notes,
        clinicalObservations,
        assessorId: getUserId(req),
        branchId: req.user?.branchId || undefined,
        organizationId: req.user?.organizationId || undefined,
      });
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      if (err.code === 'INVALID_RAW') {
        return res.status(400).json({ success: false, message: err.message, errors: err.errors });
      }
      if (err.statusCode) {
        return res.status(err.statusCode).json({ success: false, message: err.message });
      }
      throw err;
    }
  })
);

// ── GET /history/:beneficiaryId/:code ────────────────────────────────────
router.get(
  '/history/:beneficiaryId/:code',
  requireRole(READ_ROLES),
  asyncHandler(async (req, res) => {
    const { beneficiaryId, code } = req.params;
    if (!mongoose.isValidObjectId(beneficiaryId)) {
      return res.status(400).json({ success: false, message: 'beneficiaryId غير صالح' });
    }
    await enforceBeneficiaryBranch(req, beneficiaryId);

    const Measure = mongoose.model('Measure');
    const MeasureApplication = mongoose.model('MeasureApplication');
    const measure = await Measure.findOne({ code })
      .select('_id code name name_ar scoringDirection scoringRules maxScore minScore')
      .lean();
    if (!measure) {
      return res.status(404).json({ success: false, message: `المقياس '${code}' غير موجود` });
    }
    const history = await MeasureApplication.getMeasureHistory(beneficiaryId, measure._id);
    const chartData = history.map(h => ({
      date: h.applicationDate,
      score: h.totalRawScore,
      severity: h.overallSeverity,
      purpose: h.purpose,
      applicationNumber: h.applicationNumber,
    }));
    res.json({
      success: true,
      data: {
        measure,
        applications: history,
        chartData,
        total: history.length,
        baseline: history.find(h => h.purpose === 'baseline') || history[0] || null,
        latest: history[history.length - 1] || null,
      },
    });
  })
);

// ── GET /report/:applicationId ───────────────────────────────────────────
// Single-administration result sheet. ?audience=family|clinical (default clinical).
router.get(
  '/report/:applicationId',
  requireRole(READ_ROLES),
  asyncHandler(async (req, res) => {
    const { applicationId } = req.params;
    if (!mongoose.isValidObjectId(applicationId)) {
      return res.status(400).json({ success: false, message: 'applicationId غير صالح' });
    }
    const audience = req.query.audience === 'family' ? 'family' : 'clinical';
    try {
      const MeasureApplication = mongoose.model('MeasureApplication');
      const owner = await MeasureApplication.findById(applicationId).select('beneficiaryId').lean();
      if (!owner) {
        return res.status(404).json({ success: false, message: 'التطبيق غير موجود' });
      }
      await enforceBeneficiaryBranch(req, owner.beneficiaryId);
      const report = await digitalAssessmentService.buildReport(applicationId, { audience });
      res.json({ success: true, data: report });
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ success: false, message: err.message });
      }
      throw err;
    }
  })
);

// ── GET /insight/:applicationId ──────────────────────────────────────────
// W564 — bilingual clinical narrative + SMART goal drafts for a persisted
// administration. The goal drafts are SUGGESTIONS the clinician reviews +
// edits — they are NOT auto-created (clinician authority / anti-substitution).
router.get(
  '/insight/:applicationId',
  requireRole(READ_ROLES),
  asyncHandler(async (req, res) => {
    const { applicationId } = req.params;
    if (!mongoose.isValidObjectId(applicationId)) {
      return res.status(400).json({ success: false, message: 'applicationId غير صالح' });
    }
    try {
      const MeasureApplication = mongoose.model('MeasureApplication');
      const owner = await MeasureApplication.findById(applicationId).select('beneficiaryId').lean();
      if (!owner) {
        return res.status(404).json({ success: false, message: 'التطبيق غير موجود' });
      }
      await enforceBeneficiaryBranch(req, owner.beneficiaryId);
      const insight = await assessmentInsightService.insightForApplication(applicationId);
      res.json({ success: true, data: insight });
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ success: false, message: err.message });
      }
      throw err;
    }
  })
);

void safeError;
module.exports = router;

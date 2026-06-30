'use strict';

/**
 * iq-assessments.routes.js — W714
 *
 * REST endpoints for IQ assessment (SB5 + Wechsler) score-entry and reporting.
 * Requires MFA tier 1 for read, tier 2 for write.
 *
 * Endpoints:
 *   POST   /api/(v1/)?iq-assessments               create new assessment
 *   GET    /api/(v1/)?iq-assessments/:id           fetch by id
 *   GET    /api/(v1/)?iq-assessments/by-beneficiary/:id   list by beneficiary
 *   GET    /api/(v1/)?iq-assessments/:id/report    fetch/generate report
 */

const express = require('express');
const { Types } = require('mongoose');
// W699 unblock fix: requireMfaTier lives in middleware/requireMfaTier, NOT
// branchScope.middleware (which only exports branchFilter/requireBranchAccess) —
// the wrong import made requireMfaTier undefined → "not a function" at load,
// breaking check:routes-load for the whole shared tree.
const { branchFilter, requireBranchAccess } = require('../middleware/branchScope.middleware');
const { requireMfaTier } = require('../middleware/requireMfaTier');
const {
  assertBranchMatch,
  enforceBeneficiaryBranch,
  effectiveBranchScope,
} = require('../middleware/assertBranchMatch');
const IQAssessment = require('../models/IQAssessment');
const registry = require('../measures/scoring');
const { generateAssessmentReport } = require('../services/iqReportService');

const router = express.Router();

// W832: this router relies on assertBranchMatch / branchFilter /
// enforceBeneficiaryBranch for cross-tenant isolation, but those are ALL
// no-ops unless `req.branchScope` is populated. The router was mounted
// directly in app.js WITHOUT requireBranchAccess and there is no global
// requireBranchAccess, so every branch check here was silently dead —
// a restricted examiner in branch A could read any branch's IQ scores
// (clinical PII) by guessing an ObjectId. Mounting it here activates the
// existing (intended) checks. requireBranchAccess 401s without req.user,
// matching the requireMfaTier guard already present on each route.
router.use(requireBranchAccess);

// ── POST /api/(v1/)?iq-assessments — Create assessment ──
// Examiner enters standard scores; system auto-classifies
router.post('/', requireMfaTier(2), async (req, res) => {
  try {
    const {
      beneficiaryId,
      episodeId,
      instrumentType,
      edition,
      examinerName,
      assessmentDate,
      fullScaleIQ,
      indices,
      clinicalInterpretation,
      recommendations,
    } = req.body;

    // Validate inputs
    if (!beneficiaryId || !Types.ObjectId.isValid(beneficiaryId)) {
      return res.status(400).json({ error: 'beneficiaryId required and must be valid ObjectId' });
    }
    if (!episodeId || !Types.ObjectId.isValid(episodeId)) {
      return res.status(400).json({ error: 'episodeId required and must be valid ObjectId' });
    }
    if (!['SB5', 'WECHSLER'].includes(instrumentType)) {
      return res.status(400).json({ error: 'instrumentType must be SB5 or WECHSLER' });
    }
    if (!examinerName) return res.status(400).json({ error: 'examinerName required' });
    if (!fullScaleIQ || fullScaleIQ < 40 || fullScaleIQ > 160) {
      return res.status(400).json({ error: 'fullScaleIQ must be 40–160' });
    }

    // Verify beneficiary + branch
    await enforceBeneficiaryBranch(req, beneficiaryId);

    // Get scoring module
    const mod = registry.resolve(instrumentType);
    if (!mod) return res.status(400).json({ error: `unknown instrument: ${instrumentType}` });

    // Validate & compute
    const v = mod.validateRaw({ fsiq: fullScaleIQ, edition, indices });
    if (!v.ok) return res.status(400).json({ errors: v.errors });

    const derived = mod.computeDerived({ fsiq: fullScaleIQ, edition, indices });
    const interp = mod.interpret(derived.value);

    // Create assessment
    const assessment = new IQAssessment({
      beneficiaryId,
      episodeId,
      // `req.effectiveBranchId` is set by NO middleware (always undefined) and
      // `req.user.branchId` is never populated either — so this used to persist
      // branchId:undefined, breaking branch isolation on the assessment. Use the
      // canonical helper (restricted users → own branch, anti-spoof).
      branchId: effectiveBranchScope(req),
      instrumentType,
      edition: edition || 'N/A',
      examinerName,
      examinerId: req.user?.id,
      assessmentDate: assessmentDate ? new Date(assessmentDate) : new Date(),
      fullScaleIQ,
      indices: new Map(Object.entries(indices || {})),
      classificationBand: interp.band,
      severityTier: interp.tier,
      label_ar: interp.label_ar,
      label_en: interp.label_en,
      severity: interp.severity,
      clinicalInterpretation: clinicalInterpretation || { ar: '', en: '' },
      recommendations: recommendations || { ar: '', en: '' },
      createdBy: req.user?.id,
      updatedBy: req.user?.id,
    });

    await assessment.save();
    res.status(201).json({
      ok: true,
      assessment: assessment.toObject(),
      derived: { value: derived.value, subscales: derived.subscales },
      interpretation: interp,
    });
  } catch (err) {
    console.error('POST /iq-assessments error:', err.message);
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── GET /api/(v1/)?iq-assessments/:id — Fetch assessment ──
router.get('/:id', requireMfaTier(1), async (req, res) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'invalid id' });
    }

    const assessment = await IQAssessment.findById(req.params.id)
      .populate('beneficiaryId', 'name_ar name_en')
      .populate('episodeId', 'phase_nr')
      .lean();

    if (!assessment) return res.status(404).json({ error: 'not found' });

    // Verify branch access
    assertBranchMatch(req, assessment.branchId, 'IQ assessment');

    res.json(assessment);
  } catch (err) {
    console.error('GET /iq-assessments/:id error:', err.message);
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── GET /api/(v1/)?iq-assessments/by-beneficiary/:beneficiaryId — List by beneficiary ──
router.get('/by-beneficiary/:beneficiaryId', requireMfaTier(1), async (req, res) => {
  try {
    if (!Types.ObjectId.isValid(req.params.beneficiaryId)) {
      return res.status(400).json({ error: 'invalid beneficiaryId' });
    }

    // Verify branch access to the beneficiary
    await enforceBeneficiaryBranch(req, req.params.beneficiaryId);

    const assessments = await IQAssessment.find({
      beneficiaryId: req.params.beneficiaryId,
      ...branchFilter(req),
    })
      .sort({ assessmentDate: -1 })
      .select('-clinicalInterpretation -recommendations')
      .lean();

    res.json({ count: assessments.length, assessments });
  } catch (err) {
    console.error('GET /by-beneficiary error:', err.message);
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── GET /api/(v1/)?iq-assessments/:id/report — Generate report ──
router.get('/:id/report', requireMfaTier(1), async (req, res) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'invalid id' });
    }

    const assessment = await IQAssessment.findById(req.params.id);
    if (!assessment) return res.status(404).json({ error: 'not found' });

    assertBranchMatch(req, assessment.branchId, 'IQ report');

    const report = await generateAssessmentReport(assessment);
    res.json(report);
  } catch (err) {
    console.error('GET /report error:', err.message);
    res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;

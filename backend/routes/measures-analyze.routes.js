'use strict';

/**
 * measures-analyze.routes.js — Wave 697.
 *
 * Read-only / stateless REST surface for the W696 unified measure-intelligence
 * facade (measures/intelligence/analyze.js). Given a measure code + a raw
 * administration (plus optional prior/baseline/normative context), it fuses the
 * five pure layers — scoring → governance → psychometrics → trend →
 * explainability — into one decision-grade, bilingual result.
 *
 * Mounted via dualMountAuth at /api/(v1/)?measures.
 *
 * Endpoints:
 *   GET  /:code/capabilities   — can this instrument be digitized / scored
 *                                in-app today? (governance + engine presence)
 *   POST /:code/analyze        — fuse a supplied raw administration into a
 *                                unified analysis. Body:
 *                                  { raw, previous?, baselineValue?, norm?,
 *                                    psychometric?, intent?, trajectory?,
 *                                    digitizationPermissionRef? }
 *
 * NOTE: This surface performs NO database writes. It reads the Measure catalog
 * doc by code and analyzes scores the caller supplies, so there is no
 * beneficiary-owned record to scope — branch access is enforced at the role
 * layer only (requireBranchAccess + requireRole). It never persists PHI.
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const { authenticateToken, requireRole } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');

const { analyze } = require('../measures/intelligence/analyze');
const scoringRegistry = require('../measures/scoring');
const { evaluateDigitization } = require('../measures/governance/licensing.registry');

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

/** Resolve a Measure catalog doc by code (lean). */
async function loadMeasure(code) {
  let Measure;
  try {
    Measure = mongoose.model('Measure');
  } catch {
    return null; // model not registered in this process
  }
  return Measure.findOne({ code }).lean();
}

// ── GET /:code/capabilities ──────────────────────────────────────────────
// What can the platform do with this instrument right now?
router.get(
  '/:code/capabilities',
  requireRole(READ_ROLES),
  asyncHandler(async (req, res) => {
    const code = String(req.params.code || '').trim();
    if (!code) {
      return res.status(400).json({ success: false, message: 'code مطلوب' });
    }
    const measure = await loadMeasure(code);
    if (!measure) {
      return res.status(404).json({ success: false, message: `المقياس ${code} غير موجود` });
    }
    const digitization = evaluateDigitization(code, {});
    const engine = scoringRegistry.resolve(code);
    res.json({
      success: true,
      data: {
        code,
        name: measure.name,
        name_ar: measure.name_ar,
        purpose: measure.purpose || measure.category || null,
        digitization, // { allowed, reason, licenseType, ... }
        scorable: Boolean(engine),
        engineVersion: engine ? engine.engineVersion : null,
        direction: engine ? engine.direction : measure.scoringDirection || null,
      },
    });
  })
);

// ── POST /:code/analyze ──────────────────────────────────────────────────
router.post(
  '/:code/analyze',
  requireRole(READ_ROLES),
  asyncHandler(async (req, res) => {
    const code = String(req.params.code || '').trim();
    if (!code) {
      return res.status(400).json({ success: false, message: 'code مطلوب' });
    }
    const body = req.body || {};
    if (body.raw === undefined || body.raw === null) {
      return res.status(400).json({ success: false, message: 'raw مطلوب لإجراء التحليل' });
    }

    const measure = await loadMeasure(code);
    if (!measure) {
      return res.status(404).json({ success: false, message: `المقياس ${code} غير موجود` });
    }

    try {
      const result = analyze({
        measure,
        raw: body.raw,
        previous: body.previous,
        baselineValue: typeof body.baselineValue === 'number' ? body.baselineValue : undefined,
        norm: body.norm && typeof body.norm === 'object' ? body.norm : undefined,
        psychometric:
          body.psychometric && typeof body.psychometric === 'object'
            ? body.psychometric
            : undefined,
        intent: typeof body.intent === 'string' ? body.intent : undefined,
        trajectory: typeof body.trajectory === 'string' ? body.trajectory : undefined,
        digitization: body.digitizationPermissionRef
          ? { permissionRef: body.digitizationPermissionRef }
          : undefined,
      });
      res.json({ success: true, data: result });
    } catch (err) {
      // analyze throws on contract violations (e.g. invalid raw shape for the
      // engine) — surface as a 400 rather than a 500.
      return res.status(400).json({ success: false, message: err.message });
    }
  })
);

module.exports = router;

'use strict';

/**
 * measureAdministration.service.js — Wave 211
 *
 * Orchestration layer above MeasureApplication that enforces the
 * governance contracts the W210 Measure model declares:
 *
 *   • administer(input) — full create flow:
 *       1. Resolve the active Measure by id or code.
 *       2. Verify eligibility (ICD-10 / prerequisites / certification)
 *          via Measure.isEligibleFor() and persist the snapshot.
 *       3. Cooldown check — refuse if within minIntervalDays UNLESS
 *          caller supplies cooldownJustification (audit trail).
 *       4. Pin scoredWithMeasureVersion + scoredWithAlgorithmVersion.
 *       5. Freeze mcidAtAdministration + sdcAtAdministration.
 *       6. Persist the application record.
 *
 *   • lockBaseline(applicationId, actorId) — finalize a baseline.
 *     Once locked, the record is immutable.
 *
 *   • correct(originalId, corrections, reason, actorId) — write a
 *     correction record pointing back to the original; the original
 *     transitions to status='corrected' with supersededByCorrection
 *     pointing forward. Both records remain immutable.
 *
 *   • getHistory(beneficiaryId, measureId) — chronological, excludes
 *     corrected-superseded records by default.
 *
 *   • getBaseline(beneficiaryId, measureId) — single locked baseline.
 *
 *   • getDueForReassessment(beneficiaryId) — based on the active
 *     measure's reassessment.standardIntervalDays cadence.
 *
 *   • checkCooldown(beneficiaryId, measureId) — public helper for
 *     the UI to decide whether to surface a justification prompt.
 *
 * Pure orchestration — scoring logic stays in
 * domains/goals/services/ScoringEngine.
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

const M = {
  Measure: () => {
    try {
      return mongoose.model('Measure');
    } catch {
      try {
        require('../domains/goals/models/Measure');
        return mongoose.model('Measure');
      } catch {
        return null;
      }
    }
  },
  MeasureApplication: () => {
    try {
      return mongoose.model('MeasureApplication');
    } catch {
      try {
        require('../domains/goals/models/MeasureApplication');
        return mongoose.model('MeasureApplication');
      } catch {
        return null;
      }
    }
  },
};

// ─── Helpers ────────────────────────────────────────────────────────────

function _ageMonths(beneficiary) {
  if (!beneficiary) return null;
  if (typeof beneficiary.ageMonths === 'number') return beneficiary.ageMonths;
  if (typeof beneficiary.ageInMonths === 'number') return beneficiary.ageInMonths;
  const dob = beneficiary.dateOfBirth || beneficiary.personalInfo?.dateOfBirth || beneficiary.dob;
  if (!dob) return null;
  return Math.floor((Date.now() - new Date(dob)) / (1000 * 60 * 60 * 24 * 30.44));
}

function _icd10Codes(beneficiary) {
  const raw =
    beneficiary?.icd10 || beneficiary?.diagnosis_codes || beneficiary?.diagnosisCodes || [];
  return Array.isArray(raw) ? raw : [raw];
}

async function _resolveMeasure(measureRef) {
  const Measure = M.Measure();
  if (!Measure) throw new Error('Measure model unavailable');
  if (mongoose.Types.ObjectId.isValid(measureRef)) {
    return Measure.findById(measureRef);
  }
  return Measure.findOne({ code: measureRef });
}

function _eligibilitySnapshot(measure, beneficiary, ctx) {
  const ageMonthsAtAdmin = _ageMonths(beneficiary);
  const benIcd = _icd10Codes(beneficiary);
  const req = measure.eligibility?.icd10Required || [];
  const matched = req.filter(pat =>
    benIcd.some(c => {
      if (!c) return false;
      if (pat.endsWith('.*')) return c.toUpperCase().startsWith(pat.slice(0, -2).toUpperCase());
      return c.toUpperCase() === pat.toUpperCase();
    })
  );
  const certNeeded = measure.eligibility?.certificationRequired;
  const raterCerts = ctx.raterCertifications || [];
  return {
    ageMonthsAtAdmin,
    icd10Matched: matched,
    prerequisitesMet: ctx.administeredMeasureCodes || [],
    raterCertifications: raterCerts,
    raterCertCheckPassed: !certNeeded || raterCerts.includes(certNeeded),
    checkedAt: new Date(),
  };
}

function _freezeMcid(measure) {
  const mcid = measure.interpretation?.mcid;
  if (!mcid) return null;
  return {
    value: mcid.value,
    type: mcid.type,
    status: mcid.status,
    source: mcid.source,
  };
}

function _freezeSdc(measure) {
  const sdc = measure.interpretation?.sdc;
  if (!sdc) return null;
  return { value: sdc.value, ci: sdc.ci };
}

// ─── Service ────────────────────────────────────────────────────────────

class MeasureAdministrationSvc {
  /**
   * Administer a measure. Composes eligibility + cooldown + version
   * pinning + persistence. Returns the saved MeasureApplication.
   *
   * @param {Object} input
   * @param {string|ObjectId} input.measureRef — measureId or code
   * @param {Object} input.beneficiary — { _id, ageMonths|dateOfBirth, icd10[] }
   * @param {string} input.purpose — baseline | progress | discharge | screening | periodic | research
   * @param {Array}  [input.domainScores]
   * @param {Object} [input.totals] — { totalRawScore, totalStandardScore, ... }
   * @param {Object} [input.context] — { raterCertifications[], administeredMeasureCodes[], cooldownJustification, cooldownApprovedBy }
   * @param {Object} [input.adminDetails] — { assessorId, episodeId, setting, duration, notes, applicationDate }
   * @param {boolean} [input.allowIneligible=false] — bypass eligibility (logs warning)
   */
  async administer(input) {
    const MeasureApplication = M.MeasureApplication();
    if (!MeasureApplication) throw new Error('MeasureApplication model unavailable');

    const measure = await _resolveMeasure(input.measureRef);
    if (!measure) {
      throw new Error(`Measure not found: ${input.measureRef}`);
    }

    const ctx = input.context || {};
    const beneficiary = input.beneficiary || {};

    // ─── Eligibility ──────────────────────────────────────────────
    if (typeof measure.isEligibleFor === 'function') {
      const elig = measure.isEligibleFor(beneficiary, ctx);
      if (!elig.eligible && !input.allowIneligible) {
        const err = new Error(`Beneficiary ineligible for measure ${measure.code}: ${elig.reason}`);
        err.code = 'INELIGIBLE';
        err.detail = elig;
        throw err;
      }
      if (!elig.eligible && input.allowIneligible) {
        logger.warn(
          '[MeasureAdmin] eligibility bypassed for measure=%s reason=%s',
          measure.code,
          elig.reason
        );
      }
    }

    // ─── Cooldown ─────────────────────────────────────────────────
    const cooldown = await MeasureApplication.cooldownCheck(beneficiary._id, measure._id);
    if (cooldown.inCooldown && !ctx.cooldownJustification) {
      const err = new Error(
        `Cooldown active for ${measure.code} — last admin ${cooldown.lastApplicationDate}; ` +
          `${cooldown.daysRemaining} day(s) remain. Provide cooldownJustification to override.`
      );
      err.code = 'COOLDOWN';
      err.detail = cooldown;
      throw err;
    }

    // ─── Baseline uniqueness pre-check (DB index also enforces) ──
    if (input.purpose === 'baseline') {
      const existing = await MeasureApplication.findBaseline(beneficiary._id, measure._id);
      if (existing) {
        const err = new Error(
          `Baseline already exists for (beneficiary=${beneficiary._id}, measure=${measure.code}). ` +
            'Use correct() to fix the existing baseline.'
        );
        err.code = 'BASELINE_EXISTS';
        err.detail = { existingId: existing._id };
        throw err;
      }
    }

    // ─── Application number ───────────────────────────────────────
    const priorCount = await MeasureApplication.countDocuments({
      beneficiaryId: beneficiary._id,
      measureId: measure._id,
    });

    // ─── Build the record ─────────────────────────────────────────
    const adminDetails = input.adminDetails || {};
    const doc = new MeasureApplication({
      beneficiaryId: beneficiary._id,
      episodeId: adminDetails.episodeId,
      measureId: measure._id,
      applicationDate: adminDetails.applicationDate || new Date(),
      applicationNumber: priorCount + 1,
      purpose: input.purpose || 'progress',
      isBaseline: input.purpose === 'baseline',

      domainScores: input.domainScores || [],
      totalRawScore: input.totals?.totalRawScore,
      totalStandardScore: input.totals?.totalStandardScore,
      totalPercentile: input.totals?.totalPercentile,
      compositeScore: input.totals?.compositeScore,
      ageEquivalent: input.totals?.ageEquivalent,

      overallInterpretation: input.totals?.overallInterpretation,
      overallInterpretation_ar: input.totals?.overallInterpretation_ar,
      overallSeverity: input.totals?.overallSeverity,
      matchedRule: input.totals?.matchedRule,

      assessorId: adminDetails.assessorId,
      setting: adminDetails.setting,
      duration: adminDetails.duration,
      notes: adminDetails.notes,
      clinicalObservations: adminDetails.clinicalObservations,

      status: 'completed',

      // W211 governance ────────────────────────────────────────────
      scoredWithMeasureVersion: measure.version,
      scoredWithAlgorithmVersion: measure.scoringEngineVersion,
      mcidAtAdministration: _freezeMcid(measure),
      sdcAtAdministration: _freezeSdc(measure),
      eligibilitySnapshot: _eligibilitySnapshot(measure, beneficiary, ctx),
      cooldownJustification: ctx.cooldownJustification,
      cooldownApprovedBy: ctx.cooldownApprovedBy,

      branchId: adminDetails.branchId,
      organizationId: adminDetails.organizationId,
      createdBy: adminDetails.assessorId,
    });

    await doc.save();
    return doc.toObject();
  }

  /**
   * Lock a baseline record. After this, the document is immutable —
   * any score-path edit fails at the model layer.
   */
  async lockBaseline(applicationId, actorId) {
    const MeasureApplication = M.MeasureApplication();
    if (!MeasureApplication) throw new Error('MeasureApplication model unavailable');
    const doc = await MeasureApplication.findById(applicationId);
    if (!doc) return null;
    if (!doc.isBaseline) {
      throw new Error(
        `Application ${applicationId} is not a baseline record (purpose=${doc.purpose})`
      );
    }
    return doc.lock(actorId);
  }

  /**
   * Lock any completed administration (not only baselines).
   */
  async lock(applicationId, actorId) {
    const MeasureApplication = M.MeasureApplication();
    if (!MeasureApplication) throw new Error('MeasureApplication model unavailable');
    const doc = await MeasureApplication.findById(applicationId);
    if (!doc) return null;
    return doc.lock(actorId);
  }

  /**
   * Write a correction record. The original is left intact (still
   * locked) but transitions to status='corrected' with a forward
   * pointer to the new record.
   *
   * @param {string|ObjectId} originalId
   * @param {Object} corrections — fields to override on the new record
   * @param {string} reason — clinical justification (required)
   * @param {ObjectId} actorId
   */
  async correct(originalId, corrections, reason, actorId) {
    const MeasureApplication = M.MeasureApplication();
    if (!MeasureApplication) throw new Error('MeasureApplication model unavailable');
    if (!reason || !reason.trim()) {
      throw new Error('correctionReason is required');
    }
    const original = await MeasureApplication.findById(originalId);
    if (!original) throw new Error(`Original application not found: ${originalId}`);
    if (!original.isLocked()) {
      throw new Error(
        `Original application ${originalId} must be locked before correction (status=${original.status})`
      );
    }
    if (original.status === 'corrected') {
      throw new Error(
        `Application ${originalId} has already been corrected by ${original.supersededByCorrection}`
      );
    }

    // Build the correction record from the original.
    const originalObj = original.toObject();
    delete originalObj._id;
    delete originalObj.createdAt;
    delete originalObj.updatedAt;
    delete originalObj.__v;

    const wasBaseline = !!original.isBaseline;

    // Transfer the baseline title BEFORE creating the correction —
    // otherwise both records carry isBaseline=true and the partial
    // unique index rejects the new record. Allowed on the locked
    // original because isBaseline is NOT in W211_LOCKED_IMMUTABLE_PATHS
    // (transferring the title during correction is the only mutation
    // permitted on a locked record).
    if (wasBaseline) {
      original.isBaseline = false;
      await original.save();
    }

    const correction = new MeasureApplication({
      ...originalObj,
      ...corrections,
      isBaseline: wasBaseline,
      purpose: original.purpose,
      status: 'completed',
      correctionOf: original._id,
      correctionReason: reason,
      supersededByCorrection: undefined,
      lockedAt: undefined,
      lockedBy: undefined,
      applicationDate: corrections.applicationDate || new Date(),
      createdBy: actorId,
    });
    await correction.save();

    // Mark the original as corrected (forward pointer). The schema's
    // pre-validate allows this transition because supersededByCorrection
    // + status are not in W211_LOCKED_IMMUTABLE_PATHS.
    await original.markCorrected(correction._id);

    return { correction: correction.toObject(), original: original.toObject() };
  }

  /**
   * Get the chronological history of a measure for a beneficiary.
   * Excludes corrected-superseded records by default.
   */
  async getHistory(beneficiaryId, measureRef, { includeSuperseded = false } = {}) {
    const MeasureApplication = M.MeasureApplication();
    if (!MeasureApplication) return [];

    let measureId = measureRef;
    if (!mongoose.Types.ObjectId.isValid(measureRef)) {
      const m = await _resolveMeasure(measureRef);
      if (!m) return [];
      measureId = m._id;
    }

    const filter = { beneficiaryId, measureId };
    if (!includeSuperseded) filter.status = { $ne: 'corrected' };
    return MeasureApplication.find(filter)
      .sort({ applicationDate: 1 })
      .populate('assessorId', 'firstName lastName name')
      .lean();
  }

  /**
   * Return the locked baseline for (beneficiary, measure) — or null.
   */
  async getBaseline(beneficiaryId, measureRef) {
    const MeasureApplication = M.MeasureApplication();
    if (!MeasureApplication) return null;
    let measureId = measureRef;
    if (!mongoose.Types.ObjectId.isValid(measureRef)) {
      const m = await _resolveMeasure(measureRef);
      if (!m) return null;
      measureId = m._id;
    }
    return MeasureApplication.findBaseline(beneficiaryId, measureId);
  }

  /**
   * List active measures whose reassessment cadence has elapsed for
   * this beneficiary. Powers UI follow-up reminders and the W214
   * Reassessment Scheduler cron (to be built).
   */
  async getDueForReassessment(beneficiaryId, opts = {}) {
    const MeasureApplication = M.MeasureApplication();
    if (!MeasureApplication) return [];
    return MeasureApplication.findDueForReassessment(beneficiaryId, opts);
  }

  /**
   * Public cooldown probe. UI calls this before opening the admin
   * form so it can either disable the submit or surface the
   * justification prompt.
   */
  async checkCooldown(beneficiaryId, measureRef) {
    const MeasureApplication = M.MeasureApplication();
    if (!MeasureApplication) return { inCooldown: false };
    let measureId = measureRef;
    if (!mongoose.Types.ObjectId.isValid(measureRef)) {
      const m = await _resolveMeasure(measureRef);
      if (!m) return { inCooldown: false, error: 'measure_not_found' };
      measureId = m._id;
    }
    return MeasureApplication.cooldownCheck(beneficiaryId, measureId);
  }
}

module.exports = new MeasureAdministrationSvc();

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

// Lazy-required to avoid hard-coupling at module init — keeps tests
// that mock the registry isolated.
function _scoringEngine() {
  return require('./measureScoringEngine.service');
}

// W257e wiring of W248c anomaly detector. Pure observability —
// surfaces data-quality concerns onto the admin doc as anomalyFlags[]
// without blocking save. Lazy-required so tests that mock individual
// services stay isolated.
function _anomalyDetector() {
  return require('./measureAdminAnomalyDetector.service');
}

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

/**
 * Find the most recent prior administration's derived value for this
 * (beneficiary, measure). Used to feed scoringEngine.score() so the
 * delta block in the envelope is meaningful. Returns null when no
 * prior admin exists. Excludes corrected-superseded records — they're
 * historically authoritative but the latest correction takes precedence.
 */
async function _resolvePrevDerived(beneficiaryId, measureId) {
  const MeasureApplication = M.MeasureApplication();
  if (!MeasureApplication || !beneficiaryId || !measureId) return null;
  const prior = await MeasureApplication.findOne({
    beneficiaryId,
    measureId,
    status: { $in: ['completed', 'locked'] },
  })
    .sort({ applicationDate: -1 })
    .select('totalRawScore applicationDate')
    .lean()
    .catch(() => null);
  return prior && typeof prior.totalRawScore === 'number' ? prior.totalRawScore : null;
}

/**
 * Run the W212 scoring engine for this (measure, rawItems) pair and
 * return both the envelope and a flat `totals`-shaped projection that
 * matches the MeasureApplication schema. Centralises the mapping so
 * administer() + previewScore() stay in sync.
 */
async function _autoScore(measure, rawItems, ctx, prevDerived) {
  if (!Array.isArray(rawItems)) return null;
  const engine = _scoringEngine();
  if (!engine.hasModule(measure.code)) {
    // No scoring module yet — caller must supply totals manually.
    return null;
  }
  const envelope = await engine.score({
    measure,
    rawItems,
    ctx,
    prevDerived: typeof prevDerived === 'number' ? prevDerived : undefined,
  });
  // Map envelope.interpretation → flat severity/interpretation fields.
  const interp = envelope.interpretation || {};
  return {
    envelope,
    totals: {
      totalRawScore: envelope.derived.value,
      overallInterpretation: interp.label_en,
      overallInterpretation_ar: interp.label_ar,
      overallSeverity: interp.severity,
      matchedRule: interp.band
        ? {
            rangeLabel: interp.band,
            rangeLabel_ar: interp.label_ar,
            color: interp.color,
          }
        : undefined,
    },
    comparison: envelope.delta
      ? {
          previousScore: typeof prevDerived === 'number' ? prevDerived : null,
          changeFromPrevious: envelope.delta.absolute,
          changeFromPreviousPercent:
            envelope.delta.relative != null ? Math.round(envelope.delta.relative * 100) : null,
          isClinicallySignificant: envelope.delta.mcidMet === true,
          trend:
            envelope.delta.direction === 'improving'
              ? 'improving'
              : envelope.delta.direction === 'declining'
                ? 'declining'
                : envelope.delta.direction === 'stable'
                  ? 'stable'
                  : 'insufficient_data',
        }
      : undefined,
  };
}

// ─── Service ────────────────────────────────────────────────────────────

class MeasureAdministrationSvc {
  /**
   * Administer a measure. Composes eligibility + cooldown + auto-scoring
   * (W215) + version pinning + persistence. Returns the saved
   * MeasureApplication.
   *
   * Scoring resolution (W215):
   *   • If `input.rawItems` is provided AND a scoring module exists
   *     for measure.code, the W212 scoring engine derives the totals
   *     + interpretation + delta. The auto-fetched prior administration
   *     supplies prevDerived so delta/MCID are computed against history.
   *   • Otherwise (no rawItems OR no module), falls back to caller-
   *     supplied `input.totals` (legacy path).
   *
   * @param {Object} input
   * @param {string|ObjectId} input.measureRef — measureId or code
   * @param {Object} input.beneficiary — { _id, ageMonths|dateOfBirth, icd10[] }
   * @param {string} input.purpose — baseline | progress | discharge | screening | periodic | research
   * @param {Array}  [input.rawItems] — raw per-item responses; triggers auto-scoring
   * @param {Array}  [input.domainScores] — legacy per-domain breakdown
   * @param {Object} [input.totals] — { totalRawScore, ... } legacy fallback
   * @param {Object} [input.context] — { raterCertifications[], administeredMeasureCodes[], cooldownJustification, cooldownApprovedBy }
   * @param {Object} [input.adminDetails] — { assessorId, episodeId, setting, duration, notes, applicationDate }
   * @param {boolean} [input.allowIneligible=false] — bypass eligibility (logs warning)
   * @param {boolean} [input.dryRun=false] — score+validate but don't persist
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

    // ─── Auto-scoring (W215) ──────────────────────────────────────
    // When rawItems are provided AND a scoring module is registered,
    // the W212 engine derives totals + interpretation + delta. The
    // caller's input.totals is treated as a fallback (legacy path)
    // and is shallow-merged UNDER the engine output so engine values
    // win when both exist. Auto-fetched prevDerived feeds the delta
    // block so MCID checks are computed against actual history.
    let scoringResult = null;
    if (Array.isArray(input.rawItems) && input.rawItems.length > 0) {
      const prevDerived = await _resolvePrevDerived(beneficiary._id, measure._id);
      try {
        scoringResult = await _autoScore(measure, input.rawItems, ctx, prevDerived);
      } catch (err) {
        // INVALID_RAW should reach the caller as-is — these are user-input
        // errors with a structured `errors[]` payload. Other failures get
        // wrapped with measure context for debuggability.
        if (err.code === 'INVALID_RAW') throw err;
        const wrapped = new Error(
          `Auto-scoring failed for measure=${measure.code}: ${err.message}`
        );
        wrapped.code = 'SCORING_FAILED';
        wrapped.cause = err;
        throw wrapped;
      }
    }

    const totals = scoringResult ? scoringResult.totals : input.totals || {};
    const comparison = scoringResult ? scoringResult.comparison : undefined;
    // Allow legacy fields to fill gaps in the auto-scored totals.
    const mergedTotals = scoringResult ? { ...(input.totals || {}), ...totals } : totals;

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
      totalRawScore: mergedTotals.totalRawScore,
      totalStandardScore: mergedTotals.totalStandardScore,
      totalPercentile: mergedTotals.totalPercentile,
      compositeScore: mergedTotals.compositeScore,
      ageEquivalent: mergedTotals.ageEquivalent,

      overallInterpretation: mergedTotals.overallInterpretation,
      overallInterpretation_ar: mergedTotals.overallInterpretation_ar,
      overallSeverity: mergedTotals.overallSeverity,
      matchedRule: mergedTotals.matchedRule,
      comparison,

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

    // ─── Anomaly flags (W257e wiring of W248c detector) ──────────
    // Compute BEFORE dry-run so the preview also surfaces flags.
    // Detector is pure + defensive (returns [] on anything weird);
    // wrap in try/catch anyway so a detector regression cannot
    // ever break admin creation. Observability-mode: no throw, no
    // block.
    try {
      const flags = _anomalyDetector().detectAnomalies({
        admin: doc.toObject(),
        measure,
      });
      if (Array.isArray(flags) && flags.length > 0) {
        doc.anomalyFlags = flags;
      }
    } catch (err) {
      logger.warn(
        `[measureAdministration] anomaly detector threw — flagging skipped: ${err.message}`
      );
    }

    // ─── Dry-run (W215) ───────────────────────────────────────────
    // Validate everything without persisting. Useful for the UI's
    // "save preview" affordance before the therapist commits.
    if (input.dryRun) {
      const err = doc.validateSync();
      if (err) throw err;
      return {
        dryRun: true,
        scoring: scoringResult ? scoringResult.envelope : null,
        wouldPersist: doc.toObject(),
      };
    }

    await doc.save();
    const result = doc.toObject();
    if (scoringResult) result._scoring = scoringResult.envelope;

    // ─── W228 — baseline slot auto-advance ────────────────────────
    // When a baseline admin lands, transition any open W227 slot for
    // this (ben, episode, measure) to BASELINE_COMPLETED. Best-effort:
    // a slot-service failure must never block the primary admin write.
    if (doc.isBaseline) {
      try {
        const baselineSlotSvc = require('./measureBaselineSlot.service');
        const slotResult = await baselineSlotSvc.completeFromAdmin({ admin: doc });
        if (slotResult) result._baselineSlot = slotResult;
      } catch (err) {
        // Log silently — slot wire is best-effort.
        try {
          const logger = require('../utils/logger');
          logger.warn(
            '[measureAdministration] baseline-slot auto-advance failed for admin %s: %s',
            doc._id,
            err.message
          );
        } catch (_) {
          // logger unavailable — swallow.
        }
      }
    }

    return result;
  }

  /**
   * Score raw items without persisting. Runs the same eligibility
   * check + auto-scoring as administer() but stops before insert.
   * Powers the UI's "preview your score" affordance.
   *
   * @param {Object} input — same shape as administer({ ...rawItems, ...})
   */
  async previewScore(input) {
    if (!Array.isArray(input?.rawItems) || input.rawItems.length === 0) {
      throw new Error('previewScore: rawItems array is required');
    }
    const measure = await _resolveMeasure(input.measureRef);
    if (!measure) {
      throw new Error(`previewScore: measure not found: ${input.measureRef}`);
    }

    const ctx = input.context || {};
    const beneficiary = input.beneficiary || {};

    // Eligibility note (informational only — preview never refuses).
    let eligibilityNote = null;
    if (typeof measure.isEligibleFor === 'function') {
      const elig = measure.isEligibleFor(beneficiary, ctx);
      if (!elig.eligible) {
        eligibilityNote = { eligible: false, ...elig };
      }
    }

    const prevDerived = beneficiary._id
      ? await _resolvePrevDerived(beneficiary._id, measure._id)
      : null;

    const scoringResult = await _autoScore(measure, input.rawItems, ctx, prevDerived);
    if (!scoringResult) {
      throw new Error(`previewScore: no scoring module registered for measure ${measure.code}`);
    }

    return {
      measureCode: measure.code,
      measureVersion: measure.version,
      scoring: scoringResult.envelope,
      totals: scoringResult.totals,
      comparison: scoringResult.comparison || null,
      prevDerived,
      eligibilityNote,
    };
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

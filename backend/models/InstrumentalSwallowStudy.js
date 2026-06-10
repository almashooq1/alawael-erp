'use strict';

/**
 * InstrumentalSwallowStudy — Wave 683.
 *
 * "دراسة البلع التصويرية / المنظارية" — records the RESULTS of an
 * instrumental swallowing assessment: VFSS (videofluoroscopic swallow
 * study / MBSS) or FEES (fiberoptic endoscopic evaluation of swallowing).
 *
 * Why a dedicated model (the 2026-05-31 audit gap):
 *   • DysphagiaAssessment (W670) is a CLINICAL BEDSIDE screen (GUSS,
 *     3-oz water, EAT-10) that raises `instrumentalAssessmentRecommended`
 *     + `instrumentalType` — but it is a REFERRAL FLAG only. Nothing
 *     recorded the instrumental study's actual findings.
 *   • Instrumental studies capture data a bedside screen cannot: the
 *     swallow phase impaired (oral/pharyngeal/oesophageal), the
 *     Penetration-Aspiration Scale (Rosenbek 1996, 1–8), residue
 *     location/amount, silent aspiration, and the consistencies (IDDSI)
 *     that are safe — which then drives the diet prescription (W368).
 *   • Closing the loop: a flagged DysphagiaAssessment → instrumental study
 *     → safe-consistency recommendation feeding BeneficiaryDietPrescription.
 *
 * Cross-links: dysphagiaAssessmentId (the referring W670 screen),
 * dietPrescriptionId (the resulting W368 diet, optional).
 *
 * Wave-18 invariants:
 *   • studyType ∈ STUDY_TYPES; status ∈ STATUSES
 *   • penetrationAspirationScale (when set) ∈ 1..8 (Rosenbek)
 *   • aspirationDetected=true ⇒ penetrationAspirationScale ≥ 6
 *   • status=completed ⇒ performedDate + performedByName required
 *   • status=completed ⇒ at least one consistency result OR overallFinding
 *   • silentAspiration=true ⇒ aspirationDetected=true (silent ⊂ aspiration)
 */

const mongoose = require('mongoose');

const STUDY_TYPES = ['vfss', 'fees', 'mbss']; // MBSS is a VFSS synonym kept for intake mapping
const STATUSES = ['ordered', 'scheduled', 'completed', 'cancelled'];

// Swallow phases an instrumental study can localise impairment to.
const PHASES = ['oral_preparatory', 'oral', 'pharyngeal', 'oesophageal'];

// IDDSI levels (0-4 drinks, 3-7 foods) — which consistencies were trialled.
const IDDSI_LEVELS = ['0', '1', '2', '3', '4', '5', '6', '7'];

const ConsistencyResultSchema = new mongoose.Schema(
  {
    iddsiLevel: { type: String, enum: IDDSI_LEVELS, required: true },
    descriptor: { type: String, default: '', maxlength: 100 }, // "رقيق", "معتدل القوام"...
    penetration: { type: Boolean, default: false },
    aspiration: { type: Boolean, default: false },
    residue: { type: String, enum: ['none', 'mild', 'moderate', 'severe', ''], default: '' },
    safe: { type: Boolean, default: true }, // recommended as safe for this beneficiary
    notes: { type: String, default: '', maxlength: 300 },
  },
  { _id: false }
);

const InstrumentalSwallowStudySchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
      index: true,
    },
    // The bedside screen (W670) that referred this instrumental study.
    dysphagiaAssessmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DysphagiaAssessment',
      default: null,
    },
    // The diet prescription (W368) this study's safe-consistency drove (optional).
    dietPrescriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BeneficiaryDietPrescription',
      default: null,
    },

    studyType: { type: String, enum: STUDY_TYPES, required: true, index: true },
    status: { type: String, enum: STATUSES, default: 'ordered', index: true },

    orderedDate: { type: Date, default: Date.now },
    orderedByName: { type: String, default: '', maxlength: 100 },
    scheduledDate: { type: Date, default: null },

    performedDate: { type: Date, default: null },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    performedByName: { type: String, default: '', maxlength: 100 }, // SLP / radiologist
    facilityName: { type: String, default: '', maxlength: 150 }, // external imaging centre

    // ── Findings ───────────────────────────────────────────────────────
    impairedPhases: { type: [String], enum: PHASES, default: () => [] },
    penetrationAspirationScale: { type: Number, default: null, min: 1, max: 8 }, // Rosenbek
    aspirationDetected: { type: Boolean, default: false },
    silentAspiration: { type: Boolean, default: false },
    pharyngealResidue: {
      type: String,
      enum: ['none', 'mild', 'moderate', 'severe', ''],
      default: '',
    },

    consistencyResults: { type: [ConsistencyResultSchema], default: () => [] },

    // The recommended-safe IDDSI levels distilled from consistencyResults.
    recommendedDietLevels: { type: [String], enum: IDDSI_LEVELS, default: () => [] },
    npoRecommended: { type: Boolean, default: false }, // nil-by-mouth
    compensatoryStrategies: { type: [String], default: () => [] }, // chin-tuck, double-swallow...

    overallFinding: { type: String, default: '', maxlength: 1000 },
    mediaRef: { type: String, default: '', maxlength: 300 }, // link to fluoroscopy clip/stills

    followUpRecommended: { type: Boolean, default: false },
    followUpDueDate: { type: Date, default: null },

    cancelReason: { type: String, default: '', maxlength: 300 },
    notes: { type: String, default: '', maxlength: 1000 },
  },
  { timestamps: true, collection: 'instrumental_swallow_studies' }
);

InstrumentalSwallowStudySchema.index({ beneficiaryId: 1, performedDate: -1 });
InstrumentalSwallowStudySchema.index({ branchId: 1, status: 1 });
InstrumentalSwallowStudySchema.index({ status: 1, scheduledDate: 1 });

InstrumentalSwallowStudySchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

InstrumentalSwallowStudySchema.path('__invariants').validate(function () {
  let ok = true;
  if (!STUDY_TYPES.includes(this.studyType)) {
    this.invalidate('studyType', `must be one of ${STUDY_TYPES.join(',')}`);
    ok = false;
  }
  if (!STATUSES.includes(this.status)) {
    this.invalidate('status', `must be one of ${STATUSES.join(',')}`);
    ok = false;
  }
  if (
    this.penetrationAspirationScale != null &&
    (this.penetrationAspirationScale < 1 || this.penetrationAspirationScale > 8)
  ) {
    this.invalidate('penetrationAspirationScale', 'PAS must be 1..8 (Rosenbek)');
    ok = false;
  }
  // PAS 6-8 = material enters airway below vocal folds = aspiration.
  if (
    this.aspirationDetected &&
    this.penetrationAspirationScale != null &&
    this.penetrationAspirationScale < 6
  ) {
    this.invalidate('penetrationAspirationScale', 'aspirationDetected=true requires PAS >= 6');
    ok = false;
  }
  // Silent aspiration is aspiration without a protective cough → a subset.
  if (this.silentAspiration && !this.aspirationDetected) {
    this.invalidate('aspirationDetected', 'silentAspiration implies aspirationDetected=true');
    ok = false;
  }
  if (this.status === 'completed') {
    if (!this.performedDate) {
      this.invalidate('performedDate', 'performedDate required when status=completed');
      ok = false;
    }
    if (!String(this.performedByName || '').trim()) {
      this.invalidate('performedByName', 'performedByName required when status=completed');
      ok = false;
    }
    const hasResult =
      (Array.isArray(this.consistencyResults) && this.consistencyResults.length > 0) ||
      String(this.overallFinding || '').trim();
    if (!hasResult) {
      this.invalidate(
        'overallFinding',
        'completed study needs consistencyResults or overallFinding'
      );
      ok = false;
    }
  }
  if (this.status === 'cancelled' && !String(this.cancelReason || '').trim()) {
    this.invalidate('cancelReason', 'cancelReason required when status=cancelled');
    ok = false;
  }
  return ok;
});

/** PAS >= 6 indicates aspiration on the worst trialled consistency. */
InstrumentalSwallowStudySchema.virtual('indicatesAspiration').get(function () {
  return (
    this.aspirationDetected ||
    (typeof this.penetrationAspirationScale === 'number' && this.penetrationAspirationScale >= 6)
  );
});

InstrumentalSwallowStudySchema.virtual('isComplete').get(function () {
  return this.status === 'completed';
});

InstrumentalSwallowStudySchema.set('toJSON', { virtuals: true });
InstrumentalSwallowStudySchema.set('toObject', { virtuals: true });

// ── Unified-core linkage (W1075 — swallow-study island → CareTimeline) ──
InstrumentalSwallowStudySchema.post('init', function () {
  this.$__prevStatus = this.status;
});
InstrumentalSwallowStudySchema.post('save', function (doc) {
  try {
    if (doc.status !== 'completed' || this.$__prevStatus === 'completed') return;
    const { integrationBus } = require('../integration/systemIntegrationBus');
    if (!integrationBus || typeof integrationBus.publish !== 'function' || !doc.beneficiaryId) return;
    Promise.resolve(
      integrationBus.publish('clinical-assessment', 'swallow-study.completed', {
        instrumentalSwallowStudyId: String(doc._id),
        beneficiaryId: String(doc.beneficiaryId),
        studyType: doc.studyType,
        aspirationDetected: !!doc.aspirationDetected,
      })
    ).catch(() => {});
  } catch (_) {
    /* never block persistence */
  }
});

module.exports =
  mongoose.models.InstrumentalSwallowStudy ||
  mongoose.model('InstrumentalSwallowStudy', InstrumentalSwallowStudySchema);

module.exports.STUDY_TYPES = STUDY_TYPES;
module.exports.STATUSES = STATUSES;
module.exports.PHASES = PHASES;
module.exports.IDDSI_LEVELS = IDDSI_LEVELS;

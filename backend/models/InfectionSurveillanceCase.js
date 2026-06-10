'use strict';

/**
 * InfectionSurveillanceCase — Wave 1042.
 *
 * "ترصّد العدوى" — infection prevention & control (IPC) case surveillance
 * for a congregate disability day-care center, where communicable disease
 * (respiratory, GI, skin) spreads fast among a medically-vulnerable
 * population. Tracks each suspected/confirmed case, its isolation
 * precautions, center-exclusion period, and notifiable-disease reporting
 * to the health authority (MOH).
 *
 * A core CBAHI / Infection-Prevention standard. Distinct from
 * MorningHealthCheck (a daily arrival gate) — this is the longitudinal
 * case record + outbreak-surveillance feed.
 *
 * Wave-18 invariants:
 *   • category ∈ CATEGORIES ; caseStatus ∈ CASE_STATUSES ;
 *     precautionType ∈ PRECAUTION_TYPES
 *   • caseStatus=confirmed ⇒ pathogen named
 *   • caseStatus=resolved ⇒ resolutionDate ; resolutionDate ≥ onsetDate
 *   • isolationRequired ⇒ precautionType ≠ none
 *   • excludedFromCenter ⇒ exclusionStart
 *   • reportedToAuthority ⇒ authorityReportDate
 */

const mongoose = require('mongoose');

const CATEGORIES = [
  'respiratory',
  'gastrointestinal',
  'skin_soft_tissue',
  'eye',
  'vaccine_preventable',
  'bloodborne',
  'other',
];
const CASE_STATUSES = ['suspected', 'confirmed', 'ruled_out', 'resolved'];
const PRECAUTION_TYPES = ['none', 'standard', 'contact', 'droplet', 'airborne'];

const InfectionSurveillanceCaseSchema = new mongoose.Schema(
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
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BeneficiarySection',
      default: null,
    },

    date: { type: Date, required: true, index: true }, // identification date
    onsetDate: { type: Date, default: null },
    category: { type: String, enum: CATEGORIES, required: true, index: true },
    pathogen: { type: String, default: '', maxlength: 120 }, // influenza / norovirus / scabies / ...
    symptoms: { type: [String], default: () => [] },

    caseStatus: { type: String, enum: CASE_STATUSES, default: 'suspected', index: true },
    labConfirmed: { type: Boolean, default: false },
    labResult: { type: String, default: '', maxlength: 300 },
    resolutionDate: { type: Date, default: null },

    // ── Isolation / precautions ──────────────────────────────────────
    isolationRequired: { type: Boolean, default: false },
    precautionType: { type: String, enum: PRECAUTION_TYPES, default: 'none' },
    excludedFromCenter: { type: Boolean, default: false },
    exclusionStart: { type: Date, default: null },
    exclusionEnd: { type: Date, default: null }, // cleared-to-return date

    // ── Notifiable-disease authority reporting ───────────────────────
    isNotifiable: { type: Boolean, default: false },
    reportedToAuthority: { type: Boolean, default: false },
    authorityReportDate: { type: Date, default: null },
    authorityReference: { type: String, default: '', maxlength: 100 },

    // ── Outbreak linkage ─────────────────────────────────────────────
    outbreakId: { type: String, default: '', maxlength: 60, index: true }, // shared cluster tag

    notes: { type: String, default: '', maxlength: 1000 },

    enteredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    enteredByName: { type: String, default: '', maxlength: 100 },
  },
  { timestamps: true, collection: 'infection_surveillance_cases' }
);

InfectionSurveillanceCaseSchema.index({ beneficiaryId: 1, date: -1 });
InfectionSurveillanceCaseSchema.index({ branchId: 1, caseStatus: 1, category: 1 });
InfectionSurveillanceCaseSchema.index({ category: 1, date: -1 });

InfectionSurveillanceCaseSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

InfectionSurveillanceCaseSchema.path('__invariants').validate(function () {
  let ok = true;
  if (!CATEGORIES.includes(this.category)) {
    this.invalidate('category', `must be one of ${CATEGORIES.join(',')}`);
    ok = false;
  }
  if (!CASE_STATUSES.includes(this.caseStatus)) {
    this.invalidate('caseStatus', `must be one of ${CASE_STATUSES.join(',')}`);
    ok = false;
  }
  if (!PRECAUTION_TYPES.includes(this.precautionType)) {
    this.invalidate('precautionType', `must be one of ${PRECAUTION_TYPES.join(',')}`);
    ok = false;
  }
  if (this.caseStatus === 'confirmed' && !String(this.pathogen || '').trim()) {
    this.invalidate('pathogen', 'pathogen must be named when caseStatus=confirmed');
    ok = false;
  }
  if (this.caseStatus === 'resolved') {
    if (!this.resolutionDate) {
      this.invalidate('resolutionDate', 'resolutionDate required when caseStatus=resolved');
      ok = false;
    }
  }
  if (this.resolutionDate && this.onsetDate && this.resolutionDate < this.onsetDate) {
    this.invalidate('resolutionDate', 'resolutionDate must be >= onsetDate');
    ok = false;
  }
  if (this.isolationRequired && this.precautionType === 'none') {
    this.invalidate('precautionType', 'a precaution type is required when isolationRequired=true');
    ok = false;
  }
  if (this.excludedFromCenter && !this.exclusionStart) {
    this.invalidate('exclusionStart', 'exclusionStart required when excludedFromCenter=true');
    ok = false;
  }
  if (this.reportedToAuthority && !this.authorityReportDate) {
    this.invalidate('authorityReportDate', 'authorityReportDate required when reportedToAuthority=true');
    ok = false;
  }
  return ok;
});

/**
 * isActive — a live case still posing transmission risk.
 */
InfectionSurveillanceCaseSchema.virtual('isActive').get(function () {
  return this.caseStatus === 'suspected' || this.caseStatus === 'confirmed';
});

/**
 * isCurrentlyExcluded — excluded from the center with no clearance-to-return
 * yet (or a return date still in the future).
 */
InfectionSurveillanceCaseSchema.virtual('isCurrentlyExcluded').get(function () {
  if (!this.excludedFromCenter) return false;
  if (!this.exclusionEnd) return true;
  return this.exclusionEnd.getTime() > Date.now();
});

/**
 * durationDays — onset → resolution (or today if unresolved).
 */
InfectionSurveillanceCaseSchema.virtual('durationDays').get(function () {
  const start = this.onsetDate || this.date;
  if (!start) return null;
  const end = this.resolutionDate || new Date();
  return Math.max(0, Math.floor((end.getTime() - new Date(start).getTime()) / (24 * 60 * 60 * 1000)));
});

InfectionSurveillanceCaseSchema.set('toJSON', { virtuals: true });
InfectionSurveillanceCaseSchema.set('toObject', { virtuals: true });

// ── Unified-core linkage (W1046) — native pre-compile hooks (W954-safe).
// A newly-opened case (not ruled_out) → infection_case (severity by
// confirmation/isolation/outbreak); a transition to resolved → infection_resolved.
InfectionSurveillanceCaseSchema.post('init', function () {
  this.$__prevCaseStatus = this.caseStatus;
});
InfectionSurveillanceCaseSchema.post('save', function (doc) {
  try {
    const { integrationBus } = require('../integration/systemIntegrationBus');
    if (!integrationBus || typeof integrationBus.publish !== 'function' || !doc.beneficiaryId) return;
    const prev = this.$__prevCaseStatus;
    const base = {
      infectionCaseId: String(doc._id),
      beneficiaryId: String(doc.beneficiaryId),
      category: doc.category,
      pathogen: doc.pathogen || '',
      caseStatus: doc.caseStatus,
      isolationRequired: !!doc.isolationRequired,
      excludedFromCenter: !!doc.excludedFromCenter,
      outbreakId: doc.outbreakId || '',
    };
    if (prev === undefined && doc.caseStatus !== 'ruled_out' && doc.caseStatus !== 'resolved') {
      Promise.resolve(integrationBus.publish('clinical-safety', 'infection.case_opened', base)).catch(() => {});
    } else if (doc.caseStatus === 'resolved' && prev && prev !== 'resolved') {
      Promise.resolve(integrationBus.publish('clinical-safety', 'infection.case_resolved', base)).catch(() => {});
    }
  } catch (_) {
    /* never block persistence */
  }
});

module.exports =
  mongoose.models.InfectionSurveillanceCase ||
  mongoose.model('InfectionSurveillanceCase', InfectionSurveillanceCaseSchema);

module.exports.CATEGORIES = CATEGORIES;
module.exports.CASE_STATUSES = CASE_STATUSES;
module.exports.PRECAUTION_TYPES = PRECAUTION_TYPES;

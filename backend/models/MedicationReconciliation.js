'use strict';

/**
 * MedicationReconciliation — Wave 1041.
 *
 * "مطابقة الأدوية" — the formal process of comparing a beneficiary's
 * medication orders across a transition of care (admission / discharge /
 * transfer / periodic review) to catch unintentional discrepancies
 * (omissions, duplications, dose/route/frequency changes) before they
 * cause harm. A core CBAHI / patient-safety-goal requirement that is
 * DISTINCT from eMAR (MedicationAdministrationRecord, which logs doses
 * actually given — not the prescribed-vs-prior comparison).
 *
 * Target population: any beneficiary on ≥1 medication crossing a care
 * transition — especially the polypharmacy cohort (epilepsy + behavioural
 * + comorbidity) where discrepancies are most dangerous.
 *
 * Each `medications[]` item carries the reconciliation DECISION (continue /
 * discontinue / modify / hold / new) + a discrepancy classification + a
 * resolved flag, so the unresolved-discrepancy count is always derivable.
 *
 * Wave-18 invariants:
 *   • reconciliationType ∈ TYPES
 *   • each medication.decision ∈ DECISIONS ; discrepancyType ∈ DISCREPANCY_TYPES
 *     (schema enums) ; decision=modify ⇒ that item's notes required
 *   • status=reconciled ⇒ reconciledBy(name) + reconciledAt required
 */

const mongoose = require('mongoose');

const TYPES = ['admission', 'discharge', 'transfer', 'periodic_review'];
const SOURCES = ['home', 'prescribed', 'otc', 'herbal', 'transfer'];
const DECISIONS = ['continue', 'discontinue', 'modify', 'hold', 'new'];
const DISCREPANCY_TYPES = [
  'none',
  'omission',
  'duplication',
  'dose_change',
  'frequency_change',
  'route_change',
  'therapeutic_duplication',
];

const MedicationItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, maxlength: 200 },
    dose: { type: String, default: '', maxlength: 100 },
    route: { type: String, default: '', maxlength: 60 }, // oral / iv / topical / inhaled / ...
    frequency: { type: String, default: '', maxlength: 100 },
    source: { type: String, enum: SOURCES, default: 'home' },
    decision: { type: String, enum: DECISIONS, default: 'continue' },
    discrepancyType: { type: String, enum: DISCREPANCY_TYPES, default: 'none' },
    discrepancyResolved: { type: Boolean, default: false },
    notes: { type: String, default: '', maxlength: 500 },
  },
  { _id: false }
);

/**
 * computeReconciliationStats — pure, exported static so the route, sweeper,
 * and behavioral test all derive the discrepancy counts identically.
 */
function computeReconciliationStats(medications) {
  const list = Array.isArray(medications) ? medications : [];
  let discrepancyCount = 0;
  let unresolvedDiscrepancyCount = 0;
  for (const m of list) {
    if (m && m.discrepancyType && m.discrepancyType !== 'none') {
      discrepancyCount += 1;
      if (!m.discrepancyResolved) unresolvedDiscrepancyCount += 1;
    }
  }
  return { medicationCount: list.length, discrepancyCount, unresolvedDiscrepancyCount };
}

const MedicationReconciliationSchema = new mongoose.Schema(
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
    carePlanVersionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CarePlanVersion',
      default: null,
    },

    date: { type: Date, required: true, index: true },
    reconciliationType: { type: String, enum: TYPES, default: 'admission', index: true },

    medications: { type: [MedicationItemSchema], default: () => [] },

    prescriberId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    prescriberName: { type: String, default: '', maxlength: 100 },

    notes: { type: String, default: '', maxlength: 1000 },

    // ── Lifecycle ────────────────────────────────────────────────────
    enteredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    enteredByName: { type: String, default: '', maxlength: 100 },

    status: { type: String, enum: ['draft', 'reconciled'], default: 'draft', index: true },
    reconciledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reconciledByName: { type: String, default: '', maxlength: 100 },
    reconciledAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'medication_reconciliations' }
);

MedicationReconciliationSchema.index({ beneficiaryId: 1, date: -1 });
MedicationReconciliationSchema.index({ branchId: 1, reconciliationType: 1, status: 1 });
MedicationReconciliationSchema.index({ status: 1, date: -1 });

MedicationReconciliationSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

MedicationReconciliationSchema.path('__invariants').validate(function () {
  let ok = true;
  if (!TYPES.includes(this.reconciliationType)) {
    this.invalidate('reconciliationType', `must be one of ${TYPES.join(',')}`);
    ok = false;
  }
  // A 'modify' decision must document what changed.
  if (Array.isArray(this.medications)) {
    const modifyMissingNotes = this.medications.some(
      m => m && m.decision === 'modify' && !String(m.notes || '').trim()
    );
    if (modifyMissingNotes) {
      this.invalidate('medications', 'a medication with decision=modify requires notes describing the change');
      ok = false;
    }
  }
  if (this.status === 'reconciled') {
    if (!this.reconciledBy && !String(this.reconciledByName || '').trim()) {
      this.invalidate('reconciledBy', 'reconciler required to mark reconciled');
      ok = false;
    }
    if (!this.reconciledAt) {
      this.invalidate('reconciledAt', 'reconciledAt required to mark reconciled');
      ok = false;
    }
  }
  return ok;
});

MedicationReconciliationSchema.virtual('medicationCount').get(function () {
  return Array.isArray(this.medications) ? this.medications.length : 0;
});

MedicationReconciliationSchema.virtual('discrepancyCount').get(function () {
  return computeReconciliationStats(this.medications).discrepancyCount;
});

MedicationReconciliationSchema.virtual('unresolvedDiscrepancyCount').get(function () {
  return computeReconciliationStats(this.medications).unresolvedDiscrepancyCount;
});

/**
 * hasUnresolvedDiscrepancies — surfaced for the unresolved-cohort feed +
 * dashboards. A reconciled record can still legitimately carry an
 * unresolved flag (deferred for prescriber follow-up), so this is
 * informational — NOT a hard finalize gate.
 */
MedicationReconciliationSchema.virtual('hasUnresolvedDiscrepancies').get(function () {
  return computeReconciliationStats(this.medications).unresolvedDiscrepancyCount > 0;
});

MedicationReconciliationSchema.set('toJSON', { virtuals: true });
MedicationReconciliationSchema.set('toObject', { virtuals: true });

// ── Unified-core linkage (W1046) — native pre-compile hooks (W954-safe).
// On the draft→reconciled flip → medication_reconciliation timeline row
// (warning when unresolved discrepancies remain, else success).
MedicationReconciliationSchema.post('init', function () {
  this.$__prevStatus = this.status;
});
MedicationReconciliationSchema.post('save', function (doc) {
  try {
    if (doc.status !== 'reconciled' || this.$__prevStatus === 'reconciled') return;
    const { integrationBus } = require('../integration/systemIntegrationBus');
    if (!integrationBus || typeof integrationBus.publish !== 'function' || !doc.beneficiaryId) return;
    const stats = computeReconciliationStats(doc.medications);
    Promise.resolve(
      integrationBus.publish('clinical-safety', 'medication.reconciled', {
        medicationReconciliationId: String(doc._id),
        beneficiaryId: String(doc.beneficiaryId),
        reconciliationType: doc.reconciliationType,
        medicationCount: stats.medicationCount,
        unresolvedDiscrepancyCount: stats.unresolvedDiscrepancyCount,
      })
    ).catch(() => {});
  } catch (_) {
    /* never block persistence */
  }
});

module.exports =
  mongoose.models.MedicationReconciliation ||
  mongoose.model('MedicationReconciliation', MedicationReconciliationSchema);

module.exports.TYPES = TYPES;
module.exports.SOURCES = SOURCES;
module.exports.DECISIONS = DECISIONS;
module.exports.DISCREPANCY_TYPES = DISCREPANCY_TYPES;
module.exports.computeReconciliationStats = computeReconciliationStats;

'use strict';

/**
 * SeizureEvent — Wave 356.
 *
 * "سجل النوبات الصرعية" — longitudinal per-event log for any seizure or
 * suspected seizure observed at the day-rehab center. Targeted population
 * is broad: cerebral palsy, autism with epilepsy comorbidity, syndromic
 * presentations (Dravet, Lennox-Gastaut, Rett), and post-TBI rehab.
 *
 * Why a dedicated model (rather than reusing quality/Incident):
 *   • Frequency analytics — count per day/week/month per beneficiary
 *     informs medication titration and neurology referrals. Generic
 *     incidents don't surface a seizure-specific time series.
 *   • Clinical fields that don't fit a generic incident: seizure type
 *     (ILAE classification), consciousness level, pre/ictal/post-ictal
 *     signs, rescue medication given, duration in seconds.
 *   • Distinct from RestraintSeclusionEvent — seizures are NOT staff-
 *     applied interventions; they're patient events with staff response.
 *   • Distinct from MedicationAdministrationRecord — MAR logs scheduled
 *     and PRN doses; this logs the seizure observation. Cross-link via
 *     `rescueMedicationGivenName` + `rescueMedicationAt` (denormalized
 *     for offline/print) and optional `rescueMedicationMarId` FK.
 *
 * Wave-18 invariants:
 *   • type ∈ ILAE classification set
 *   • durationSeconds ≥ 0; ≥ 300 (5 min) flags as status_epilepticus
 *     candidate — operationally a medical emergency
 *   • consciousness=lost → witnessedBy required
 *   • injury=true → injuryNotes + parentNotifiedAt required
 *   • ambulanceCalled=true → parentNotifiedAt required
 *   • status=reviewed → reviewedBy + reviewedAt required
 *   • endTime (when set) must be ≥ startTime
 */

const mongoose = require('mongoose');

// ILAE 2017 simplified classification — what staff can observe without EEG.
// Refractory-epilepsy populations include all of these.
const TYPES = [
  'tonic_clonic', // grand mal — full-body convulsions
  'absence', // petit mal — brief loss of awareness, blank stare
  'focal_aware', // simple partial — localized, awareness preserved
  'focal_impaired', // complex partial — localized, awareness impaired
  'myoclonic', // brief involuntary jerks
  'atonic', // drop attacks — sudden loss of muscle tone
  'tonic', // sustained stiffening, no clonic phase
  'unknown', // observer couldn't classify — common in 1st event
];

const CONSCIOUSNESS_LEVELS = ['aware', 'impaired', 'lost'];
const SEVERITY = ['mild', 'moderate', 'severe'];
const STATUSES = ['recorded', 'reviewed'];
const NOTIFICATION_METHODS = ['phone', 'sms', 'in_person', 'whatsapp', 'email'];

const SeizureEventSchema = new mongoose.Schema(
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
    startTime: { type: Date, required: true },
    endTime: { type: Date, default: null },
    // Seconds, not minutes — many seizures are <60 sec; absence often 5-15 sec.
    durationSeconds: { type: Number, default: null, min: 0, max: 7200 },

    type: { type: String, enum: TYPES, required: true, index: true },
    severity: { type: String, enum: SEVERITY, default: 'mild', index: true },
    consciousness: { type: String, enum: CONSCIOUSNESS_LEVELS, default: 'aware' },

    triggerSuspected: { type: String, default: '', maxlength: 300 },
    preIctalSigns: { type: [String], default: () => [] },
    ictalSigns: { type: [String], default: () => [] },
    postIctalState: { type: String, default: '', maxlength: 500 },
    recoveryMinutes: { type: Number, default: null, min: 0, max: 1440 },

    injury: { type: Boolean, default: false },
    injuryNotes: { type: String, default: '', maxlength: 500 },

    // Rescue medication (PRN diazepam, midazolam, etc.). Denormalized
    // for offline readability — MAR is the canonical record if linked.
    rescueMedicationGivenName: { type: String, default: '', maxlength: 100 },
    rescueMedicationDose: { type: String, default: '', maxlength: 50 },
    rescueMedicationAt: { type: Date, default: null },
    rescueMedicationMarId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MedicationAdministrationRecord',
      default: null,
    },

    ambulanceCalled: { type: Boolean, default: false },
    ambulanceCalledAt: { type: Date, default: null },
    emergencyTransport: { type: Boolean, default: false },

    witnessedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    witnessedByName: { type: String, default: '', maxlength: 100 },
    staffSupporting: { type: [String], default: () => [] },

    supervisorNotifiedAt: { type: Date, default: null },
    supervisorName: { type: String, default: '', maxlength: 100 },
    parentNotifiedAt: { type: Date, default: null },
    parentNotificationMethod: {
      type: String,
      enum: NOTIFICATION_METHODS.concat([null]),
      default: null,
    },

    notes: { type: String, default: '', maxlength: 1000 },

    status: { type: String, enum: STATUSES, default: 'recorded', index: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedByName: { type: String, default: '', maxlength: 100 },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'seizure_events' }
);

SeizureEventSchema.index({ beneficiaryId: 1, startTime: -1 });
SeizureEventSchema.index({ branchId: 1, date: -1 });
SeizureEventSchema.index({ status: 1, date: -1 });
SeizureEventSchema.index({ injury: 1, date: -1 });
SeizureEventSchema.index({ ambulanceCalled: 1, date: -1 });

SeizureEventSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

SeizureEventSchema.path('__invariants').validate(function () {
  let ok = true;
  if (!TYPES.includes(this.type)) {
    this.invalidate('type', `must be one of ${TYPES.join(',')}`);
    ok = false;
  }
  if (this.endTime && this.startTime && this.endTime < this.startTime) {
    this.invalidate('endTime', 'endTime must be >= startTime');
    ok = false;
  }
  if (
    this.consciousness === 'lost' &&
    !this.witnessedBy &&
    !String(this.witnessedByName || '').trim()
  ) {
    this.invalidate('witnessedBy', 'witness required when consciousness=lost');
    ok = false;
  }
  if (this.injury) {
    if (!String(this.injuryNotes || '').trim()) {
      this.invalidate('injuryNotes', 'injuryNotes required when injury=true');
      ok = false;
    }
    if (!this.parentNotifiedAt) {
      this.invalidate('parentNotifiedAt', 'parent notification required when injury=true');
      ok = false;
    }
  }
  if (this.ambulanceCalled && !this.parentNotifiedAt) {
    this.invalidate('parentNotifiedAt', 'parent notification required when ambulanceCalled=true');
    ok = false;
  }
  if (this.rescueMedicationGivenName && !this.rescueMedicationAt) {
    this.invalidate('rescueMedicationAt', 'rescueMedicationAt required when a rescue med is named');
    ok = false;
  }
  if (this.status === 'reviewed') {
    if (!this.reviewedBy && !String(this.reviewedByName || '').trim()) {
      this.invalidate('reviewedBy', 'reviewer required to mark reviewed');
      ok = false;
    }
    if (!this.reviewedAt) {
      this.invalidate('reviewedAt', 'reviewedAt required to mark reviewed');
      ok = false;
    }
  }
  return ok;
});

/**
 * Operational helper — status epilepticus is a medical emergency
 * (≥ 5 min continuous seizure activity, per ILAE 2015). Surfaced as a
 * virtual so dashboards + alert rules can flag without re-computing.
 */
SeizureEventSchema.virtual('isStatusEpilepticusCandidate').get(function () {
  return typeof this.durationSeconds === 'number' && this.durationSeconds >= 300;
});

SeizureEventSchema.set('toJSON', { virtuals: true });
SeizureEventSchema.set('toObject', { virtuals: true });

// W992 — link a newly recorded seizure into the unified core (CareTimeline +
// dashboards). A seizure (especially a status-epilepticus candidate ≥ 5 min) is
// a clinical event the care team must see on the per-beneficiary timeline. These
// hooks live IN the model file (pre-compile) on purpose: schema middleware added
// AFTER mongoose.model() compilation never fires — which is why the generic
// modelEventBridge produced nothing here. Fire-and-forget + fully guarded so a
// bus hiccup never fails or slows a save. The literal `integrationBus.publish`
// call keeps the W389/W392 producer-coverage guards satisfied.
SeizureEventSchema.pre('save', function () {
  this.$__wasNew = this.isNew;
});

SeizureEventSchema.post('save', function (doc) {
  try {
    if (!this.$__wasNew) return; // only emit when a new seizure is recorded
    const { integrationBus } = require('../integration/systemIntegrationBus');
    if (!integrationBus || typeof integrationBus.publish !== 'function') return;
    if (!doc.beneficiaryId) return; // no beneficiary → nothing to place on a timeline

    Promise.resolve(
      integrationBus.publish('safety', 'seizure.recorded', {
        seizureEventId: String(doc._id),
        beneficiaryId: String(doc.beneficiaryId),
        branchId: doc.branchId ? String(doc.branchId) : '',
        seizureType: doc.type || '',
        severity: doc.severity || '',
        durationSeconds: typeof doc.durationSeconds === 'number' ? doc.durationSeconds : null,
        statusEpilepticus: !!doc.isStatusEpilepticusCandidate,
        date: doc.date,
      })
    ).catch(() => {});
  } catch (_) {
    /* bus not wired (e.g. unit tests) — never block persistence */
  }
});

module.exports = mongoose.models.SeizureEvent || mongoose.model('SeizureEvent', SeizureEventSchema);

module.exports.TYPES = TYPES;
module.exports.CONSCIOUSNESS_LEVELS = CONSCIOUSNESS_LEVELS;
module.exports.SEVERITY = SEVERITY;
module.exports.STATUSES = STATUSES;
module.exports.NOTIFICATION_METHODS = NOTIFICATION_METHODS;

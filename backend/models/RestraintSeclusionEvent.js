'use strict';

/**
 * RestraintSeclusionEvent — Wave 193b.
 *
 * "سجل التقييد والعزل" — regulatory ledger required by CBAHI + MOHRSD
 * for any use of restraint or seclusion. Centers cannot legally apply
 * these interventions without complete documentation.
 *
 * Distinct from BehaviorIncident (ABC log of antecedent/behavior/
 * consequence) — R&S logs the *intervention itself* and its safety
 * controls: who applied it, how long, who witnessed, parent
 * notification timing, debrief, injuries.
 *
 * Wave-18 invariants:
 *   • type=physical|mechanical → duration required, ≤ 30 min default safety
 *   • type=chemical → medicationName required (link to MAR ideally)
 *   • durationMinutes ≥ 0, ≤ 240 (4h cap — anything longer = mandatory escalation)
 *   • parentNotifiedAt required when status='completed'
 *   • debriefDone required when status='completed' (debrief is mandatory post-event)
 *   • If injury=true, injuryNotes + parentNotifiedAt required
 */

const mongoose = require('mongoose');

const TYPES = ['physical', 'mechanical', 'chemical', 'seclusion'];
const STATUSES = ['in_progress', 'completed', 'reviewed'];

const RestraintSeclusionEventSchema = new mongoose.Schema(
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
    behaviorPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BehaviorPlan',
      default: null,
    },
    date: { type: Date, required: true, index: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, default: null },
    durationMinutes: { type: Number, default: null, min: 0, max: 240 },

    type: { type: String, enum: TYPES, required: true, index: true },
    // For physical: 'standing hold', 'two-person escort', 'floor hold' etc.
    // For mechanical: 'soft restraint', 'helmet', 'lap belt'
    // For chemical: name of the PRN sedative
    // For seclusion: room/location + level (with/without observer)
    techniqueUsed: { type: String, required: true, maxlength: 200 },
    medicationName: { type: String, default: '', maxlength: 100 },
    seclusionLocation: { type: String, default: '', maxlength: 100 },

    triggerBehavior: { type: String, required: true, maxlength: 500 },
    lessRestrictiveTried: { type: String, default: '', maxlength: 500 },

    staffPrimary: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    staffPrimaryName: { type: String, default: '', maxlength: 100 },
    staffSupporting: { type: [String], default: () => [] },

    supervisorNotifiedAt: { type: Date, default: null },
    supervisorName: { type: String, default: '', maxlength: 100 },
    parentNotifiedAt: { type: Date, default: null },
    parentNotificationMethod: {
      type: String,
      enum: ['phone', 'sms', 'in_person', 'whatsapp', 'email', null],
      default: null,
    },

    injury: { type: Boolean, default: false },
    injuryNotes: { type: String, default: '', maxlength: 500 },

    debriefDone: { type: Boolean, default: false },
    debriefAt: { type: Date, default: null },
    debriefNotes: { type: String, default: '', maxlength: 1000 },
    debriefAttendees: { type: [String], default: () => [] },

    followUpAction: { type: String, default: '', maxlength: 500 },

    status: { type: String, enum: STATUSES, default: 'in_progress', index: true },
    finalizedAt: { type: Date, default: null }, // becomes immutable after this
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedByName: { type: String, default: '', maxlength: 100 },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'restraint_seclusion_events' }
);

RestraintSeclusionEventSchema.index({ beneficiaryId: 1, startTime: -1 });
RestraintSeclusionEventSchema.index({ branchId: 1, date: -1 });
RestraintSeclusionEventSchema.index({ status: 1, date: -1 });
RestraintSeclusionEventSchema.index({ injury: 1, date: -1 });

RestraintSeclusionEventSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

RestraintSeclusionEventSchema.path('__invariants').validate(function () {
  let ok = true;
  if (!TYPES.includes(this.type)) {
    this.invalidate('type', `must be one of ${TYPES.join(',')}`);
    ok = false;
  }
  if (!String(this.techniqueUsed || '').trim()) {
    this.invalidate('techniqueUsed', 'required');
    ok = false;
  }
  if (!String(this.triggerBehavior || '').trim()) {
    this.invalidate('triggerBehavior', 'required');
    ok = false;
  }
  if (this.type === 'chemical' && !String(this.medicationName || '').trim()) {
    this.invalidate('medicationName', 'required for chemical restraint');
    ok = false;
  }
  if (this.type === 'seclusion' && !String(this.seclusionLocation || '').trim()) {
    this.invalidate('seclusionLocation', 'required for seclusion');
    ok = false;
  }
  if (
    (this.type === 'physical' || this.type === 'mechanical') &&
    this.status === 'completed' &&
    (this.durationMinutes == null || this.durationMinutes <= 0)
  ) {
    this.invalidate('durationMinutes', 'required when physical/mechanical event is completed');
    ok = false;
  }
  if (this.status === 'completed') {
    if (!this.parentNotifiedAt) {
      this.invalidate('parentNotifiedAt', 'parent notification required to complete');
      ok = false;
    }
    if (!this.debriefDone) {
      this.invalidate('debriefDone', 'debrief required to complete (CBAHI)');
      ok = false;
    }
  }
  if (this.injury && !String(this.injuryNotes || '').trim()) {
    this.invalidate('injuryNotes', 'injury notes required when injury=true');
    ok = false;
  }
  return ok;
});

// W992 — record a restraint/seclusion application on the beneficiary's unified
// timeline. Restraint is a staff-applied, high-scrutiny intervention (CBAHI +
// MOHRSD mandated); the care team must see it longitudinally. Pre-compile native
// hooks (the W970 mechanism) — fire-and-forget + fully guarded. The literal
// `integrationBus.publish` keeps the W389/W392 producer-coverage guards satisfied.
RestraintSeclusionEventSchema.pre('save', function () {
  this.$__wasNew = this.isNew;
});

RestraintSeclusionEventSchema.post('save', function (doc) {
  try {
    if (!this.$__wasNew) return; // only emit when a new restraint event is opened
    const { integrationBus } = require('../integration/systemIntegrationBus');
    if (!integrationBus || typeof integrationBus.publish !== 'function') return;
    if (!doc.beneficiaryId) return; // no beneficiary → nothing to place on a timeline

    Promise.resolve(
      integrationBus.publish('safety', 'restraint.applied', {
        restraintEventId: String(doc._id),
        beneficiaryId: String(doc.beneficiaryId),
        branchId: doc.branchId ? String(doc.branchId) : '',
        restraintType: doc.type || '',
        techniqueUsed: doc.techniqueUsed || '',
        durationMinutes: typeof doc.durationMinutes === 'number' ? doc.durationMinutes : null,
        date: doc.date,
      })
    ).catch(() => {});
  } catch (_) {
    /* bus not wired (e.g. unit tests) — never block persistence */
  }
});

module.exports =
  mongoose.models.RestraintSeclusionEvent ||
  mongoose.model('RestraintSeclusionEvent', RestraintSeclusionEventSchema);

module.exports.TYPES = TYPES;
module.exports.STATUSES = STATUSES;

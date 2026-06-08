'use strict';

/**
 * FamilyVisitRequest — Wave 201b.
 *
 * "حجز زيارة الأهل لمشاهدة جلسة/فصل" — parents schedule supervised
 * visits to observe their child's therapy session or classroom routine.
 *
 * Common day-rehab workflow:
 *   1. Parent requests slot (date + AM/PM + session type) — status='requested'
 *   2. Center manager approves or declines — status='approved' / 'declined'
 *   3. Visit happens — status='completed' (or 'no_show')
 *
 * Policy: max 2 approved visits per kid per calendar month — enforced
 * at the API layer (not schema, since it depends on a query).
 *
 * Wave-18 invariants:
 *   • status=approved requires approvedBy + approvedAt
 *   • status=declined requires declineReason
 *   • completed/no_show requires the visit was previously approved
 *   • requestedDate must be in the future when status='requested'
 */

const mongoose = require('mongoose');

const SLOTS = ['morning', 'afternoon'];
const STATUSES = ['requested', 'approved', 'declined', 'completed', 'no_show', 'cancelled'];

const FamilyVisitRequestSchema = new mongoose.Schema(
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

    // Requester
    parentName: { type: String, required: true, maxlength: 100 },
    parentNationalId: { type: String, required: true, maxlength: 20 },
    parentPhone: { type: String, default: '', maxlength: 20 },
    relationship: { type: String, default: '', maxlength: 50 }, // father / mother / guardian

    // Visit details
    requestedDate: { type: Date, required: true, index: true },
    slot: { type: String, enum: SLOTS, required: true },
    sessionType: { type: String, default: 'classroom', maxlength: 100 },
    reasonOrPurpose: { type: String, default: '', maxlength: 500 },

    status: { type: String, enum: STATUSES, default: 'requested', index: true },

    // Approval
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedByName: { type: String, default: '', maxlength: 100 },
    approvedAt: { type: Date, default: null },
    declineReason: { type: String, default: '', maxlength: 500 },

    // Post-visit
    actualArrivalTime: { type: Date, default: null },
    actualDepartureTime: { type: Date, default: null },
    staffObservationNotes: { type: String, default: '', maxlength: 1000 },

    notes: { type: String, default: '', maxlength: 500 },
  },
  { timestamps: true, collection: 'family_visit_requests' }
);

FamilyVisitRequestSchema.index({ beneficiaryId: 1, requestedDate: -1 });
FamilyVisitRequestSchema.index({ status: 1, requestedDate: 1 });
FamilyVisitRequestSchema.index({ branchId: 1, requestedDate: 1 });

FamilyVisitRequestSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

FamilyVisitRequestSchema.path('__invariants').validate(function () {
  let ok = true;
  if (this.status === 'approved' && (!this.approvedByName || !this.approvedAt)) {
    this.invalidate('approvedBy', 'approvedByName + approvedAt required when status=approved');
    ok = false;
  }
  if (this.status === 'declined' && !String(this.declineReason || '').trim()) {
    this.invalidate('declineReason', 'required when status=declined');
    ok = false;
  }
  return ok;
});

// W985 — surface family engagement on the unified-core timeline: a completed
// family visit (positive engagement) and a no-show (disengagement signal).
// Fires on the status flip to completed / no_show (once). Native pre-compile
// hooks per the proven W970 pattern; guarded, fire-and-forget. Consumed by
// dddCrossModuleSubscribers → CareTimeline (reuses the existing family_meeting
// eventType, severity by outcome).
FamilyVisitRequestSchema.post('init', function () {
  this.$__prevStatus = this.status;
});
FamilyVisitRequestSchema.post('save', function (doc) {
  try {
    if (doc.status === this.$__prevStatus) return; // no status change
    const { integrationBus } = require('../integration/systemIntegrationBus');
    if (!integrationBus || typeof integrationBus.publish !== 'function') return;
    if (!doc.beneficiaryId) return;
    const base = {
      visitId: String(doc._id),
      beneficiaryId: String(doc.beneficiaryId),
      relationship: doc.relationship || '',
      requestedDate: doc.requestedDate,
    };
    if (doc.status === 'completed') {
      Promise.resolve(integrationBus.publish('family', 'visit.completed', base)).catch(() => {});
    } else if (doc.status === 'no_show') {
      Promise.resolve(integrationBus.publish('family', 'visit.no_show', base)).catch(() => {});
    }
  } catch (_) {
    /* bus not wired — never block persistence */
  }
});

module.exports =
  mongoose.models.FamilyVisitRequest ||
  mongoose.model('FamilyVisitRequest', FamilyVisitRequestSchema);

module.exports.SLOTS = SLOTS;
module.exports.STATUSES = STATUSES;

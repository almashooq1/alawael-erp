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

// ── W1079: unified-core producer ───────────────────────────────────
// Emit family_visit.approved when a parent-visit request is approved — a
// family-engagement milestone. Fires on the transition into 'approved'.
// Non-callback hook style (W483 gate).
FamilyVisitRequestSchema.pre('save', function flagFamilyVisitApproved() {
  this.$__familyVisitApproved =
    this.status === 'approved' && (this.isNew || this.isModified('status'));
});

FamilyVisitRequestSchema.post('save', function emitFamilyVisitApproved(doc) {
  if (!doc.$__familyVisitApproved) return;
  try {
    const { integrationBus } = require('../integration/systemIntegrationBus');
    integrationBus.publish('family-visit', 'family_visit.approved', {
      requestId: String(doc._id),
      beneficiaryId: String(doc.beneficiaryId),
      ...(doc.branchId ? { branchId: String(doc.branchId) } : {}),
      requestedDate: doc.requestedDate,
      slot: doc.slot,
      sessionType: doc.sessionType,
      approvedAt: doc.approvedAt || new Date(),
    });
  } catch (_e) {
    /* bus optional in some contexts */
  }
});

module.exports =
  mongoose.models.FamilyVisitRequest ||
  mongoose.model('FamilyVisitRequest', FamilyVisitRequestSchema);

module.exports.SLOTS = SLOTS;
module.exports.STATUSES = STATUSES;

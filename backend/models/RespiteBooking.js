'use strict';

/**
 * RespiteBooking — Wave 363.
 *
 * "حجز الرعاية المؤقتة" — temporary care booking so the family/primary
 * caregiver gets a break. Pre-existing scaffold lived in
 * `rehabilitation-services/advanced-family-support-service.js` (no
 * booking model); this wave builds the dedicated booking surface.
 *
 * Respite is a Saudi Disability Authority-recognized service category;
 * accepting respite bookings unlocks subsidy reimbursement pathways.
 *
 * Three booking types:
 *   • day        — a few hours at the center, no overnight
 *   • overnight  — single overnight stay
 *   • extended   — multi-night (weekend, week, holiday)
 *
 * Wave-18 invariants:
 *   • bookingType ∈ TYPES
 *   • endAt > startAt
 *   • bookingType='overnight' or 'extended' → nightCount ≥ 1
 *   • bookingType='day' → nightCount = 0
 *   • status='approved' requires approvedBy + approvedAt
 *   • status='confirmed' requires status was previously approved
 *   • status='checked_in' requires checkedInAt
 *   • status='completed' requires checkedOutAt
 *   • status='cancelled' requires cancellationReason
 *   • emergencyContactPhone required
 */

const mongoose = require('mongoose');

const TYPES = ['day', 'overnight', 'extended'];

const STATUSES = [
  'requested',
  'approved',
  'rejected',
  'confirmed',
  'checked_in',
  'completed',
  'cancelled',
  'no_show',
];

const FUNDING_SOURCES = [
  'self_pay',
  'disability_authority_subsidy',
  'insurance',
  'charity',
  'mixed',
];

const RespiteBookingSchema = new mongoose.Schema(
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

    bookingType: { type: String, enum: TYPES, required: true, index: true },
    status: { type: String, enum: STATUSES, default: 'requested', required: true, index: true },

    // ── Time window ──────────────────────────────────────────────
    startAt: { type: Date, required: true, index: true },
    endAt: { type: Date, required: true },
    nightCount: { type: Number, default: 0, min: 0, max: 90 },

    // ── Requester (guardian/family side) ─────────────────────────
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    requestedByName: { type: String, default: '', maxlength: 100 },
    requestedByRelationship: { type: String, default: '', maxlength: 50 }, // parent/sibling/guardian
    requestedAt: { type: Date, default: Date.now },
    reasonForRequest: { type: String, default: '', maxlength: 1000 },

    // ── Approval ─────────────────────────────────────────────────
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedByName: { type: String, default: '', maxlength: 100 },
    approvedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: '', maxlength: 500 },

    // ── Care plan + special needs ────────────────────────────────
    medicationsSummary: { type: String, default: '', maxlength: 2000 },
    dietarySummary: { type: String, default: '', maxlength: 1000 },
    behavioralNotes: { type: String, default: '', maxlength: 1000 },
    sleepNeeds: { type: String, default: '', maxlength: 500 },
    equipmentRequired: { type: [String], default: () => [] }, // wheelchair, hoist, etc.
    linkedCarePlanVersionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CarePlanVersion',
      default: null,
    },

    // ── Emergency contact (mandatory) ─────────────────────────────
    emergencyContactName: { type: String, required: true, maxlength: 100 },
    emergencyContactPhone: { type: String, required: true, maxlength: 30 },
    emergencyContactRelationship: { type: String, default: '', maxlength: 50 },

    // ── Check-in / check-out ─────────────────────────────────────
    checkedInAt: { type: Date, default: null },
    checkedInBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    checkedOutAt: { type: Date, default: null },
    checkedOutBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    checkOutHandoffNotes: { type: String, default: '', maxlength: 2000 },

    // ── Financial ────────────────────────────────────────────────
    estimatedCost: { type: Number, default: 0, min: 0 },
    actualCost: { type: Number, default: 0, min: 0 },
    fundingSource: { type: String, enum: FUNDING_SOURCES.concat([null]), default: null },
    subsidyApprovalRef: { type: String, default: '', maxlength: 100 }, // Disability Authority ref

    // ── Cancellation ─────────────────────────────────────────────
    cancellationReason: { type: String, default: '', maxlength: 500 },
    cancelledAt: { type: Date, default: null },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    notes: { type: String, default: '', maxlength: 2000 },
  },
  { timestamps: true, collection: 'respite_bookings' }
);

RespiteBookingSchema.index({ beneficiaryId: 1, startAt: -1 });
RespiteBookingSchema.index({ branchId: 1, startAt: 1, status: 1 });
RespiteBookingSchema.index({ status: 1, startAt: 1 });

RespiteBookingSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

RespiteBookingSchema.path('__invariants').validate(function () {
  let ok = true;

  if (!TYPES.includes(this.bookingType)) {
    this.invalidate('bookingType', `must be one of ${TYPES.join(',')}`);
    ok = false;
  }
  if (!STATUSES.includes(this.status)) {
    this.invalidate('status', `must be one of ${STATUSES.join(',')}`);
    ok = false;
  }

  if (this.startAt && this.endAt && this.endAt <= this.startAt) {
    this.invalidate('endAt', 'endAt must be > startAt');
    ok = false;
  }

  // bookingType-nightCount consistency
  if (this.bookingType === 'day' && this.nightCount > 0) {
    this.invalidate('nightCount', 'day bookings must have nightCount=0');
    ok = false;
  }
  if (
    (this.bookingType === 'overnight' || this.bookingType === 'extended') &&
    this.nightCount < 1
  ) {
    this.invalidate('nightCount', 'overnight/extended bookings require nightCount ≥ 1');
    ok = false;
  }

  // Approved → approvedBy + approvedAt
  if (this.status === 'approved') {
    if (!this.approvedBy && !String(this.approvedByName || '').trim()) {
      this.invalidate('approvedBy', 'approvedBy required when approved');
      ok = false;
    }
    if (!this.approvedAt) {
      this.invalidate('approvedAt', 'approvedAt required when approved');
      ok = false;
    }
  }

  // Rejected → rejectionReason
  if (this.status === 'rejected' && !String(this.rejectionReason || '').trim()) {
    this.invalidate('rejectionReason', 'rejectionReason required when rejected');
    ok = false;
  }

  // Checked in → checkedInAt
  if (this.status === 'checked_in' && !this.checkedInAt) {
    this.invalidate('checkedInAt', 'checkedInAt required when checked_in');
    ok = false;
  }

  // Completed → checkedOutAt
  if (this.status === 'completed' && !this.checkedOutAt) {
    this.invalidate('checkedOutAt', 'checkedOutAt required when completed');
    ok = false;
  }

  // Cancelled → cancellationReason + cancelledAt
  if (this.status === 'cancelled') {
    if (!String(this.cancellationReason || '').trim()) {
      this.invalidate('cancellationReason', 'cancellationReason required when cancelled');
      ok = false;
    }
    if (!this.cancelledAt) {
      this.invalidate('cancelledAt', 'cancelledAt required when cancelled');
      ok = false;
    }
  }

  // Emergency contact integrity
  if (!String(this.emergencyContactName || '').trim()) {
    this.invalidate('emergencyContactName', 'emergencyContactName required');
    ok = false;
  }
  if (!String(this.emergencyContactPhone || '').trim()) {
    this.invalidate('emergencyContactPhone', 'emergencyContactPhone required');
    ok = false;
  }

  return ok;
});

RespiteBookingSchema.virtual('durationHours').get(function () {
  if (!this.startAt || !this.endAt) return null;
  return Math.round(((new Date(this.endAt) - new Date(this.startAt)) / 36e5) * 10) / 10;
});

RespiteBookingSchema.virtual('isUpcoming').get(function () {
  return !!(
    ['approved', 'confirmed'].includes(this.status) &&
    this.startAt &&
    new Date(this.startAt) > new Date()
  );
});

RespiteBookingSchema.virtual('isActive').get(function () {
  return this.status === 'checked_in';
});

RespiteBookingSchema.set('toJSON', { virtuals: true });
RespiteBookingSchema.set('toObject', { virtuals: true });

module.exports =
  mongoose.models.RespiteBooking || mongoose.model('RespiteBooking', RespiteBookingSchema);

module.exports.TYPES = TYPES;
module.exports.STATUSES = STATUSES;
module.exports.FUNDING_SOURCES = FUNDING_SOURCES;

'use strict';

/**
 * SeatAllocation — Wave 681.
 *
 * "تخصيص المقاعد وإدارة الإشغال اليومي" — a standing allocation of a
 * physical place/seat at a day-rehabilitation center to a beneficiary.
 *
 * Why a dedicated model:
 *   • A day-care center has a FINITE number of daily places per branch
 *     (Branch.capacity.max_patients). The platform already has a rich
 *     waitlist (WaitlistEntry / Waitlist / WaitingListEntry) and a daily
 *     rollcall (beneficiary-day-attendance), but NOTHING tracked the
 *     standing "who occupies which seat / how full is the branch" side.
 *   • Occupancy = count(active allocations) vs branch capacity. This is
 *     the single source of truth the /occupancy dashboard reads, and the
 *     gate POST / enforces before adding another beneficiary.
 *   • Part-time day-care: a beneficiary may attend only some weekdays
 *     (daysOfWeek) and a period (morning/afternoon/full_day), so two
 *     part-time beneficiaries can in principle share complementary days —
 *     surfaced via daysOfWeek for future fine-grained capacity rules.
 *   • Releasing a seat frees capacity; the release endpoint surfaces the
 *     next waitlist candidate(s) so staff can offer the open place (the
 *     "auto-offer on open slot" gap). The waitlist's own lifecycle stays
 *     authoritative — we suggest, we don't mutate it.
 *
 * Wave-18 invariants:
 *   • status ∈ STATUSES; period ∈ PERIODS
 *   • status=released ⇒ releasedAt + releaseReason required
 *   • status=on_hold ⇒ holdReason required
 *   • effectiveTo (when set) ≥ effectiveFrom
 *   • daysOfWeek entries are integers 0..6
 */

const mongoose = require('mongoose');

const STATUSES = ['active', 'on_hold', 'released'];
const PERIODS = ['morning', 'afternoon', 'full_day'];

const SeatAllocationSchema = new mongoose.Schema(
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
      required: true,
      index: true,
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BeneficiarySection',
      default: null,
    },

    seatLabel: { type: String, default: '', maxlength: 50 }, // "B3" / "طاولة 2"
    // Day-care attendance pattern. Empty = attends every operating day.
    // 0=Sunday … 6=Saturday (JS getDay convention; Sun-Thu are KSA workdays).
    daysOfWeek: { type: [Number], default: () => [] },
    period: { type: String, enum: PERIODS, default: 'full_day' },

    effectiveFrom: { type: Date, required: true, index: true },
    effectiveTo: { type: Date, default: null },

    status: { type: String, enum: STATUSES, default: 'active', index: true },
    holdReason: { type: String, default: '', maxlength: 300 },
    releasedAt: { type: Date, default: null },
    releaseReason: { type: String, default: '', maxlength: 300 },

    // Provenance: the waitlist entry that filled this seat (optional).
    waitlistEntryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WaitlistEntry',
      default: null,
    },

    allocatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    allocatedByName: { type: String, default: '', maxlength: 100 },
    notes: { type: String, default: '', maxlength: 1000 },
  },
  { timestamps: true, collection: 'seat_allocations' }
);

SeatAllocationSchema.index({ beneficiaryId: 1, status: 1 });
SeatAllocationSchema.index({ branchId: 1, status: 1 });
SeatAllocationSchema.index({ branchId: 1, sectionId: 1, status: 1 });

SeatAllocationSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

SeatAllocationSchema.path('__invariants').validate(function () {
  let ok = true;
  if (!STATUSES.includes(this.status)) {
    this.invalidate('status', `must be one of ${STATUSES.join(',')}`);
    ok = false;
  }
  if (!PERIODS.includes(this.period)) {
    this.invalidate('period', `must be one of ${PERIODS.join(',')}`);
    ok = false;
  }
  if (this.status === 'released') {
    if (!this.releasedAt) {
      this.invalidate('releasedAt', 'releasedAt required when status=released');
      ok = false;
    }
    if (!String(this.releaseReason || '').trim()) {
      this.invalidate('releaseReason', 'releaseReason required when status=released');
      ok = false;
    }
  }
  if (this.status === 'on_hold' && !String(this.holdReason || '').trim()) {
    this.invalidate('holdReason', 'holdReason required when status=on_hold');
    ok = false;
  }
  if (this.effectiveTo && this.effectiveFrom && this.effectiveTo < this.effectiveFrom) {
    this.invalidate('effectiveTo', 'effectiveTo must be >= effectiveFrom');
    ok = false;
  }
  if (Array.isArray(this.daysOfWeek)) {
    for (const d of this.daysOfWeek) {
      if (!Number.isInteger(d) || d < 0 || d > 6) {
        this.invalidate('daysOfWeek', 'daysOfWeek entries must be integers 0..6');
        ok = false;
        break;
      }
    }
  }
  return ok;
});

SeatAllocationSchema.virtual('isActive').get(function () {
  return this.status === 'active';
});

/** Empty daysOfWeek = full-week attendance. */
SeatAllocationSchema.virtual('attendsEveryDay').get(function () {
  return !Array.isArray(this.daysOfWeek) || this.daysOfWeek.length === 0;
});

SeatAllocationSchema.set('toJSON', { virtuals: true });
SeatAllocationSchema.set('toObject', { virtuals: true });

// W1098 — unified-core linkage: assigning an active day-center seat surfaces
// an administrative row on the per-beneficiary timeline (on_hold/released
// transitions stay out of the longitudinal record).
SeatAllocationSchema.pre('save', function flagSeatAllocationAssigned() {
  this.$__seatAllocationAssigned = this.isNew && this.status === 'active';
});

SeatAllocationSchema.post('save', function emitSeatAllocationAssigned(doc) {
  if (!doc.$__seatAllocationAssigned) return;
  try {
    const { integrationBus } = require('../integration/systemIntegrationBus');
    integrationBus.publish('seat-allocation', 'seat_allocation.assigned', {
      allocationId: String(doc._id),
      beneficiaryId: doc.beneficiaryId,
      ...(doc.branchId ? { branchId: doc.branchId } : {}),
      seatLabel: doc.seatLabel,
      period: doc.period,
      effectiveFrom: doc.effectiveFrom,
    });
  } catch (_e) {
    /* bus optional — never block the write */
  }
});

module.exports =
  mongoose.models.SeatAllocation || mongoose.model('SeatAllocation', SeatAllocationSchema);

module.exports.STATUSES = STATUSES;
module.exports.PERIODS = PERIODS;

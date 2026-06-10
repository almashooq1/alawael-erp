'use strict';

/**
 * Sponsorship — Wave 682.
 *
 * "الكفالة" — a standing sponsorship linking a Donor (the sponsor /
 * كافل) to a specific Beneficiary (the sponsored / مكفول), with a
 * monthly commitment and a payment ledger.
 *
 * Why a dedicated model (the 2026-05-31 audit gap):
 *   • The platform already has Donor + Donation + Campaign + Scholarship
 *     + BeneficiarySubsidyEntry + a zakat calculator. But NONE links a
 *     donor to a SPECIFIC beneficiary over time — Donation has no
 *     beneficiaryId, so "who sponsors whom, how much per month, for how
 *     long" (kafala) was unrepresentable.
 *   • Kafala is the dominant funding model for Saudi charitable rehab
 *     centers; it needs: the donor↔beneficiary pair, a recurring monthly
 *     amount, a coverage scope, a status lifecycle, and a payment ledger
 *     that can cross-link individual Donation receipts.
 *   • isZakat distinguishes zakat-funded kafala (eligibility + reporting)
 *     from sadaqah/general — so finance can segregate zakat disbursement.
 *
 * Relationship: each recorded payment may reference a Donation receipt
 * (payments[].donationId) so the kafala ledger reconciles with the
 * canonical donation records.
 *
 * Wave-18 invariants:
 *   • status ∈ STATUSES; sponsorshipType ∈ TYPES
 *   • recurring type (full|partial) ⇒ monthlyAmount > 0
 *   • status=paused ⇒ pauseReason required
 *   • status=cancelled ⇒ cancelReason required
 *   • endDate (when set) ≥ startDate
 */

const mongoose = require('mongoose');

const TYPES = ['full', 'partial', 'one_time', 'in_kind'];
const RECURRING_TYPES = ['full', 'partial'];
const STATUSES = ['pending', 'active', 'paused', 'completed', 'cancelled'];

// Allowed status transitions (BFS-reachable from 'pending').
const TRANSITIONS = Object.freeze({
  pending: ['active', 'cancelled'],
  active: ['paused', 'completed', 'cancelled'],
  paused: ['active', 'completed', 'cancelled'],
  completed: [],
  cancelled: [],
});

const COVERAGE_ITEMS = [
  'center_fees',
  'transport',
  'therapy',
  'assistive_devices',
  'meals',
  'education',
  'medical',
  'other',
];

const PaymentSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    amount: { type: Number, required: true, min: 0 },
    method: { type: String, default: '', maxlength: 50 }, // bank/cash/card/...
    donationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Donation', default: null },
    reference: { type: String, default: '', maxlength: 100 }, // receipt / transfer ref
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    notes: { type: String, default: '', maxlength: 300 },
  },
  { _id: true }
);

const SponsorshipSchema = new mongoose.Schema(
  {
    donorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Donor',
      required: true,
      index: true,
    },
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

    sponsorshipType: { type: String, enum: TYPES, default: 'full', index: true },
    monthlyAmount: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'SAR', maxlength: 3 },
    coverageItems: { type: [String], enum: COVERAGE_ITEMS, default: () => [] },

    // Zakat-funded kafala is segregated for eligibility + PDPL/finance reporting.
    isZakat: { type: Boolean, default: false },

    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, default: null },

    status: { type: String, enum: STATUSES, default: 'pending', index: true },
    pauseReason: { type: String, default: '', maxlength: 300 },
    cancelReason: { type: String, default: '', maxlength: 300 },
    completedAt: { type: Date, default: null },

    agreementRef: { type: String, default: '', maxlength: 200 }, // signed agreement doc

    payments: { type: [PaymentSchema], default: () => [] },

    createdByName: { type: String, default: '', maxlength: 100 },
    notes: { type: String, default: '', maxlength: 1000 },
  },
  { timestamps: true, collection: 'sponsorships' }
);

SponsorshipSchema.index({ donorId: 1, status: 1 });
SponsorshipSchema.index({ beneficiaryId: 1, status: 1 });
SponsorshipSchema.index({ branchId: 1, status: 1 });
SponsorshipSchema.index({ status: 1, startDate: -1 });

SponsorshipSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

SponsorshipSchema.path('__invariants').validate(function () {
  let ok = true;
  if (!STATUSES.includes(this.status)) {
    this.invalidate('status', `must be one of ${STATUSES.join(',')}`);
    ok = false;
  }
  if (!TYPES.includes(this.sponsorshipType)) {
    this.invalidate('sponsorshipType', `must be one of ${TYPES.join(',')}`);
    ok = false;
  }
  if (RECURRING_TYPES.includes(this.sponsorshipType) && !(this.monthlyAmount > 0)) {
    this.invalidate('monthlyAmount', 'monthlyAmount must be > 0 for full/partial sponsorship');
    ok = false;
  }
  if (this.status === 'paused' && !String(this.pauseReason || '').trim()) {
    this.invalidate('pauseReason', 'pauseReason required when status=paused');
    ok = false;
  }
  if (this.status === 'cancelled' && !String(this.cancelReason || '').trim()) {
    this.invalidate('cancelReason', 'cancelReason required when status=cancelled');
    ok = false;
  }
  if (this.endDate && this.startDate && this.endDate < this.startDate) {
    this.invalidate('endDate', 'endDate must be >= startDate');
    ok = false;
  }
  return ok;
});

/** Sum of recorded payments (the kafala ledger total). */
SponsorshipSchema.virtual('totalPaid').get(function () {
  if (!Array.isArray(this.payments)) return 0;
  return this.payments.reduce((sum, p) => sum + (typeof p.amount === 'number' ? p.amount : 0), 0);
});

SponsorshipSchema.virtual('isActive').get(function () {
  return this.status === 'active';
});

/** An active sponsorship whose endDate has passed (needs renewal/closure). */
SponsorshipSchema.virtual('isExpired').get(function () {
  if (!this.endDate) return false;
  if (this.status === 'completed' || this.status === 'cancelled') return false;
  return new Date(this.endDate).getTime() < Date.now();
});

SponsorshipSchema.set('toJSON', { virtuals: true });
SponsorshipSchema.set('toObject', { virtuals: true });

// ── W1075: unified-core producer ───────────────────────────────────
// Emit sponsorship.activated when a kafala becomes active so the
// per-beneficiary CareTimeline records the milestone (a donor now
// covers them). Non-callback hook style (W483 gate): the global async
// save plugin puts the whole hook chain in promise-adapter mode.
SponsorshipSchema.pre('save', function flagSponsorshipActivated() {
  this.$__sponsorshipActivatedNow =
    this.status === 'active' && (this.isNew || this.isModified('status'));
});

SponsorshipSchema.post('save', function emitSponsorshipActivated(doc) {
  if (!doc.$__sponsorshipActivatedNow) return;
  try {
    const { integrationBus } = require('../integration/systemIntegrationBus');
    integrationBus.publish('sponsorship', 'sponsorship.activated', {
      sponsorshipId: String(doc._id),
      beneficiaryId: String(doc.beneficiaryId),
      ...(doc.branchId ? { branchId: String(doc.branchId) } : {}),
      sponsorshipType: doc.sponsorshipType,
      monthlyAmount: doc.monthlyAmount,
      currency: doc.currency,
      isZakat: !!doc.isZakat,
      startDate: doc.startDate,
      activatedAt: doc.updatedAt || new Date(),
    });
  } catch (_e) {
    /* bus optional in some contexts */
  }
});

module.exports = mongoose.models.Sponsorship || mongoose.model('Sponsorship', SponsorshipSchema);

module.exports.TYPES = TYPES;
module.exports.RECURRING_TYPES = RECURRING_TYPES;
module.exports.STATUSES = STATUSES;
module.exports.TRANSITIONS = TRANSITIONS;
module.exports.COVERAGE_ITEMS = COVERAGE_ITEMS;

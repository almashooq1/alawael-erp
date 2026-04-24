'use strict';

/**
 * WelfareApplication.model.js — Phase 17 Commit 4 (4.0.86).
 *
 * One document per welfare / benefits application filed on behalf
 * of a beneficiary. Optional SocialCase linkage (not every app
 * is tied to a case — some are standalone welfare-only tracks).
 *
 * Design notes:
 *   • Amount tracked twice: `requestedAmount` (what we asked for)
 *     and `approvedAmount` / `disbursedAmount` (what agency gave
 *     us). Useful for partial-approval analytics.
 *   • `appealHistory[]` tracks up to N rounds of appeals.
 *   • `disbursements[]` tracks recurring payments (monthly
 *     pensions etc.) — lets you see disbursement continuity.
 *
 * Auto-numbered `WA-YYYY-NNNNN`.
 */

const mongoose = require('mongoose');
const {
  APPLICATION_TYPES,
  TARGET_AGENCIES,
  APPLICATION_STATUSES,
  DISBURSEMENT_FREQUENCIES,
  CANCELLATION_REASONS,
} = require('../../config/care/welfare.registry');

// ── Sub-schemas ─────────────────────────────────────────────────────

const statusHistorySchema = new mongoose.Schema(
  {
    from: { type: String, required: true },
    to: { type: String, required: true },
    event: { type: String, required: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    at: { type: Date, required: true, default: Date.now },
    notes: { type: String, default: null },
  },
  { _id: false }
);

const appealEntrySchema = new mongoose.Schema(
  {
    filedAt: { type: Date, required: true, default: Date.now },
    filedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reason: { type: String, required: true },
    supportingDocuments: { type: [String], default: [] },
    outcome: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    decidedAt: { type: Date, default: null },
    decisionNotes: { type: String, default: null },
  },
  { _id: true }
);

const disbursementSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'SAR' },
    disbursedAt: { type: Date, required: true },
    receiptReference: { type: String, default: null },
    notes: { type: String, default: null },
  },
  { _id: true }
);

const documentSchema = new mongoose.Schema(
  {
    kind: { type: String, required: true }, // e.g., 'national_id', 'salary_certificate'
    fileName: { type: String, required: true },
    fileUrl: { type: String, default: null },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { _id: true }
);

// ── Main schema ─────────────────────────────────────────────────────

const welfareAppSchema = new mongoose.Schema(
  {
    applicationNumber: { type: String, required: true, unique: true, uppercase: true },

    // ── subject ─────────────────────────────────────────────────
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    guardianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Guardian',
      default: null,
    },
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SocialCase',
      default: null,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
      index: true,
    },

    // ── classification ──────────────────────────────────────────
    applicationType: { type: String, enum: APPLICATION_TYPES, required: true, index: true },
    targetAgency: { type: String, enum: TARGET_AGENCIES, required: true, index: true },
    agencyPartnerName: { type: String, default: null }, // charity / partner name for 'charity' agency
    agencyApplicationRef: { type: String, default: null }, // reference/ticket number from the agency

    // ── amounts ─────────────────────────────────────────────────
    requestedAmount: { type: Number, default: null, min: 0 },
    approvedAmount: { type: Number, default: null, min: 0 },
    disbursedAmount: { type: Number, default: null, min: 0 },
    currency: { type: String, default: 'SAR' },
    frequency: {
      type: String,
      enum: DISBURSEMENT_FREQUENCIES,
      default: 'one_time',
    },

    // ── state ───────────────────────────────────────────────────
    status: {
      type: String,
      enum: APPLICATION_STATUSES,
      default: 'draft',
      index: true,
    },
    statusHistory: { type: [statusHistorySchema], default: [] },

    // ── timing ──────────────────────────────────────────────────
    submittedAt: { type: Date, default: null },
    approvedAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },

    // ── rejection / cancellation ────────────────────────────────
    rejectionReason: { type: String, default: null },
    rejectionNotes: { type: String, default: null },
    cancellationReason: {
      type: String,
      enum: [...CANCELLATION_REASONS, null],
      default: null,
    },

    // ── appeals + disbursements + documents ────────────────────
    appeals: { type: [appealEntrySchema], default: [] },
    appealReason: { type: String, default: null }, // required-field gate for first appeal
    disbursements: { type: [disbursementSchema], default: [] },
    disbursedAt: { type: Date, default: null }, // first disbursement (shortcut for KPIs)
    documents: { type: [documentSchema], default: [] },

    // ── ownership ──────────────────────────────────────────────
    assignedToUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },

    // ── misc ────────────────────────────────────────────────────
    notes: { type: String, default: null },
    tags: { type: [String], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true, collection: 'care_welfare_applications' }
);

// ── indexes ────────────────────────────────────────────────────────

welfareAppSchema.index({ beneficiaryId: 1, status: 1 });
welfareAppSchema.index({ caseId: 1, status: 1 });
welfareAppSchema.index({ branchId: 1, status: 1 });
welfareAppSchema.index({ targetAgency: 1, status: 1 });
welfareAppSchema.index({ status: 1, submittedAt: -1 });

// ── auto-numbering WA-YYYY-NNNNN ───────────────────────────────────

welfareAppSchema.pre('validate', async function () {
  if (this.applicationNumber) return;
  const year = (this.submittedAt || new Date()).getUTCFullYear();
  const Model = mongoose.model('WelfareApplication');
  const count = await Model.countDocuments({
    applicationNumber: { $regex: `^WA-${year}-` },
  });
  this.applicationNumber = `WA-${year}-${String(count + 1).padStart(5, '0')}`;
});

// ── virtuals ───────────────────────────────────────────────────────

welfareAppSchema.virtual('ageDays').get(function () {
  return Math.floor((Date.now() - this.createdAt.getTime()) / 86400000);
});

welfareAppSchema.virtual('isTerminal').get(function () {
  return ['disbursed', 'appeal_approved', 'appeal_rejected', 'closed', 'cancelled'].includes(
    this.status
  );
});

welfareAppSchema.virtual('totalDisbursed').get(function () {
  return (this.disbursements || []).reduce((s, d) => s + (d.amount || 0), 0);
});

welfareAppSchema.virtual('hasActiveAppeal').get(function () {
  return (this.appeals || []).some(a => a.outcome === 'pending');
});

welfareAppSchema.set('toJSON', { virtuals: true });
welfareAppSchema.set('toObject', { virtuals: true });

const WelfareApplication =
  mongoose.models.WelfareApplication || mongoose.model('WelfareApplication', welfareAppSchema);

module.exports = WelfareApplication;

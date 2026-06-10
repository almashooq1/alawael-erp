/**
 * BeneficiaryContract.js — Beneficiary service agreement with the center.
 *
 * Beneficiary-360 Commit 27. Powers `operational.contract.expiring.30d`.
 *
 * Distinct from:
 *   • Contract.model.js — supplier / procurement contracts
 *   • EmploymentContract.js — HR employment contracts
 *
 * This collection captures the SERVICE AGREEMENT between a
 * beneficiary's family and the center: what services, what window,
 * what payment terms, signed by which guardian.
 *
 * Design decisions:
 *
 *   1. **Status state machine**:
 *        draft → active → expired
 *                       → renewed (a new contract supersedes)
 *                       → terminated (early cancellation)
 *      The adapter counts only `active` contracts for the
 *      expiry flag.
 *
 *   2. **`startDate` + `endDate` required on save.** `endDate` is
 *      what the flag clocks against — fire when `endDate - now ≤
 *      30 days`.
 *
 *   3. **`signedAt` + `signedBy` optional** — legacy paper-to-
 *      digital imports may not have them. The flag cares about
 *      the end date, not signature completeness; a separate flag
 *      can track unsigned contracts later.
 *
 *   4. **`contractNumber` unique** — required for auditability
 *      and receipt cross-reference.
 */

'use strict';

const mongoose = require('mongoose');

const BENEFICIARY_CONTRACT_STATUSES = Object.freeze([
  'draft',
  'active',
  'expired',
  'renewed',
  'terminated',
]);

const beneficiaryContractSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    contractNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: BENEFICIARY_CONTRACT_STATUSES,
      default: 'draft',
      index: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    totalAmount: { type: Number, default: null },
    currency: { type: String, default: 'SAR' },
    signedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Guardian',
      default: null,
    },
    signedAt: { type: Date, default: null },
    supersededBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BeneficiaryContract',
      default: null,
    },
    notes: { type: String, default: null },
  },
  { timestamps: true, collection: 'beneficiary_contracts' }
);

// Primary flag query: active contracts for this beneficiary,
// sorted by expiry ascending (most urgent first).
beneficiaryContractSchema.index({ beneficiaryId: 1, status: 1, endDate: 1 });

// ── W1073: unified-core producer ───────────────────────────────────
// Emit beneficiary-contract.activated when a service agreement moves to
// 'active' so the per-beneficiary CareTimeline records the enrollment /
// renewal anchor. Non-callback hook style (W483 gate): the global async
// save plugin puts the whole hook chain in promise-adapter mode.
beneficiaryContractSchema.pre('save', function flagContractActivated() {
  this.$__contractActivatedNow =
    this.status === 'active' && (this.isNew || this.isModified('status'));
});

beneficiaryContractSchema.post('save', function emitBeneficiaryContractActivated(doc) {
  if (!doc.$__contractActivatedNow) return;
  try {
    const { integrationBus } = require('../integration/systemIntegrationBus');
    integrationBus.publish('beneficiary-contract', 'beneficiary_contract.activated', {
      contractId: String(doc._id),
      beneficiaryId: String(doc.beneficiaryId),
      contractNumber: doc.contractNumber,
      startDate: doc.startDate,
      endDate: doc.endDate,
      totalAmount: doc.totalAmount,
      currency: doc.currency,
      activatedAt: doc.signedAt || doc.updatedAt || new Date(),
    });
  } catch (_e) {
    /* bus optional in some contexts */
  }
});

const BeneficiaryContract =
  mongoose.models.BeneficiaryContract ||
  mongoose.model('BeneficiaryContract', beneficiaryContractSchema);

module.exports = {
  BeneficiaryContract,
  BENEFICIARY_CONTRACT_STATUSES,
};

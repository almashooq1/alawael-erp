'use strict';

const mongoose = require('mongoose');

const beneficiaryTransferSchema = new mongoose.Schema(
  {
    // FK field names are BARE (beneficiary/fromBranch/toBranch) to match the
    // service writer + both list routes, which were always bare. Direction A of
    // docs/architecture/findings/beneficiary-transfer-field-drift-2026-06-06.md
    // (schema→bare, non-breaking): the prior *Id schema names were silently
    // stripped on write under strict:true → transfers persisted no FK at all.
    beneficiary: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
    },
    fromBranch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    toBranch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reason: { type: String, required: true },
    transferDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'completed', 'cancelled', 'reversed'],
      default: 'pending',
    },
    rejectionReason: { type: String, default: null },
    transferNotes: { type: mongoose.Schema.Types.Mixed, default: null },
    transferRecords: { type: Boolean, default: true }, // نقل السجلات
    continuePlan: { type: Boolean, default: true }, // استمرار الخطة العلاجية
    approvedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

beneficiaryTransferSchema.index({ beneficiary: 1, status: 1 });
beneficiaryTransferSchema.index({ fromBranch: 1, status: 1 });
beneficiaryTransferSchema.index({ toBranch: 1, status: 1 });

// ── W1135: unified-core linkage — transfer.completed ──────────────────────
// Transfers complete via TWO writer paths: BeneficiaryService uses doc.save()
// (save hooks below) and branch-enhanced.service uses findByIdAndUpdate (query
// hook below). Both emit the same event; the status guard ('approved' →
// 'completed' is a one-way terminal transition) prevents double-emit.
// Async hook style per W483 doctrine.

function emitTransferCompleted(doc) {
  try {
    // Lazy require — keeps the model loadable in isolation (tests/scripts).
    const { integrationBus } = require('../integration/systemIntegrationBus');
    integrationBus.publish('beneficiary-transfer', 'transfer.completed', {
      transferId: String(doc._id),
      beneficiaryId: String(doc.beneficiary),
      ...(doc.fromBranch ? { fromBranchId: String(doc.fromBranch) } : {}),
      ...(doc.toBranch ? { toBranchId: String(doc.toBranch) } : {}),
      ...(doc.transferDate ? { transferDate: doc.transferDate } : {}),
      continuePlan: doc.continuePlan !== false,
      transferRecords: doc.transferRecords !== false,
      completedAt: doc.completedAt || new Date(),
    });
  } catch (err) {
    // Never block the write on bus failure.
    void err;
  }
}

beneficiaryTransferSchema.pre('save', async function flagTransferCompleted() {
  this.$__transferCompleted =
    this.status === 'completed' && this.isModified('status') && Boolean(this.beneficiary);
});

beneficiaryTransferSchema.post('save', function onTransferSaved(doc) {
  if (!doc.$__transferCompleted) return;
  doc.$__transferCompleted = false;
  emitTransferCompleted(doc);
});

beneficiaryTransferSchema.post('findOneAndUpdate', async function onTransferUpdated(doc) {
  if (!doc) return;
  const update = this.getUpdate() || {};
  const set = update.$set || update;
  if (set.status !== 'completed') return;
  // doc may be the PRE-update snapshot (default returnDocument) — only
  // immutable identity fields are read; completedAt comes from the update.
  emitTransferCompleted({
    _id: doc._id,
    beneficiary: doc.beneficiary,
    fromBranch: doc.fromBranch,
    toBranch: doc.toBranch,
    transferDate: doc.transferDate,
    continuePlan: doc.continuePlan,
    transferRecords: doc.transferRecords,
    completedAt: set.completedAt || new Date(),
  });
});

module.exports =
  mongoose.models.BeneficiaryTransfer ||
  mongoose.model('BeneficiaryTransfer', beneficiaryTransferSchema);

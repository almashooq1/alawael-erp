'use strict';

/**
 * PurchaseRequest.model.js — Phase 16 Commit 4 (4.0.69).
 *
 * A Purchase Request (PR) is the pre-PO artifact a department
 * creates when they need to buy something. It carries:
 *
 *   • what they need (items[])
 *   • why (justification)
 *   • roughly how much (estimatedValue)
 *   • who should sign off (approvals[], derived from the tier)
 *   • the current workflow position (status)
 *   • a chain-of-custody history (statusHistory[])
 *
 * Once every required approval is in, the PR flips to `approved`
 * and can be converted into one (or more, via split) PurchaseOrder
 * document(s). The conversion is what the procurement team
 * actually sends to vendors — a PR stays internal.
 *
 * Design notes:
 *
 *   1. **Canonical-lowercase statuses** aligned with the rest of
 *      Phase 16 (WO + Facility). The old archived model used
 *      SCREAMING_CASE; we don't restore that.
 *
 *   2. **Approval chain is snapshotted at submit-time** so a
 *      later tier-threshold change doesn't retroactively require
 *      a new signature.
 *
 *   3. **SLA backlinks** — two ids stored: `prSlaId` for the
 *      approval-cycle clock (activated on submit, resolved on
 *      approved/rejected), and `poSlaId` for the PO-issuance
 *      clock (activated on approved, resolved on converted_to_po).
 *
 *   4. **statusHistory[]** is append-only — every transition
 *      writes one row (from/to/event/actor/notes/at) so auditors
 *      get a timeline without joining other collections.
 */

const mongoose = require('mongoose');
const {
  PR_STATUSES,
  PURCHASE_METHODS,
  PRIORITIES,
} = require('../../config/purchaseRequest.registry');

const itemSchema = new mongoose.Schema(
  {
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', default: null },
    itemCode: { type: String, default: null },
    itemName: { type: String, required: true },
    description: { type: String, default: null },
    specifications: { type: String, default: null },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, default: 'piece' },
    estimatedUnitPrice: { type: Number, default: 0, min: 0 },
    estimatedTotal: { type: Number, default: 0, min: 0 },
    notes: { type: String, default: null },
  },
  { _id: true }
);

const approvalStepSchema = new mongoose.Schema(
  {
    level: { type: Number, required: true },
    role: { type: String, required: true },
    label: { type: String, default: null },
    approverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approverNameSnapshot: { type: String, default: null },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'returned', 'skipped'],
      default: 'pending',
      index: true,
    },
    decidedAt: { type: Date, default: null },
    comments: { type: String, default: null },
  },
  { _id: true }
);

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

const purchaseRequestSchema = new mongoose.Schema(
  {
    // ── identity ─────────────────────────────────────────────────
    requestNumber: { type: String, required: true, unique: true, uppercase: true },
    requestDate: { type: Date, default: Date.now },
    requiredDate: { type: Date, required: true },

    // ── status machine ───────────────────────────────────────────
    status: {
      type: String,
      enum: PR_STATUSES,
      default: 'draft',
      index: true,
    },
    statusHistory: { type: [statusHistorySchema], default: [] },

    priority: { type: String, enum: PRIORITIES, default: 'normal' },
    isUrgent: { type: Boolean, default: false },

    // ── requester + org ───────────────────────────────────────────
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },
    department: { type: String, default: null },
    costCenter: { type: String, default: null },
    requester: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      nameSnapshot: { type: String, default: null },
      email: { type: String, default: null },
      phone: { type: String, default: null },
      departmentSnapshot: { type: String, default: null },
    },

    // ── items + value ────────────────────────────────────────────
    items: { type: [itemSchema], default: [] },
    summary: {
      totalItems: { type: Number, default: 0 },
      totalQuantity: { type: Number, default: 0 },
      estimatedValue: { type: Number, default: 0 },
      taxRate: { type: Number, default: 15 },
      estimatedTax: { type: Number, default: 0 },
      estimatedTotal: { type: Number, default: 0 },
    },
    currency: { type: String, default: 'SAR' },

    // ── procurement method ───────────────────────────────────────
    purchaseMethod: {
      type: String,
      enum: PURCHASE_METHODS,
      default: 'competitive_bidding',
    },
    minimumSuppliers: { type: Number, default: 3 },

    // ── approval chain (snapshot at submit-time) ─────────────────
    approvalTier: { type: String, default: null }, // tier name
    approvals: { type: [approvalStepSchema], default: [] },
    currentApprovalLevel: { type: Number, default: 1 },

    // ── justification / attachments ──────────────────────────────
    justification: { type: String, default: null },
    businessCase: { type: String, default: null },
    attachments: { type: [mongoose.Schema.Types.Mixed], default: [] },
    notes: { type: String, default: null },

    // ── SLA backlinks ────────────────────────────────────────────
    prSlaId: { type: mongoose.Schema.Types.ObjectId, ref: 'SLA', default: null, index: true },
    poSlaId: { type: mongoose.Schema.Types.ObjectId, ref: 'SLA', default: null, index: true },

    // ── PO link ──────────────────────────────────────────────────
    relatedPurchaseOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
      default: null,
      index: true,
    },
    relatedPurchaseOrderNumber: { type: String, default: null },
    convertedAt: { type: Date, default: null },
    convertedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // ── misc ─────────────────────────────────────────────────────
    projectCode: { type: String, default: null },
    contractReference: { type: String, default: null },
    tags: { type: [String], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    submittedAt: { type: Date, default: null },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true, collection: 'purchase_requests' }
);

// ── indexes ─────────────────────────────────────────────────────────
purchaseRequestSchema.index({ branchId: 1, status: 1 });
purchaseRequestSchema.index({ department: 1, status: 1 });
purchaseRequestSchema.index({ requiredDate: 1 });
purchaseRequestSchema.index({ 'summary.estimatedValue': -1 });

// ── auto-numbering ──────────────────────────────────────────────────
purchaseRequestSchema.pre('validate', async function () {
  if (this.requestNumber) return;
  const year = (this.requestDate || new Date()).getUTCFullYear();
  const Model = mongoose.model('PurchaseRequest');
  const count = await Model.countDocuments({
    requestNumber: { $regex: `^PR-${year}-` },
  });
  this.requestNumber = `PR-${year}-${String(count + 1).padStart(5, '0')}`;
});

// ── auto-summary ────────────────────────────────────────────────────
purchaseRequestSchema.pre('save', function () {
  const items = this.items || [];
  let qty = 0;
  let value = 0;
  for (const it of items) {
    qty += Number(it.quantity) || 0;
    const lineTotal =
      Number(it.estimatedTotal) ||
      (Number(it.quantity) || 0) * (Number(it.estimatedUnitPrice) || 0);
    value += lineTotal;
    it.estimatedTotal = lineTotal;
  }
  const taxRate = this.summary?.taxRate ?? 15;
  const tax = value * (taxRate / 100);
  this.summary = {
    totalItems: items.length,
    totalQuantity: qty,
    estimatedValue: value,
    taxRate,
    estimatedTax: tax,
    estimatedTotal: value + tax,
  };
});

// ── virtuals ────────────────────────────────────────────────────────
purchaseRequestSchema.virtual('isFullyApproved').get(function () {
  if (!this.approvals || this.approvals.length === 0) return false;
  return this.approvals.every(a => a.status === 'approved');
});

purchaseRequestSchema.virtual('approvalProgressPct').get(function () {
  if (!this.approvals || this.approvals.length === 0) return 0;
  const done = this.approvals.filter(a => ['approved', 'skipped'].includes(a.status)).length;
  return Math.round((done / this.approvals.length) * 100);
});

purchaseRequestSchema.set('toJSON', { virtuals: true });
purchaseRequestSchema.set('toObject', { virtuals: true });

const PurchaseRequest =
  mongoose.models.PurchaseRequest || mongoose.model('PurchaseRequest', purchaseRequestSchema);

module.exports = PurchaseRequest;

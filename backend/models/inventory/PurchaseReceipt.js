'use strict';

/**
 * PurchaseReceipt — goods receipt note (GRN) for legacy /api/v1/purchasing/receipts.
 * W781 — linked to InventoryModulePurchaseOrder when po_id provided.
 */

const mongoose = require('mongoose');

const receiptItemSchema = new mongoose.Schema(
  {
    item_name: { type: String, required: true },
    quantity_ordered: { type: Number, default: 0 },
    quantity_received: { type: Number, default: 0 },
    unit_cost: { type: Number, default: 0 },
  },
  { _id: true }
);

const purchaseReceiptSchema = new mongoose.Schema(
  {
    receipt_number: { type: String, unique: true },
    purchase_order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryModulePurchaseOrder',
    },
    po_number: { type: String },
    vendor_name: { type: String },
    warehouse_name: { type: String },
    branch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    receipt_date: { type: Date, default: Date.now },
    items: [receiptItemSchema],
    total_amount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['pending', 'partial', 'complete'],
      default: 'pending',
    },
    received_by_name: { type: String },
    quality_check: {
      type: String,
      enum: ['pending', 'passed', 'failed'],
      default: 'pending',
    },
    notes: { type: String },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true }
);

purchaseReceiptSchema.pre('save', async function () {
  if (!this.receipt_number) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('PurchaseReceipt').countDocuments();
    this.receipt_number = `GRN-${year}-${String(count + 1).padStart(3, '0')}`;
  }
  const lines = this.items || [];
  let received = 0;
  let ordered = 0;
  let total = 0;
  lines.forEach(line => {
    ordered += line.quantity_ordered || 0;
    received += line.quantity_received || 0;
    total += (line.quantity_received || 0) * (line.unit_cost || 0);
  });
  this.total_amount = total || this.total_amount;
  if (!lines.length) {
    this.status = this.status || 'pending';
  } else if (received >= ordered && ordered > 0) {
    this.status = 'complete';
  } else if (received > 0) {
    this.status = 'partial';
  } else {
    this.status = 'pending';
  }
});

purchaseReceiptSchema.index({ branch_id: 1, receipt_date: -1 });
purchaseReceiptSchema.index({ deleted_at: 1 });

module.exports =
  mongoose.models.PurchaseReceipt || mongoose.model('PurchaseReceipt', purchaseReceiptSchema);

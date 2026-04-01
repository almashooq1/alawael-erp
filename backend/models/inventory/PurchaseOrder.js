/**
 * PurchaseOrder Model — نموذج أوامر الشراء
 * Rehab-ERP v2.0
 */

const mongoose = require('mongoose');

const purchaseOrderSchema = new mongoose.Schema(
  {
    po_number: { type: String, unique: true }, // PO-YYYY-XXXXXX
    supplier_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
    supplier_name: { type: String },

    status: {
      type: String,
      enum: [
        'draft',
        'pending_approval',
        'approved',
        'sent',
        'partial',
        'received',
        'cancelled',
        'closed',
      ],
      default: 'draft',
    },

    items: [
      {
        item_id: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' },
        item_name_ar: String,
        item_code: String,
        quantity_ordered: { type: Number, required: true },
        quantity_received: { type: Number, default: 0 },
        unit_cost: { type: Number, required: true },
        total_cost: { type: Number },
        unit_of_measure: String,
        notes: String,
      },
    ],

    subtotal: { type: Number, default: 0 },
    discount_amount: { type: Number, default: 0 },
    tax_rate: { type: Number, default: 15 }, // VAT 15%
    tax_amount: { type: Number, default: 0 },
    total_amount: { type: Number, default: 0 },
    currency: { type: String, default: 'SAR' },

    order_date: { type: Date, default: Date.now },
    expected_delivery_date: { type: Date },
    actual_delivery_date: { type: Date },

    // الموافقة
    approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approved_at: { type: Date },

    delivery_address: { type: String },
    payment_terms: { type: String },
    notes: { type: String },
    internal_notes: { type: String },
    attachments: [{ type: String }],

    branch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true }
);

purchaseOrderSchema.pre('save', async function (next) {
  if (!this.po_number) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('PurchaseOrder').countDocuments();
    this.po_number = `PO-${year}-${String(count + 1).padStart(6, '0')}`;
  }
  // حساب الإجماليات
  this.subtotal =
    this.items.reduce((s, i) => s + (i.quantity_ordered * i.unit_cost || 0), 0) -
    (this.discount_amount || 0);
  this.tax_amount = this.subtotal * (this.tax_rate / 100);
  this.total_amount = this.subtotal + this.tax_amount;
  this.items.forEach(i => {
    i.total_cost = (i.quantity_ordered || 0) * (i.unit_cost || 0);
  });
  next();
});

purchaseOrderSchema.index({ status: 1, order_date: -1 });
purchaseOrderSchema.index({ supplier_id: 1, status: 1 });
purchaseOrderSchema.index({ branch_id: 1, status: 1 });
purchaseOrderSchema.index({ deleted_at: 1 });

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);

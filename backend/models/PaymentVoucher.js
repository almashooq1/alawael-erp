/**
 * PaymentVoucher Model - نموذج سندات الصرف والقبض
 * إدارة سندات القبض وسندات الصرف المالية
 */
const mongoose = require('mongoose');

const paymentVoucherSchema = new mongoose.Schema(
  {
    voucherNumber: {
      type: String,
      required: true,
      unique: true,
    },
    type: {
      type: String,
      enum: ['receipt', 'payment'],
      required: true,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'SAR',
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'cheque', 'bank_transfer', 'credit_card', 'other'],
      required: true,
    },
    partyType: {
      type: String,
      enum: ['customer', 'vendor', 'employee', 'other'],
      required: true,
    },
    partyName: {
      type: String,
      required: true,
      trim: true,
    },
    partyId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'partyRefModel',
    },
    partyRefModel: {
      type: String,
      enum: ['User', 'Customer', 'Vendor'],
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    reference: {
      type: String,
      trim: true,
    },
    chequeNumber: String,
    chequeDate: Date,
    bankName: String,
    status: {
      type: String,
      enum: ['draft', 'approved', 'posted', 'cancelled'],
      default: 'draft',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: Date,
    postedAt: Date,
    journalEntryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JournalEntry',
    },
    attachments: [
      {
        filename: String,
        path: String,
        uploadDate: { type: Date, default: Date.now },
      },
    ],
    taxAmount: { type: Number, default: 0 },
    taxRate: { type: Number, default: 0 },
    netAmount: { type: Number, default: 0 },
    // integer-halalas siblings (audit #5 EXPAND) — dual-written in pre('save')
    amount_halalas: { type: Number, default: 0 },
    taxAmount_halalas: { type: Number, default: 0 },
    netAmount_halalas: { type: Number, default: 0 },
    notes: String,
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

paymentVoucherSchema.index({ type: 1, status: 1 });
paymentVoucherSchema.index({ partyName: 1, date: -1 });
paymentVoucherSchema.index({ organization: 1 });

paymentVoucherSchema.pre('save', function (next) {
  if (this.isNew && !this.voucherNumber) {
    const prefix = this.type === 'receipt' ? 'RV' : 'PV';
    this.voucherNumber = `${prefix}-${Date.now()}`;
  }
  this.netAmount = this.amount - this.taxAmount;
  // Money-Type Migration (audit #5) — dual-write integer-halalas siblings.
  // (Extends the existing callback-style hook in-style; no new hook added.)
  require('../intelligence/money.lib').deriveHalalas(this, ['amount', 'taxAmount', 'netAmount']);
  next();
});

module.exports =
  mongoose.models.PaymentVoucher || mongoose.model('PaymentVoucher', paymentVoucherSchema);

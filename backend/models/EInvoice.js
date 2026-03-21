/* eslint-disable no-unused-vars */
const mongoose = require('mongoose');

const lineItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  taxRate: { type: Number, default: 15 },
  taxAmount: { type: Number, default: 0 },
  lineTotal: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
});

const eInvoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    invoiceType: {
      type: String,
      enum: ['standard', 'simplified', 'credit_note', 'debit_note'],
      default: 'standard',
    },
    status: {
      type: String,
      enum: ['draft', 'issued', 'submitted', 'accepted', 'rejected', 'cancelled', 'paid'],
      default: 'draft',
    },
    zatcaStatus: {
      type: String,
      enum: ['not_submitted', 'pending', 'cleared', 'reported', 'rejected'],
      default: 'not_submitted',
    },
    zatcaResponse: { type: mongoose.Schema.Types.Mixed },
    qrCode: { type: String },
    xmlContent: { type: String },
    seller: {
      name: { type: String, required: true },
      vatNumber: { type: String, required: true },
      address: { type: String },
      crNumber: { type: String },
    },
    buyer: {
      name: { type: String, required: true },
      vatNumber: { type: String },
      address: { type: String },
    },
    issueDate: { type: Date, required: true, default: Date.now },
    dueDate: { type: Date },
    supplyDate: { type: Date },
    lineItems: [lineItemSchema],
    subtotal: { type: Number, default: 0 },
    totalVAT: { type: Number, default: 0 },
    totalDiscount: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    currency: { type: String, default: 'SAR' },
    notes: { type: String },
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank_transfer', 'credit', 'other'],
      default: 'bank_transfer',
    },
    relatedInvoice: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    department: { type: String, index: true },
  },
  { timestamps: true }
);

eInvoiceSchema.pre('save', function (next) {
  if (this.lineItems && this.lineItems.length > 0) {
    this.lineItems.forEach(item => {
      item.taxAmount = item.quantity * item.unitPrice * (item.taxRate / 100);
      item.lineTotal = item.quantity * item.unitPrice + item.taxAmount - (item.discount || 0);
    });
    this.subtotal = this.lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    this.totalVAT = this.lineItems.reduce((sum, item) => sum + item.taxAmount, 0);
    this.totalDiscount = this.lineItems.reduce((sum, item) => sum + (item.discount || 0), 0);
    this.totalAmount = this.subtotal + this.totalVAT - this.totalDiscount;
  }
  next();
});

eInvoiceSchema.index({ status: 1, issueDate: -1 });
eInvoiceSchema.index({ zatcaStatus: 1 });

module.exports = mongoose.models.EInvoice || mongoose.model('EInvoice', eInvoiceSchema);

const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true }, // INV-2024-0001
    beneficiary: { type: mongoose.Schema.Types.ObjectId, ref: 'BeneficiaryFile', required: true },
    issuer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Employee who created it

    issueDate: { type: Date, default: Date.now },
    dueDate: { type: Date },

    items: [
      {
        description: String,
        quantity: { type: Number, default: 1 },
        unitPrice: Number,
        total: Number,
        serviceRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' }, // Optional link to service catalog
      },
    ],

    subTotal: { type: Number, required: true },
    taxAmount: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },

    // Insurance
    insurance: {
      provider: { type: mongoose.Schema.Types.ObjectId, ref: 'InsuranceProvider' },
      claimNumber: String,
      coverageAmount: { type: Number, default: 0 },
      patientShare: { type: Number, default: 0 },
      status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
    },

    status: { type: String, enum: ['DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED', 'OVERDUE'], default: 'DRAFT' },
    paymentMethod: { type: String, enum: ['CASH', 'CARD', 'TRANSFER', 'INSURANCE'], default: 'CASH' },

    notes: String,
  },
  { timestamps: true },
);

// Auto-calc total before save
invoiceSchema.pre('save', function (next) {
  if (this.insurance && this.insurance.coverageAmount > 0) {
    this.insurance.patientShare = this.totalAmount - this.insurance.coverageAmount;
  } else {
    if (this.insurance) this.insurance.patientShare = this.totalAmount;
  }
  next();
});

module.exports = mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema);

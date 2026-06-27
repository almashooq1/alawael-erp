/**
 * ZatcaInvoice.js — ZATCA E-Invoice Model
 * ═══════════════════════════════════════════
 * Stores invoice data for ZATCA (Fatoorah) submission.
 */

'use strict';

const mongoose = require('mongoose');

const invoiceLineSchema = new mongoose.Schema(
  {
    lineNumber: { type: Number, required: true },
    description: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0, default: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    vatRate: { type: Number, default: 15, min: 0, max: 100 },
    vatAmount: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const zatcaInvoiceSchema = new mongoose.Schema(
  {
    // Invoice identification
    invoiceNumber: { type: String, required: true, unique: true, trim: true },
    issueDate: { type: Date, required: true, default: Date.now },
    issueTime: { type: String, default: () => new Date().toISOString().split('T')[1].slice(0, 8) },

    // ZATCA specific
    uuid: { type: String, unique: true, sparse: true },
    zatcaStatus: {
      type: String,
      enum: ['draft', 'submitted', 'cleared', 'rejected', 'reported'],
      default: 'draft',
    },
    zatcaResponse: { type: mongoose.Schema.Types.Mixed, default: null },
    clearanceId: { type: String, sparse: true },

    // Party info
    sellerName: { type: String, required: true, trim: true },
    sellerTaxNumber: { type: String, required: true, trim: true },
    buyerName: { type: String, trim: true },
    buyerTaxNumber: { type: String, trim: true },

    // Totals
    subTotal: { type: Number, required: true, min: 0 },
    vatTotal: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },

    // Lines
    lines: [invoiceLineSchema],

    // Metadata
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    branch: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

zatcaInvoiceSchema.index({ zatcaStatus: 1, issueDate: -1 });
zatcaInvoiceSchema.index({ sellerTaxNumber: 1, issueDate: -1 });

module.exports = mongoose.model('ZatcaInvoice', zatcaInvoiceSchema);

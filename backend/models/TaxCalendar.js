/**
 * TaxCalendar Model - نموذج التقويم الضريبي
 * إدارة المواعيد والالتزامات الضريبية
 */
const mongoose = require('mongoose');

const taxCalendarSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    taxType: {
      type: String,
      enum: ['vat', 'zakat', 'withholding', 'income', 'custom', 'social_insurance'],
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    periodStart: Date,
    periodEnd: Date,
    frequency: {
      type: String,
      enum: ['monthly', 'quarterly', 'semi_annual', 'annual', 'one_time'],
      required: true,
    },
    amount: {
      type: Number,
      min: 0,
    },
    estimatedAmount: {
      type: Number,
      min: 0,
    },
    status: {
      type: String,
      enum: ['upcoming', 'due', 'overdue', 'filed', 'paid', 'cancelled'],
      default: 'upcoming',
    },
    filingDate: Date,
    paymentDate: Date,
    referenceNumber: String,
    authority: {
      type: String,
      default: 'ZATCA',
      trim: true,
    },
    reminderDays: {
      type: Number,
      default: 7,
    },
    isRecurring: {
      type: Boolean,
      default: true,
    },
    notes: String,
    attachments: [
      {
        filename: String,
        path: String,
        uploadDate: { type: Date, default: Date.now },
      },
    ],
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

taxCalendarSchema.index({ dueDate: 1, status: 1 });
taxCalendarSchema.index({ taxType: 1 });
taxCalendarSchema.index({ organization: 1 });

module.exports = mongoose.models.TaxCalendar || mongoose.model('TaxCalendar', taxCalendarSchema);

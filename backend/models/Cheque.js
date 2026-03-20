/**
 * Cheque Model - نموذج الشيكات
 * إدارة الشيكات الصادرة والواردة
 */
const mongoose = require('mongoose');

const chequeSchema = new mongoose.Schema(
  {
    chequeNumber: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['issued', 'received'],
      required: true,
    },
    bankName: {
      type: String,
      required: true,
      trim: true,
    },
    bankBranch: {
      type: String,
      trim: true,
    },
    accountNumber: {
      type: String,
      trim: true,
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
    issueDate: {
      type: Date,
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    payee: {
      type: String,
      required: true,
      trim: true,
    },
    drawer: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'deposited', 'cleared', 'bounced', 'cancelled', 'expired', 'on_hold'],
      default: 'pending',
    },
    depositDate: Date,
    clearDate: Date,
    bounceDate: Date,
    bounceReason: String,
    relatedInvoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
    },
    relatedExpense: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Expense',
    },
    attachments: [
      {
        filename: String,
        path: String,
        uploadDate: { type: Date, default: Date.now },
      },
    ],
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

chequeSchema.index({ chequeNumber: 1, bankName: 1 });
chequeSchema.index({ status: 1, dueDate: 1 });
chequeSchema.index({ type: 1, status: 1 });
chequeSchema.index({ organization: 1 });

module.exports = mongoose.model('Cheque', chequeSchema);

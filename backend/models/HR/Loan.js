'use strict';

/**
 * Loan.js — Salary advances + employee loans with auto-repayment schedule.
 */
const mongoose = require('mongoose');

const RepaymentSchema = new mongoose.Schema(
  {
    _id: false,
    installmentNumber: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    amount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0 },
    paidAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ['scheduled', 'paid', 'partial', 'missed'],
      default: 'scheduled',
    },
  },
  { _id: false }
);

const LoanSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    loanType: {
      type: String,
      enum: ['salary_advance', 'personal_loan', 'emergency', 'housing', 'vehicle', 'education'],
      required: true,
      index: true,
    },
    principalAmount: { type: Number, required: true, min: 0 },
    outstandingAmount: { type: Number, default: 0 },
    currency: { type: String, default: 'SAR', maxlength: 5 },
    reason: { type: String, maxlength: 1000 },
    status: {
      type: String,
      enum: [
        'draft',
        'pending_approval',
        'approved',
        'rejected',
        'active',
        'completed',
        'defaulted',
      ],
      default: 'draft',
      index: true,
    },
    installments: { type: Number, min: 1, default: 1 },
    monthlyDeduction: { type: Number, default: 0 },
    startDate: { type: Date, default: null },
    approvedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },
    rejectionReason: { type: String, maxlength: 500 },
    schedule: { type: [RepaymentSchema], default: [] },
  },
  { timestamps: true, collection: 'hr_loans' }
);

// W1133 — denormalize branchId from the employee for cross-branch isolation.
LoanSchema.plugin(require('./plugins/hrBranchScope.plugin'));

module.exports = mongoose.models.Loan || mongoose.model('Loan', LoanSchema);

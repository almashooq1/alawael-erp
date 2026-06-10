'use strict';

const mongoose = require('mongoose');

const ExpenseItemSchema = new mongoose.Schema(
  {
    _id: false,
    category: {
      type: String,
      enum: ['airfare', 'lodging', 'meals', 'ground_transport', 'visa', 'other'],
      required: true,
    },
    description: { type: String, maxlength: 300 },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'SAR', maxlength: 5 },
    receiptUrl: { type: String, maxlength: 1000 },
    date: { type: Date, default: null },
  },
  { _id: false }
);

const TravelRequestSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    purpose: { type: String, required: true, maxlength: 1000 },
    destination: { type: String, required: true, maxlength: 200 },
    destinationCountry: { type: String, maxlength: 100 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    travelType: { type: String, enum: ['domestic', 'international'], default: 'domestic' },
    estimatedBudget: { type: Number, default: 0 },
    perDiemAmount: { type: Number, default: 0 },
    perDiemDays: { type: Number, default: 0 },
    status: {
      type: String,
      enum: [
        'draft',
        'pending_approval',
        'approved',
        'rejected',
        'in_progress',
        'completed',
        'cancelled',
      ],
      default: 'draft',
      index: true,
    },
    approvedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },
    expenses: { type: [ExpenseItemSchema], default: [] },
    totalReimbursement: { type: Number, default: 0 },
    reimbursementStatus: {
      type: String,
      enum: ['pending', 'submitted', 'approved', 'paid', 'rejected'],
      default: 'pending',
    },
  },
  { timestamps: true, collection: 'hr_travel_requests' }
);

// W1133 — denormalize branchId from the employee for cross-branch isolation.
TravelRequestSchema.plugin(require('./hrBranchScope.plugin'));

module.exports =
  mongoose.models.TravelRequest || mongoose.model('TravelRequest', TravelRequestSchema);

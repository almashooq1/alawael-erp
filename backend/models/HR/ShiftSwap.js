'use strict';

const mongoose = require('mongoose');

const ShiftSwapSchema = new mongoose.Schema(
  {
    requesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
      index: true,
    },
    shiftDate: { type: Date, required: true, index: true },
    partnerShiftDate: { type: Date, default: null },
    reason: { type: String, maxlength: 500 },
    swapKind: { type: String, enum: ['trade', 'cover'], default: 'trade' },
    status: {
      type: String,
      enum: ['open', 'partner_accepted', 'manager_approved', 'rejected', 'cancelled', 'completed'],
      default: 'open',
      index: true,
    },
    partnerAcceptedAt: { type: Date, default: null },
    managerApprovedAt: { type: Date, default: null },
    managerApprovedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    rejectionReason: { type: String, maxlength: 500 },
  },
  { timestamps: true, collection: 'hr_shift_swaps' }
);

module.exports = mongoose.models.ShiftSwap || mongoose.model('ShiftSwap', ShiftSwapSchema);

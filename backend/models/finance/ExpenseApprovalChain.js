/**
 * ExpenseApprovalChain.js — Phase 12 Commit 4.
 *
 * Durable storage for the expense approval chain records produced by
 * services/finance/expenseApprovalService.js. Before this, the chain
 * lived in an in-memory Map and evaporated on restart.
 *
 * The schema mirrors the in-memory record shape 1:1. The adapter in
 * services/finance/expenseApprovalStore.mongo.js handles get/put/list.
 */

'use strict';

const mongoose = require('mongoose');

const approverSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    roles: { type: [String], default: [] },
    at: { type: String, required: true },
    note: { type: String, default: null },
  },
  { _id: false }
);

const chainStepSchema = new mongoose.Schema(
  {
    level: { type: Number, required: true },
    maxAmount: { type: Number, default: null },
    allowedRoles: { type: [String], default: [] },
    dualControl: { type: Boolean, default: false },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    approvers: { type: [approverSchema], default: [] },
    decidedAt: { type: String, default: null },
  },
  { _id: false }
);

const historyEntrySchema = new mongoose.Schema(
  {
    at: { type: String, required: true },
    action: { type: String, required: true },
    actorId: { type: String, default: null },
    level: { type: Number, default: null },
    amount: { type: Number, default: null },
    reason: { type: String, default: null },
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    status: { type: String, enum: ['released'], default: null },
    by: { type: String, default: null },
    at: { type: String, default: null },
    note: { type: String, default: null },
  },
  { _id: false }
);

const rejectionSchema = new mongoose.Schema(
  {
    by: { type: String, default: null },
    reason: { type: String, default: null },
    at: { type: String, default: null },
    level: { type: Number, default: null },
  },
  { _id: false }
);

const chainSchema = new mongoose.Schema(
  {
    expenseId: { type: String, required: true, unique: true, index: true },
    amount: { type: Number, required: true },
    branchId: { type: String, default: null, index: true },
    category: { type: String, default: null },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    currentLevel: { type: Number, default: null, index: true },
    createdBy: {
      userId: { type: String, required: true },
      roles: { type: [String], default: [] },
    },
    chain: { type: [chainStepSchema], default: [] },
    history: { type: [historyEntrySchema], default: [] },
    payment: { type: paymentSchema, default: null },
    rejection: { type: rejectionSchema, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

chainSchema.index({ status: 1, branchId: 1 });
chainSchema.index({ status: 1, currentLevel: 1 });

module.exports =
  mongoose.models.ExpenseApprovalChain || mongoose.model('ExpenseApprovalChain', chainSchema);

/**
 * ReportApprovalRequest — approval workflow for confidential/restricted
 * reports.
 *
 * Phase 10 Commit 1.
 *
 * State machine:
 *
 *     (create)
 *        │
 *        ▼
 *    ┌─────────┐  reject      ┌──────────┐
 *    │ PENDING │────────────▶│ REJECTED │
 *    └────┬────┘              └──────────┘
 *         │ approve
 *         ▼
 *    ┌──────────┐  dispatch   ┌────────────┐
 *    │ APPROVED │───────────▶│ DISPATCHED │
 *    └────┬─────┘             └────────────┘
 *         │ ttl expired
 *         ▼
 *    ┌──────────┐
 *    │ EXPIRED  │
 *    └──────────┘
 *
 * Invariants:
 *   - One approval request per instanceKey (unique index).
 *   - Every transition appends to `stateHistory` (append-only).
 *   - Terminal states (REJECTED, DISPATCHED, EXPIRED, CANCELLED) block
 *     further transitions; the instance must be re-requested fresh.
 *   - `payloadHash` fingerprints the built JSON so the dispatcher can
 *     detect tampering between approve-time and dispatch-time.
 */

'use strict';

const mongoose = require('mongoose');
const { TENANT_FIELD } = require('../config/constants');

const STATES = Object.freeze([
  'PENDING',
  'APPROVED',
  'REJECTED',
  'DISPATCHED',
  'EXPIRED',
  'CANCELLED',
]);

const TERMINAL_STATES = Object.freeze(['REJECTED', 'DISPATCHED', 'EXPIRED', 'CANCELLED']);

const CONFIDENTIALITY = Object.freeze(['public', 'internal', 'restricted', 'confidential']);

const VALID_TRANSITIONS = Object.freeze({
  PENDING: ['APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED'],
  APPROVED: ['DISPATCHED', 'EXPIRED', 'CANCELLED'],
  REJECTED: [],
  DISPATCHED: [],
  EXPIRED: [],
  CANCELLED: [],
});

const StateHistoryEntrySchema = new mongoose.Schema(
  {
    state: { type: String, enum: STATES, required: true },
    at: { type: Date, default: Date.now, required: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: { type: String },
  },
  { _id: false }
);

const ReportApprovalRequestSchema = new mongoose.Schema(
  {
    reportId: { type: String, required: true, index: true },
    instanceKey: { type: String, required: true },
    periodKey: { type: String, required: true },
    scopeKey: { type: String, default: null },

    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    state: {
      type: String,
      enum: STATES,
      default: 'PENDING',
      required: true,
      index: true,
    },

    stateHistory: { type: [StateHistoryEntrySchema], default: [] },

    approvers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    approverRoles: { type: [String], default: [] },

    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },

    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    rejectedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: null },

    dispatchedAt: { type: Date, default: null },

    expiresAt: { type: Date, required: true, index: true },

    confidentiality: {
      type: String,
      enum: CONFIDENTIALITY,
      required: true,
    },

    payloadHash: { type: String, required: true },

    [TENANT_FIELD]: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      index: true,
    },

    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, collection: 'report_approval_requests' }
);

// One approval per instance.
ReportApprovalRequestSchema.index({ instanceKey: 1 }, { unique: true, name: 'uq_instanceKey' });
ReportApprovalRequestSchema.index({ state: 1, expiresAt: 1 });

// ─── Instance methods ────────────────────────────────────────────

ReportApprovalRequestSchema.methods.canTransitionTo = function (nextState) {
  const allowed = VALID_TRANSITIONS[this.state] || [];
  return allowed.includes(nextState);
};

ReportApprovalRequestSchema.methods.isTerminal = function () {
  return TERMINAL_STATES.includes(this.state);
};

ReportApprovalRequestSchema.methods.isExpired = function (now = new Date()) {
  return !this.isTerminal() && this.expiresAt && now >= this.expiresAt;
};

ReportApprovalRequestSchema.methods._transition = function (nextState, actor, reason) {
  if (!this.canTransitionTo(nextState)) {
    throw new Error(`invalid transition from ${this.state} to ${nextState}`);
  }
  this.state = nextState;
  this.stateHistory.push({
    state: nextState,
    at: new Date(),
    actor: actor || null,
    reason: reason || null,
  });
  return this;
};

ReportApprovalRequestSchema.methods.approve = function (actor, reason) {
  this._transition('APPROVED', actor, reason);
  this.approvedBy = actor || null;
  this.approvedAt = new Date();
  return this;
};

ReportApprovalRequestSchema.methods.reject = function (actor, reason) {
  if (!reason) throw new Error('rejection reason required');
  this._transition('REJECTED', actor, reason);
  this.rejectedBy = actor || null;
  this.rejectedAt = new Date();
  this.rejectionReason = reason;
  return this;
};

ReportApprovalRequestSchema.methods.markDispatched = function (actor) {
  this._transition('DISPATCHED', actor, 'dispatched to recipients');
  this.dispatchedAt = new Date();
  return this;
};

ReportApprovalRequestSchema.methods.expire = function () {
  this._transition('EXPIRED', null, 'ttl elapsed');
  return this;
};

ReportApprovalRequestSchema.methods.cancel = function (actor, reason) {
  this._transition('CANCELLED', actor, reason || 'cancelled');
  return this;
};

ReportApprovalRequestSchema.methods.verifyPayload = function (hash) {
  if (!hash) return false;
  return this.payloadHash === hash;
};

// ─── Statics ──────────────────────────────────────────────────────

ReportApprovalRequestSchema.statics.findPendingForApprover = function (userId, roles) {
  const orClauses = [];
  if (userId) orClauses.push({ approvers: userId });
  if (Array.isArray(roles) && roles.length) {
    orClauses.push({ approverRoles: { $in: roles } });
  }
  const q = { state: 'PENDING' };
  if (orClauses.length) q.$or = orClauses;
  return this.find(q).sort({ createdAt: 1 });
};

ReportApprovalRequestSchema.statics.findExpirySweep = function (now = new Date()) {
  return this.find({
    state: { $in: ['PENDING', 'APPROVED'] },
    expiresAt: { $lte: now },
  });
};

module.exports = {
  ReportApprovalRequestSchema,
  STATES,
  TERMINAL_STATES,
  VALID_TRANSITIONS,
  CONFIDENTIALITY,
  get model() {
    return (
      mongoose.models.ReportApprovalRequest ||
      mongoose.model('ReportApprovalRequest', ReportApprovalRequestSchema)
    );
  },
};

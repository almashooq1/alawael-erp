/**
 * ReportDelivery — delivery ledger for the periodic reporting engine.
 *
 * Phase 10 Commit 1. One row per (report-instance × recipient × channel).
 *
 * State machine (happy path):
 *   QUEUED → SENT → DELIVERED → READ
 *
 * Sad paths:
 *   QUEUED → FAILED → RETRYING → (SENT | ESCALATED)
 *   QUEUED → CANCELLED   (e.g. approval rejected)
 *
 * Invariants:
 *   - (instanceKey, recipientId, channel) is unique: the engine upserts
 *     on this triple so repeated ticks never double-send.
 *   - `attempts` only monotonically increases.
 *   - `readAt` implies `deliveredAt` implies `sentAt` (ledger integrity
 *     checked at test time).
 *   - `branchId` is the tenant field; all queries MUST filter by it.
 */

'use strict';

const mongoose = require('mongoose');
const { TENANT_FIELD } = require('../config/constants');

const STATUSES = Object.freeze([
  'QUEUED',
  'SENT',
  'DELIVERED',
  'READ',
  'FAILED',
  'RETRYING',
  'ESCALATED',
  'CANCELLED',
]);

const CHANNELS = Object.freeze([
  'email',
  'sms',
  'whatsapp',
  'in_app',
  'pdf_download',
  'portal_inbox',
]);

const CONFIDENTIALITY = Object.freeze(['public', 'internal', 'restricted', 'confidential']);

const LOCALES = Object.freeze(['ar', 'en']);

const AUDIENCE_ROLES = Object.freeze([
  'beneficiary',
  'guardian',
  'therapist',
  'supervisor',
  'branch_manager',
  'executive',
  'quality',
  'finance',
  'hr',
]);

const AccessLogEntrySchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now, required: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: {
      type: String,
      enum: ['view', 'download', 'forward', 'print'],
      required: true,
    },
    ip: { type: String },
    userAgent: { type: String },
  },
  { _id: false }
);

const ReportDeliverySchema = new mongoose.Schema(
  {
    reportId: { type: String, required: true, index: true },
    instanceKey: { type: String, required: true, index: true },
    periodKey: { type: String, required: true, index: true },
    scopeKey: { type: String, default: null },

    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'recipientModel',
    },
    recipientModel: {
      type: String,
      enum: ['User', 'Guardian', 'Employee', 'Beneficiary'],
      required: true,
    },
    recipientRole: { type: String, enum: AUDIENCE_ROLES, required: true },

    channel: { type: String, enum: CHANNELS, required: true },
    locale: { type: String, enum: LOCALES, default: 'ar' },

    status: {
      type: String,
      enum: STATUSES,
      default: 'QUEUED',
      required: true,
      index: true,
    },

    attempts: { type: Number, default: 0, min: 0 },

    sentAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    readAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
    escalatedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },

    providerMessageId: { type: String, default: null },
    providerError: { type: String, default: null },

    accessLog: { type: [AccessLogEntrySchema], default: [] },

    artifactUri: { type: String, default: null },

    confidentiality: {
      type: String,
      enum: CONFIDENTIALITY,
      default: 'internal',
      required: true,
    },

    approvalRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReportApprovalRequest',
      default: null,
    },

    [TENANT_FIELD]: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      index: true,
    },

    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, collection: 'report_deliveries' }
);

// ─── Indexes ──────────────────────────────────────────────────────
// Idempotency: one delivery per (instance, recipient, channel).
ReportDeliverySchema.index(
  { instanceKey: 1, recipientId: 1, channel: 1 },
  { unique: true, name: 'uq_instance_recipient_channel' }
);
// Escalation sweep.
ReportDeliverySchema.index({ status: 1, failedAt: 1 });
// Per-user inbox.
ReportDeliverySchema.index({ recipientId: 1, readAt: 1 });
// Per-report analytics.
ReportDeliverySchema.index({ reportId: 1, periodKey: 1 });
// Branch dashboards.
ReportDeliverySchema.index({ [TENANT_FIELD]: 1, status: 1 });

// ─── Instance methods — state transitions ─────────────────────────

ReportDeliverySchema.methods.markSent = function (providerMessageId) {
  this.status = 'SENT';
  this.sentAt = new Date();
  this.attempts += 1;
  if (providerMessageId) this.providerMessageId = providerMessageId;
  this.providerError = null;
  return this;
};

ReportDeliverySchema.methods.markDelivered = function (at) {
  if (!this.sentAt) this.sentAt = at || new Date();
  this.status = 'DELIVERED';
  this.deliveredAt = at || new Date();
  return this;
};

ReportDeliverySchema.methods.markRead = function (at) {
  if (!this.sentAt) this.sentAt = at || new Date();
  if (!this.deliveredAt) this.deliveredAt = at || new Date();
  this.status = 'READ';
  this.readAt = at || new Date();
  return this;
};

ReportDeliverySchema.methods.markFailed = function (error) {
  this.status = 'FAILED';
  this.failedAt = new Date();
  this.attempts += 1;
  this.providerError = error ? String(error).slice(0, 1000) : null;
  return this;
};

ReportDeliverySchema.methods.markRetrying = function () {
  if (this.status !== 'FAILED') {
    throw new Error(`cannot retry from status ${this.status}`);
  }
  this.status = 'RETRYING';
  return this;
};

ReportDeliverySchema.methods.markEscalated = function (escalatedTo) {
  this.status = 'ESCALATED';
  this.escalatedAt = new Date();
  if (escalatedTo) {
    this.metadata = { ...(this.metadata || {}), escalatedTo };
  }
  return this;
};

ReportDeliverySchema.methods.markCancelled = function (reason) {
  this.status = 'CANCELLED';
  this.cancelledAt = new Date();
  if (reason) {
    this.metadata = { ...(this.metadata || {}), cancellationReason: reason };
  }
  return this;
};

ReportDeliverySchema.methods.recordAccess = function (entry) {
  if (!entry || !entry.action) return this;
  this.accessLog.push({
    at: entry.at || new Date(),
    actor: entry.actor,
    action: entry.action,
    ip: entry.ip,
    userAgent: entry.userAgent,
  });
  // First view = read.
  if (entry.action === 'view' && !this.readAt) {
    this.markRead(entry.at);
  }
  return this;
};

ReportDeliverySchema.methods.isTerminal = function () {
  return ['READ', 'ESCALATED', 'CANCELLED'].includes(this.status);
};

// ─── Statics — common queries ─────────────────────────────────────

ReportDeliverySchema.statics.findByInstance = function (instanceKey) {
  return this.find({ instanceKey });
};

ReportDeliverySchema.statics.findForRecipient = function (recipientId, opts = {}) {
  const q = { recipientId };
  if (opts.unreadOnly) q.readAt = null;
  if (opts.channel) q.channel = opts.channel;
  if (opts.branchId) q[TENANT_FIELD] = opts.branchId;
  return this.find(q).sort({ createdAt: -1 });
};

ReportDeliverySchema.statics.findEscalationCandidates = function (opts = {}) {
  const olderThan = opts.olderThan || new Date(Date.now() - 30 * 60 * 1000); // 30 min
  return this.find({
    status: 'FAILED',
    failedAt: { $lte: olderThan },
    attempts: { $gte: opts.maxAttempts || 4 },
  });
};

ReportDeliverySchema.statics.computeSuccessRate = async function (filter = {}) {
  const match = { ...filter };
  if (match.since) {
    match.createdAt = { $gte: match.since };
    delete match.since;
  }
  const [row] = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        delivered: {
          $sum: {
            $cond: [{ $in: ['$status', ['DELIVERED', 'READ']] }, 1, 0],
          },
        },
        failed: {
          $sum: {
            $cond: [{ $in: ['$status', ['FAILED', 'ESCALATED']] }, 1, 0],
          },
        },
      },
    },
  ]);
  if (!row || !row.total) return { total: 0, delivered: 0, failed: 0, successRate: null };
  return {
    total: row.total,
    delivered: row.delivered,
    failed: row.failed,
    successRate: row.delivered / row.total,
  };
};

module.exports = {
  ReportDeliverySchema,
  STATUSES,
  CHANNELS,
  CONFIDENTIALITY,
  LOCALES,
  AUDIENCE_ROLES,
  get model() {
    return mongoose.models.ReportDelivery || mongoose.model('ReportDelivery', ReportDeliverySchema);
  },
};

'use strict';

/**
 * NotificationLog — Phase 15 Commit 1 (4.0.64).
 *
 * Audit trail of every notification the router has attempted to
 * send for Phase 13 quality/compliance events. Used by the
 * router's dedup logic and by ops dashboards to answer "did the
 * CEO actually get notified about the sentinel incident?" two
 * hours after the fact.
 *
 * One row per (eventName, recipient, channel) dispatch. A single
 * event can spawn multiple rows if it matches multiple policies
 * or fans out to multiple recipients.
 */

const mongoose = require('mongoose');

const notificationLogSchema = new mongoose.Schema(
  {
    eventName: { type: String, required: true, index: true },
    eventKey: { type: String, default: null, index: true }, // optional stable id (e.g. reviewId+version)
    policyId: { type: String, required: true, index: true },
    priority: {
      type: String,
      enum: ['critical', 'high', 'normal', 'low'],
      default: 'normal',
      index: true,
    },

    recipient: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      email: { type: String, default: null },
      role: { type: String, default: null },
      label: { type: String, default: null },
    },

    channel: { type: String, required: true }, // 'email' | 'console' | ...
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed', 'skipped', 'deduplicated'],
      default: 'pending',
      index: true,
    },

    subject: { type: String, default: null },
    // Full rendered body is NOT persisted — only a preview snippet
    // so the log stays cheap and avoids accidental PII retention.
    bodyPreview: { type: String, default: null },

    payloadSummary: { type: mongoose.Schema.Types.Mixed, default: null },

    error: { type: String, default: null },

    sentAt: { type: Date, default: null },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },
  },
  { timestamps: true }
);

// Dedup query index: find recent same-(eventKey, recipient, channel) rows
notificationLogSchema.index({ eventKey: 1, 'recipient.email': 1, channel: 1, createdAt: -1 });
notificationLogSchema.index({ policyId: 1, createdAt: -1 });

const NotificationLog =
  mongoose.models.NotificationLog || mongoose.model('NotificationLog', notificationLogSchema);

module.exports = NotificationLog;

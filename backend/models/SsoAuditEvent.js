/**
 * SsoAuditEvent — append-only audit log for SSO admin actions (W205h).
 *
 * Captures privileged operations on the SSO surface (session force-end,
 * client registration/rotation/deactivation, JWKS access, MFA changes)
 * so security can answer "who ended whose session and when?" without
 * grepping log files.
 *
 * Append-only: there's no update path on this collection. Any change to
 * an event would itself be a new event. TTL=400 days to align with
 * common compliance retention windows (PDPL/CBAHI).
 */

'use strict';

const mongoose = require('mongoose');

const SsoAuditEventSchema = new mongoose.Schema(
  {
    // What happened
    action: {
      type: String,
      required: true,
      index: true,
      // Open-ended enum — additions are cheap. Listing the known values
      // here documents the contract; non-listed values are still allowed
      // because the audit channel must never reject events.
    },
    // Who did it (actor)
    actorUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    actorRole: String,
    actorEmail: String,
    // What it acted on (target — opaque string so the same collection
    // can store events about sessions, clients, users, etc.)
    targetType: { type: String, index: true }, // 'session' | 'oauth_client' | 'user' | ...
    targetId: { type: String, index: true },
    // Optional extra context. Kept small — this is the audit log, not
    // the application log.
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    // Where the action came from
    ipAddress: String,
    userAgent: String,
    // Outcome
    outcome: {
      type: String,
      enum: ['success', 'failure'],
      default: 'success',
      index: true,
    },
    errorMessage: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// 400-day TTL for compliance retention
SsoAuditEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 400 });

// Common admin-page queries: "events for this target" + "events by this actor"
SsoAuditEventSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
SsoAuditEventSchema.index({ actorUserId: 1, createdAt: -1 });

const SsoAuditEvent =
  mongoose.models.SsoAuditEvent || mongoose.model('SsoAuditEvent', SsoAuditEventSchema);

module.exports = SsoAuditEvent;

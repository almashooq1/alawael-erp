/**
 * AdapterAudit — PDPL-compliant audit trail for Saudi government
 * adapter calls.
 *
 * Saudi Personal Data Protection Law (PDPL) + NPHIES clinical-data
 * regulations require that every access to third-party identity/
 * health/financial data be logged with:
 *   • actor (internal user)
 *   • target (national ID / iqama / license — stored as SHA-256 hash
 *     so the audit log itself doesn't become a PII leak)
 *   • adapter + operation
 *   • result status
 *   • timestamp + IP hash
 *
 * TTL: 730 days (2 years) — matches PDPL retention rules for
 * access logs on health-related records. Tune via PDPL_AUDIT_TTL_DAYS.
 */

'use strict';

const mongoose = require('mongoose');

const RETENTION_DAYS = parseInt(process.env.PDPL_AUDIT_TTL_DAYS, 10) || 730;

const AdapterAuditSchema = new mongoose.Schema(
  {
    // Who initiated the call
    actorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    actorEmail: { type: String, index: true },
    actorRole: String,

    // What adapter + operation
    provider: {
      type: String,
      required: true,
      enum: [
        'gosi',
        'scfhs',
        'absher',
        'qiwa',
        'nafath',
        'fatoora',
        'muqeem',
        'nphies',
        'wasel',
        'balady',
        'zatca-signer',
      ],
      index: true,
    },
    operation: { type: String, required: true }, // verify, submit, checkEligibility, ...
    mode: { type: String, enum: ['mock', 'live'] },

    // Target (PII-hashed — actual ID is never stored in the audit row)
    targetHash: { type: String, index: true },
    targetKind: {
      type: String,
      enum: ['nationalId', 'iqama', 'licenseNumber', 'memberId', 'shortCode', 'other'],
    },

    // Result
    status: { type: String, required: true }, // active, inactive, approved, rejected, ...
    latencyMs: Number,
    success: { type: Boolean, default: true },
    errorMessage: String,

    // Context
    ipHash: String,
    userAgent: String,
    // Correlation ID — ties multiple adapter calls made in the same
    // HTTP request together (e.g. HR onboarding triggers GOSI + SCFHS +
    // Qiwa + Muqeem in one POST). Populated from req.id (set by
    // middleware/requestId.middleware.js from X-Request-Id header).
    correlationId: { type: String, index: true },
    entityRef: {
      // Optional: link to local entity (e.g. employee being verified)
      kind: { type: String, enum: ['Employee', 'Beneficiary', 'Branch', 'Invoice', 'Claim'] },
      id: mongoose.Schema.Types.ObjectId,
    },

    // Auto-delete after retention window
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + RETENTION_DAYS * 24 * 60 * 60 * 1000),
    },
  },
  { timestamps: true }
);

// PDPL TTL — auto-purge after retention window
AdapterAuditSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Common query patterns
AdapterAuditSchema.index({ provider: 1, createdAt: -1 });
AdapterAuditSchema.index({ actorUserId: 1, createdAt: -1 });
AdapterAuditSchema.index({ 'entityRef.kind': 1, 'entityRef.id': 1, createdAt: -1 });

module.exports = mongoose.models.AdapterAudit || mongoose.model('AdapterAudit', AdapterAuditSchema);

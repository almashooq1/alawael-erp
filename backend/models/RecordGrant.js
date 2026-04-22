/**
 * RecordGrant — Phase-7 record-level permission grant.
 *
 * Lets a privileged user (typically branch_manager or above)
 * temporarily grant another user explicit access to a single
 * resource (e.g. one Beneficiary, one CarePlan) outside of their
 * normal RBAC scope. Used for:
 *
 *   • Delegation — branch_manager going on leave grants acting
 *     manager temporary approve rights.
 *   • Secondment — therapist from Branch A given read+update access
 *     to a specific child whose primary therapist is OOO.
 *   • External reviewer — auditor from outside the group given
 *     read+export on a specific care plan for a CBAHI inspection.
 *
 * Semantics:
 *   • Active when status='active' AND (expiresAt IS NULL OR
 *     expiresAt > now()).
 *   • An active grant is OR-ed into the PDP decision: if RBAC denies
 *     but a matching active grant exists, the action is permitted
 *     (subject to remaining ABAC policies — domain SoD, break-glass
 *     active, etc. still apply).
 *   • Grants are immutable except for status (revoked/expired) and
 *     `revokedAt/revokedBy/revokeReason`. To change scope, revoke +
 *     create a new one.
 *   • Auto-expiration is handled by a TTL index on `expiresAt`
 *     (Mongo expires the doc; status flip happens via a daily
 *     reconcile job against pre-expiry alerts).
 *
 * NOT a replacement for RBAC — the canonical permission model
 * stays role-based. RecordGrant is the narrow exception channel.
 */

'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const recordGrantSchema = new Schema(
  {
    // ── Grant scope ────────────────────────────────────────────────
    resourceType: {
      type: String,
      required: true,
      // Mongoose model name — Beneficiary, CarePlan, Invoice, etc.
      // Not enum-locked because new resources may need grants over
      // time. Drift test (rbac-roles-consistency.test.js descendant
      // can be added later) covers the catalog if needed.
      trim: true,
      index: true,
    },
    resourceId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    // ── Grantee ────────────────────────────────────────────────────
    granteeId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Future: support 'role' or 'group' grants. Keep field for
    // forward-compat even though only 'user' is supported today.
    granteeType: {
      type: String,
      enum: ['user'],
      default: 'user',
    },

    // ── What's granted ─────────────────────────────────────────────
    actions: {
      type: [String],
      // Free-form action strings matching `${resource}:${action}`
      // shorthand the rest of the codebase uses.
      required: true,
      validate: {
        validator: arr => Array.isArray(arr) && arr.length > 0,
        message: 'actions must be a non-empty array',
      },
    },

    // ── Provenance ─────────────────────────────────────────────────
    grantedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    grantedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      // null = never expires (use sparingly — review job alerts on
      // perpetual grants weekly)
      index: { expireAfterSeconds: 0 },
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 500,
    },

    // ── Lifecycle ──────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['active', 'revoked', 'expired'],
      default: 'active',
      index: true,
    },
    revokedAt: Date,
    revokedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    revokeReason: { type: String, maxlength: 300 },
  },
  { timestamps: true }
);

// Common queries: "is there an active grant for this user on this
// resource for this action?" — heavily indexed.
recordGrantSchema.index({
  granteeId: 1,
  resourceType: 1,
  resourceId: 1,
  status: 1,
});

/**
 * Static: does an active grant exist for the given user/resource
 * combination that includes the requested action?
 *
 * Returns the matching grant document or null. Caller decides
 * how to use the result (typically as an OR clause in the PDP).
 */
recordGrantSchema.statics.findActiveGrant = async function findActiveGrant({
  granteeId,
  resourceType,
  resourceId,
  action,
}) {
  if (!granteeId || !resourceType || !resourceId || !action) return null;
  const now = new Date();
  const grant = await this.findOne({
    granteeId,
    resourceType,
    resourceId,
    status: 'active',
    actions: action,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
  }).lean();
  return grant || null;
};

/**
 * Static: revoke a grant. Returns the updated doc or null if not
 * found (or already revoked).
 */
recordGrantSchema.statics.revoke = async function revokeGrant({ grantId, revokedBy, reason }) {
  return this.findOneAndUpdate(
    { _id: grantId, status: 'active' },
    {
      $set: {
        status: 'revoked',
        revokedAt: new Date(),
        revokedBy,
        revokeReason: (reason || '').slice(0, 300),
      },
    },
    { new: true }
  ).lean();
};

module.exports = mongoose.models.RecordGrant || mongoose.model('RecordGrant', recordGrantSchema);

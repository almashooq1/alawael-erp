/**
 * DelegationGrant — temporary authority transfer.
 *
 * Examples:
 *   - acting_branch_manager for 2 weeks
 *   - cross-branch read access for an auditor for 48h
 *   - approval-step delegate while primary is on leave
 *
 * ⚠️ DEPRECATED (ADR-034, 2026-05-30) — this is an ACCESS-SCOPE GRANT that
 * overlaps the canonical `models/UserBranchRole.js`. UserBranchRole is the
 * primitive actually wired into request-time enforcement (requireBranchAccess,
 * W597); this model's `findActiveFor` has NO enforcement consumer. Do NOT
 * build new request-time grant logic here. Pending D2 migration into
 * UserBranchRole (gated on ADR-034 Q1–Q2: prod-row count + whether the
 * `roles[]` multi-role capability is needed). The W599 drift guard allowlists
 * this file ONLY during the deprecation window — remove the allowlist entry
 * when D2 deletes it.
 */

'use strict';

const mongoose = require('mongoose');
const { TENANT_FIELD } = require('../../config/constants');

const DelegationGrantSchema = new mongoose.Schema(
  {
    fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    toUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    roles: { type: [String], default: [] }, // roles the delegate inherits (optional)
    branchIds: { type: [mongoose.Schema.Types.ObjectId], ref: 'Branch', default: [] },
    [TENANT_FIELD]: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },

    effectiveFrom: { type: Date, default: Date.now, required: true },
    effectiveTo: { type: Date, required: true, index: true },

    reason: { type: String, required: true, minlength: 10 },
    status: {
      type: String,
      enum: ['active', 'revoked', 'expired'],
      default: 'active',
      index: true,
    },

    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    revokedAt: { type: Date },
    revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'delegation_grants' }
);

// Helpful compound index for runtime lookups.
DelegationGrantSchema.index({ toUserId: 1, status: 1, effectiveFrom: 1, effectiveTo: 1 });

DelegationGrantSchema.methods.isLive = function (now = new Date()) {
  if (this.status !== 'active') return false;
  return this.effectiveFrom <= now && this.effectiveTo > now;
};

DelegationGrantSchema.statics.findActiveFor = function (userId, now = new Date()) {
  return this.find({
    toUserId: userId,
    status: 'active',
    effectiveFrom: { $lte: now },
    effectiveTo: { $gt: now },
  });
};

module.exports = {
  DelegationGrantSchema,
  get model() {
    return (
      mongoose.models.DelegationGrant || mongoose.model('DelegationGrant', DelegationGrantSchema)
    );
  },
};

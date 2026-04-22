/**
 * UserBranchRole — Phase-7 secondment / multi-branch assignment.
 *
 * Represents a user's TEMPORARY or SECONDARY branch assignment
 * beyond their primary `User.branchId`. Common scenarios:
 *
 *   • Secondment — a speech-language therapist from Riyadh is
 *     assigned to the Jeddah branch for 4 weeks while their primary
 *     therapist is on leave.
 *   • Acting role — branch_manager going on hajj grants an acting
 *     branch_manager role to their deputy for 10 days. The deputy
 *     keeps their normal role on their own branch; the acting role
 *     applies only while `validFrom ≤ now < validUntil`.
 *   • Multi-branch therapist — some specialists rotate across 2–3
 *     branches on a weekly schedule and need persistent access at
 *     each one (no expiry, revoked manually).
 *
 * Complements — does NOT replace — User.branchId + User.branchIds[].
 * The User.branchIds[] array (commit a2936c4c) was the "set of home
 * branches" convenience field; THIS model is the authoritative
 * audited record of who-can-work-where with a role mapping, a
 * reason, and a granter.
 *
 * Active assignment filter:
 *   status === 'active'
 *   AND (validFrom IS NULL OR validFrom <= now)
 *   AND (validUntil IS NULL OR validUntil > now)
 *
 * The branchScope middleware queries `findActiveForUser(userId)`
 * to expand the user's effective branch set before applying the
 * tenant filter. Result is cached on `req.branchScope` for the
 * request's lifetime.
 */

'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const userBranchRoleSchema = new Schema(
  {
    // ── Link ───────────────────────────────────────────────────────
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    branchId: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },

    // Role the user holds AT this branch during the window. May
    // differ from their primary User.role — e.g. a therapist_psych
    // acting as therapy_supervisor for a coverage stint.
    role: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    // ── Window ─────────────────────────────────────────────────────
    // null validFrom  = "active from grant time"
    // null validUntil = "indefinite, revoke manually"
    validFrom: { type: Date, default: null, index: true },
    validUntil: { type: Date, default: null, index: true },

    // ── Lifecycle ──────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['active', 'revoked', 'expired'],
      default: 'active',
      index: true,
    },

    // ── Provenance ─────────────────────────────────────────────────
    grantedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    grantedAt: { type: Date, default: Date.now },
    reason: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 500,
    },

    // ── Revocation ─────────────────────────────────────────────────
    revokedAt: Date,
    revokedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    revokeReason: { type: String, maxlength: 300 },
  },
  { timestamps: true }
);

// Hot query: "which branches can this user currently access?"
userBranchRoleSchema.index({ userId: 1, status: 1, validUntil: 1 });

// Secondary query: "who has access to this branch right now?"
userBranchRoleSchema.index({ branchId: 1, status: 1, validUntil: 1 });

/**
 * Pure-logic filter on a lean result set. Returns only rows whose
 * window covers `now`. Plain function (not a schema static) so it
 * can be imported without instantiating a mongoose connection —
 * makes unit tests possible even where the Jest+Mongoose 9 sandbox
 * drops schema statics on require.
 *
 * Window convention is half-open: [validFrom, validUntil).
 *   • a row with validFrom=null is "active from grant time"
 *   • a row with validUntil=null is "indefinite, revoke manually"
 */
function filterActive(rows, now = new Date()) {
  const t = now.getTime();
  return rows.filter(r => {
    if (r.status !== 'active') return false;
    if (r.validFrom && new Date(r.validFrom).getTime() > t) return false;
    if (r.validUntil && new Date(r.validUntil).getTime() <= t) return false;
    return true;
  });
}
// Also exposed as a schema static for code that has a model handle.
userBranchRoleSchema.statics.filterActive = filterActive;

/**
 * Static: return active branch/role assignments for a user at
 * `now`. Caller uses the result to expand `req.branchScope` in the
 * branchScope middleware.
 */
userBranchRoleSchema.statics.findActiveForUser = async function findActiveForUser(
  userId,
  now = new Date()
) {
  if (!userId) return [];
  // Pull rows that COULD be active (status=active + validUntil in
  // the future-or-null), then apply the full window filter in JS.
  const candidates = await this.find({
    userId,
    status: 'active',
    $or: [{ validUntil: null }, { validUntil: { $gt: now } }],
  }).lean();
  return this.filterActive(candidates, now);
};

/**
 * Static: revoke an assignment. Returns the updated doc or null if
 * not found or already revoked.
 */
userBranchRoleSchema.statics.revoke = async function revokeAssignment({
  assignmentId,
  revokedBy,
  reason,
}) {
  return this.findOneAndUpdate(
    { _id: assignmentId, status: 'active' },
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

const UserBranchRoleModel =
  mongoose.models.UserBranchRole || mongoose.model('UserBranchRole', userBranchRoleSchema);

// Attach the plain helper as a named static on the exported module
// so call-sites can do `const { filterActive } = require(...)` even
// though Jest's module-load quirk sometimes drops schema statics.
module.exports = UserBranchRoleModel;
module.exports.filterActive = filterActive;

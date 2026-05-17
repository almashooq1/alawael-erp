'use strict';

/**
 * HandoffNote — Wave 27.
 *
 * Team-to-team note at shift change. See Wave 25 design §3.2.
 *
 * Recipients can be specified as a role group (broad shift handoff)
 * OR a specific user (named handoff). At least one is required.
 *
 * Indexes:
 *   • (toUserId, at DESC) — direct recipient inbox
 *   • (toRoleGroup, branchId, at DESC) — role+branch broadcast inbox
 *   • (subjectType, subjectId) — read by entity context (Care 360 page)
 *   • expiresAt TTL — auto-purge expired notes after 90d retention buffer
 */

const mongoose = require('mongoose');

const HandoffNoteSchema = new mongoose.Schema(
  {
    byUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    byRole: { type: String, default: null, maxlength: 100 },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    subjectType: {
      type: String,
      enum: ['Beneficiary', 'Employee', 'Shift', 'Other'],
      required: true,
    },
    subjectId: { type: String, required: true, maxlength: 200 },
    toRoleGroup: { type: String, default: null, maxlength: 100, index: true },
    toUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    textAr: { type: String, default: null, maxlength: 2000 },
    textEn: { type: String, default: null, maxlength: 2000 },
    priority: {
      type: String,
      enum: ['must-read', 'fyi'],
      default: 'fyi',
      index: true,
    },
    at: { type: Date, default: Date.now, required: true },
    expiresAt: { type: Date, default: null },
    readBy: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], default: [] },
    acknowledgedAt: { type: Date, default: null },
  },
  { timestamps: false, collection: 'productivity_handoff_notes' }
);

// Direct recipient inbox
HandoffNoteSchema.index({ toUserId: 1, at: -1 });
// Role + branch broadcast inbox
HandoffNoteSchema.index({ toRoleGroup: 1, branchId: 1, at: -1 });
// Entity context lookup (e.g. Care 360 shows handoffs about THIS beneficiary)
HandoffNoteSchema.index({ subjectType: 1, subjectId: 1, at: -1 });
// TTL-style auto-archive 90 days after expiry
// (use a script-driven sweep rather than Mongo TTL — keeps data for audit)

// Cross-field invariants — `pre('validate')` calling `this.invalidate()`
// doesn't reliably propagate in our Mongoose 9 setup (validateSync
// returns undefined). Use a schema-level virtual path with a
// synchronous validator instead — same pattern that works for the
// Insight model in Wave 18.
HandoffNoteSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});
HandoffNoteSchema.path('__invariants').validate(function () {
  let ok = true;
  if (!this.toRoleGroup && !this.toUserId) {
    this.invalidate('toRoleGroup', 'HandoffNote requires toRoleGroup or toUserId');
    ok = false;
  }
  if (!this.textAr && !this.textEn) {
    this.invalidate('textAr', 'HandoffNote requires textAr or textEn');
    ok = false;
  }
  return ok;
});

// Wave 35 — adopt branchScopePlugin (requireActor: false for back-compat;
// flips to true after caller migration).
const branchScopePlugin = require('../../intelligence/branchScopePlugin');
HandoffNoteSchema.plugin(branchScopePlugin, { requireActor: false });

module.exports =
  mongoose.models.ProductivityHandoffNote ||
  mongoose.model('ProductivityHandoffNote', HandoffNoteSchema);

module.exports.HandoffNoteSchema = HandoffNoteSchema;

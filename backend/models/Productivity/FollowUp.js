'use strict';

/**
 * FollowUp — Wave 27.
 *
 * Operational accountability queue. Every `alert.acknowledge` and
 * `insight.confirm` writes a FollowUp via the Wave 27 auto-creation
 * hook (productivity-features.service createFollowUpFromEvent).
 *
 * See Wave 25 design §3.3.
 *
 * Indexes:
 *   • (ownerUserId, status, dueBy ASC) — primary "my open follow-ups
 *     sorted by deadline" query path
 *   • (sourceType, sourceId) — dedup check + reverse lookup
 *   • dueBy ASC — global "due today" sweep
 */

const mongoose = require('mongoose');

const FollowUpNoteSchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now, required: true },
    byUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    textAr: { type: String, default: null, maxlength: 1000 },
    textEn: { type: String, default: null, maxlength: 1000 },
  },
  { _id: false }
);

const FollowUpSchema = new mongoose.Schema(
  {
    ownerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    ownerRole: { type: String, default: null, maxlength: 100 },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },
    sourceType: {
      type: String,
      enum: ['alert', 'insight', 'manual', 'exception-review', 'kpi-annotation'],
      default: 'manual',
      index: true,
    },
    sourceId: { type: String, default: null, maxlength: 200, index: true },
    titleAr: { type: String, default: null, maxlength: 500 },
    titleEn: { type: String, default: null, maxlength: 500 },
    dueBy: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ['open', 'done', 'cancelled'],
      default: 'open',
      required: true,
      index: true,
    },
    createdAt: { type: Date, default: Date.now, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    doneAt: { type: Date, default: null },
    notes: { type: [FollowUpNoteSchema], default: [] },
  },
  { timestamps: false, collection: 'productivity_follow_ups' }
);

// Primary read path: open follow-ups for a user, sorted by due-date
FollowUpSchema.index({ ownerUserId: 1, status: 1, dueBy: 1 });
// Dedup: same source twice shouldn't double-queue
FollowUpSchema.index({ sourceType: 1, sourceId: 1, ownerUserId: 1 });

FollowUpSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});
FollowUpSchema.path('__invariants').validate(function () {
  if (!this.titleAr && !this.titleEn) {
    this.invalidate('titleAr', 'FollowUp requires titleAr or titleEn');
    return false;
  }
  return true;
});

// Wave 35 — adopt branchScopePlugin (requireActor: false for back-compat;
// FollowUp.branchId is nullable for org-level follow-ups, so the scope
// check passes them through when actor is GLOBAL).
const branchScopePlugin = require('../../intelligence/branchScopePlugin');
FollowUpSchema.plugin(branchScopePlugin, { requireActor: false });

module.exports =
  mongoose.models.ProductivityFollowUp || mongoose.model('ProductivityFollowUp', FollowUpSchema);

module.exports.FollowUpSchema = FollowUpSchema;

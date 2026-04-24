'use strict';

/**
 * MeetingDecision.model.js — Phase 16 Commit 6 (4.0.71).
 *
 * A single decision taken in a meeting, promoted from the inline
 * `decisions[]` / `actionItems[]` fields on `Meeting.js` into its
 * own first-class collection so it can:
 *
 *   • carry a full lifecycle (open → in_progress → completed,
 *     with blocked / deferred / cancelled escapes)
 *
 *   • own an SLA clock (`meeting.decision.execution` from
 *     `sla.registry.js`)
 *
 *   • feed a cross-meeting follow-up board — "every open
 *     decision I own across all meetings, with days-to-due"
 *
 * Relationship: `meetingId` is required (every decision belongs
 * to exactly one meeting) but the meeting doc doesn't need to
 * know about the decision collection — queries go the other way.
 */

const mongoose = require('mongoose');
const {
  DECISION_TYPES,
  DECISION_STATUSES,
  PRIORITIES,
} = require('../../config/meetingGovernance.registry');

const statusHistorySchema = new mongoose.Schema(
  {
    from: { type: String, required: true },
    to: { type: String, required: true },
    event: { type: String, required: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    at: { type: Date, required: true, default: Date.now },
    notes: { type: String, default: null },
  },
  { _id: false }
);

const meetingDecisionSchema = new mongoose.Schema(
  {
    // ── identity ────────────────────────────────────────────────
    decisionNumber: { type: String, required: true, unique: true, uppercase: true },

    meetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Meeting',
      required: true,
      index: true,
    },
    meetingTitleSnapshot: { type: String, default: null },
    meetingDateSnapshot: { type: Date, default: null },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
      index: true,
    },

    // ── substance ───────────────────────────────────────────────
    type: { type: String, enum: DECISION_TYPES, default: 'directive' },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: null },
    rationale: { type: String, default: null },

    // ── ownership + timing ──────────────────────────────────────
    ownerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    ownerNameSnapshot: { type: String, default: null },
    assignedAt: { type: Date, default: Date.now },
    dueDate: { type: Date, required: true, index: true },
    priority: { type: String, enum: PRIORITIES, default: 'medium' },

    // ── state ────────────────────────────────────────────────────
    status: {
      type: String,
      enum: DECISION_STATUSES,
      default: 'open',
      index: true,
    },
    statusHistory: { type: [statusHistorySchema], default: [] },
    overdueFlaggedAt: { type: Date, default: null },

    // ── closure ──────────────────────────────────────────────────
    executionNotes: { type: String, default: null },
    deferReason: { type: String, default: null },
    completedAt: { type: Date, default: null },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // ── SLA backlink ────────────────────────────────────────────
    slaId: { type: mongoose.Schema.Types.ObjectId, ref: 'SLA', default: null, index: true },

    // ── misc ─────────────────────────────────────────────────────
    attachments: { type: [mongoose.Schema.Types.Mixed], default: [] },
    tags: { type: [String], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true, collection: 'meeting_decisions' }
);

// ── indexes ─────────────────────────────────────────────────────────
meetingDecisionSchema.index({ ownerUserId: 1, status: 1, dueDate: 1 });
meetingDecisionSchema.index({ branchId: 1, status: 1 });
meetingDecisionSchema.index({ meetingId: 1, status: 1 });
meetingDecisionSchema.index({ status: 1, dueDate: 1 });

// ── auto-numbering (DEC-YYYY-NNNNN) ─────────────────────────────────
meetingDecisionSchema.pre('validate', async function () {
  if (this.decisionNumber) return;
  const year = (this.assignedAt || new Date()).getUTCFullYear();
  const Model = mongoose.model('MeetingDecision');
  const count = await Model.countDocuments({
    decisionNumber: { $regex: `^DEC-${year}-` },
  });
  this.decisionNumber = `DEC-${year}-${String(count + 1).padStart(5, '0')}`;
});

// ── virtuals ────────────────────────────────────────────────────────

meetingDecisionSchema.virtual('isOverdue').get(function () {
  if (['completed', 'deferred', 'cancelled'].includes(this.status)) return false;
  return this.dueDate && this.dueDate < new Date();
});

meetingDecisionSchema.virtual('daysUntilDue').get(function () {
  if (!this.dueDate) return null;
  const ms = this.dueDate.getTime() - Date.now();
  return Math.ceil(ms / (24 * 3600 * 1000));
});

meetingDecisionSchema.set('toJSON', { virtuals: true });
meetingDecisionSchema.set('toObject', { virtuals: true });

const MeetingDecision =
  mongoose.models.MeetingDecision || mongoose.model('MeetingDecision', meetingDecisionSchema);

module.exports = MeetingDecision;

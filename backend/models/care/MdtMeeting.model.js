'use strict';

/**
 * MdtMeeting.model.js — Phase 17 Commit 5 (4.0.87).
 *
 * Multi-Disciplinary Team meeting — brings psychologist +
 * psychiatrist + social worker + care manager + (sometimes)
 * family together around one beneficiary. Used for risk-flag
 * reviews, care-plan formulation, discharge planning, etc.
 *
 * Auto-numbered `MDT-YYYY-NNNNN`.
 */

const mongoose = require('mongoose');
const { MDT_PURPOSES, MDT_ROLES, MDT_STATUSES } = require('../../config/care/psych.registry');

const attendeeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    nameSnapshot: { type: String, required: true },
    role: { type: String, enum: MDT_ROLES, required: true },
    attended: { type: Boolean, default: null }, // null = tbd, true = showed, false = no-show
    declineReason: { type: String, default: null },
  },
  { _id: true }
);

const decisionSchema = new mongoose.Schema(
  {
    topic: { type: String, required: true },
    decision: { type: String, required: true },
    rationale: { type: String, default: null },
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    dueDate: { type: Date, default: null },
  },
  { _id: true }
);

const actionItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: null },
    assignedToUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    dueDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'cancelled'],
      default: 'pending',
    },
    completedAt: { type: Date, default: null },
  },
  { _id: true }
);

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

const mdtMeetingSchema = new mongoose.Schema(
  {
    meetingNumber: { type: String, required: true, unique: true, uppercase: true },

    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
      index: true,
    },

    purpose: { type: String, enum: MDT_PURPOSES, required: true },

    // Scheduling
    scheduledFor: { type: Date, required: true, index: true },
    durationMinutes: { type: Number, default: 60, min: 15 },
    location: { type: String, default: null }, // room / video / phone
    meetingLink: { type: String, default: null },

    status: {
      type: String,
      enum: MDT_STATUSES,
      default: 'scheduled',
      index: true,
    },
    statusHistory: { type: [statusHistorySchema], default: [] },

    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    cancellationReason: { type: String, default: null },
    rescheduledTo: { type: Date, default: null },
    rescheduledToMeetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MdtMeeting',
      default: null,
    },

    // Participation
    chairUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    attendees: { type: [attendeeSchema], default: [] },

    // Inputs (what we're convening about)
    agenda: { type: [String], default: [] },
    relatedRiskFlagIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'PsychRiskFlag',
      default: [],
    },
    relatedCaseIds: { type: [mongoose.Schema.Types.ObjectId], ref: 'SocialCase', default: [] },

    // Outputs (what we decided)
    summary: { type: String, default: null },
    decisions: { type: [decisionSchema], default: [] },
    actionItems: { type: [actionItemSchema], default: [] },

    tags: { type: [String], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true, collection: 'care_mdt_meetings' }
);

mdtMeetingSchema.index({ beneficiaryId: 1, scheduledFor: -1 });
mdtMeetingSchema.index({ branchId: 1, status: 1, scheduledFor: 1 });
mdtMeetingSchema.index({ status: 1, scheduledFor: 1 });

mdtMeetingSchema.pre('validate', async function () {
  if (this.meetingNumber) return;
  const year = (this.scheduledFor || new Date()).getUTCFullYear();
  const Model = mongoose.model('MdtMeeting');
  const count = await Model.countDocuments({
    meetingNumber: { $regex: `^MDT-${year}-` },
  });
  this.meetingNumber = `MDT-${year}-${String(count + 1).padStart(5, '0')}`;
});

mdtMeetingSchema.virtual('isTerminal').get(function () {
  return ['completed', 'cancelled', 'rescheduled'].includes(this.status);
});

mdtMeetingSchema.virtual('openActionItems').get(function () {
  return (this.actionItems || []).filter(i => ['pending', 'in_progress'].includes(i.status)).length;
});

mdtMeetingSchema.set('toJSON', { virtuals: true });
mdtMeetingSchema.set('toObject', { virtuals: true });

const MdtMeeting = mongoose.models.MdtMeeting || mongoose.model('MdtMeeting', mdtMeetingSchema);

module.exports = MdtMeeting;

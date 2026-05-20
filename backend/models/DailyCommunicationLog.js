'use strict';

/**
 * DailyCommunicationLog — Wave 176.
 *
 * "دفتر التواصل اليومي" — the single most-touched parent-facing
 * artifact in day-rehab centers. Each weekday, the lead therapist
 * writes a structured note that parents read at home (mood + what
 * the kid achieved + behavior + meals + home recommendations).
 *
 * Distinct from:
 *  • ParentMessage — chat-style threading, not structured-daily.
 *  • Session notes (SOAP) — per-therapy-session clinical record.
 *  • DailyAttendance — only presence, no narrative.
 *
 * Wave-18 invariants:
 *   • (beneficiaryId, date) unique
 *   • parentSeenAt set ⇔ parentSeen true
 *   • meal pcts (when set) within [0,100]
 */

const mongoose = require('mongoose');

const MOODS = ['happy', 'excited', 'neutral', 'tired', 'sad', 'angry'];
const ENGAGEMENTS = ['high', 'medium', 'low'];

const BehaviorFlagsSchema = new mongoose.Schema(
  {
    calm: { type: Boolean, default: false },
    social: { type: Boolean, default: false },
    distressed: { type: Boolean, default: false },
    aggressive: { type: Boolean, default: false },
    selfStim: { type: Boolean, default: false },
    withdrawn: { type: Boolean, default: false },
  },
  { _id: false }
);

const MealParticipationSchema = new mongoose.Schema(
  {
    breakfast: { type: Number, default: null, min: 0, max: 100 },
    snack: { type: Number, default: null, min: 0, max: 100 },
    lunch: { type: Number, default: null, min: 0, max: 100 },
  },
  { _id: false }
);

const DailyCommunicationLogSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BeneficiarySection',
      default: null,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
      index: true,
    },
    date: { type: Date, required: true, index: true },

    // Author
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    authorName: { type: String, default: '', maxlength: 100 },

    // Mood
    mood: { type: String, enum: MOODS, default: 'neutral' },
    moodNote: { type: String, default: '', maxlength: 500 },

    // Achievements + activities
    achievements: { type: [String], default: () => [] },
    activities: { type: [String], default: () => [] },

    // Behavior
    behavior: { type: BehaviorFlagsSchema, default: () => ({}) },
    behaviorNote: { type: String, default: '', maxlength: 1000 },

    // Meals (also dedup'd into MealLog W178 — this is the parent-facing summary)
    meals: { type: MealParticipationSchema, default: () => ({}) },

    // Engagement + home follow-up
    engagement: { type: String, enum: ENGAGEMENTS, default: 'medium' },
    homeRecommendations: { type: String, default: '', maxlength: 2000 },
    privateNoteForParent: { type: String, default: '', maxlength: 2000 },

    // Photos / attachments
    photos: { type: [String], default: () => [] },
    attachments: { type: [String], default: () => [] },

    // Parent visibility — drives parent-portal unread badge
    parentSeen: { type: Boolean, default: false, index: true },
    parentSeenAt: { type: Date, default: null },
    parentResponse: { type: String, default: '', maxlength: 2000 },
    parentRespondedAt: { type: Date, default: null },

    // Internal status
    status: {
      type: String,
      enum: ['draft', 'published', 'amended'],
      default: 'published',
    },
  },
  { timestamps: true, collection: 'daily_communication_logs' }
);

DailyCommunicationLogSchema.index({ beneficiaryId: 1, date: 1 }, { unique: true });
DailyCommunicationLogSchema.index({ sectionId: 1, date: -1 });
DailyCommunicationLogSchema.index({ branchId: 1, date: -1 });
DailyCommunicationLogSchema.index({ parentSeen: 1, date: -1 });

DailyCommunicationLogSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

DailyCommunicationLogSchema.path('__invariants').validate(function () {
  let ok = true;
  if (this.parentSeen && !this.parentSeenAt) {
    this.invalidate('parentSeenAt', 'required when parentSeen is true');
    ok = false;
  }
  if (!this.parentSeen && this.parentSeenAt) {
    this.invalidate('parentSeen', 'must be true when parentSeenAt is set');
    ok = false;
  }
  return ok;
});

module.exports =
  mongoose.models.DailyCommunicationLog ||
  mongoose.model('DailyCommunicationLog', DailyCommunicationLogSchema);

module.exports.MOODS = MOODS;
module.exports.ENGAGEMENTS = ENGAGEMENTS;

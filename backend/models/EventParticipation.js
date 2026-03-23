/* eslint-disable no-unused-vars */
/**
 * EventParticipation Model — نموذج تتبع مشاركة المستفيدين في الفعاليات
 *
 * Tracks beneficiary attendance, engagement, and feedback for community events.
 */
const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    overallRating: { type: Number, min: 1, max: 5 },
    enjoymentLevel: { type: Number, min: 1, max: 5 },
    accessibilityRating: { type: Number, min: 1, max: 5 },
    socialInteractionRating: { type: Number, min: 1, max: 5 },
    wouldRecommend: { type: Boolean },
    comments: String,
    submittedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const attendanceRecordSchema = new mongoose.Schema(
  {
    sessionDate: { type: Date, required: true },
    checkInTime: Date,
    checkOutTime: Date,
    attended: { type: Boolean, default: false },
    absenceReason: String,
    notes: String,
  },
  { _id: true }
);

const eventParticipationSchema = new mongoose.Schema(
  {
    // ─── Participant & Event ───────────────────────────────────────────
    beneficiary: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: [true, 'معرف المستفيد مطلوب'],
      index: true,
    },
    activity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CommunityActivity',
      required: [true, 'معرف النشاط مطلوب'],
      index: true,
    },

    // ─── Registration ──────────────────────────────────────────────────
    registrationDate: { type: Date, default: Date.now },
    registrationSource: {
      type: String,
      enum: ['self', 'guardian', 'therapist', 'social_worker', 'system', 'partner_organization'],
      default: 'self',
    },
    registeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    registrationStatus: {
      type: String,
      enum: ['pending', 'confirmed', 'waitlisted', 'cancelled', 'no_show'],
      default: 'pending',
      index: true,
    },

    // ─── Participation Status ──────────────────────────────────────────
    participationStatus: {
      type: String,
      enum: ['registered', 'active', 'completed', 'withdrawn', 'suspended'],
      default: 'registered',
      index: true,
    },

    // ─── Attendance Tracking ───────────────────────────────────────────
    attendanceRecords: [attendanceRecordSchema],
    totalSessionsAttended: { type: Number, default: 0 },
    totalSessionsMissed: { type: Number, default: 0 },
    attendanceRate: { type: Number, min: 0, max: 100, default: 0 },

    // ─── Engagement Metrics ────────────────────────────────────────────
    engagementLevel: {
      type: String,
      enum: ['very_low', 'low', 'moderate', 'high', 'very_high'],
      default: 'moderate',
    },
    socialInteractionScore: { type: Number, min: 0, max: 100, default: 0 },
    skillDevelopmentScore: { type: Number, min: 0, max: 100, default: 0 },
    independenceScore: { type: Number, min: 0, max: 100, default: 0 },

    // ─── Observation Notes ─────────────────────────────────────────────
    observationNotes: [
      {
        date: { type: Date, default: Date.now },
        observer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        note: String,
        category: {
          type: String,
          enum: ['behavior', 'social', 'skill', 'health', 'general'],
          default: 'general',
        },
      },
    ],

    // ─── Accommodation & Support ───────────────────────────────────────
    accommodationsNeeded: [String],
    accommodationsProvided: [String],
    supportPersonnel: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    specialRequirements: String,

    // ─── Feedback ──────────────────────────────────────────────────────
    feedback: feedbackSchema,
    guardianFeedback: feedbackSchema,

    // ─── Transport ─────────────────────────────────────────────────────
    transportationProvided: { type: Boolean, default: false },
    transportationDetails: String,

    // ─── Outcomes ──────────────────────────────────────────────────────
    outcomes: {
      goalsAchieved: [String],
      skillsGained: [String],
      certificateIssued: { type: Boolean, default: false },
      certificateUrl: String,
      completionDate: Date,
    },

    // ─── Audit ─────────────────────────────────────────────────────────
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ─────────────────────────────────────────────────────────────────
eventParticipationSchema.index({ beneficiary: 1, activity: 1 }, { unique: true });
eventParticipationSchema.index({ participationStatus: 1, createdAt: -1 });
eventParticipationSchema.index({ activity: 1, participationStatus: 1 });
eventParticipationSchema.index({ beneficiary: 1, createdAt: -1 });
eventParticipationSchema.index({ attendanceRate: -1 });

// ─── Pre-save: recalculate attendance rate ───────────────────────────────────
eventParticipationSchema.pre('save', function (next) {
  const total = this.totalSessionsAttended + this.totalSessionsMissed;
  if (total > 0) {
    this.attendanceRate = Math.round((this.totalSessionsAttended / total) * 100);
  }
  next();
});

module.exports = mongoose.models.EventParticipation || mongoose.model('EventParticipation', eventParticipationSchema);

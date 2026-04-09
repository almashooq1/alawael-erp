/**
 * GroupSession — نموذج جلسة جماعية
 *
 * يسجل تفاصيل جلسة جماعية واحدة مع حضور كل مستفيد وتقدمه
 *
 * @module domains/group-therapy/models/GroupSession
 */

const mongoose = require('mongoose');

const memberAttendanceSchema = new mongoose.Schema(
  {
    beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'left_early', 'excused'],
      required: true,
    },
    participationLevel: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor', 'disruptive'],
    },
    individualNotes: String,
    goalsProgress: [
      {
        goalTitle: String,
        rating: { type: Number, min: 1, max: 5 },
        note: String,
      },
    ],
    behaviorNotes: String,
    peerInteractions: {
      type: String,
      enum: ['positive', 'neutral', 'negative', 'mixed'],
    },
  },
  { _id: false }
);

const groupSessionSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TherapyGroup',
      required: true,
      index: true,
    },

    // ── Session Info ────────────────────────────────────────────────────────
    sessionNumber: { type: Number, required: true },
    sessionDate: { type: Date, required: true, index: true },
    startTime: String,
    endTime: String,
    duration: { type: Number }, // minutes
    location: String,

    // ── Content ─────────────────────────────────────────────────────────────
    title: String,
    objectives: [String],
    activitiesConducted: [
      {
        name: String,
        duration: Number,
        description: String,
        materialsUsed: [String],
      },
    ],
    curriculumSessionRef: Number, // link to curriculum item

    // ── Attendance ──────────────────────────────────────────────────────────
    memberAttendance: [memberAttendanceSchema],

    // ── Group Dynamics ──────────────────────────────────────────────────────
    groupDynamics: {
      cohesion: { type: Number, min: 1, max: 5 },
      engagement: { type: Number, min: 1, max: 5 },
      challenges: [String],
      highlights: [String],
    },

    // ── SOAP Note (group-level) ─────────────────────────────────────────────
    soapNote: {
      subjective: String,
      objective: String,
      assessment: String,
      plan: String,
    },

    // ── Staff ───────────────────────────────────────────────────────────────
    leadTherapistId: { type: mongoose.Schema.Types.ObjectId },
    coTherapistIds: [{ type: mongoose.Schema.Types.ObjectId }],

    // ── Status ──────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed', 'cancelled', 'rescheduled'],
      default: 'scheduled',
      index: true,
    },
    cancellationReason: String,

    // ── Multi-tenant ────────────────────────────────────────────────────────
    branchId: { type: mongoose.Schema.Types.ObjectId, index: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId },

    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: 'group_sessions',
  }
);

groupSessionSchema.index({ groupId: 1, sessionDate: -1 });
groupSessionSchema.index({ 'memberAttendance.beneficiaryId': 1, sessionDate: -1 });

module.exports = mongoose.models.GroupSession || mongoose.model('GroupSession', groupSessionSchema);

'use strict';

const mongoose = require('mongoose');

// ── Functional Domain Score ──
const domainScoreSchema = new mongoose.Schema(
  {
    domain: {
      type: String,
      enum: [
        'COMMUNICATION',
        'DAILY_LIVING',
        'SOCIALIZATION',
        'MOTOR_SKILLS',
        'COGNITIVE',
        'EMOTIONAL',
        'VOCATIONAL',
        'ACADEMIC',
        'SELF_CARE',
        'COMMUNITY_PARTICIPATION',
      ],
      required: true,
    },
    domainAr: { type: String },
    scoreAtDischarge: { type: Number, min: 0, max: 100 },
    currentScore: { type: Number, min: 0, max: 100 },
    targetScore: { type: Number, min: 0, max: 100 },
    trend: {
      type: String,
      enum: ['IMPROVING', 'STABLE', 'DECLINING', 'FLUCTUATING'],
    },
    notes: { type: String },
  },
  { _id: false }
);

// ═══════════════════════════════════════════════════════════════════════════════
// FOLLOW-UP VISIT — زيارة متابعة
// ═══════════════════════════════════════════════════════════════════════════════

const followUpVisitSchema = new mongoose.Schema(
  {
    postRehabCase: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PostRehabCase',
      required: true,
    },
    beneficiary: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
    },

    // ── Visit Info ──
    visitNumber: { type: Number, required: true },
    visitType: {
      type: String,
      enum: [
        'HOME_VISIT',
        'PHONE_CALL',
        'VIDEO_CALL',
        'IN_PERSON',
        'SCHOOL_VISIT',
        'WORKPLACE_VISIT',
      ],
      required: true,
    },
    visitTypeAr: { type: String },
    status: {
      type: String,
      enum: ['SCHEDULED', 'COMPLETED', 'MISSED', 'CANCELLED', 'RESCHEDULED', 'IN_PROGRESS'],
      default: 'SCHEDULED',
    },

    // ── Timing ──
    scheduledDate: { type: Date, required: true },
    actualDate: { type: Date },
    duration: { type: Number }, // minutes

    // ── Location (for home visits) ──
    location: {
      type: { type: String, default: 'HOME' },
      address: { type: String },
      city: { type: String },
      coordinates: {
        lat: { type: Number },
        lng: { type: Number },
      },
    },

    // ── Assessment ──
    domainScores: [domainScoreSchema],
    overallProgress: {
      type: String,
      enum: ['EXCELLENT', 'GOOD', 'SATISFACTORY', 'NEEDS_ATTENTION', 'CRITICAL'],
    },
    progressPercentage: { type: Number, min: 0, max: 100 },
    goalsReviewed: [
      {
        goalDescription: { type: String },
        goalDescriptionAr: { type: String },
        status: {
          type: String,
          enum: ['ACHIEVED', 'IN_PROGRESS', 'NOT_STARTED', 'REGRESSED', 'MODIFIED'],
        },
        notes: { type: String },
      },
    ],

    // ── Family/Caregiver Feedback ──
    familyFeedback: {
      overallSatisfaction: { type: Number, min: 1, max: 5 },
      concerns: [String],
      requests: [String],
      strengthsObserved: [String],
      challengesFaced: [String],
    },

    // ── Specialist Observations ──
    observations: { type: String },
    observationsAr: { type: String },
    recommendations: [String],
    recommendationsAr: [String],
    needsReEnrollment: { type: Boolean, default: false },
    reEnrollmentReason: { type: String },

    // ── Attachments ──
    attachments: [
      {
        name: { type: String },
        url: { type: String },
        type: { type: String },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    // ── Metadata ──
    conductedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },
    notesAr: { type: String },
  },
  { timestamps: true }
);

followUpVisitSchema.index({ postRehabCase: 1, scheduledDate: 1 });
followUpVisitSchema.index({ beneficiary: 1, status: 1 });
followUpVisitSchema.index({ conductedBy: 1, scheduledDate: 1 });
followUpVisitSchema.index({ status: 1, scheduledDate: 1 });

const FollowUpVisit =
  mongoose.models.FollowUpVisit || mongoose.model('FollowUpVisit', followUpVisitSchema);

module.exports = FollowUpVisit;

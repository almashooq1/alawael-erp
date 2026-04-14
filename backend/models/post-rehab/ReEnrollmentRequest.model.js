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
// RE-ENROLLMENT REQUEST — طلب إعادة تسجيل
// ═══════════════════════════════════════════════════════════════════════════════

const reEnrollmentRequestSchema = new mongoose.Schema(
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

    // ── Request Info ──
    requestNumber: { type: String, unique: true },
    requestType: {
      type: String,
      enum: ['AUTOMATIC', 'SPECIALIST_RECOMMENDATION', 'FAMILY_REQUEST', 'EMERGENCY'],
      required: true,
    },
    requestTypeAr: { type: String },
    status: {
      type: String,
      enum: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ENROLLED', 'CANCELLED'],
      default: 'PENDING',
    },

    // ── Trigger Info (why re-enrollment is needed) ──
    triggerType: {
      type: String,
      enum: [
        'REGRESSION_DETECTED',
        'LOW_IMPACT_SCORE',
        'FAMILY_CONCERN',
        'SPECIALIST_OBSERVATION',
        'SURVEY_RESULT',
        'MISSED_MILESTONES',
        'NEW_DIAGNOSIS',
        'LIFE_CHANGE',
      ],
      required: true,
    },
    triggerDetails: { type: String },
    triggerDetailsAr: { type: String },

    // ── Evidence ──
    supportingEvidence: {
      impactMeasurement: { type: mongoose.Schema.Types.ObjectId, ref: 'ImpactMeasurement' },
      followUpVisit: { type: mongoose.Schema.Types.ObjectId, ref: 'FollowUpVisit' },
      survey: { type: mongoose.Schema.Types.ObjectId, ref: 'PostRehabSurvey' },
      domainScoresAtTrigger: [domainScoreSchema],
      riskLevel: {
        type: String,
        enum: ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'],
      },
    },

    // ── Recommended Program ──
    recommendedProgram: { type: mongoose.Schema.Types.ObjectId, ref: 'Program' },
    recommendedProgramName: { type: String },
    recommendedServices: [String],
    urgencyLevel: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      default: 'MEDIUM',
    },

    // ── Review Process ──
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewDate: { type: Date },
    reviewNotes: { type: String },
    reviewNotesAr: { type: String },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvalDate: { type: Date },
    rejectionReason: { type: String },

    // ── New Enrollment ──
    newEnrollmentId: { type: mongoose.Schema.Types.ObjectId },
    enrollmentDate: { type: Date },

    // ── Metadata ──
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },
    notesAr: { type: String },
  },
  { timestamps: true }
);

reEnrollmentRequestSchema.index({ postRehabCase: 1, status: 1 });
reEnrollmentRequestSchema.index({ beneficiary: 1 });
reEnrollmentRequestSchema.index({ status: 1, urgencyLevel: 1 });

// ── Auto-generate request number ──
reEnrollmentRequestSchema.pre('save', async function (next) {
  if (!this.requestNumber) {
    const count = await mongoose.model('ReEnrollmentRequest').countDocuments();
    const year = new Date().getFullYear();
    this.requestNumber = `RER-${year}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

const ReEnrollmentRequest =
  mongoose.models.ReEnrollmentRequest ||
  mongoose.model('ReEnrollmentRequest', reEnrollmentRequestSchema);

module.exports = ReEnrollmentRequest;

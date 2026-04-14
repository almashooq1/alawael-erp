'use strict';

const mongoose = require('mongoose');

// ── Contact Attempt Log ──
const contactAttemptSchema = new mongoose.Schema(
  {
    date: { type: Date, default: Date.now },
    method: {
      type: String,
      enum: ['PHONE', 'SMS', 'EMAIL', 'WHATSAPP', 'HOME_VISIT', 'VIDEO_CALL'],
      required: true,
    },
    outcome: {
      type: String,
      enum: ['REACHED', 'NO_ANSWER', 'WRONG_NUMBER', 'REFUSED', 'RESCHEDULED', 'LEFT_MESSAGE'],
      required: true,
    },
    notes: { type: String },
    contactedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: true }
);

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

// ── Alert/Flag ──
const alertSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        'REGRESSION',
        'MISSED_VISIT',
        'LOW_SATISFACTION',
        'URGENT_NEED',
        'RE_ENROLLMENT_RECOMMENDED',
        'CRITICAL_DECLINE',
      ],
      required: true,
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
    },
    message: { type: String },
    messageAr: { type: String },
    createdAt: { type: Date, default: Date.now },
    resolvedAt: { type: Date },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isResolved: { type: Boolean, default: false },
  },
  { _id: true }
);

// ═══════════════════════════════════════════════════════════════════════════════
// POST-REHAB CASE — حالة متابعة ما بعد التأهيل
// ═══════════════════════════════════════════════════════════════════════════════

const postRehabCaseSchema = new mongoose.Schema(
  {
    // ── References ──
    beneficiary: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
    },
    originalProgram: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Program',
    },
    originalProgramName: { type: String },
    originalProgramNameAr: { type: String },

    // ── Case Info ──
    caseNumber: {
      type: String,
      unique: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'ON_HOLD', 'COMPLETED', 'CLOSED', 'RE_ENROLLED', 'LOST_TO_FOLLOW_UP'],
      default: 'ACTIVE',
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
    },
    category: {
      type: String,
      enum: [
        'EARLY_INTERVENTION',
        'PHYSICAL_REHAB',
        'SPEECH_THERAPY',
        'OCCUPATIONAL_THERAPY',
        'BEHAVIORAL_THERAPY',
        'VOCATIONAL_REHAB',
        'EDUCATIONAL',
        'PSYCHOLOGICAL',
        'COMPREHENSIVE',
        'OTHER',
      ],
    },
    categoryAr: { type: String },

    // ── Discharge Info ──
    dischargeDate: { type: Date, required: true },
    dischargeReason: {
      type: String,
      enum: ['COMPLETED_PROGRAM', 'GOALS_MET', 'FAMILY_REQUEST', 'TRANSFERRED', 'AGE_OUT', 'OTHER'],
    },
    dischargeNotes: { type: String },
    dischargeScores: [domainScoreSchema],

    // ── Follow-up Plan ──
    followUpPlan: {
      frequency: {
        type: String,
        enum: ['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL'],
        default: 'MONTHLY',
      },
      duration: {
        type: String,
        enum: ['3_MONTHS', '6_MONTHS', '1_YEAR', '2_YEARS', '3_YEARS', 'INDEFINITE'],
        default: '2_YEARS',
      },
      preferredMethod: {
        type: String,
        enum: ['HOME_VISIT', 'PHONE', 'VIDEO_CALL', 'IN_PERSON', 'MIXED'],
        default: 'MIXED',
      },
      startDate: { type: Date },
      endDate: { type: Date },
      nextScheduledVisit: { type: Date },
      totalPlannedVisits: { type: Number, default: 0 },
      completedVisits: { type: Number, default: 0 },
      missedVisits: { type: Number, default: 0 },
    },

    // ── Impact Milestones ──
    impactMilestones: [
      {
        milestone: {
          type: String,
          enum: ['6_MONTHS', '1_YEAR', '2_YEARS'],
          required: true,
        },
        dueDate: { type: Date },
        completedDate: { type: Date },
        isCompleted: { type: Boolean, default: false },
        measurementId: { type: mongoose.Schema.Types.ObjectId, ref: 'ImpactMeasurement' },
      },
    ],

    // ── Alerts ──
    alerts: [alertSchema],

    // ── Contact History ──
    contactAttempts: [contactAttemptSchema],

    // ── Assigned Team ──
    assignedSpecialist: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedTeam: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    supervisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // ── Metadata ──
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    notes: { type: String },
    notesAr: { type: String },
    tags: [String],
  },
  { timestamps: true }
);

// ── Indexes ──
postRehabCaseSchema.index({ beneficiary: 1, status: 1 });
postRehabCaseSchema.index({ status: 1, 'followUpPlan.nextScheduledVisit': 1 });
postRehabCaseSchema.index({ assignedSpecialist: 1, status: 1 });
postRehabCaseSchema.index({ dischargeDate: 1 });

// ── Auto-generate case number ──
postRehabCaseSchema.pre('save', async function (next) {
  if (!this.caseNumber) {
    const count = await mongoose.model('PostRehabCase').countDocuments();
    const year = new Date().getFullYear();
    this.caseNumber = `PRF-${year}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

// ── Virtuals ──
postRehabCaseSchema.virtual('completionRate').get(function () {
  const total = this.followUpPlan?.totalPlannedVisits || 0;
  if (total === 0) return 0;
  return Math.round(((this.followUpPlan?.completedVisits || 0) / total) * 100);
});

postRehabCaseSchema.virtual('daysSinceDischarge').get(function () {
  if (!this.dischargeDate) return 0;
  return Math.floor((Date.now() - this.dischargeDate.getTime()) / (1000 * 60 * 60 * 24));
});

postRehabCaseSchema.set('toJSON', { virtuals: true });
postRehabCaseSchema.set('toObject', { virtuals: true });

const PostRehabCase =
  mongoose.models.PostRehabCase || mongoose.model('PostRehabCase', postRehabCaseSchema);

module.exports = PostRehabCase;

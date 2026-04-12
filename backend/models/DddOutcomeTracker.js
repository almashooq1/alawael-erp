'use strict';
/**
 * DddOutcomeTracker Model
 * Auto-extracted from services/dddOutcomeTracker.js
 */
const mongoose = require('mongoose');

const outcomeSnapshotSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    episodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EpisodeOfCare',
      required: true,
      index: true,
    },
    branchId: { type: mongoose.Schema.Types.ObjectId, index: true },

    /* Snapshot type */
    snapshotType: {
      type: String,
      enum: ['baseline', 'progress', 'discharge', 'follow_up', 'periodic'],
      required: true,
      index: true,
    },

    /* Overall outcome metrics */
    overallOutcomeScore: { type: Number, min: 0, max: 100 },
    overallStatus: {
      type: String,
      enum: [
        'significantly_improved',
        'improved',
        'maintained',
        'minimal_change',
        'declined',
        'significantly_declined',
      ],
    },

    /* Goal Attainment Scaling */
    gasScore: {
      totalGAS: Number,
      tScore: Number, // T-score (mean 50, SD 10)
      goalsEvaluated: Number,
      goalDetails: [
        {
          goalId: { type: mongoose.Schema.Types.ObjectId, ref: 'TherapeuticGoal' },
          title: String,
          weight: { type: Number, default: 1 },
          expectedLevel: { type: Number, default: 0 }, // -2 to +2 scale
          achievedLevel: Number,
          baselineProgress: Number,
          currentProgress: Number,
          targetProgress: Number,
        },
      ],
    },

    /* Effect sizes — per measure */
    effectSizes: [
      {
        measureId: { type: mongoose.Schema.Types.ObjectId, ref: 'Measure' },
        measureName: String,
        baselineScore: Number,
        currentScore: Number,
        baselineSD: Number,
        pooledSD: Number,
        cohensD: Number, // Cohen's d
        glassDelta: Number, // Glass's Δ
        percentChange: Number,
        interpretation: {
          type: String,
          enum: [
            'large_positive',
            'medium_positive',
            'small_positive',
            'negligible',
            'small_negative',
            'medium_negative',
            'large_negative',
          ],
        },
        isClinicallySignificant: Boolean,
        mcid: Number, // Minimal Clinically Important Difference
      },
    ],

    /* Domain-level outcomes */
    domainOutcomes: [
      {
        domain: String,
        baselineScore: Number,
        currentScore: Number,
        percentChange: Number,
        trend: { type: String, enum: ['improving', 'stable', 'declining'] },
      },
    ],

    /* Treatment metrics */
    treatmentMetrics: {
      totalSessions: Number,
      completedSessions: Number,
      attendanceRate: Number,
      averageGoalProgress: Number,
      goalsAchieved: Number,
      goalsTotal: Number,
      episodeDurationDays: Number,
      sessionsPerWeek: Number,
    },

    /* Discharge readiness */
    dischargeReadiness: {
      score: { type: Number, min: 0, max: 100 },
      isReady: Boolean,
      criteria: [
        {
          criterion: String,
          met: Boolean,
          weight: { type: Number, default: 1 },
          evidence: String,
        },
      ],
      recommendation: {
        type: String,
        enum: ['discharge', 'continue', 'step_down', 'step_up', 'refer'],
      },
      estimatedSessionsRemaining: Number,
    },

    /* Prediction */
    prediction: {
      expectedOutcomeScore: Number,
      expectedDischargeDate: Date,
      confidence: { type: Number, min: 0, max: 1 },
      predictedGoalAchievement: Number, // percentage
      basedOnSampleSize: Number,
    },

    /* Metadata */
    evaluatedAt: { type: Date, default: Date.now },
    evaluatedBy: { type: String, default: 'system' },
    processingTimeMs: Number,
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

outcomeSnapshotSchema.index({ beneficiaryId: 1, episodeId: 1, snapshotType: 1, evaluatedAt: -1 });
outcomeSnapshotSchema.index({ branchId: 1, snapshotType: 1, evaluatedAt: -1 });

const DDDOutcomeSnapshot =
  mongoose.models.DDDOutcomeSnapshot || mongoose.model('DDDOutcomeSnapshot', outcomeSnapshotSchema);

/* ═══════════════════════════════════════════════════════════════════════
   2. Effect Size Calculations
   ═══════════════════════════════════════════════════════════════════════ */

module.exports = {
  DDDOutcomeSnapshot,
};

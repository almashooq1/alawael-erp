/* eslint-disable no-unused-vars */
/**
 * IntegrationAssessment Model — نموذج قياس مستوى الاندماج الاجتماعي
 *
 * Measures and tracks the social integration level of beneficiaries over time
 * across multiple dimensions: social, vocational, educational, and daily living.
 */
const mongoose = require('mongoose');

const dimensionScoreSchema = new mongoose.Schema(
  {
    dimension: {
      type: String,
      enum: [
        'social_relationships',
        'communication_skills',
        'community_participation',
        'daily_living_skills',
        'vocational_readiness',
        'educational_engagement',
        'emotional_wellbeing',
        'self_advocacy',
        'cultural_participation',
        'digital_inclusion',
      ],
      required: true,
    },
    score: { type: Number, min: 0, max: 100, required: true },
    previousScore: { type: Number, min: 0, max: 100 },
    targetScore: { type: Number, min: 0, max: 100 },
    notes: String,
    indicators: [
      {
        name: String,
        value: { type: Number, min: 0, max: 5 },
        description: String,
      },
    ],
  },
  { _id: false }
);

const integrationGoalSchema = new mongoose.Schema(
  {
    goalDescription: { type: String, required: true },
    dimension: {
      type: String,
      enum: [
        'social_relationships',
        'communication_skills',
        'community_participation',
        'daily_living_skills',
        'vocational_readiness',
        'educational_engagement',
        'emotional_wellbeing',
        'self_advocacy',
        'cultural_participation',
        'digital_inclusion',
      ],
    },
    targetDate: Date,
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'achieved', 'partially_achieved', 'not_achieved'],
      default: 'not_started',
    },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    interventions: [String],
  },
  { _id: true }
);

const integrationAssessmentSchema = new mongoose.Schema(
  {
    // ─── Subject ───────────────────────────────────────────────────────
    beneficiary: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: [true, 'معرف المستفيد مطلوب'],
      index: true,
    },

    // ─── Assessment Info ───────────────────────────────────────────────
    assessmentDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    assessmentType: {
      type: String,
      enum: ['initial', 'periodic', 'follow_up', 'discharge', 'annual'],
      required: true,
      index: true,
    },
    assessmentPeriod: {
      startDate: Date,
      endDate: Date,
    },
    assessor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    secondaryAssessors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    // ─── Dimension Scores ──────────────────────────────────────────────
    dimensionScores: [dimensionScoreSchema],

    // ─── Overall Scores ────────────────────────────────────────────────
    overallIntegrationScore: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
    },
    previousOverallScore: { type: Number, min: 0, max: 100 },
    integrationLevel: {
      type: String,
      enum: ['minimal', 'partial', 'moderate', 'substantial', 'full'],
      required: true,
    },
    trend: {
      type: String,
      enum: ['improving', 'stable', 'declining'],
      default: 'stable',
    },

    // ─── Goals & Recommendations ───────────────────────────────────────
    integrationGoals: [integrationGoalSchema],
    recommendations: [
      {
        area: String,
        recommendation: String,
        priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
        assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],

    // ─── Barriers & Facilitators ───────────────────────────────────────
    barriers: [
      {
        type: {
          type: String,
          enum: [
            'environmental',
            'attitudinal',
            'institutional',
            'personal',
            'financial',
            'transportation',
          ],
        },
        description: String,
        severity: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
        mitigationPlan: String,
      },
    ],
    facilitators: [
      {
        type: {
          type: String,
          enum: [
            'family_support',
            'community_resources',
            'technology',
            'peer_network',
            'professional_support',
            'policy',
          ],
        },
        description: String,
        effectiveness: { type: String, enum: ['low', 'moderate', 'high'], default: 'moderate' },
      },
    ],

    // ─── Evidence & Activities ─────────────────────────────────────────
    linkedActivities: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CommunityActivity',
      },
    ],
    linkedParticipations: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'EventParticipation',
      },
    ],
    evidenceNotes: String,

    // ─── Status ────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['draft', 'in_progress', 'completed', 'reviewed', 'approved'],
      default: 'draft',
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewDate: Date,
    reviewNotes: String,

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
integrationAssessmentSchema.index({ beneficiary: 1, assessmentDate: -1 });
integrationAssessmentSchema.index({ assessmentType: 1, status: 1 });
integrationAssessmentSchema.index({ integrationLevel: 1 });
integrationAssessmentSchema.index({ overallIntegrationScore: -1 });
integrationAssessmentSchema.index({ assessor: 1, assessmentDate: -1 });

// ─── Pre-save: determine integration level ───────────────────────────────────
integrationAssessmentSchema.pre('save', function (next) {
  const score = this.overallIntegrationScore;
  if (score <= 20) this.integrationLevel = 'minimal';
  else if (score <= 40) this.integrationLevel = 'partial';
  else if (score <= 60) this.integrationLevel = 'moderate';
  else if (score <= 80) this.integrationLevel = 'substantial';
  else this.integrationLevel = 'full';

  // Calculate trend if previous score exists
  if (this.previousOverallScore != null) {
    const diff = score - this.previousOverallScore;
    if (diff > 5) this.trend = 'improving';
    else if (diff < -5) this.trend = 'declining';
    else this.trend = 'stable';
  }

  next();
});

module.exports = mongoose.models.IntegrationAssessment || mongoose.model('IntegrationAssessment', integrationAssessmentSchema);

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
// IMPACT MEASUREMENT — قياس الأثر طويل المدى
// ═══════════════════════════════════════════════════════════════════════════════

const impactMeasurementSchema = new mongoose.Schema(
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

    // ── Measurement Period ──
    milestone: {
      type: String,
      enum: ['6_MONTHS', '1_YEAR', '2_YEARS'],
      required: true,
    },
    milestoneAr: { type: String },
    measurementDate: { type: Date, default: Date.now },
    monthsSinceDischarge: { type: Number },

    // ── Domain Scores ──
    domainScores: [domainScoreSchema],
    overallScore: { type: Number, min: 0, max: 100 },
    overallScoreAtDischarge: { type: Number, min: 0, max: 100 },
    improvementPercentage: { type: Number },

    // ── Quality of Life ──
    qualityOfLife: {
      physicalWellbeing: { type: Number, min: 0, max: 10 },
      emotionalWellbeing: { type: Number, min: 0, max: 10 },
      socialInclusion: { type: Number, min: 0, max: 10 },
      independenceLevel: { type: Number, min: 0, max: 10 },
      familySatisfaction: { type: Number, min: 0, max: 10 },
      overallScore: { type: Number, min: 0, max: 10 },
    },

    // ── Functional Independence ──
    functionalIndependence: {
      selfCareLevel: {
        type: String,
        enum: [
          'FULLY_INDEPENDENT',
          'MOSTLY_INDEPENDENT',
          'PARTIALLY_DEPENDENT',
          'MOSTLY_DEPENDENT',
          'FULLY_DEPENDENT',
        ],
      },
      mobilityLevel: {
        type: String,
        enum: [
          'FULLY_INDEPENDENT',
          'MOSTLY_INDEPENDENT',
          'PARTIALLY_DEPENDENT',
          'MOSTLY_DEPENDENT',
          'FULLY_DEPENDENT',
        ],
      },
      communicationLevel: {
        type: String,
        enum: [
          'FULLY_INDEPENDENT',
          'MOSTLY_INDEPENDENT',
          'PARTIALLY_DEPENDENT',
          'MOSTLY_DEPENDENT',
          'FULLY_DEPENDENT',
        ],
      },
      socialLevel: {
        type: String,
        enum: [
          'FULLY_INDEPENDENT',
          'MOSTLY_INDEPENDENT',
          'PARTIALLY_DEPENDENT',
          'MOSTLY_DEPENDENT',
          'FULLY_DEPENDENT',
        ],
      },
    },

    // ── Education / Employment ──
    educationStatus: {
      enrolled: { type: Boolean },
      schoolType: {
        type: String,
        enum: [
          'MAINSTREAM',
          'SPECIAL_EDUCATION',
          'INCLUSIVE',
          'HOME_SCHOOLING',
          'VOCATIONAL',
          'NOT_APPLICABLE',
        ],
      },
      gradeLevel: { type: String },
      performanceLevel: {
        type: String,
        enum: ['EXCELLENT', 'GOOD', 'AVERAGE', 'BELOW_AVERAGE', 'STRUGGLING'],
      },
      supportsReceived: [String],
    },
    employmentStatus: {
      employed: { type: Boolean },
      employmentType: {
        type: String,
        enum: [
          'FULL_TIME',
          'PART_TIME',
          'SHELTERED',
          'SUPPORTED',
          'SELF_EMPLOYED',
          'NOT_APPLICABLE',
        ],
      },
      employer: { type: String },
      jobSatisfaction: { type: Number, min: 1, max: 5 },
    },

    // ── Community Integration ──
    communityIntegration: {
      participatesInActivities: { type: Boolean },
      activityTypes: [String],
      socialNetworkSize: {
        type: String,
        enum: ['NONE', 'SMALL', 'MODERATE', 'LARGE'],
      },
      communityBarriers: [String],
      usesPublicServices: { type: Boolean },
    },

    // ── Analysis ──
    overallTrend: {
      type: String,
      enum: [
        'SIGNIFICANT_IMPROVEMENT',
        'MODERATE_IMPROVEMENT',
        'STABLE',
        'SLIGHT_DECLINE',
        'SIGNIFICANT_DECLINE',
      ],
    },
    riskLevel: {
      type: String,
      enum: ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'],
      default: 'LOW',
    },
    needsIntervention: { type: Boolean, default: false },
    interventionRecommendations: [String],

    // ── Metadata ──
    assessedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },
    notesAr: { type: String },
  },
  { timestamps: true }
);

impactMeasurementSchema.index({ postRehabCase: 1, milestone: 1 });
impactMeasurementSchema.index({ beneficiary: 1, measurementDate: -1 });
impactMeasurementSchema.index({ overallTrend: 1, riskLevel: 1 });

// ── Auto-calculate months since discharge ──
impactMeasurementSchema.pre('save', async function (next) {
  if (this.isNew || this.isModified('measurementDate')) {
    try {
      const postRehabCase = await mongoose.model('PostRehabCase').findById(this.postRehabCase);
      if (postRehabCase?.dischargeDate) {
        this.monthsSinceDischarge = Math.round(
          (this.measurementDate - postRehabCase.dischargeDate) / (1000 * 60 * 60 * 24 * 30.44)
        );
      }
    } catch {
      // silent
    }
  }
  next();
});

const ImpactMeasurement =
  mongoose.models.ImpactMeasurement || mongoose.model('ImpactMeasurement', impactMeasurementSchema);

module.exports = ImpactMeasurement;

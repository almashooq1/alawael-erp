'use strict';

const mongoose = require('mongoose');

// ============================
// 2. نموذج المقاييس الرئيسي (Measurement Master)
// ============================
const MeasurementMasterSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      example: 'MEAS-IQ-WECHSLER-001',
    },

    typeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MeasurementType',
      required: true,
    },

    nameAr: {
      type: String,
      required: true,
      trim: true,
      example: 'مقياس وكسلر للذكاء (الإصدار الخامس)',
    },

    nameEn: {
      type: String,
      required: true,
      trim: true,
      example: 'Wechsler Intelligence Scale (Version 5)',
    },

    description: String,

    version: {
      number: String,
      releaseDate: Date,
      author: String,
    },

    targetDisabilities: [
      {
        type: String,
        ref: 'MeasurementType.targetDisabilities',
      },
    ],

    ageRange: {
      minAge: Number,
      maxAge: Number,
    },

    administrationGuide: String,

    items: [
      {
        itemNumber: Number,
        questionAr: String,
        questionEn: String,
        domainCode: String,
        scoringInstructions: String,
        maxScore: Number,
      },
    ],

    totalItems: Number,

    estimatedDuration: {
      type: Number,
      description: 'الدقائق',
    },

    scoringMethod: {
      type: String,
      enum: ['MANUAL', 'AUTOMATED', 'BOTH'],
    },

    scoringGuide: String,

    normTables: {
      population: String,
      year: Number,
      ageGroups: [
        {
          ageRange: String,
          meanScore: Number,
          standardDeviation: Number,
          percentiles: {},
        },
      ],
    },

    reliabilityCoefficients: {
      cronbachAlpha: Number,
      testRetest: Number,
      interRater: Number,
    },

    validityInfo: {
      constructValidity: String,
      criterionValidity: String,
      notes: String,
    },

    interpretationGuide: {
      scoreRange: [
        {
          min: Number,
          max: Number,
          level: String,
          description: String,
          implication: String,
        },
      ],
      specialConsiderations: [String],
    },

    requiredCertifications: [String],

    culturalAdaptations: [
      {
        culturalContext: String,
        modifications: [String],
        validationData: String,
      },
    ],

    // ── W325 Pass 1 — additive governance fields ──────────────────────────
    // Lifecycle, scoring semantics, and multi-discipline reach. All optional
    // / defaulted so this Pass is non-breaking on existing documents. State
    // machine + lifecycleHistory append-only + GAS_LINKED/COMPOSITE scoring
    // ship in Pass 2.

    abbreviation: {
      type: String,
      trim: true,
      maxlength: 20,
      index: true,
    },

    disciplines: [
      {
        type: String,
        enum: [
          'PT',
          'OT',
          'SLP',
          'PSYCHOLOGY',
          'SPECIAL_ED',
          'SOCIAL_WORK',
          'BEHAVIOR_ANALYSIS',
          'NURSING',
        ],
      },
    ],

    scoreUnits: {
      type: String,
      enum: [
        'NONE',
        'SECONDS',
        'REPETITIONS',
        'PERCENTAGE',
        'STANDARD_SCORE',
        'T_SCORE',
        'Z_SCORE',
        'AGE_EQUIVALENT',
        'GRADE_EQUIVALENT',
      ],
    },

    scoreDirection: {
      type: String,
      enum: ['HIGHER_IS_BETTER', 'LOWER_IS_BETTER', 'TARGET_RANGE', 'NEUTRAL'],
    },

    lifecycleStatus: {
      type: String,
      enum: ['DRAFT', 'ACTIVE', 'DEPRECATED', 'RETIRED'],
      default: 'ACTIVE',
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'measurement_masters' }
);

// ============================
// Indexes
// ============================
MeasurementMasterSchema.index({ typeId: 1, isActive: 1 });
MeasurementMasterSchema.index({ targetDisabilities: 1 });
// code: removed — unique:true creates implicit index

const MeasurementMaster =
  mongoose.models.MeasurementMaster || mongoose.model('MeasurementMaster', MeasurementMasterSchema);

module.exports = MeasurementMaster;

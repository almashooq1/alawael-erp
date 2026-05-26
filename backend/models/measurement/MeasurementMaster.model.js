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

    // ── W325 Pass 2 — append-only lifecycle audit trail ───────────────────
    // Pushed by service layer when transitioning lifecycleStatus. Each entry
    // captures from/to + actor + reasonCode + notes + timestamp. Never
    // mutated; corrections are new entries referencing the prior state.
    // Transition validation lives in backend/intelligence/measure-lifecycle.lib.js
    lifecycleHistory: [
      {
        fromStatus: {
          type: String,
          enum: ['DRAFT', 'ACTIVE', 'DEPRECATED', 'RETIRED'],
        },
        toStatus: {
          type: String,
          enum: ['DRAFT', 'ACTIVE', 'DEPRECATED', 'RETIRED'],
          required: true,
        },
        actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reasonCode: { type: String, trim: true },
        notes: { type: String, trim: true },
        at: { type: Date, default: Date.now },
      },
    ],

    // ── W325 Pass 2 — scoringType taxonomy (Master-level) ─────────────────
    // Supersedes MeasurementType.scoringMethod (kept for backward-compat).
    // GAS_LINKED integrates backend/models/GasScale.js. COMPOSITE references
    // other measures via compositeOf[]; cycle prevention enforced by
    // backend/intelligence/measure-lifecycle.lib.js → checkCompositeNoSelfReference.
    scoringType: {
      type: String,
      enum: [
        'NUMERIC_TOTAL',
        'SUBSCALES',
        'PERCENTAGE',
        'ORDINAL',
        'CHECKLIST',
        'FREQUENCY_COUNT',
        'SEVERITY_BAND',
        'NARRATIVE',
        'GAS_LINKED',
        'COMPOSITE',
      ],
    },

    // ── W325 Pass 2 — COMPOSITE scoring component refs ────────────────────
    // Used only when scoringType === 'COMPOSITE'. Each entry weights a
    // referenced measure's standardized score into the composite total.
    // Direct self-reference rejected by lib; multi-hop cycle is a
    // service-layer concern (requires collection walk).
    compositeOf: [
      {
        measureId: { type: mongoose.Schema.Types.ObjectId, ref: 'MeasurementMaster' },
        weight: { type: Number, min: 0, max: 1 },
      },
    ],

    isActive: {
      type: Boolean,
      default: true,
    },

    // ─── W453 — Default ICF qualifier mapping ───────────────────────────
    // Each measure can declare a default ICF code + qualifier algorithm
    // so that MeasureRecord saves can auto-populate `icfQualifier` from
    // the recorded value. See backend/intelligence/icf-qualifier-mapping.lib.js
    // for the algorithms.
    //
    // qualifierAlgorithm semantics:
    //   'direct_5_band'   — bands[i].minValue ≤ value ≤ bands[i].maxValue → qualifier
    //   'inverse_5_band'  — same as direct but flips qualifier (higher value = lower impairment)
    //   'threshold_based' — single threshold; value ≥ threshold → qualifier else 0
    //   'manual'          — never auto-populate; clinician decides
    defaultIcfMapping: {
      primary: { type: String, match: /^[bsde]\d+$/ },
      secondary: [{ type: String, match: /^[bsde]\d+$/ }],
      qualifierAlgorithm: {
        type: String,
        enum: ['direct_5_band', 'inverse_5_band', 'threshold_based', 'manual'],
        default: 'manual',
      },
      qualifierBands: [
        {
          minValue: { type: Number },
          maxValue: { type: Number },
          qualifier: { type: Number, min: 0, max: 4 },
        },
      ],
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
// W453 — fast lookup by primary ICF code for ICF-coded outcome reports
MeasurementMasterSchema.index({ 'defaultIcfMapping.primary': 1 });
// code: removed — unique:true creates implicit index

const MeasurementMaster =
  mongoose.models.MeasurementMaster || mongoose.model('MeasurementMaster', MeasurementMasterSchema);

module.exports = MeasurementMaster;

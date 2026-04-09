/**
 * Measure Model — مكتبة المقاييس المركزية
 *
 * مقياس تقييمي موحد يمثل أداة تقييم سريرية معتمدة.
 * أمثلة: Vineland, PDMS, Denver, Bayley, CARS, ABC, etc.
 *
 * @module domains/goals/models/Measure
 */

const mongoose = require('mongoose');

const scoringRuleSchema = new mongoose.Schema(
  {
    rangeLabel: String,
    rangeLabel_ar: String,
    minScore: Number,
    maxScore: Number,
    interpretation: String,
    interpretation_ar: String,
    color: String,
    severity: { type: String, enum: ['normal', 'mild', 'moderate', 'severe', 'critical'] },
  },
  { _id: true }
);

const domainDefinitionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    name: { type: String, required: true },
    name_ar: String,
    description: String,
    maxScore: Number,
    weight: { type: Number, default: 1 },
    items: [
      {
        label: String,
        label_ar: String,
        maxScore: Number,
        scoringType: {
          type: String,
          enum: ['numeric', 'likert', 'binary', 'percentage', 'rating'],
        },
        options: [{ value: Number, label: String, label_ar: String }],
      },
    ],
  },
  { _id: true }
);

const measureSchema = new mongoose.Schema(
  {
    // ── Identity ───────────────────────────────────────────────────────
    code: { type: String, unique: true, required: true, index: true },
    name: { type: String, required: true },
    name_ar: String,
    abbreviation: String,
    version: String,
    description: String,
    description_ar: String,

    // ── Classification ─────────────────────────────────────────────────
    category: {
      type: String,
      enum: [
        'developmental',
        'behavioral',
        'cognitive',
        'motor',
        'speech_language',
        'social',
        'adaptive',
        'academic',
        'sensory',
        'quality_of_life',
        'functional',
        'screening',
        'diagnostic',
        'outcome',
        'custom',
      ],
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'standardized',
        'criterion_referenced',
        'norm_referenced',
        'checklist',
        'rating_scale',
        'observation',
        'interview',
        'custom',
      ],
      default: 'standardized',
    },
    targetPopulation: [
      {
        type: String,
        enum: [
          'children',
          'adolescents',
          'adults',
          'autism',
          'intellectual_disability',
          'cerebral_palsy',
          'down_syndrome',
          'language_delay',
          'learning_disability',
          'physical_disability',
          'all',
        ],
      },
    ],
    ageRange: {
      min: Number,
      max: Number,
      unit: { type: String, enum: ['months', 'years'], default: 'years' },
    },

    // ── Scoring ────────────────────────────────────────────────────────
    scoringType: {
      type: String,
      enum: [
        'numeric',
        'likert',
        'binary',
        'percentage',
        'percentile',
        'standard_score',
        'age_equivalent',
        'composite',
      ],
      default: 'numeric',
    },
    maxScore: Number,
    minScore: { type: Number, default: 0 },
    scoringDirection: {
      type: String,
      enum: ['higher_better', 'lower_better'],
      default: 'higher_better',
    },
    scoringRules: [scoringRuleSchema],

    // ── Domains (أبعاد المقياس) ────────────────────────────────────
    domains: [domainDefinitionSchema],

    // ── Psychometric Properties ────────────────────────────────────────
    psychometrics: {
      reliability: { type: Number, min: 0, max: 1 },
      validity: { type: Number, min: 0, max: 1 },
      sensitivityToChange: { type: String, enum: ['low', 'moderate', 'high'] },
      mcid: Number, // Minimal Clinically Important Difference
      sem: Number, // Standard Error of Measurement
    },

    // ── Administration ─────────────────────────────────────────────────
    administrationTime: Number, // in minutes
    administeredBy: [
      {
        type: String,
        enum: [
          'speech_therapist',
          'occupational_therapist',
          'physical_therapist',
          'psychologist',
          'special_educator',
          'physician',
          'nurse',
          'social_worker',
          'any_trained',
          'parent_caregiver',
        ],
      },
    ],
    trainingRequired: { type: Boolean, default: false },
    licenseRequired: { type: Boolean, default: false },

    // ── References ─────────────────────────────────────────────────────
    publisher: String,
    referenceUrl: String,
    citation: String,
    evidenceLevel: {
      type: String,
      enum: ['level_1', 'level_2', 'level_3', 'level_4', 'level_5', 'expert_opinion'],
    },

    // ── Status ─────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['active', 'deprecated', 'draft', 'under_review'],
      default: 'active',
      index: true,
    },
    isGlobal: { type: Boolean, default: true },

    // ── Audit ──────────────────────────────────────────────────────────
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false },
    tags: [String],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    collection: 'measures_library',
  }
);

// ─── Indexes ────────────────────────────────────────────────────────────────

measureSchema.index({ category: 1, status: 1 });
measureSchema.index({ name: 'text', name_ar: 'text', abbreviation: 'text' });
measureSchema.index({ targetPopulation: 1 });

// ─── Methods ────────────────────────────────────────────────────────────────

measureSchema.methods.interpretScore = function (score) {
  if (!this.scoringRules || this.scoringRules.length === 0) return null;
  const rule = this.scoringRules.find(r => score >= r.minScore && score <= r.maxScore);
  return rule || null;
};

measureSchema.methods.isApplicable = function (ageInMonths, disabilityType) {
  if (this.ageRange?.min != null && this.ageRange?.max != null) {
    const ageValue = this.ageRange.unit === 'years' ? ageInMonths / 12 : ageInMonths;
    if (ageValue < this.ageRange.min || ageValue > this.ageRange.max) return false;
  }
  if (disabilityType && this.targetPopulation?.length > 0) {
    if (!this.targetPopulation.includes('all') && !this.targetPopulation.includes(disabilityType))
      return false;
  }
  return true;
};

// ─── Statics ────────────────────────────────────────────────────────────────

measureSchema.statics.findApplicable = async function (ageInMonths, disabilityType, category) {
  const query = { status: 'active', isDeleted: { $ne: true } };
  if (category) query.category = category;
  if (disabilityType) {
    query.$or = [{ targetPopulation: 'all' }, { targetPopulation: disabilityType }];
  }

  const measures = await this.find(query).lean();
  return measures.filter(m => {
    if (m.ageRange?.min != null && m.ageRange?.max != null) {
      const ageValue = m.ageRange?.unit === 'years' ? ageInMonths / 12 : ageInMonths;
      return ageValue >= m.ageRange.min && ageValue <= m.ageRange.max;
    }
    return true;
  });
};

const Measure = mongoose.models.Measure || mongoose.model('Measure', measureSchema);

module.exports = { Measure, measureSchema };

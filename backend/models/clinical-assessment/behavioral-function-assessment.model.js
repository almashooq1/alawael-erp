'use strict';

/**
 * Behavioral Function Assessment — تقييم وظيفة السلوك
 * FBA رسمي مع MAS + تحليل وظيفي + خطة BIP
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const BehavioralFunctionSchema = new Schema(
  {
    beneficiary: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    assessor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    bcba_supervisor: { type: Schema.Types.ObjectId, ref: 'User' },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    assessment_date: { type: Date, default: Date.now },

    // ── السلوك المستهدف Target Behavior
    target_behavior: {
      name_ar: { type: String, required: true },
      operational_definition_ar: { type: String, required: true },
      topography: String,
      measurement_method: {
        type: String,
        enum: ['frequency', 'duration', 'interval', 'latency', 'intensity'],
      },
      baseline_data: {
        average_frequency: Number,
        average_duration_minutes: Number,
        average_intensity: Number,
        data_collection_days: Number,
      },
    },

    // ── MAS — Motivation Assessment Scale (مقياس تقييم الدافعية)
    motivation_assessment: {
      items: [
        {
          item_number: Number,
          question_ar: String,
          function_category: { type: String, enum: ['sensory', 'escape', 'attention', 'tangible'] },
          score: { type: Number, min: 0, max: 6 }, // 0=أبداً -> 6=دائماً
        },
      ],
      function_scores: {
        sensory: { mean: Number, rank: Number },
        escape: { mean: Number, rank: Number },
        attention: { mean: Number, rank: Number },
        tangible: { mean: Number, rank: Number },
      },
      primary_function: {
        type: String,
        enum: ['sensory', 'escape', 'attention', 'tangible', 'multiple'],
      },
      primary_function_ar: String,
    },

    // ── المقابلات والملاحظات Indirect & Direct Assessment
    indirect_assessment: {
      informants: [{ name: String, role: String, date: Date }],
      setting_events: [String],
      antecedent_summary: [String],
      consequence_summary: [String],
    },

    direct_observation: {
      observation_sessions: [
        {
          date: Date,
          duration_minutes: Number,
          setting: String,
          frequency: Number,
          antecedents_observed: [String],
          consequences_observed: [String],
        },
      ],
      abc_data_ref: { type: Schema.Types.ObjectId, ref: 'ABCDataCollection' },
    },

    // ── الفرضية Hypothesis Statement
    hypothesis: {
      statement_ar: { type: String },
      antecedent_ar: String,
      behavior_ar: String,
      function_ar: String,
      confidence_level: { type: Number, min: 0, max: 100 },
      alternative_hypotheses: [{ statement_ar: String, confidence: Number }],
    },

    // ── خطة التدخل السلوكي BIP — Behavior Intervention Plan
    behavior_intervention_plan: {
      antecedent_strategies: [
        {
          strategy_ar: String,
          rationale_ar: String,
          implementation_steps: [String],
        },
      ],
      replacement_behaviors: [
        {
          behavior_ar: String,
          teaching_method: {
            type: String,
            enum: ['FCT', 'DRA', 'DRI', 'DRO', 'modeling', 'shaping', 'chaining'],
          },
          teaching_steps: [String],
          mastery_criteria: String,
        },
      ],
      reinforcement_strategies: [
        {
          type: {
            type: String,
            enum: ['positive', 'negative', 'token', 'social', 'activity', 'natural'],
          },
          description_ar: String,
          schedule: { type: String, enum: ['continuous', 'FR', 'VR', 'FI', 'VI'] },
          schedule_value: Number,
        },
      ],
      crisis_management: {
        de_escalation_steps: [String],
        safety_procedures: [String],
        emergency_contacts: [{ name: String, phone: String, role: String }],
      },
      goals: [
        {
          goal_ar: String,
          target_level: String,
          measurement_method: String,
          review_date: Date,
        },
      ],
    },

    status: {
      type: String,
      enum: ['draft', 'assessment_complete', 'bip_active', 'reviewed', 'closed'],
      default: 'draft',
    },
    notes: { type: String },
  },
  { timestamps: true, collection: 'behavioral_function_assessments' }
);

BehavioralFunctionSchema.index({ beneficiary: 1, assessment_date: -1 });
BehavioralFunctionSchema.index({ branch: 1, status: 1, createdAt: -1 });
BehavioralFunctionSchema.index({ notes: 'text', 'target_behavior.description': 'text' });

BehavioralFunctionSchema.statics.paginate = async function (filter = {}, options = {}) {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 20));
  const skip = (page - 1) * limit;
  const sort = options.sort || { createdAt: -1 };
  const [docs, total] = await Promise.all([
    this.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    this.countDocuments(filter),
  ]);
  return {
    docs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
};

BehavioralFunctionSchema.statics.latestFor = function (beneficiaryId) {
  return this.findOne({ beneficiary: beneficiaryId, status: { $ne: 'deleted' } })
    .sort({ createdAt: -1 })
    .populate('assessor', 'name role')
    .lean();
};

const BehavioralFunctionAssessment =
  mongoose.models.BehavioralFunctionAssessment ||
  mongoose.model('BehavioralFunctionAssessment', BehavioralFunctionSchema);

module.exports = BehavioralFunctionAssessment;

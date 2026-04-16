'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const behaviorPlanSchema = new Schema(
  {
    plan_id: {
      type: String,
      unique: true,
      default: () => `BIP-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    },
    beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },

    plan_name: { type: String, required: true },
    start_date: { type: Date, required: true },
    end_date: Date,

    // تحليل السلوك الوظيفي (FBA)
    functional_behavior_analysis: {
      target_behaviors: [
        {
          behavior_name: String,
          operational_definition: String,
          baseline_frequency: Number,
          baseline_duration: Number,
          baseline_intensity: String,
        },
      ],

      antecedent_analysis: {
        setting_events: [String], // أحداث ممهدة
        triggers: [String], // محفزات
        common_antecedents: [String],
      },

      consequence_analysis: {
        maintaining_consequences: [String],
        perceived_function: [
          {
            behavior: String,
            function: {
              type: String,
              enum: ['attention', 'escape', 'tangible', 'sensory', 'multiple'],
            },
            evidence: String,
          },
        ],
      },

      hypothesis: String,
    },

    // استراتيجيات التدخل
    intervention_strategies: {
      // استراتيجيات وقائية
      antecedent_strategies: [
        {
          strategy: String,
          description: String,
          implementation_guidelines: String,
          frequency: String,
        },
      ],

      // استراتيجيات التدريس
      teaching_strategies: [
        {
          skill_to_teach: String,
          teaching_method: String,
          materials_needed: [String],
          schedule: String,
        },
      ],

      // استراتيجيات العواقب
      consequence_strategies: [
        {
          situation: String,
          response: String,
          reinforcement: String,
        },
      ],

      // استراتيجيات الأزمات
      crisis_intervention: {
        escalation_stages: [
          {
            stage: String,
            indicators: [String],
            recommended_response: String,
          },
        ],
        emergency_protocols: [String],
        emergency_contacts: [
          {
            name: String,
            role: String,
            phone: String,
          },
        ],
      },
    },

    // التعزيز
    reinforcement_plan: {
      primary_reinforcers: [String],
      secondary_reinforcers: [String],
      reinforcement_schedule: {
        type: String,
        enum: [
          'continuous',
          'fixed_ratio',
          'variable_ratio',
          'fixed_interval',
          'variable_interval',
        ],
      },
      token_system: {
        enabled: { type: Boolean, default: false },
        tokens_for_behavior: Number,
        exchange_rate: Number,
        backup_reinforcers: [String],
      },
    },

    // جمع البيانات
    data_collection: {
      method: {
        type: String,
        enum: [
          'frequency',
          'duration',
          'latency',
          'inter_response_time',
          'momentary_time_sampling',
          'partial_interval',
          'whole_interval',
        ],
      },
      recording_schedule: String,
      data_collectors: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    },

    // معايير النجاح
    success_criteria: [
      {
        behavior: String,
        baseline: Number,
        target: Number,
        measurement_unit: String,
        timeline: Date,
      },
    ],

    // مراجعات الخطة
    plan_reviews: [
      {
        review_date: Date,
        reviewer: { type: Schema.Types.ObjectId, ref: 'User' },
        progress_summary: String,
        data_summary: Schema.Types.Mixed,
        modifications: [String],
        recommendations: String,
      },
    ],

    // حالة الخطة
    status: {
      type: String,
      enum: ['draft', 'active', 'under_review', 'suspended', 'completed', 'discontinued'],
      default: 'draft',
    },

    approvals: {
      bcba_approval: {
        approved: { type: Boolean, default: false },
        approver_id: { type: Schema.Types.ObjectId, ref: 'User' },
        approval_date: Date,
        license_number: String,
      },
      guardian_approval: {
        approved: { type: Boolean, default: false },
        guardian_name: String,
        approval_date: Date,
        signature_url: String,
      },
    },

    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
    updated_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

behaviorPlanSchema.index({ beneficiary_id: 1, status: 1 });

const BehaviorPlan =
  mongoose.models.BehaviorPlan || mongoose.model('BehaviorPlan', behaviorPlanSchema);

module.exports = BehaviorPlan;

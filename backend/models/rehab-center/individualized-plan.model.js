'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const individualizedPlanSchema = new Schema(
  {
    plan_id: {
      type: String,
      unique: true,
      default: () => `ITP-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    },
    beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },

    // معلومات الخطة الأساسية
    plan_name: { type: String, required: true },
    plan_type: {
      type: String,
      enum: [
        'individualized_education',
        'individualized_service',
        'individualized_family',
        'transition',
        'behavior_intervention',
      ],
      required: true,
    },

    // الفترة الزمنية
    plan_period: {
      start_date: { type: Date, required: true },
      end_date: { type: Date, required: true },
      review_dates: [Date],
    },

    // الفريق متعدد التخصصات
    team_members: [
      {
        member_id: { type: Schema.Types.ObjectId, ref: 'User' },
        name: String,
        role: String,
        specialization: String,
        responsibilities: [String],
        contact_info: String,
        is_primary: { type: Boolean, default: false },
      },
    ],

    // الأهداف طويلة المدى
    long_term_goals: [
      {
        goal_id: { type: String, default: () => `LTG-${Date.now()}` },
        domain: String,
        goal_statement: String,
        measurable_criteria: String,
        baseline_performance: String,
        target_performance: String,
        target_date: Date,
        priority: { type: String, enum: ['high', 'medium', 'low'] },
        strategies: [String],
        resources_needed: [String],
        responsible_team_member: { type: Schema.Types.ObjectId, ref: 'User' },
      },
    ],

    // الأهداف قصيرة المدى
    short_term_goals: [
      {
        goal_id: { type: String, default: () => `STG-${Date.now()}` },
        parent_goal_id: String, // يربط بهدف طويل المدى
        domain: String,
        goal_statement: String,
        measurable_criteria: String,
        baseline_performance: String,
        target_performance: String,
        start_date: Date,
        target_date: Date,
        mastery_criteria: String,
        teaching_procedures: [String],
        materials: [String],
        reinforcement_schedule: String,
        data_collection_method: String,
        progress_updates: [
          {
            date: Date,
            progress_percentage: Number,
            performance_level: String,
            notes: String,
            data_collector: { type: Schema.Types.ObjectId, ref: 'User' },
          },
        ],
        status: {
          type: String,
          enum: ['not_started', 'in_progress', 'mastered', 'discontinued', 'revised'],
          default: 'not_started',
        },
      },
    ],

    // خدمات الدعم
    support_services: [
      {
        service_type: {
          type: String,
          enum: [
            'physical_therapy',
            'occupational_therapy',
            'speech_therapy',
            'behavioral_therapy',
            'special_education',
            'psychological_services',
            'counseling',
            'social_work',
            'assistive_technology',
            'transportation',
            'nursing',
            'nutrition',
            'music_therapy',
            'art_therapy',
            'hydro_therapy',
            'vocational_training',
          ],
        },
        service_name: String,
        frequency: String,
        duration: String,
        location: String,
        provider: {
          provider_id: { type: Schema.Types.ObjectId, ref: 'User' },
          name: String,
        },
        start_date: Date,
        end_date: Date,
      },
    ],

    // التعديلات والتكييفات
    accommodations: [
      {
        category: {
          type: String,
          enum: [
            'instructional',
            'environmental',
            'assessment',
            'assistive_technology',
            'communication',
            'behavioral',
          ],
        },
        accommodation_type: String,
        description: String,
        implementation_notes: String,
      },
    ],

    // خطة الطوارئ
    crisis_plan: {
      triggers: [String],
      warning_signs: [String],
      intervention_strategies: [String],
      emergency_contacts: [
        {
          name: String,
          relationship: String,
          phone: String,
        },
      ],
      safety_protocols: [String],
    },

    // مشاركة الأسرة
    family_involvement: {
      family_priorities: [String],
      home_activities: [
        {
          activity: String,
          frequency: String,
          materials: [String],
          instructions: String,
        },
      ],
      training_needs: [String],
      communication_preferences: {
        method: { type: String, enum: ['phone', 'email', 'app', 'in_person', 'notebook'] },
        frequency: String,
      },
      family_support_services: [String],
    },

    // خطة الانتقال
    transition_plan: {
      current_setting: String,
      target_setting: String,
      transition_goals: [String],
      skills_needed: [String],
      timeline: Date,
      receiving_agency: String,
      support_services: [String],
    },

    // مراجعات الخطة
    plan_reviews: [
      {
        review_date: Date,
        review_type: { type: String, enum: ['annual', 'periodic', 'requested', 'transition'] },
        attendees: [String],
        progress_summary: String,
        goal_modifications: [
          {
            goal_id: String,
            modification: String,
            reason: String,
          },
        ],
        new_goals: [Schema.Types.Mixed],
        recommendations: [String],
        next_review_date: Date,
      },
    ],

    // حالة الخطة
    status: {
      type: String,
      enum: ['draft', 'active', 'under_review', 'suspended', 'completed', 'discontinued'],
      default: 'draft',
    },

    approvals: {
      team_leader_approval: {
        approved: { type: Boolean, default: false },
        approver_id: { type: Schema.Types.ObjectId, ref: 'User' },
        approval_date: Date,
        comments: String,
      },
      guardian_approval: {
        approved: { type: Boolean, default: false },
        guardian_name: String,
        approval_date: Date,
        signature_url: String,
      },
      administration_approval: {
        approved: { type: Boolean, default: false },
        approver_id: { type: Schema.Types.ObjectId, ref: 'User' },
        approval_date: Date,
      },
    },

    notes: String,
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
    updated_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

individualizedPlanSchema.index({ beneficiary_id: 1, status: 1 });
individualizedPlanSchema.index({ 'plan_period.start_date': 1, 'plan_period.end_date': 1 });

const IndividualizedPlan =
  mongoose.models.IndividualizedPlan ||
  mongoose.model('IndividualizedPlan', individualizedPlanSchema);

module.exports = IndividualizedPlan;

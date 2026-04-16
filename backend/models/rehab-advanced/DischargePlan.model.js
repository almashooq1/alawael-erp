'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const dischargePlanSchema = new Schema(
  {
    discharge_id: {
      type: String,
      unique: true,
      default: () => `DIS-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    },
    beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },

    // معلومات الخروج
    discharge_info: {
      discharge_type: {
        type: String,
        enum: [
          'completed_program',
          'transferred',
          'aging_out',
          'family_request',
          'insurance',
          'other',
        ],
        required: true,
      },
      planned_discharge_date: Date,
      actual_discharge_date: Date,
      reason: String,
    },

    // ملخص التقدم
    progress_summary: {
      goals_achieved: [
        {
          goal: String,
          achievement_date: Date,
          evidence: String,
        },
      ],
      goals_partially_achieved: [
        {
          goal: String,
          progress_percentage: Number,
          remaining_steps: String,
        },
      ],
      skills_acquired: [String],
      behavioral_improvements: [String],
      areas_needing_continued_support: [String],
    },

    // التقييم النهائي
    final_assessment: {
      assessment_date: Date,
      assessor: { type: Schema.Types.ObjectId, ref: 'User' },
      overall_progress_rating: { type: Number, min: 1, max: 5 },
      functional_improvement: String,
      comparison_with_baseline: String,
      assessment_tools_used: [String],
    },

    // خطة ما بعد الخروج
    post_discharge_plan: {
      recommended_services: [
        {
          service_type: String,
          frequency: String,
          provider_recommendation: String,
          urgency: {
            type: String,
            enum: ['immediate', 'within_month', 'within_3_months', 'not_urgent'],
          },
        },
      ],

      referral_to_external: [
        {
          organization: String,
          service: String,
          contact_person: String,
          contact_info: String,
          referral_date: Date,
          referral_status: String,
        },
      ],

      home_program: {
        activities: [String],
        frequency: String,
        family_training_provided: { type: Boolean, default: false },
      },

      follow_up_schedule: [
        {
          follow_up_date: Date,
          follow_up_type: String,
          responsible_staff: { type: Schema.Types.ObjectId, ref: 'User' },
        },
      ],
    },

    // تعليمات للأسرة
    family_instructions: {
      home_activities: [String],
      warning_signs_to_monitor: [String],
      emergency_contacts: [
        {
          name: String,
          role: String,
          phone: String,
        },
      ],
      resources_provided: [String],
    },

    // إمدادات المعدات
    equipment_provided: [
      {
        equipment_name: String,
        purpose: String,
        training_provided: { type: Boolean, default: false },
      },
    ],

    // تقييم رضا الأسرة
    family_satisfaction: {
      survey_date: Date,
      overall_satisfaction: { type: Number, min: 1, max: 5 },
      quality_of_service: Number,
      communication: Number,
      would_recommend: { type: Boolean },
      feedback: String,
      suggestions: String,
    },

    // اجتماع الخروج
    discharge_meeting: {
      meeting_date: Date,
      attendees: [String],
      summary: String,
      decisions_made: [String],
      action_items: [
        {
          action: String,
          responsible: String,
          deadline: Date,
        },
      ],
    },

    // الموافقات
    approvals: {
      case_manager_approval: {
        approved: { type: Boolean, default: false },
        approver_id: { type: Schema.Types.ObjectId, ref: 'User' },
        approval_date: Date,
        comments: String,
      },
      guardian_acknowledgment: {
        acknowledged: { type: Boolean, default: false },
        guardian_name: String,
        acknowledgment_date: Date,
        signature_url: String,
      },
    },

    status: {
      type: String,
      enum: ['planning', 'in_progress', 'completed', 'cancelled'],
      default: 'planning',
    },

    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

dischargePlanSchema.index({ beneficiary_id: 1, status: 1 });

const DischargePlan =
  mongoose.models.DischargePlan || mongoose.model('DischargePlan', dischargePlanSchema);

module.exports = DischargePlan;

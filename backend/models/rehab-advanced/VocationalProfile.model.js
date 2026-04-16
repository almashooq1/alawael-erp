'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const vocationalProfileSchema = new Schema(
  {
    profile_id: {
      type: String,
      unique: true,
      default: () => `VOC-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    },
    beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },

    // تقييم المهارات المهنية
    skills_assessment: {
      // المهارات الوظيفية
      work_skills: [
        {
          skill_category: String,
          skill_name: String,
          proficiency_level: {
            type: String,
            enum: ['novice', 'beginner', 'intermediate', 'advanced', 'expert'],
          },
          evidence: String,
          assessment_date: Date,
        },
      ],

      // المهارات الحركية
      motor_skills: {
        fine_motor: {
          level: String,
          notes: String,
        },
        gross_motor: {
          level: String,
          notes: String,
        },
        endurance: {
          level: String,
          notes: String,
        },
      },

      // المهارات المعرفية
      cognitive_skills: {
        attention_span: Number, // بالدقائق
        following_instructions: {
          type: String,
          enum: ['simple', 'moderate', 'complex', 'needs_support'],
        },
        problem_solving: String,
        memory: String,
      },

      // المهارات الاجتماعية
      social_skills: {
        communication: String,
        teamwork: String,
        customer_interaction: String,
        conflict_resolution: String,
      },

      // الاهتمامات المهنية
      vocational_interests: [String],

      // التفضيلات البيئية
      environmental_preferences: {
        indoor_outdoor: String,
        noise_level: { type: String, enum: ['quiet', 'moderate', 'busy', 'no_preference'] },
        social_interaction: {
          type: String,
          enum: ['solitary', 'small_group', 'large_group', 'varied'],
        },
        physical_demands: String,
      },
    },

    // التدريبات المهنية
    training_programs: [
      {
        program_id: String,
        program_name: String,
        type: {
          type: String,
          enum: ['pre_vocational', 'vocational', 'on_the_job', 'internship', 'apprenticeship'],
        },
        start_date: Date,
        end_date: Date,
        skills_targeted: [String],
        trainer: { type: Schema.Types.ObjectId, ref: 'User' },
        progress: {
          type: String,
          enum: ['not_started', 'in_progress', 'completed', 'discontinued'],
        },
        competencies_achieved: [String],
        evaluation: {
          score: Number,
          feedback: String,
        },
      },
    ],

    // شهادات العمل
    work_certificates: [
      {
        certificate_name: String,
        issuing_organization: String,
        issue_date: Date,
        expiry_date: Date,
        certificate_url: String,
        skills_certified: [String],
      },
    ],

    // الخبرات العملية
    work_experiences: [
      {
        position: String,
        employer: String,
        employment_type: {
          type: String,
          enum: ['full_time', 'part_time', 'supported', 'volunteer', 'internship'],
        },
        start_date: Date,
        end_date: Date,
        responsibilities: [String],
        accommodations_provided: [String],
        supervisor_feedback: String,
        reason_for_leaving: String,
      },
    ],

    // خطة التوظيف
    employment_plan: {
      career_goal: String,
      short_term_goals: [String],
      long_term_goals: [String],
      job_preferences: {
        industries: [String],
        positions: [String],
        work_schedule: String,
        location_preferences: [String],
      },
      support_needed: [String],
      job_coach: {
        assigned: { type: Boolean, default: false },
        coach_id: { type: Schema.Types.ObjectId, ref: 'User' },
        support_level: String,
      },
    },

    // حالات التوظيف
    employment_applications: [
      {
        employer: String,
        position: String,
        application_date: Date,
        status: {
          type: String,
          enum: [
            'submitted',
            'under_review',
            'interviewed',
            'offered',
            'hired',
            'rejected',
            'withdrawn',
          ],
        },
        interview_date: Date,
        notes: String,
      },
    ],

    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

vocationalProfileSchema.index({ beneficiary_id: 1 });

const VocationalProfile =
  mongoose.models.VocationalProfile || mongoose.model('VocationalProfile', vocationalProfileSchema);

module.exports = VocationalProfile;

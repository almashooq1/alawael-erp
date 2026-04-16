'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const homeProgramSchema = new Schema(
  {
    program_id: {
      type: String,
      unique: true,
      default: () => `HMP-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    },
    beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },

    program_name: { type: String, required: true },
    start_date: { type: Date, required: true },
    end_date: Date,

    // الأنشطة المنزلية
    activities: [
      {
        activity_id: String,
        domain: {
          type: String,
          enum: [
            'self_care',
            'communication',
            'motor',
            'academic',
            'behavioral',
            'social',
            'vocational',
          ],
        },
        activity_name: String,
        description: String,
        materials_needed: [String],
        instructions: String,
        frequency: String, // مرات في اليوم/الأسبوع
        duration: Number, // بالدقائق
        demonstration_video_url: String,
        visual_aids: [String],
        target_skills: [String],
      },
    ],

    // جدول الأنشطة
    schedule: {
      sunday: [{ activity_id: String, time: String, notes: String }],
      monday: [{ activity_id: String, time: String, notes: String }],
      tuesday: [{ activity_id: String, time: String, notes: String }],
      wednesday: [{ activity_id: String, time: String, notes: String }],
      thursday: [{ activity_id: String, time: String, notes: String }],
      friday: [{ activity_id: String, time: String, notes: String }],
      saturday: [{ activity_id: String, time: String, notes: String }],
    },

    // سجل التنفيذ المنزلي
    execution_log: [
      {
        date: Date,
        activities_completed: [
          {
            activity_id: String,
            completed: Boolean,
            duration: Number,
            performance_notes: String,
            difficulties: String,
            parent_rating: { type: Number, min: 1, max: 5 },
          },
        ],
        total_time_spent: Number,
        general_notes: String,
        logged_by: { type: String, enum: ['parent', 'guardian', 'caregiver'] },
      },
    ],

    // زيارات المتابعة المنزلية
    home_visits: [
      {
        visit_date: Date,
        visitor: { type: Schema.Types.ObjectId, ref: 'User' },
        purpose: String,
        observations: String,
        recommendations: [String],
        family_concerns: [String],
        next_visit_date: Date,
      },
    ],

    // تدريب الأسرة
    family_training: [
      {
        training_date: Date,
        topic: String,
        trainer: { type: Schema.Types.ObjectId, ref: 'User' },
        attendees: [String],
        materials_provided: [String],
        competency_achieved: { type: Boolean, default: false },
      },
    ],

    // تقييم الالتزام
    compliance_assessment: {
      overall_compliance_rate: Number,
      strengths: [String],
      challenges: [String],
      recommendations: [String],
      last_assessment_date: Date,
    },

    status: {
      type: String,
      enum: ['active', 'paused', 'completed', 'discontinued'],
      default: 'active',
    },

    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

homeProgramSchema.index({ beneficiary_id: 1, status: 1 });

const HomeProgram = mongoose.models.HomeProgram || mongoose.model('HomeProgram', homeProgramSchema);

module.exports = HomeProgram;

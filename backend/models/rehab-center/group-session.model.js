'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const groupSessionSchema = new Schema(
  {
    group_id: {
      type: String,
      unique: true,
      default: () => `GRP-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    },
    group_name: { type: String, required: true },
    group_type: {
      type: String,
      enum: [
        'social_skills', // مهارات اجتماعية
        'communication', // تواصل
        'motor_skills', // مهارات حركية
        'behavioral', // سلوكية
        'academic', // أكاديمية
        'pre_vocational', // ما قبل مهني
        'recreational', // ترفيهية
        'support_group', // مجموعة دعم
        'therapy_group', // مجموعة علاجية
        'training_workshop', // ورشة تدريب
      ],
      required: true,
    },

    // وصف المجموعة
    description: String,
    target_population: {
      age_range: { min: Number, max: Number },
      disability_types: [String],
      functional_level: [String],
      prerequisites: [String],
    },

    // معلومات المجموعة
    capacity: {
      min_participants: { type: Number, default: 2 },
      max_participants: { type: Number, default: 8 },
      current_enrollment: { type: Number, default: 0 },
    },

    // أعضاء المجموعة
    participants: [
      {
        beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary' },
        name: String,
        enrollment_date: Date,
        status: { type: String, enum: ['active', 'inactive', 'completed', 'withdrawn'] },
        individualized_goals: [String],
        participation_notes: String,
      },
    ],

    // قائمة الانتظار
    waitlist: [
      {
        beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary' },
        name: String,
        request_date: { type: Date, default: Date.now },
        priority: { type: String, enum: ['high', 'medium', 'low'] },
        notes: String,
      },
    ],

    // جدولة المجموعة
    schedule: {
      frequency: { type: String, enum: ['daily', 'weekly', 'bi_weekly', 'monthly'] },
      days: [
        {
          type: String,
          enum: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        },
      ],
      time: {
        start_time: String,
        end_time: String,
      },
      room: String,
      start_date: Date,
      end_date: Date,
    },

    // facilitators
    facilitators: [
      {
        facilitator_id: { type: Schema.Types.ObjectId, ref: 'User' },
        name: String,
        role: { type: String, enum: ['primary', 'co_facilitator', 'assistant', 'observer'] },
        specialization: String,
      },
    ],

    // أهداف المجموعة
    group_goals: [
      {
        goal_id: String,
        description: String,
        measurable_outcomes: String,
        evaluation_criteria: String,
      },
    ],

    // المنهج والأنشطة
    curriculum: [
      {
        session_number: Number,
        topic: String,
        objectives: [String],
        activities: [
          {
            activity_name: String,
            description: String,
            duration: Number,
            materials: [String],
          },
        ],
        group_rules: [String],
      },
    ],

    // جلسات المجموعة الفعلية
    sessions: [
      {
        session_id: { type: String, default: () => `SESS-${Date.now()}` },
        session_date: Date,
        session_number: Number,
        topic: String,

        attendance: [
          {
            beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary' },
            name: String,
            status: { type: String, enum: ['present', 'absent', 'late', 'excused'] },
          },
        ],

        session_content: {
          activities_completed: [String],
          materials_used: [String],
          modifications_made: String,
        },

        observations: {
          group_dynamics: String,
          participation_levels: String,
          behavioral_observations: String,
          peer_interactions: String,
        },

        participant_progress: [
          {
            beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary' },
            progress_notes: String,
            goals_addressed: [String],
            next_steps: String,
          },
        ],

        facilitator_notes: String,
        next_session_plan: String,
      },
    ],

    // تقييم فعالية المجموعة
    effectiveness_evaluation: [
      {
        evaluation_date: Date,
        evaluator: { type: Schema.Types.ObjectId, ref: 'User' },
        group_cohesion_rating: { type: Number, min: 1, max: 5 },
        goal_achievement_rating: { type: Number, min: 1, max: 5 },
        participant_engagement_rating: { type: Number, min: 1, max: 5 },
        facilitator_effectiveness_rating: { type: Number, min: 1, max: 5 },
        recommendations: String,
      },
    ],

    status: {
      type: String,
      enum: ['forming', 'active', 'paused', 'completed', 'discontinued'],
      default: 'forming',
    },

    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

groupSessionSchema.index({ group_type: 1, status: 1 });
groupSessionSchema.index({ 'facilitators.facilitator_id': 1 });

const GroupSession =
  mongoose.models.GroupSession || mongoose.model('GroupSession', groupSessionSchema);

module.exports = GroupSession;

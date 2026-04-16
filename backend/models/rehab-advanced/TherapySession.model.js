'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const therapySessionSchema = new Schema(
  {
    session_id: {
      type: String,
      unique: true,
      default: () => `THS-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    },
    beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },

    therapy_type: {
      type: String,
      enum: [
        'physical_therapy',
        'occupational_therapy',
        'speech_therapy',
        'hydro_therapy',
        'music_therapy',
        'art_therapy',
      ],
      required: true,
    },

    session_info: {
      date: { type: Date, required: true },
      start_time: String,
      end_time: String,
      duration: Number,
      therapist: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      location: String,
      session_number: Number,
    },

    // أهداف الجلسة
    session_goals: [
      {
        goal: String,
        target: String,
        achieved: { type: Boolean, default: false },
      },
    ],

    // الأنشطة المُنفذة
    activities: [
      {
        activity_name: String,
        description: String,
        repetitions: Number,
        performance_level: {
          type: String,
          enum: ['independent', 'minimal_assist', 'moderate_assist', 'maximal_assist', 'dependent'],
        },
        notes: String,
      },
    ],

    // القياسات (للعلاج الطبيعي)
    measurements: {
      range_of_motion: [
        {
          joint: String,
          movement: String,
          active: Number,
          passive: Number,
        },
      ],
      strength: [
        {
          muscle_group: String,
          grade: Number, // 0-5 scale
        },
      ],
      pain_level: { type: Number, min: 0, max: 10 },
      functional_mobility: String,
    },

    // المهارات الحركية الدقيقة (للعلاج الوظيفي)
    fine_motor_skills: [
      {
        skill: String,
        assessment: String,
        progress: String,
      },
    ],

    // المهارات الحركية gross motor
    gross_motor_skills: [
      {
        skill: String,
        assessment: String,
        progress: String,
      },
    ],

    // التوصيات
    recommendations: {
      home_exercises: [String],
      modifications: [String],
      equipment_needed: [String],
      next_session_focus: [String],
    },

    // ملاحظات
    notes: {
      subjective: String, // what patient/caregiver reported
      objective: String, // what therapist observed
      assessment: String, // therapist's analysis
      plan: String, // next steps
    },

    attendance: {
      status: {
        type: String,
        enum: ['attended', 'absent', 'cancelled', 'rescheduled'],
        default: 'attended',
      },
      cancellation_reason: String,
    },

    signature: {
      therapist_signature: String,
      supervisor_signature: String,
      signature_date: Date,
    },
  },
  { timestamps: true }
);

therapySessionSchema.index({ beneficiary_id: 1, 'session_info.date': -1 });

const TherapySession =
  mongoose.models.TherapySession || mongoose.model('TherapySession', therapySessionSchema);

module.exports = TherapySession;

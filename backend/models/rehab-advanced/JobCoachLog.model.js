'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const jobCoachLogSchema = new Schema(
  {
    log_id: {
      type: String,
      unique: true,
      default: () => `JCL-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    },
    beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    job_coach_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    work_site: {
      employer_name: String,
      address: String,
      supervisor_name: String,
      supervisor_phone: String,
    },

    session_date: { type: Date, required: true },
    hours_worked: Number,

    tasks_performed: [
      {
        task: String,
        independence_level: {
          type: String,
          enum: ['full_support', 'partial_support', 'minimal_support', 'independent'],
        },
        quality_rating: { type: Number, min: 1, max: 5 },
        notes: String,
      },
    ],

    skills_observed: [
      {
        skill: String,
        observation: String,
        rating: { type: Number, min: 1, max: 5 },
      },
    ],

    challenges_faced: [
      {
        challenge: String,
        intervention_used: String,
        outcome: String,
      },
    ],

    accommodations_used: [String],

    productivity: {
      tasks_completed: Number,
      tasks_assigned: Number,
      productivity_rate: Number,
    },

    social_interactions: {
      positive_interactions: [String],
      areas_for_improvement: [String],
    },

    recommendations: {
      for_employee: [String],
      for_employer: [String],
      for_next_session: [String],
    },

    employer_feedback: {
      rating: { type: Number, min: 1, max: 5 },
      comments: String,
    },

    notes: String,
  },
  { timestamps: true }
);

const JobCoachLog = mongoose.models.JobCoachLog || mongoose.model('JobCoachLog', jobCoachLogSchema);

module.exports = JobCoachLog;

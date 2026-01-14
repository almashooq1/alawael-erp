/**
 * Rehabilitation Program Model
 * نموذج البرامج التأهيلية - Comprehensive Rehabilitation Management
 *
 * Features:
 * - Personalized rehabilitation plans
 * - Multiple therapy types (PT, OT, Speech, Psychological)
 * - Progress tracking and outcomes
 * - Team-based approach
 * - Evidence-based interventions
 * - Goal setting and monitoring
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// Therapy Session Sub-schema
const therapySessionSchema = new Schema(
  {
    session_number: Number,
    session_date: { type: Date, required: true },
    start_time: String,
    end_time: String,
    duration_minutes: Number,

    therapist_id: { type: String, required: true },
    therapist_name: String,
    therapy_type: {
      type: String,
      enum: ['physical', 'occupational', 'speech', 'psychological', 'music', 'art', 'recreational'],
      required: true,
    },

    session_objectives: [String],

    activities_performed: [
      {
        activity_name: String,
        duration: Number, // minutes
        equipment_used: [String],
        intensity_level: { type: String, enum: ['light', 'moderate', 'vigorous'] },
        difficulty_level: Number, // 1-10
      },
    ],

    client_response: {
      engagement_level: Number, // 1-10
      cooperation_level: Number, // 1-10
      fatigue_level: Number, // 1-10
      pain_level: Number, // 0-10
      mood: { type: String, enum: ['very_positive', 'positive', 'neutral', 'negative', 'very_negative'] },
      comments: String,
    },

    observations: {
      improvements: [String],
      challenges: [String],
      recommendations: [String],
    },

    progress_measures: [
      {
        measure_name: String,
        baseline_value: String,
        current_value: String,
        unit: String,
        improvement_percentage: Number,
      },
    ],

    session_status: { type: String, enum: ['completed', 'cancelled', 'rescheduled'], default: 'completed' },
    cancellation_reason: String,

    therapist_notes: String,
  },
  { _id: false },
);

// Goal Sub-schema
const goalSchema = new Schema(
  {
    goal_id: String,
    goal_statement: { type: String, required: true },
    domain: {
      type: String,
      enum: ['mobility', 'self_care', 'communication', 'cognitive', 'social', 'vocational', 'community'],
      required: true,
    },

    goal_type: { type: String, enum: ['short_term', 'long_term'], required: true },
    start_date: { type: Date, required: true },
    target_date: { type: Date, required: true },

    measurement_method: String,
    baseline_measure: String,
    target_measure: String,
    current_measure: String,

    progress_percentage: { type: Number, default: 0, min: 0, max: 100 },
    achievement_date: Date,

    contributing_factors: [String],
    barriers_to_achievement: [String],

    goal_status: {
      type: String,
      enum: ['not_started', 'in_progress', 'achieved', 'modified', 'discontinued'],
      default: 'not_started',
    },

    responsible_team_members: [
      {
        member_id: String,
        member_name: String,
        role: String,
      },
    ],

    last_reviewed: Date,
    next_review_date: Date,
  },
  { _id: false },
);

// Team Member Sub-schema
const teamMemberSchema = new Schema(
  {
    team_member_id: { type: String, required: true },
    name: { type: String, required: true },
    profession: {
      type: String,
      enum: [
        'physiotherapist',
        'occupational_therapist',
        'speech_pathologist',
        'clinical_psychologist',
        'counselor',
        'social_worker',
        'case_manager',
        'physician',
        'nurse',
        'educator',
      ],
      required: true,
    },
    contact_info: {
      phone: String,
      email: String,
    },
    role_in_program: String,

    availability: {
      days: [String], // Mon, Tue, Wed, etc.
      hours: String,
    },

    session_frequency: String, // e.g., "Twice weekly", "Once weekly"
    expertise_areas: [String],

    start_date: { type: Date, required: true },
    end_date: Date,
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { _id: false },
);

// Outcome Measure Sub-schema
const outcomeSchema = new Schema(
  {
    measure_date: { type: Date, required: true },
    measure_type: String, // e.g., "FIM", "GMFM", "Ashworth Scale"
    subscale: String,

    baseline_score: Number,
    current_score: Number,

    improvement: Number, // absolute change
    improvement_percentage: Number,
    minimal_clinically_important_difference: Boolean,

    interpretation: String,
    therapist_id: String,
  },
  { _id: false },
);

// Main Schema
const rehabilitationProgramSchema = new Schema(
  {
    // Program Identification
    program_id: { type: String, unique: true, sparse: true },
    program_title: { type: String, required: true },
    program_code: { type: String, required: true, index: true },

    // Client Information
    beneficiary_id: { type: String, required: true, index: true },
    beneficiary_name: { type: String, required: true },
    age_at_enrollment: Number,

    // Disability Information
    disability_type: { type: String, required: true },
    disability_severity: String,
    comorbid_conditions: [String],
    assessment_reference_id: { type: String, ref: 'DisabilityAssessment' },

    // Program Details
    program_type: {
      type: String,
      enum: ['inpatient', 'outpatient', 'day_care', 'home_based', 'community_based', 'hybrid'],
      required: true,
    },

    program_setting: {
      facility_name: String,
      facility_type: { type: String, enum: ['rehabilitation_center', 'hospital', 'clinic', 'community_center', 'home'] },
      location: String,
      accessibility_features: [String],
    },

    program_duration: {
      enrollment_date: { type: Date, required: true, default: Date.now },
      planned_discharge_date: Date,
      actual_discharge_date: Date,
      estimated_duration_weeks: Number,
    },

    // Frequency and Schedule
    session_frequency: { type: String, required: true }, // e.g., "3 times per week"
    session_duration_minutes: { type: Number, default: 60 },
    sessions_per_week: Number,
    program_start_date: { type: Date, required: true },

    // Treatment Team
    team_leader_id: { type: String, required: true },
    team_leader_name: String,
    team_members: [teamMemberSchema],

    // Program Goals
    goals: [goalSchema],
    overall_program_goal: String,

    // Treatment Plan
    treatment_modalities: [
      {
        modality: String,
        description: String,
        frequency: String,
        duration: String,
        evidence_base: String,
      },
    ],

    interventions: [
      {
        intervention_name: String,
        intervention_type: String,
        rationale: String,
        expected_outcome: String,
        implementation_method: String,
        responsibleTherapist: String,
      },
    ],

    // Therapy Sessions Record
    therapy_sessions: [therapySessionSchema],
    total_sessions_completed: { type: Number, default: 0 },
    total_sessions_planned: Number,

    // Progress Monitoring
    outcome_measures: {
      baseline_measures: [outcomeSchema],
      interim_measures: [outcomeSchema],
      discharge_measures: [outcomeSchema],
    },

    progress_summary: {
      overall_progress: { type: String, enum: ['excellent', 'good', 'fair', 'poor'], default: 'fair' },
      progress_trajectory: { type: String, enum: ['improving', 'stable', 'declining', 'variable'] },
      compliance_rate: { type: Number, min: 0, max: 100 },
      attendance_rate: { type: Number, min: 0, max: 100 },
    },

    // Barriers and Facilitators
    barriers_to_progress: [
      {
        barrier: String,
        impact_level: { type: String, enum: ['minimal', 'moderate', 'significant'] },
        mitigation_strategy: String,
      },
    ],

    facilitators_of_progress: [
      {
        facilitator: String,
        strength: { type: String, enum: ['weak', 'moderate', 'strong'] },
        leverage_strategy: String,
      },
    ],

    // Family and Caregiver Involvement
    family_involvement: {
      primary_caregiver_name: String,
      caregiver_relationship: String,
      caregiver_education_provided: Boolean,
      home_exercise_program: {
        program_name: String,
        exercises: [String],
        frequency: String,
        family_adherence_rate: Number,
      },
      family_support_level: { type: String, enum: ['minimal', 'moderate', 'strong'] },
    },

    // Equipment and Assistive Devices
    equipment_used: [
      {
        equipment_name: String,
        equipment_type: String,
        usage_frequency: String,
        effectiveness_rating: Number,
        maintenance_needs: String,
      },
    ],

    // Documentation
    clinical_notes: String,
    discharge_summary: String,
    follow_up_plan: String,

    // Status and Outcomes
    program_status: {
      type: String,
      enum: ['active', 'suspended', 'discharged', 'discontinued', 'completed'],
      default: 'active',
    },

    discharge_reason: {
      type: String,
      enum: ['goal_achieved', 'plateau', 'client_choice', 'medical_reasons', 'non_compliance', 'transferred'],
    },

    outcomes_achieved: [
      {
        outcome: String,
        measurement_date: Date,
        achieved: Boolean,
        evidence: String,
      },
    ],

    functional_independence_gain: {
      baseline_fim: Number,
      discharge_fim: Number,
      fim_gain: Number,
      efficiency_rate: Number, // FIM gain per week
    },

    client_satisfaction: {
      satisfaction_score: Number, // 1-10
      satisfaction_date: Date,
      feedback: String,
    },

    // Cost Information
    cost_tracking: {
      estimated_total_cost: Number,
      actual_total_cost: Number,
      cost_per_session: Number,
      insurance_coverage_percentage: Number,
      out_of_pocket_cost: Number,
    },

    // Quality Metrics
    quality_indicators: {
      goal_achievement_rate: Number,
      adverse_events_count: { type: Number, default: 0 },
      readmission_within_30days: Boolean,
      client_satisfaction_percentage: Number,
    },

    // Status Fields
    created_by: String,
    created_date: { type: Date, default: Date.now },
    last_updated: { type: Date, default: Date.now },
    last_updated_by: String,
  },
  {
    timestamps: true,
    collection: 'rehabilitation_programs',
  },
);

// Indexes
rehabilitationProgramSchema.index({ beneficiary_id: 1 });
rehabilitationProgramSchema.index({ program_code: 1 });
rehabilitationProgramSchema.index({ disability_type: 1 });
rehabilitationProgramSchema.index({ program_status: 1 });
rehabilitationProgramSchema.index({ 'program_duration.enrollment_date': -1 });
rehabilitationProgramSchema.index({ 'program_duration.actual_discharge_date': -1 });

// Methods
rehabilitationProgramSchema.methods.addTherapySession = function (sessionData) {
  this.therapy_sessions.push(sessionData);
  this.total_sessions_completed = this.therapy_sessions.filter(s => s.session_status === 'completed').length;
  return this.save();
};

rehabilitationProgramSchema.methods.getGoalProgress = function () {
  const goals = this.goals || [];
  const short_term = goals.filter(g => g.goal_type === 'short_term');
  const long_term = goals.filter(g => g.goal_type === 'long_term');

  const calculateProgress = goalArray => {
    if (goalArray.length === 0) return 0;
    const totalProgress = goalArray.reduce((sum, g) => sum + (g.progress_percentage || 0), 0);
    return Math.round(totalProgress / goalArray.length);
  };

  return {
    short_term_progress: calculateProgress(short_term),
    long_term_progress: calculateProgress(long_term),
    overall_progress: calculateProgress(goals),
    goals_achieved: goals.filter(g => g.goal_status === 'achieved').length,
    total_goals: goals.length,
  };
};

rehabilitationProgramSchema.methods.calculateComplianceRate = function () {
  if (this.therapy_sessions.length === 0) return 0;
  const completed = this.therapy_sessions.filter(s => s.session_status === 'completed').length;
  return Math.round((completed / this.therapy_sessions.length) * 100);
};

rehabilitationProgramSchema.methods.generateProgressReport = function () {
  return {
    program_id: this.program_id,
    beneficiary: {
      id: this.beneficiary_id,
      name: this.beneficiary_name,
    },
    program_status: this.program_status,
    enrollment_date: this.program_duration.enrollment_date,
    duration_weeks: Math.ceil((new Date() - this.program_duration.enrollment_date) / (1000 * 60 * 60 * 24 * 7)),
    goal_progress: this.getGoalProgress(),
    compliance_rate: this.calculateComplianceRate(),
    attendance_rate: this.progress_summary.attendance_rate,
    sessions_completed: this.total_sessions_completed,
    outcome_measures: this.outcome_measures,
    progress_trajectory: this.progress_summary.progress_trajectory,
  };
};

rehabilitationProgramSchema.methods.updateGoalProgress = function (goalId, newProgress) {
  const goal = this.goals.id(goalId);
  if (goal) {
    goal.progress_percentage = newProgress;
    if (newProgress >= 100) {
      goal.goal_status = 'achieved';
      goal.achievement_date = new Date();
    }
  }
  return this.save();
};

rehabilitationProgramSchema.methods.calculateFIMGain = function () {
  const baseline = this.functional_independence_gain?.baseline_fim || 0;
  const discharge = this.functional_independence_gain?.discharge_fim || 0;
  return discharge - baseline;
};

// Statics
rehabilitationProgramSchema.statics.getActivePrograms = function () {
  return this.find({ program_status: 'active' });
};

rehabilitationProgramSchema.statics.getProgramsReadyForDischarge = async function () {
  const programs = await this.find({ program_status: 'active' });
  return programs.filter(p => {
    const progress = p.getGoalProgress();
    return progress.overall_progress >= 80 && p.progress_summary.progress_trajectory === 'improving';
  });
};

rehabilitationProgramSchema.statics.getDisabilityTypeStatistics = async function () {
  return this.aggregate([
    { $match: { program_status: 'active' } },
    {
      $group: {
        _id: '$disability_type',
        count: { $sum: 1 },
        avg_goal_progress: { $avg: { $arrayElemAt: ['$goals.progress_percentage', 0] } },
      },
    },
  ]);
};

rehabilitationProgramSchema.statics.getProgramOutcomes = async function (programId) {
  const program = await this.findById(programId);
  if (!program) return null;

  return {
    goal_progress: program.getGoalProgress(),
    compliance_rate: program.calculateComplianceRate(),
    fim_gain: program.calculateFIMGain(),
    outcomes_achieved: program.outcomes_achieved,
    client_satisfaction: program.client_satisfaction,
    discharge_reason: program.discharge_reason,
  };
};

module.exports = mongoose.model('RehabilitationProgram', rehabilitationProgramSchema);

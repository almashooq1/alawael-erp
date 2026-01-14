/**
 * Disability Assessment Model
 * نموذج تقييم الإعاقة - Comprehensive Assessment Metrics
 *
 * Features:
 * - Multiple assessment scales (ICF, DSM-5, WHO)
 * - Functional ability tracking
 * - Severity levels
 * - Risk factors and protective factors
 * - Progress monitoring
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// Assessment Details Sub-schema
const assessmentDetailsSchema = new Schema(
  {
    // Basic Info
    assessor_id: { type: String, required: true },
    assessor_name: { type: String, required: true },
    assessment_date: { type: Date, default: Date.now },
    next_assessment_date: { type: Date },
    assessment_method: { type: String, enum: ['clinical', 'psychological', 'functional', 'educational', 'vocational'] },

    // ICF Domains (International Classification of Functioning)
    icf_body_functions: {
      mental_functions: { score: Number, remarks: String }, // 0-100
      sensory_functions: { score: Number, remarks: String },
      voice_speech_functions: { score: Number, remarks: String },
      cardiovascular_functions: { score: Number, remarks: String },
      respiratory_functions: { score: Number, remarks: String },
      digestive_functions: { score: Number, remarks: String },
      neuro_muscular_skeletal: { score: Number, remarks: String },
      movement_related: { score: Number, remarks: String },
    },

    // Activities and Participation
    activities_participation: {
      learning_applying_knowledge: { score: Number, difficulty: String }, // mild, moderate, severe
      general_tasks_demands: { score: Number, difficulty: String },
      communication: { score: Number, difficulty: String },
      mobility: { score: Number, difficulty: String },
      self_care: { score: Number, difficulty: String },
      domestic_life: { score: Number, difficulty: String },
      interpersonal_interactions: { score: Number, difficulty: String },
      community_social_civic_life: { score: Number, difficulty: String },
    },

    // Environmental Factors
    environmental_factors: {
      products_technology: { code: String, influence: Number }, // -4 to +4
      natural_social_environment: { code: String, influence: Number },
      support_relationships: { code: String, influence: Number },
      attitudes: { code: String, influence: Number },
      services_systems_policies: { code: String, influence: Number },
    },

    // Personal Factors
    personal_factors: {
      age_gender: String,
      education_level: String,
      occupation: String,
      experience: String,
      coping_styles: [String],
      motivation_level: { type: String, enum: ['very_low', 'low', 'moderate', 'high', 'very_high'] },
      adaptive_capacity: Number, // 0-100
    },
  },
  { _id: false },
);

// Disability Type Sub-schema
const disabilityTypeSchema = new Schema(
  {
    type: {
      type: String,
      enum: [
        'physical',
        'visual',
        'hearing',
        'intellectual',
        'mental_health',
        'autism_spectrum',
        'multiple',
        'neurological',
        'developmental',
        'acquired',
      ],
      required: true,
    },
    severity: {
      type: String,
      enum: ['mild', 'moderate', 'severe', 'profound'],
      required: true,
    },
    onset_age: Number,
    onset_type: { type: String, enum: ['congenital', 'acquired'] },
    primary_cause: String,
    comorbidities: [String], // Multiple conditions
    duration_years: Number,
    progression_status: { type: String, enum: ['stable', 'improving', 'declining', 'variable'] },
  },
  { _id: false },
);

// Functional Ability Profile
const functionalAbilitySchema = new Schema(
  {
    mobility: {
      walking_distance: String, // 0m, <10m, 10-100m, >100m
      balance_standing: Boolean,
      transfers_ability: String, // independent, needs_device, needs_assistance
      stairs_climbing: String,
      endurance_level: Number, // 0-100
    },

    self_care: {
      feeding: { level: Number, needs_assistance: Boolean },
      toileting: { level: Number, needs_assistance: Boolean },
      bathing: { level: Number, needs_assistance: Boolean },
      dressing: { level: Number, needs_assistance: Boolean },
      grooming: { level: Number, needs_assistance: Boolean },
    },

    communication: {
      understanding: { level: Number, method: String },
      expression: { level: Number, method: String },
      literacy: { reading: Boolean, writing: Boolean },
      language_proficiency: [String],
    },

    cognitive: {
      memory: { short_term: Number, long_term: Number },
      attention_span: Number, // minutes
      problem_solving: Number,
      learning_ability: Number,
      orientation: { person: Boolean, place: Boolean, time: Boolean },
    },

    social_emotional: {
      social_interaction: Number,
      emotional_regulation: Number,
      independence_level: Number,
      participation_readiness: Number,
    },
  },
  { _id: false },
);

// Main Schema
const disabilityAssessmentSchema = new Schema(
  {
    // Basic Information
    beneficiary_id: { type: String, required: true, unique: true, index: true },
    beneficiary_name: { type: String, required: true },
    date_of_birth: { type: Date, required: true },
    gender: { type: String, enum: ['male', 'female', 'other'], required: true },
    national_id: String,
    contact_info: {
      phone: String,
      email: String,
      address: String,
      family_contact: String,
    },

    // Assessment Information
    disability_profile: disabilityTypeSchema,
    assessment_details: assessmentDetailsSchema,
    functional_abilities: functionalAbilitySchema,

    // Standardized Scales
    scales: {
      who_disability_assessment: {
        score: Number, // 0-100
        domain: String,
        completed_date: Date,
      },
      barthel_index: {
        score: Number, // 0-100
        interpretation: String,
        completed_date: Date,
      },
      functional_independence_measure: {
        motor_score: Number, // 13-91
        cognitive_score: Number, // 5-35
        total_score: Number,
        completed_date: Date,
      },
      quality_of_life_score: {
        physical: Number,
        psychological: Number,
        social: Number,
        environmental: Number,
        total: Number,
        completed_date: Date,
      },
    },

    // Risk and Protective Factors
    risk_factors: [
      {
        factor: String,
        severity: { type: String, enum: ['low', 'medium', 'high'] },
        mitigation_strategy: String,
      },
    ],
    protective_factors: [
      {
        factor: String,
        strength_level: { type: String, enum: ['weak', 'moderate', 'strong'] },
        utilization_strategy: String,
      },
    ],

    // Assistive Devices and Accommodations
    assistive_devices: [
      {
        device_type: String,
        description: String,
        usage_frequency: String,
        effectiveness: Number, // 0-100
        needs_replacement: Boolean,
        cost: Number,
      },
    ],

    // Recommendations and Goals
    recommendations: [
      {
        recommendation: String,
        priority: { type: String, enum: ['immediate', 'short_term', 'long_term'] },
        responsible_party: String,
        timeline: Date,
        status: { type: String, enum: ['pending', 'in_progress', 'completed'] },
      },
    ],

    // Rehabilitation Readiness
    rehabilitation_readiness: {
      motivation_score: Number, // 0-100
      cognitive_capacity: Number,
      physical_capacity: Number,
      family_support: Number,
      resource_availability: Number,
      overall_readiness: { type: String, enum: ['low', 'moderate', 'high'] },
    },

    // Documents and Evidence
    assessment_documents: [
      {
        document_name: String,
        document_type: String,
        file_url: String,
        upload_date: Date,
      },
    ],

    // Status and Tracking
    assessment_status: {
      type: String,
      enum: ['active', 'completed', 'under_review', 'archived'],
      default: 'active',
    },
    last_updated: { type: Date, default: Date.now },
    created_by: String,
    reviewed_by: String,
    review_date: Date,

    notes: String,
  },
  {
    timestamps: true,
    collection: 'disability_assessments',
  },
);

// Indexes
disabilityAssessmentSchema.index({ beneficiary_id: 1 });
disabilityAssessmentSchema.index({ 'disability_profile.type': 1 });
disabilityAssessmentSchema.index({ 'disability_profile.severity': 1 });
disabilityAssessmentSchema.index({ assessment_status: 1 });
disabilityAssessmentSchema.index({ createdAt: -1 });

// Methods
disabilityAssessmentSchema.methods.calculateCompositeScore = function () {
  const scales = this.scales;
  let totalScore = 0;
  let count = 0;

  if (scales.who_disability_assessment?.score) {
    totalScore += scales.who_disability_assessment.score;
    count++;
  }
  if (scales.quality_of_life_score?.total) {
    totalScore += scales.quality_of_life_score.total;
    count++;
  }
  if (scales.barthel_index?.score) {
    totalScore += scales.barthel_index.score;
    count++;
  }

  return count > 0 ? Math.round(totalScore / count) : 0;
};

disabilityAssessmentSchema.methods.getSeverityProfile = function () {
  const profile = this.disability_profile;
  return {
    type: profile.type,
    severity: profile.severity,
    onset: profile.onset_type,
    duration: profile.duration_years,
    progression: profile.progression_status,
    comorbidities_count: profile.comorbidities?.length || 0,
  };
};

disabilityAssessmentSchema.methods.getDomainScores = function () {
  return {
    bodily_functions: this.assessment_details?.icf_body_functions,
    activities_participation: this.assessment_details?.activities_participation,
    environmental_factors: this.assessment_details?.environmental_factors,
    functional_abilities: {
      mobility: this.functional_abilities?.mobility,
      self_care: this.functional_abilities?.self_care,
      communication: this.functional_abilities?.communication,
      cognitive: this.functional_abilities?.cognitive,
      social: this.functional_abilities?.social_emotional,
    },
  };
};

disabilityAssessmentSchema.methods.getProgressMetrics = function (previousAssessment) {
  if (!previousAssessment) return null;

  const currentComposite = this.calculateCompositeScore();
  const previousComposite = previousAssessment.calculateCompositeScore();

  return {
    composite_score_change: currentComposite - previousComposite,
    improvement_percentage: ((currentComposite - previousComposite) / previousComposite) * 100,
    is_improving: currentComposite > previousComposite,
    assessment_period_days: Math.ceil((this.createdAt - previousAssessment.createdAt) / (1000 * 60 * 60 * 24)),
  };
};

disabilityAssessmentSchema.methods.generateAssessmentReport = function () {
  return {
    beneficiary: {
      id: this.beneficiary_id,
      name: this.beneficiary_name,
      age: new Date().getFullYear() - this.date_of_birth.getFullYear(),
      gender: this.gender,
    },
    disability: this.getSeverityProfile(),
    composite_score: this.calculateCompositeScore(),
    domain_scores: this.getDomainScores(),
    risk_factors: this.risk_factors,
    protective_factors: this.protective_factors,
    rehabilitation_readiness: this.rehabilitation_readiness,
    recommendations: this.recommendations,
    assessment_date: this.assessment_details?.assessment_date,
    next_assessment_date: this.assessment_details?.next_assessment_date,
  };
};

disabilityAssessmentSchema.methods.isReadyForRehabilitation = function () {
  const readiness = this.rehabilitation_readiness;
  if (!readiness) return false;

  return (
    readiness.motivation_score >= 60 &&
    readiness.cognitive_capacity >= 50 &&
    readiness.physical_capacity >= 50 &&
    readiness.family_support >= 60
  );
};

// Statics
disabilityAssessmentSchema.statics.findByDisabilityType = function (disabilityType) {
  return this.find({ 'disability_profile.type': disabilityType });
};

disabilityAssessmentSchema.statics.findBySeverity = function (severity) {
  return this.find({ 'disability_profile.severity': severity });
};

disabilityAssessmentSchema.statics.getAssessmentStatistics = async function () {
  const total = await this.countDocuments();
  const by_type = await this.aggregate([{ $group: { _id: '$disability_profile.type', count: { $sum: 1 } } }]);
  const by_severity = await this.aggregate([{ $group: { _id: '$disability_profile.severity', count: { $sum: 1 } } }]);
  const avg_composite = await this.aggregate([
    {
      $group: {
        _id: null,
        avg_score: {
          $avg: {
            $add: [
              { $ifNull: ['$scales.who_disability_assessment.score', 0] },
              { $ifNull: ['$scales.quality_of_life_score.total', 0] },
              { $ifNull: ['$scales.barthel_index.score', 0] },
            ],
          },
        },
      },
    },
  ]);

  return {
    total_assessments: total,
    by_type,
    by_severity,
    average_composite_score: Math.round(avg_composite[0]?.avg_score || 0),
  };
};

disabilityAssessmentSchema.statics.getReadyForRehabilitationCount = async function () {
  const assessments = await this.find({
    'rehabilitation_readiness.overall_readiness': 'high',
    assessment_status: 'completed',
  });

  return assessments.filter(a => a.isReadyForRehabilitation()).length;
};

module.exports = mongoose.model('DisabilityAssessment', disabilityAssessmentSchema);

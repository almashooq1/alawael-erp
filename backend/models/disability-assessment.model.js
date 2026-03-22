/* eslint-disable no-unused-vars */
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
    assessment_method: {
      type: String,
      enum: ['clinical', 'psychological', 'functional', 'educational', 'vocational'],
    },

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
      motivation_level: {
        type: String,
        enum: ['very_low', 'low', 'moderate', 'high', 'very_high'],
      },
      adaptive_capacity: Number, // 0-100
    },
  },
  { _id: false }
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
  { _id: false }
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
  { _id: false }
);

// Main Schema
const disabilityAssessmentSchema = new Schema(
  {
    // Basic Information
    beneficiary_id: { type: String, required: true, unique: true }, // index removed to avoid duplicate
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
  }
);

// Indexes
// beneficiary_id already has unique: true which creates an index automatically
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
    assessment_period_days: Math.ceil(
      (this.createdAt - previousAssessment.createdAt) / (1000 * 60 * 60 * 24)
    ),
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
  const by_type = await this.aggregate([
    { $group: { _id: '$disability_profile.type', count: { $sum: 1 } } },
  ]);
  const by_severity = await this.aggregate([
    { $group: { _id: '$disability_profile.severity', count: { $sum: 1 } } },
  ]);
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

// ═══════════════════════════════════════════════════════════════
// ── NEW: Enhanced Methods for Disability Assessment
// ═══════════════════════════════════════════════════════════════

// ── Virtual: age calculation ──
disabilityAssessmentSchema.virtual('age').get(function () {
  if (!this.date_of_birth) return null;
  const now = new Date();
  const dob = new Date(this.date_of_birth);
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) age--;
  return age;
});

// ── Virtual: functional independence index (0-100) ──
disabilityAssessmentSchema.virtual('functionalIndependenceIndex').get(function () {
  const fa = this.functional_abilities;
  if (!fa) return 0;
  const scores = [];

  // Mobility score
  if (fa.mobility?.endurance_level != null) scores.push(fa.mobility.endurance_level);

  // Self-care average
  if (fa.self_care) {
    const scItems = [
      fa.self_care.feeding?.level,
      fa.self_care.toileting?.level,
      fa.self_care.bathing?.level,
      fa.self_care.dressing?.level,
      fa.self_care.grooming?.level,
    ].filter(v => v != null);
    if (scItems.length) scores.push((scItems.reduce((a, b) => a + b, 0) / scItems.length) * 20);
  }

  // Communication
  if (fa.communication) {
    const cItems = [fa.communication.understanding?.level, fa.communication.expression?.level].filter(v => v != null);
    if (cItems.length) scores.push((cItems.reduce((a, b) => a + b, 0) / cItems.length) * 20);
  }

  // Cognitive
  if (fa.cognitive) {
    const cogItems = [
      fa.cognitive.memory?.short_term,
      fa.cognitive.attention_span,
      fa.cognitive.problem_solving,
      fa.cognitive.learning_ability,
    ].filter(v => v != null);
    if (cogItems.length) scores.push(cogItems.reduce((a, b) => a + b, 0) / cogItems.length);
  }

  // Social-emotional
  if (fa.social_emotional) {
    const seItems = [
      fa.social_emotional.social_interaction,
      fa.social_emotional.emotional_regulation,
      fa.social_emotional.independence_level,
      fa.social_emotional.participation_readiness,
    ].filter(v => v != null);
    if (seItems.length) scores.push(seItems.reduce((a, b) => a + b, 0) / seItems.length);
  }

  return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
});

// ── Virtual: overall risk level ──
disabilityAssessmentSchema.virtual('overallRiskLevel').get(function () {
  if (!this.risk_factors || this.risk_factors.length === 0) return 'low';
  const highCount = this.risk_factors.filter(r => r.severity === 'high').length;
  const medCount = this.risk_factors.filter(r => r.severity === 'medium').length;
  if (highCount >= 2) return 'critical';
  if (highCount >= 1 || medCount >= 3) return 'high';
  if (medCount >= 1) return 'medium';
  return 'low';
});

// ── Virtual: environmental support score ──
disabilityAssessmentSchema.virtual('environmentalSupportScore').get(function () {
  const env = this.assessment_details?.environmental_factors;
  if (!env) return 0;
  const influences = [
    env.products_technology?.influence,
    env.natural_social_environment?.influence,
    env.support_relationships?.influence,
    env.attitudes?.influence,
    env.services_systems_policies?.influence,
  ].filter(v => v != null);
  if (!influences.length) return 0;
  // Scale from -4..+4 to 0..100
  const avg = influences.reduce((a, b) => a + b, 0) / influences.length;
  return Math.round(((avg + 4) / 8) * 100);
});

// ── Method: get ICF body function summary ──
disabilityAssessmentSchema.methods.getICFBodyFunctionSummary = function () {
  const bf = this.assessment_details?.icf_body_functions;
  if (!bf) return { domains: [], averageScore: 0, weakestDomain: null, strongestDomain: null };
  const domains = Object.entries(bf)
    .filter(([, v]) => v?.score != null)
    .map(([key, v]) => ({ domain: key, score: v.score, remarks: v.remarks || '' }));
  if (!domains.length) return { domains, averageScore: 0, weakestDomain: null, strongestDomain: null };
  const avg = Math.round(domains.reduce((s, d) => s + d.score, 0) / domains.length);
  const sorted = [...domains].sort((a, b) => a.score - b.score);
  return {
    domains,
    averageScore: avg,
    weakestDomain: sorted[0],
    strongestDomain: sorted[sorted.length - 1],
  };
};

// ── Method: get activities participation summary ──
disabilityAssessmentSchema.methods.getActivitiesParticipationSummary = function () {
  const ap = this.assessment_details?.activities_participation;
  if (!ap) return { domains: [], severeDifficulties: [], mildDifficulties: [] };
  const domains = Object.entries(ap)
    .filter(([, v]) => v?.score != null)
    .map(([key, v]) => ({ domain: key, score: v.score, difficulty: v.difficulty || 'unknown' }));
  return {
    domains,
    severeDifficulties: domains.filter(d => d.difficulty === 'severe'),
    mildDifficulties: domains.filter(d => d.difficulty === 'mild'),
    moderateDifficulties: domains.filter(d => d.difficulty === 'moderate'),
    averageScore: domains.length ? Math.round(domains.reduce((s, d) => s + d.score, 0) / domains.length) : 0,
  };
};

// ── Method: get self-care independence level ──
disabilityAssessmentSchema.methods.getSelfCareIndependence = function () {
  const sc = this.functional_abilities?.self_care;
  if (!sc) return { level: 'unknown', score: 0, details: {} };

  const items = {
    feeding: sc.feeding?.level || 0,
    toileting: sc.toileting?.level || 0,
    bathing: sc.bathing?.level || 0,
    dressing: sc.dressing?.level || 0,
    grooming: sc.grooming?.level || 0,
  };

  const vals = Object.values(items);
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  const pct = Math.round((avg / 5) * 100);

  let level = 'dependent';
  if (pct >= 80) level = 'independent';
  else if (pct >= 60) level = 'mostly_independent';
  else if (pct >= 40) level = 'partially_independent';
  else if (pct >= 20) level = 'mostly_dependent';

  const needsAssistance = Object.entries(items)
    .filter(([, v]) => v <= 2)
    .map(([k]) => k);

  return { level, score: pct, details: items, needsAssistance };
};

// ── Method: calculate rehabilitation priority ──
disabilityAssessmentSchema.methods.calculateRehabPriority = function () {
  const composite = this.calculateCompositeScore();
  const riskLevel = this.overallRiskLevel;
  const isReady = this.isReadyForRehabilitation();

  let priorityScore = 100 - composite; // Lower composite = higher priority

  // Adjust by risk level
  if (riskLevel === 'critical') priorityScore += 30;
  else if (riskLevel === 'high') priorityScore += 20;
  else if (riskLevel === 'medium') priorityScore += 10;

  // Adjust by readiness
  if (isReady) priorityScore += 15;

  // Adjust by severity
  const severity = this.disability_profile?.severity;
  if (severity === 'profound') priorityScore += 25;
  else if (severity === 'severe') priorityScore += 20;
  else if (severity === 'moderate') priorityScore += 10;

  // Cap at 0-200
  priorityScore = Math.max(0, Math.min(200, priorityScore));

  let label = 'منخفضة';
  if (priorityScore >= 150) label = 'حرجة';
  else if (priorityScore >= 120) label = 'عالية';
  else if (priorityScore >= 80) label = 'متوسطة';

  return { priorityScore: Math.round(priorityScore), label, isReady, riskLevel, compositeScore: composite };
};

// ── Method: generate comprehensive profile ──
disabilityAssessmentSchema.methods.generateComprehensiveProfile = function () {
  return {
    ...this.generateAssessmentReport(),
    functionalIndependenceIndex: this.functionalIndependenceIndex,
    overallRiskLevel: this.overallRiskLevel,
    environmentalSupportScore: this.environmentalSupportScore,
    icfBodyFunctions: this.getICFBodyFunctionSummary(),
    activitiesParticipation: this.getActivitiesParticipationSummary(),
    selfCareIndependence: this.getSelfCareIndependence(),
    rehabPriority: this.calculateRehabPriority(),
    assistiveDevicesSummary: {
      total: this.assistive_devices?.length || 0,
      needsReplacement: (this.assistive_devices || []).filter(d => d.needs_replacement).length,
      avgEffectiveness: this.assistive_devices?.length
        ? Math.round(this.assistive_devices.reduce((s, d) => s + (d.effectiveness || 0), 0) / this.assistive_devices.length)
        : 0,
    },
    pendingRecommendations: (this.recommendations || []).filter(r => r.status === 'pending').length,
    completedRecommendations: (this.recommendations || []).filter(r => r.status === 'completed').length,
  };
};

// ── Static: get assessments by risk level ──
disabilityAssessmentSchema.statics.getByRiskLevel = async function (riskLevel) {
  const assessments = await this.find({ assessment_status: { $in: ['active', 'completed'] } }).lean();
  // Filter by computed risk level
  return assessments.filter(a => {
    const highCount = (a.risk_factors || []).filter(r => r.severity === 'high').length;
    const medCount = (a.risk_factors || []).filter(r => r.severity === 'medium').length;
    let level = 'low';
    if (highCount >= 2) level = 'critical';
    else if (highCount >= 1 || medCount >= 3) level = 'high';
    else if (medCount >= 1) level = 'medium';
    return level === riskLevel;
  });
};

// ── Static: get distribution by disability type and severity ──
disabilityAssessmentSchema.statics.getDisabilityDistribution = async function () {
  const [byType, bySeverity, byStatus, byProgression] = await Promise.all([
    this.aggregate([
      { $group: { _id: '$disability_profile.type', count: { $sum: 1 }, avgAge: { $avg: { $subtract: [new Date().getFullYear(), { $year: '$date_of_birth' }] } } } },
      { $sort: { count: -1 } },
    ]),
    this.aggregate([
      { $group: { _id: '$disability_profile.severity', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    this.aggregate([
      { $group: { _id: '$assessment_status', count: { $sum: 1 } } },
    ]),
    this.aggregate([
      { $group: { _id: '$disability_profile.progression_status', count: { $sum: 1 } } },
    ]),
  ]);
  return { byType, bySeverity, byStatus, byProgression, generatedAt: new Date() };
};

// ── Static: get functional abilities summary across all beneficiaries ──
disabilityAssessmentSchema.statics.getFunctionalAbilitiesSummary = async function () {
  const assessments = await this.find({
    'functional_abilities': { $exists: true },
    assessment_status: { $in: ['active', 'completed'] },
  }).lean();

  if (!assessments.length) return { count: 0, domains: {} };

  const domainTotals = { mobility: [], self_care: [], communication: [], cognitive: [], social_emotional: [] };

  assessments.forEach(a => {
    const fa = a.functional_abilities;
    if (fa?.mobility?.endurance_level != null) domainTotals.mobility.push(fa.mobility.endurance_level);
    if (fa?.self_care) {
      const levels = [fa.self_care.feeding?.level, fa.self_care.toileting?.level, fa.self_care.bathing?.level, fa.self_care.dressing?.level, fa.self_care.grooming?.level].filter(v => v != null);
      if (levels.length) domainTotals.self_care.push((levels.reduce((a, b) => a + b, 0) / levels.length) * 20);
    }
    if (fa?.cognitive?.problem_solving != null) domainTotals.cognitive.push(fa.cognitive.problem_solving);
    if (fa?.social_emotional?.social_interaction != null) domainTotals.social_emotional.push(fa.social_emotional.social_interaction);
  });

  const domains = {};
  for (const [key, vals] of Object.entries(domainTotals)) {
    domains[key] = {
      count: vals.length,
      average: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0,
      min: vals.length ? Math.min(...vals) : 0,
      max: vals.length ? Math.max(...vals) : 0,
    };
  }

  return { count: assessments.length, domains };
};

// ── Static: get rehabilitation readiness overview ──
disabilityAssessmentSchema.statics.getRehabReadinessOverview = async function () {
  const assessments = await this.find({
    'rehabilitation_readiness': { $exists: true },
    assessment_status: { $in: ['active', 'completed'] },
  }).lean();

  const overview = { total: assessments.length, high: 0, moderate: 0, low: 0, details: [] };
  assessments.forEach(a => {
    const r = a.rehabilitation_readiness;
    if (r?.overall_readiness === 'high') overview.high++;
    else if (r?.overall_readiness === 'moderate') overview.moderate++;
    else overview.low++;

    overview.details.push({
      beneficiary_id: a.beneficiary_id,
      beneficiary_name: a.beneficiary_name,
      readiness: r?.overall_readiness || 'unknown',
      motivation: r?.motivation_score || 0,
      cognitive: r?.cognitive_capacity || 0,
      physical: r?.physical_capacity || 0,
      family_support: r?.family_support || 0,
    });
  });

  return overview;
};

// ── Pre-save: auto-calculate rehabilitation readiness level ──
disabilityAssessmentSchema.pre('save', function (next) {
  const r = this.rehabilitation_readiness;
  if (r && r.motivation_score != null && r.cognitive_capacity != null) {
    const avg = (
      (r.motivation_score || 0) +
      (r.cognitive_capacity || 0) +
      (r.physical_capacity || 0) +
      (r.family_support || 0) +
      (r.resource_availability || 0)
    ) / 5;

    if (avg >= 70) r.overall_readiness = 'high';
    else if (avg >= 40) r.overall_readiness = 'moderate';
    else r.overall_readiness = 'low';
  }

  this.last_updated = new Date();
  next();
});

module.exports = mongoose.model('DisabilityAssessment', disabilityAssessmentSchema);

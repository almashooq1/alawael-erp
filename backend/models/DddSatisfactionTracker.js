'use strict';
/**
 * DddSatisfactionTracker Model
 * Auto-extracted from services/dddSatisfactionTracker.js
 * Schemas, constants, and Mongoose model registrations.
 */
const mongoose = require('mongoose');

/* ─── Constants ─── */
const SATISFACTION_METRICS = [
  'nps',
  'csat',
  'ces',
  'overall_satisfaction',
  'service_quality',
  'therapist_satisfaction',
  'facility_satisfaction',
  'wait_time_satisfaction',
  'communication_satisfaction',
  'outcome_satisfaction',
  'value_perception',
  'recommendation_likelihood',
];

const METRIC_STATUSES = [
  'active',
  'paused',
  'archived',
  'draft',
  'completed',
  'scheduled',
  'expired',
  'in_progress',
  'cancelled',
  'published',
];

const SCORE_CATEGORIES = [
  'promoter',
  'passive',
  'detractor',
  'very_satisfied',
  'satisfied',
  'neutral',
  'dissatisfied',
  'very_dissatisfied',
  'high_effort',
  'low_effort',
  'exceeds_expectations',
  'meets_expectations',
];

const BENCHMARK_TYPES = [
  'industry',
  'regional',
  'national',
  'internal',
  'historical',
  'peer_group',
  'best_in_class',
  'target',
  'minimum',
  'custom',
];

const TREND_PERIODS = [
  'daily',
  'weekly',
  'monthly',
  'quarterly',
  'semi_annual',
  'annual',
  'ytd',
  'rolling_30',
  'rolling_90',
  'rolling_365',
];

const SEGMENT_TYPES = [
  'age_group',
  'disability_type',
  'program',
  'therapist',
  'facility',
  'service_line',
  'episode_type',
  'referral_source',
  'insurance_type',
  'geographic',
  'severity',
  'duration',
];

const BUILTIN_BENCHMARKS = [
  'healthcare_nps_avg',
  'rehab_csat_avg',
  'disability_ces_avg',
  'top_quartile_nps',
  'national_rehab_avg',
  'accreditation_minimum',
  'strategic_target_2025',
  'internal_baseline',
  'peer_comparison',
  'excellence_threshold',
];

/* ─── Schemas ─── */
const satisfactionScoreSchema = new mongoose.Schema(
  {
    scoreId: { type: String, required: true, unique: true },
    beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary' },
    episodeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Episode' },
    metric: { type: String, enum: SATISFACTION_METRICS, required: true },
    score: { type: Number, required: true },
    maxScore: { type: Number, default: 10 },
    category: { type: String, enum: SCORE_CATEGORIES },
    surveyId: { type: mongoose.Schema.Types.ObjectId, ref: 'DDDSurvey' },
    comment: { type: String },
    touchpoint: { type: String },
    collectedAt: { type: Date, default: Date.now },
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

satisfactionScoreSchema.index({ scoreId: 1 }, { unique: true });
satisfactionScoreSchema.index({ metric: 1, collectedAt: -1 });
satisfactionScoreSchema.index({ beneficiaryId: 1, metric: 1 });

const satisfactionTrendSchema = new mongoose.Schema(
  {
    trendId: { type: String, required: true, unique: true },
    metric: { type: String, enum: SATISFACTION_METRICS, required: true },
    period: { type: String, enum: TREND_PERIODS, required: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    averageScore: { type: Number, default: 0 },
    responseCount: { type: Number, default: 0 },
    npsScore: { type: Number },
    promoters: { type: Number, default: 0 },
    passives: { type: Number, default: 0 },
    detractors: { type: Number, default: 0 },
    segments: [
      {
        segment: String,
        type: { type: String, enum: SEGMENT_TYPES },
        score: Number,
        count: Number,
      },
    ],
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

satisfactionTrendSchema.index({ trendId: 1 }, { unique: true });
satisfactionTrendSchema.index({ metric: 1, periodStart: -1 });

const benchmarkSchema = new mongoose.Schema(
  {
    benchmarkId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    type: { type: String, enum: BENCHMARK_TYPES, required: true },
    metric: { type: String, enum: SATISFACTION_METRICS, required: true },
    value: { type: Number, required: true },
    source: { type: String },
    validFrom: { type: Date },
    validTo: { type: Date },
    description: { type: String },
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

benchmarkSchema.index({ benchmarkId: 1 }, { unique: true });
benchmarkSchema.index({ type: 1, metric: 1 });

const satisfactionAlertSchema = new mongoose.Schema(
  {
    alertId: { type: String, required: true, unique: true },
    metric: { type: String, enum: SATISFACTION_METRICS, required: true },
    condition: { type: String, required: true },
    threshold: { type: Number, required: true },
    currentValue: { type: Number },
    status: { type: String, enum: METRIC_STATUSES, default: 'active' },
    triggeredAt: { type: Date },
    resolvedAt: { type: Date },
    notifyRoles: [String],
    description: { type: String },
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

satisfactionAlertSchema.index({ alertId: 1 }, { unique: true });
satisfactionAlertSchema.index({ metric: 1, status: 1 });

/* ─── Models ─── */
const DDDSatisfactionScore =
  mongoose.models.DDDSatisfactionScore ||
  mongoose.model('DDDSatisfactionScore', satisfactionScoreSchema);
const DDDSatisfactionTrend =
  mongoose.models.DDDSatisfactionTrend ||
  mongoose.model('DDDSatisfactionTrend', satisfactionTrendSchema);
const DDDSatisfactionBenchmark =
  mongoose.models.DDDSatisfactionBenchmark || mongoose.model('DDDSatisfactionBenchmark', benchmarkSchema);
const DDDSatisfactionAlert =
  mongoose.models.DDDSatisfactionAlert ||
  mongoose.model('DDDSatisfactionAlert', satisfactionAlertSchema);

module.exports = {
  DDDSatisfactionScore,
  DDDSatisfactionTrend,
  DDDSatisfactionBenchmark,
  DDDSatisfactionAlert,
  SATISFACTION_METRICS,
  METRIC_STATUSES,
  SCORE_CATEGORIES,
  BENCHMARK_TYPES,
  TREND_PERIODS,
  SEGMENT_TYPES,
  BUILTIN_BENCHMARKS,
};

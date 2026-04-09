/**
 * ██████████████████████████████████████████████████████████████
 * ██  DDD Satisfaction Tracker — Phase 27                     ██
 * ██  Track NPS, CSAT, CES & satisfaction trends              ██
 * ██████████████████████████████████████████████████████████████
 */

const mongoose = require('mongoose');
const express = require('express');

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
const DDDBenchmark =
  mongoose.models.DDDBenchmark || mongoose.model('DDDBenchmark', benchmarkSchema);
const DDDSatisfactionAlert =
  mongoose.models.DDDSatisfactionAlert ||
  mongoose.model('DDDSatisfactionAlert', satisfactionAlertSchema);

/* ─── Domain Module ─── */
class SatisfactionTracker {
  constructor() {
    this.name = 'SatisfactionTracker';
  }

  /* Scores */
  async listScores(filter = {}) {
    return DDDSatisfactionScore.find(filter).sort({ collectedAt: -1 }).lean();
  }
  async getScore(id) {
    return DDDSatisfactionScore.findById(id).lean();
  }
  async recordScore(data) {
    data.scoreId = data.scoreId || `SAT-${Date.now()}`;
    return DDDSatisfactionScore.create(data);
  }

  /* Trends */
  async listTrends(filter = {}) {
    return DDDSatisfactionTrend.find(filter).sort({ periodStart: -1 }).lean();
  }
  async generateTrend(data) {
    data.trendId = data.trendId || `TRND-${Date.now()}`;
    return DDDSatisfactionTrend.create(data);
  }

  /* Benchmarks */
  async listBenchmarks(filter = {}) {
    return DDDBenchmark.find(filter).sort({ createdAt: -1 }).lean();
  }
  async createBenchmark(data) {
    data.benchmarkId = data.benchmarkId || `BMK-${Date.now()}`;
    return DDDBenchmark.create(data);
  }
  async updateBenchmark(id, data) {
    return DDDBenchmark.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  /* Alerts */
  async listAlerts(filter = {}) {
    return DDDSatisfactionAlert.find(filter).sort({ createdAt: -1 }).lean();
  }
  async createAlert(data) {
    data.alertId = data.alertId || `SALT-${Date.now()}`;
    return DDDSatisfactionAlert.create(data);
  }
  async resolveAlert(id) {
    return DDDSatisfactionAlert.findByIdAndUpdate(
      id,
      { status: 'completed', resolvedAt: new Date() },
      { new: true }
    ).lean();
  }

  /* Analytics */
  async getSatisfactionAnalytics(filter = {}) {
    const [scores, trends, benchmarks] = await Promise.all([
      DDDSatisfactionScore.countDocuments(filter),
      DDDSatisfactionTrend.countDocuments(),
      DDDBenchmark.countDocuments(),
    ]);
    return { totalScores: scores, totalTrends: trends, totalBenchmarks: benchmarks };
  }

  /* Health */
  async healthCheck() {
    const [sc, tr, bm, al] = await Promise.all([
      DDDSatisfactionScore.countDocuments(),
      DDDSatisfactionTrend.countDocuments(),
      DDDBenchmark.countDocuments(),
      DDDSatisfactionAlert.countDocuments(),
    ]);
    return { status: 'ok', counts: { scores: sc, trends: tr, benchmarks: bm, alerts: al } };
  }
}

/* ─── Router Factory ─── */
function createSatisfactionTrackerRouter() {
  const r = express.Router();
  const svc = new SatisfactionTracker();

  /* Scores */
  r.get('/satisfaction-tracker/scores', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listScores(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  r.get('/satisfaction-tracker/scores/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getScore(req.params.id) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  r.post('/satisfaction-tracker/scores', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.recordScore(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Trends */
  r.get('/satisfaction-tracker/trends', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listTrends(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  r.post('/satisfaction-tracker/trends', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.generateTrend(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Benchmarks */
  r.get('/satisfaction-tracker/benchmarks', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listBenchmarks(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  r.post('/satisfaction-tracker/benchmarks', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createBenchmark(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  r.put('/satisfaction-tracker/benchmarks/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateBenchmark(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Alerts */
  r.get('/satisfaction-tracker/alerts', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listAlerts(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  r.post('/satisfaction-tracker/alerts', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createAlert(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  r.put('/satisfaction-tracker/alerts/:id/resolve', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.resolveAlert(req.params.id) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Analytics */
  r.get('/satisfaction-tracker/analytics', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getSatisfactionAnalytics(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Health */
  r.get('/satisfaction-tracker/health', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  return r;
}

/* ─── Exports ─── */
module.exports = {
  SatisfactionTracker,
  DDDSatisfactionScore,
  DDDSatisfactionTrend,
  DDDBenchmark,
  DDDSatisfactionAlert,
  SATISFACTION_METRICS,
  METRIC_STATUSES,
  SCORE_CATEGORIES,
  BENCHMARK_TYPES,
  TREND_PERIODS,
  SEGMENT_TYPES,
  BUILTIN_BENCHMARKS,
  createSatisfactionTrackerRouter,
};

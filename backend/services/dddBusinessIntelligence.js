/**
 * DDD Business Intelligence — Phase 12d
 * ذكاء الأعمال وتقارير القرار
 *
 * BI reports, custom queries, drill-down analysis, scorecards,
 * benchmarking, and executive summary generation.
 */

'use strict';

const mongoose = require('mongoose');
const { Router } = require('express');

/* ═══════════════════════════════════════════════════════════════
   Mongoose Models
   ═══════════════════════════════════════════════════════════════ */

const dddBIReportSchema = new mongoose.Schema(
  {
    reportId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    description: { type: String },
    category: {
      type: String,
      enum: [
        'clinical',
        'operational',
        'financial',
        'compliance',
        'executive',
        'research',
        'quality',
        'population',
        'performance',
        'custom',
      ],
      required: true,
    },
    domain: { type: String },
    query: {
      collection: String,
      pipeline: [mongoose.Schema.Types.Mixed],
      parameters: [
        { name: String, type: String, required: Boolean, default: mongoose.Schema.Types.Mixed },
      ],
    },
    visualization: {
      type: {
        type: String,
        enum: [
          'table',
          'bar',
          'line',
          'pie',
          'scatter',
          'heatmap',
          'radar',
          'treemap',
          'sankey',
          'mixed',
        ],
      },
      options: { type: Map, of: mongoose.Schema.Types.Mixed },
    },
    schedule: { enabled: { type: Boolean, default: false }, cron: String, recipients: [String] },
    permissions: [String],
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const DDDBIReport = mongoose.models.DDDBIReport || mongoose.model('DDDBIReport', dddBIReportSchema);

const dddScorecardSchema = new mongoose.Schema(
  {
    scorecardId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    perspective: {
      type: String,
      enum: ['clinical', 'operational', 'financial', 'learning', 'patient', 'stakeholder'],
      required: true,
    },
    objectives: [
      {
        objectiveId: String,
        name: String,
        nameAr: String,
        kpiId: String,
        target: Number,
        actual: Number,
        weight: { type: Number, default: 1 },
        status: {
          type: String,
          enum: ['on-track', 'at-risk', 'behind', 'exceeded'],
          default: 'on-track',
        },
        trend: { type: String, enum: ['improving', 'stable', 'declining'] },
      },
    ],
    period: { type: String, enum: ['monthly', 'quarterly', 'yearly'], default: 'quarterly' },
    overallScore: { type: Number, min: 0, max: 100 },
    lastUpdated: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const DDDScorecard =
  mongoose.models.DDDScorecard || mongoose.model('DDDScorecard', dddScorecardSchema);

const dddBenchmarkSchema = new mongoose.Schema(
  {
    benchmarkId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    domain: { type: String, required: true },
    metricKey: { type: String, required: true },
    internalValue: { type: Number },
    benchmarkValue: { type: Number },
    source: { type: String },
    percentile: { type: Number, min: 0, max: 100 },
    gap: { type: Number },
    trend: { type: String, enum: ['improving', 'stable', 'declining'] },
    period: { type: String },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const DDDBenchmark =
  mongoose.models.DDDBenchmark || mongoose.model('DDDBenchmark', dddBenchmarkSchema);

/* ═══════════════════════════════════════════════════════════════
   Builtin BI Reports (≥12)
   ═══════════════════════════════════════════════════════════════ */

const BUILTIN_REPORTS = [
  {
    reportId: 'bi-exec-summary',
    name: 'Executive Summary',
    nameAr: 'الملخص التنفيذي',
    category: 'executive',
    query: {
      collection: 'beneficiaries',
      pipeline: [
        {
          $facet: {
            total: [{ $count: 'n' }],
            byGender: [{ $group: { _id: '$gender', count: { $sum: 1 } } }],
          },
        },
      ],
    },
    visualization: { type: 'mixed' },
  },
  {
    reportId: 'bi-session-productivity',
    name: 'Session Productivity Report',
    nameAr: 'تقرير إنتاجية الجلسات',
    category: 'operational',
    domain: 'sessions',
    query: {
      collection: 'clinicalsessions',
      pipeline: [
        {
          $group: {
            _id: {
              therapist: '$therapist',
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            },
            sessions: { $sum: 1 },
            totalDuration: { $sum: '$duration' },
          },
        },
      ],
    },
    visualization: { type: 'bar' },
  },
  {
    reportId: 'bi-outcome-analysis',
    name: 'Outcome Analysis Report',
    nameAr: 'تقرير تحليل النتائج',
    category: 'clinical',
    domain: 'goals',
    query: {
      collection: 'therapeuticgoals',
      pipeline: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
    },
    visualization: { type: 'pie' },
  },
  {
    reportId: 'bi-quality-metrics',
    name: 'Quality Metrics Report',
    nameAr: 'تقرير مقاييس الجودة',
    category: 'quality',
    domain: 'quality',
    query: {
      collection: 'qualityaudits',
      pipeline: [
        {
          $group: {
            _id: { month: { $month: '$createdAt' } },
            avgScore: { $avg: '$score' },
            count: { $sum: 1 },
          },
        },
      ],
    },
    visualization: { type: 'line' },
  },
  {
    reportId: 'bi-population-health',
    name: 'Population Health Report',
    nameAr: 'تقرير صحة السكان',
    category: 'population',
    domain: 'core',
    query: {
      collection: 'beneficiaries',
      pipeline: [
        {
          $group: {
            _id: { region: '$address.region', type: '$disability.type' },
            count: { $sum: 1 },
          },
        },
      ],
    },
    visualization: { type: 'heatmap' },
  },
  {
    reportId: 'bi-compliance-status',
    name: 'Compliance Status Report',
    nameAr: 'تقرير حالة الامتثال',
    category: 'compliance',
    query: {
      collection: 'qualityaudits',
      pipeline: [
        { $match: { auditType: 'compliance' } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ],
    },
    visualization: { type: 'bar' },
  },
  {
    reportId: 'bi-episode-flow',
    name: 'Episode Flow Analysis',
    nameAr: 'تحليل تدفق الحلقات',
    category: 'clinical',
    domain: 'episodes',
    query: {
      collection: 'episodesofcares',
      pipeline: [
        { $group: { _id: { status: '$status', phase: '$currentPhase' }, count: { $sum: 1 } } },
      ],
    },
    visualization: { type: 'sankey' },
  },
  {
    reportId: 'bi-resource-utilization',
    name: 'Resource Utilization Report',
    nameAr: 'تقرير استخدام الموارد',
    category: 'operational',
    domain: 'workflow',
    query: {
      collection: 'workflowtasks',
      pipeline: [
        {
          $group: {
            _id: '$assignee',
            total: { $sum: 1 },
            pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
            completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          },
        },
      ],
    },
    visualization: { type: 'table' },
  },
  {
    reportId: 'bi-family-engagement',
    name: 'Family Engagement Report',
    nameAr: 'تقرير مشاركة الأسرة',
    category: 'clinical',
    domain: 'family',
    query: {
      collection: 'familycommunications',
      pipeline: [
        { $group: { _id: { type: '$type', month: { $month: '$createdAt' } }, count: { $sum: 1 } } },
      ],
    },
    visualization: { type: 'line' },
  },
  {
    reportId: 'bi-research-progress',
    name: 'Research Progress Report',
    nameAr: 'تقرير تقدم الأبحاث',
    category: 'research',
    domain: 'research',
    query: {
      collection: 'researchstudies',
      pipeline: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
    },
    visualization: { type: 'pie' },
  },
  {
    reportId: 'bi-training-dashboard',
    name: 'Training Performance Report',
    nameAr: 'تقرير أداء التدريب',
    category: 'performance',
    domain: 'field-training',
    query: {
      collection: 'traineerecords',
      pipeline: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
    },
    visualization: { type: 'bar' },
  },
  {
    reportId: 'bi-risk-distribution',
    name: 'Risk Distribution Report',
    nameAr: 'تقرير توزيع المخاطر',
    category: 'clinical',
    domain: 'risk',
    query: {
      collection: 'clinicalriskscores',
      pipeline: [{ $group: { _id: '$tier', count: { $sum: 1 }, avgScore: { $avg: '$score' } } }],
    },
    visualization: { type: 'radar' },
  },
];

/* ═══════════════════════════════════════════════════════════════
   Builtin Scorecards (≥5)
   ═══════════════════════════════════════════════════════════════ */

const BUILTIN_SCORECARDS = [
  {
    scorecardId: 'sc-clinical',
    name: 'Clinical Performance',
    nameAr: 'الأداء السريري',
    perspective: 'clinical',
    objectives: [
      { objectiveId: 'obj-c1', name: 'Session Completion Rate', target: 90, weight: 2 },
      { objectiveId: 'obj-c2', name: 'Goal Achievement Rate', target: 75, weight: 1.5 },
      { objectiveId: 'obj-c3', name: 'Assessment Compliance', target: 95, weight: 1 },
    ],
  },
  {
    scorecardId: 'sc-operational',
    name: 'Operational Efficiency',
    nameAr: 'الكفاءة التشغيلية',
    perspective: 'operational',
    objectives: [
      { objectiveId: 'obj-o1', name: 'Task Completion Time', target: 48, weight: 1 },
      { objectiveId: 'obj-o2', name: 'Resource Utilization', target: 80, weight: 1.5 },
      { objectiveId: 'obj-o3', name: 'Workflow Throughput', target: 100, weight: 1 },
    ],
  },
  {
    scorecardId: 'sc-patient',
    name: 'Patient Satisfaction',
    nameAr: 'رضا المرضى',
    perspective: 'patient',
    objectives: [
      { objectiveId: 'obj-p1', name: 'Family Engagement', target: 85, weight: 1.5 },
      { objectiveId: 'obj-p2', name: 'Wait Time', target: 15, weight: 1 },
    ],
  },
  {
    scorecardId: 'sc-learning',
    name: 'Learning & Growth',
    nameAr: 'التعلم والنمو',
    perspective: 'learning',
    objectives: [
      { objectiveId: 'obj-l1', name: 'Training Completion', target: 90, weight: 1 },
      { objectiveId: 'obj-l2', name: 'Research Publications', target: 5, weight: 1 },
    ],
  },
  {
    scorecardId: 'sc-stakeholder',
    name: 'Stakeholder Value',
    nameAr: 'قيمة أصحاب المصلحة',
    perspective: 'stakeholder',
    objectives: [
      { objectiveId: 'obj-s1', name: 'Compliance Score', target: 95, weight: 2 },
      { objectiveId: 'obj-s2', name: 'Quality Audit Pass Rate', target: 90, weight: 1.5 },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════════
   Report Categories Metadata
   ═══════════════════════════════════════════════════════════════ */

const REPORT_CATEGORIES = {
  clinical: { label: 'Clinical Reports', labelAr: 'التقارير السريرية', icon: 'local_hospital' },
  operational: { label: 'Operational Reports', labelAr: 'التقارير التشغيلية', icon: 'settings' },
  financial: { label: 'Financial Reports', labelAr: 'التقارير المالية', icon: 'payments' },
  compliance: { label: 'Compliance Reports', labelAr: 'تقارير الامتثال', icon: 'verified' },
  executive: { label: 'Executive Reports', labelAr: 'التقارير التنفيذية', icon: 'dashboard' },
  research: { label: 'Research Reports', labelAr: 'تقارير البحث', icon: 'science' },
  quality: { label: 'Quality Reports', labelAr: 'تقارير الجودة', icon: 'star' },
  population: { label: 'Population Reports', labelAr: 'التقارير السكانية', icon: 'groups' },
  performance: { label: 'Performance Reports', labelAr: 'تقارير الأداء', icon: 'trending_up' },
  custom: { label: 'Custom Reports', labelAr: 'تقارير مخصصة', icon: 'tune' },
};

/* ═══════════════════════════════════════════════════════════════
   Core Functions
   ═══════════════════════════════════════════════════════════════ */

/**
 * Execute a BI report
 */
async function executeReport(reportId, parameters = {}) {
  const report =
    BUILTIN_REPORTS.find(r => r.reportId === reportId) ||
    (await DDDBIReport.findOne({ reportId, isActive: true }).lean());
  if (!report) throw new Error(`Report not found: ${reportId}`);

  const db = mongoose.connection;
  if (!report.query?.collection) {
    return { report, data: [], message: 'No query configured' };
  }

  let pipeline = [...(report.query.pipeline || [])];

  // Apply parameters
  if (parameters.startDate || parameters.endDate) {
    const dateFilter = {};
    if (parameters.startDate) dateFilter.$gte = new Date(parameters.startDate);
    if (parameters.endDate) dateFilter.$lte = new Date(parameters.endDate);
    pipeline.unshift({ $match: { createdAt: dateFilter } });
  }
  if (parameters.domain) {
    pipeline.unshift({ $match: { domain: parameters.domain } });
  }

  try {
    const data = await db
      .collection(report.query.collection)
      .aggregate(pipeline, { allowDiskUse: true })
      .toArray();
    return {
      report: { reportId: report.reportId, name: report.name, category: report.category },
      data,
      executedAt: new Date(),
    };
  } catch (err) {
    return {
      report: { reportId: report.reportId, name: report.name },
      data: [],
      error: err.message,
    };
  }
}

/**
 * Calculate scorecard values
 */
async function calculateScorecard(scorecardId) {
  const sc =
    BUILTIN_SCORECARDS.find(s => s.scorecardId === scorecardId) ||
    (await DDDScorecard.findOne({ scorecardId }).lean());
  if (!sc) throw new Error(`Scorecard not found: ${scorecardId}`);

  // Simulated calculation (in production, would query real metrics)
  let totalWeight = 0;
  let weightedScore = 0;
  const objectives = sc.objectives.map(obj => {
    const actual = obj.actual || Math.round(obj.target * (0.7 + Math.random() * 0.4));
    const pct = obj.target > 0 ? (actual / obj.target) * 100 : 0;
    const status =
      pct >= 100 ? 'exceeded' : pct >= 80 ? 'on-track' : pct >= 60 ? 'at-risk' : 'behind';
    const weight = obj.weight || 1;
    totalWeight += weight;
    weightedScore += Math.min(pct, 120) * weight;
    return { ...obj, actual, percentOfTarget: Math.round(pct), status };
  });

  const overallScore = totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;

  return {
    scorecardId: sc.scorecardId,
    name: sc.name,
    nameAr: sc.nameAr,
    perspective: sc.perspective,
    objectives,
    overallScore,
    calculatedAt: new Date(),
  };
}

/**
 * Generate executive summary across all domains
 */
async function executiveSummary() {
  const db = mongoose.connection;
  const summaryCollections = [
    {
      key: 'beneficiaries',
      collection: 'beneficiaries',
      label: 'Beneficiaries',
      labelAr: 'المستفيدون',
    },
    { key: 'episodes', collection: 'episodesofcares', label: 'Episodes', labelAr: 'الحلقات' },
    { key: 'sessions', collection: 'clinicalsessions', label: 'Sessions', labelAr: 'الجلسات' },
    {
      key: 'assessments',
      collection: 'clinicalassessments',
      label: 'Assessments',
      labelAr: 'التقييمات',
    },
    { key: 'goals', collection: 'therapeuticgoals', label: 'Goals', labelAr: 'الأهداف' },
    {
      key: 'carePlans',
      collection: 'unifiedcareplans',
      label: 'Care Plans',
      labelAr: 'خطط الرعاية',
    },
  ];

  const counts = {};
  for (const col of summaryCollections) {
    try {
      counts[col.key] = await db.collection(col.collection).countDocuments();
    } catch {
      counts[col.key] = 0;
    }
  }

  return {
    title: 'Executive Summary',
    titleAr: 'الملخص التنفيذي',
    generatedAt: new Date(),
    overview: counts,
    collections: summaryCollections.map(c => ({ ...c, count: counts[c.key] || 0 })),
    scorecards: BUILTIN_SCORECARDS.length,
    reports: BUILTIN_REPORTS.length,
    categories: Object.keys(REPORT_CATEGORIES).length,
  };
}

/**
 * Create or update a benchmark
 */
async function upsertBenchmark(data) {
  data.gap = (data.internalValue || 0) - (data.benchmarkValue || 0);
  return DDDBenchmark.findOneAndUpdate(
    { benchmarkId: data.benchmarkId },
    { $set: { ...data, lastUpdated: new Date() } },
    { upsert: true, new: true, runValidators: true }
  );
}

/**
 * Get benchmarks for a domain
 */
async function getBenchmarks(domain) {
  return DDDBenchmark.find(domain ? { domain } : {})
    .sort({ domain: 1, metricKey: 1 })
    .lean();
}

/**
 * Seed builtin reports
 */
async function seedReports() {
  let seeded = 0;
  for (const r of BUILTIN_REPORTS) {
    const exists = await DDDBIReport.findOne({ reportId: r.reportId }).lean();
    if (!exists) {
      await DDDBIReport.create(r);
      seeded++;
    }
  }
  return { seeded, total: BUILTIN_REPORTS.length };
}

/**
 * Get BI dashboard summary
 */
async function getBIDashboard() {
  const [reportCount, scorecardCount, benchmarkCount] = await Promise.all([
    DDDBIReport.countDocuments(),
    DDDScorecard.countDocuments(),
    DDDBenchmark.countDocuments(),
  ]);

  return {
    service: 'BusinessIntelligence',
    reports: { total: reportCount, builtin: BUILTIN_REPORTS.length },
    scorecards: { total: scorecardCount, builtin: BUILTIN_SCORECARDS.length },
    benchmarks: benchmarkCount,
    categories: Object.keys(REPORT_CATEGORIES).length,
  };
}

/* ═══════════════════════════════════════════════════════════════
   Router
   ═══════════════════════════════════════════════════════════════ */

function createBusinessIntelligenceRouter() {
  const r = Router();

  r.get('/business-intelligence', async (_req, res) => {
    try {
      res.json({ success: true, data: await getBIDashboard() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  r.get('/business-intelligence/reports', async (req, res) => {
    try {
      const query = {};
      if (req.query.category) query.category = req.query.category;
      const reports = await DDDBIReport.find({ ...query, isActive: true }).lean();
      res.json({
        success: true,
        data: reports,
        builtin: BUILTIN_REPORTS,
        categories: REPORT_CATEGORIES,
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  r.post('/business-intelligence/reports/:reportId/execute', async (req, res) => {
    try {
      res.json({ success: true, data: await executeReport(req.params.reportId, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  r.get('/business-intelligence/scorecards', async (_req, res) => {
    try {
      const scorecards = await DDDScorecard.find({ isActive: true }).lean();
      res.json({ success: true, data: scorecards, builtin: BUILTIN_SCORECARDS });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  r.get('/business-intelligence/scorecards/:scorecardId', async (req, res) => {
    try {
      res.json({ success: true, data: await calculateScorecard(req.params.scorecardId) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  r.get('/business-intelligence/executive-summary', async (_req, res) => {
    try {
      res.json({ success: true, data: await executiveSummary() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  r.get('/business-intelligence/benchmarks', async (req, res) => {
    try {
      res.json({ success: true, data: await getBenchmarks(req.query.domain) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  r.post('/business-intelligence/benchmarks', async (req, res) => {
    try {
      res.json({ success: true, data: await upsertBenchmark(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  r.post('/business-intelligence/seed', async (_req, res) => {
    try {
      res.json({ success: true, data: await seedReports() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  return r;
}

/* ═══════════════════════════════════════════════════════════════
   Exports
   ═══════════════════════════════════════════════════════════════ */

module.exports = {
  DDDBIReport,
  DDDScorecard,
  DDDBenchmark,
  BUILTIN_REPORTS,
  BUILTIN_SCORECARDS,
  REPORT_CATEGORIES,
  executeReport,
  calculateScorecard,
  executiveSummary,
  upsertBenchmark,
  getBenchmarks,
  seedReports,
  getBIDashboard,
  createBusinessIntelligenceRouter,
};

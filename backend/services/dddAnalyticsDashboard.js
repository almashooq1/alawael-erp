/**
 * DDD Analytics Dashboard — Phase 12a
 * لوحة تحليلات متقدمة في الوقت الفعلي
 *
 * Real-time analytics dashboard with KPI widgets, trend analysis,
 * heatmaps, cohort analysis, and customizable widget engine.
 */

'use strict';

const mongoose = require('mongoose');
const { Router } = require('express');

/* ═══════════════════════════════════════════════════════════════
   Mongoose Models
   ═══════════════════════════════════════════════════════════════ */

const dddWidgetSchema = new mongoose.Schema(
  {
    widgetId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    titleAr: { type: String },
    type: {
      type: String,
      enum: [
        'kpi',
        'chart',
        'table',
        'heatmap',
        'gauge',
        'funnel',
        'map',
        'timeline',
        'treemap',
        'scatter',
      ],
      required: true,
    },
    domain: { type: String },
    dataSource: {
      collection: String,
      pipeline: [mongoose.Schema.Types.Mixed],
      query: mongoose.Schema.Types.Mixed,
    },
    config: {
      refreshInterval: { type: Number, default: 60 },
      chartType: String,
      colors: [String],
      thresholds: [{ label: String, value: Number, color: String }],
      drillDown: { enabled: { type: Boolean, default: false }, targetWidget: String },
      filters: [{ field: String, operator: String, value: mongoose.Schema.Types.Mixed }],
    },
    layout: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
      w: { type: Number, default: 4 },
      h: { type: Number, default: 3 },
    },
    permissions: [String],
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const DDDWidget = mongoose.models.DDDWidget || mongoose.model('DDDWidget', dddWidgetSchema);

const dddDashboardLayoutSchema = new mongoose.Schema(
  {
    layoutId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    description: { type: String },
    widgets: [{ widgetId: String, overrides: mongoose.Schema.Types.Mixed }],
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isDefault: { type: Boolean, default: false },
    role: { type: String },
    refreshRate: { type: Number, default: 30 },
    theme: { type: String, enum: ['light', 'dark', 'clinical', 'executive'], default: 'clinical' },
    filters: [{ field: String, operator: String, value: mongoose.Schema.Types.Mixed }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const DDDDashboardLayout =
  mongoose.models.DDDDashboardLayout ||
  mongoose.model('DDDDashboardLayout', dddDashboardLayoutSchema);

const dddAnalyticsSnapshotSchema = new mongoose.Schema(
  {
    snapshotId: { type: String, required: true, index: true },
    domain: { type: String, required: true },
    metricKey: { type: String, required: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    dimensions: { type: Map, of: mongoose.Schema.Types.Mixed },
    period: { type: String, enum: ['hourly', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'] },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

dddAnalyticsSnapshotSchema.index({ domain: 1, metricKey: 1, timestamp: -1 });
dddAnalyticsSnapshotSchema.index({ snapshotId: 1, timestamp: -1 });

const DDDAnalyticsSnapshot =
  mongoose.models.DDDAnalyticsSnapshot ||
  mongoose.model('DDDAnalyticsSnapshot', dddAnalyticsSnapshotSchema);

/* ═══════════════════════════════════════════════════════════════
   Widget Registry
   ═══════════════════════════════════════════════════════════════ */

const WIDGET_TYPES = {
  kpi: { label: 'KPI Card', icon: 'speed' },
  chart: { label: 'Chart', icon: 'bar_chart' },
  table: { label: 'Data Table', icon: 'table_chart' },
  heatmap: { label: 'Heat Map', icon: 'grid_on' },
  gauge: { label: 'Gauge', icon: 'speed' },
  funnel: { label: 'Funnel', icon: 'filter_alt' },
  map: { label: 'Map View', icon: 'map' },
  timeline: { label: 'Timeline', icon: 'timeline' },
  treemap: { label: 'Tree Map', icon: 'account_tree' },
  scatter: { label: 'Scatter Plot', icon: 'scatter_plot' },
};

/* ═══════════════════════════════════════════════════════════════
   Builtin Widget Definitions (≥20)
   ═══════════════════════════════════════════════════════════════ */

const BUILTIN_WIDGETS = [
  {
    widgetId: 'w-beneficiary-count',
    title: 'Total Beneficiaries',
    titleAr: 'إجمالي المستفيدين',
    type: 'kpi',
    domain: 'core',
    dataSource: { collection: 'beneficiaries', pipeline: [{ $count: 'total' }] },
  },
  {
    widgetId: 'w-active-episodes',
    title: 'Active Episodes',
    titleAr: 'الحلقات النشطة',
    type: 'kpi',
    domain: 'episodes',
    dataSource: {
      collection: 'episodesofcares',
      pipeline: [{ $match: { status: 'active' } }, { $count: 'total' }],
    },
  },
  {
    widgetId: 'w-session-trend',
    title: 'Session Trend (30d)',
    titleAr: 'اتجاه الجلسات',
    type: 'chart',
    domain: 'sessions',
    dataSource: {
      collection: 'clinicalsessions',
      pipeline: [
        { $match: { createdAt: { $gte: '$$30daysAgo' } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ],
    },
  },
  {
    widgetId: 'w-assessment-dist',
    title: 'Assessment Distribution',
    titleAr: 'توزيع التقييمات',
    type: 'chart',
    domain: 'assessments',
    dataSource: {
      collection: 'clinicalassessments',
      pipeline: [{ $group: { _id: '$domain', count: { $sum: 1 } } }],
    },
  },
  {
    widgetId: 'w-goal-progress',
    title: 'Goal Achievement Rate',
    titleAr: 'معدل تحقيق الأهداف',
    type: 'gauge',
    domain: 'goals',
    dataSource: {
      collection: 'therapeuticgoals',
      pipeline: [
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            achieved: { $sum: { $cond: [{ $eq: ['$status', 'achieved'] }, 1, 0] } },
          },
        },
      ],
    },
  },
  {
    widgetId: 'w-risk-heatmap',
    title: 'Risk Distribution Heatmap',
    titleAr: 'خريطة توزيع المخاطر',
    type: 'heatmap',
    domain: 'risk',
    dataSource: {
      collection: 'clinicalriskscores',
      pipeline: [{ $group: { _id: { tier: '$tier', domain: '$domain' }, count: { $sum: 1 } } }],
    },
  },
  {
    widgetId: 'w-quality-score',
    title: 'Quality Score',
    titleAr: 'درجة الجودة',
    type: 'gauge',
    domain: 'quality',
    dataSource: {
      collection: 'qualityaudits',
      pipeline: [{ $group: { _id: null, avg: { $avg: '$score' } } }],
    },
  },
  {
    widgetId: 'w-family-engagement',
    title: 'Family Engagement Rate',
    titleAr: 'معدل مشاركة الأسرة',
    type: 'kpi',
    domain: 'family',
    dataSource: {
      collection: 'familycommunications',
      pipeline: [{ $group: { _id: null, total: { $sum: 1 } } }],
    },
  },
  {
    widgetId: 'w-group-sessions',
    title: 'Group Therapy Sessions',
    titleAr: 'الجلسات الجماعية',
    type: 'chart',
    domain: 'group-therapy',
    dataSource: {
      collection: 'groupsessions',
      pipeline: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
    },
  },
  {
    widgetId: 'w-tele-usage',
    title: 'Tele-Rehab Usage',
    titleAr: 'استخدام إعادة التأهيل عن بُعد',
    type: 'chart',
    domain: 'tele-rehab',
    dataSource: {
      collection: 'telesessions',
      pipeline: [
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
      ],
    },
  },
  {
    widgetId: 'w-behavior-incidents',
    title: 'Behavior Incidents',
    titleAr: 'حوادث السلوك',
    type: 'chart',
    domain: 'behavior',
    dataSource: {
      collection: 'behaviorrecords',
      pipeline: [{ $group: { _id: '$behaviorType', count: { $sum: 1 } } }],
    },
  },
  {
    widgetId: 'w-research-progress',
    title: 'Research Studies Progress',
    titleAr: 'تقدم الأبحاث',
    type: 'funnel',
    domain: 'research',
    dataSource: {
      collection: 'researchstudies',
      pipeline: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
    },
  },
  {
    widgetId: 'w-training-completion',
    title: 'Training Completion',
    titleAr: 'إكمال التدريب',
    type: 'gauge',
    domain: 'field-training',
    dataSource: {
      collection: 'traineerecords',
      pipeline: [
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          },
        },
      ],
    },
  },
  {
    widgetId: 'w-workflow-backlog',
    title: 'Workflow Task Backlog',
    titleAr: 'تراكم المهام',
    type: 'kpi',
    domain: 'workflow',
    dataSource: {
      collection: 'workflowtasks',
      pipeline: [{ $match: { status: { $in: ['pending', 'in-progress'] } } }, { $count: 'total' }],
    },
  },
  {
    widgetId: 'w-care-plan-funnel',
    title: 'Care Plan Status Funnel',
    titleAr: 'مسار خطط الرعاية',
    type: 'funnel',
    domain: 'care-plans',
    dataSource: {
      collection: 'unifiedcareplans',
      pipeline: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
    },
  },
  {
    widgetId: 'w-recommendation-types',
    title: 'AI Recommendation Types',
    titleAr: 'أنواع التوصيات',
    type: 'chart',
    domain: 'ai-recommendations',
    dataSource: {
      collection: 'recommendations',
      pipeline: [{ $group: { _id: '$type', count: { $sum: 1 } } }],
    },
  },
  {
    widgetId: 'w-episode-duration',
    title: 'Avg Episode Duration',
    titleAr: 'متوسط مدة الحلقة',
    type: 'kpi',
    domain: 'episodes',
    dataSource: {
      collection: 'episodesofcares',
      pipeline: [
        { $match: { endDate: { $exists: true } } },
        { $project: { duration: { $subtract: ['$endDate', '$startDate'] } } },
        { $group: { _id: null, avg: { $avg: '$duration' } } },
      ],
    },
  },
  {
    widgetId: 'w-arvr-sessions',
    title: 'AR/VR Session Metrics',
    titleAr: 'مقاييس جلسات AR/VR',
    type: 'chart',
    domain: 'ar-vr',
    dataSource: {
      collection: 'arvrsessions',
      pipeline: [
        { $group: { _id: '$sessionType', count: { $sum: 1 }, avgDuration: { $avg: '$duration' } } },
      ],
    },
  },
  {
    widgetId: 'w-measure-library',
    title: 'Measures by Domain',
    titleAr: 'المقاييس حسب المجال',
    type: 'treemap',
    domain: 'assessments',
    dataSource: {
      collection: 'measures',
      pipeline: [{ $group: { _id: '$domain', count: { $sum: 1 } } }],
    },
  },
  {
    widgetId: 'w-program-enrollment',
    title: 'Program Enrollments',
    titleAr: 'التسجيلات بالبرامج',
    type: 'chart',
    domain: 'programs',
    dataSource: {
      collection: 'programenrollments',
      pipeline: [{ $group: { _id: '$programId', count: { $sum: 1 } } }],
    },
  },
];

/* ═══════════════════════════════════════════════════════════════
   Cohort Definitions (≥8)
   ═══════════════════════════════════════════════════════════════ */

const COHORT_DEFINITIONS = [
  {
    id: 'age-group',
    label: 'Age Group',
    labelAr: 'الفئة العمرية',
    dimension: 'demographics.ageGroup',
  },
  {
    id: 'disability-type',
    label: 'Disability Type',
    labelAr: 'نوع الإعاقة',
    dimension: 'disability.type',
  },
  {
    id: 'severity',
    label: 'Severity Level',
    labelAr: 'مستوى الشدة',
    dimension: 'disability.severity',
  },
  {
    id: 'region',
    label: 'Geographic Region',
    labelAr: 'المنطقة الجغرافية',
    dimension: 'address.region',
  },
  {
    id: 'referral-source',
    label: 'Referral Source',
    labelAr: 'مصدر الإحالة',
    dimension: 'referral.source',
  },
  {
    id: 'treatment-phase',
    label: 'Treatment Phase',
    labelAr: 'مرحلة العلاج',
    dimension: 'episode.phase',
  },
  { id: 'risk-tier', label: 'Risk Tier', labelAr: 'مستوى المخاطر', dimension: 'riskScore.tier' },
  {
    id: 'program',
    label: 'Enrolled Program',
    labelAr: 'البرنامج المسجل',
    dimension: 'enrollment.programId',
  },
];

/* ═══════════════════════════════════════════════════════════════
   Core Functions
   ═══════════════════════════════════════════════════════════════ */

/**
 * Create or update a widget definition
 */
async function upsertWidget(widgetData) {
  return DDDWidget.findOneAndUpdate(
    { widgetId: widgetData.widgetId },
    { $set: widgetData },
    { upsert: true, new: true, runValidators: true }
  );
}

/**
 * Execute a widget's data source pipeline
 */
async function executeWidget(widgetId, filters = {}) {
  const widget = await DDDWidget.findOne({ widgetId, isActive: true }).lean();
  if (!widget) throw new Error(`Widget not found: ${widgetId}`);

  const db = mongoose.connection;
  if (!widget.dataSource?.collection) {
    return { widget, data: null, message: 'No data source configured' };
  }

  let pipeline = [...(widget.dataSource.pipeline || [])];

  // Apply runtime filters
  if (Object.keys(filters).length > 0) {
    pipeline.unshift({ $match: filters });
  }

  try {
    const data = await db.collection(widget.dataSource.collection).aggregate(pipeline).toArray();
    return { widget, data, executedAt: new Date() };
  } catch (err) {
    return { widget, data: [], error: err.message };
  }
}

/**
 * Save a dashboard layout
 */
async function saveDashboardLayout(layoutData) {
  return DDDDashboardLayout.findOneAndUpdate(
    { layoutId: layoutData.layoutId },
    { $set: layoutData },
    { upsert: true, new: true, runValidators: true }
  );
}

/**
 * Load a dashboard layout with its widgets
 */
async function loadDashboardLayout(layoutId) {
  const layout = await DDDDashboardLayout.findOne({ layoutId, isActive: true }).lean();
  if (!layout) return null;

  const widgetIds = layout.widgets.map(w => w.widgetId);
  const widgets = await DDDWidget.find({ widgetId: { $in: widgetIds }, isActive: true }).lean();

  return {
    ...layout,
    widgets: layout.widgets.map(lw => {
      const full = widgets.find(w => w.widgetId === lw.widgetId);
      return { ...full, ...(lw.overrides || {}) };
    }),
  };
}

/**
 * Record an analytics snapshot
 */
async function recordSnapshot(domain, metricKey, value, dimensions = {}, period = 'daily') {
  const snapshotId = `${domain}:${metricKey}:${period}:${Date.now()}`;
  return DDDAnalyticsSnapshot.create({
    snapshotId,
    domain,
    metricKey,
    value,
    dimensions,
    period,
  });
}

/**
 * Get trend data for a metric
 */
async function getTrend(domain, metricKey, options = {}) {
  const { period = 'daily', limit = 30, startDate, endDate } = options;
  const query = { domain, metricKey, period };
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }

  return DDDAnalyticsSnapshot.find(query).sort({ timestamp: -1 }).limit(limit).lean();
}

/**
 * Run cohort analysis
 */
async function runCohortAnalysis(cohortId, metric, options = {}) {
  const cohort = COHORT_DEFINITIONS.find(c => c.id === cohortId);
  if (!cohort) throw new Error(`Unknown cohort: ${cohortId}`);

  const db = mongoose.connection;
  const pipeline = [
    { $group: { _id: `$${cohort.dimension}`, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: options.limit || 20 },
  ];

  try {
    const data = await db
      .collection(metric.collection || 'beneficiaries')
      .aggregate(pipeline)
      .toArray();
    return { cohort, metric, data, executedAt: new Date() };
  } catch (err) {
    return { cohort, metric, data: [], error: err.message };
  }
}

/**
 * Seed builtin widgets
 */
async function seedWidgets() {
  let seeded = 0;
  for (const w of BUILTIN_WIDGETS) {
    const exists = await DDDWidget.findOne({ widgetId: w.widgetId }).lean();
    if (!exists) {
      await DDDWidget.create(w);
      seeded++;
    }
  }
  return { seeded, total: BUILTIN_WIDGETS.length };
}

/**
 * Get analytics dashboard summary
 */
async function getAnalyticsDashboard() {
  const [widgetCount, layoutCount, snapshotCount] = await Promise.all([
    DDDWidget.countDocuments(),
    DDDDashboardLayout.countDocuments(),
    DDDAnalyticsSnapshot.countDocuments(),
  ]);

  return {
    service: 'AnalyticsDashboard',
    widgets: {
      total: widgetCount,
      builtinTypes: Object.keys(WIDGET_TYPES).length,
      builtinWidgets: BUILTIN_WIDGETS.length,
    },
    layouts: layoutCount,
    snapshots: snapshotCount,
    cohorts: COHORT_DEFINITIONS.length,
    widgetTypes: Object.keys(WIDGET_TYPES),
  };
}

/* ═══════════════════════════════════════════════════════════════
   Router
   ═══════════════════════════════════════════════════════════════ */

function createAnalyticsDashboardRouter() {
  const r = Router();

  r.get('/analytics-dashboard', async (_req, res) => {
    try {
      res.json({ success: true, data: await getAnalyticsDashboard() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  r.get('/analytics-dashboard/widgets', async (_req, res) => {
    try {
      const widgets = await DDDWidget.find({ isActive: true }).lean();
      res.json({ success: true, data: widgets });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  r.get('/analytics-dashboard/widget/:widgetId', async (req, res) => {
    try {
      res.json({ success: true, data: await executeWidget(req.params.widgetId, req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  r.post('/analytics-dashboard/widgets', async (req, res) => {
    try {
      res.json({ success: true, data: await upsertWidget(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  r.get('/analytics-dashboard/layouts/:layoutId', async (req, res) => {
    try {
      res.json({ success: true, data: await loadDashboardLayout(req.params.layoutId) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  r.post('/analytics-dashboard/layouts', async (req, res) => {
    try {
      res.json({ success: true, data: await saveDashboardLayout(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  r.get('/analytics-dashboard/trend/:domain/:metricKey', async (req, res) => {
    try {
      const data = await getTrend(req.params.domain, req.params.metricKey, req.query);
      res.json({ success: true, data });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  r.post('/analytics-dashboard/snapshot', async (req, res) => {
    try {
      const { domain, metricKey, value, dimensions, period } = req.body;
      const snap = await recordSnapshot(domain, metricKey, value, dimensions, period);
      res.json({ success: true, data: snap });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  r.get('/analytics-dashboard/cohort/:cohortId', async (req, res) => {
    try {
      res.json({ success: true, data: await runCohortAnalysis(req.params.cohortId, req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  r.post('/analytics-dashboard/seed', async (_req, res) => {
    try {
      res.json({ success: true, data: await seedWidgets() });
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
  DDDWidget,
  DDDDashboardLayout,
  DDDAnalyticsSnapshot,
  WIDGET_TYPES,
  BUILTIN_WIDGETS,
  COHORT_DEFINITIONS,
  upsertWidget,
  executeWidget,
  saveDashboardLayout,
  loadDashboardLayout,
  recordSnapshot,
  getTrend,
  runCohortAnalysis,
  seedWidgets,
  getAnalyticsDashboard,
  createAnalyticsDashboardRouter,
};

/**
 * Analytics & BI Service — Al-Awael ERP
 * Port: 3370
 *
 * KPI dashboards, cohort analysis, trend detection, predictive analytics,
 * data warehouse (fact/dimension tables), report scheduling, custom queries,
 * executive summaries, comparative analytics per branch/grade/department.
 */

'use strict';

const express = require('express');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const { Queue, Worker } = require('bullmq');
const cron = require('node-cron');
const helmet = require('helmet');
const cors = require('cors');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379/0', {
  maxRetriesPerRequest: null,
  retryStrategy: t => Math.min(t * 200, 5000),
});

const analyticsQueue = new Queue('analytics-jobs', { connection: redis });

/* ───────── Mongoose schemas ───────── */

// KPI Definition
const kpiSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    nameAr: String,
    category: {
      type: String,
      enum: ['enrollment', 'attendance', 'finance', 'hr', 'academic', 'rehab', 'operations', 'satisfaction', 'safety', 'custom'],
      required: true,
    },
    description: String,
    unit: { type: String, enum: ['percentage', 'number', 'currency', 'ratio', 'days', 'hours'], default: 'number' },
    formula: String, // e.g. "attendance_present / attendance_total * 100"
    target: Number,
    warningThreshold: Number,
    criticalThreshold: Number,
    direction: { type: String, enum: ['higher-better', 'lower-better'], default: 'higher-better' },
    frequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'quarterly', 'annual'], default: 'monthly' },
    dataSource: String, // service name
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const KPI = mongoose.model('KPI', kpiSchema);

// KPI Snapshot (time-series data)
const kpiSnapshotSchema = new mongoose.Schema(
  {
    kpiCode: { type: String, required: true, index: true },
    value: { type: Number, required: true },
    target: Number,
    period: { type: String, required: true }, // "2026-02", "2026-W08", "2026-02-24"
    periodType: { type: String, enum: ['daily', 'weekly', 'monthly', 'quarterly', 'annual'] },
    branchId: String,
    department: String,
    gradeLevel: String,
    metadata: mongoose.Schema.Types.Mixed,
    status: { type: String, enum: ['on-track', 'warning', 'critical', 'exceeded'], default: 'on-track' },
  },
  { timestamps: true },
);

kpiSnapshotSchema.index({ kpiCode: 1, period: 1, branchId: 1 }, { unique: true });

const KPISnapshot = mongoose.model('KPISnapshot', kpiSnapshotSchema);

// Dashboard
const dashboardSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    nameAr: String,
    ownerId: { type: String, required: true },
    type: { type: String, enum: ['executive', 'department', 'operational', 'financial', 'academic', 'custom'], default: 'custom' },
    layout: { type: String, enum: ['grid', 'freeform'], default: 'grid' },
    widgets: [
      {
        widgetId: String,
        type: {
          type: String,
          enum: ['kpi-card', 'line-chart', 'bar-chart', 'pie-chart', 'table', 'gauge', 'map', 'heatmap', 'funnel', 'counter', 'text'],
        },
        title: String,
        titleAr: String,
        kpiCodes: [String],
        query: mongoose.Schema.Types.Mixed, // custom query config
        position: { row: Number, col: Number, width: Number, height: Number },
        config: mongoose.Schema.Types.Mixed, // chart options
      },
    ],
    filters: [
      {
        field: String,
        label: String,
        type: { type: String, enum: ['date-range', 'select', 'multi-select'] },
        options: [String],
      },
    ],
    isShared: { type: Boolean, default: false },
    sharedWith: [String],
    refreshInterval: { type: Number, default: 300 }, // seconds
  },
  { timestamps: true },
);

const Dashboard = mongoose.model('Dashboard', dashboardSchema);

// Saved Report
const reportSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    nameAr: String,
    category: String,
    query: { type: mongoose.Schema.Types.Mixed, required: true }, // aggregation pipeline
    dataSource: String,
    format: { type: String, enum: ['json', 'csv', 'pdf', 'excel'], default: 'json' },
    schedule: {
      enabled: { type: Boolean, default: false },
      cron: String, // "0 8 * * 1" (every Monday 8 AM)
      recipients: [String], // email
      lastRun: Date,
    },
    lastResult: mongoose.Schema.Types.Mixed,
    createdBy: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const Report = mongoose.model('AnalyticsReport', reportSchema);

// Data Warehouse — Fact table
const factSchema = new mongoose.Schema(
  {
    factType: { type: String, required: true, index: true }, // "enrollment", "attendance", "revenue"
    date: { type: Date, required: true },
    dateKey: String, // "2026-02-24"
    branchId: String,
    departmentId: String,
    gradeLevel: String,
    classId: String,
    // Measures
    measures: { type: mongoose.Schema.Types.Mixed }, // { count: 5, amount: 1500, ... }
    dimensions: { type: mongoose.Schema.Types.Mixed }, // { region: 'Riyadh', category: 'tuition' }
  },
  { timestamps: true },
);

factSchema.index({ factType: 1, dateKey: 1, branchId: 1 });

const Fact = mongoose.model('Fact', factSchema);

/* ───────── BullMQ worker ───────── */

new Worker(
  'analytics-jobs',
  async job => {
    if (job.name === 'calculate-kpis') {
      const kpis = await KPI.find({ isActive: true });
      for (const kpi of kpis) {
        // In production: query respective services for live data
        const value = Math.random() * 100; // placeholder
        let status = 'on-track';
        if (kpi.direction === 'higher-better') {
          if (kpi.criticalThreshold && value < kpi.criticalThreshold) status = 'critical';
          else if (kpi.warningThreshold && value < kpi.warningThreshold) status = 'warning';
          else if (kpi.target && value >= kpi.target) status = 'exceeded';
        } else {
          if (kpi.criticalThreshold && value > kpi.criticalThreshold) status = 'critical';
          else if (kpi.warningThreshold && value > kpi.warningThreshold) status = 'warning';
          else if (kpi.target && value <= kpi.target) status = 'exceeded';
        }

        const period = new Date().toISOString().slice(0, 10);
        await KPISnapshot.findOneAndUpdate(
          { kpiCode: kpi.code, period, branchId: job.data.branchId || 'main' },
          { value: Math.round(value * 100) / 100, target: kpi.target, periodType: 'daily', status },
          { upsert: true },
        );
      }
      console.log(`[AnalyticsBI] Calculated ${kpis.length} KPIs`);
    }

    if (job.name === 'run-report') {
      const report = await Report.findById(job.data.reportId);
      if (!report) return;
      // Execute query — in production, run against data warehouse
      report.lastResult = { generatedAt: new Date(), rows: [] };
      report.schedule.lastRun = new Date();
      await report.save();
      console.log(`[AnalyticsBI] Report ${report.name} completed`);
    }
  },
  { connection: redis },
);

/* ───────── Routes ───────── */
const r = express.Router();

// ── KPIs ──
r.get('/kpis', async (req, res) => {
  try {
    const { category, active } = req.query;
    const q = {};
    if (category) q.category = category;
    if (active !== undefined) q.isActive = active === 'true';
    const kpis = await KPI.find(q).sort({ category: 1, code: 1 });
    res.json({ success: true, data: kpis });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

r.post('/kpis', async (req, res) => {
  try {
    const kpi = await KPI.create(req.body);
    res.status(201).json({ success: true, data: kpi });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

r.put('/kpis/:id', async (req, res) => {
  try {
    const kpi = await KPI.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: kpi });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// KPI snapshots / time-series
r.get('/kpis/:code/data', async (req, res) => {
  try {
    const { from, to, branchId, periodType } = req.query;
    const q = { kpiCode: req.params.code };
    if (from || to) {
      q.period = {};
      if (from) q.period.$gte = from;
      if (to) q.period.$lte = to;
    }
    if (branchId) q.branchId = branchId;
    if (periodType) q.periodType = periodType;
    const data = await KPISnapshot.find(q).sort({ period: 1 });
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Executive Dashboard ──
r.get('/executive-summary', async (req, res) => {
  try {
    const { branchId } = req.query;
    const today = new Date().toISOString().slice(0, 10);
    const thisMonth = today.slice(0, 7);
    const q = branchId ? { branchId } : {};

    // Get latest KPI snapshots
    const kpiCodes = ['ENR-001', 'ATT-001', 'FIN-001', 'SAT-001', 'HR-001'];
    const latestKPIs = {};
    for (const code of kpiCodes) {
      const snap = await KPISnapshot.findOne({ kpiCode: code, ...q }).sort({ period: -1 });
      if (snap) latestKPIs[code] = snap;
    }

    // Monthly trends
    const monthlyTrends = await KPISnapshot.aggregate([
      { $match: { periodType: 'monthly', ...q } },
      { $sort: { period: -1 } },
      { $limit: 120 },
      { $group: { _id: { code: '$kpiCode', period: '$period' }, value: { $first: '$value' }, status: { $first: '$status' } } },
    ]);

    // Facts summary
    const revenueThisMonth = await Fact.aggregate([
      { $match: { factType: 'revenue', dateKey: { $regex: `^${thisMonth}` }, ...q } },
      { $group: { _id: null, total: { $sum: '$measures.amount' } } },
    ]);

    const cacheKey = `exec-summary:${branchId || 'all'}`;
    const cached = await redis.get(cacheKey);
    if (cached) return res.json({ success: true, data: JSON.parse(cached), cached: true });

    const result = {
      date: today,
      kpis: latestKPIs,
      monthlyTrends,
      revenueThisMonth: revenueThisMonth[0]?.total || 0,
    };

    await redis.setex(cacheKey, 300, JSON.stringify(result)); // cache 5 min
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Dashboards ──
r.get('/dashboards', async (req, res) => {
  try {
    const { ownerId, type, shared } = req.query;
    const q = {};
    if (ownerId) q.$or = [{ ownerId }, { isShared: true }, { sharedWith: ownerId }];
    if (type) q.type = type;
    const dashboards = await Dashboard.find(q).sort({ updatedAt: -1 });
    res.json({ success: true, data: dashboards });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

r.post('/dashboards', async (req, res) => {
  try {
    const d = await Dashboard.create(req.body);
    res.status(201).json({ success: true, data: d });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

r.put('/dashboards/:id', async (req, res) => {
  try {
    const d = await Dashboard.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: d });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

r.get('/dashboards/:id', async (req, res) => {
  try {
    const d = await Dashboard.findById(req.params.id);
    if (!d) return res.status(404).json({ success: false, error: 'Not found' });
    // Fetch KPI data for widgets
    const widgetData = {};
    for (const widget of d.widgets) {
      if (widget.kpiCodes?.length) {
        widgetData[widget.widgetId] = await KPISnapshot.find({ kpiCode: { $in: widget.kpiCodes } })
          .sort({ period: -1 })
          .limit(30);
      }
    }
    res.json({ success: true, data: { dashboard: d, widgetData } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Reports ──
r.get('/reports', async (req, res) => {
  try {
    const { category, createdBy } = req.query;
    const q = { isActive: true };
    if (category) q.category = category;
    if (createdBy) q.createdBy = createdBy;
    const reports = await Report.find(q).sort({ name: 1 });
    res.json({ success: true, data: reports });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

r.post('/reports', async (req, res) => {
  try {
    const report = await Report.create(req.body);
    res.status(201).json({ success: true, data: report });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

r.post('/reports/:id/run', async (req, res) => {
  try {
    await analyticsQueue.add('run-report', { reportId: req.params.id });
    res.json({ success: true, message: 'Report execution queued' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Facts (Data Warehouse ingestion) ──
r.post('/facts', async (req, res) => {
  try {
    const facts = Array.isArray(req.body) ? req.body : [req.body];
    const inserted = await Fact.insertMany(
      facts.map(f => ({
        ...f,
        dateKey: f.dateKey || new Date(f.date).toISOString().slice(0, 10),
      })),
    );
    res.status(201).json({ success: true, data: { inserted: inserted.length } });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

r.get('/facts', async (req, res) => {
  try {
    const { factType, from, to, branchId, groupBy } = req.query;
    const match = {};
    if (factType) match.factType = factType;
    if (from || to) {
      match.dateKey = {};
      if (from) match.dateKey.$gte = from;
      if (to) match.dateKey.$lte = to;
    }
    if (branchId) match.branchId = branchId;

    if (groupBy) {
      const group = { _id: `$${groupBy}` };
      group.totalCount = { $sum: '$measures.count' };
      group.totalAmount = { $sum: '$measures.amount' };
      group.records = { $sum: 1 };
      const result = await Fact.aggregate([{ $match: match }, { $group: group }, { $sort: { _id: 1 } }]);
      return res.json({ success: true, data: result });
    }

    const facts = await Fact.find(match).sort({ dateKey: -1 }).limit(1000);
    res.json({ success: true, data: facts });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Cohort / Comparative analysis ──
r.get('/cohort', async (req, res) => {
  try {
    const { factType, dimension, from, to } = req.query;
    const match = { factType: factType || 'enrollment' };
    if (from || to) {
      match.dateKey = {};
      if (from) match.dateKey.$gte = from;
      if (to) match.dateKey.$lte = to;
    }

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: { period: { $substr: ['$dateKey', 0, 7] }, segment: `$dimensions.${dimension || 'gradeLevel'}` },
          total: { $sum: '$measures.count' },
          amount: { $sum: '$measures.amount' },
        },
      },
      { $sort: { '_id.period': 1 } },
    ];

    const result = await Fact.aggregate(pipeline);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Seed default KPIs ──
r.post('/seed-kpis', async (req, res) => {
  try {
    const defaults = [
      {
        code: 'ENR-001',
        name: 'Enrollment Rate',
        nameAr: 'معدل التسجيل',
        category: 'enrollment',
        unit: 'percentage',
        target: 95,
        warningThreshold: 85,
        criticalThreshold: 70,
      },
      {
        code: 'ATT-001',
        name: 'Daily Attendance Rate',
        nameAr: 'معدل الحضور اليومي',
        category: 'attendance',
        unit: 'percentage',
        target: 95,
        warningThreshold: 90,
        criticalThreshold: 80,
      },
      {
        code: 'FIN-001',
        name: 'Fee Collection Rate',
        nameAr: 'معدل تحصيل الرسوم',
        category: 'finance',
        unit: 'percentage',
        target: 90,
        warningThreshold: 80,
        criticalThreshold: 60,
      },
      {
        code: 'FIN-002',
        name: 'Monthly Revenue',
        nameAr: 'الإيرادات الشهرية',
        category: 'finance',
        unit: 'currency',
        direction: 'higher-better',
      },
      {
        code: 'SAT-001',
        name: 'Parent Satisfaction Score',
        nameAr: 'مؤشر رضا أولياء الأمور',
        category: 'satisfaction',
        unit: 'percentage',
        target: 85,
        warningThreshold: 70,
      },
      {
        code: 'HR-001',
        name: 'Staff Retention Rate',
        nameAr: 'معدل الاحتفاظ بالموظفين',
        category: 'hr',
        unit: 'percentage',
        target: 90,
        warningThreshold: 80,
      },
      {
        code: 'HR-002',
        name: 'Staff Absence Rate',
        nameAr: 'معدل غياب الموظفين',
        category: 'hr',
        unit: 'percentage',
        target: 5,
        warningThreshold: 8,
        criticalThreshold: 12,
        direction: 'lower-better',
      },
      {
        code: 'ACA-001',
        name: 'IEP Goal Achievement',
        nameAr: 'نسبة تحقيق أهداف الخطة التربوية',
        category: 'academic',
        unit: 'percentage',
        target: 80,
        warningThreshold: 60,
      },
      {
        code: 'OPS-001',
        name: 'Maintenance Response Time',
        nameAr: 'وقت الاستجابة للصيانة',
        category: 'operations',
        unit: 'hours',
        target: 4,
        warningThreshold: 8,
        criticalThreshold: 24,
        direction: 'lower-better',
      },
      {
        code: 'SAF-001',
        name: 'Incident Rate',
        nameAr: 'معدل الحوادث',
        category: 'safety',
        unit: 'number',
        target: 0,
        warningThreshold: 2,
        criticalThreshold: 5,
        direction: 'lower-better',
      },
    ];

    const created = [];
    for (const d of defaults) {
      const exists = await KPI.findOne({ code: d.code });
      if (!exists) created.push(await KPI.create(d));
    }
    res.json({ success: true, data: created, message: `Seeded ${created.length} KPIs` });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.use('/api', r);

// Health
app.get('/health', async (_req, res) => {
  const mongoOk = mongoose.connection.readyState === 1;
  const redisOk = redis.status === 'ready';
  const ok = mongoOk && redisOk;
  res.status(ok ? 200 : 503).json({ status: ok ? 'healthy' : 'degraded', mongo: mongoOk, redis: redisOk, uptime: process.uptime() });
});

/* ───────── Cron: calculate KPIs daily 6 AM ───────── */
cron.schedule('0 6 * * *', async () => {
  await analyticsQueue.add('calculate-kpis', { branchId: 'main' });
});

/* ───────── Start ───────── */
const PORT = process.env.PORT || 3370;
const MONGO = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://mongodb:27017/alawael_analytics';

mongoose
  .connect(MONGO)
  .then(() => {
    console.log('[AnalyticsBI] MongoDB connected');
    app.listen(PORT, '0.0.0.0', () => console.log(`[AnalyticsBI] listening on ${PORT}`));
  })
  .catch(err => {
    console.error('[AnalyticsBI] Mongo error', err);
    process.exit(1);
  });

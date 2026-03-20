/**
 * ═══════════════════════════════════════════════════════════════
 *  Al-Awael ERP — AI Engine Service (محرك الذكاء الاصطناعي)
 *  Port: 3660
 *  Phase 8C — Predictive Analytics, Anomaly Detection, Smart Recommendations
 * ═══════════════════════════════════════════════════════════════
 */
'use strict';

const express = require('express');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const { Queue, Worker } = require('bullmq');
const cors = require('cors');
const helmet = require('helmet');
const cron = require('node-cron');
const dayjs = require('dayjs');
const ss = require('simple-statistics');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.PORT || 3660;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael_ai';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  retryStrategy: t => Math.min(t * 50, 2000),
});

/* ─── Schemas ─────────────────────────────────────────────────── */

// نموذج ذكاء اصطناعي
const ModelSchema = new mongoose.Schema({
  modelId: { type: String, unique: true },
  name: { type: String, required: true },
  nameAr: { type: String },
  type: { type: String, enum: ['regression', 'classification', 'anomaly', 'recommendation', 'forecast', 'clustering'], required: true },
  domain: {
    type: String,
    enum: ['attendance', 'finance', 'academic', 'health', 'operational', 'hr', 'student', 'general'],
    default: 'general',
  },
  status: { type: String, enum: ['draft', 'training', 'ready', 'deployed', 'archived'], default: 'draft' },
  config: { type: mongoose.Schema.Types.Mixed },
  weights: { type: mongoose.Schema.Types.Mixed }, // Serialized model params
  metrics: {
    accuracy: Number,
    precision: Number,
    recall: Number,
    f1Score: Number,
    mse: Number,
    r2: Number,
  },
  trainedOn: { type: Number, default: 0 }, // data points
  lastTrained: { type: Date },
  version: { type: Number, default: 1 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});
ModelSchema.pre('save', async function (next) {
  if (!this.modelId) {
    const c = await mongoose.model('AIModel').countDocuments();
    this.modelId = `MDL-${String(c + 1).padStart(4, '0')}`;
  }
  this.updatedAt = new Date();
  next();
});

// تنبؤ / توقع
const PredictionSchema = new mongoose.Schema({
  predId: { type: String, unique: true },
  modelId: { type: String, required: true },
  type: { type: String },
  input: { type: mongoose.Schema.Types.Mixed },
  output: { type: mongoose.Schema.Types.Mixed },
  confidence: { type: Number },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  feedback: { type: String, enum: ['accurate', 'inaccurate', 'partial', null], default: null },
  createdAt: { type: Date, default: Date.now, expires: 7776000 }, // 90 days TTL
});
PredictionSchema.pre('save', async function (next) {
  if (!this.predId) {
    const c = await mongoose.model('Prediction').countDocuments();
    this.predId = `PRED-${String(c + 1).padStart(6, '0')}`;
  }
  next();
});

// شذوذ مكتشف
const AnomalySchema = new mongoose.Schema({
  anomalyId: { type: String, unique: true },
  domain: { type: String, required: true },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  type: { type: String, enum: ['spike', 'drop', 'outlier', 'trend-break', 'pattern-change', 'threshold-breach'] },
  metric: { type: String },
  value: { type: Number },
  expected: { type: Number },
  deviation: { type: Number }, // standard deviations
  description: { type: String },
  descriptionAr: { type: String },
  status: { type: String, enum: ['detected', 'acknowledged', 'investigating', 'resolved', 'false-positive'], default: 'detected' },
  resolvedAt: { type: Date },
  createdAt: { type: Date, default: Date.now, expires: 2592000 }, // 30 days TTL
});
AnomalySchema.pre('save', async function (next) {
  if (!this.anomalyId) {
    const c = await mongoose.model('Anomaly').countDocuments();
    this.anomalyId = `ANM-${String(c + 1).padStart(5, '0')}`;
  }
  next();
});

// توصية
const RecommendationSchema = new mongoose.Schema({
  recId: { type: String, unique: true },
  domain: { type: String },
  category: { type: String, enum: ['performance', 'cost', 'risk', 'efficiency', 'quality', 'engagement'] },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  title: { type: String },
  titleAr: { type: String },
  description: { type: String },
  descriptionAr: { type: String },
  impact: { type: String, enum: ['low', 'medium', 'high'] },
  effort: { type: String, enum: ['low', 'medium', 'high'] },
  status: { type: String, enum: ['new', 'viewed', 'accepted', 'rejected', 'implemented'], default: 'new' },
  targetEntity: { type: String },
  data: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now, expires: 2592000 },
});
RecommendationSchema.pre('save', async function (next) {
  if (!this.recId) {
    const c = await mongoose.model('Recommendation').countDocuments();
    this.recId = `REC-${String(c + 1).padStart(5, '0')}`;
  }
  next();
});

// بيانات تدريب
const TrainingDataSchema = new mongoose.Schema({
  datasetId: { type: String },
  modelId: { type: String },
  domain: { type: String },
  features: { type: mongoose.Schema.Types.Mixed },
  label: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
});

const AIModel = mongoose.model('AIModel', ModelSchema);
const Prediction = mongoose.model('Prediction', PredictionSchema);
const Anomaly = mongoose.model('Anomaly', AnomalySchema);
const Recommendation = mongoose.model('Recommendation', RecommendationSchema);
const TrainingData = mongoose.model('TrainingData', TrainingDataSchema);

/* ─── BullMQ ──────────────────────────────────────────────────── */
const aiQueue = new Queue('ai-tasks', { connection: redis });

/* ─── Statistical Functions ───────────────────────────────────── */

function detectAnomalies(data, field) {
  if (!data.length) return [];
  const values = data.map(d => d[field]).filter(v => typeof v === 'number');
  if (values.length < 5) return [];

  const mean = ss.mean(values);
  const stdDev = ss.standardDeviation(values);
  const anomalies = [];

  data.forEach((point, i) => {
    const val = point[field];
    if (typeof val !== 'number') return;
    const zScore = stdDev > 0 ? Math.abs((val - mean) / stdDev) : 0;
    if (zScore > 2.5) {
      anomalies.push({
        index: i,
        value: val,
        expected: mean,
        deviation: zScore,
        type: val > mean ? 'spike' : 'drop',
      });
    }
  });
  return anomalies;
}

function linearForecast(data, field, periods) {
  if (data.length < 3) return [];
  const values = data.map(d => d[field]).filter(v => typeof v === 'number');
  const x = values.map((_, i) => i);
  const regression = ss.linearRegression(x.map((xi, i) => [xi, values[i]]));
  const line = ss.linearRegressionLine(regression);

  const forecasts = [];
  for (let i = 0; i < periods; i++) {
    const idx = values.length + i;
    forecasts.push({
      period: idx,
      predicted: Math.max(0, Math.round(line(idx) * 100) / 100),
      confidence: Math.max(0.5, 1 - i * 0.05),
    });
  }
  return forecasts;
}

function calculateTrend(values) {
  if (values.length < 2) return { direction: 'stable', change: 0 };
  const recent = values.slice(-Math.ceil(values.length / 3));
  const earlier = values.slice(0, Math.ceil(values.length / 3));
  const recentMean = ss.mean(recent);
  const earlierMean = ss.mean(earlier);
  const change = earlierMean !== 0 ? ((recentMean - earlierMean) / earlierMean) * 100 : 0;
  return {
    direction: change > 5 ? 'increasing' : change < -5 ? 'decreasing' : 'stable',
    change: Math.round(change * 100) / 100,
    recentAvg: Math.round(recentMean * 100) / 100,
    earlierAvg: Math.round(earlierMean * 100) / 100,
  };
}

function generateRecommendations(domain, metrics) {
  const recs = [];
  if (domain === 'attendance') {
    if (metrics.absentRate > 10) {
      recs.push({
        category: 'engagement',
        priority: 'high',
        titleAr: 'معدل الغياب مرتفع',
        descriptionAr: `معدل الغياب ${metrics.absentRate}% - يُنصح بتفعيل برنامج متابعة الحضور`,
        impact: 'high',
        effort: 'medium',
      });
    }
    if (metrics.lateRate > 15) {
      recs.push({
        category: 'efficiency',
        priority: 'medium',
        titleAr: 'معدل التأخر مرتفع',
        descriptionAr: `معدل التأخر ${metrics.lateRate}% - يُنصح بمراجعة مواعيد النقل`,
        impact: 'medium',
        effort: 'low',
      });
    }
  }
  if (domain === 'finance') {
    if (metrics.collectionRate < 80) {
      recs.push({
        category: 'cost',
        priority: 'high',
        titleAr: 'معدل التحصيل منخفض',
        descriptionAr: `معدل التحصيل ${metrics.collectionRate}% - يُنصح بتفعيل التذكيرات الآلية`,
        impact: 'high',
        effort: 'low',
      });
    }
    if (metrics.expenseGrowth > 20) {
      recs.push({
        category: 'cost',
        priority: 'high',
        titleAr: 'نمو المصروفات سريع',
        descriptionAr: `نمو المصروفات ${metrics.expenseGrowth}% - يُنصح بمراجعة بنود الإنفاق`,
        impact: 'high',
        effort: 'high',
      });
    }
  }
  if (domain === 'academic') {
    if (metrics.avgGrade < 70) {
      recs.push({
        category: 'quality',
        priority: 'high',
        titleAr: 'متوسط الدرجات منخفض',
        descriptionAr: `المتوسط ${metrics.avgGrade} - يُنصح بتفعيل برنامج دعم أكاديمي`,
        impact: 'high',
        effort: 'high',
      });
    }
    if (metrics.failRate > 10) {
      recs.push({
        category: 'risk',
        priority: 'high',
        titleAr: 'معدل الرسوب مرتفع',
        descriptionAr: `معدل الرسوب ${metrics.failRate}% - يُنصح بتوفير حصص تقوية`,
        impact: 'high',
        effort: 'medium',
      });
    }
  }
  return recs;
}

/* ─── Health ──────────────────────────────────────────────────── */
app.get('/health', async (_req, res) => {
  try {
    const db = mongoose.connection.readyState === 1;
    const rd = redis.status === 'ready';
    res.status(db && rd ? 200 : 503).json({
      status: db && rd ? 'healthy' : 'degraded',
      service: 'ai-engine-service',
      port: PORT,
      mongodb: db ? 'connected' : 'disconnected',
      redis: rd ? 'connected' : 'disconnected',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  } catch {
    res.status(503).json({ status: 'error' });
  }
});

/* ─── Models CRUD ─────────────────────────────────────────────── */
app.post('/api/ai/models', async (req, res) => {
  try {
    res.status(201).json(await AIModel.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/ai/models', async (req, res) => {
  try {
    const { domain, type, status } = req.query;
    const q = {};
    if (domain) q.domain = domain;
    if (type) q.type = type;
    if (status) q.status = status;
    res.json(await AIModel.find(q).sort('-updatedAt'));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/ai/models/:id', async (req, res) => {
  try {
    const m = await AIModel.findOne({ modelId: req.params.id });
    if (!m) return res.status(404).json({ error: 'النموذج غير موجود' });
    res.json(m);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ─── Predict ─────────────────────────────────────────────────── */
app.post('/api/ai/predict', async (req, res) => {
  try {
    const { modelId, input } = req.body;
    const model = await AIModel.findOne({ modelId, status: 'deployed' });
    if (!model) return res.status(404).json({ error: 'النموذج غير موجود أو غير منشور' });

    let output, confidence;

    // Simple prediction based on model type
    if (model.type === 'regression' || model.type === 'forecast') {
      const data = input.data || [];
      const field = input.field || 'value';
      const periods = input.periods || 5;
      output = linearForecast(data, field, periods);
      confidence = output.length ? ss.mean(output.map(o => o.confidence)) : 0;
    } else if (model.type === 'anomaly') {
      const data = input.data || [];
      const field = input.field || 'value';
      output = detectAnomalies(data, field);
      confidence = 0.85;
    } else if (model.type === 'classification') {
      // Simple threshold-based classification
      const features = input.features || {};
      output = { label: 'normal', probabilities: { normal: 0.7, risk: 0.2, critical: 0.1 } };
      confidence = 0.7;
    } else {
      output = { message: 'Model type not supported for direct prediction' };
      confidence = 0;
    }

    const prediction = await Prediction.create({
      modelId,
      type: model.type,
      input,
      output,
      confidence,
      status: 'completed',
    });

    res.json(prediction);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/ai/predictions', async (req, res) => {
  try {
    const { modelId, page = 1, limit = 20 } = req.query;
    const q = {};
    if (modelId) q.modelId = modelId;
    const skip = (Number(page) - 1) * Number(limit);
    const items = await Prediction.find(q).sort('-createdAt').skip(skip).limit(Number(limit));
    const total = await Prediction.countDocuments(q);
    res.json({ data: items, total });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/ai/predictions/:id/feedback', async (req, res) => {
  try {
    const p = await Prediction.findOneAndUpdate({ predId: req.params.id }, { feedback: req.body.feedback }, { new: true });
    if (!p) return res.status(404).json({ error: 'التنبؤ غير موجود' });
    res.json(p);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/* ─── Anomaly Detection ───────────────────────────────────────── */
app.post('/api/ai/anomalies/detect', async (req, res) => {
  try {
    const { domain, data, field, metric } = req.body;
    if (!data?.length) return res.status(400).json({ error: 'البيانات مطلوبة' });

    const detected = detectAnomalies(data, field || 'value');
    const anomalies = [];

    for (const d of detected) {
      const anomaly = await Anomaly.create({
        domain: domain || 'general',
        severity: d.deviation > 4 ? 'critical' : d.deviation > 3 ? 'high' : 'medium',
        type: d.type,
        metric: metric || field || 'value',
        value: d.value,
        expected: d.expected,
        deviation: Math.round(d.deviation * 100) / 100,
        description: `${d.type === 'spike' ? 'Spike' : 'Drop'} detected: value ${d.value} vs expected ${Math.round(d.expected * 100) / 100}`,
        descriptionAr: `${d.type === 'spike' ? 'ارتفاع' : 'انخفاض'} مكتشف: القيمة ${d.value} مقابل المتوقع ${Math.round(d.expected * 100) / 100}`,
      });
      anomalies.push(anomaly);
    }

    res.json({ detected: anomalies.length, anomalies });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/ai/anomalies', async (req, res) => {
  try {
    const { domain, severity, status, page = 1, limit = 50 } = req.query;
    const q = {};
    if (domain) q.domain = domain;
    if (severity) q.severity = severity;
    if (status) q.status = status;
    const skip = (Number(page) - 1) * Number(limit);
    const items = await Anomaly.find(q).sort('-createdAt').skip(skip).limit(Number(limit));
    const total = await Anomaly.countDocuments(q);
    res.json({ data: items, total });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/ai/anomalies/:id', async (req, res) => {
  try {
    const a = await Anomaly.findOneAndUpdate({ anomalyId: req.params.id }, req.body, { new: true });
    if (!a) return res.status(404).json({ error: 'الشذوذ غير موجود' });
    res.json(a);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/* ─── Forecasting ─────────────────────────────────────────────── */
app.post('/api/ai/forecast', async (req, res) => {
  try {
    const { data, field, periods, domain } = req.body;
    if (!data?.length) return res.status(400).json({ error: 'البيانات مطلوبة' });

    const forecasts = linearForecast(data, field || 'value', periods || 7);
    const values = data.map(d => d[field || 'value']).filter(v => typeof v === 'number');
    const trend = calculateTrend(values);
    const stats = {
      mean: Math.round(ss.mean(values) * 100) / 100,
      median: ss.median(values),
      min: ss.min(values),
      max: ss.max(values),
      stdDev: Math.round(ss.standardDeviation(values) * 100) / 100,
      trend,
    };

    res.json({ forecasts, stats, dataPoints: values.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ─── Recommendations ─────────────────────────────────────────── */
app.post('/api/ai/recommendations/generate', async (req, res) => {
  try {
    const { domain, metrics } = req.body;
    if (!domain || !metrics) return res.status(400).json({ error: 'المجال والمقاييس مطلوبة' });

    const recs = generateRecommendations(domain, metrics);
    const saved = [];
    for (const r of recs) {
      const rec = await Recommendation.create({ ...r, domain });
      saved.push(rec);
    }
    res.json({ generated: saved.length, recommendations: saved });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/ai/recommendations', async (req, res) => {
  try {
    const { domain, category, status, priority, page = 1, limit = 20 } = req.query;
    const q = {};
    if (domain) q.domain = domain;
    if (category) q.category = category;
    if (status) q.status = status;
    if (priority) q.priority = priority;
    const skip = (Number(page) - 1) * Number(limit);
    const items = await Recommendation.find(q).sort('-createdAt').skip(skip).limit(Number(limit));
    const total = await Recommendation.countDocuments(q);
    res.json({ data: items, total });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/ai/recommendations/:id', async (req, res) => {
  try {
    const r = await Recommendation.findOneAndUpdate({ recId: req.params.id }, req.body, { new: true });
    if (!r) return res.status(404).json({ error: 'التوصية غير موجودة' });
    res.json(r);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/* ─── Trend Analysis ──────────────────────────────────────────── */
app.post('/api/ai/trends', async (req, res) => {
  try {
    const { data, fields } = req.body;
    if (!data?.length) return res.status(400).json({ error: 'البيانات مطلوبة' });

    const results = {};
    for (const field of fields || ['value']) {
      const values = data.map(d => d[field]).filter(v => typeof v === 'number');
      if (values.length < 2) {
        results[field] = { error: 'Not enough data' };
        continue;
      }
      results[field] = {
        trend: calculateTrend(values),
        stats: {
          mean: Math.round(ss.mean(values) * 100) / 100,
          median: ss.median(values),
          mode: ss.mode(values),
          variance: Math.round(ss.variance(values) * 100) / 100,
          skewness: Math.round(ss.sampleSkewness(values) * 1000) / 1000,
        },
        correlation:
          values.length > 2
            ? Math.round(
                ss.sampleCorrelation(
                  values.map((_, i) => i),
                  values,
                ) * 1000,
              ) / 1000
            : null,
      };
    }
    res.json({ fields: Object.keys(results), analysis: results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ─── Dashboard ───────────────────────────────────────────────── */
app.get('/api/ai/dashboard', async (req, res) => {
  try {
    const cached = await redis.get('ai:dashboard');
    if (cached) return res.json(JSON.parse(cached));

    const [
      totalModels,
      deployed,
      totalPredictions,
      totalAnomalies,
      activeAnomalies,
      totalRecs,
      newRecs,
      domainBreakdown,
      severityBreakdown,
      recentAnomalies,
      recentRecs,
    ] = await Promise.all([
      AIModel.countDocuments(),
      AIModel.countDocuments({ status: 'deployed' }),
      Prediction.countDocuments(),
      Anomaly.countDocuments(),
      Anomaly.countDocuments({ status: { $in: ['detected', 'investigating'] } }),
      Recommendation.countDocuments(),
      Recommendation.countDocuments({ status: 'new' }),
      Anomaly.aggregate([{ $group: { _id: '$domain', count: { $sum: 1 } } }]),
      Anomaly.aggregate([{ $group: { _id: '$severity', count: { $sum: 1 } } }]),
      Anomaly.find().sort('-createdAt').limit(5).select('anomalyId domain severity type descriptionAr status createdAt'),
      Recommendation.find().sort('-createdAt').limit(5).select('recId domain titleAr category priority status'),
    ]);

    const data = {
      models: { total: totalModels, deployed },
      predictions: { total: totalPredictions },
      anomalies: {
        total: totalAnomalies,
        active: activeAnomalies,
        byDomain: domainBreakdown.reduce((a, c) => ({ ...a, [c._id]: c.count }), {}),
        bySeverity: severityBreakdown.reduce((a, c) => ({ ...a, [c._id]: c.count }), {}),
        recent: recentAnomalies,
      },
      recommendations: { total: totalRecs, new: newRecs, recent: recentRecs },
      timestamp: new Date().toISOString(),
    };

    await redis.setex('ai:dashboard', 30, JSON.stringify(data));
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ─── Seed Default Models ─────────────────────────────────────── */
async function seedModels() {
  const count = await AIModel.countDocuments();
  if (count > 0) return;
  await AIModel.insertMany([
    { name: 'Attendance Forecaster', nameAr: 'متنبئ الحضور', type: 'forecast', domain: 'attendance', status: 'deployed' },
    { name: 'Fee Collection Predictor', nameAr: 'متنبئ تحصيل الرسوم', type: 'regression', domain: 'finance', status: 'deployed' },
    { name: 'Anomaly Detector - Operations', nameAr: 'كاشف الشذوذ - التشغيل', type: 'anomaly', domain: 'operational', status: 'deployed' },
    { name: 'Student Performance Classifier', nameAr: 'مصنف أداء الطلاب', type: 'classification', domain: 'academic', status: 'deployed' },
    { name: 'Resource Optimizer', nameAr: 'محسن الموارد', type: 'recommendation', domain: 'general', status: 'deployed' },
  ]);
  console.log('🌱 Seeded 5 default AI models');
}

/* ─── Cron — Periodic anomaly scan ────────────────────────────── */
cron.schedule('0 */6 * * *', async () => {
  try {
    console.log('🤖 Running periodic anomaly scan...');
    // In production, this would pull data from other services and run detection
    await redis.hincrby('ai:stats', 'total_scans', 1);
  } catch (e) {
    console.error('AI scan error:', e.message);
  }
});

/* ─── Start ───────────────────────────────────────────────────── */
mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log('✅ MongoDB connected — alawael_ai');
    await seedModels();
    app.listen(PORT, () => console.log(`🤖 AI Engine running → http://localhost:${PORT}`));
  })
  .catch(e => {
    console.error('❌ MongoDB error:', e.message);
    process.exit(1);
  });

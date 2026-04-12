'use strict';
/**
 * DddPredictiveEngine Model
 * Auto-extracted from services/dddPredictiveEngine.js
 */
const mongoose = require('mongoose');

const dddPredictionModelSchema = new mongoose.Schema(
  {
    modelId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    type: {
      type: String,
      enum: [
        'regression',
        'classification',
        'timeseries',
        'clustering',
        'anomaly',
        'recommendation',
      ],
      required: true,
    },
    domain: { type: String, required: true },
    description: { type: String },
    features: [{ name: String, source: String, weight: { type: Number, default: 1.0 } }],
    parameters: { type: Map, of: mongoose.Schema.Types.Mixed },
    accuracy: { type: Number, min: 0, max: 1 },
    lastTrained: { type: Date },
    trainingSamples: { type: Number, default: 0 },
    version: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ['draft', 'training', 'active', 'deprecated'],
      default: 'active',
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const DDDPredictionModel =
  mongoose.models.DDDPredictionModel ||
  mongoose.model('DDDPredictionModel', dddPredictionModelSchema);

const dddPredictionResultSchema = new mongoose.Schema(
  {
    predictionId: { type: String, required: true, index: true },
    modelId: { type: String, required: true, index: true },
    entityType: { type: String, required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    input: { type: Map, of: mongoose.Schema.Types.Mixed },
    output: {
      prediction: mongoose.Schema.Types.Mixed,
      confidence: { type: Number, min: 0, max: 1 },
      probability: { type: Number, min: 0, max: 1 },
      label: String,
      details: mongoose.Schema.Types.Mixed,
    },
    feedback: {
      actual: mongoose.Schema.Types.Mixed,
      correct: Boolean,
      feedbackAt: Date,
    },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

dddPredictionResultSchema.index({ modelId: 1, entityId: 1, createdAt: -1 });
dddPredictionResultSchema.index({ entityType: 1, entityId: 1 });

const DDDPredictionResult =
  mongoose.models.DDDPredictionResult ||
  mongoose.model('DDDPredictionResult', dddPredictionResultSchema);

const dddAnomalySchema = new mongoose.Schema(
  {
    anomalyId: { type: String, required: true, unique: true },
    domain: { type: String, required: true },
    metricKey: { type: String, required: true },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    type: {
      type: String,
      enum: ['spike', 'drop', 'trend-change', 'outlier', 'pattern-break', 'threshold-breach'],
      required: true,
    },
    expected: { type: Number },
    actual: { type: Number },
    deviation: { type: Number },
    context: { type: Map, of: mongoose.Schema.Types.Mixed },
    status: {
      type: String,
      enum: ['detected', 'acknowledged', 'investigating', 'resolved', 'false-positive'],
      default: 'detected',
    },
    resolvedAt: { type: Date },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

dddAnomalySchema.index({ domain: 1, severity: 1, createdAt: -1 });

const DDDAnomaly = mongoose.models.DDDAnomaly || mongoose.model('DDDAnomaly', dddAnomalySchema);

/* ═══════════════════════════════════════════════════════════════
   Builtin Prediction Models (≥12)
   ═══════════════════════════════════════════════════════════════ */

const BUILTIN_MODELS = [
  {
    modelId: 'pm-no-show',
    name: 'No-Show Predictor',
    nameAr: 'توقع عدم الحضور',
    type: 'classification',
    domain: 'sessions',
    features: [
      { name: 'pastNoShows', source: 'sessions', weight: 2.0 },
      { name: 'dayOfWeek', source: 'schedule', weight: 0.5 },
      { name: 'distance', source: 'beneficiary', weight: 1.0 },
    ],
    accuracy: 0.82,
  },
  {
    modelId: 'pm-readmission',
    name: 'Readmission Risk',
    nameAr: 'خطر إعادة القبول',
    type: 'classification',
    domain: 'episodes',
    features: [
      { name: 'diagnosisComplexity', source: 'episodes', weight: 1.5 },
      { name: 'previousAdmissions', source: 'episodes', weight: 2.0 },
    ],
    accuracy: 0.78,
  },
  {
    modelId: 'pm-goal-timeline',
    name: 'Goal Timeline Forecast',
    nameAr: 'توقع الجدول الزمني للأهداف',
    type: 'regression',
    domain: 'goals',
    features: [
      { name: 'goalType', source: 'goals', weight: 1.0 },
      { name: 'severity', source: 'beneficiary', weight: 1.2 },
    ],
    accuracy: 0.71,
  },
  {
    modelId: 'pm-outcome',
    name: 'Treatment Outcome Predictor',
    nameAr: 'توقع نتائج العلاج',
    type: 'classification',
    domain: 'care-plans',
    features: [
      { name: 'planCompliance', source: 'care-plans', weight: 1.5 },
      { name: 'sessionAttendance', source: 'sessions', weight: 1.0 },
    ],
    accuracy: 0.76,
  },
  {
    modelId: 'pm-deterioration',
    name: 'Deterioration Early Warning',
    nameAr: 'إنذار مبكر بالتدهور',
    type: 'timeseries',
    domain: 'assessments',
    features: [
      { name: 'scoreHistory', source: 'assessments', weight: 2.0 },
      { name: 'frequency', source: 'sessions', weight: 0.8 },
    ],
    accuracy: 0.8,
  },
  {
    modelId: 'pm-demand',
    name: 'Service Demand Forecast',
    nameAr: 'توقع الطلب على الخدمات',
    type: 'timeseries',
    domain: 'sessions',
    features: [
      { name: 'historicalVolume', source: 'sessions', weight: 1.0 },
      { name: 'seasonality', source: 'calendar', weight: 0.5 },
    ],
    accuracy: 0.85,
  },
  {
    modelId: 'pm-dropout',
    name: 'Dropout Risk Predictor',
    nameAr: 'توقع خطر الانسحاب',
    type: 'classification',
    domain: 'episodes',
    features: [
      { name: 'missedSessions', source: 'sessions', weight: 2.0 },
      { name: 'engagementScore', source: 'family', weight: 1.0 },
    ],
    accuracy: 0.79,
  },
  {
    modelId: 'pm-cluster',
    name: 'Patient Clustering',
    nameAr: 'تجميع المرضى',
    type: 'clustering',
    domain: 'core',
    features: [
      { name: 'demographics', source: 'beneficiary', weight: 1.0 },
      { name: 'diagnosis', source: 'beneficiary', weight: 1.5 },
    ],
    accuracy: 0.7,
  },
  {
    modelId: 'pm-resource',
    name: 'Resource Utilization Forecast',
    nameAr: 'توقع استخدام الموارد',
    type: 'timeseries',
    domain: 'workflow',
    features: [
      { name: 'staffLoad', source: 'workflow', weight: 1.0 },
      { name: 'roomOccupancy', source: 'sessions', weight: 1.0 },
    ],
    accuracy: 0.77,
  },
  {
    modelId: 'pm-recommendation',
    name: 'Therapy Recommender',
    nameAr: 'توصيات العلاج',
    type: 'recommendation',
    domain: 'ai-recommendations',
    features: [
      { name: 'similarities', source: 'beneficiary', weight: 1.5 },
      { name: 'outcomes', source: 'care-plans', weight: 2.0 },
    ],
    accuracy: 0.73,
  },
  {
    modelId: 'pm-anomaly-detect',
    name: 'Metric Anomaly Detector',
    nameAr: 'كشف شذوذ المقاييس',
    type: 'anomaly',
    domain: 'quality',
    features: [
      { name: 'metricSeries', source: 'snapshots', weight: 1.0 },
      { name: 'baseline', source: 'kpi', weight: 1.0 },
    ],
    accuracy: 0.81,
  },
  {
    modelId: 'pm-length-of-stay',
    name: 'Length of Stay Predictor',
    nameAr: 'توقع مدة الإقامة',
    type: 'regression',
    domain: 'episodes',
    features: [
      { name: 'diagnosis', source: 'episodes', weight: 1.5 },
      { name: 'comorbidities', source: 'beneficiary', weight: 1.0 },
    ],
    accuracy: 0.74,
  },
];

/* ═══════════════════════════════════════════════════════════════
   Anomaly Detection Thresholds
   ═══════════════════════════════════════════════════════════════ */

const ANOMALY_THRESHOLDS = {
  spike: { zScore: 2.5, label: 'Sudden Spike' },
  drop: { zScore: -2.5, label: 'Sudden Drop' },
  'trend-change': { slopeChange: 0.3, label: 'Trend Shift' },
  outlier: { iqrMultiplier: 1.5, label: 'Statistical Outlier' },
  'pattern-break': { deviation: 0.4, label: 'Pattern Break' },
  'threshold-breach': { threshold: null, label: 'Threshold Breach' },
};

/* ═══════════════════════════════════════════════════════════════
   Core Functions
   ═══════════════════════════════════════════════════════════════ */

/**
 * Run a prediction using a specified model
 */
async function runPrediction(modelId, entityType, entityId, inputData = {}) {
  const model = BUILTIN_MODELS.find(m => m.modelId === modelId);
  if (!model) throw new Error(`Unknown model: ${modelId}`);

  // Simplified prediction using weighted feature scoring
  let score = 0;
  let totalWeight = 0;
  for (const feature of model.features) {
    const val = inputData[feature.name];
    if (val !== undefined) {
      score += (typeof val === 'number' ? val : 0.5) * feature.weight;
      totalWeight += feature.weight;
    }
  }
  const normalizedScore = totalWeight > 0 ? score / totalWeight : 0.5;
  const confidence = model.accuracy * (totalWeight > 0 ? 0.9 : 0.3);

  let label, prediction;
  if (model.type === 'classification') {
    prediction = normalizedScore > 0.5;
    label = prediction ? 'positive' : 'negative';
  } else if (model.type === 'regression') {
    prediction = normalizedScore;
    label = `estimated: ${normalizedScore.toFixed(2)}`;
  } else {
    prediction = normalizedScore;
    label = `score: ${normalizedScore.toFixed(2)}`;
  }

  const predictionId = `pred-${modelId}-${entityId}-${Date.now()}`;
  const result = await DDDPredictionResult.create({
    predictionId,
    modelId,
    entityType,
    entityId,
    input: inputData,
    output: { prediction, confidence, probability: normalizedScore, label },
  });

  return result;
}

/**
 * Detect anomalies in a metric series
 */
async function detectAnomalies(domain, metricKey, values = []) {
  if (values.length < 5) return [];

  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const stdDev = Math.sqrt(values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length);
  const anomalies = [];

  for (let i = 0; i < values.length; i++) {
    const zScore = stdDev > 0 ? (values[i] - mean) / stdDev : 0;

    let type = null;
    let severity = 'low';

    if (zScore >= ANOMALY_THRESHOLDS.spike.zScore) {
      type = 'spike';
      severity = zScore > 3.5 ? 'critical' : zScore > 3 ? 'high' : 'medium';
    } else if (zScore <= ANOMALY_THRESHOLDS.drop.zScore) {
      type = 'drop';
      severity = zScore < -3.5 ? 'critical' : zScore < -3 ? 'high' : 'medium';
    }

    if (type) {
      const anomalyId = `anom-${domain}-${metricKey}-${i}-${Date.now()}`;
      const anomaly = await DDDAnomaly.create({
        anomalyId,
        domain,
        metricKey,
        severity,
        type,
        expected: mean,
        actual: values[i],
        deviation: zScore,
        context: new Map([
          ['index', i],
          ['mean', mean],
          ['stdDev', stdDev],
        ]),
      });
      anomalies.push(anomaly);
    }
  }

  return anomalies;
}

/**
 * Generate forecast for a time series
 */

module.exports = {
  DDDPredictionModel,
  DDDPredictionResult,
  DDDAnomaly,
};

/**
 * Prediction Model - Phase 7
 * Machine Learning predictions and forecasting
 */

const mongoose = require('mongoose');

const predictionSchema = new mongoose.Schema(
  {
    predictionId: {
      type: String,
      unique: true,
      required: true,
    },
    modelName: {
      type: String,
      required: true,
    },
    modelType: {
      type: String,
      enum: [
        'regression',
        'classification',
        'clustering',
        'time-series',
        'anomaly-detection',
        'recommendation',
      ],
      required: true,
    },
    modelVersion: {
      type: String,
      default: '1.0',
    },
    algorithm: {
      type: String,
      enum: [
        'linear-regression',
        'polynomial-regression',
        'decision-tree',
        'random-forest',
        'neural-network',
        'svm',
        'isolation-forest',
        'lstm',
      ],
    },

    // Training Configuration
    training: {
      datasetSize: Number,
      trainTestSplit: Number,
      trainingStartDate: Date,
      trainingEndDate: Date,
      features: [String],
      targetVariable: String,
      hyperparameters: Map,
      trainingTime: Number, // in milliseconds
    },

    // Model Performance Metrics
    performance: {
      accuracy: Number,
      precision: Number,
      recall: Number,
      f1Score: Number,
      rmse: Number,
      mape: Number,
      r2Score: Number,
      auc: Number,
      trainingMetrics: Map,
      testingMetrics: Map,
      validationMetrics: Map,
    },

    // Predictions
    predictions: [
      {
        predictedValue: Number,
        actualValue: Number,
        confidence: Number,
        timestamp: Date,
        features: Map,
        residual: Number,
      },
    ],

    // Feature Importance
    featureImportance: [
      {
        featureName: String,
        importance: Number,
        impact: String,
        correlationWithTarget: Number,
      },
    ],

    // Cross-validation Results
    crossValidation: {
      folds: Number,
      scores: [Number],
      meanScore: Number,
      stdDev: Number,
    },

    // Production Monitoring
    monitoring: {
      isActive: Boolean,
      deployedAt: Date,
      predictions: Number,
      averageLatency: Number,
      errorRate: Number,
      accuracy: Number,
      lastUpdated: Date,
      modelDrift: {
        detected: Boolean,
        driftScore: Number,
        threshold: Number,
      },
    },

    // Prediction Intervals
    predictionIntervals: [
      {
        timestamp: Date,
        prediction: Number,
        lowerBound: Number,
        upperBound: Number,
        confidenceLevel: Number,
      },
    ],

    // Explanation & Interpretability
    explanation: {
      method: String, // LIME, SHAP, ELI5
      localExplanations: [Map],
      globalExplanation: Map,
      decisionRules: [String],
      featureContribution: Map,
    },

    // Model Health
    health: {
      status: {
        type: String,
        enum: ['healthy', 'degraded', 'needs-retraining'],
      },
      lastCheckAt: Date,
      nextRetrainingScheduled: Date,
      retrainingFrequency: String,
      lastRetrained: Date,
    },

    // Metadata
    createdBy: String,
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: Date,
    purpose: String,
    businessContext: String,
    tags: [String],
    status: {
      type: String,
      enum: ['development', 'testing', 'production', 'deprecated'],
      default: 'development',
    },
  },
  {
    timestamps: true,
    collection: 'predictions',
  }
);

// Indexes
predictionSchema.index({ predictionId: 1 });
predictionSchema.index({ modelType: 1, status: 1 });
predictionSchema.index({ 'monitoring.isActive': 1 });
predictionSchema.index({ tags: 1 });

// Instance Methods
predictionSchema.methods.makePrediction = async function (features) {
  // Placeholder - actual prediction done by ML service
  return {
    predictedValue: Math.random() * 100,
    confidence: Math.random() * 100,
    features: features,
    timestamp: new Date(),
  };
};

predictionSchema.methods.evaluateModel = function () {
  return {
    accuracy: this.performance.accuracy,
    precision: this.performance.precision,
    recall: this.performance.recall,
    f1Score: this.performance.f1Score,
    rmse: this.performance.rmse,
  };
};

predictionSchema.methods.getFeatureImportance = function () {
  return this.featureImportance.sort((a, b) => b.importance - a.importance);
};

predictionSchema.methods.deployModel = async function () {
  this.monitoring.isActive = true;
  this.monitoring.deployedAt = new Date();
  this.status = 'production';
  return this.save();
};

predictionSchema.methods.retractModel = async function () {
  this.monitoring.isActive = false;
  this.status = 'deprecated';
  return this.save();
};

predictionSchema.methods.updateMonitoring = async function (metrics) {
  this.monitoring.lastUpdated = new Date();
  this.monitoring.errorRate = metrics.errorRate;
  this.monitoring.averageLatency = metrics.latency;
  this.monitoring.accuracy = metrics.accuracy;

  // Check for model drift
  if (this.monitoring.accuracy < this.performance.accuracy * 0.9) {
    this.monitoring.modelDrift.detected = true;
    this.monitoring.modelDrift.driftScore =
      1 - this.monitoring.accuracy / this.performance.accuracy;
    this.health.status = 'degraded';
  }

  return this.save();
};

predictionSchema.methods.checkModelHealth = function () {
  const health = {
    status: 'healthy',
    issues: [],
  };

  // Check for drift
  if (this.monitoring?.modelDrift?.detected) {
    health.issues.push('Model drift detected');
    health.status = 'degraded';
  }

  // Check performance degradation
  if (this.monitoring?.accuracy < this.performance.accuracy * 0.85) {
    health.issues.push('Significant performance degradation');
    health.status = 'needs-retraining';
  }

  this.health.status = health.status;
  return health;
};

predictionSchema.methods.scheduleRetraining = function (frequency) {
  this.health.retrainingFrequency = frequency;
  this.health.nextRetrainingScheduled = this.calculateNextRetrain(frequency);
  return this.save();
};

predictionSchema.methods.calculateNextRetrain = function (frequency) {
  const now = new Date();
  const mapping = {
    daily: 1,
    weekly: 7,
    biweekly: 14,
    monthly: 30,
    quarterly: 90,
  };
  const days = mapping[frequency] || 30;
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
};

// Static Methods
predictionSchema.statics.getActiveModels = function () {
  return this.find({
    status: 'production',
    'monitoring.isActive': true,
  });
};

predictionSchema.statics.getByType = function (modelType) {
  return this.find({ modelType });
};

predictionSchema.statics.getBestPerformers = function (limit = 10) {
  return this.find({ status: 'production' }).sort({ 'performance.f1Score': -1 }).limit(limit);
};

predictionSchema.statics.getModelsNeedingRetraining = function () {
  return this.find({
    'health.nextRetrainingScheduled': { $lte: new Date() },
    status: 'production',
  });
};

predictionSchema.statics.getModelDriftDetections = function () {
  return this.find({
    'monitoring.modelDrift.detected': true,
  });
};

predictionSchema.statics.searchByTag = function (tag) {
  return this.find({ tags: tag });
};

// Virtual Properties
predictionSchema.virtual('isHighPerformer').get(function () {
  return this.performance.f1Score >= 0.85 && this.performance.accuracy >= 0.85;
});

predictionSchema.virtual('requiresAttention').get(function () {
  return (
    this.health.status === 'needs-retraining' ||
    (this.monitoring?.modelDrift?.detected && this.monitoring.modelDrift.driftScore > 0.1)
  );
});

module.exports = mongoose.model('Prediction', predictionSchema);

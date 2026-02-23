const mongoose = require('mongoose');

const maintenancePredictionSchema = new mongoose.Schema({
  // Core
  assetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asset',
    required: true,
    index: true
  },
  predictionType: {
    type: String,
    enum: ['failure', 'maintenance-needed', 'replacement', 'deprecation'],
    required: true,
    index: true
  },

  // Prediction Data
  predictedDate: {
    type: Date,
    required: true,
    index: -1
  },
  confidence: {
    type: Number,
    min: 0,
    max: 100,
    required: true
  },
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    index: true
  },
  reason: String,

  // Analysis Details
  indicators: [{
    name: String,
    value: String,
    threshold: String,
    status: String // normal, warning, critical
  }],
  historicalData: {
    failureCount: Number,
    averageInterval: String,
    lastMaintenanceDate: Date,
    usageHours: Number
  },

  // Recommendation
  recommendedAction: String,
  estimatedCost: Number,
  preventiveAction: String,
  urgency: {
    type: String,
    enum: ['low', 'medium', 'high', 'immediate'],
    default: 'medium'
  },

  // Tracking
  status: {
    type: String,
    enum: ['open', 'acknowledged', 'scheduled', 'resolved', 'ignored'],
    default: 'open',
    index: true
  },
  acknowledgedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  acknowledgedDate: Date,
  resolutionDate: Date,
  actualResult: String,

  // Algorithm & Model Info
  modelVersion: String,
  dataPoints: Number,
  lastUpdated: Date,

  // Metadata
  createdAt: {
    type: Date,
    default: Date.now,
    index: -1
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for common queries
maintenancePredictionSchema.index({ assetId: 1, status: 1 });
maintenancePredictionSchema.index({ riskLevel: 1, predictedDate: 1 });
maintenancePredictionSchema.index({ status: 1, urgency: 1 });
maintenancePredictionSchema.index({ predictionType: 1, status: 1 });

// Pre-save middleware
maintenancePredictionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('MaintenancePrediction', maintenancePredictionSchema);

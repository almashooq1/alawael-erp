/**
 * AiModelConfig Model — إعدادات نماذج الذكاء الاصطناعي
 * Prompt 20: AI & Predictive Analytics Module
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const aiModelConfigSchema = new Schema(
  {
    model_name: {
      type: String,
      unique: true,
      required: true,
    },
    model_type: {
      type: String,
      enum: [
        'ml_regression',
        'ml_classification',
        'llm_generation',
        'optimization',
        'nlp_analysis',
        'rule_based',
      ],
      required: true,
    },
    description_ar: {
      type: String,
      default: null,
    },
    description_en: {
      type: String,
      default: null,
    },
    parameters: {
      type: Schema.Types.Mixed,
      default: {},
    },
    feature_importance: {
      type: Schema.Types.Mixed,
      default: null,
    },
    accuracy_score: {
      type: Number,
      default: null,
      min: 0,
      max: 1,
    },
    precision_score: {
      type: Number,
      default: null,
      min: 0,
      max: 1,
    },
    recall_score: {
      type: Number,
      default: null,
      min: 0,
      max: 1,
    },
    f1_score: {
      type: Number,
      default: null,
      min: 0,
      max: 1,
    },
    performance_history: {
      type: [Schema.Types.Mixed],
      default: [],
    },
    training_data_count: {
      type: Number,
      default: 0,
    },
    last_trained_at: {
      type: Date,
      default: null,
    },
    last_evaluated_at: {
      type: Date,
      default: null,
    },
    version: {
      type: String,
      default: '1.0.0',
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    auto_retrain: {
      type: Boolean,
      default: false,
    },
    retrain_frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', null],
      default: null,
    },
    retrain_conditions: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Method: needs retraining
aiModelConfigSchema.methods.needsRetraining = function () {
  if (!this.auto_retrain || !this.retrain_frequency) return false;
  if (!this.last_trained_at) return true;

  const now = new Date();
  const lastTrained = new Date(this.last_trained_at);
  const diffMs = now - lastTrained;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  switch (this.retrain_frequency) {
    case 'daily':
      return diffDays >= 1;
    case 'weekly':
      return diffDays >= 7;
    case 'monthly':
      return diffDays >= 30;
    default:
      return false;
  }
};

// Method: record performance
aiModelConfigSchema.methods.recordPerformance = function () {
  const history = this.performance_history || [];
  history.push({
    version: this.version,
    accuracy: this.accuracy_score,
    precision: this.precision_score,
    recall: this.recall_score,
    f1: this.f1_score,
    training_count: this.training_data_count,
    date: new Date().toISOString().split('T')[0],
  });
  this.performance_history = history;
  return this.save();
};

module.exports = mongoose.model('AiModelConfig', aiModelConfigSchema);

/**
 * AiPrediction Model — نموذج التنبؤات بالذكاء الاصطناعي
 * Prompt 20: AI & Predictive Analytics Module
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const aiPredictionSchema = new Schema(
  {
    beneficiary_id: {
      type: Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
    },
    plan_id: {
      type: Schema.Types.ObjectId,
      ref: 'CarePlan',
      default: null,
    },
    prediction_type: {
      type: String,
      enum: ['progress', 'attendance', 'outcome', 'dropout_risk', 'plan_completion'],
      required: true,
    },
    prediction_scope: {
      type: String,
      enum: ['weekly', 'monthly', 'quarterly', 'plan_duration'],
      default: 'monthly',
    },
    predicted_value: {
      type: Number,
      required: true,
      min: 0,
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    actual_value: {
      type: Number,
      default: null,
    },
    deviation: {
      type: Number,
      default: null,
    },
    features_used: {
      type: Schema.Types.Mixed,
      default: null,
    },
    prediction_details: {
      type: Schema.Types.Mixed,
      default: null,
    },
    model_version: {
      type: String,
      required: true,
      default: 'rule_based_v1',
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'invalidated'],
      default: 'active',
    },
    prediction_date: {
      type: Date,
      required: true,
    },
    target_date: {
      type: Date,
      required: true,
    },
    validated_at: {
      type: Date,
      default: null,
    },
    branch_id: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
    },
    deleted_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Indexes
aiPredictionSchema.index({ beneficiary_id: 1, prediction_type: 1 });
aiPredictionSchema.index({ prediction_type: 1, status: 1 });
aiPredictionSchema.index({ target_date: 1, status: 1 });
aiPredictionSchema.index({ branch_id: 1 });
aiPredictionSchema.index({ deleted_at: 1 });

// Virtual: isAccurate
aiPredictionSchema.methods.isAccurate = function (tolerance = 0.1) {
  if (this.actual_value === null || this.actual_value === undefined) return null;
  return Math.abs(this.actual_value - this.predicted_value) <= tolerance;
};

// Method: validate prediction
aiPredictionSchema.methods.validatePrediction = function (actualValue) {
  this.actual_value = actualValue;
  this.deviation = actualValue - this.predicted_value;
  this.validated_at = new Date();
  this.status = 'expired';
  return this.save();
};

module.exports = mongoose.model('AiPrediction', aiPredictionSchema);

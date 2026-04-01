/**
 * AiSuggestion Model — نموذج الاقتراحات الذكية
 * Prompt 20: AI & Predictive Analytics Module
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const aiSuggestionSchema = new Schema(
  {
    target_type: {
      type: String,
      enum: ['treatment_plan', 'goal', 'session', 'schedule', 'assessment'],
      required: true,
    },
    target_id: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    beneficiary_id: {
      type: Schema.Types.ObjectId,
      ref: 'Beneficiary',
      default: null,
    },
    suggestion_type: {
      type: String,
      enum: [
        'goals',
        'session_count',
        'duration',
        'activities',
        'exercises',
        'schedule_optimization',
      ],
      required: true,
    },
    suggestion_category: {
      type: String,
      enum: ['treatment', 'scheduling', 'financial', 'administrative'],
      default: 'treatment',
    },
    content: {
      type: Schema.Types.Mixed,
      required: true,
    },
    reasoning: {
      type: Schema.Types.Mixed,
      default: null,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    confidence_score: {
      type: Number,
      default: 0,
      min: 0,
      max: 1,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'partially_accepted', 'expired'],
      default: 'pending',
    },
    reviewed_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewed_at: {
      type: Date,
      default: null,
    },
    review_notes: {
      type: String,
      default: null,
    },
    accepted_items: {
      type: Schema.Types.Mixed,
      default: null,
    },
    model_version: {
      type: String,
      default: null,
    },
    branch_id: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
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
aiSuggestionSchema.index({ target_type: 1, target_id: 1 });
aiSuggestionSchema.index({ beneficiary_id: 1, suggestion_type: 1 });
aiSuggestionSchema.index({ status: 1, suggestion_type: 1 });
aiSuggestionSchema.index({ branch_id: 1 });
aiSuggestionSchema.index({ deleted_at: 1 });

// Method: accept
aiSuggestionSchema.methods.accept = function (userId, acceptedItems = null, notes = null) {
  this.status = acceptedItems ? 'partially_accepted' : 'accepted';
  this.reviewed_by = userId;
  this.reviewed_at = new Date();
  this.accepted_items = acceptedItems;
  this.review_notes = notes;
  return this.save();
};

// Method: reject
aiSuggestionSchema.methods.reject = function (userId, reason) {
  this.status = 'rejected';
  this.reviewed_by = userId;
  this.reviewed_at = new Date();
  this.review_notes = reason;
  return this.save();
};

module.exports = mongoose.models.AiSuggestion || mongoose.model('AiSuggestion', aiSuggestionSchema);

/**
 * AiAlert Model — نموذج تنبيهات الذكاء الاصطناعي الاستباقية
 * Prompt 20: AI & Predictive Analytics Module
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const aiAlertSchema = new Schema(
  {
    alert_type: {
      type: String,
      enum: [
        'no_progress',
        'high_absence',
        'insurance_expiring',
        'vacant_slot',
        'caseload_limit',
        'performance_drop',
        'pattern_detected',
        'plan_review_needed',
        'session_anomaly',
        'financial_risk',
        'dropout_risk',
      ],
      required: true,
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'critical', 'urgent'],
      required: true,
    },
    target_type: {
      type: String,
      enum: ['beneficiary', 'specialist', 'branch', 'treatment_plan', 'appointment'],
      required: true,
    },
    target_id: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    message_ar: {
      type: String,
      required: true,
      maxlength: 500,
    },
    message_en: {
      type: String,
      required: true,
      maxlength: 500,
    },
    description_ar: {
      type: String,
      default: null,
    },
    description_en: {
      type: String,
      default: null,
    },
    data: {
      type: Schema.Types.Mixed,
      default: null,
    },
    suggested_actions: {
      type: [Schema.Types.Mixed],
      default: [],
    },
    is_read: {
      type: Boolean,
      default: false,
    },
    read_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    read_at: {
      type: Date,
      default: null,
    },
    action_taken: {
      type: String,
      default: null,
    },
    action_notes: {
      type: String,
      default: null,
    },
    actioned_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    actioned_at: {
      type: Date,
      default: null,
    },
    is_dismissed: {
      type: Boolean,
      default: false,
    },
    branch_id: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
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
aiAlertSchema.index({ alert_type: 1, severity: 1, is_read: 1 });
aiAlertSchema.index({ target_type: 1, target_id: 1 });
aiAlertSchema.index({ branch_id: 1, is_read: 1 });
aiAlertSchema.index({ created_at: 1 });
aiAlertSchema.index({ deleted_at: 1 });

// Virtual: severity color
aiAlertSchema.virtual('severity_color').get(function () {
  const colors = {
    info: 'blue',
    warning: 'yellow',
    critical: 'orange',
    urgent: 'red',
  };
  return colors[this.severity] || 'gray';
});

// Method: mark as read
aiAlertSchema.methods.markAsRead = function (userId) {
  this.is_read = true;
  this.read_by = userId;
  this.read_at = new Date();
  return this.save();
};

// Method: take action
aiAlertSchema.methods.takeAction = function (userId, action, notes = null) {
  this.action_taken = action;
  this.action_notes = notes;
  this.actioned_by = userId;
  this.actioned_at = new Date();
  if (!this.is_read) {
    this.is_read = true;
    this.read_by = userId;
    this.read_at = new Date();
  }
  return this.save();
};

// Method: dismiss
aiAlertSchema.methods.dismiss = function () {
  this.is_dismissed = true;
  return this.save();
};

module.exports = mongoose.model('AiAlert', aiAlertSchema);

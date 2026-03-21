/* eslint-disable no-unused-vars */
/**
 * ValidationRule Model
 * ظ‚ظˆط§ط¹ط¯ ط§ظ„طھط­ظ‚ظ‚ ظˆط§ظ„ط§ظ…طھط«ط§ظ„
 */

const mongoose = require('mongoose');

const validationRuleSchema = new mongoose.Schema(
  {
    ruleId: { type: String, required: true, unique: true },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Organization',
      index: true,
    },

    name: { type: String, required: true },

    type: {
      type: String,
      enum: ['financial', 'compliance', 'operational', 'data_quality', 'regulatory'],
      required: true,
      index: true,
    },

    category: String,

    condition: {
      field: String,
      operator: {
        type: String,
        enum: ['equals', 'notEquals', 'greaterThan', 'lessThan', 'contains', 'regex'],
      },
      value: mongoose.Schema.Types.Mixed,
      logicalOperator: { type: String, enum: ['and', 'or'], default: 'and' },
    },

    severity: { type: String, enum: ['info', 'warning', 'error', 'critical'], default: 'warning' },

    action: {
      type: String,
      enum: ['alert', 'block', 'flag', 'notify'],
      default: 'alert',
    },

    affectedEntities: [
      { type: String, enum: ['JournalEntry', 'CashFlow', 'RiskAssessment', 'FinancialReport'] },
    ],

    lastRunDate: Date,
    lastViolationCount: Number,

    isActive: { type: Boolean, default: true, index: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    modifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    version: { type: Number, default: 1 },
  },
  { timestamps: true, collection: 'validation_rules' }
);

validationRuleSchema.index({ type: 1, isActive: 1 });
validationRuleSchema.index({ severity: 1 });

validationRuleSchema.statics.getActiveRules = function (organizationId, type) {
  const query = { organizationId, isActive: true };
  if (type) query.type = type;
  return this.find(query);
};

module.exports = mongoose.model('ValidationRule', validationRuleSchema);

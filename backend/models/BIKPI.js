'use strict';
/**
 * BIKPI — Business Intelligence KPI model.
 *
 * Used exclusively by bi-dashboard.routes.js for BI-specific KPI CRUD.
 * Separate from the operational KPI model (models/KPI.js) so that BI
 * dashboards can carry fields (code, targetValue, thresholds as scalars,
 * dataSource, formula) that differ from the clinical KPI schema.
 */

const mongoose = require('mongoose');

const biKpiSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, maxlength: 500 },
    category: {
      type: String,
      enum: [
        'financial',
        'operational',
        'clinical',
        'hr',
        'quality',
        'safety',
        'customer',
        'strategic',
        'other',
      ],
      default: 'operational',
    },
    department: { type: String, trim: true, index: true },
    unit: { type: String, default: '%', maxlength: 30 },
    targetValue: { type: Number },
    currentValue: { type: Number, default: 0 },
    warningThreshold: { type: Number },
    criticalThreshold: { type: Number },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
      default: 'monthly',
    },
    dataSource: { type: String, maxlength: 200 },
    formula: { type: String, maxlength: 500 },
    isActive: { type: Boolean, default: true, index: true },
    status: {
      type: String,
      enum: ['on_track', 'at_risk', 'off_track', 'not_started'],
      default: 'not_started',
    },
    trend: { type: String, enum: ['up', 'down', 'stable', 'unknown'], default: 'unknown' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  },
  { timestamps: true }
);

biKpiSchema.index({ code: 1, isActive: 1 });
biKpiSchema.index({ category: 1, department: 1 });

module.exports = mongoose.models.BIKPI || mongoose.model('BIKPI', biKpiSchema);

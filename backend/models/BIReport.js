'use strict';
/**
 * BIReport — Business Intelligence saved report model.
 *
 * Stores report definitions (not the generated output) created via the
 * BI Dashboard builder. One row = one saved report configuration that
 * can be re-run, scheduled, or shared.
 */

const mongoose = require('mongoose');

const biReportSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, maxlength: 500 },
    type: {
      type: String,
      enum: ['standard', 'custom', 'scheduled', 'executive', 'operational', 'comparative'],
      default: 'standard',
    },
    category: {
      type: String,
      enum: ['financial', 'operational', 'clinical', 'hr', 'quality', 'strategic', 'other'],
      default: 'operational',
    },
    period: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom'],
      default: 'monthly',
    },
    startDate: { type: Date },
    endDate: { type: Date },
    modules: [{ type: String }],
    sections: { type: mongoose.Schema.Types.Mixed },
    filters: { type: mongoose.Schema.Types.Mixed },
    layout: { type: mongoose.Schema.Types.Mixed },
    isScheduled: { type: Boolean, default: false },
    scheduleConfig: { type: mongoose.Schema.Types.Mixed },
    isPublic: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['active', 'archived', 'draft'],
      default: 'active',
      index: true,
    },
    version: { type: Number, default: 1 },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  },
  { timestamps: true }
);

biReportSchema.index({ owner: 1, status: 1 });
biReportSchema.index({ isPublic: 1, status: 1 });

module.exports = mongoose.models.BIReport || mongoose.model('BIReport', biReportSchema);

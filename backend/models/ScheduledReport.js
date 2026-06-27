/**
 * ScheduledReport.js — Scheduled Report Model
 * ═══════════════════════════════════════════════════
 * Stores automated report schedules and execution history.
 */

'use strict';

const mongoose = require('mongoose');

const executionLogSchema = new mongoose.Schema(
  {
    runAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['running', 'success', 'failed', 'skipped'],
      default: 'running',
    },
    outputUrl: { type: String },
    errorMessage: { type: String },
    durationMs: { type: Number },
  },
  { _id: false }
);

const scheduledReportSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },

    // Template reference
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReportTemplate',
      required: true,
    },

    // Schedule config
    frequency: {
      type: String,
      enum: ['hourly', 'daily', 'weekly', 'monthly', 'quarterly', 'custom'],
      required: true,
    },
    cronExpression: { type: String }, // for custom
    dayOfWeek: { type: Number, min: 0, max: 6 }, // for weekly
    dayOfMonth: { type: Number, min: 1, max: 31 }, // for monthly
    hour: { type: Number, min: 0, max: 23, default: 0 },
    minute: { type: Number, min: 0, max: 59, default: 0 },
    timezone: { type: String, default: 'Asia/Riyadh' },

    // Filters applied at generation time
    filters: {
      dateRange: {
        from: Date,
        to: Date,
      },
      branch: String,
      department: String,
      beneficiary: String,
    },

    // Output config
    format: {
      type: String,
      enum: ['pdf', 'excel', 'csv', 'json'],
      default: 'pdf',
    },
    recipients: [{ type: String, trim: true }], // email addresses
    deliveryMethod: {
      type: String,
      enum: ['email', 'download', 'both'],
      default: 'email',
    },

    // Status
    isActive: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ['pending', 'running', 'paused', 'completed', 'error'],
      default: 'pending',
    },
    nextRunAt: { type: Date },
    lastRunAt: { type: Date },

    // Execution history (last 20 runs)
    executionLog: {
      type: [executionLogSchema],
      default: [],
    },

    // Ownership
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

scheduledReportSchema.index({ isActive: 1, nextRunAt: 1 });
scheduledReportSchema.index({ createdBy: 1, status: 1 });

module.exports = mongoose.model('ScheduledReport', scheduledReportSchema);

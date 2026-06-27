/**
 * ReportTemplate.js — نموذج قوالب التقارير (BI Report Templates)
 * ═══════════════════════════════════════════════════════════════
 * نموذج Mongoose لحفظ قوالب التقارير المخصصة في نظام التحليلات المتقدمة.
 *
 * القطاعات: clinical, financial, operational, hr, executive
 */

'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const ReportTemplateSchema = new Schema(
  {
    templateId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    category: {
      type: String,
      enum: ['clinical', 'financial', 'operational', 'hr', 'executive'],
      required: true,
      index: true,
    },
    dataSources: {
      type: [String],
      default: [],
      // أمثلة: 'Beneficiary', 'TherapySession', 'ICFAssessment', 'Invoice', 'Employee'
    },
    filters: [
      {
        field: { type: String, required: true },
        type: {
          type: String,
          enum: ['string', 'number', 'date', 'boolean', 'enum', 'range'],
          default: 'string',
        },
        label: { type: String, required: true },
        defaultValue: { type: String, default: '' },
        options: { type: [String], default: [] }, // لنوع enum
        required: { type: Boolean, default: false },
      },
    ],
    dimensions: [
      {
        field: { type: String, required: true },
        label: { type: String, required: true },
        dataType: {
          type: String,
          enum: ['string', 'date', 'number', 'category'],
          default: 'string',
        },
      },
    ],
    metrics: [
      {
        field: { type: String, required: true },
        label: { type: String, required: true },
        aggregation: {
          type: String,
          enum: ['sum', 'avg', 'count', 'min', 'max', 'distinct', 'none'],
          default: 'sum',
        },
        format: {
          type: String,
          enum: ['number', 'currency', 'percentage', 'decimal', 'integer'],
          default: 'number',
        },
        formula: { type: String, default: '' }, // صيغة حسابية اختيارية
      },
    ],
    chartType: {
      type: String,
      enum: ['table', 'bar', 'line', 'pie', 'radar', 'funnel', 'scatter'],
      default: 'table',
    },
    chartConfig: {
      // إعدادات إضافية للمخطط
      xAxisLabel: { type: String, default: '' },
      yAxisLabel: { type: String, default: '' },
      colorPalette: { type: [String], default: [] },
      showLegend: { type: Boolean, default: true },
      showDataLabels: { type: Boolean, default: false },
      stacked: { type: Boolean, default: false },
    },
    schedule: {
      enabled: { type: Boolean, default: false },
      frequency: {
        type: String,
        enum: ['once', 'hourly', 'daily', 'weekly', 'monthly', 'quarterly'],
        default: 'daily',
      },
      cronExpression: { type: String, default: '' },
      recipients: { type: [String], default: [] },
      lastRunAt: { type: Date, default: null },
      nextRunAt: { type: Date, default: null },
      runCount: { type: Number, default: 0 },
      lastRunStatus: {
        type: String,
        enum: ['success', 'failed', 'running', 'pending'],
        default: 'pending',
      },
      lastError: { type: String, default: '' },
    },
    isActive: { type: Boolean, default: true },
    isSystemTemplate: { type: Boolean, default: false },
    tags: { type: [String], default: [] },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // إعدادات الوصول
    visibility: {
      type: String,
      enum: ['private', 'team', 'organization', 'public'],
      default: 'organization',
    },
    allowedRoles: { type: [String], default: [] },
    allowedBranches: { type: [String], default: [] },
  },
  {
    timestamps: true,
    collection: 'report_templates',
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ───────────────────────────────────────────────────────
ReportTemplateSchema.index({ category: 1, isActive: 1 });
ReportTemplateSchema.index({ createdBy: 1, updatedAt: -1 });
ReportTemplateSchema.index({ tags: 1 });
ReportTemplateSchema.index({ 'schedule.enabled': 1, 'schedule.nextRunAt': 1 });
ReportTemplateSchema.index({ name: 'text', description: 'text', tags: 'text' });

// ── Virtuals ──────────────────────────────────────────────────────
ReportTemplateSchema.virtual('isScheduled').get(function () {
  return this.schedule && this.schedule.enabled;
});

ReportTemplateSchema.virtual('lastRunAgo').get(function () {
  if (!this.schedule || !this.schedule.lastRunAt) return null;
  const diff = Date.now() - this.schedule.lastRunAt.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'منذ دقائق';
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return `منذ ${days} يوم`;
});

// ── Static Methods ────────────────────────────────────────────────
ReportTemplateSchema.statics.findByCategory = function (category, options = {}) {
  const query = { category, isActive: true };
  if (options.visibility) query.visibility = { $in: ['public', 'organization', ...(options.team ? ['team'] : [])] };
  return this.find(query).sort({ updatedAt: -1 }).lean();
};

ReportTemplateSchema.statics.findScheduled = function () {
  return this.find({
    'schedule.enabled': true,
    isActive: true,
  }).sort({ 'schedule.nextRunAt': 1 }).lean();
};

ReportTemplateSchema.statics.findDueForRun = function () {
  return this.find({
    'schedule.enabled': true,
    'schedule.nextRunAt': { $lte: new Date() },
    isActive: true,
  }).lean();
};

// ── Instance Methods ──────────────────────────────────────────────
ReportTemplateSchema.methods.calculateNextRun = function () {
  const now = new Date();
  const freq = this.schedule.frequency;
  let next = new Date(now);

  switch (freq) {
    case 'hourly':
      next.setHours(now.getHours() + 1, 0, 0, 0);
      break;
    case 'daily':
      next.setDate(now.getDate() + 1);
      next.setHours(6, 0, 0, 0);
      break;
    case 'weekly':
      next.setDate(now.getDate() + 7);
      next.setHours(6, 0, 0, 0);
      break;
    case 'monthly':
      next.setMonth(now.getMonth() + 1);
      next.setDate(1);
      next.setHours(6, 0, 0, 0);
      break;
    case 'quarterly':
      next.setMonth(now.getMonth() + 3);
      next.setDate(1);
      next.setHours(6, 0, 0, 0);
      break;
    default:
      next = null;
  }
  return next;
};

ReportTemplateSchema.methods.recordRun = async function (status, error = '') {
  this.schedule.lastRunAt = new Date();
  this.schedule.lastRunStatus = status;
  this.schedule.lastError = error;
  this.schedule.runCount = (this.schedule.runCount || 0) + 1;
  if (status === 'success' && this.schedule.frequency !== 'once') {
    this.schedule.nextRunAt = this.calculateNextRun();
  }
  await this.save();
};

// ── Middleware ────────────────────────────────────────────────────
ReportTemplateSchema.pre('save', function (next) {
  if (this.schedule && this.schedule.enabled && !this.schedule.nextRunAt) {
    this.schedule.nextRunAt = this.calculateNextRun();
  }
  next();
});

module.exports = mongoose.model('ReportTemplate', ReportTemplateSchema);

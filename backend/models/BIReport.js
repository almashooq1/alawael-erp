/**
 * BI Report Model — نموذج تقارير ذكاء الأعمال
 *
 * Stores saved report definitions, scheduled reports,
 * and dashboard widget configurations.
 */

const mongoose = require('mongoose');

// ── Widget Schema (أداة لوحة التحكم) ──────────────────────────────
const widgetSchema = new mongoose.Schema(
  {
    widgetId: { type: String, required: true },
    type: {
      type: String,
      enum: ['kpi', 'line', 'bar', 'pie', 'donut', 'area', 'radar', 'table', 'heatmap', 'gauge'],
      required: true,
    },
    title: { type: String, required: true },
    titleAr: { type: String },
    dataSource: {
      type: String,
      enum: [
        'finance',
        'hr',
        'clinical',
        'beneficiaries',
        'supply_chain',
        'fleet',
        'operations',
        'attendance',
        'sessions',
        'complaints',
        'custom',
      ],
      required: true,
    },
    metric: { type: String, required: true },
    aggregation: {
      type: String,
      enum: ['count', 'sum', 'avg', 'min', 'max', 'distinct'],
      default: 'count',
    },
    filters: { type: mongoose.Schema.Types.Mixed, default: {} },
    groupBy: { type: String },
    sortBy: { type: String },
    sortOrder: { type: String, enum: ['asc', 'desc'], default: 'desc' },
    limit: { type: Number, default: 10 },
    colors: [{ type: String }],
    position: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
      w: { type: Number, default: 4 },
      h: { type: Number, default: 3 },
    },
    refreshInterval: { type: Number, default: 300 },
  },
  { _id: false }
);

// ── Schedule Schema (جدول التقارير) ───────────────────────────────
const scheduleSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly'],
      default: 'weekly',
    },
    dayOfWeek: { type: Number, min: 0, max: 6 },
    dayOfMonth: { type: Number, min: 1, max: 28 },
    time: { type: String, default: '08:00' },
    recipients: [{ type: String }],
    format: { type: String, enum: ['pdf', 'excel', 'csv'], default: 'pdf' },
    lastRun: { type: Date },
    nextRun: { type: Date },
  },
  { _id: false }
);

// ── Main BI Report Schema ─────────────────────────────────────────
const biReportSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    nameAr: { type: String, trim: true },
    description: { type: String },
    descriptionAr: { type: String },
    type: {
      type: String,
      enum: ['dashboard', 'report', 'scorecard', 'custom'],
      default: 'dashboard',
    },
    category: {
      type: String,
      enum: [
        'executive',
        'finance',
        'hr',
        'clinical',
        'operations',
        'compliance',
        'performance',
        'custom',
      ],
      default: 'executive',
    },
    widgets: [widgetSchema],
    schedule: scheduleSchema,
    filters: {
      dateRange: {
        start: { type: Date },
        end: { type: Date },
        preset: {
          type: String,
          enum: ['today', 'week', 'month', 'quarter', 'year', 'custom'],
        },
      },
      departments: [{ type: String }],
      branches: [{ type: String }],
    },
    isDefault: { type: Boolean, default: false },
    isPublic: { type: Boolean, default: false },
    isFavorite: { type: Boolean, default: false },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    tags: [{ type: String }],
    version: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ['draft', 'active', 'archived'],
      default: 'active',
    },
  },
  {
    timestamps: true,
    collection: 'bi_reports',
  }
);

// ── Indexes ───────────────────────────────────────────────────────
biReportSchema.index({ owner: 1, status: 1 });
biReportSchema.index({ category: 1, status: 1 });
biReportSchema.index({ isDefault: 1 });
biReportSchema.index({ tags: 1 });
biReportSchema.index({ createdAt: -1 });

module.exports = mongoose.models.BIReport || mongoose.model('BIReport', biReportSchema);

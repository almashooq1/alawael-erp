/**
 * BI KPI Definition Model — نموذج تعريف مؤشرات الأداء
 *
 * Stores KPI definitions with targets, thresholds,
 * historical snapshots, and alert configurations.
 */

const mongoose = require('mongoose');

// ── Threshold Schema (عتبات الأداء) ──────────────────────────────
const thresholdSchema = new mongoose.Schema(
  {
    excellent: { type: Number },
    good: { type: Number },
    warning: { type: Number },
    critical: { type: Number },
  },
  { _id: false }
);

// ── Snapshot Schema (لقطة تاريخية) ───────────────────────────────
const snapshotSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    value: { type: Number, required: true },
    target: { type: Number },
    achievement: { type: Number },
  },
  { _id: false }
);

// ── Main KPI Definition Schema ────────────────────────────────────
const biKPISchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    nameAr: { type: String, required: true, trim: true },
    description: { type: String },
    descriptionAr: { type: String },
    category: {
      type: String,
      enum: [
        'financial',
        'operational',
        'hr',
        'clinical',
        'satisfaction',
        'compliance',
        'growth',
        'efficiency',
      ],
      required: true,
    },
    unit: {
      type: String,
      enum: ['number', 'percentage', 'currency', 'ratio', 'days', 'hours'],
      default: 'number',
    },
    direction: {
      type: String,
      enum: ['higher_is_better', 'lower_is_better', 'target'],
      default: 'higher_is_better',
    },
    dataSource: {
      model: { type: String, required: true },
      field: { type: String, required: true },
      aggregation: {
        type: String,
        enum: ['count', 'sum', 'avg', 'min', 'max', 'ratio'],
        default: 'count',
      },
      filter: { type: mongoose.Schema.Types.Mixed, default: {} },
      denominatorModel: { type: String },
      denominatorField: { type: String },
      denominatorFilter: { type: mongoose.Schema.Types.Mixed },
    },
    target: {
      monthly: { type: Number },
      quarterly: { type: Number },
      yearly: { type: Number },
    },
    thresholds: thresholdSchema,
    currentValue: { type: Number, default: 0 },
    previousValue: { type: Number, default: 0 },
    trend: {
      type: String,
      enum: ['up', 'down', 'stable'],
      default: 'stable',
    },
    trendPercentage: { type: Number, default: 0 },
    history: [snapshotSchema],
    alertEnabled: { type: Boolean, default: false },
    alertRecipients: [{ type: String }],
    refreshInterval: {
      type: String,
      enum: ['realtime', 'hourly', 'daily', 'weekly'],
      default: 'daily',
    },
    lastCalculated: { type: Date },
    department: { type: String },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    icon: { type: String },
    color: { type: String },
  },
  {
    timestamps: true,
    collection: 'bi_kpis',
  }
);

// ── Indexes ───────────────────────────────────────────────────────
biKPISchema.index({ category: 1, isActive: 1 });
biKPISchema.index({ department: 1 });
biKPISchema.index({ sortOrder: 1 });
biKPISchema.index({ lastCalculated: 1 });

module.exports = mongoose.models.BIKPI || mongoose.model('BIKPI', biKPISchema);

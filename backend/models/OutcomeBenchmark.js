'use strict';

/**
 * OutcomeBenchmark — W486 (Phase G: Equity Engine).
 *
 * National + branch-level reference benchmarks for outcome metrics —
 * used as the "reference cohort" in disparity audits and as the
 * "target" in branch quarterly equity dashboards.
 *
 * Sources:
 *   • National Saudi Disability Authority publications (annual)
 *   • CARF International benchmarks (where applicable)
 *   • Aggregated cross-branch national average (computed quarterly)
 *
 * Per v3 §6 Innovation 8.
 */

const mongoose = require('mongoose');

const OutcomeBenchmarkSchema = new mongoose.Schema(
  {
    // Scope of this benchmark
    scope: {
      type: String,
      enum: ['national', 'regional', 'branch', 'carf', 'da_publication'],
      required: true,
      index: true,
    },
    region: { type: String, maxlength: 100 }, // for scope='regional'
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' }, // for scope='branch'

    // What metric
    metricKind: {
      type: String,
      enum: [
        'gas_avg_tscore',
        'icf_avg_qualifier',
        'session_attendance_rate',
        'goal_achievement_rate',
        'wait_time_days',
        'complaint_rate',
        'wbci_avg',
      ],
      required: true,
      index: true,
    },

    // Optional dimension breakdown (e.g. benchmark for gender=F, age_band=6-12)
    dimensionFilters: {
      gender: { type: String, enum: ['M', 'F'] },
      age_band: { type: String, enum: ['0-3', '3-6', '6-12', '12-18', '18+'] },
      disability_type: { type: String, maxlength: 100 },
    },

    // The benchmark value(s)
    centralTendency: { type: Number, required: true }, // mean / median
    centralTendencyKind: {
      type: String,
      enum: ['mean', 'median'],
      default: 'mean',
    },
    standardDeviation: { type: Number, min: 0 },
    percentile25: { type: Number },
    percentile75: { type: Number },

    // Targets (e.g. national target "session_attendance_rate >= 0.85")
    targetValue: { type: Number },
    targetDirection: {
      type: String,
      enum: ['higher_better', 'lower_better'],
      default: 'higher_better',
    },

    // Period this benchmark covers
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },

    // Source metadata
    sourceCitation: { type: String, maxlength: 500 },
    sourceUrl: { type: String, maxlength: 500 },
    sampleSize: { type: Number, min: 1 },

    // Lifecycle
    status: {
      type: String,
      enum: ['draft', 'published', 'retired'],
      default: 'draft',
      index: true,
    },
    publishedAt: { type: Date },
    retiredAt: { type: Date },
    notes: { type: String, maxlength: 2000 },
  },
  {
    timestamps: true,
    collection: 'outcome_benchmarks',
  }
);

OutcomeBenchmarkSchema.index({ scope: 1, metricKind: 1, periodStart: -1 });
OutcomeBenchmarkSchema.index(
  { scope: 1, metricKind: 1, periodStart: 1, periodEnd: 1, region: 1, branchId: 1 },
  { unique: false }
);

// Wave-18 invariants
OutcomeBenchmarkSchema.pre('save', function (next) {
  if (this.periodStart && this.periodEnd && this.periodStart >= this.periodEnd) {
    return next(new Error('OutcomeBenchmark: periodStart must be before periodEnd'));
  }
  if (this.scope === 'branch' && !this.branchId) {
    return next(new Error('OutcomeBenchmark: scope=branch requires branchId'));
  }
  if (this.scope === 'regional' && !this.region) {
    return next(new Error('OutcomeBenchmark: scope=regional requires region'));
  }
  if (this.status === 'published' && !this.publishedAt) this.publishedAt = new Date();
  if (this.status === 'retired' && !this.retiredAt) this.retiredAt = new Date();
  if (
    this.percentile25 !== undefined &&
    this.percentile75 !== undefined &&
    this.percentile25 > this.percentile75
  ) {
    return next(new Error('OutcomeBenchmark: percentile25 must be <= percentile75'));
  }
  next();
});

module.exports =
  mongoose.models.OutcomeBenchmark || mongoose.model('OutcomeBenchmark', OutcomeBenchmarkSchema);

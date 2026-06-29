/**
 * PageSpeedMetric.js
 * نموذج تخزين نتائج PageSpeed Insights API
 */

const mongoose = require('mongoose');

const CrUXMetricSchema = new mongoose.Schema(
  {
    percentile: Number,
    distributions: [
      {
        min: Number,
        max: Number,
        proportion: Number,
      },
    ],
    category: {
      type: String,
      enum: ['FAST', 'AVERAGE', 'SLOW', 'GOOD', 'NEEDS_IMPROVEMENT', 'POOR', 'UNKNOWN'],
    },
  },
  { _id: false }
);

const PageSpeedMetricSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
      index: true,
    },

    strategy: {
      type: String,
      enum: ['mobile', 'desktop'],
      default: 'mobile',
      index: true,
    },

    // Lighthouse scores من PSI
    lighthouseScores: {
      performance: Number,
      accessibility: Number,
      bestPractices: Number,
      seo: Number,
      pwa: Number,
    },

    // Lighthouse metrics من PSI
    lighthouseMetrics: {
      'first-contentful-paint': Number,
      'largest-contentful-paint': Number,
      'speed-index': Number,
      'total-blocking-time': Number,
      'cumulative-layout-shift': Number,
      interactive: Number,
      'server-response-time': Number,
    },

    // CrUX field data
    fieldData: {
      largest_contentful_paint: CrUXMetricSchema,
      first_input_delay: CrUXMetricSchema,
      cumulative_layout_shift: CrUXMetricSchema,
      first_contentful_paint: CrUXMetricSchema,
      interaction_to_next_paint: CrUXMetricSchema,
      experimental_time_to_first_byte: CrUXMetricSchema,
    },

    // originLoadingExperience
    originSummary: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // API metadata
    apiResponseTimeMs: Number,
    psiVersion: String,
    analysisUTCTimestamp: String,

    status: {
      type: String,
      enum: ['success', 'failed', 'partial'],
      default: 'success',
      index: true,
    },

    errorMessage: String,

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    fetchedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// فهارس
PageSpeedMetricSchema.index({ url: 1, strategy: 1, fetchedAt: -1 });
PageSpeedMetricSchema.index({ status: 1, fetchedAt: -1 });

// TTL: احتفظ بالبيانات لمدة 180 يومًا
PageSpeedMetricSchema.index({ fetchedAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });

module.exports = mongoose.model('PageSpeedMetric', PageSpeedMetricSchema);

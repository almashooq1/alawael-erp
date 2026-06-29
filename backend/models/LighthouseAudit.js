/**
 * LighthouseAudit.js
 * نموذج تخزين نتائج تقارير Lighthouse
 */

const mongoose = require('mongoose');

const LighthouseScoreSchema = new mongoose.Schema(
  {
    performance: { type: Number, min: 0, max: 100 },
    accessibility: { type: Number, min: 0, max: 100 },
    bestPractices: { type: Number, min: 0, max: 100 },
    seo: { type: Number, min: 0, max: 100 },
    pwa: { type: Number, min: 0, max: 100 },
  },
  { _id: false }
);

const LighthouseMetricSchema = new mongoose.Schema(
  {
    'first-contentful-paint': { value: Number, score: Number },
    'largest-contentful-paint': { value: Number, score: Number },
    'speed-index': { value: Number, score: Number },
    'total-blocking-time': { value: Number, score: Number },
    'cumulative-layout-shift': { value: Number, score: Number },
    interactive: { value: Number, score: Number },
    'server-response-time': { value: Number, score: Number },
    'max-potential-fid': { value: Number, score: Number },
  },
  { _id: false }
);

const LighthouseAuditSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
      index: true,
    },

    // استراتيجية التدقيق: mobile | desktop
    strategy: {
      type: String,
      enum: ['mobile', 'desktop'],
      default: 'mobile',
      index: true,
    },

    // النتائج الإجمالية
    scores: {
      type: LighthouseScoreSchema,
      default: {},
    },

    // المقاييس التفصيلية
    metrics: {
      type: LighthouseMetricSchema,
      default: {},
    },

    // التحذيرات والفرص
    opportunities: [
      {
        title: String,
        description: String,
        score: Number,
        savings: Number,
        savingsUnit: String,
      },
    ],

    diagnostics: [
      {
        title: String,
        description: String,
        score: Number,
      },
    ],

    // معلومات التشغيل
    runtimeError: {
      message: String,
      code: String,
    },

    durationMs: {
      type: Number,
    },

    chromeVersion: {
      type: String,
    },

    lighthouseVersion: {
      type: String,
    },

    // الحالة
    status: {
      type: String,
      enum: ['success', 'failed', 'partial'],
      default: 'success',
      index: true,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    auditedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// فهارس
LighthouseAuditSchema.index({ url: 1, strategy: 1, auditedAt: -1 });
LighthouseAuditSchema.index({ status: 1, auditedAt: -1 });
LighthouseAuditSchema.index({ 'scores.performance': 1, auditedAt: -1 });

// TTL: احتفظ بالتقارير لمدة 180 يومًا
LighthouseAuditSchema.index({ auditedAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });

module.exports = mongoose.model('LighthouseAudit', LighthouseAuditSchema);

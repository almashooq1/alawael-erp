/**
 * PerformanceBudget.js
 * نموذج إعدادات ميزانية الأداء
 */

const mongoose = require('mongoose');

const PerformanceBudgetSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      default: 'default',
    },

    enabled: {
      type: Boolean,
      default: true,
    },

    // عتبات Web Vitals (بالمللي ثانية، ما عدا CLS)
    thresholds: {
      LCP: { type: Number, default: 2500 },
      INP: { type: Number, default: 200 },
      CLS: { type: Number, default: 0.1 },
      FCP: { type: Number, default: 1800 },
      TTFB: { type: Number, default: 800 },
      TBT: { type: Number, default: 200 },
      TTI: { type: Number, default: 3800 },
    },

    // عتبات Lighthouse scores
    lighthouseScores: {
      performance: { type: Number, default: 90, min: 0, max: 100 },
      accessibility: { type: Number, default: 90, min: 0, max: 100 },
      bestPractices: { type: Number, default: 90, min: 0, max: 100 },
      seo: { type: Number, default: 90, min: 0, max: 100 },
      pwa: { type: Number, default: 70, min: 0, max: 100 },
    },

    // عتبات الموارد
    resourceBudget: {
      maxJsSizeKb: { type: Number, default: 500 },
      maxCssSizeKb: { type: Number, default: 100 },
      maxImageSizeKb: { type: Number, default: 1000 },
      maxTotalRequests: { type: Number, default: 80 },
      maxTransferSizeKb: { type: Number, default: 2500 },
    },

    // الصفحات المراقبة
    monitoredUrls: [
      {
        url: { type: String, required: true },
        strategy: { type: String, enum: ['mobile', 'desktop'], default: 'mobile' },
        enabled: { type: Boolean, default: true },
      },
    ],

    // إعدادات التنبيه
    alerting: {
      enabled: { type: Boolean, default: true },
      emailNotifications: { type: Boolean, default: false },
      webhookUrl: { type: String },
      minSeverity: {
        type: String,
        enum: ['info', 'warning', 'critical'],
        default: 'warning',
      },
    },

    // من أنشأ/عدّل
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('PerformanceBudget', PerformanceBudgetSchema);

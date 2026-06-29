/**
 * WebVitalMetric.js
 * نموذج تخزين مقاييس Web Vitals من المستخدمين الحقيقيين (RUM)
 */

const mongoose = require('mongoose');

const WebVitalMetricSchema = new mongoose.Schema(
  {
    // نوع المقياس: CLS, INP, FCP, LCP, TTFB, FID, TBT, TTI, custom
    name: {
      type: String,
      required: true,
      index: true,
      enum: ['CLS', 'INP', 'FID', 'FCP', 'LCP', 'TTFB', 'TBT', 'TTI', 'FP', 'FSP', 'custom'],
    },

    // قيمة المقياس
    value: {
      type: Number,
      required: true,
    },

    // تقييم المقياس: good, needs-improvement, poor
    rating: {
      type: String,
      enum: ['good', 'needs-improvement', 'poor', 'unknown'],
      default: 'unknown',
      index: true,
    },

    // الصفحة التي تم قياسها
    pageUrl: {
      type: String,
      required: true,
      index: true,
    },

    // مسار الصفحة (pathname)
    pagePath: {
      type: String,
      required: true,
      index: true,
    },

    // معلومات الجلسة
    sessionId: {
      type: String,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },

    // معلومات المتصفح والجهاز
    userAgent: {
      type: String,
    },
    deviceType: {
      type: String,
      enum: ['mobile', 'tablet', 'desktop', 'unknown'],
      default: 'unknown',
      index: true,
    },
    connectionType: {
      type: String,
    },

    // إضافات
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // وقت حدوث القياس (من المتصفح)
    measuredAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// فهارس مركبة لتحسين أداء الاستعلامات
WebVitalMetricSchema.index({ name: 1, measuredAt: -1 });
WebVitalMetricSchema.index({ pagePath: 1, name: 1, measuredAt: -1 });
WebVitalMetricSchema.index({ rating: 1, name: 1, measuredAt: -1 });
WebVitalMetricSchema.index({ deviceType: 1, name: 1, measuredAt: -1 });

// TTL index: احتفظ بالبيانات لمدة 90 يومًا
WebVitalMetricSchema.index({ measuredAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// مساعدة لتصنيف المقياس
WebVitalMetricSchema.statics.getRating = function getRating(name, value) {
  const thresholds = {
    CLS: { good: 0.1, poor: 0.25 },
    INP: { good: 200, poor: 500 },
    FID: { good: 100, poor: 300 },
    FCP: { good: 1800, poor: 3000 },
    LCP: { good: 2500, poor: 4000 },
    TTFB: { good: 800, poor: 1800 },
    TBT: { good: 200, poor: 600 },
    TTI: { good: 3800, poor: 7300 },
  };

  const t = thresholds[name];
  if (!t || value === undefined || value === null) return 'unknown';

  if (value <= t.good) return 'good';
  if (value <= t.poor) return 'needs-improvement';
  return 'poor';
};

module.exports = mongoose.model('WebVitalMetric', WebVitalMetricSchema);

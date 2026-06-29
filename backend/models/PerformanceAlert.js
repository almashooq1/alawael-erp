/**
 * PerformanceAlert.js
 * نموذج تنبيهات الأداء
 */

const mongoose = require('mongoose');

const PerformanceAlertSchema = new mongoose.Schema(
  {
    // نوع التنبيه
    type: {
      type: String,
      required: true,
      index: true,
      enum: [
        'web-vital',
        'lighthouse-score',
        'lighthouse-audit-failed',
        'pagespeed-api-failed',
        'resource-budget',
        'backend-latency',
        'backend-error-rate',
        'custom',
      ],
    },

    // مستوى الخطورة
    severity: {
      type: String,
      required: true,
      index: true,
      enum: ['info', 'warning', 'critical'],
    },

    // العنوان والوصف
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },

    // المقياس المرتبط
    metricName: {
      type: String,
      index: true,
    },
    metricValue: Number,
    threshold: Number,

    // الصفحة/الرابط
    pageUrl: String,
    pagePath: String,

    // المصدر
    source: {
      type: String,
      enum: ['rum', 'lighthouse', 'pagespeed', 'backend', 'budget', 'system'],
      default: 'system',
    },

    // الحالة
    status: {
      type: String,
      enum: ['open', 'acknowledged', 'resolved', 'ignored'],
      default: 'open',
      index: true,
    },

    // من أقر/حل
    acknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    acknowledgedAt: Date,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    resolvedAt: Date,

    // معلومات إضافية
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // وقت حدوث المشكلة
    triggeredAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// فهارس
PerformanceAlertSchema.index({ type: 1, severity: 1, status: 1 });
PerformanceAlertSchema.index({ triggeredAt: -1 });
PerformanceAlertSchema.index({ status: 1, triggeredAt: -1 });

// TTL: احتفظ بالتنبيهات المغلقة لمدة 90 يومًا
PerformanceAlertSchema.index(
  { status: 1, triggeredAt: 1 },
  {
    partialFilterExpression: { status: { $in: ['resolved', 'ignored'] } },
    expireAfterSeconds: 90 * 24 * 60 * 60,
  }
);

module.exports = mongoose.model('PerformanceAlert', PerformanceAlertSchema);

/**
 * performanceMetric.service.js
 * خدمة تجميع مقاييس الأداء للوحة التحكم
 */

const WebVitalMetric = require('../models/WebVitalMetric');
const LighthouseAudit = require('../models/LighthouseAudit');
const PageSpeedMetric = require('../models/PageSpeedMetric');
const PerformanceAlert = require('../models/PerformanceAlert');
const { getCurrentBudget } = require('./performanceAlert.service');
const logger = require('../utils/logger');

/**
 * الحصول على ملخص لوحة تحكم الأداء
 */
async function getDashboardSummary({ startDate, endDate } = {}) {
  const dateFilter = {};
  if (startDate || endDate) {
    dateFilter.$gte = startDate ? new Date(startDate) : undefined;
    dateFilter.$lte = endDate ? new Date(endDate) : undefined;
  }

  const matchFilter = Object.keys(dateFilter).length > 0 ? { measuredAt: dateFilter } : {};

  let webVitalsOverview = [];
  try {
    webVitalsOverview = await WebVitalMetric.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$name',
          avg: { $avg: '$value' },
          count: { $sum: 1 },
          good: { $sum: { $cond: [{ $eq: ['$rating', 'good'] }, 1, 0] } },
          poor: { $sum: { $cond: [{ $eq: ['$rating', 'poor'] }, 1, 0] } },
        },
      },
    ]);
  } catch (err) {
    logger.warn('Dashboard web vitals aggregation failed:', err.message);
  }

  const [latestLighthouse, latestPageSpeed, openAlerts, budget, recentWebVitals] =
    await Promise.all([
      LighthouseAudit.find({ status: 'success' })
        .sort({ auditedAt: -1 })
        .limit(10)
        .lean()
        .catch(() => []),

      PageSpeedMetric.find({ status: 'success' })
        .sort({ fetchedAt: -1 })
        .limit(10)
        .lean()
        .catch(() => []),

      PerformanceAlert.find({ status: 'open' })
        .sort({ triggeredAt: -1 })
        .limit(10)
        .lean()
        .catch(() => []),

      getCurrentBudget().catch(() => null),

      WebVitalMetric.find(matchFilter)
        .sort({ measuredAt: -1 })
        .limit(5)
        .lean()
        .catch(() => []),
    ]);

  return {
    webVitals: webVitalsOverview.map(item => ({
      name: item._id,
      avg: Math.round(item.avg * 1000) / 1000,
      count: item.count,
      good: item.good,
      poor: item.poor,
      goodPercent: item.count > 0 ? Math.round((item.good / item.count) * 100) : 0,
      poorPercent: item.count > 0 ? Math.round((item.poor / item.count) * 100) : 0,
    })),
    latestLighthouse: latestLighthouse.map(item => ({
      url: item.url,
      strategy: item.strategy,
      scores: item.scores,
      auditedAt: item.auditedAt,
    })),
    latestPageSpeed: latestPageSpeed.map(item => ({
      url: item.url,
      strategy: item.strategy,
      lighthouseScores: item.lighthouseScores,
      fetchedAt: item.fetchedAt,
    })),
    openAlerts: openAlerts.map(item => ({
      id: item._id,
      type: item.type,
      severity: item.severity,
      title: item.title,
      triggeredAt: item.triggeredAt,
    })),
    budget: budget
      ? {
          thresholds: budget.thresholds,
          lighthouseScores: budget.lighthouseScores,
          monitoredUrls: budget.monitoredUrls,
        }
      : null,
    recentWebVitals: recentWebVitals.map(item => ({
      name: item.name,
      value: item.value,
      rating: item.rating,
      pagePath: item.pagePath,
      deviceType: item.deviceType,
      measuredAt: item.measuredAt,
    })),
  };
}

module.exports = {
  getDashboardSummary,
};

/**
 * webVitals.service.js
 * خدمة معالجة مقاييس Web Vitals القادمة من المتصفحات
 */

const WebVitalMetric = require('../models/WebVitalMetric');
const { checkWebVitalAlert } = require('./performanceAlert.service');
const { recordWebVital } = require('../observability/performance.metrics');
const logger = require('../utils/logger');

const VITAL_THRESHOLDS = {
  CLS: { good: 0.1, poor: 0.25 },
  INP: { good: 200, poor: 500 },
  FID: { good: 100, poor: 300 },
  FCP: { good: 1800, poor: 3000 },
  LCP: { good: 2500, poor: 4000 },
  TTFB: { good: 800, poor: 1800 },
  TBT: { good: 200, poor: 600 },
  TTI: { good: 3800, poor: 7300 },
};

function getRating(name, value) {
  const t = VITAL_THRESHOLDS[name];
  if (!t || value === undefined || value === null) return 'unknown';
  if (value <= t.good) return 'good';
  if (value <= t.poor) return 'needs-improvement';
  return 'poor';
}

/**
 * استخلاص نوع الجهاز من user agent
 */
function getDeviceType(userAgent) {
  if (!userAgent) return 'unknown';
  const ua = userAgent.toLowerCase();
  if (/mobile|android|iphone|ipod|windows phone/.test(ua)) return 'mobile';
  if (/tablet|ipad/.test(ua)) return 'tablet';
  return 'desktop';
}

/**
 * حفظ مقياس واحد
 */
async function saveMetric(metricData) {
  const {
    name,
    value,
    pageUrl,
    pagePath,
    sessionId,
    userId,
    userAgent,
    connectionType,
    measuredAt,
    metadata,
  } = metricData;

  if (!name || value === undefined || value === null || !pageUrl || !pagePath) {
    throw new Error('Missing required Web Vital fields: name, value, pageUrl, pagePath');
  }

  const rating = getRating(name, value);

  const metric = await WebVitalMetric.create({
    name,
    value,
    rating,
    pageUrl,
    pagePath,
    sessionId: sessionId || undefined,
    userId: userId || undefined,
    userAgent: userAgent || undefined,
    deviceType: getDeviceType(userAgent),
    connectionType: connectionType || undefined,
    measuredAt: measuredAt ? new Date(measuredAt) : new Date(),
    metadata: metadata || {},
  });

  recordWebVital({ name, rating, deviceType: getDeviceType(userAgent) });

  // تحقق من التنبيهات بشكل غير حاجز
  try {
    await checkWebVitalAlert(metric);
  } catch (err) {
    logger.warn('Web vital alert check failed:', err.message);
  }

  return metric;
}

/**
 * حفظ مجموعة مقاييس دفعة واحدة
 */
async function saveMetricsBatch(metricsArray, { userAgent, sessionId, userId, pageUrl } = {}) {
  if (!Array.isArray(metricsArray) || metricsArray.length === 0) {
    return { saved: 0, metrics: [] };
  }

  const deviceType = getDeviceType(userAgent);
  const docs = metricsArray.map(m => ({
    name: m.name,
    value: m.value,
    rating: getRating(m.name, m.value),
    pageUrl: m.pageUrl || pageUrl,
    pagePath: m.pagePath,
    sessionId: m.sessionId || sessionId,
    userId: m.userId || userId,
    userAgent: userAgent,
    deviceType,
    connectionType: m.connectionType,
    measuredAt: m.measuredAt ? new Date(m.measuredAt) : new Date(),
    metadata: m.metadata || {},
  }));

  const result = await WebVitalMetric.insertMany(docs, { ordered: false });

  return { saved: result.length, metrics: result };
}

/**
 * الحصول على إحصائيات Web Vitals
 */
async function getMetricsSummary({
  name,
  pagePath,
  deviceType,
  startDate,
  endDate,
  groupBy = 'day',
} = {}) {
  const match = {};
  if (name) match.name = name;
  if (pagePath) match.pagePath = pagePath;
  if (deviceType) match.deviceType = deviceType;
  if (startDate || endDate) {
    match.measuredAt = {};
    if (startDate) match.measuredAt.$gte = new Date(startDate);
    if (endDate) match.measuredAt.$lte = new Date(endDate);
  }

  const groupFormat =
    groupBy === 'hour'
      ? '%Y-%m-%d-%H'
      : groupBy === 'week'
        ? '%Y-%U'
        : groupBy === 'month'
          ? '%Y-%m'
          : '%Y-%m-%d';

  let overall = [];
  let trends = [];
  let distribution = [];

  try {
    overall = await WebVitalMetric.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$name',
          avg: { $avg: '$value' },
          min: { $min: '$value' },
          max: { $max: '$value' },
          count: { $sum: 1 },
        },
      },
    ]);
  } catch (err) {
    logger.warn('Web vitals overall aggregation failed:', err.message);
  }

  try {
    trends = await WebVitalMetric.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: groupFormat, date: '$measuredAt' } },
            name: '$name',
          },
          avg: { $avg: '$value' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.date': 1 } },
    ]);
  } catch (err) {
    logger.warn('Web vitals trends aggregation failed:', err.message);
  }

  try {
    distribution = await WebVitalMetric.aggregate([
      { $match: match },
      {
        $group: {
          _id: { name: '$name', rating: '$rating' },
          count: { $sum: 1 },
        },
      },
    ]);
  } catch (err) {
    logger.warn('Web vitals distribution aggregation failed:', err.message);
  }

  return {
    overall: overall.map(item => ({
      name: item._id,
      avg: Math.round(item.avg * 1000) / 1000,
      min: Math.round(item.min * 1000) / 1000,
      max: Math.round(item.max * 1000) / 1000,
      count: item.count,
    })),
    trends: trends.map(item => ({
      date: item._id.date,
      name: item._id.name,
      avg: Math.round(item.avg * 1000) / 1000,
      count: item.count,
    })),
    distribution: distribution.reduce((acc, item) => {
      const key = item._id.name;
      if (!acc[key]) acc[key] = {};
      acc[key][item._id.rating] = item.count;
      return acc;
    }, {}),
  };
}

/**
 * الحصول على الصفحات الأكثر تأثرًا
 */
async function getWorstPages({ name = 'LCP', limit = 10, startDate, endDate } = {}) {
  const match = { name };
  if (startDate || endDate) {
    match.measuredAt = {};
    if (startDate) match.measuredAt.$gte = new Date(startDate);
    if (endDate) match.measuredAt.$lte = new Date(endDate);
  }

  try {
    return await WebVitalMetric.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$pagePath',
          avg: { $avg: '$value' },
          count: { $sum: 1 },
        },
      },
      { $sort: { avg: -1 } },
      { $limit: limit },
    ]);
  } catch (err) {
    logger.warn('Worst pages aggregation failed:', err.message);
    return [];
  }
}

module.exports = {
  saveMetric,
  saveMetricsBatch,
  getMetricsSummary,
  getWorstPages,
  getDeviceType,
  getRating,
};

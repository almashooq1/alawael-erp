/**
 * performanceAlert.service.js
 * خدمة التنبيهات والتحقق من عتبات الأداء
 */

const PerformanceAlert = require('../models/PerformanceAlert');
const PerformanceBudget = require('../models/PerformanceBudget');
const { recordPerformanceAlert } = require('../observability/performance.metrics');
const logger = require('../utils/logger');

/**
 * الحصول على ميزانية الأداء الحالية
 */
async function getCurrentBudget() {
  let budget = await PerformanceBudget.findOne({ name: 'default' }).lean();
  if (!budget) {
    const created = await PerformanceBudget.create({ name: 'default' });
    budget = created.toObject();
  }

  // تأكد من وجود القيم الافتراضية (defensive)
  budget.thresholds = budget.thresholds || {
    LCP: 2500,
    INP: 200,
    CLS: 0.1,
    FCP: 1800,
    TTFB: 800,
    TBT: 200,
    TTI: 3800,
  };
  budget.lighthouseScores = budget.lighthouseScores || {
    performance: 90,
    accessibility: 90,
    bestPractices: 90,
    seo: 90,
    pwa: 70,
  };

  return budget;
}

/**
 * إنشاء تنبيه جديد
 */
async function createAlert(alertData) {
  const alert = await PerformanceAlert.create({
    ...alertData,
    triggeredAt: new Date(),
  });

  recordPerformanceAlert({ type: alert.type, severity: alert.severity });
  logger.info(`Performance alert created: [${alert.severity}] ${alert.title}`);
  return alert;
}

/**
 * التحقق من Web Vital مقابل الميزانية
 */
async function checkWebVitalAlert(metric) {
  const budget = await getCurrentBudget();
  if (!budget.enabled || !budget.alerting.enabled) return null;

  const threshold = budget.thresholds[metric.name];
  if (!threshold) return null;

  let severity = null;
  if (metric.value > threshold) {
    severity = metric.rating === 'poor' ? 'critical' : 'warning';
  }

  if (!severity || (budget.alerting.minSeverity === 'critical' && severity !== 'critical')) {
    return null;
  }

  return createAlert({
    type: 'web-vital',
    severity,
    title: `Web Vital تجاوز العتبة: ${metric.name}`,
    description: `الصفحة ${metric.pagePath} سجلت ${metric.name} = ${metric.value} (العتبة: ${threshold})`,
    metricName: metric.name,
    metricValue: metric.value,
    threshold,
    pagePath: metric.pagePath,
    pageUrl: metric.pageUrl,
    source: 'rum',
  });
}

/**
 * التحقق من Lighthouse scores
 */
async function checkLighthouseAlert(audit) {
  const budget = await getCurrentBudget();
  if (!budget.enabled || !budget.alerting.enabled) return [];

  const alerts = [];
  const scores = audit.scores || {};

  for (const [category, minScore] of Object.entries(budget.lighthouseScores)) {
    const actualScore = scores[category];
    if (actualScore === undefined || actualScore === null) continue;

    if (actualScore < minScore) {
      const severity = actualScore < minScore - 15 ? 'critical' : 'warning';
      if (budget.alerting.minSeverity === 'critical' && severity !== 'critical') continue;

      const alert = await createAlert({
        type: 'lighthouse-score',
        severity,
        title: `Lighthouse score منخفض: ${category}`,
        description: `الصفحة ${audit.url} (${audit.strategy}) سجلت ${category} = ${actualScore}% (الحد الأدنى: ${minScore}%)`,
        metricName: `lighthouse-${category}`,
        metricValue: actualScore,
        threshold: minScore,
        pageUrl: audit.url,
        source: 'lighthouse',
      });
      alerts.push(alert);
    }
  }

  return alerts;
}

/**
 * التحقق من PageSpeed Insights
 */
async function checkPageSpeedAlert(metric) {
  const budget = await getCurrentBudget();
  if (!budget.enabled || !budget.alerting.enabled) return [];

  const alerts = [];
  const scores = metric.lighthouseScores || {};

  for (const [category, minScore] of Object.entries(budget.lighthouseScores)) {
    const actualScore = scores[category];
    if (actualScore === undefined || actualScore === null) continue;

    if (actualScore < minScore) {
      const severity = actualScore < minScore - 15 ? 'critical' : 'warning';
      if (budget.alerting.minSeverity === 'critical' && severity !== 'critical') continue;

      const alert = await createAlert({
        type: 'pagespeed-api-failed',
        severity,
        title: `PageSpeed score منخفض: ${category}`,
        description: `الصفحة ${metric.url} (${metric.strategy}) سجلت ${category} = ${actualScore}% (الحد الأدنى: ${minScore}%)`,
        metricName: `pagespeed-${category}`,
        metricValue: actualScore,
        threshold: minScore,
        pageUrl: metric.url,
        source: 'pagespeed',
      });
      alerts.push(alert);
    }
  }

  return alerts;
}

/**
 * الحصول على التنبيهات
 */
async function getAlerts({ status, severity, type, limit = 50, skip = 0 } = {}) {
  const query = {};
  if (status) query.status = status;
  if (severity) query.severity = severity;
  if (type) query.type = type;

  const [alerts, total] = await Promise.all([
    PerformanceAlert.find(query).sort({ triggeredAt: -1 }).skip(skip).limit(limit).lean(),
    PerformanceAlert.countDocuments(query),
  ]);

  return { alerts, total, page: Math.floor(skip / limit) + 1, pages: Math.ceil(total / limit) };
}

/**
 * تحديث حالة تنبيه
 */
async function updateAlertStatus(alertId, { status, userId }) {
  const update = { status };
  if (status === 'acknowledged') {
    update.acknowledgedBy = userId;
    update.acknowledgedAt = new Date();
  } else if (status === 'resolved') {
    update.resolvedBy = userId;
    update.resolvedAt = new Date();
  }

  return PerformanceAlert.findByIdAndUpdate(alertId, update, { new: true });
}

module.exports = {
  getCurrentBudget,
  createAlert,
  checkWebVitalAlert,
  checkLighthouseAlert,
  checkPageSpeedAlert,
  getAlerts,
  updateAlertStatus,
};

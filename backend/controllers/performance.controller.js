/**
 * performance.controller.js
 * متحكم مقاييس الأداء
 */

const webVitalsService = require('../services/webVitals.service');
const lighthouseService = require('../services/lighthouse.service');
const pagespeedService = require('../services/pagespeed.service');
const performanceMetricService = require('../services/performanceMetric.service');
const performanceAlertService = require('../services/performanceAlert.service');
const PerformanceBudget = require('../models/PerformanceBudget');
const safeError = require('../utils/safeError');
const logger = require('../utils/logger');

/**
 * POST /api/v1/performance/web-vitals
 * استلام مقاييس Web Vitals من المتصفح
 */
async function collectWebVitals(req, res) {
  try {
    const isEnabled = process.env.PERFORMANCE_MONITORING_ENABLED !== 'false';
    if (!isEnabled) {
      return res.status(503).json({
        success: false,
        message: 'Performance monitoring is disabled',
      });
    }

    const { metrics, sessionId, pageUrl, pagePath } = req.body;

    if (!Array.isArray(metrics) || metrics.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'metrics array is required',
      });
    }

    const sampleRate = parseFloat(process.env.WEB_VITALS_SAMPLE_RATE || '0.1');
    if (Math.random() > sampleRate) {
      return res.status(202).json({
        success: true,
        message: 'Sampled out',
        saved: 0,
      });
    }

    const result = await webVitalsService.saveMetricsBatch(metrics, {
      userAgent: req.headers['user-agent'],
      sessionId,
      userId: req.user?._id,
      pageUrl,
      pagePath,
    });

    res.status(201).json({
      success: true,
      message: 'Web vitals received',
      saved: result.saved,
    });
  } catch (err) {
    logger.error('Collect web vitals error:', err.message);
    safeError(res, err, 'performance');
  }
}

/**
 * GET /api/v1/performance/web-vitals
 * عرض مقاييس Web Vitals
 */
async function getWebVitals(req, res) {
  try {
    const { name, pagePath, deviceType, startDate, endDate, groupBy } = req.query;
    const summary = await webVitalsService.getMetricsSummary({
      name,
      pagePath,
      deviceType,
      startDate,
      endDate,
      groupBy,
    });

    res.json({
      success: true,
      data: summary,
    });
  } catch (err) {
    safeError(res, err, 'performance');
  }
}

/**
 * GET /api/v1/performance/web-vitals/worst-pages
 * الصفحات الأكثر تأثرًا
 */
async function getWorstPages(req, res) {
  try {
    const { name = 'LCP', limit = 10, startDate, endDate } = req.query;
    const pages = await webVitalsService.getWorstPages({
      name,
      limit: parseInt(limit, 10),
      startDate,
      endDate,
    });

    res.json({
      success: true,
      data: pages,
    });
  } catch (err) {
    safeError(res, err, 'performance');
  }
}

/**
 * POST /api/v1/performance/lighthouse/run
 * تشغيل Lighthouse يدويًا
 */
async function runLighthouse(req, res) {
  try {
    const { url, strategy = 'mobile' } = req.body;
    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'url is required',
      });
    }

    const result = await lighthouseService.runAudit(url, { strategy });
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    logger.error('Run lighthouse error:', err.message);
    safeError(res, err, 'performance');
  }
}

/**
 * GET /api/v1/performance/lighthouse
 * قائمة تقارير Lighthouse
 */
async function getLighthouseAudits(req, res) {
  try {
    const { url, strategy, limit = 20 } = req.query;
    const audits = await lighthouseService.getLatestAudits({
      url,
      strategy,
      limit: parseInt(limit, 10),
    });

    res.json({
      success: true,
      data: audits,
    });
  } catch (err) {
    safeError(res, err, 'performance');
  }
}

/**
 * GET /api/v1/performance/lighthouse/latest
 * آخر تقرير لكل URL
 */
async function getLatestLighthouse(req, res) {
  try {
    const { strategy } = req.query;
    const audits = await lighthouseService.getLatestAuditPerUrl({ strategy });

    res.json({
      success: true,
      data: audits,
    });
  } catch (err) {
    safeError(res, err, 'performance');
  }
}

/**
 * GET /api/v1/performance/pagespeed
 * جلب PageSpeed Insights
 */
async function getPageSpeed(req, res) {
  try {
    const { url, strategy = 'mobile', refresh } = req.query;
    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'url is required',
      });
    }

    if (refresh !== 'true') {
      const cached = await pagespeedService.getLatestPageSpeedMetrics({
        url,
        strategy,
        limit: 1,
      });
      if (cached && cached.length > 0) {
        const ageMs = Date.now() - new Date(cached[0].fetchedAt).getTime();
        if (ageMs < 60 * 60 * 1000) {
          return res.json({
            success: true,
            data: cached[0],
            cached: true,
          });
        }
      }
    }

    const result = await pagespeedService.fetchPageSpeed(url, { strategy });
    res.json({
      success: true,
      data: result,
      cached: false,
    });
  } catch (err) {
    logger.error('PageSpeed error:', err.message);
    safeError(res, err, 'performance');
  }
}

/**
 * GET /api/v1/performance/pagespeed/history
 * سجل PageSpeed
 */
async function getPageSpeedHistory(req, res) {
  try {
    const { url, strategy, limit = 20 } = req.query;
    const metrics = await pagespeedService.getLatestPageSpeedMetrics({
      url,
      strategy,
      limit: parseInt(limit, 10),
    });

    res.json({
      success: true,
      data: metrics,
    });
  } catch (err) {
    safeError(res, err, 'performance');
  }
}

/**
 * GET /api/v1/performance/dashboard
 * ملخص لوحة التحكم
 */
async function getDashboard(req, res) {
  try {
    const { startDate, endDate } = req.query;
    const summary = await performanceMetricService.getDashboardSummary({
      startDate,
      endDate,
    });

    res.json({
      success: true,
      data: summary,
    });
  } catch (err) {
    safeError(res, err, 'performance');
  }
}

/**
 * GET /api/v1/performance/alerts
 * قائمة التنبيهات
 */
async function getAlerts(req, res) {
  try {
    const { status, severity, type, limit = 50, skip = 0 } = req.query;
    const result = await performanceAlertService.getAlerts({
      status,
      severity,
      type,
      limit: parseInt(limit, 10),
      skip: parseInt(skip, 10),
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    safeError(res, err, 'performance');
  }
}

/**
 * PATCH /api/v1/performance/alerts/:id
 * تحديث حالة تنبيه
 */
async function updateAlert(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['acknowledged', 'resolved', 'ignored'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
      });
    }

    const alert = await performanceAlertService.updateAlertStatus(id, {
      status,
      userId: req.user?._id,
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found',
      });
    }

    res.json({
      success: true,
      data: alert,
    });
  } catch (err) {
    safeError(res, err, 'performance');
  }
}

/**
 * GET /api/v1/performance/budget
 * عرض ميزانية الأداء
 */
async function getBudget(req, res) {
  try {
    const budget = await performanceAlertService.getCurrentBudget();
    res.json({
      success: true,
      data: budget,
    });
  } catch (err) {
    safeError(res, err, 'performance');
  }
}

/**
 * POST /api/v1/performance/budget
 * تحديث ميزانية الأداء
 */
async function updateBudget(req, res) {
  try {
    const update = req.body;
    const budget = await PerformanceBudget.findOneAndUpdate(
      { name: 'default' },
      { ...update, updatedBy: req.user?._id },
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      data: budget,
    });
  } catch (err) {
    safeError(res, err, 'performance');
  }
}

/**
 * GET /api/v1/performance/budget/status
 * حالة الميزانية مقابل البيانات الفعلية
 */
async function getBudgetStatus(req, res) {
  try {
    const budget = await performanceAlertService.getCurrentBudget();
    const latest = await lighthouseService.getLatestAuditPerUrl();

    const status = {
      budget,
      urls: latest.map(audit => ({
        url: audit.url,
        strategy: audit.strategy,
        scores: audit.scores,
        passed: {
          performance: (audit.scores?.performance || 0) >= budget.lighthouseScores.performance,
          accessibility:
            (audit.scores?.accessibility || 0) >= budget.lighthouseScores.accessibility,
          bestPractices:
            (audit.scores?.bestPractices || 0) >= budget.lighthouseScores.bestPractices,
          seo: (audit.scores?.seo || 0) >= budget.lighthouseScores.seo,
          pwa: (audit.scores?.pwa || 0) >= budget.lighthouseScores.pwa,
        },
      })),
    };

    res.json({
      success: true,
      data: status,
    });
  } catch (err) {
    safeError(res, err, 'performance');
  }
}

module.exports = {
  collectWebVitals,
  getWebVitals,
  getWorstPages,
  runLighthouse,
  getLighthouseAudits,
  getLatestLighthouse,
  getPageSpeed,
  getPageSpeedHistory,
  getDashboard,
  getAlerts,
  updateAlert,
  getBudget,
  updateBudget,
  getBudgetStatus,
};

/**
 * pagespeed.service.js
 * خدمة جلب مقاييس PageSpeed Insights API
 */

const axios = require('axios');
const PageSpeedMetric = require('../models/PageSpeedMetric');
const { checkPageSpeedAlert } = require('./performanceAlert.service');
const { recordPageSpeedScore } = require('../observability/performance.metrics');
const logger = require('../utils/logger');

const PSI_API_URL = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

/**
 * جلب بيانات PageSpeed Insights لـ URL واحد
 */
async function fetchPageSpeed(url, { strategy = 'mobile' } = {}) {
  const isEnabled = process.env.PAGESPEED_ENABLED !== 'false';
  if (!isEnabled) {
    throw new Error('PageSpeed Insights is disabled via PAGESPEED_ENABLED=false');
  }

  const apiKey = process.env.PAGESPEED_API_KEY;
  if (!apiKey) {
    throw new Error('PAGESPEED_API_KEY is required');
  }

  const startTime = Date.now();
  let response;

  try {
    response = await axios.get(PSI_API_URL, {
      params: {
        url,
        key: apiKey,
        strategy,
      },
      // category يُضاف كمعامل متكرر أدناه
      paramsSerializer: params => {
        const cats = ['PERFORMANCE', 'ACCESSIBILITY', 'BEST_PRACTICES', 'SEO', 'PWA'];
        const base = new URLSearchParams();
        for (const [k, v] of Object.entries(params)) base.append(k, v);
        cats.forEach(c => base.append('category', c));
        return base.toString();
      },
      timeout: 60000,
    });

    const apiResponseTimeMs = Date.now() - startTime;
    const data = response.data;

    const lighthouseResult = data.lighthouseResult || {};
    const categories = lighthouseResult.categories || {};
    const audits = lighthouseResult.audits || {};

    const lighthouseScores = {
      performance: Math.round((categories.performance?.score || 0) * 100),
      accessibility: Math.round((categories.accessibility?.score || 0) * 100),
      bestPractices: Math.round((categories['best-practices']?.score || 0) * 100),
      seo: Math.round((categories.seo?.score || 0) * 100),
      pwa: Math.round((categories.pwa?.score || 0) * 100),
    };

    const lighthouseMetrics = {
      'first-contentful-paint': getAuditValue(audits['first-contentful-paint']),
      'largest-contentful-paint': getAuditValue(audits['largest-contentful-paint']),
      'speed-index': getAuditValue(audits['speed-index']),
      'total-blocking-time': getAuditValue(audits['total-blocking-time']),
      'cumulative-layout-shift': getAuditValue(audits['cumulative-layout-shift']),
      interactive: getAuditValue(audits.interactive),
      'server-response-time': getAuditValue(audits['server-response-time']),
    };

    const loadingExperience = data.loadingExperience || {};
    const fieldData = loadingExperience.metrics || {};
    const originLoadingExperience = data.originLoadingExperience || {};

    const metric = await PageSpeedMetric.create({
      url,
      strategy,
      lighthouseScores,
      lighthouseMetrics,
      fieldData: parseCrUXMetrics(fieldData),
      originSummary: {
        overallCategory: originLoadingExperience.overall_category,
        metrics: parseCrUXMetrics(originLoadingExperience.metrics || {}),
      },
      apiResponseTimeMs,
      psiVersion: data.analysisUTCTimestamp ? 'v5' : 'unknown',
      analysisUTCTimestamp: data.analysisUTCTimestamp,
      status: 'success',
      fetchedAt: new Date(),
    });

    // تسجيل المقاييس
    Object.entries(lighthouseScores).forEach(([category, score]) => {
      recordPageSpeedScore({ url, strategy, category, score });
    });

    // تحقق من التنبيهات
    try {
      await checkPageSpeedAlert(metric);
    } catch (err) {
      logger.warn('PageSpeed alert check failed:', err.message);
    }

    return metric;
  } catch (err) {
    logger.error(`PageSpeed Insights failed for ${url}:`, err.message);

    await PageSpeedMetric.create({
      url,
      strategy,
      status: 'failed',
      errorMessage: err.response?.data?.error?.message || err.message,
      apiResponseTimeMs: Date.now() - startTime,
      fetchedAt: new Date(),
    });

    throw err;
  }
}

function getAuditValue(audit) {
  if (!audit) return undefined;
  return typeof audit.numericValue === 'number' ? audit.numericValue : undefined;
}

function parseCrUXMetrics(metrics) {
  const result = {};
  const mapping = {
    LARGEST_CONTENTFUL_PAINT_MS: 'largest_contentful_paint',
    FIRST_INPUT_DELAY_MS: 'first_input_delay',
    CUMULATIVE_LAYOUT_SHIFT_SCORE: 'cumulative_layout_shift',
    FIRST_CONTENTFUL_PAINT_MS: 'first_contentful_paint',
    INTERACTION_TO_NEXT_PAINT: 'interaction_to_next_paint',
    EXPERIMENTAL_TIME_TO_FIRST_BYTE: 'experimental_time_to_first_byte',
  };

  for (const [key, metric] of Object.entries(metrics)) {
    const normalizedKey = mapping[key];
    if (!normalizedKey) continue;
    result[normalizedKey] = {
      percentile: metric.percentile,
      distributions: metric.distributions || [],
      category: metric.category,
    };
  }

  return result;
}

/**
 * جلب بيانات PageSpeed لقائمة URLs
 */
async function fetchPageSpeedForUrls(urls, options = {}) {
  const results = [];
  for (const url of urls) {
    try {
      const result = await fetchPageSpeed(url, options);
      results.push({ url, success: true, result });
    } catch (err) {
      results.push({ url, success: false, error: err.message });
    }
  }
  return results;
}

/**
 * الحصول على آخر نتائج PageSpeed
 */
async function getLatestPageSpeedMetrics({ url, strategy, limit = 20 } = {}) {
  const query = {};
  if (url) query.url = url;
  if (strategy) query.strategy = strategy;

  return PageSpeedMetric.find(query).sort({ fetchedAt: -1 }).limit(limit).lean();
}

module.exports = {
  fetchPageSpeed,
  fetchPageSpeedForUrls,
  getLatestPageSpeedMetrics,
};

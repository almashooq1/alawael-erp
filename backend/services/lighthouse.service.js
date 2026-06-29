/**
 * lighthouse.service.js
 * خدمة تشغيل Lighthouse audits برمجيًا
 */

const LighthouseAudit = require('../models/LighthouseAudit');
const { checkLighthouseAlert } = require('./performanceAlert.service');
const { recordLighthouseScore } = require('../observability/performance.metrics');
const logger = require('../utils/logger');

const DEFAULT_FLAGS = {
  chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo', 'pwa'],
  output: 'json',
  logLevel: 'error',
};

/**
 * تحميل Lighthouse و Chrome Launcher بشكل ديناميكي (ESM)
 */
async function loadLighthouseLibs() {
  const [{ default: lighthouse }, chromeLauncher] = await Promise.all([
    import('lighthouse'),
    import('chrome-launcher'),
  ]);
  return { lighthouse, chromeLauncher: chromeLauncher.default || chromeLauncher };
}

/**
 * تشغيل Lighthouse على URL واحد
 */
async function runAudit(url, { strategy = 'mobile', _timeoutMs = 120000 } = {}) {
  const isEnabled = process.env.LIGHTHOUSE_ENABLED !== 'false';
  if (!isEnabled) {
    throw new Error('Lighthouse is disabled via LIGHTHOUSE_ENABLED=false');
  }

  let chrome;
  try {
    const { lighthouse, chromeLauncher } = await loadLighthouseLibs();

    chrome = await chromeLauncher.launch({
      chromeFlags: DEFAULT_FLAGS.chromeFlags,
      chromePath: process.env.LIGHTHOUSE_CHROME_PATH || undefined,
    });

    const options = {
      ...DEFAULT_FLAGS,
      port: chrome.port,
      emulatedFormFactor: strategy === 'desktop' ? 'desktop' : 'mobile',
    };

    const startTime = Date.now();
    const runnerResult = await lighthouse(url, options, undefined);
    const durationMs = Date.now() - startTime;

    if (!runnerResult || !runnerResult.lhr) {
      throw new Error('Lighthouse returned empty result');
    }

    const { lhr } = runnerResult;

    const scores = {
      performance: Math.round(lhr.categories.performance.score * 100),
      accessibility: Math.round((lhr.categories.accessibility?.score || 0) * 100),
      bestPractices: Math.round((lhr.categories['best-practices']?.score || 0) * 100),
      seo: Math.round((lhr.categories.seo?.score || 0) * 100),
      pwa: Math.round((lhr.categories.pwa?.score || 0) * 100),
    };

    const audits = lhr.audits;
    const metrics = {
      'first-contentful-paint': getAuditNumeric(audits['first-contentful-paint']),
      'largest-contentful-paint': getAuditNumeric(audits['largest-contentful-paint']),
      'speed-index': getAuditNumeric(audits['speed-index']),
      'total-blocking-time': getAuditNumeric(audits['total-blocking-time']),
      'cumulative-layout-shift': getAuditNumeric(audits['cumulative-layout-shift']),
      interactive: getAuditNumeric(audits.interactive),
      'server-response-time': getAuditNumeric(audits['server-response-time']),
      'max-potential-fid': getAuditNumeric(audits['max-potential-fid']),
    };

    const opportunities = extractOpportunities(audits);
    const diagnostics = extractDiagnostics(audits);

    const audit = await LighthouseAudit.create({
      url,
      strategy,
      scores,
      metrics,
      opportunities,
      diagnostics,
      durationMs,
      chromeVersion: lhr.environment.hostUserAgent,
      lighthouseVersion: lhr.lighthouseVersion,
      status: 'success',
      auditedAt: new Date(),
    });

    // تسجيل المقاييس
    Object.entries(scores).forEach(([category, score]) => {
      recordLighthouseScore({ url, strategy, category, score });
    });

    // تحقق من التنبيهات
    try {
      await checkLighthouseAlert(audit);
    } catch (err) {
      logger.warn('Lighthouse alert check failed:', err.message);
    }

    return audit;
  } catch (err) {
    logger.error(`Lighthouse audit failed for ${url}:`, err.message);

    await LighthouseAudit.create({
      url,
      strategy,
      status: 'failed',
      runtimeError: {
        message: err.message,
        code: err.code || 'UNKNOWN',
      },
      durationMs: 0,
      auditedAt: new Date(),
    });

    throw err;
  } finally {
    if (chrome) {
      try {
        await chrome.kill();
      } catch (killErr) {
        logger.warn('Failed to kill Chrome:', killErr.message);
      }
    }
  }
}

function getAuditNumeric(audit) {
  if (!audit) return undefined;
  return {
    value: typeof audit.numericValue === 'number' ? audit.numericValue : undefined,
    score: typeof audit.score === 'number' ? Math.round(audit.score * 100) : undefined,
  };
}

function extractOpportunities(audits) {
  return Object.values(audits)
    .filter(
      a => a.details && a.details.type === 'opportunity' && a.numericValue && a.numericValue > 0
    )
    .map(a => ({
      title: a.title,
      description: a.description,
      score: typeof a.score === 'number' ? Math.round(a.score * 100) : null,
      savings: a.numericValue,
      savingsUnit: a.numericUnit || 'ms',
    }));
}

function extractDiagnostics(audits) {
  return Object.values(audits)
    .filter(a => a.details && a.details.type === 'table' && a.score !== null && a.score < 1)
    .slice(0, 10)
    .map(a => ({
      title: a.title,
      description: a.description,
      score: typeof a.score === 'number' ? Math.round(a.score * 100) : null,
    }));
}

/**
 * تشغيل Lighthouse على قائمة URLs
 */
async function runAuditsOnUrls(urls, options = {}) {
  const results = [];
  for (const url of urls) {
    try {
      const result = await runAudit(url, options);
      results.push({ url, success: true, result });
    } catch (err) {
      results.push({ url, success: false, error: err.message });
    }
  }
  return results;
}

/**
 * الحصول على آخر تقارير Lighthouse
 */
async function getLatestAudits({ url, strategy, limit = 20 } = {}) {
  const query = {};
  if (url) query.url = url;
  if (strategy) query.strategy = strategy;

  return LighthouseAudit.find(query).sort({ auditedAt: -1 }).limit(limit).lean();
}

/**
 * الحصول على آخر تقرير لكل URL
 */
async function getLatestAuditPerUrl({ strategy } = {}) {
  const match = strategy ? { strategy } : {};

  return LighthouseAudit.aggregate([
    { $match: match },
    { $sort: { auditedAt: -1 } },
    {
      $group: {
        _id: { url: '$url', strategy: '$strategy' },
        doc: { $first: '$$ROOT' },
      },
    },
    { $replaceRoot: { newRoot: '$doc' } },
    { $sort: { auditedAt: -1 } },
  ]).catch(() => []);
}

module.exports = {
  runAudit,
  runAuditsOnUrls,
  getLatestAudits,
  getLatestAuditPerUrl,
};

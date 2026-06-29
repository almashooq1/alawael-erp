/**
 * performance.scheduler.js
 * جدولة Lighthouse audits و PageSpeed Insights
 */

const cron = require('node-cron');
const lighthouseService = require('../services/lighthouse.service');
const pagespeedService = require('../services/pagespeed.service');
const PerformanceBudget = require('../models/PerformanceBudget');
const logger = require('../utils/logger');

/**
 * تشغيل Lighthouse audits على URLs المراقبة
 */
async function runScheduledLighthouseAudits() {
  const isEnabled = process.env.LIGHTHOUSE_ENABLED !== 'false';
  if (!isEnabled) {
    logger.info('[Scheduler] Lighthouse is disabled, skipping scheduled audits');
    return { ran: false, reason: 'disabled' };
  }

  const budget = await PerformanceBudget.findOne({ name: 'default' }).lean();
  const urls = budget?.monitoredUrls?.filter(u => u.enabled) || [];

  if (urls.length === 0) {
    logger.info('[Scheduler] No monitored URLs configured');
    return { ran: false, reason: 'no_urls' };
  }

  const results = [];
  for (const { url, strategy = 'mobile' } of urls) {
    try {
      const result = await lighthouseService.runAudit(url, { strategy });
      results.push({ url, strategy, success: true, score: result.scores?.performance });
    } catch (err) {
      results.push({ url, strategy, success: false, error: err.message });
    }
  }

  logger.info(`[Scheduler] Completed ${urls.length} Lighthouse audits`);
  return { ran: true, results };
}

/**
 * تشغيل PageSpeed Insights على URLs المراقبة
 */
async function runScheduledPageSpeedChecks() {
  const isEnabled = process.env.PAGESPEED_ENABLED !== 'false';
  if (!isEnabled) {
    logger.info('[Scheduler] PageSpeed is disabled, skipping scheduled checks');
    return { ran: false, reason: 'disabled' };
  }

  if (!process.env.PAGESPEED_API_KEY) {
    logger.warn('[Scheduler] PAGESPEED_API_KEY not set, skipping PageSpeed checks');
    return { ran: false, reason: 'no_api_key' };
  }

  const budget = await PerformanceBudget.findOne({ name: 'default' }).lean();
  const urls = budget?.monitoredUrls?.filter(u => u.enabled) || [];

  if (urls.length === 0) {
    return { ran: false, reason: 'no_urls' };
  }

  const results = [];
  for (const { url, strategy = 'mobile' } of urls) {
    try {
      const result = await pagespeedService.fetchPageSpeed(url, { strategy });
      results.push({ url, strategy, success: true, score: result.lighthouseScores?.performance });
    } catch (err) {
      results.push({ url, strategy, success: false, error: err.message });
    }
  }

  logger.info(`[Scheduler] Completed ${urls.length} PageSpeed checks`);
  return { ran: true, results };
}

/**
 * بدء جدولة الأداء
 */
function startPerformanceScheduler() {
  const isEnabled = process.env.PERFORMANCE_MONITORING_ENABLED !== 'false';
  if (!isEnabled) {
    logger.info('[Scheduler] Performance monitoring scheduler is disabled');
    return;
  }

  const schedule = process.env.LIGHTHOUSE_SCHEDULE || '0 */6 * * *';

  if (!cron.validate(schedule)) {
    logger.error(`[Scheduler] Invalid LIGHTHOUSE_SCHEDULE: ${schedule}`);
    return;
  }

  cron.schedule(
    schedule,
    async () => {
      logger.info('[Scheduler] Starting scheduled performance checks');
      try {
        await runScheduledLighthouseAudits();
      } catch (err) {
        logger.error('[Scheduler] Lighthouse audit error:', err.message);
      }

      try {
        await runScheduledPageSpeedChecks();
      } catch (err) {
        logger.error('[Scheduler] PageSpeed check error:', err.message);
      }
    },
    {
      scheduled: true,
      timezone: process.env.TZ || 'Asia/Riyadh',
    }
  );

  logger.info(`[Scheduler] Performance scheduler started with schedule: ${schedule}`);
}

module.exports = {
  startPerformanceScheduler,
  runScheduledLighthouseAudits,
  runScheduledPageSpeedChecks,
};

/**
 * startup/schedulers.js — Background schedulers & shutdown hooks
 * ═══════════════════════════════════════════════════════════════
 * Extracted from app.js for maintainability.
 *
 * Manages: AI Scheduler, SLA Scheduler, settings seed,
 *          and graceful shutdown hooks for timer-based services.
 */

const logger = require('../utils/logger');
const { registerShutdownHook } = require('../utils/gracefulShutdown');

/**
 * Start background schedulers and register shutdown hooks.
 * Skipped entirely in test environments.
 *
 * @param {object}  opts
 * @param {boolean} opts.isTestEnv
 */
function setupSchedulers({ isTestEnv }) {
  if (isTestEnv) return;

  // ── AI Scheduler — daily AI checks (prompt 20) ──────────────────────────
  try {
    const { startScheduler, stopScheduler } = require('../services/ai/aiScheduler');
    registerShutdownHook('AI Scheduler', stopScheduler);
    const aiSchedulerTimer = setTimeout(() => {
      startScheduler();
      logger.info(
        '✅ prompt_20 AI Scheduler started (daily checks at 06:00, monthly reports on 1st)'
      );
    }, 30000);
    if (aiSchedulerTimer.unref) aiSchedulerTimer.unref();
  } catch (err) {
    logger.warn('⚠️  AI Scheduler could not start', { error: err.message });
  }

  // ── SLA Scheduler — ticket SLA breach checks (prompt 22) ────────────────
  try {
    const { startSlaScheduler, stopSlaScheduler } = require('../services/ticketSlaScheduler');
    registerShutdownHook('SLA Scheduler', stopSlaScheduler);
    setTimeout(() => {
      startSlaScheduler();
      logger.info(
        '✅ prompt_22 SLA Scheduler started (every 15 min: response + resolution breach checks)'
      );
    }, 35000);
  } catch (err) {
    logger.warn('⚠️  SLA Scheduler could not start', { error: err.message });
  }

  // ── Shutdown hooks for timer-based services ──────────────────────────────
  const shutdownServices = [
    ['HealthCheck', () => require('../services/HealthCheck').shutdown()],
    ['AlertService', () => require('../services/AlertService').shutdown()],
    ['CachingService', () => require('../services/cachingService').shutdown()],
    ['RealtimeDashboard', () => require('../services/realtimeDashboardService').shutdown()],
    ['NotificationAnalytics', () => require('../services/notificationAnalyticsSystem').shutdown()],
    ['BackupAnalytics', () => require('../services/backup-analytics.service').shutdown()],
    ['BackupPerformance', () => require('../services/backup-performance.service').shutdown()],
    ['BackupSync', () => require('../services/backup-sync.service').shutdown()],
    ['BackupSecurity', () => require('../services/backup-security.service').shutdown()],
    ['DatabaseMaintenance', () => require('../services/database-maintenance-service').stop()],
    ['DatabaseReplication', () => require('../services/database-replication-service').stop()],
  ];

  for (const [name, fn] of shutdownServices) {
    registerShutdownHook(name, async () => {
      try {
        await fn();
      } catch {
        /* service may not have been initialised — ignore */
      }
    });
  }

  // ── Settings seed — default settings initialization (prompt 24) ──────────
  setTimeout(async () => {
    try {
      const settingsService = require('../services/settingsService');
      await settingsService.seedDefaultSettings();
      logger.info('✅ prompt_24 Default settings seeded (GlobalSetting collection)');
    } catch (err) {
      logger.warn('⚠️  Settings seed failed', { error: err.message });
    }
  }, 40000);
}

module.exports = { setupSchedulers };

'use strict';

/**
 * reportingSchedulerBootstrap.js — W762.
 *
 * Activates the DORMANT Phase-10 reporting platform. Everything is already
 * built — `services/reporting/index.js::buildReportingPlatform()` wires the
 * ReportingEngine + ReportsScheduler + ReportsOpsScheduler + channels +
 * recipient resolver, and `scheduler/reports.scheduler.js` runs
 * `engine.runInstance()` per periodicity off `config/report.catalog`'s
 * PERIODICITY_CRON. But NOTHING ever called the factory's `.start()` at boot,
 * so scheduled reports never executed and ReportSchedule rows had no consumer
 * (W225 dormant-capability pattern — built, never wired).
 *
 * This bootstrap is the missing wire: it constructs the platform with prod deps
 * (mongoose models + the W735-hardened email channel + node-cron) and starts it.
 *
 * GATED OFF BY DEFAULT — ships inert; nothing runs until an operator opts in:
 *   ENABLE_REPORT_SCHEDULER='true'   → start the periodic + ops schedulers
 *
 * Fully guarded: any wiring error is logged and swallowed so a reporting-platform
 * load problem can never break app boot.
 */

function loadOptional(modulePath) {
  try {
    return require(modulePath);
  } catch {
    return null;
  }
}

function wireReportingScheduler(app, deps = {}) {
  const { logger } = deps;
  if (!logger) {
    throw new Error('reportingSchedulerBootstrap.wireReportingScheduler: logger required');
  }

  if (process.env.ENABLE_REPORT_SCHEDULER !== 'true') {
    logger.info(
      '[startup] reporting scheduler disabled (set ENABLE_REPORT_SCHEDULER=true to activate periodic report execution)'
    );
    return { started: false };
  }

  try {
    const platformMod = loadOptional('../services/reporting');
    if (!platformMod || typeof platformMod.buildReportingPlatform !== 'function') {
      logger.warn('[startup] reporting platform not available; scheduler not started');
      return { started: false };
    }

    const cron = loadOptional('node-cron'); // undefined → factory falls back to setInterval
    const mongoose = require('mongoose');

    // Resolve models lazily by name — registered by boot time. A missing model
    // degrades gracefully (the resolver/channels treat it as absent).
    const model = name => {
      try {
        return mongoose.model(name);
      } catch {
        return null;
      }
    };

    // The W735-hardened email transport is the platform's email channel.
    const emailService = loadOptional('../services/emailService');

    const platform = platformMod.buildReportingPlatform({
      models: {
        Notification: model('Notification'),
        Beneficiary: model('Beneficiary'),
        Guardian: model('Guardian'),
        User: model('User'),
        Employee: model('Employee'),
        Session: model('Session'),
      },
      communication: { emailService },
      cron, // undefined in test/no-cron envs → scheduler uses setInterval
      logger,
    });

    platform.start();
    app && app.set && app.set('reportingPlatform', platform); // expose for ops/status if needed
    logger.info('[startup] W762 reporting scheduler started (periodic + ops schedulers active)');
    return { started: true, platform };
  } catch (err) {
    logger.error('[startup] reporting scheduler wiring failed (swallowed)', {
      error: err && err.message,
    });
    return { started: false, error: err && err.message };
  }
}

module.exports = { wireReportingScheduler };

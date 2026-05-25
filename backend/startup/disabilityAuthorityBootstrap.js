'use strict';

/**
 * disabilityAuthorityBootstrap.js — wire W281 adapter routes (W281b)
 * + W286 monthly periodic-report cron.
 *
 * The adapter is a pure transport module (no class, no MFA gate of its
 * own — gates live at the route layer). This bootstrap:
 *   1. Attaches the adapter to `app._disabilityAuthorityAdapter`
 *   2. Mounts the 3-endpoint adapter routes
 *   3. (W286) Schedules monthly periodic-report submission cron when
 *      ENABLE_DA_PERIODIC_CRON=true + DA_REPORTING_BRANCH_IDS=b1,b2
 *
 * Cron pattern mirrors W282b mudadWpsBootstrap: cron disabled by
 * default, branch IDs from env, system actor with mfaTier=2.
 *
 * The cron generates a stub monthly_service report payload — production
 * should swap this for a real builder pulling service counts from the
 * DisabilityAuthorityReport / Beneficiary / Session models.
 */

function loadOptional(modulePath) {
  try {
    return require(modulePath);
  } catch {
    return null;
  }
}

function wireDisabilityAuthority(app, deps = {}) {
  const { logger } = deps;
  if (!app || !logger) {
    throw new Error('disabilityAuthorityBootstrap.wireDisabilityAuthority: app + logger required');
  }

  try {
    const adapter = require('../services/disabilityAuthorityAdapter');
    const adapterRouter = require('../routes/disabilityAuthorityAdapter.routes');

    app._disabilityAuthorityAdapter = adapter;

    app.use('/api/disability-authority/adapter', adapterRouter);
    app.use('/api/v1/disability-authority/adapter', adapterRouter);

    logger.info(
      '[startup] Disability Authority adapter wired (W281b): /api/disability-authority/adapter (mode=' +
        adapter.getConfig().mode +
        ')'
    );

    // ── W286: monthly periodic-report cron ────────────────────────────
    const cronEnabled = String(process.env.ENABLE_DA_PERIODIC_CRON || '').toLowerCase() === 'true';
    if (!cronEnabled) {
      logger.info(
        '[startup] DA periodic-report cron DISABLED (set ENABLE_DA_PERIODIC_CRON=true to enable)'
      );
      return;
    }

    const cron = loadOptional('node-cron');
    if (!cron) {
      logger.warn('[startup] DA periodic cron requested but node-cron not installed.');
      return;
    }

    const branchIds = String(process.env.DA_REPORTING_BRANCH_IDS || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    if (branchIds.length === 0) {
      logger.warn(
        '[startup] DA periodic cron: ENABLE_DA_PERIODIC_CRON=true but DA_REPORTING_BRANCH_IDS empty'
      );
      return;
    }

    // W316 — opt in to central scheduler registry for live last-run telemetry.
    const schedulerRegistry = require('../intelligence/scheduler-registry');
    schedulerRegistry.register('disability-authority-monthly', {
      meta: { schedule: '0 4 5 * *', tz: 'Asia/Riyadh', branchCount: branchIds.length },
    });
    // Day 5 of each month @ 04:00 Asia/Riyadh — reports cover previous month.
    // (Day 5 gives time for prior month's data to settle; matches WPS pattern.)
    const task = cron.schedule(
      '0 4 5 * *',
      async () => {
        const started = Date.now();
        let failedBranches = 0;
        let firstError = null;
        const now = new Date();
        // Previous month
        const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const periodStart = prev;
        const periodEnd = new Date(prev.getFullYear(), prev.getMonth() + 1, 0, 23, 59, 59);

        logger.info(
          `[da-periodic:cron] starting monthly report submission for ${branchIds.length} branches, period=${periodStart.toISOString().slice(0, 7)}`
        );

        for (const branchId of branchIds) {
          try {
            // Stub payload — production should build real metrics from
            // DisabilityAuthorityReport + Beneficiary + Session models.
            // The `note` field uses adapter.STUB_PAYLOAD_MARKER so that the
            // adapter's safety guard (submitPeriodicReport) refuses to submit
            // this payload if MODE=live is flipped before the real builder
            // lands. Single source of truth for the marker string.
            const reportNumber = `RPT-${branchId}-${periodStart.toISOString().slice(0, 7)}`;
            const payload = {
              branchId,
              period: { start: periodStart.toISOString(), end: periodEnd.toISOString() },
              reportType: 'monthly_service',
              note: adapter.STUB_PAYLOAD_MARKER,
            };
            const result = await adapter.submitPeriodicReport({
              reportNumber,
              period: { startDate: periodStart, endDate: periodEnd },
              payload,
            });
            logger.info(
              `[da-periodic:cron] branch=${branchId} reportNumber=${reportNumber} → submissionId=${result.submissionId}`
            );
          } catch (err) {
            failedBranches += 1;
            if (!firstError) firstError = err;
            logger.error(`[da-periodic:cron] branch=${branchId} failed`, {
              err: err.message,
              code: err.code,
            });
          }
        }
        schedulerRegistry.recordRun('disability-authority-monthly', {
          ok: failedBranches === 0,
          error: firstError
            ? new Error(
                `${failedBranches}/${branchIds.length} branches failed: ${firstError.message}`
              )
            : null,
          durationMs: Date.now() - started,
        });
      },
      { timezone: 'Asia/Riyadh' }
    );
    app._daPeriodicCronTask = task;
    logger.info(
      `[startup] DA periodic-report cron scheduled (W286): day 5 @ 04:00 Asia/Riyadh, ${branchIds.length} branches`
    );
  } catch (err) {
    logger.warn('[startup] Disability Authority wiring failed (W281b/W286)', { err: err.message });
  }
}

module.exports = { wireDisabilityAuthority };

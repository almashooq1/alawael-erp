'use strict';

/**
 * capaBootstrap.js — W344 (CAPA Pass 3).
 *
 * Wires the CapaItem feature into the running app:
 *   1. Constructs capa.service with enforceMfa:true (W275 service-layer defense;
 *      caught by W276 drift guard's MFA_AWARE_FACTORIES).
 *   2. Attaches to `app._capaService` so routes + producers can grab it via
 *      late binding (matches W283 RAG + W334 AiRecommendation patterns).
 *   3. (Optional, env-gated) Schedules the overdue-sweeper cron daily at 06:00
 *      Asia/Riyadh. Disabled by default. Enable with ENABLE_CAPA_SWEEPER=true.
 *
 * Cron pattern mirrors W286 DA + W282b mudad: opt-in, branch-aware via the
 * service's branchId filter, system actor, schedulerRegistry integration.
 *
 * Routes are deferred to a separate Pass 4 wave; the service is wired now so
 * producers (audit/RCA/FMEA event handlers) can already call createCapaItem.
 */

function loadOptional(modulePath) {
  try {
    return require(modulePath);
  } catch {
    return null;
  }
}

function wireCapa(app, deps = {}) {
  const { logger = console } = deps;
  if (!app) throw new Error('capaBootstrap.wireCapa: app required');

  const { createCapaService } = require('../services/quality/capa.service');

  // Event emitter shim: services/qualityEventBus may not be present in every
  // deployment; degrade gracefully to a no-op when absent.
  let emitEvent = null;
  const bus = loadOptional('../services/quality/qualityEventBus.service');
  if (bus && typeof bus.emit === 'function') {
    emitEvent = (name, payload) => bus.emit(name, payload);
  } else if (bus && bus.default && typeof bus.default.emit === 'function') {
    emitEvent = (name, payload) => bus.default.emit(name, payload);
  }

  const service = createCapaService({
    enforceMfa: true, // W275 + W276
    emitEvent,
    logger,
  });
  app._capaService = service;

  logger.info?.(
    '[startup] CAPA service wired (W344): enforceMfa=true, emitEvent=' +
      (emitEvent ? 'wired' : 'noop')
  );

  // ── W345 — REST surface ─────────────────────────────────────────────
  // Dual-mount under /api/quality/capa + /api/v1/quality/capa to match
  // the project's two-stem API convention (W283, W334 routes).
  try {
    const capaRouter = require('../routes/quality/capa.routes');
    app.use('/api/quality/capa', capaRouter);
    app.use('/api/v1/quality/capa', capaRouter);
    logger.info?.('[startup] CAPA routes mounted (W345): /api/quality/capa + /api/v1/...');
  } catch (err) {
    logger.warn?.(`[startup] CAPA routes failed to mount: ${err.message}`);
  }

  // ── Overdue sweeper cron (W344 Pass 3) ──────────────────────────────
  const cronEnabled = String(process.env.ENABLE_CAPA_SWEEPER || '').toLowerCase() === 'true';
  if (!cronEnabled) {
    logger.info?.(
      '[startup] CAPA overdue-sweeper cron DISABLED (set ENABLE_CAPA_SWEEPER=true to enable)'
    );
    return service;
  }

  const cron = loadOptional('node-cron');
  if (!cron) {
    logger.warn?.('[startup] CAPA sweeper requested but node-cron not installed.');
    return service;
  }

  const schedulerRegistry = require('../intelligence/scheduler-registry');
  schedulerRegistry.register('capa-overdue-sweeper', {
    meta: { schedule: '0 6 * * *', tz: 'Asia/Riyadh', purpose: 'emit quality.capa.overdue events' },
  });

  cron.schedule(
    '0 6 * * *',
    async () => {
      const started = Date.now();
      let error = null;
      let scanned = 0;
      let emitted = 0;
      try {
        const result = await service.sweepOverdue({ now: new Date() });
        scanned = result.scanned;
        emitted = result.emitted;
        logger.info?.(`[capa-sweeper] overdue scan: ${scanned} found, ${emitted} alerts emitted`);
      } catch (err) {
        error = err;
        logger.error?.(`[capa-sweeper] failed: ${err.message}`);
      }
      schedulerRegistry.recordRun('capa-overdue-sweeper', {
        ok: !error,
        error,
        durationMs: Date.now() - started,
        meta: { scanned, emitted },
      });
    },
    { timezone: 'Asia/Riyadh' }
  );

  logger.info?.('[startup] CAPA overdue-sweeper cron wired: daily 06:00 Asia/Riyadh');
  return service;
}

module.exports = { wireCapa };

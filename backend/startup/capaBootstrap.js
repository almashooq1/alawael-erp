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

  // W349 — qualityEventBus wiring. Module exports { createQualityEventBus,
  // getDefault, ... } — use getDefault() for the singleton (matches the
  // pattern in auditScheduler.service / calibration.service). Pre-W349 the
  // wiring checked `bus.emit` / `bus.default.emit` neither of which match
  // this module's exports → emit was silently a no-op all along. Degrades
  // to no-op only when the module itself isn't loadable.
  let emitEvent = null;
  let busInstance = null;
  const busModule = loadOptional('../services/quality/qualityEventBus.service');
  if (busModule && typeof busModule.getDefault === 'function') {
    busInstance = busModule.getDefault();
    if (busInstance && typeof busInstance.emit === 'function') {
      emitEvent = (name, payload) => busInstance.emit(name, payload);
    }
  } else if (busModule && typeof busModule.emit === 'function') {
    // Defensive: if some future variant exports emit at module level.
    busInstance = busModule;
    emitEvent = (name, payload) => busModule.emit(name, payload);
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

  // ── W349 — quality.capa.overdue → notification subscriber ──────────
  // Listens on the same bus, normalizes payload + severity, emits
  // `notification.capa.overdue.alert` for downstream notification channels.
  if (busInstance) {
    try {
      const { wireCapaAlerts } = require('../services/quality/capa-alerts-subscriber.service');
      const wired = wireCapaAlerts({ bus: busInstance, logger });
      app._capaAlertsSubscriber = wired;
      logger.info?.(
        '[startup] CAPA alerts subscriber wired (W349): listens on quality.capa.overdue → emits ' +
          wired.downstreamEvent
      );
    } catch (err) {
      logger.warn?.(`[startup] CAPA alerts subscriber failed to wire: ${err.message}`);
    }
  } else {
    logger.info?.('[startup] CAPA alerts subscriber DISABLED (qualityEventBus not loaded)');
  }

  // ── W348 — producers factory ────────────────────────────────────────
  // W346 producers translate audit findings / RCA root causes / FMEA actions
  // into CapaItem creation requests. Factory consumes the same service we
  // just constructed (enforceMfa preserved through the chain).
  try {
    const { createCapaProducers } = require('../services/quality/capa-producers.service');
    app._capaProducers = createCapaProducers({ capaService: service });
    logger.info?.('[startup] CAPA producers wired (W348)');
  } catch (err) {
    logger.warn?.(`[startup] CAPA producers failed to wire: ${err.message}`);
  }

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

  // ── W348 — producer routes ──────────────────────────────────────────
  // POST endpoints that produce a CapaItem from an upstream entity and
  // back-link it on the source sub-doc atomically.
  try {
    const producersRouter = require('../routes/quality/capa-producers.routes');
    app.use('/api/quality/capa-producers', producersRouter);
    app.use('/api/v1/quality/capa-producers', producersRouter);
    logger.info?.('[startup] CAPA producer routes mounted (W348): /api/quality/capa-producers');
  } catch (err) {
    logger.warn?.(`[startup] CAPA producer routes failed to mount: ${err.message}`);
  }

  // ── W350 — branch quality heatmap routes (Phase 9 dashboard) ────────
  // Aggregates CAPA + audit metrics per branch into a traffic-light grid.
  // Read-only; no MFA tier 2 needed; no producers/cron — pure aggregation.
  try {
    const heatmapRouter = require('../routes/quality/branchQualityHeatmap.routes');
    app.use('/api/quality/branch-heatmap', heatmapRouter);
    app.use('/api/v1/quality/branch-heatmap', heatmapRouter);
    logger.info?.(
      '[startup] Branch quality heatmap routes mounted (W350): /api/quality/branch-heatmap'
    );
  } catch (err) {
    logger.warn?.(`[startup] Branch quality heatmap routes failed to mount: ${err.message}`);
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

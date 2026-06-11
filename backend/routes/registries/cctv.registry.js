/**
 * CCTV Route Registry — Phase 27.
 *
 * Mounts the entire CCTV surveillance surface under both `/api/cctv` and
 * `/api/v1/cctv`, plus starts the health-monitor scheduler and the stream
 * reaper. Boot-side: `mountAllRoutes` in _registry.js calls this once.
 *
 * Mounts:
 *   /cctv/cameras         — camera CRUD + sync + stats
 *   /cctv/nvrs            — NVR CRUD + channel discovery
 *   /cctv/events          — event list + ack + link-incident
 *   /cctv/alerts          — alert queue + ack + resolve + escalate
 *   /cctv/streams         — live + playback + PTZ + snapshot
 *   /cctv/recordings      — recording metadata + legal hold
 *   /cctv/webhooks        — Hikvision NVR event push receiver (HMAC verified)
 *   /cctv/ai              — face / ANPR / zones admin + manual dispatch
 *   /cctv/audit           — PDPL audit + grants
 *   /cctv/parent-portal   — parent live-only access
 *   /cctv/admin           — ops dashboards + probe + reaper
 *   /cctv/reports         — fast reports: employees / plates / visitors / AI overview (W1230)
 */
'use strict';

// Tick intervals are lazy-read inside startSchedulers (Phase 27 gotcha — top-level
// process.env reads break under Dynatrace agent injection).

let started = false;
const handles = [];

function startSchedulers(logger) {
  if (started) return;
  started = true;
  const HEALTH_TICK_MS = parseInt(process.env.CCTV_HEALTH_TICK_MS, 10) || 60_000;
  const NVR_TICK_MS = parseInt(process.env.CCTV_NVR_TICK_MS, 10) || 5 * 60_000;
  const REAP_TICK_MS = parseInt(process.env.CCTV_REAP_TICK_MS, 10) || 30_000;
  let healthMonitor;
  let streamService;
  let eventQueue;
  try {
    healthMonitor = require('../../services/cctv/healthMonitor.service');
    streamService = require('../../services/cctv/streamService');
    eventQueue = require('../../services/cctv/eventQueue.service');
  } catch (err) {
    if (logger) logger.warn(`[cctv] schedulers not started: ${err.message}`);
    return;
  }
  if (process.env.CCTV_DISABLE_SCHEDULERS === '1') return;

  // Boot the batched event ingestion flusher. Single biggest scale lever
  // — without this, the webhook hot path does one Mongo write per event.
  try {
    eventQueue.start();
    if (logger)
      logger.info(`[cctv] event queue flusher started (depth cap ${eventQueue.capacity()})`);
  } catch (err) {
    if (logger) logger.warn(`[cctv] event queue start failed: ${err.message}`);
  }

  const h1 = setInterval(() => {
    healthMonitor.tick().catch(err => logger?.debug(`[cctv] health tick: ${err.message}`));
  }, HEALTH_TICK_MS);
  h1.unref?.();
  handles.push(h1);

  const h2 = setInterval(() => {
    healthMonitor.tickNvrs().catch(err => logger?.debug(`[cctv] nvr tick: ${err.message}`));
  }, NVR_TICK_MS);
  h2.unref?.();
  handles.push(h2);

  const h3 = setInterval(() => {
    streamService.reapIdle().catch(err => logger?.debug(`[cctv] reap: ${err.message}`));
  }, REAP_TICK_MS);
  h3.unref?.();
  handles.push(h3);

  if (logger) logger.info('[cctv] schedulers started (health/NVR/reap)');
}

function stopSchedulers() {
  for (const h of handles) clearInterval(h);
  handles.length = 0;
  started = false;
  try {
    require('../../services/cctv/eventQueue.service').stop();
  } catch {
    // ignore
  }
}

function safeMount(app, base, modulePath, logger) {
  try {
    const r = require(modulePath);
    const router = r?.router || r;
    app.use(`/api${base}`, router);
    app.use(`/api/v1${base}`, router);
    if (logger) logger.debug(`[cctv] mounted ${base}`);
    return true;
  } catch (err) {
    if (logger) logger.warn(`[cctv] mount failed for ${base}: ${err.message}`);
    return false;
  }
}

function registerCctvRoutes(app, opts = {}) {
  const { logger } = opts;
  const mounts = [
    ['/cctv/cameras', '../cctv/cameras.routes'],
    ['/cctv/nvrs', '../cctv/nvr.routes'],
    ['/cctv/events', '../cctv/events.routes'],
    ['/cctv/alerts', '../cctv/alerts.routes'],
    ['/cctv/streams', '../cctv/streams.routes'],
    ['/cctv/recordings', '../cctv/recordings.routes'],
    ['/cctv/webhooks', '../cctv/webhooks.routes'],
    ['/cctv/ai', '../cctv/ai.routes'],
    ['/cctv/audit', '../cctv/audit.routes'],
    ['/cctv/parent-portal', '../cctv/parent-portal.routes'],
    ['/cctv/admin', '../cctv/admin.routes'],
    ['/cctv/reports', '../cctv/reports.routes'],
  ];
  let ok = 0;
  for (const [base, mod] of mounts) {
    if (safeMount(app, base, mod, logger)) ok += 1;
  }
  if (logger) logger.info(`[cctv] mounted ${ok}/${mounts.length} route modules`);
  startSchedulers(logger);
  return { mounted: ok, total: mounts.length };
}

module.exports = registerCctvRoutes;
module.exports.startSchedulers = startSchedulers;
module.exports.stopSchedulers = stopSchedulers;

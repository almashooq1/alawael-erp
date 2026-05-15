/**
 * eventQueue — batched ingestion buffer for CctvEvent.
 *
 * Single biggest scale lever for Phase 27. Without batching, each NVR
 * webhook does:
 *   1 webhook POST → 1 Mongo write → 1 qualityEventBus emit → 1 AI dispatch
 *
 * At 5000 cameras × 1 event/sec that's 5000 writes/sec, far beyond what
 * a single Mongo node can sustain without batching.
 *
 * With this queue:
 *   webhook → eventQueue.push (sync, microseconds)
 *   periodic flusher → CctvEvent.insertMany (bulk) → AI dispatch (capped)
 *
 * Backpressure: when the in-memory ring fills, push() returns ok:false so
 * the webhook handler can return 429. Hikvision retries.
 *
 * Tuning (env):
 *   CCTV_QUEUE_CAPACITY      max pending events (default 10000)
 *   CCTV_QUEUE_BATCH         max batch size per flush (default 500)
 *   CCTV_QUEUE_FLUSH_MS      flush cadence in ms (default 250)
 *   CCTV_AI_CONCURRENCY      concurrent AI dispatches (default 16)
 *   CCTV_QUEUE_DISABLE       '1' to disable the flusher (tests)
 */
'use strict';

function _env() {
  return (typeof process !== 'undefined' && process.env) || {};
}
function capacity() {
  return parseInt(_env().CCTV_QUEUE_CAPACITY, 10) || 10_000;
}
function batchSize() {
  return parseInt(_env().CCTV_QUEUE_BATCH, 10) || 500;
}
function flushMs() {
  return parseInt(_env().CCTV_QUEUE_FLUSH_MS, 10) || 250;
}
function aiConcurrency() {
  return parseInt(_env().CCTV_AI_CONCURRENCY, 10) || 16;
}

const ring = [];
let timer = null;
let started = false;
const metrics = {
  enqueued: 0,
  dropped: 0,
  flushed: 0,
  errors: 0,
  highWatermark: 0,
  lastFlushAt: 0,
  lastFlushDurationMs: 0,
};

let CctvEvent = null;
let eventBus = null;
let aiDispatcher = null;
let alertService = null;
let logger = null;

function _lazy() {
  if (!CctvEvent) {
    try {
      ({ CctvEvent } = require('../../models/cctv'));
    } catch (_) {
      // model registration not ready yet
    }
  }
  if (!eventBus) {
    try {
      eventBus = require('../quality/qualityEventBus.service');
    } catch (_) {
      eventBus = null;
    }
  }
  if (!aiDispatcher) {
    try {
      aiDispatcher = require('./ai');
    } catch (_) {
      aiDispatcher = null;
    }
  }
  if (!alertService) {
    try {
      alertService = require('./alertService');
    } catch (_) {
      alertService = null;
    }
  }
  if (!logger) {
    try {
      logger = require('../../utils/logger');
    } catch (_) {
      logger = console;
    }
  }
}

function push(doc) {
  if (!doc) return { ok: false, code: 'NO_DOC' };
  if (ring.length >= capacity()) {
    metrics.dropped += 1;
    return { ok: false, code: 'QUEUE_FULL', depth: ring.length };
  }
  ring.push(doc);
  metrics.enqueued += 1;
  if (ring.length > metrics.highWatermark) metrics.highWatermark = ring.length;
  return { ok: true, depth: ring.length };
}

function depth() {
  return ring.length;
}

function snapshot() {
  return {
    depth: ring.length,
    capacity: capacity(),
    batchSize: batchSize(),
    flushMs: flushMs(),
    aiConcurrency: aiConcurrency(),
    started,
    ...metrics,
  };
}

async function _dispatchAi(events) {
  _lazy();
  if (!aiDispatcher?.dispatch && !alertService?.evaluate) return;
  const conc = aiConcurrency();
  let i = 0;
  async function worker() {
    while (i < events.length) {
      const idx = i++;
      const ev = events[idx];
      if (!ev) continue;
      try {
        if (aiDispatcher?.dispatch) await aiDispatcher.dispatch(ev);
        else if (alertService?.evaluate) await alertService.evaluate(ev);
      } catch (err) {
        metrics.errors += 1;
        logger?.debug?.(`[cctv:queue] AI dispatch error: ${err.message}`);
      }
    }
  }
  const workers = Array.from({ length: Math.min(conc, events.length) }, () => worker());
  await Promise.all(workers);
}

async function flush() {
  _lazy();
  if (ring.length === 0) return { ok: true, flushed: 0 };
  const batch = ring.splice(0, batchSize());
  const start = Date.now();
  let saved = [];
  try {
    if (CctvEvent?.insertMany) {
      saved = await CctvEvent.insertMany(batch, { ordered: false, lean: false }).catch(err => {
        if (err?.writeErrors && Array.isArray(err.writeErrors)) {
          return err.insertedDocs || [];
        }
        metrics.errors += 1;
        logger?.warn?.(`[cctv:queue] insertMany error: ${err.message}`);
        return [];
      });
    }
    metrics.flushed += saved.length;
    metrics.lastFlushAt = Date.now();
    metrics.lastFlushDurationMs = metrics.lastFlushAt - start;

    if (eventBus?.emit) {
      for (const ev of saved) {
        try {
          eventBus.emit('cctv.event', {
            eventId: ev.eventId,
            type: ev.type,
            severity: ev.severity,
            cameraId: ev.cameraId,
            branchCode: ev.branchCode,
            startedAt: ev.startedAt,
          });
        } catch {
          // ignore subscriber errors
        }
      }
    }
    // AI fan-out (capped concurrency, fire-and-forget)
    _dispatchAi(saved).catch(() => {});
    return { ok: true, flushed: saved.length, durationMs: metrics.lastFlushDurationMs };
  } catch (err) {
    metrics.errors += 1;
    logger?.warn?.(`[cctv:queue] flush error: ${err.message}`);
    return { ok: false, error: err.message };
  }
}

function start() {
  if (started) return;
  if (_env().CCTV_QUEUE_DISABLE === '1') return;
  started = true;
  timer = setInterval(() => {
    void flush();
  }, flushMs());
  timer.unref?.();
}

function stop() {
  if (timer) clearInterval(timer);
  timer = null;
  started = false;
}

async function drain(maxIterations = 100) {
  let n = 0;
  while (ring.length > 0 && n < maxIterations) {
    await flush();
    n += 1;
  }
  return ring.length === 0;
}

function _reset() {
  ring.length = 0;
  metrics.enqueued = 0;
  metrics.dropped = 0;
  metrics.flushed = 0;
  metrics.errors = 0;
  metrics.highWatermark = 0;
}

module.exports = {
  push,
  flush,
  start,
  stop,
  drain,
  depth,
  snapshot,
  _reset,
  capacity,
  batchSize,
  flushMs,
  aiConcurrency,
};

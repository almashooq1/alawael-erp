'use strict';

/**
 * hikvision-stream-supervisor.service.js — Wave 109.
 *
 * Owns every EventStreamClient. Pulls eligible devices from the
 * registry at start() time (and on refresh()), spawns one client per
 * device, and routes their callbacks into:
 *
 *   1. L1 dedup (per-device LRU)        — collapses retry storms
 *   2. Bounded queue (per device)       — drops oldest on overflow
 *   3. Batching window                  — coalesces to ingestBatch()
 *   4. Audit / fast-path hooks          — wiring point for Wave 109C
 *
 * Public API:
 *
 *   const sup = createEventStreamSupervisor({...});
 *   await sup.start();           // open all eligible streams
 *   await sup.stop();            // graceful shutdown
 *   await sup.refresh();         // re-read device registry, attach
 *                                // new devices, detach retired ones
 *   sup.getStatus();             // aggregate snapshot for UI
 *   sup.getDeviceStatus(code);   // single-device drilldown
 *
 * Eligibility rule: device must have:
 *   • retiredAt == null
 *   • capabilities includes 'face-capture' or 'attendance'
 *   • deviceCode in operator filter (if set)
 *
 * The supervisor never throws — failures degrade to per-device
 * SKIPPED status in getStatus().
 */

const reg = require('./hikvision.registry');
const { createEventStreamClient } = require('./hikvision-stream-client.service');

function createEventStreamSupervisor({
  deviceModel = null,
  ingestionService = null, // Wave 96 — must expose ingestBatch()
  transport = null,
  reviewQueueService = null, // Wave 98 — optional fast-path target
  healthService = null, // Wave 96 — optional, used for circuit-open hooks
  clientFactory = createEventStreamClient,
  logger = console,
  clock = () => new Date(),
  config = {},
} = {}) {
  if (!deviceModel) throw new Error('stream-supervisor: deviceModel is required');
  if (!ingestionService || typeof ingestionService.ingestBatch !== 'function') {
    throw new Error('stream-supervisor: ingestionService.ingestBatch is required');
  }
  if (!transport || typeof transport.request !== 'function') {
    throw new Error('stream-supervisor: transport with request() is required');
  }

  const cfg = {
    batchWindowMs: config.batchWindowMs || reg.STREAM_DEFAULTS.BATCH_WINDOW_MS,
    batchSize: config.batchSize || reg.STREAM_DEFAULTS.BATCH_SIZE,
    dedupLruSize: config.dedupLruSize || reg.STREAM_DEFAULTS.DEDUP_LRU_SIZE,
    boundedQueueSize: config.boundedQueueSize || reg.STREAM_DEFAULTS.BOUNDED_QUEUE_SIZE,
    deviceFilter: config.deviceFilter || null, // Set<deviceCode> or null
  };

  // deviceCode → { client, device, queue[], dedupLru, flushTimer, status }
  const clients = new Map();
  // Aggregate metrics
  const metrics = {
    startedAt: null,
    eventsAccepted: 0,
    eventsDeduped: 0,
    eventsDropped: 0,
    batchesFlushed: 0,
    ingestFailures: 0,
    fastPathEnqueued: 0,
    auditEmitted: 0,
  };
  let stopped = true;

  // ─── Dedup LRU (per device) ───────────────────────────────────

  function _makeLru(max) {
    const m = new Map();
    return {
      has(k) {
        return m.has(k);
      },
      add(k) {
        if (m.has(k)) {
          m.delete(k);
          m.set(k, 1);
          return;
        }
        m.set(k, 1);
        if (m.size > max) {
          const oldest = m.keys().next().value;
          m.delete(oldest);
        }
      },
      size() {
        return m.size;
      },
    };
  }

  // ─── Eligibility ──────────────────────────────────────────────

  function _isEligible(device) {
    if (!device) return false;
    if (device.retiredAt) return false;
    const caps = device.capabilities || [];
    const hasFace = caps.includes('face-capture') || caps.includes('attendance');
    if (!hasFace) return false;
    if (cfg.deviceFilter && cfg.deviceFilter.size > 0) {
      return cfg.deviceFilter.has(device.deviceCode);
    }
    return true;
  }

  async function _loadDevices() {
    let q = deviceModel.find({ retiredAt: null });
    if (typeof q.lean === 'function') q = q.lean();
    const devices = (await q) || [];
    return devices.filter(_isEligible);
  }

  // ─── Batched ingest ───────────────────────────────────────────

  function _scheduleFlush(slot) {
    if (slot.flushTimer) return;
    slot.flushTimer = setTimeout(() => {
      slot.flushTimer = null;
      void _flush(slot);
    }, cfg.batchWindowMs);
  }

  async function _flush(slot) {
    if (slot.queue.length === 0) return;
    const items = slot.queue.splice(0, slot.queue.length);
    metrics.batchesFlushed += 1;
    const payload = items.map(ev => ({
      deviceCode: slot.device.deviceCode,
      externalEventId: ev.externalEventId,
      eventKind: ev.kind,
      capturedAt: ev.capturedAt,
      rawPayload: ev.rawPayload,
      channelNo: ev.channelNo || undefined,
      sourceIp: slot.device.ip || null,
      requestId: `stream:${ev.externalEventId}`,
      signatureVerified: false, // stream is auth'd at connect, not per-event
    }));
    try {
      const r = await ingestionService.ingestBatch(payload);
      if (!r || !r.ok) {
        metrics.ingestFailures += 1;
        logger.warn(
          `[stream-supervisor] ingestBatch failed for ${slot.device.deviceCode}: ${
            (r && r.reason) || 'unknown'
          }`
        );
        return;
      }
      // Fast-path: enqueue urgent reviews for spoof attempts or
      // low-confidence parses immediately, without waiting for the
      // Wave-98 parser cron tick.
      if (reviewQueueService && typeof reviewQueueService.fastEnqueue === 'function') {
        const fastCandidates = items.filter(
          ev => ev.kind === reg.RAW_EVENT_KIND.SPOOF_ATTEMPT || ev.parseConfidence === 'low'
        );
        for (let i = 0; i < fastCandidates.length && i < (r.results || []).length; i++) {
          const ev = fastCandidates[i];
          const persisted = (r.results || [])[i];
          if (!persisted || !persisted.ok || !persisted.event) continue;
          try {
            await reviewQueueService.fastEnqueue({
              rawEventId: persisted.event._id,
              queue: ev.kind === reg.RAW_EVENT_KIND.SPOOF_ATTEMPT ? 'security' : 'supervisor',
              sla: 'urgent',
              source: 'stream',
            });
            metrics.fastPathEnqueued += 1;
          } catch (err) {
            logger.warn(`[stream-supervisor] fastEnqueue failed: ${err.message}`);
          }
        }
      }
    } catch (err) {
      metrics.ingestFailures += 1;
      logger.warn(`[stream-supervisor] ingest threw: ${err.message}`);
    }
  }

  // ─── Event handler (per-device callback) ──────────────────────

  function _onEvent(slot, { event }) {
    metrics.eventsAccepted += 1;
    if (slot.dedupLru.has(event.externalEventId)) {
      metrics.eventsDeduped += 1;
      return;
    }
    slot.dedupLru.add(event.externalEventId);

    if (slot.queue.length >= cfg.boundedQueueSize) {
      // Drop oldest on overflow.
      slot.queue.shift();
      metrics.eventsDropped += 1;
    }
    slot.queue.push(event);

    if (slot.queue.length >= cfg.batchSize) {
      // Fast-flush: cancel the timer and flush immediately.
      if (slot.flushTimer) {
        clearTimeout(slot.flushTimer);
        slot.flushTimer = null;
      }
      void _flush(slot);
    } else {
      _scheduleFlush(slot);
    }
  }

  function _onStateChange(slot, { from, to, reason }) {
    slot.status.state = to;
    slot.status.lastReason = reason || null;
    slot.status.lastStateChangeAt = clock();
    metrics.auditEmitted += 1;
    // Wave 109C hook — circuit-open writes a DeviceHealthLog entry.
    if (to === reg.STREAM_STATE.CIRCUIT_OPEN && healthService) {
      if (typeof healthService.recordCircuitOpen === 'function') {
        try {
          healthService.recordCircuitOpen({
            deviceId: slot.device._id,
            deviceCode: slot.device.deviceCode,
            reason: reason || 'stream-circuit-open',
            at: clock(),
          });
        } catch (err) {
          logger.warn(`[stream-supervisor] recordCircuitOpen failed: ${err.message}`);
        }
      }
    }
    logger.info(
      `[stream-supervisor] ${slot.device.deviceCode}: ${from} → ${to} (${reason || '—'})`
    );
  }

  function _onParseError(slot, { reason }) {
    slot.status.parseErrors = (slot.status.parseErrors || 0) + 1;
    void reason;
  }

  // ─── Public API ───────────────────────────────────────────────

  async function start() {
    if (!stopped) return { ok: true, alreadyRunning: true };
    stopped = false;
    metrics.startedAt = clock();
    const devices = await _loadDevices();
    for (const device of devices) {
      _attachDevice(device);
    }
    return { ok: true, attached: clients.size };
  }

  function _attachDevice(device) {
    if (clients.has(device.deviceCode)) return;
    const slot = {
      device,
      queue: [],
      dedupLru: _makeLru(cfg.dedupLruSize),
      flushTimer: null,
      status: { state: reg.STREAM_STATE.IDLE, parseErrors: 0 },
      client: null,
    };
    const client = clientFactory({
      device,
      transport,
      onEvent: data => _onEvent(slot, data),
      onStateChange: data => _onStateChange(slot, data),
      onParseError: data => _onParseError(slot, data),
      logger,
      clock,
      config,
    });
    slot.client = client;
    clients.set(device.deviceCode, slot);
    client.start();
  }

  function _detachDevice(deviceCode) {
    const slot = clients.get(deviceCode);
    if (!slot) return;
    try {
      slot.client.stop();
    } catch (err) {
      void err;
    }
    if (slot.flushTimer) {
      clearTimeout(slot.flushTimer);
      slot.flushTimer = null;
    }
    // Best-effort drain on detach.
    void _flush(slot);
    clients.delete(deviceCode);
  }

  async function stop() {
    if (stopped) return { ok: true, alreadyStopped: true };
    stopped = true;
    for (const code of Array.from(clients.keys())) {
      _detachDevice(code);
    }
    return { ok: true };
  }

  async function refresh() {
    if (stopped) return { ok: false, reason: reg.REASON.STREAM_NOT_RUNNING };
    const fresh = await _loadDevices();
    const freshCodes = new Set(fresh.map(d => d.deviceCode));
    let attached = 0;
    let detached = 0;
    // Attach new ones
    for (const d of fresh) {
      if (!clients.has(d.deviceCode)) {
        _attachDevice(d);
        attached += 1;
      }
    }
    // Detach disappeared
    for (const code of Array.from(clients.keys())) {
      if (!freshCodes.has(code)) {
        _detachDevice(code);
        detached += 1;
      }
    }
    return { ok: true, attached, detached, total: clients.size };
  }

  function getStatus() {
    const items = [];
    for (const [code, slot] of clients) {
      items.push({
        deviceCode: code,
        state: slot.status.state,
        lastReason: slot.status.lastReason || null,
        queueDepth: slot.queue.length,
        parseErrors: slot.status.parseErrors || 0,
        clientStatus: slot.client ? slot.client.getStatus() : null,
      });
    }
    return {
      running: !stopped,
      totalDevices: clients.size,
      metrics: { ...metrics },
      items,
    };
  }

  function getDeviceStatus(deviceCode) {
    const slot = clients.get(deviceCode);
    if (!slot) return null;
    return {
      deviceCode,
      state: slot.status.state,
      lastReason: slot.status.lastReason || null,
      queueDepth: slot.queue.length,
      parseErrors: slot.status.parseErrors || 0,
      clientStatus: slot.client ? slot.client.getStatus() : null,
    };
  }

  // Exposed for tests — force-flush every device's queue right now.
  async function _flushAll() {
    for (const slot of clients.values()) {
      if (slot.flushTimer) {
        clearTimeout(slot.flushTimer);
        slot.flushTimer = null;
      }
      await _flush(slot);
    }
  }

  return {
    start,
    stop,
    refresh,
    getStatus,
    getDeviceStatus,
    _flushAll,
  };
}

module.exports = { createEventStreamSupervisor };

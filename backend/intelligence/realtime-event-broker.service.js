'use strict';

/**
 * realtime-event-broker.service.js — Wave 135.
 *
 * In-process pub/sub broker with Server-Sent-Events support. Lets
 * dashboards (branch manager, security, fleet, etc.) replace polling
 * with a long-lived HTTP/SSE connection that streams attendance
 * lifecycle events in real time.
 *
 * Why SSE (not WebSocket):
 *   - One-way server→client matches our usage perfectly
 *   - Works through corporate proxies that block WS
 *   - Auto-reconnect built into the browser EventSource API
 *   - No frame-control complexity — just HTTP chunked transfer
 *
 * Wires to the Wave 130 outbox emitter: the consumer for the outbox
 * is the broker itself — outbox dispatch → broker.publish() → all
 * matching subscribers receive the event.
 *
 * Filter model:
 *   subscribe({ topic?, branchId?, employeeId?, severity? }) returns
 *   a subscription object. publish({ topic, payload, meta }) fans
 *   out to all subscriptions whose filter matches.
 *
 * Idempotency:
 *   - publish() with the same eventId is no-op (recent ring buffer).
 *   - Backpressure: each subscription has a bounded queue
 *     (DEFAULT_BUFFER_SIZE). On overflow, OLDEST events drop with a
 *     synthetic `__overflow` marker emitted so clients can detect
 *     they fell behind.
 *
 * Public API:
 *   subscribe({ filter, onEvent, onClose? })
 *   unsubscribe(subscription)
 *   publish({ eventId, topic, payload, meta? })
 *   stats()
 *
 * The HTTP/SSE adapter (toSseHandler) wraps subscribe() into an
 * Express-compatible handler.
 */

const DEFAULT_BUFFER_SIZE = 200;
const RECENT_EVENT_BUFFER = 256;

function createRealtimeEventBroker({
  bufferSize = DEFAULT_BUFFER_SIZE,
  recentEventBuffer = RECENT_EVENT_BUFFER,
  logger = console,
  now = () => new Date(),
} = {}) {
  let _subCounter = 0;
  const _subscriptions = new Map(); // id → sub

  // LRU of recent event ids for idempotency.
  const _recentIds = [];
  const _recentSet = new Set();
  function _seen(id) {
    if (_recentSet.has(id)) return true;
    _recentIds.push(id);
    _recentSet.add(id);
    while (_recentIds.length > recentEventBuffer) {
      const evicted = _recentIds.shift();
      _recentSet.delete(evicted);
    }
    return false;
  }

  function _matches(filter, event) {
    if (!filter) return true;
    if (filter.topic) {
      if (Array.isArray(filter.topic)) {
        if (!filter.topic.includes(event.topic)) return false;
      } else if (event.topic !== filter.topic) {
        return false;
      }
    }
    if (filter.branchId && String((event.meta || {}).branchId) !== String(filter.branchId)) {
      return false;
    }
    if (filter.employeeId && String((event.meta || {}).employeeId) !== String(filter.employeeId)) {
      return false;
    }
    if (filter.severity) {
      const sev = (event.meta || {}).severity;
      if (Array.isArray(filter.severity)) {
        if (!filter.severity.includes(sev)) return false;
      } else if (sev !== filter.severity) {
        return false;
      }
    }
    return true;
  }

  function subscribe({ filter = null, onEvent = null, onClose = null } = {}) {
    if (typeof onEvent !== 'function') {
      return { ok: false, reason: 'onEvent required' };
    }
    const id = ++_subCounter;
    const sub = {
      id,
      filter: filter || {},
      onEvent,
      onClose: typeof onClose === 'function' ? onClose : null,
      queue: [],
      droppedCount: 0,
      createdAt: now(),
      lastEventAt: null,
      closed: false,
    };
    _subscriptions.set(id, sub);
    return { ok: true, subscription: sub };
  }

  function unsubscribe(sub) {
    if (!sub || !_subscriptions.has(sub.id)) return false;
    sub.closed = true;
    _subscriptions.delete(sub.id);
    if (sub.onClose) {
      try {
        sub.onClose();
      } catch (err) {
        logger.warn(`[realtime] onClose threw: ${err.message}`);
      }
    }
    return true;
  }

  function _deliver(sub, event) {
    if (sub.closed) return;
    if (sub.queue.length >= bufferSize) {
      sub.queue.shift();
      sub.droppedCount += 1;
      // Emit overflow synthetic event so client can re-sync.
      try {
        sub.onEvent({
          eventId: `__overflow-${sub.droppedCount}`,
          topic: '__overflow',
          payload: { droppedCount: sub.droppedCount },
          meta: { __synthetic: true },
          at: now().toISOString(),
        });
      } catch (err) {
        logger.warn(`[realtime] overflow notify failed: ${err.message}`);
      }
    }
    sub.queue.push(event);
    sub.lastEventAt = now();
    try {
      sub.onEvent(event);
    } catch (err) {
      logger.warn(`[realtime] onEvent threw: ${err.message}`);
    }
  }

  function publish({ eventId, topic, payload, meta = null } = {}) {
    if (!topic || !eventId || payload === undefined || payload === null) {
      return { ok: false, reason: 'VALIDATION_FAILED' };
    }
    if (_seen(eventId)) {
      return { ok: true, idempotent: true, delivered: 0 };
    }
    const event = {
      eventId,
      topic,
      payload,
      meta: meta || {},
      at: now().toISOString(),
    };
    let delivered = 0;
    for (const sub of _subscriptions.values()) {
      if (_matches(sub.filter, event)) {
        _deliver(sub, event);
        delivered += 1;
      }
    }
    return { ok: true, delivered, subscriberCount: _subscriptions.size };
  }

  function stats() {
    let totalQueued = 0;
    let totalDropped = 0;
    for (const sub of _subscriptions.values()) {
      totalQueued += sub.queue.length;
      totalDropped += sub.droppedCount;
    }
    return {
      activeSubscriptions: _subscriptions.size,
      totalQueued,
      totalDropped,
      recentEventCacheSize: _recentIds.length,
    };
  }

  // ─── SSE HTTP adapter ──────────────────────────────────────

  /**
   * Express-compatible SSE handler. Mount with:
   *   app.get('/api/v1/attendance/stream', broker.toSseHandler(opts));
   *
   * Query params accepted: topic, branchId, employeeId, severity.
   * Heartbeat sent every heartbeatSeconds (default 25) to keep idle
   * connections alive past corporate-proxy idle timeouts.
   */
  function toSseHandler({ heartbeatSeconds = 25, authorize = null } = {}) {
    return function sseHandler(req, res) {
      if (typeof authorize === 'function') {
        try {
          const ok = authorize(req);
          if (!ok) {
            res.statusCode = 403;
            return res.end('forbidden');
          }
        } catch (err) {
          logger.warn(`[realtime] authorize threw: ${err.message}`);
          res.statusCode = 500;
          return res.end('server error');
        }
      }
      res.statusCode = 200;
      if (typeof res.setHeader === 'function') {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no'); // nginx
      }
      if (typeof res.flushHeaders === 'function') res.flushHeaders();
      // Comment to open the stream.
      res.write(': stream-opened\n\n');

      const filter = {
        topic: req.query && req.query.topic,
        branchId: req.query && req.query.branchId,
        employeeId: req.query && req.query.employeeId,
        severity: req.query && req.query.severity,
      };

      const { subscription } = subscribe({
        filter,
        onEvent: event => {
          try {
            const lines = [];
            if (event.eventId) lines.push(`id: ${event.eventId}`);
            if (event.topic) lines.push(`event: ${event.topic}`);
            const data = JSON.stringify({
              payload: event.payload,
              meta: event.meta,
              at: event.at,
            });
            for (const line of data.split('\n')) lines.push(`data: ${line}`);
            res.write(lines.join('\n') + '\n\n');
          } catch (err) {
            logger.warn(`[realtime] sse write failed: ${err.message}`);
          }
        },
        onClose: () => {
          try {
            res.end();
          } catch (_e) {
            void _e;
          }
        },
      });

      const heartbeat = setInterval(
        () => {
          try {
            res.write(`: heartbeat ${now().toISOString()}\n\n`);
          } catch (err) {
            logger.warn(`[realtime] heartbeat write failed: ${err.message}`);
          }
        },
        Math.max(5, heartbeatSeconds) * 1000
      );

      const cleanup = () => {
        clearInterval(heartbeat);
        unsubscribe(subscription);
      };
      if (req && typeof req.on === 'function') {
        req.on('close', cleanup);
        req.on('error', cleanup);
      }
    };
  }

  return {
    subscribe,
    unsubscribe,
    publish,
    stats,
    toSseHandler,
    DEFAULT_BUFFER_SIZE,
  };
}

module.exports = {
  createRealtimeEventBroker,
  DEFAULT_BUFFER_SIZE,
};

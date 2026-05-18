'use strict';

/**
 * hikvision-stream-client.service.js — Wave 109.
 *
 * Long-lived per-device client for Hikvision's ISAPI alert stream
 * (multipart/mixed at /ISAPI/Event/notification/alertStream).
 *
 * Responsibilities:
 *   • Open + maintain a single HTTP/1.1 connection to the device.
 *   • Pump bytes through parseStreamChunk → parseStreamPart.
 *   • Emit normalised events to a single onEvent callback.
 *   • Detect transport failures + half-open TCP via a watchdog.
 *   • Reconnect with exponential backoff.
 *   • Open the circuit breaker after repeated failures so the
 *     supervisor can stop spinning on a dead device.
 *
 * NON-responsibilities:
 *   • Deduplication — done by the supervisor (L1 LRU).
 *   • Persistence — done by the supervisor (batched ingest).
 *   • Audit logging — emitted via onStateChange + onEvent;
 *     consumed by the supervisor.
 *
 * Lifecycle:
 *   const c = createEventStreamClient({ device, transport, ... });
 *   c.start();           // begins connecting + reconnect loop
 *   c.stop();            // graceful shutdown
 *   c.getState();        // current STREAM_STATE
 *
 * Callbacks (injected via opts):
 *   onEvent({ deviceCode, event })
 *   onStateChange({ deviceCode, from, to, reason? })
 *   onParseError({ deviceCode, reason, raw })
 */

const reg = require('./hikvision.registry');
const { parseStreamChunk, parseStreamPart } = require('./hikvision-stream-parser');

function createEventStreamClient({
  device, // { _id, deviceCode, ip, port, protocol, authMode, credentialsRef, capabilities }
  transport, // { request, abort }
  onEvent = () => {},
  onStateChange = () => {},
  onParseError = () => {},
  logger = console,
  clock = () => new Date(),
  config = {},
} = {}) {
  if (!device || !device.deviceCode) {
    throw new Error('hikvision-stream-client: device with deviceCode is required');
  }
  if (!transport || typeof transport.request !== 'function') {
    throw new Error('hikvision-stream-client: transport with request() is required');
  }

  const cfg = {
    backoffMs: config.backoffMs || reg.STREAM_DEFAULTS.BACKOFF_MS,
    circuitOpenAfterFailures:
      config.circuitOpenAfterFailures || reg.STREAM_DEFAULTS.CIRCUIT_OPEN_AFTER_FAILURES,
    circuitHalfOpenAfterMs:
      config.circuitHalfOpenAfterMs || reg.STREAM_DEFAULTS.CIRCUIT_HALF_OPEN_AFTER_MS,
    idleTimeoutMs: config.idleTimeoutMs || reg.STREAM_DEFAULTS.IDLE_TIMEOUT_MS,
    watchdogIntervalMs: config.watchdogIntervalMs || reg.STREAM_DEFAULTS.WATCHDOG_INTERVAL_MS,
    maxSilenceMs: config.maxSilenceMs || reg.STREAM_DEFAULTS.MAX_SILENCE_MS,
  };

  const url = `${device.protocol === 'https' ? 'https' : 'http'}://${device.ip}:${
    device.port || 80
  }/ISAPI/Event/notification/alertStream`;

  // ─── State ────────────────────────────────────────────────────
  let state = reg.STREAM_STATE.IDLE;
  let consecutiveFailures = 0;
  let backoffIndex = 0;
  let reconnectTimer = null;
  let watchdogTimer = null;
  let circuitTimer = null;
  let currentBody = null;
  let pendingBuffer = Buffer.alloc(0);
  let lastBytesAt = null;
  let stopRequested = false;

  // Metrics
  const metrics = {
    eventsReceived: 0,
    eventsEmitted: 0,
    parseErrors: 0,
    connectAttempts: 0,
    reconnects: 0,
    bytesIn: 0,
    lastConnectedAt: null,
    lastEventAt: null,
  };

  function _transition(to, reason) {
    if (state === to) return;
    const from = state;
    state = to;
    try {
      onStateChange({ deviceCode: device.deviceCode, from, to, reason: reason || null });
    } catch (err) {
      logger.warn(`[stream-client ${device.deviceCode}] onStateChange threw: ${err.message}`);
    }
  }

  function _clearTimers() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (watchdogTimer) {
      clearInterval(watchdogTimer);
      watchdogTimer = null;
    }
    if (circuitTimer) {
      clearTimeout(circuitTimer);
      circuitTimer = null;
    }
  }

  function _scheduleReconnect(reason) {
    if (stopRequested) return;
    if (consecutiveFailures >= cfg.circuitOpenAfterFailures) {
      _openCircuit(reason);
      return;
    }
    const idx = Math.min(backoffIndex, cfg.backoffMs.length - 1);
    const delay = cfg.backoffMs[idx];
    backoffIndex += 1;
    _transition(reg.STREAM_STATE.RECONNECTING, reason);
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      void _connect();
    }, delay);
  }

  function _openCircuit(reason) {
    _transition(reg.STREAM_STATE.CIRCUIT_OPEN, reason || reg.REASON.STREAM_CIRCUIT_OPEN);
    circuitTimer = setTimeout(() => {
      circuitTimer = null;
      _transition(reg.STREAM_STATE.HALF_OPEN, 'circuit-half-open-probe');
      void _connect();
    }, cfg.circuitHalfOpenAfterMs);
  }

  function _onConnected() {
    consecutiveFailures = 0;
    backoffIndex = 0;
    metrics.lastConnectedAt = clock();
    metrics.reconnects += 1;
    lastBytesAt = clock();
    _transition(reg.STREAM_STATE.CONNECTED, 'connected');
    _startWatchdog();
  }

  function _onFailure(reason) {
    if (stopRequested) return;
    consecutiveFailures += 1;
    _closeBody();
    _stopWatchdog();
    _scheduleReconnect(reason);
  }

  function _startWatchdog() {
    _stopWatchdog();
    watchdogTimer = setInterval(() => {
      if (!lastBytesAt) return;
      const silenceMs = clock().getTime() - lastBytesAt.getTime();
      if (silenceMs > cfg.maxSilenceMs) {
        logger.warn(
          `[stream-client ${device.deviceCode}] watchdog: ${silenceMs}ms silence — reconnect`
        );
        _onFailure('watchdog-silence');
      }
    }, cfg.watchdogIntervalMs);
  }

  function _stopWatchdog() {
    if (watchdogTimer) {
      clearInterval(watchdogTimer);
      watchdogTimer = null;
    }
  }

  function _closeBody() {
    if (currentBody) {
      try {
        if (typeof currentBody.destroy === 'function') currentBody.destroy();
        else if (typeof currentBody.end === 'function') currentBody.end();
      } catch (err) {
        void err;
      }
      currentBody = null;
    }
    pendingBuffer = Buffer.alloc(0);
  }

  async function _connect() {
    if (stopRequested) return;
    _transition(reg.STREAM_STATE.CONNECTING, 'attempt');
    metrics.connectAttempts += 1;

    let resp;
    try {
      resp = await transport.request({
        method: 'GET',
        url,
        meta: { deviceCode: device.deviceCode },
        headers: { Accept: 'multipart/mixed' },
        credentialsRef: device.credentialsRef || null,
      });
    } catch (err) {
      _onFailure(`transport-error: ${err.message}`);
      return;
    }

    if (!resp || resp.status >= 400) {
      const code = resp ? resp.status : 0;
      logger.warn(`[stream-client ${device.deviceCode}] HTTP ${code}`);
      _onFailure(`http-${code}`);
      return;
    }

    // Extract multipart boundary
    const ct = String((resp.headers && resp.headers['content-type']) || '');
    const m = /boundary=([^;]+)/.exec(ct);
    const boundary = m ? m[1].trim().replace(/"/g, '') : null;
    if (!boundary) {
      _onFailure('no-multipart-boundary');
      return;
    }

    currentBody = resp.body;
    _attachBodyHandlers(currentBody, boundary);
    _onConnected();
  }

  function _attachBodyHandlers(body, boundary) {
    if (!body || typeof body.on !== 'function') {
      _onFailure('body-not-readable');
      return;
    }
    body.on('data', chunk => {
      lastBytesAt = clock();
      metrics.bytesIn += chunk.length;
      const combined = Buffer.concat([pendingBuffer, chunk]);
      const { parts, remainder } = parseStreamChunk(combined, boundary);
      pendingBuffer = remainder;
      for (const part of parts) {
        const r = parseStreamPart({
          headers: part.headers,
          body: part.body,
          deviceCode: device.deviceCode,
          serverNow: clock(),
        });
        if (!r.ok) {
          if (r.skipReason) continue; // image part etc.
          metrics.parseErrors += 1;
          try {
            onParseError({
              deviceCode: device.deviceCode,
              reason: r.reason,
              raw: part.body.slice(0, 400),
            });
          } catch (err) {
            void err;
          }
          continue;
        }
        metrics.eventsReceived += 1;
        try {
          onEvent({ deviceCode: device.deviceCode, event: r.event });
          metrics.eventsEmitted += 1;
          metrics.lastEventAt = clock();
        } catch (err) {
          logger.warn(`[stream-client ${device.deviceCode}] onEvent threw: ${err.message}`);
        }
      }
    });
    body.on('end', () => {
      if (!stopRequested) _onFailure('body-end');
    });
    body.on('error', err => {
      logger.warn(`[stream-client ${device.deviceCode}] body error: ${err.message}`);
      _onFailure(`body-error: ${err.message}`);
    });
  }

  // ─── Public API ──────────────────────────────────────────────

  function start() {
    if (stopRequested) {
      stopRequested = false;
    }
    if (state === reg.STREAM_STATE.CONNECTING || state === reg.STREAM_STATE.CONNECTED) {
      return;
    }
    void _connect();
  }

  function stop() {
    stopRequested = true;
    _clearTimers();
    _closeBody();
    _transition(reg.STREAM_STATE.STOPPED, 'operator-stop');
  }

  function getState() {
    return state;
  }

  function getStatus() {
    return {
      deviceCode: device.deviceCode,
      state,
      consecutiveFailures,
      backoffIndex,
      lastBytesAt,
      metrics: { ...metrics },
    };
  }

  return {
    start,
    stop,
    getState,
    getStatus,
    // exposed for tests:
    _onParse: parseStreamPart,
  };
}

module.exports = { createEventStreamClient };

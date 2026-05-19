'use strict';

/**
 * llm-anomaly-dispatcher.service.js — Wave 146.
 *
 * Diff + dispatch layer on top of Wave 142 (detector) + Wave 144
 * (history). Compares the latest detection result against the
 * previous one in-process and fires "anomaly-fired" / "anomaly-
 * resolved" events to configured channels.
 *
 * Without a dispatcher, the only way an operator learns of a new
 * COST_SPIKE is by opening the dashboard. With this wave, an event
 * fires the moment the 10-min scan picks it up.
 *
 * Public API:
 *   createLlmAnomalyDispatcher({ channels, logger, now, rateLimitMs })
 *     → { dispatch, _reset }
 *
 *   dispatch({ detectionResult, source })
 *     → { ok, fired[], resolved[], skipped[], channelResults[] }
 *
 * Semantics:
 *   - "fired" = id in current detection but not in previous
 *   - "resolved" = id in previous detection but not in current
 *   - Per-id cooldown: after firing event X, suppress repeat fires
 *     of the same id until rateLimitMs (default 60s) elapses. The
 *     anomaly stays in the "active" set so resolved still fires
 *     correctly when it actually disappears.
 *   - Each channel is invoked independently — a throwing channel
 *     does NOT stop other channels.
 *
 * Channel contract:
 *   channel.name (string)
 *   channel.deliver({ kind, anomaly, detectionResult }) → Promise<{ok}>
 *
 *   kind: 'anomaly-fired' | 'anomaly-resolved'
 */

const EVENT_KIND = Object.freeze({
  FIRED: 'anomaly-fired',
  RESOLVED: 'anomaly-resolved',
});

const REASON = Object.freeze({
  DETECTION_NOT_OK: 'LLM_DISPATCHER_DETECTION_NOT_OK',
  CHANNEL_FAILED: 'LLM_DISPATCHER_CHANNEL_FAILED',
});

function createLlmAnomalyDispatcher({
  channels = [],
  logger = console,
  now = () => new Date(),
  rateLimitMs = 60_000,
} = {}) {
  // Per-channel sanity check — a bad channel registration crashes
  // immediately rather than mysteriously dropping events.
  for (const [i, c] of channels.entries()) {
    if (!c || typeof c.deliver !== 'function' || typeof c.name !== 'string') {
      throw new Error(`llm-anomaly-dispatcher: channels[${i}] missing .name or .deliver`);
    }
  }

  // Previous detection snapshot (Map<id, anomaly>). null until first
  // dispatch — guarantees we don't emit "fired" for everything on
  // boot (which would spam channels with already-known state).
  let prevById = null;

  // Per-id last-fired timestamp. Used to apply rateLimitMs cooldown.
  const lastFiredAt = new Map();

  function _resetState() {
    prevById = null;
    lastFiredAt.clear();
  }

  async function _deliverToAll(event) {
    const results = [];
    for (const ch of channels) {
      try {
        const r = await ch.deliver(event);
        results.push({ channel: ch.name, ok: r && r.ok !== false });
      } catch (err) {
        logger.warn &&
          logger.warn(`[llm-anomaly-dispatcher] channel ${ch.name} threw: ${err.message}`);
        results.push({
          channel: ch.name,
          ok: false,
          reason: REASON.CHANNEL_FAILED,
          message: err.message,
        });
      }
    }
    return results;
  }

  async function dispatch({ detectionResult, source = 'scheduler' } = {}) {
    if (!detectionResult || detectionResult.ok === false) {
      return {
        ok: false,
        reason: REASON.DETECTION_NOT_OK,
        message: (detectionResult && detectionResult.message) || 'detection.ok=false',
      };
    }

    const curItems = Array.isArray(detectionResult.items) ? detectionResult.items : [];
    const curById = new Map(curItems.map(a => [a.id, a]));
    const nowMs = now().getTime();

    const fired = [];
    const resolved = [];
    const skipped = [];

    // FIRST dispatch — establish baseline silently. We do NOT emit
    // "fired" for the initial state because the operator may have
    // already been aware of pre-existing anomalies.
    if (prevById === null) {
      prevById = curById;
      for (const id of curById.keys()) lastFiredAt.set(id, nowMs);
      return { ok: true, fired: [], resolved: [], skipped: [], channelResults: [], baseline: true };
    }

    // Fired: in current but not in previous
    for (const [id, anomaly] of curById) {
      if (prevById.has(id)) continue;
      const last = lastFiredAt.get(id) || 0;
      if (nowMs - last < rateLimitMs) {
        skipped.push({
          id,
          reason: 'rate-limited',
          cooldownRemainsMs: rateLimitMs - (nowMs - last),
        });
        continue;
      }
      fired.push(anomaly);
      lastFiredAt.set(id, nowMs);
    }

    // Resolved: in previous but not in current
    for (const [id, anomaly] of prevById) {
      if (curById.has(id)) continue;
      resolved.push(anomaly);
    }

    prevById = curById;

    // Channel delivery — fired first, then resolved, each in order.
    const channelResults = [];
    for (const a of fired) {
      const rs = await _deliverToAll({
        kind: EVENT_KIND.FIRED,
        anomaly: a,
        source,
        detectedAt: now().toISOString(),
      });
      channelResults.push({ id: a.id, kind: EVENT_KIND.FIRED, channels: rs });
    }
    for (const a of resolved) {
      const rs = await _deliverToAll({
        kind: EVENT_KIND.RESOLVED,
        anomaly: a,
        source,
        detectedAt: now().toISOString(),
      });
      channelResults.push({ id: a.id, kind: EVENT_KIND.RESOLVED, channels: rs });
    }

    return { ok: true, fired, resolved, skipped, channelResults };
  }

  return { dispatch, _reset: _resetState };
}

module.exports = {
  createLlmAnomalyDispatcher,
  EVENT_KIND,
  REASON,
};

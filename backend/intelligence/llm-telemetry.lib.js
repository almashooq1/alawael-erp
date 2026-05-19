'use strict';

/**
 * llm-telemetry.lib.js — Wave 128 / P3.6 + shared infra.
 *
 * Reusable rolling-window telemetry collector for any LLM service.
 * Extracted from Wave 126 (parent-chatbot-llm.service.js) so the
 * same observability pattern can wrap care-plan-llm-caller (Wave 48)
 * and any future LLM integration.
 *
 * Public factory:
 *
 *   createLlmTelemetry({
 *     windowMs?,         rolling-time bound (default 7d)
 *     maxCalls?,         hard cap on retained records (default 10K)
 *     inputUsdPer1M?,    cost per million INPUT tokens (default 0.80)
 *     outputUsdPer1M?,   cost per million OUTPUT tokens (default 4.00)
 *     now?               injectable clock (default Date.now)
 *   }) → { recordCall, getTelemetry, reset, size }
 *
 * Cost defaults match Claude Haiku 4.5 pricing. Services using more
 * expensive models (Opus / Sonnet) should override the rates at
 * factory-construction time.
 *
 * `recordCall(rec)` accepts:
 *   {
 *     source: 'llm' | 'cache' | 'reject' | 'unknown',
 *     intent?: string,              // any per-call label (intent, plan-id, etc.)
 *     tokensIn?: number,
 *     tokensOut?: number,
 *     elapsedMs?: number,
 *     success?: boolean,
 *     reason?: string,              // failure category, e.g. TIMEOUT
 *   }
 *
 * `getTelemetry({since?, bucketHours?})` returns:
 *   {
 *     ok, since, until, windowMs,
 *     totals: { calls, llmCalls, cacheHits, rejects, failures,
 *               tokensIn, tokensOut, costUsd,
 *               cacheHitRate, fallbackRate, failureRate, avgLatencyMs },
 *     byReason: { TIMEOUT: N, INVALID_RESPONSE: N, ... },
 *     byIntent: { greeting: N, ... },
 *     buckets:  [{ at, calls, llmCalls, cacheHits, tokensIn, tokensOut, costUsd }],
 *   }
 *
 * Pure (no I/O). Pruning happens on every `recordCall` (both age + count).
 */

const DEFAULTS = Object.freeze({
  windowMs: 7 * 24 * 60 * 60 * 1000,
  maxCalls: 10_000,
  inputUsdPer1M: 0.8,
  outputUsdPer1M: 4.0,
  bucketHours: 1,
});

function _round4(n) {
  return Math.round(Number(n) * 10000) / 10000;
}

function _round6(n) {
  return Math.round(Number(n) * 1_000_000) / 1_000_000;
}

function createLlmTelemetry({
  windowMs = DEFAULTS.windowMs,
  maxCalls = DEFAULTS.maxCalls,
  inputUsdPer1M = DEFAULTS.inputUsdPer1M,
  outputUsdPer1M = DEFAULTS.outputUsdPer1M,
  now = () => Date.now(),
} = {}) {
  const buffer = [];

  function recordCall(rec = {}) {
    buffer.push({
      at: now(),
      source: rec.source || 'unknown',
      intent: rec.intent || null,
      tokensIn: Number.isFinite(rec.tokensIn) ? rec.tokensIn : 0,
      tokensOut: Number.isFinite(rec.tokensOut) ? rec.tokensOut : 0,
      elapsedMs: Number.isFinite(rec.elapsedMs) ? rec.elapsedMs : 0,
      success: Boolean(rec.success),
      reason: rec.reason || null,
    });
    while (buffer.length > maxCalls) buffer.shift();
    const cutoff = now() - windowMs;
    while (buffer.length > 0 && buffer[0].at < cutoff) buffer.shift();
  }

  function _costOf(tokensIn, tokensOut) {
    return _round6(
      (tokensIn * inputUsdPer1M) / 1_000_000 + (tokensOut * outputUsdPer1M) / 1_000_000
    );
  }

  function getTelemetry({ since = null, bucketHours = DEFAULTS.bucketHours } = {}) {
    const sinceMs = since ? new Date(since).getTime() : now() - windowMs;
    const calls = buffer.filter(c => c.at >= sinceMs);

    const totals = {
      calls: calls.length,
      llmCalls: 0,
      cacheHits: 0,
      rejects: 0,
      failures: 0,
      tokensIn: 0,
      tokensOut: 0,
    };
    const byReason = {};
    const byIntent = {};
    let latencySum = 0;
    let latencyN = 0;

    for (const c of calls) {
      if (c.source === 'llm' && c.success) {
        totals.llmCalls++;
        totals.tokensIn += c.tokensIn;
        totals.tokensOut += c.tokensOut;
        if (c.elapsedMs > 0) {
          latencySum += c.elapsedMs;
          latencyN++;
        }
      } else if (c.source === 'cache' && c.success) {
        totals.cacheHits++;
      } else if (c.source === 'reject') {
        totals.rejects++;
      } else if (!c.success) {
        totals.failures++;
      }
      if (c.intent) byIntent[c.intent] = (byIntent[c.intent] || 0) + 1;
      if (c.reason) byReason[c.reason] = (byReason[c.reason] || 0) + 1;
    }

    const denom = totals.calls || 1;
    const cacheHitRate = _round4(totals.cacheHits / denom);
    const fallbackRate = _round4((totals.rejects + totals.failures) / denom);
    const failureRate = _round4(totals.failures / denom);
    const avgLatencyMs = latencyN > 0 ? Math.round(latencySum / latencyN) : 0;

    const bucketMs = Math.max(1, Number(bucketHours)) * 3600 * 1000;
    const bucketsMap = new Map();
    for (const c of calls) {
      const bucketStart = Math.floor(c.at / bucketMs) * bucketMs;
      if (!bucketsMap.has(bucketStart)) {
        bucketsMap.set(bucketStart, {
          at: new Date(bucketStart).toISOString(),
          calls: 0,
          llmCalls: 0,
          cacheHits: 0,
          tokensIn: 0,
          tokensOut: 0,
        });
      }
      const b = bucketsMap.get(bucketStart);
      b.calls++;
      if (c.source === 'llm' && c.success) {
        b.llmCalls++;
        b.tokensIn += c.tokensIn;
        b.tokensOut += c.tokensOut;
      } else if (c.source === 'cache' && c.success) {
        b.cacheHits++;
      }
    }
    const buckets = Array.from(bucketsMap.values())
      .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
      .map(b => ({ ...b, costUsd: _costOf(b.tokensIn, b.tokensOut) }));

    return {
      ok: true,
      since: new Date(sinceMs).toISOString(),
      until: new Date(now()).toISOString(),
      windowMs: now() - sinceMs,
      totals: {
        ...totals,
        costUsd: _costOf(totals.tokensIn, totals.tokensOut),
        cacheHitRate,
        fallbackRate,
        failureRate,
        avgLatencyMs,
      },
      byReason,
      byIntent,
      buckets,
    };
  }

  function reset() {
    buffer.length = 0;
  }

  function size() {
    return buffer.length;
  }

  return { recordCall, getTelemetry, reset, size };
}

module.exports = {
  createLlmTelemetry,
  DEFAULTS,
};

'use strict';

/**
 * parent-chatbot-llm.service.js — Wave 123 / P3.6 Phase 2b.
 *
 * LLM-backed intent classifier for the Parent Chatbot. Replaces the
 * Wave 120 rule-based classifier as the PRIMARY path; rule-based
 * remains the FALLBACK whenever the LLM is unavailable or rejects
 * the message.
 *
 * Architecture mirrors `care-plan-llm-caller.service.js` (Wave 48):
 *   - dependency-injected Anthropic client (real or mock)
 *   - timeout enforcement + bounded retries on transient errors
 *   - never throws to the caller — degraded paths surface a REASON
 *   - LRU + TTL cache so repeated identical messages cost zero tokens
 *
 * Public API:
 *   classify(message)
 *     → { ok: true, intent, confidence, source: 'llm'|'cache', raw, usage? }
 *     | { ok: false, reason }
 *
 *   available()
 *     → true iff the injected client is usable
 *
 *   resetCache()                  exposed for tests
 *   _cacheSize()                  exposed for tests
 *
 * Design choices:
 *   - **JSON-only response shape.** System prompt forces the model to
 *     return `{"intent": "<name>", "confidence": <0..1>}`. Anything
 *     else (markdown fences, prose, malformed JSON) → INVALID_RESPONSE.
 *   - **Intent enum is enforced.** If the LLM returns an intent name
 *     outside the registry, we coerce to UNKNOWN rather than trusting
 *     it.
 *   - **Cache key = normalized message.** Identical questions (after
 *     Arabic diacritics + whitespace normalization) share a cache
 *     entry. TTL 5 min, max 256 entries, LRU eviction.
 *   - **Tight defaults** because the chatbot UX needs sub-second
 *     responses: Haiku 4.5 / max_tokens 100 / timeout 5s / 1 retry.
 */

const reg = require('./parent-chatbot.registry');
const { createLlmTelemetry } = require('./llm-telemetry.lib');

const REASON = Object.freeze({
  CLIENT_MISSING: 'CLIENT_MISSING',
  CLIENT_THREW: 'CLIENT_THREW',
  TIMEOUT: 'TIMEOUT',
  EMPTY_RESPONSE: 'EMPTY_RESPONSE',
  INVALID_RESPONSE: 'INVALID_RESPONSE',
  MESSAGE_REQUIRED: 'MESSAGE_REQUIRED',
});

const DEFAULTS = Object.freeze({
  model: 'claude-haiku-4-5-20251001',
  maxTokens: 120,
  timeoutMs: 5000,
  maxRetries: 1,
  cacheTtlMs: 5 * 60 * 1000,
  cacheMaxEntries: 256,
  // Wave 126: telemetry rolling window (7 days) + per-call retention cap.
  telemetryWindowMs: 7 * 24 * 60 * 60 * 1000,
  telemetryMaxCalls: 10_000,
});

// Wave 126: Claude Haiku 4.5 cost approximation (USD per million tokens).
// Tunable per environment via factory params. Used by `getTelemetry`
// to surface estimated spend — not authoritative; reconcile against
// Anthropic invoicing for billing.
const DEFAULT_COSTS = Object.freeze({
  inputUsdPer1M: 0.8,
  outputUsdPer1M: 4.0,
});

// ─── Pure helpers ──────────────────────────────────────────────────

function _round4(n) {
  return Math.round(Number(n) * 10000) / 10000;
}

function _round6(n) {
  return Math.round(Number(n) * 1_000_000) / 1_000_000;
}

function _isRetriable(err) {
  if (!err) return false;
  const code = err.status || err.statusCode;
  if (code && code >= 400 && code < 500) return false;
  if (typeof err.message === 'string' && /timeout|network|ECONNRESET|EAI_AGAIN/i.test(err.message))
    return true;
  if (code && code >= 500) return true;
  return false;
}

function _sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function _withTimeout(promise, ms, onAbort) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      if (typeof onAbort === 'function') {
        try {
          onAbort();
        } catch {
          /* swallow */
        }
      }
      reject(new Error('TIMEOUT'));
    }, ms);
    Promise.resolve(promise).then(
      v => {
        clearTimeout(t);
        resolve(v);
      },
      e => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

function _buildSystemPrompt() {
  const intentList = reg.INTENTS.filter(i => i !== reg.INTENT.UNKNOWN).join(', ');
  return [
    'You are an intent classifier for a parental care-services chatbot.',
    'Classify the user message into exactly ONE of these intents:',
    `  ${intentList}`,
    'If the message does not match any intent, return "unknown".',
    '',
    'Reply with a SINGLE JSON object and NOTHING else. No prose, no markdown.',
    'Schema: {"intent":"<intent_name>","confidence":<float between 0 and 1>}',
    '',
    'Confidence guidance:',
    '  0.90+ = explicit, unambiguous match (e.g. "next appointment please")',
    '  0.60-0.89 = strong but informal match (e.g. "متى موعدي؟")',
    '  0.30-0.59 = plausible but ambiguous; you might be wrong',
    '  <0.30 = falling back to "unknown" is preferable',
    '',
    'Messages may be Arabic, English, or mixed. Match semantics, not exact words.',
    'Do NOT echo the message. Do NOT explain. Return ONLY the JSON object.',
  ].join('\n');
}

/**
 * Parse the LLM's response. Tolerates leading/trailing whitespace +
 * accidental markdown fences. Returns null if the response can't be
 * reduced to a valid intent JSON.
 */
function _parseLlmResponse(text) {
  if (typeof text !== 'string') return null;
  let s = text.trim();
  // Strip ```json fences if present
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  // Find the first `{...}` block in case there's prose around it
  const m = /\{[\s\S]*?\}/.exec(s);
  if (!m) return null;
  let parsed;
  try {
    parsed = JSON.parse(m[0]);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  if (typeof parsed.intent !== 'string') return null;
  if (typeof parsed.confidence !== 'number' || !Number.isFinite(parsed.confidence)) return null;
  return {
    intent: parsed.intent,
    confidence: Math.max(0, Math.min(1, parsed.confidence)),
  };
}

/**
 * Coerces a free-form intent name to the registry enum. Returns
 * `INTENT.UNKNOWN` if the name isn't recognized (case-insensitive).
 */
function _coerceIntent(name) {
  if (!name || typeof name !== 'string') return reg.INTENT.UNKNOWN;
  const lower = name.toLowerCase().trim();
  for (const value of reg.INTENTS) {
    if (value.toLowerCase() === lower) return value;
  }
  return reg.INTENT.UNKNOWN;
}

// ─── Cache ──────────────────────────────────────────────────────────

function _createLruCache(maxEntries, ttlMs, nowFn) {
  const map = new Map();
  function get(key) {
    const entry = map.get(key);
    if (!entry) return null;
    if (nowFn() > entry.expiresAt) {
      map.delete(key);
      return null;
    }
    // Refresh LRU position
    map.delete(key);
    map.set(key, entry);
    return entry.value;
  }
  function set(key, value) {
    if (map.has(key)) map.delete(key);
    while (map.size >= maxEntries) {
      const firstKey = map.keys().next().value;
      map.delete(firstKey);
    }
    map.set(key, { value, expiresAt: nowFn() + ttlMs });
  }
  function clear() {
    map.clear();
  }
  function size() {
    return map.size;
  }
  return { get, set, clear, size };
}

// ─── Factory ────────────────────────────────────────────────────────

function createParentChatbotLlmService({
  client = null,
  model = DEFAULTS.model,
  maxTokens = DEFAULTS.maxTokens,
  timeoutMs = DEFAULTS.timeoutMs,
  maxRetries = DEFAULTS.maxRetries,
  cacheTtlMs = DEFAULTS.cacheTtlMs,
  cacheMaxEntries = DEFAULTS.cacheMaxEntries,
  telemetryWindowMs = DEFAULTS.telemetryWindowMs,
  telemetryMaxCalls = DEFAULTS.telemetryMaxCalls,
  inputUsdPer1M = DEFAULT_COSTS.inputUsdPer1M,
  outputUsdPer1M = DEFAULT_COSTS.outputUsdPer1M,
  logger = console,
  now = () => Date.now(),
} = {}) {
  const cache = _createLruCache(cacheMaxEntries, cacheTtlMs, now);
  const systemPrompt = _buildSystemPrompt();

  // Wave 128: telemetry delegated to the shared llm-telemetry lib.
  // Same in-memory rolling-buffer semantics as Wave 126, now reusable
  // across all LLM services.
  const telemetry = createLlmTelemetry({
    windowMs: telemetryWindowMs,
    maxCalls: telemetryMaxCalls,
    inputUsdPer1M,
    outputUsdPer1M,
    now,
  });
  const _recordCall = telemetry.recordCall;

  function available() {
    return Boolean(client && typeof client?.messages?.create === 'function');
  }

  async function _callOnce(message) {
    const start = Date.now();
    let resp;
    try {
      resp = await _withTimeout(
        client.messages.create({
          model,
          max_tokens: maxTokens,
          temperature: 0,
          system: [
            {
              type: 'text',
              text: systemPrompt,
              // Prompt-caching hint mirrors care-plan-llm-caller (Wave 48).
              cache_control: { type: 'ephemeral' },
            },
          ],
          messages: [{ role: 'user', content: message }],
        }),
        timeoutMs
      );
    } catch (err) {
      const elapsed = Date.now() - start;
      const isTimeout = err && err.message === 'TIMEOUT';
      const isRetry = _isRetriable(err) && !isTimeout;
      return { ok: false, error: err, isTimeout, retriable: isRetry, elapsed };
    }
    return { ok: true, resp, elapsed: Date.now() - start };
  }

  async function _classifyViaLlm(message) {
    let lastErr = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const r = await _callOnce(message);
      if (r.ok) {
        const resp = r.resp;
        const text =
          (resp &&
            Array.isArray(resp.content) &&
            resp.content
              .filter(b => b && b.type === 'text')
              .map(b => b.text)
              .join('\n')) ||
          '';
        if (!text || !text.trim()) {
          return { ok: false, reason: REASON.EMPTY_RESPONSE };
        }
        const parsed = _parseLlmResponse(text);
        if (!parsed) {
          return { ok: false, reason: REASON.INVALID_RESPONSE, raw: text };
        }
        const intent = _coerceIntent(parsed.intent);
        return {
          ok: true,
          intent,
          confidence: parsed.confidence,
          source: 'llm',
          raw: text,
          usage: resp.usage || null,
          elapsedMs: r.elapsed,
        };
      }
      lastErr = r.error;
      if (r.isTimeout) {
        return { ok: false, reason: REASON.TIMEOUT };
      }
      if (!r.retriable || attempt === maxRetries) break;
      await _sleep(Math.min(2000, 250 * 2 ** attempt));
    }
    logger.warn(`[chatbot-llm] client threw: ${(lastErr && lastErr.message) || 'unknown'}`);
    return { ok: false, reason: REASON.CLIENT_THREW, message: lastErr?.message };
  }

  /**
   * Public entry. Validates input, checks cache, calls the LLM,
   * normalizes the response, and caches successful classifications.
   * Wave 126: records telemetry for every outcome (cache hit / LLM
   * success / each error class).
   */
  async function classify(message) {
    if (!message || typeof message !== 'string' || !message.trim()) {
      _recordCall({
        source: 'reject',
        success: false,
        reason: REASON.MESSAGE_REQUIRED,
      });
      return { ok: false, reason: REASON.MESSAGE_REQUIRED };
    }
    if (!available()) {
      _recordCall({
        source: 'reject',
        success: false,
        reason: REASON.CLIENT_MISSING,
      });
      return { ok: false, reason: REASON.CLIENT_MISSING };
    }
    const cacheKey = reg.normalizeText(message);
    const hit = cache.get(cacheKey);
    if (hit) {
      _recordCall({
        source: 'cache',
        intent: hit.intent,
        success: true,
      });
      return { ...hit, source: 'cache' };
    }
    const result = await _classifyViaLlm(message);
    if (result.ok) {
      cache.set(cacheKey, {
        ok: true,
        intent: result.intent,
        confidence: result.confidence,
      });
      _recordCall({
        source: 'llm',
        intent: result.intent,
        tokensIn: result.usage ? Number(result.usage.input_tokens || 0) : 0,
        tokensOut: result.usage ? Number(result.usage.output_tokens || 0) : 0,
        elapsedMs: result.elapsedMs || 0,
        success: true,
      });
    } else {
      _recordCall({
        source: 'llm',
        success: false,
        reason: result.reason,
      });
    }
    return result;
  }

  /**
   * Wave 128: delegates to the shared llm-telemetry lib.
   */
  function getTelemetry(opts = {}) {
    return telemetry.getTelemetry(opts);
  }

  function resetTelemetry() {
    telemetry.reset();
  }

  return {
    classify,
    available,
    resetCache: () => cache.clear(),
    _cacheSize: () => cache.size(),
    // Wave 126:
    getTelemetry,
    resetTelemetry,
    _telemetrySize: () => telemetry.size(),
    // Exposed for tests:
    _parseLlmResponse,
    _coerceIntent,
    _buildSystemPrompt,
    REASON,
  };
}

module.exports = {
  createParentChatbotLlmService,
  REASON,
  _parseLlmResponse,
  _coerceIntent,
};

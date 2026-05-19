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
});

// ─── Pure helpers ──────────────────────────────────────────────────

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
  logger = console,
  now = () => Date.now(),
} = {}) {
  const cache = _createLruCache(cacheMaxEntries, cacheTtlMs, now);
  const systemPrompt = _buildSystemPrompt();

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
   */
  async function classify(message) {
    if (!message || typeof message !== 'string' || !message.trim()) {
      return { ok: false, reason: REASON.MESSAGE_REQUIRED };
    }
    if (!available()) {
      return { ok: false, reason: REASON.CLIENT_MISSING };
    }
    const cacheKey = reg.normalizeText(message);
    const hit = cache.get(cacheKey);
    if (hit) {
      return { ...hit, source: 'cache' };
    }
    const result = await _classifyViaLlm(message);
    if (result.ok) {
      // Cache the canonical fields only (no `raw`, no `usage`) to
      // keep entries small.
      cache.set(cacheKey, {
        ok: true,
        intent: result.intent,
        confidence: result.confidence,
      });
    }
    return result;
  }

  return {
    classify,
    available,
    resetCache: () => cache.clear(),
    _cacheSize: () => cache.size(),
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

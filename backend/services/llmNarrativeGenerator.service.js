/**
 * llmNarrativeGenerator.service.js — Claude-backed dashboard
 * narrative generator for Phase 18 Commit 4.
 *
 * Same contract as the rule-based generator in
 * `dashboardNarrative.service.js`:
 *
 *   generate({ dashboardId, kpiSnapshots, context }) → narrative
 *
 * Key design decisions:
 *
 *   1. **SDK is injected, never required**. The module ships with
 *      no hard dependency on `@anthropic-ai/sdk`. Operators wire an
 *      `anthropicClient` at boot time (or tests pass a fake). If
 *      no client is injected we return `null` — the facade then
 *      falls back to the deterministic rule-based narrative. This
 *      keeps the platform usable offline, in CI, and in any
 *      deployment that hasn't opted in.
 *
 *   2. **PII redaction is mandatory before every call**. We walk
 *      the snapshot payload through `utils/piiRedactor.redact()`
 *      before building the prompt. KPI values are numeric (safe)
 *      but any user-supplied filter could leak a beneficiary name
 *      or email.
 *
 *   3. **Prompt caching** — the system prompt is stable across
 *      requests, so we flag it with `cache_control: { type:
 *      'ephemeral' }`. The user turn (snapshot) is fresh each
 *      time. This keeps per-request cost near the cache-hit price.
 *
 *   4. **Model default is Claude Haiku 4.5** (`claude-haiku-4-5-
 *      20251001`) — cheapest model with strong instruction-
 *      following. Operators can override via env or a constructor
 *      option.
 *
 *   5. **Response is parsed as strict JSON**. We ask the model to
 *      return `{ headlineEn, headlineAr, paragraphsEn,
 *      paragraphsAr }` and wrap every failure to parse / missing
 *      field with a null return so the facade falls back to rules.
 *
 *   6. **Cache** — LLM calls are expensive. We cache the result on
 *      a snapshot hash (sorted KPI ids + values + deltas +
 *      classifications) for 90 seconds. A single dashboard fetch
 *      could otherwise call the model multiple times if the
 *      frontend polls near the refresh interval.
 *
 *   7. **Never throws**. Every failure mode returns `null` so the
 *      caller can degrade cleanly.
 */

'use strict';

const crypto = require('crypto');

const { generate: ruleGenerate } = require('./dashboardNarrative.service');
const { redact } = require('../utils/piiRedactor');

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';
const DEFAULT_MAX_TOKENS = 512;
const DEFAULT_CACHE_TTL_MS = 90 * 1000;

const SYSTEM_PROMPT = `You are a senior operations analyst writing bilingual (English + Arabic) narrative summaries for a multi-branch healthcare rehab ERP dashboard.

For each request you receive:
  - a dashboard id and level
  - a list of KPI snapshots (id, human-readable Arabic+English name, classification — green/amber/red/unknown — current value, prior-period delta as ratio, and target)
  - the rule-based summary the platform generated deterministically (treat as ground truth for "what fired")

Your job is to write:
  - headlineEn and headlineAr: single sentences, <=90 chars each, neutral and specific
  - paragraphsEn and paragraphsAr: 2 to 3 sentences each, aligned one-to-one (same topic across languages)

Hard rules:
  - Never invent values. Only reference numbers that appear in the input.
  - Never name any person, email, ID number, phone, or address. The input has been PII-redacted — treat any [REDACTED] placeholder as "a stakeholder".
  - Do not speculate about causes the rules did not name. If the rules are silent, stay descriptive.
  - Keep tone professional and action-oriented. Favor "consider reviewing" over "must do".
  - Output ONLY a single JSON object. No markdown fences, no preamble.

JSON schema:
{
  "headlineEn": string,
  "headlineAr": string,
  "paragraphsEn": string[2..3],
  "paragraphsAr": string[2..3]
}`;

function stableSnapshotHash({ dashboardId, kpiSnapshots }) {
  const normalised = (kpiSnapshots || [])
    .map(s => ({
      id: s.id,
      v: typeof s.value === 'number' ? s.value : null,
      d: typeof s.delta === 'number' ? s.delta : null,
      c: s.classification || null,
    }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const payload = JSON.stringify({ d: dashboardId || null, s: normalised });
  return crypto.createHash('sha1').update(payload).digest('hex').slice(0, 16);
}

function createLruCache({ maxEntries = 200 } = {}) {
  const store = new Map();
  return {
    get(key) {
      const entry = store.get(key);
      if (!entry) return undefined;
      if (entry.expiresAt < Date.now()) {
        store.delete(key);
        return undefined;
      }
      store.delete(key);
      store.set(key, entry);
      return entry.value;
    },
    set(key, value, ttlMs) {
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
      while (store.size > maxEntries) {
        const oldest = store.keys().next().value;
        store.delete(oldest);
      }
    },
    clear() {
      store.clear();
    },
    size() {
      return store.size;
    },
  };
}

function buildUserPayload({ dashboardId, kpiSnapshots, ruleNarrative }) {
  // Already scrubbed by the caller. Shape is intentionally small
  // to keep token usage tight.
  const snapshots = (kpiSnapshots || []).map(s => ({
    id: s.id,
    nameEn: s.nameEn || s.id,
    nameAr: s.nameAr || s.id,
    classification: s.classification || 'unknown',
    value: typeof s.value === 'number' ? s.value : null,
    delta: typeof s.delta === 'number' ? s.delta : null,
    target: typeof s.target === 'number' ? s.target : null,
    unit: s.unit || null,
  }));
  return {
    dashboardId: dashboardId || null,
    snapshots,
    rules: {
      fired: ruleNarrative ? ruleNarrative.rulesFired : [],
      headlineEn: ruleNarrative ? ruleNarrative.headlineEn : null,
      headlineAr: ruleNarrative ? ruleNarrative.headlineAr : null,
    },
  };
}

function extractTextFromResponse(response) {
  // Handle both `{ content: [{ type:'text', text:'...' }] }` and
  // stringified shapes from lightweight fakes.
  if (!response) return null;
  if (typeof response === 'string') return response;
  if (Array.isArray(response.content)) {
    const block = response.content.find(b => b && b.type === 'text' && typeof b.text === 'string');
    return block ? block.text : null;
  }
  if (typeof response.text === 'string') return response.text;
  return null;
}

function parseModelJson(raw) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  // Strip accidental markdown fences in a tolerant way.
  const stripped = trimmed
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
  let parsed;
  try {
    parsed = JSON.parse(stripped);
  } catch (_) {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const { headlineEn, headlineAr, paragraphsEn, paragraphsAr } = parsed;
  if (typeof headlineEn !== 'string' || typeof headlineAr !== 'string') return null;
  if (!Array.isArray(paragraphsEn) || !Array.isArray(paragraphsAr)) return null;
  if (paragraphsEn.length < 1 || paragraphsAr.length < 1) return null;
  if (paragraphsEn.length !== paragraphsAr.length) return null;
  for (const p of paragraphsEn) if (typeof p !== 'string') return null;
  for (const p of paragraphsAr) if (typeof p !== 'string') return null;
  return { headlineEn, headlineAr, paragraphsEn, paragraphsAr };
}

/**
 * Factory. Returns `null` when no Anthropic client is injected —
 * that's the signal to callers that LLM narratives are disabled on
 * this host and they should fall back to the deterministic engine.
 */
function buildLlmNarrativeGenerator(options = {}) {
  const {
    anthropicClient = null,
    model = DEFAULT_MODEL,
    maxTokens = DEFAULT_MAX_TOKENS,
    cacheTtlMs = DEFAULT_CACHE_TTL_MS,
    logger = console,
    redactor = redact,
    cache: injectedCache,
    clock = { now: () => new Date() },
    ruleBasedGenerator = ruleGenerate,
  } = options;

  if (!anthropicClient) {
    return null;
  }

  const cache = injectedCache || createLruCache({ maxEntries: 200 });

  async function generate({ dashboardId, kpiSnapshots, context } = {}) {
    // 1. Run the deterministic engine first. Its `rulesFired` +
    //    `refs` + confidence bubble up into the final shape whether
    //    the LLM call succeeds or not.
    const ruleNarrative = ruleBasedGenerator({ dashboardId, kpiSnapshots, context });

    if (!Array.isArray(kpiSnapshots) || kpiSnapshots.length === 0) {
      // Rule-based already produced an "insufficient data" narrative —
      // there's nothing for the LLM to add.
      return ruleNarrative;
    }

    // 2. Cache lookup on a snapshot-stable hash so frontend polls
    //    don't hammer the API.
    const cacheKey = stableSnapshotHash({ dashboardId, kpiSnapshots });
    const hit = cache.get(cacheKey);
    if (hit) return hit;

    // 3. Build the redacted user payload.
    let userPayload;
    try {
      userPayload = redactor(buildUserPayload({ dashboardId, kpiSnapshots, ruleNarrative }));
    } catch (err) {
      if (logger && logger.warn) logger.warn(`[llmNarrative] redactor failed: ${err.message}`);
      return ruleNarrative;
    }

    // 4. Call the model.
    let response;
    try {
      response = await anthropicClient.messages.create({
        model,
        max_tokens: maxTokens,
        system: [
          {
            type: 'text',
            text: SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: JSON.stringify(userPayload),
              },
            ],
          },
        ],
      });
    } catch (err) {
      if (logger && logger.warn) logger.warn(`[llmNarrative] ${model}: ${err.message}`);
      return ruleNarrative;
    }

    const rawText = extractTextFromResponse(response);
    const parsed = parseModelJson(rawText);
    if (!parsed) {
      if (logger && logger.warn) logger.warn('[llmNarrative] unparseable model output');
      return ruleNarrative;
    }

    const merged = {
      headlineEn: parsed.headlineEn,
      headlineAr: parsed.headlineAr,
      paragraphsEn: parsed.paragraphsEn,
      paragraphsAr: parsed.paragraphsAr,
      confidence: ruleNarrative.confidence,
      rulesFired: ruleNarrative.rulesFired,
      refs: ruleNarrative.refs,
      dashboardId: ruleNarrative.dashboardId,
      dashboardLevel: ruleNarrative.dashboardLevel,
      source: 'llm',
      generatedAt: clock.now().toISOString(),
      model,
    };

    cache.set(cacheKey, merged, cacheTtlMs);
    return merged;
  }

  return { generate };
}

module.exports = {
  buildLlmNarrativeGenerator,
  DEFAULT_MODEL,
  DEFAULT_MAX_TOKENS,
  DEFAULT_CACHE_TTL_MS,
  SYSTEM_PROMPT,
  _internals: {
    stableSnapshotHash,
    createLruCache,
    buildUserPayload,
    extractTextFromResponse,
    parseModelJson,
  },
};

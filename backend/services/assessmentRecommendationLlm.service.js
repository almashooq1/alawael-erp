'use strict';

/**
 * assessmentRecommendationLlm.service.js — Wave 206
 *
 * Optional Claude Haiku 4.5 layer on top of the deterministic
 * assessmentRecommendationEngine. Only purpose: polish the Arabic
 * phrasing of goal titles + SMART fields. Never changes structure,
 * never invents new goals, never touches evidence.
 *
 * Pattern (matches Wave 123 parent chatbot + Wave 4 llmNarrative):
 *   • SDK is INJECTED at boot — module ships with no hard SDK dep
 *   • If client absent → factory returns null → caller uses
 *     deterministic output as-is (fail-open)
 *   • Hard timeout (8s) + 1 retry + LRU cache (5 min TTL)
 *   • Strict JSON contract — any parse failure → fall back to
 *     deterministic
 *   • PII never sent — only goal text (no beneficiary names/ids)
 *
 * The contract is intentionally narrow: input = goal scaffold from
 * the engine; output = same scaffold with `title`, `specific`,
 * `measurable`, `achievable`, `relevant` re-phrased. Every other
 * field (evidence, confidence, timeBoundDays, domain) passes
 * through unchanged.
 */

const crypto = require('crypto');

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';
const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_MAX_TOKENS = 1024;
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_MAX_RETRIES = 1;

const SYSTEM_PROMPT = `أنت معالج تأهيلي خبير يراجع صياغة أهداف SMART لخطط تأهيل ذوي الإعاقة بمراكز نهارية في المملكة العربية السعودية.

تستقبل قائمة أهداف بصياغة أوّلية. مهمتك: إعادة صياغة كل هدف بأسلوب احترافي عيادي، مع الحفاظ التام على المعنى والقيم العددية والشروط الزمنية.

قواعد صارمة:
  - لا تضف أو تحذف أهدافاً. عدد الأهداف في الإخراج = عدد الأهداف في الإدخال
  - لا تغير الـ id الذي يرافق كل هدف
  - لا تخترع أرقاماً أو نسباً أو مواعيد جديدة — استخدم فقط القيم الموجودة في الإدخال
  - حافظ على المعنى الإكلينيكي بدقة — أي توصية بدوائية أو إجراء طبي يبقى كما هو
  - استخدم اللغة العربية الفصحى المهنية، لا العامية
  - الإخراج JSON صرف، بدون أي تعليق أو شرح
  - كل هدف يحتوي: id, title, specific, measurable, achievable, relevant

شكل الـ JSON المتوقع:
{
  "goals": [
    { "id": "...", "title": "...", "specific": "...", "measurable": "...", "achievable": "...", "relevant": "..." }
  ]
}`;

function stableHash(payload) {
  return crypto.createHash('sha1').update(JSON.stringify(payload)).digest('hex').slice(0, 16);
}

function createLruCache({ maxEntries = 100 } = {}) {
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
    size() {
      return store.size;
    },
  };
}

function withTimeout(promise, ms, label = 'llm') {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label}_timeout_${ms}ms`)), ms);
    promise.then(
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

function extractTextFromResponse(response) {
  if (!response) return null;
  if (typeof response === 'string') return response;
  if (Array.isArray(response.content)) {
    const block = response.content.find(b => b && b.type === 'text' && typeof b.text === 'string');
    return block ? block.text : null;
  }
  if (typeof response.text === 'string') return response.text;
  return null;
}

function parseModelJson(raw, expectedIds) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return null;
  }
  if (!parsed || !Array.isArray(parsed.goals)) return null;
  // Validate every goal has the required string fields
  const validated = [];
  for (const g of parsed.goals) {
    if (!g || typeof g !== 'object') return null;
    if (typeof g.id !== 'string') return null;
    if (!expectedIds.has(g.id)) return null;
    const fields = ['title', 'specific', 'measurable', 'achievable', 'relevant'];
    for (const f of fields) {
      if (typeof g[f] !== 'string' || g[f].trim().length === 0) return null;
    }
    validated.push(g);
  }
  // Must cover every input id
  for (const id of expectedIds) {
    if (!validated.find(g => g.id === id)) return null;
  }
  return validated;
}

/**
 * Build a deterministic id per goal (domain + title hash) so the
 * model can address each goal precisely in its response.
 */
function attachIds(goals) {
  return goals.map((g, i) => ({
    ...g,
    _id: `g${i}_${crypto.createHash('md5').update(`${g.domain}::${g.title}`).digest('hex').slice(0, 8)}`,
  }));
}

function buildUserPayload(goalsWithIds) {
  return {
    goals: goalsWithIds.map(g => ({
      id: g._id,
      domain: g.domain,
      title: g.title,
      specific: g.specific,
      measurable: g.measurable,
      achievable: g.achievable,
      relevant: g.relevant,
      timeBoundDays: g.timeBoundDays,
    })),
  };
}

/**
 * Factory. Returns `null` when no Anthropic client is injected —
 * the caller then uses the deterministic engine output as-is.
 */
function buildLlmRefiner(options = {}) {
  const {
    anthropicClient = null,
    model = DEFAULT_MODEL,
    maxTokens = DEFAULT_MAX_TOKENS,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    cacheTtlMs = DEFAULT_CACHE_TTL_MS,
    maxRetries = DEFAULT_MAX_RETRIES,
    logger = console,
    cache: injectedCache,
  } = options;

  if (!anthropicClient) return null;

  const cache = injectedCache || createLruCache({ maxEntries: 100 });

  async function refineGoals(goals) {
    if (!Array.isArray(goals) || goals.length === 0) return goals;

    const goalsWithIds = attachIds(goals);
    const payload = buildUserPayload(goalsWithIds);
    const cacheKey = stableHash(payload);
    const hit = cache.get(cacheKey);
    if (hit) return mergeRefined(goalsWithIds, hit);

    const expectedIds = new Set(goalsWithIds.map(g => g._id));
    let response = null;
    let _lastErr = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        response = await withTimeout(
          anthropicClient.messages.create({
            model,
            max_tokens: maxTokens,
            system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
            messages: [
              { role: 'user', content: [{ type: 'text', text: JSON.stringify(payload) }] },
            ],
          }),
          timeoutMs,
          'haiku_refine'
        );
        break;
      } catch (err) {
        _lastErr = err;
        if (logger && logger.warn) {
          logger.warn(`[assessment-llm] attempt ${attempt + 1} failed: ${err.message}`);
        }
      }
    }
    if (!response) return goals; // fail-open

    const raw = extractTextFromResponse(response);
    const refined = parseModelJson(raw, expectedIds);
    if (!refined) {
      if (logger && logger.warn) logger.warn('[assessment-llm] unparseable model output');
      return goals;
    }

    cache.set(cacheKey, refined, cacheTtlMs);
    return mergeRefined(goalsWithIds, refined);
  }

  return { refineGoals };
}

function mergeRefined(originals, refined) {
  const refinedById = new Map(refined.map(r => [r.id, r]));
  return originals.map(orig => {
    const r = refinedById.get(orig._id);
    if (!r) {
      // Defensive: shouldn't happen because parseModelJson validates,
      // but keep behavior safe if mergeRefined is called directly.

      const { _id, ...rest } = orig;
      return rest;
    }

    const { _id, ...rest } = orig;
    return {
      ...rest,
      title: r.title,
      specific: r.specific,
      measurable: r.measurable,
      achievable: r.achievable,
      relevant: r.relevant,
      refinedByLlm: true,
    };
  });
}

module.exports = {
  buildLlmRefiner,
  DEFAULT_MODEL,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_MAX_TOKENS,
  DEFAULT_CACHE_TTL_MS,
  SYSTEM_PROMPT,
  _internals: {
    stableHash,
    createLruCache,
    parseModelJson,
    attachIds,
    buildUserPayload,
    extractTextFromResponse,
    mergeRefined,
  },
};

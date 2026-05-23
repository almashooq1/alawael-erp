/**
 * embeddingProvider.js — pluggable embedding provider (W283 Phase 3 #5).
 *
 * Three modes via EMBEDDING_PROVIDER env:
 *   • mock                          — deterministic hash-based, dim=384
 *   • openai-text-embedding-3-large — dim=3072, requires OPENAI_API_KEY
 *   • cohere-embed-multilingual-v3  — dim=1024, requires COHERE_API_KEY
 *
 * Mock embeddings are pseudo-random but DETERMINISTIC for the same input
 * — good enough to test RAG plumbing without external API calls. They
 * use a stable hash → seeded-PRNG → unit-vector approach so cosine
 * similarity behaves sensibly (identical input → similarity = 1.0;
 * different input → typically 0.0 ± noise).
 *
 * Live providers are placeholders that throw EMBEDDING_LIVE_NOT_CONFIGURED
 * until creds are wired. Adapter pattern keeps the rest of the RAG
 * pipeline provider-agnostic.
 */

'use strict';

const crypto = require('crypto');

const PROVIDER = (process.env.EMBEDDING_PROVIDER || 'mock').toLowerCase();
const MOCK_DIM = 384;

// ── Deterministic mock ──────────────────────────────────────────────────
function mockEmbed(text) {
  if (typeof text !== 'string' || text.length === 0) {
    throw Object.assign(new Error('text must be a non-empty string'), {
      code: 'EMBEDDING_INVALID_INPUT',
    });
  }
  // Seed PRNG from sha256(text) — same text → same vector
  const seed = crypto.createHash('sha256').update(text).digest();
  const out = new Array(MOCK_DIM);
  // Use a tiny xorshift-like step for cheap deterministic noise
  let s0 = seed.readUInt32BE(0) || 1;
  let s1 = seed.readUInt32BE(4) || 2;
  for (let i = 0; i < MOCK_DIM; i++) {
    s0 ^= s0 << 13;
    s0 ^= s0 >>> 17;
    s0 ^= s0 << 5;
    s1 ^= s1 << 11;
    s1 ^= s1 >>> 19;
    s1 ^= s1 << 8;
    const combined = (s0 ^ s1) >>> 0;
    out[i] = combined / 0xffffffff - 0.5; // ~ [-0.5, 0.5]
  }
  // Normalize to unit vector → cosine = dot product, ranges [-1, 1]
  let norm = 0;
  for (let i = 0; i < MOCK_DIM; i++) norm += out[i] * out[i];
  norm = Math.sqrt(norm);
  if (norm > 0) for (let i = 0; i < MOCK_DIM; i++) out[i] /= norm;
  return out;
}

// ── Live provider implementations (W283f) ──────────────────────────────
// Both providers share the same control flow: validate creds → POST with
// 10s timeout → 1 retry on transient (5xx + network) → parse → return.
// Auth/rate-limit/client-error responses do NOT retry. Errors use distinct
// codes so callers can differentiate config issues from runtime failures.

const HTTP_TIMEOUT_MS = parseInt(process.env.EMBEDDING_HTTP_TIMEOUT_MS, 10) || 10000;
const HTTP_MAX_RETRIES = 1;

async function _httpPost(url, body, headers) {
  // Allow tests to inject a fake fetch via module.exports._setFetch.
  const fetchFn = module.exports._fetch || globalThis.fetch;
  if (!fetchFn) {
    throw Object.assign(new Error('global fetch unavailable (Node < 18?)'), {
      code: 'EMBEDDING_NO_FETCH',
    });
  }
  const ctl = new AbortController();
  const timeoutId = setTimeout(() => ctl.abort(), HTTP_TIMEOUT_MS);
  try {
    return await fetchFn(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: ctl.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function _httpPostWithRetry(url, body, headers) {
  let lastErr;
  for (let attempt = 0; attempt <= HTTP_MAX_RETRIES; attempt++) {
    try {
      const res = await _httpPost(url, body, headers);
      // 5xx → retry; 4xx → fail immediately
      if (res.status >= 500 && attempt < HTTP_MAX_RETRIES) {
        lastErr = Object.assign(new Error(`upstream ${res.status}`), {
          code: 'EMBEDDING_UPSTREAM_5XX',
          status: res.status,
        });
        continue;
      }
      return res;
    } catch (err) {
      // Network / timeout — retry once
      if (attempt < HTTP_MAX_RETRIES) {
        lastErr = err;
        continue;
      }
      throw Object.assign(err, {
        code:
          err.code || (err.name === 'AbortError' ? 'EMBEDDING_TIMEOUT' : 'EMBEDDING_NETWORK_FAIL'),
      });
    }
  }
  throw lastErr;
}

async function liveOpenAIEmbed(text) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw Object.assign(new Error('OPENAI_API_KEY env var required for live OpenAI embedding'), {
      code: 'EMBEDDING_LIVE_NOT_CONFIGURED',
    });
  }
  const res = await _httpPostWithRetry(
    'https://api.openai.com/v1/embeddings',
    { input: text, model: 'text-embedding-3-large' },
    { Authorization: `Bearer ${key}` }
  );
  if (!res.ok) {
    const code =
      res.status === 401
        ? 'EMBEDDING_AUTH_FAIL'
        : res.status === 429
          ? 'EMBEDDING_RATE_LIMITED'
          : res.status >= 500
            ? 'EMBEDDING_UPSTREAM_5XX'
            : 'EMBEDDING_REQUEST_FAILED';
    throw Object.assign(new Error(`OpenAI embed ${res.status}`), { code, status: res.status });
  }
  const body = await res.json();
  const vec = body?.data?.[0]?.embedding;
  if (!Array.isArray(vec) || vec.length === 0) {
    throw Object.assign(new Error('OpenAI returned malformed embedding'), {
      code: 'EMBEDDING_MALFORMED_RESPONSE',
    });
  }
  return vec;
}

async function liveCohereEmbed(text) {
  const key = process.env.COHERE_API_KEY;
  if (!key) {
    throw Object.assign(new Error('COHERE_API_KEY env var required for live Cohere embedding'), {
      code: 'EMBEDDING_LIVE_NOT_CONFIGURED',
    });
  }
  const res = await _httpPostWithRetry(
    'https://api.cohere.com/v2/embed',
    {
      texts: [text],
      model: 'embed-multilingual-v3.0',
      input_type: 'search_document',
      embedding_types: ['float'],
    },
    { Authorization: `Bearer ${key}` }
  );
  if (!res.ok) {
    const code =
      res.status === 401
        ? 'EMBEDDING_AUTH_FAIL'
        : res.status === 429
          ? 'EMBEDDING_RATE_LIMITED'
          : res.status >= 500
            ? 'EMBEDDING_UPSTREAM_5XX'
            : 'EMBEDDING_REQUEST_FAILED';
    throw Object.assign(new Error(`Cohere embed ${res.status}`), { code, status: res.status });
  }
  const body = await res.json();
  // Cohere v2 returns: { embeddings: { float: [[...]] } }
  const vec = body?.embeddings?.float?.[0];
  if (!Array.isArray(vec) || vec.length === 0) {
    throw Object.assign(new Error('Cohere returned malformed embedding'), {
      code: 'EMBEDDING_MALFORMED_RESPONSE',
    });
  }
  return vec;
}

// ── Public API ──────────────────────────────────────────────────────────
async function embed(text) {
  if (PROVIDER === 'mock') return mockEmbed(text);
  if (PROVIDER === 'openai-text-embedding-3-large') return liveOpenAIEmbed(text);
  if (PROVIDER === 'cohere-embed-multilingual-v3') return liveCohereEmbed(text);
  throw Object.assign(new Error(`Unknown embedding provider: ${PROVIDER}`), {
    code: 'EMBEDDING_UNKNOWN_PROVIDER',
  });
}

function getProvider() {
  return PROVIDER;
}

function getDimensions() {
  if (PROVIDER === 'mock') return MOCK_DIM;
  if (PROVIDER === 'openai-text-embedding-3-large') return 3072;
  if (PROVIDER === 'cohere-embed-multilingual-v3') return 1024;
  return null;
}

// Cosine similarity helper for in-process search
function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
    return 0;
  }
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  if (denom === 0) return 0;
  return dot / denom;
}

module.exports = {
  embed,
  getProvider,
  getDimensions,
  cosineSimilarity,
  // Direct provider access — useful for ops tools that want to call a
  // specific provider regardless of EMBEDDING_PROVIDER env.
  liveOpenAIEmbed,
  liveCohereEmbed,
  // For tests
  _mockEmbed: mockEmbed,
  _MOCK_DIM: MOCK_DIM,
  // Test injection point: assign module.exports._fetch = mockFetch to
  // intercept HTTP calls without monkey-patching globalThis.fetch.
  _fetch: null,
};

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

// ── Live placeholders ───────────────────────────────────────────────────
async function liveOpenAIEmbed(_text) {
  throw Object.assign(new Error('OpenAI embedding live mode requires OPENAI_API_KEY env var'), {
    code: 'EMBEDDING_LIVE_NOT_CONFIGURED',
  });
}

async function liveCohereEmbed(_text) {
  throw Object.assign(new Error('Cohere embedding live mode requires COHERE_API_KEY env var'), {
    code: 'EMBEDDING_LIVE_NOT_CONFIGURED',
  });
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
  // For tests
  _mockEmbed: mockEmbed,
  _MOCK_DIM: MOCK_DIM,
};

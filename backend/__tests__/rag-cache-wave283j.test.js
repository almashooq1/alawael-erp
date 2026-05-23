/**
 * rag-cache-wave283j.test.js — LRU+TTL retrieval cache for the RAG service.
 *
 * Closes the W283i runbook's flagged gap: "caching: identical query within
 * last N minutes → reuse retrieval (not implemented — separate scope; flag
 * as W283j if needed)." Now implemented.
 *
 * Tests cover:
 *   (1) Default (no cache enabled) — preserves W283/b/c behavior
 *   (2) Cache hit returns identical result + fromCache:true marker
 *   (3) Cache key includes (provider, branchId, topK, threshold, fallback)
 *       — different params = different cache slot
 *   (4) TTL expiry — past expiresAt re-runs the embed
 *   (5) LRU eviction — beyond maxEntries oldest gets dropped
 *   (6) ingestDocument flushes cache wholesale (new chunks may match
 *       previously-cached queries)
 *   (7) Metrics: rag.retrieve.cache labels { provider, result ∈ hit|miss }
 *   (8) opts.skipCache:true bypasses cache (force-refresh path)
 *   (9) clearCache() + cacheSize() admin helpers
 */

'use strict';

jest.unmock('mongoose');

const metrics = require('../intelligence/risk-metrics.registry');
const embeddingProvider = require('../services/ai/embeddingProvider');
const ragServiceFactory = require('../services/ai/rag.service');

describe('W283j — RAG retrieval cache (LRU+TTL)', () => {
  function makeChunkModel(store = new Map()) {
    let nextId = 1;
    return {
      async insertMany(docs) {
        return docs.map(d => {
          const doc = { _id: `c-${nextId++}`, ...d };
          store.set(doc._id, doc);
          return doc;
        });
      },
      find: () => ({
        lean: async () => [...store.values()].filter(c => c.isActive),
      }),
      updateMany: async () => ({ matchedCount: 0 }),
    };
  }

  beforeEach(() => {
    metrics._reset();
  });

  // ── 1. Default off — preserves W283/b/c behavior ──
  it('cacheEnabled:false (default) → no fromCache marker on repeat calls', async () => {
    const svc = ragServiceFactory({
      embeddingProvider,
      ChunkModel: makeChunkModel(),
    });
    expect(svc.isCacheEnabled()).toBe(false);
    expect(svc.cacheSize()).toBe(0);
    // Doesn't matter what retrieve returns; the contract is "no cache".
    await svc.ingestDocument({
      sourceDocId: 'p1',
      sourceDocType: 'sop',
      sourceDocTitle: 'سياسة',
      text: 'محتوى',
      isOrgWide: true,
    });
    const r1 = await svc.retrieve('x', { topK: 1, similarityThreshold: 0 });
    expect(r1.fromCache).toBeUndefined();
    const r2 = await svc.retrieve('x', { topK: 1, similarityThreshold: 0 });
    expect(r2.fromCache).toBeUndefined();
  });

  // ── 2. Cache hit returns identical result + marker ──
  it('cacheEnabled:true → 2nd identical call returns fromCache:true', async () => {
    const svc = ragServiceFactory({
      embeddingProvider,
      ChunkModel: makeChunkModel(),
      cacheEnabled: true,
    });
    expect(svc.isCacheEnabled()).toBe(true);
    await svc.ingestDocument({
      sourceDocId: 'p1',
      sourceDocType: 'sop',
      sourceDocTitle: 'سياسة الدفع',
      text: 'طرق الدفع',
      isOrgWide: true,
    });
    const r1 = await svc.retrieve('الدفع', { topK: 1, similarityThreshold: 0 });
    expect(r1.fromCache).toBeUndefined();
    const r2 = await svc.retrieve('الدفع', { topK: 1, similarityThreshold: 0 });
    expect(r2.fromCache).toBe(true);
    // Same chunks
    expect(r2.chunks.length).toBe(r1.chunks.length);
  });

  // ── 3. Cache key includes parameters ──
  it('different topK → different cache slot (miss)', async () => {
    const svc = ragServiceFactory({
      embeddingProvider,
      ChunkModel: makeChunkModel(),
      cacheEnabled: true,
    });
    await svc.ingestDocument({
      sourceDocId: 'p1',
      sourceDocType: 'sop',
      sourceDocTitle: 't',
      text: 'محتوى',
      isOrgWide: true,
    });
    const r1 = await svc.retrieve('x', { topK: 1, similarityThreshold: 0 });
    const r2 = await svc.retrieve('x', { topK: 5, similarityThreshold: 0 });
    expect(r1.fromCache).toBeUndefined();
    expect(r2.fromCache).toBeUndefined();
  });

  it('different branchId → different cache slot', async () => {
    const svc = ragServiceFactory({
      embeddingProvider,
      ChunkModel: makeChunkModel(),
      cacheEnabled: true,
    });
    await svc.ingestDocument({
      sourceDocId: 'p1',
      sourceDocType: 'sop',
      sourceDocTitle: 't',
      text: 'محتوى',
      isOrgWide: true,
    });
    const r1 = await svc.retrieve('x', { topK: 1, similarityThreshold: 0, branchId: 'b1' });
    const r2 = await svc.retrieve('x', { topK: 1, similarityThreshold: 0, branchId: 'b2' });
    expect(r1.fromCache).toBeUndefined();
    expect(r2.fromCache).toBeUndefined();
  });

  // ── 4. TTL expiry ──
  it('TTL expiry → next call recomputes (miss)', async () => {
    let fakeNow = 1_000_000;
    const svc = ragServiceFactory({
      embeddingProvider,
      ChunkModel: makeChunkModel(),
      cacheEnabled: true,
      cacheTtlMs: 5000, // 5s TTL
      now: () => fakeNow,
    });
    await svc.ingestDocument({
      sourceDocId: 'p1',
      sourceDocType: 'sop',
      sourceDocTitle: 't',
      text: 'محتوى',
      isOrgWide: true,
    });
    const r1 = await svc.retrieve('x', { topK: 1, similarityThreshold: 0 });
    expect(r1.fromCache).toBeUndefined();
    // Within TTL — hit
    fakeNow += 3000;
    const r2 = await svc.retrieve('x', { topK: 1, similarityThreshold: 0 });
    expect(r2.fromCache).toBe(true);
    // Past TTL — miss again
    fakeNow += 10000;
    const r3 = await svc.retrieve('x', { topK: 1, similarityThreshold: 0 });
    expect(r3.fromCache).toBeUndefined();
  });

  // ── 5. LRU eviction ──
  it('LRU eviction beyond maxEntries', async () => {
    const svc = ragServiceFactory({
      embeddingProvider,
      ChunkModel: makeChunkModel(),
      cacheEnabled: true,
      cacheMaxEntries: 3,
    });
    await svc.ingestDocument({
      sourceDocId: 'p1',
      sourceDocType: 'sop',
      sourceDocTitle: 't',
      text: 'محتوى',
      isOrgWide: true,
    });
    // Fill cache with 3 distinct queries
    await svc.retrieve('q1', { topK: 1, similarityThreshold: 0 });
    await svc.retrieve('q2', { topK: 1, similarityThreshold: 0 });
    await svc.retrieve('q3', { topK: 1, similarityThreshold: 0 });
    expect(svc.cacheSize()).toBe(3);
    // 4th query evicts q1 (oldest)
    await svc.retrieve('q4', { topK: 1, similarityThreshold: 0 });
    expect(svc.cacheSize()).toBe(3);
    // q1 should be a miss now (evicted), q2-q4 are hits
    const rEvicted = await svc.retrieve('q1', { topK: 1, similarityThreshold: 0 });
    expect(rEvicted.fromCache).toBeUndefined();
  });

  // ── 6. Ingest flushes cache ──
  it('ingestDocument flushes cache wholesale', async () => {
    const store = new Map();
    const svc = ragServiceFactory({
      embeddingProvider,
      ChunkModel: makeChunkModel(store),
      cacheEnabled: true,
    });
    await svc.ingestDocument({
      sourceDocId: 'p1',
      sourceDocType: 'sop',
      sourceDocTitle: 't',
      text: 'محتوى',
      isOrgWide: true,
    });
    await svc.retrieve('x', { topK: 1, similarityThreshold: 0 });
    expect(svc.cacheSize()).toBe(1);
    // Ingest new doc → cache flushed
    await svc.ingestDocument({
      sourceDocId: 'p2',
      sourceDocType: 'sop',
      sourceDocTitle: 't2',
      text: 'محتوى آخر',
      isOrgWide: true,
    });
    expect(svc.cacheSize()).toBe(0);
    // Next retrieve is a miss again
    const r = await svc.retrieve('x', { topK: 1, similarityThreshold: 0 });
    expect(r.fromCache).toBeUndefined();
  });

  // ── 7. Metrics emit hit/miss ──
  it('emits rag.retrieve.cache with result=hit|miss', async () => {
    const svc = ragServiceFactory({
      embeddingProvider,
      ChunkModel: makeChunkModel(),
      cacheEnabled: true,
    });
    await svc.ingestDocument({
      sourceDocId: 'p1',
      sourceDocType: 'sop',
      sourceDocTitle: 't',
      text: 'محتوى',
      isOrgWide: true,
    });
    metrics._reset();
    await svc.retrieve('x', { topK: 1, similarityThreshold: 0 });
    await svc.retrieve('x', { topK: 1, similarityThreshold: 0 });
    const snap = metrics.snapshot();
    const missKey = 'rag.retrieve.cache|provider=mock,result=miss';
    const hitKey = 'rag.retrieve.cache|provider=mock,result=hit';
    expect(snap[missKey]).toBe(1);
    expect(snap[hitKey]).toBe(1);
  });

  // ── 8. opts.skipCache:true bypasses ──
  it('opts.skipCache:true bypasses cache (force-refresh)', async () => {
    const svc = ragServiceFactory({
      embeddingProvider,
      ChunkModel: makeChunkModel(),
      cacheEnabled: true,
    });
    await svc.ingestDocument({
      sourceDocId: 'p1',
      sourceDocType: 'sop',
      sourceDocTitle: 't',
      text: 'محتوى',
      isOrgWide: true,
    });
    await svc.retrieve('x', { topK: 1, similarityThreshold: 0 });
    const r = await svc.retrieve('x', { topK: 1, similarityThreshold: 0, skipCache: true });
    expect(r.fromCache).toBeUndefined();
  });

  // ── 9. clearCache() helper ──
  it('clearCache() empties cache; cacheSize() reports current size', async () => {
    const svc = ragServiceFactory({
      embeddingProvider,
      ChunkModel: makeChunkModel(),
      cacheEnabled: true,
    });
    await svc.ingestDocument({
      sourceDocId: 'p1',
      sourceDocType: 'sop',
      sourceDocTitle: 't',
      text: 'محتوى',
      isOrgWide: true,
    });
    await svc.retrieve('a', { topK: 1, similarityThreshold: 0 });
    await svc.retrieve('b', { topK: 1, similarityThreshold: 0 });
    expect(svc.cacheSize()).toBe(2);
    svc.clearCache();
    expect(svc.cacheSize()).toBe(0);
  });

  // ── Bootstrap wires cache + env-tunable ──
  describe('ragBootstrap enables cache + reads RAG_CACHE_* env', () => {
    const fs = require('fs');
    const path = require('path');
    const BOOTSTRAP = fs.readFileSync(
      path.join(__dirname, '..', 'startup', 'ragBootstrap.js'),
      'utf8'
    );

    it('passes cacheEnabled:true', () => {
      expect(BOOTSTRAP).toMatch(/cacheEnabled:\s*true/);
    });

    it('reads RAG_CACHE_TTL_MS env', () => {
      expect(BOOTSTRAP).toMatch(/RAG_CACHE_TTL_MS/);
    });

    it('reads RAG_CACHE_MAX_ENTRIES env', () => {
      expect(BOOTSTRAP).toMatch(/RAG_CACHE_MAX_ENTRIES/);
    });
  });
});

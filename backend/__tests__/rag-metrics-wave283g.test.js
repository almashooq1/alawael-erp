/**
 * rag-metrics-wave283g.test.js — RAG telemetry on the W297 risk-metrics registry.
 *
 * Three metric families wired:
 *   rag.ingest        labels: { provider, sourceDocType }
 *   rag.retrieve      labels: { provider, vector ∈ none|some, fallback ∈ unused|rescued|merged }
 *   rag.embed.error   labels: { provider, code }
 *
 * Ops uses these to see:
 *   - keyword fallback "rescued" rate climbing → upgrade embedder
 *   - auth/rate-limit clustering on embed.error → rotate keys, scale up
 *   - ingest volume per source-doc-type → capacity planning
 */

'use strict';

jest.unmock('mongoose');

const metrics = require('../intelligence/risk-metrics.registry');
const embeddingProvider = require('../services/ai/embeddingProvider');
const ragServiceFactory = require('../services/ai/rag.service');

describe('W283g — RAG metrics on W297 registry', () => {
  beforeEach(() => {
    metrics._reset();
  });

  // ── 1. NAMES exported ──────────────────────────────────────────────
  describe('registry NAMES', () => {
    it('exports the 3 RAG metric names', () => {
      expect(metrics.NAMES.RAG_RETRIEVE).toBe('rag.retrieve');
      expect(metrics.NAMES.RAG_INGEST).toBe('rag.ingest');
      expect(metrics.NAMES.RAG_EMBED_ERROR).toBe('rag.embed.error');
    });
  });

  // ── 2. Ingest emits rag.ingest ────────────────────────────────────
  describe('ingestDocument emits rag.ingest', () => {
    let svc;
    let MockChunk;
    beforeEach(() => {
      MockChunk = {
        insertMany: async docs => docs.map((d, i) => ({ _id: `c-${i}`, ...d })),
        updateMany: async () => ({ matchedCount: 0 }),
      };
      svc = ragServiceFactory({ embeddingProvider, ChunkModel: MockChunk });
    });

    it('emits rag.ingest with provider + sourceDocType on success', async () => {
      await svc.ingestDocument({
        sourceDocId: 'policy-test',
        sourceDocType: 'internal_policy',
        sourceDocTitle: 'سياسة اختبار',
        text: 'محتوى الاختبار',
        isOrgWide: true,
      });
      const snap = metrics.snapshot();
      const key = 'rag.ingest|provider=mock,sourceDocType=internal_policy';
      expect(snap[key]).toBe(1);
    });

    it('emits rag.embed.error when insertMany throws', async () => {
      const failingChunk = {
        insertMany: async () => {
          const e = new Error('mongo down');
          e.code = 'CONN_LOST';
          throw e;
        },
        updateMany: async () => ({ matchedCount: 0 }),
      };
      const failSvc = ragServiceFactory({ embeddingProvider, ChunkModel: failingChunk });
      await expect(
        failSvc.ingestDocument({
          sourceDocId: 'p',
          sourceDocType: 'sop',
          sourceDocTitle: 't',
          text: 'x',
          isOrgWide: true,
        })
      ).rejects.toBeTruthy();
      const snap = metrics.snapshot();
      const key = 'rag.embed.error|code=CONN_LOST,provider=mock';
      expect(snap[key]).toBe(1);
    });
  });

  // ── 3. Retrieve emits rag.retrieve with right labels ───────────────
  describe('retrieve emits rag.retrieve with vector + fallback labels', () => {
    let svc;
    let MockChunk;

    beforeEach(async () => {
      const store = new Map();
      let nextId = 1;
      MockChunk = {
        insertMany: async docs =>
          docs.map(d => {
            const doc = { _id: `c-${nextId++}`, ...d };
            store.set(doc._id, doc);
            return doc;
          }),
        find: () => ({ lean: async () => [...store.values()].filter(c => c.isActive) }),
        updateMany: async () => ({ matchedCount: 0 }),
      };
      svc = ragServiceFactory({ embeddingProvider, ChunkModel: MockChunk });
      // Seed one Arabic chunk
      await svc.ingestDocument({
        sourceDocId: 'policy-payment',
        sourceDocType: 'internal_policy',
        sourceDocTitle: 'سياسة الدفع',
        text: 'طرق الدفع المقبولة: مدى وفيزا.',
        isOrgWide: true,
      });
      metrics._reset(); // wipe the ingest metric — only retrieve metrics matter here
    });

    it('vector hits + no fallback → labels vector=some, fallback=unused', async () => {
      // Low threshold so vector returns the chunk
      await svc.retrieve('سياسة', {
        topK: 1,
        similarityThreshold: 0,
        keywordFallback: false,
      });
      const snap = metrics.snapshot();
      const key = 'rag.retrieve|fallback=unused,provider=mock,vector=some';
      expect(snap[key]).toBe(1);
    });

    it('vector empty + keyword rescued → labels vector=none, fallback=rescued', async () => {
      await svc.retrieve('طرق الدفع', {
        topK: 1,
        similarityThreshold: 0.9, // vector won't reach
        keywordFallback: 'auto',
      });
      const snap = metrics.snapshot();
      const key = 'rag.retrieve|fallback=rescued,provider=mock,vector=none';
      expect(snap[key]).toBe(1);
    });

    it('vector empty + no fallback → labels vector=none, fallback=unused', async () => {
      await svc.retrieve('garbage', {
        topK: 1,
        similarityThreshold: 0.9,
        keywordFallback: false,
      });
      const snap = metrics.snapshot();
      const key = 'rag.retrieve|fallback=unused,provider=mock,vector=none';
      expect(snap[key]).toBe(1);
    });

    it('always-keyword fallback fires regardless of vector match → one rag.retrieve metric', async () => {
      // Note: mock embeddings produce ~random cosine similarity which CAN
      // be negative for unrelated text. With threshold=0, a negative-sim
      // chunk is still excluded → vectorMatchCount can be 0 even with
      // threshold:0. Keyword fallback rescues it.
      await svc.retrieve('سياسة الدفع', {
        topK: 5,
        similarityThreshold: 0,
        keywordFallback: 'always',
      });
      const snap = metrics.snapshot();
      // Exactly one rag.retrieve metric fires per retrieve() call
      const retrieveKeys = Object.keys(snap).filter(k => k.startsWith('rag.retrieve|'));
      expect(retrieveKeys.length).toBe(1);
      expect(snap[retrieveKeys[0]]).toBe(1);
      // Label is one of the expected enum values
      const labelMatch = /fallback=(unused|rescued|merged)/.exec(retrieveKeys[0]);
      expect(labelMatch).not.toBeNull();
      expect(['unused', 'rescued', 'merged']).toContain(labelMatch[1]);
    });
  });

  // ── 4. Embed-error path emissions ──────────────────────────────────
  describe('embed errors emit rag.embed.error with provider + code', () => {
    const origCohere = process.env.COHERE_API_KEY;
    const origOpenAI = process.env.OPENAI_API_KEY;

    afterEach(() => {
      process.env.COHERE_API_KEY = origCohere;
      process.env.OPENAI_API_KEY = origOpenAI;
      embeddingProvider._fetch = null;
    });

    it('Cohere missing key → rag.embed.error with LIVE_NOT_CONFIGURED', async () => {
      delete process.env.COHERE_API_KEY;
      await expect(embeddingProvider.liveCohereEmbed('q')).rejects.toBeTruthy();
      const snap = metrics.snapshot();
      const key =
        'rag.embed.error|code=EMBEDDING_LIVE_NOT_CONFIGURED,provider=cohere-embed-multilingual-v3';
      expect(snap[key]).toBe(1);
    });

    it('Cohere 401 → rag.embed.error with AUTH_FAIL', async () => {
      process.env.COHERE_API_KEY = 'bad';
      embeddingProvider._fetch = async () => ({
        ok: false,
        status: 401,
        async json() {
          return {};
        },
      });
      await expect(embeddingProvider.liveCohereEmbed('q')).rejects.toBeTruthy();
      const snap = metrics.snapshot();
      const key = 'rag.embed.error|code=EMBEDDING_AUTH_FAIL,provider=cohere-embed-multilingual-v3';
      expect(snap[key]).toBe(1);
    });

    it('OpenAI 429 → rag.embed.error with RATE_LIMITED', async () => {
      process.env.OPENAI_API_KEY = 'k';
      embeddingProvider._fetch = async () => ({
        ok: false,
        status: 429,
        async json() {
          return {};
        },
      });
      await expect(embeddingProvider.liveOpenAIEmbed('q')).rejects.toBeTruthy();
      const snap = metrics.snapshot();
      const key =
        'rag.embed.error|code=EMBEDDING_RATE_LIMITED,provider=openai-text-embedding-3-large';
      expect(snap[key]).toBe(1);
    });

    it('Cohere malformed → rag.embed.error with MALFORMED_RESPONSE', async () => {
      process.env.COHERE_API_KEY = 'k';
      embeddingProvider._fetch = async () => ({
        ok: true,
        status: 200,
        async json() {
          return { embeddings: {} };
        },
      });
      await expect(embeddingProvider.liveCohereEmbed('q')).rejects.toBeTruthy();
      const snap = metrics.snapshot();
      const key =
        'rag.embed.error|code=EMBEDDING_MALFORMED_RESPONSE,provider=cohere-embed-multilingual-v3';
      expect(snap[key]).toBe(1);
    });
  });

  // ── 5. Grouped snapshot for dashboards ─────────────────────────────
  describe('snapshotGrouped surface', () => {
    it('rag.retrieve labels show up nested under the metric name', async () => {
      const MockChunk = {
        insertMany: async docs => docs.map((d, i) => ({ _id: `c-${i}`, ...d })),
        find: () => ({ lean: async () => [] }), // empty corpus → vector=none + fallback=unused
        updateMany: async () => ({ matchedCount: 0 }),
      };
      const svc = ragServiceFactory({ embeddingProvider, ChunkModel: MockChunk });
      await svc.retrieve('q', { topK: 1, similarityThreshold: 0.9, keywordFallback: false });
      const grouped = metrics.snapshotGrouped();
      expect(grouped['rag.retrieve']).toBeDefined();
      // At least one label-combo present
      expect(Object.keys(grouped['rag.retrieve']).length).toBeGreaterThan(0);
    });
  });
});

/**
 * rag-mvp-wave283.test.js — RAG ingestion + retrieval (W283).
 *
 * Verifies the embedding provider (mock-mode is deterministic + unit-
 * normalized → cosine works correctly) and the rag service (chunking,
 * ingest persists, retrieve scores + ranks + filters + logs).
 *
 * Uses in-memory mocks for the models since the focus is correctness
 * of the algorithm, not Mongoose plumbing.
 */

'use strict';

jest.unmock('mongoose');

const embeddingProvider = require('../services/ai/embeddingProvider');
const ragServiceFactory = require('../services/ai/rag.service');

describe('W283 — RAG MVP (embedding + ingest + retrieve)', () => {
  // ── Embedding provider tests ─────────────────────────────────────────
  describe('embedding provider', () => {
    it('exports the public surface', () => {
      expect(typeof embeddingProvider.embed).toBe('function');
      expect(typeof embeddingProvider.cosineSimilarity).toBe('function');
      expect(typeof embeddingProvider.getProvider).toBe('function');
      expect(typeof embeddingProvider.getDimensions).toBe('function');
    });

    it('mock embedding is deterministic for same input', async () => {
      const a = await embeddingProvider.embed('the quick brown fox');
      const b = await embeddingProvider.embed('the quick brown fox');
      expect(a).toEqual(b);
    });

    it('mock embedding is unit-normalized (length ~= 1)', async () => {
      const v = await embeddingProvider.embed('hello world');
      const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
      expect(norm).toBeCloseTo(1.0, 5);
    });

    it('mock embedding has expected dimensionality', async () => {
      const v = await embeddingProvider.embed('test');
      expect(v.length).toBe(embeddingProvider._MOCK_DIM);
    });

    it('rejects empty input', async () => {
      await expect(embeddingProvider.embed('')).rejects.toMatchObject({
        code: 'EMBEDDING_INVALID_INPUT',
      });
    });

    it('cosineSimilarity of identical vectors = 1.0', async () => {
      const v = await embeddingProvider.embed('lorem ipsum');
      expect(embeddingProvider.cosineSimilarity(v, v)).toBeCloseTo(1.0, 5);
    });

    it('cosineSimilarity of different inputs is between -1 and 1', async () => {
      const a = await embeddingProvider.embed('the quick brown fox');
      const b = await embeddingProvider.embed('jumps over the lazy dog');
      const sim = embeddingProvider.cosineSimilarity(a, b);
      expect(sim).toBeGreaterThanOrEqual(-1);
      expect(sim).toBeLessThanOrEqual(1);
    });

    it('cosineSimilarity handles mismatched lengths gracefully', () => {
      expect(embeddingProvider.cosineSimilarity([1, 0], [1, 0, 0])).toBe(0);
    });
  });

  // ── RAG service tests ────────────────────────────────────────────────
  describe('rag service', () => {
    let svc;
    let chunkStore;
    let retrievalStore;
    let MockChunk;
    let MockRetrieval;

    beforeEach(() => {
      chunkStore = new Map();
      retrievalStore = new Map();
      let nextChunkId = 1;
      let nextRetrievalId = 1;

      MockChunk = {
        async insertMany(docs) {
          const inserted = docs.map(d => {
            const doc = { _id: `c-${nextChunkId++}`, ...d };
            chunkStore.set(doc._id, doc);
            return doc;
          });
          return inserted;
        },
        find(filter) {
          return {
            lean: async () => {
              const all = [...chunkStore.values()];
              return all.filter(c => {
                if (filter.isActive !== undefined && c.isActive !== filter.isActive) return false;
                if (filter.embeddingProvider && c.embeddingProvider !== filter.embeddingProvider)
                  return false;
                if (filter.$or) {
                  return filter.$or.some(cond => {
                    if (cond.branchId) return String(c.branchId) === String(cond.branchId);
                    if (cond.isOrgWide) return c.isOrgWide === true;
                    return false;
                  });
                }
                if (filter.isOrgWide !== undefined && c.isOrgWide !== filter.isOrgWide)
                  return false;
                return true;
              });
            },
          };
        },
        async updateMany(filter, update) {
          let n = 0;
          for (const c of chunkStore.values()) {
            if (filter.sourceDocId && c.sourceDocId !== filter.sourceDocId) continue;
            if (filter.isActive !== undefined && c.isActive !== filter.isActive) continue;
            Object.assign(c, update.$set || {});
            n++;
          }
          return { matchedCount: n, modifiedCount: n };
        },
      };

      MockRetrieval = {
        async create(payload) {
          const doc = { _id: `r-${nextRetrievalId++}`, ...payload };
          retrievalStore.set(doc._id, doc);
          return doc;
        },
        async findByIdAndUpdate(id, update) {
          const doc = retrievalStore.get(id);
          if (doc) Object.assign(doc, update.$set || {});
          return doc;
        },
      };

      svc = ragServiceFactory({
        embeddingProvider,
        ChunkModel: MockChunk,
        RetrievalModel: MockRetrieval,
      });
    });

    it('chunkText splits long text with overlap', () => {
      const text = 'a'.repeat(2000);
      const chunks = svc._chunkText(text, { chunkSize: 800, chunkOverlap: 100 });
      expect(chunks.length).toBe(3);
      expect(chunks[0].length).toBe(800);
      expect(chunks[1].length).toBe(800);
      expect(chunks[2].length).toBeLessThanOrEqual(800);
    });

    it('chunkText returns single chunk for short text', () => {
      expect(svc._chunkText('short', { chunkSize: 800 })).toEqual(['short']);
    });

    it('ingestDocument persists chunks with embeddings', async () => {
      const result = await svc.ingestDocument({
        sourceDocId: 'policy-001',
        sourceDocType: 'internal_policy',
        sourceDocTitle: 'Beneficiary Data Retention Policy',
        text: 'سياسة الاحتفاظ ببيانات المستفيدين تنص على...',
        isOrgWide: true,
      });
      expect(result.sourceDocId).toBe('policy-001');
      expect(result.chunkCount).toBeGreaterThan(0);
      expect(result.embeddingProvider).toBe(embeddingProvider.getProvider());
      expect(chunkStore.size).toBe(result.chunkCount);
    });

    it('ingestDocument rejects missing required fields', async () => {
      await expect(svc.ingestDocument({ sourceDocId: 'x' })).rejects.toMatchObject({
        code: 'RAG_INVALID_DOC',
      });
    });

    it('retrieve scores + ranks chunks, top-K applied', async () => {
      // Ingest 3 chunks with different content
      await svc.ingestDocument({
        sourceDocId: 'doc-1',
        sourceDocType: 'clinical_guideline',
        sourceDocTitle: 'Autism Therapy Guidelines',
        text: 'Applied behavior analysis is the gold standard for autism therapy.',
        isOrgWide: true,
      });
      await svc.ingestDocument({
        sourceDocId: 'doc-2',
        sourceDocType: 'clinical_guideline',
        sourceDocTitle: 'PT for Cerebral Palsy',
        text: 'Physical therapy improves motor function in cerebral palsy patients.',
        isOrgWide: true,
      });
      await svc.ingestDocument({
        sourceDocId: 'doc-3',
        sourceDocType: 'internal_policy',
        sourceDocTitle: 'Documentation Standards',
        text: 'All session notes must include observed behaviors and goal progress.',
        isOrgWide: true,
      });

      const result = await svc.retrieve(
        'Applied behavior analysis is the gold standard for autism therapy.',
        {
          topK: 2,
          similarityThreshold: 0.5,
        }
      );
      // The exact-match chunk should rank first with similarity ≈ 1.0
      expect(result.chunks.length).toBeGreaterThan(0);
      expect(result.chunks[0].similarity).toBeCloseTo(1.0, 3);
      expect(result.chunks[0].sourceDocId).toBe('doc-1');
      expect(result.chunks[0].rank).toBe(1);
      expect(result.topSimilarity).toBeCloseTo(1.0, 3);
      expect(result.chunks.length).toBeLessThanOrEqual(2); // topK respected
    });

    it('retrieve logs an audit entry with queryHash', async () => {
      await svc.ingestDocument({
        sourceDocId: 'doc-1',
        sourceDocType: 'sop',
        sourceDocTitle: 'SOP',
        text: 'Hand hygiene before patient contact.',
        isOrgWide: true,
      });
      const result = await svc.retrieve('hand hygiene', { topK: 5, similarityThreshold: 0 });
      expect(result.retrievalId).toBeTruthy();
      const logged = retrievalStore.get(result.retrievalId);
      expect(logged.queryHash).toMatch(/^[a-f0-9]{64}$/);
      expect(logged.chunkCount).toBeGreaterThan(0);
    });

    it('cite() links retrievalId to LlmTelemetryCall callId', async () => {
      await svc.ingestDocument({
        sourceDocId: 'doc-1',
        sourceDocType: 'sop',
        sourceDocTitle: 'SOP',
        text: 'PPE requirements in isolation rooms.',
        isOrgWide: true,
      });
      const r = await svc.retrieve('PPE in isolation', { topK: 5, similarityThreshold: 0 });
      const result = await svc.cite(r.retrievalId, 'call-abc123');
      expect(result).toMatchObject({ retrievalId: r.retrievalId, callId: 'call-abc123' });
      expect(retrievalStore.get(r.retrievalId).usedInCallId).toBe('call-abc123');
    });

    it('retrieve rejects empty query', async () => {
      await expect(svc.retrieve('')).rejects.toMatchObject({ code: 'RAG_INVALID_QUERY' });
    });

    it('replacePreviousVersion deactivates old chunks before re-ingesting', async () => {
      await svc.ingestDocument({
        sourceDocId: 'doc-v',
        sourceDocType: 'sop',
        sourceDocTitle: 'SOP v1',
        text: 'Old version content.',
        version: 1,
        isOrgWide: true,
      });
      const beforeCount = [...chunkStore.values()].filter(c => c.isActive).length;
      expect(beforeCount).toBeGreaterThan(0);

      await svc.ingestDocument(
        {
          sourceDocId: 'doc-v',
          sourceDocType: 'sop',
          sourceDocTitle: 'SOP v2',
          text: 'New version content.',
          version: 2,
          isOrgWide: true,
        },
        { replacePreviousVersion: true }
      );

      // v1 chunks should now be isActive:false
      const v1Active = [...chunkStore.values()].filter(
        c => c.sourceDocId === 'doc-v' && c.version === 1 && c.isActive
      );
      expect(v1Active.length).toBe(0);
    });
  });

  // ── Model shape ──────────────────────────────────────────────────────
  describe('models', () => {
    it('ClinicalKnowledgeChunk exports provider + doc-type enums', () => {
      const M = require('../models/ClinicalKnowledgeChunk');
      expect(M.EMBEDDING_PROVIDERS).toContain('mock');
      expect(M.EMBEDDING_PROVIDERS).toContain('openai-text-embedding-3-large');
      expect(M.SOURCE_DOC_TYPES).toContain('clinical_guideline');
      expect(M.SOURCE_DOC_TYPES).toContain('cbahi_standard');
    });

    it('RAGRetrieval model exists', () => {
      const M = require('../models/RAGRetrieval');
      expect(typeof M).toBe('function');
    });
  });
});

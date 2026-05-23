/**
 * rag-keyword-fallback-wave283e.test.js — Arabic-aware hybrid retrieval (W283e).
 *
 * Background: with the mock embedding provider (or any poorly-tuned
 * production provider), vector retrieval may return 0 chunks above the
 * default 0.6 threshold even when keyword overlap is obvious. End-to-end
 * proof against in-memory Mongo (during W283d signoff) showed
 *   Q: "طرق الدفع المتاحة" → picks "سياسة إلغاء وتعديل الموعد" (WRONG)
 * because mock vectors give random-ish similarity ~0.06-0.12.
 *
 * W283e adds Arabic-aware keyword fallback:
 *   - Default `keywordFallback: 'auto'` — only kicks in when vector
 *     returns 0 chunks above threshold. Production with a real
 *     embedder will rarely trigger it.
 *   - `keywordFallback: 'always'` — runs both passes, merges, takes top-K.
 *   - `keywordFallback: false` (or 'never') — pure vector (legacy behaviour).
 *
 * Tests cover:
 *   (1) tokenizer: Arabic normalization (alif variants, ta marbuta, diacritics),
 *       stopword removal, short-token filter
 *   (2) keywordScore math
 *   (3) retrieve() in pure-vector mode (existing W283 behavior preserved)
 *   (4) retrieve() with auto-fallback: vector pass empty → keyword pass rescues
 *   (5) retrieve() with always-fallback: keyword hits merged with vector hits
 *   (6) retrieve() with false: no fallback even when vector empty
 *   (7) Return shape includes usedKeywordFallback + vectorMatchCount
 *   (8) Chatbot wiring: ragRetriever.retrieve called with keywordFallback:'auto'
 */

'use strict';

jest.unmock('mongoose');

const fs = require('fs');
const path = require('path');

const embeddingProvider = require('../services/ai/embeddingProvider');
const ragServiceFactory = require('../services/ai/rag.service');

describe('W283e — RAG keyword fallback (Arabic-aware hybrid retrieval)', () => {
  // ── 1. Tokenizer ───────────────────────────────────────────────────
  describe('Arabic tokenizer + normalization', () => {
    const svc = ragServiceFactory({ embeddingProvider });

    it('normalizes alif variants', () => {
      expect(svc._normalizeArabic('أحمد إبراهيم آدم')).toBe('احمد ابراهيم ادم');
    });

    it('normalizes ta marbuta to ha', () => {
      expect(svc._normalizeArabic('سياسة')).toBe('سياسه');
    });

    it('removes diacritics', () => {
      // The word has fathas / dammas / kasras
      const result = svc._normalizeArabic('السَّلامُ');
      expect(result).toBe('السلام');
    });

    it('tokenize drops Arabic stopwords', () => {
      const tokens = svc._tokenize('ما هي سياسة الإلغاء في المركز');
      // 'ما', 'هي', 'في' are stopwords
      expect(tokens.has('ما')).toBe(false);
      expect(tokens.has('هي')).toBe(false);
      expect(tokens.has('في')).toBe(false);
      // 'سياسه' (normalized) + 'الالغاء' (normalized) + 'المركز' should be present
      expect(tokens.has('سياسه')).toBe(true);
      expect(tokens.has('المركز')).toBe(true);
    });

    it('tokenize drops English stopwords from mixed queries', () => {
      const tokens = svc._tokenize('what is the policy');
      expect(tokens.has('what')).toBe(false);
      expect(tokens.has('is')).toBe(false);
      expect(tokens.has('the')).toBe(false);
      expect(tokens.has('policy')).toBe(true);
    });

    it('tokenize drops 1-char tokens', () => {
      const tokens = svc._tokenize('a b ab abc');
      expect(tokens.has('a')).toBe(false);
      expect(tokens.has('b')).toBe(false);
      expect(tokens.has('ab')).toBe(true);
      expect(tokens.has('abc')).toBe(true);
    });
  });

  describe('keywordScore', () => {
    const svc = ragServiceFactory({ embeddingProvider });

    it('returns 0 for empty inputs', () => {
      expect(svc._keywordScore(new Set(), new Set(['a']))).toBe(0);
      expect(svc._keywordScore(new Set(['a']), new Set())).toBe(0);
    });

    it('returns 1.0 when every query token matches', () => {
      const q = new Set(['دفع', 'فاتوره']);
      const c = new Set(['دفع', 'فاتوره', 'مدى', 'تحويل']);
      expect(svc._keywordScore(q, c)).toBe(1.0);
    });

    it('returns partial fraction for partial overlap', () => {
      const q = new Set(['دفع', 'فاتوره', 'الغاء']);
      const c = new Set(['دفع', 'فاتوره', 'مدى']);
      expect(svc._keywordScore(q, c)).toBeCloseTo(2 / 3, 5);
    });
  });

  // ── 4-7. Hybrid retrieve() ─────────────────────────────────────────
  describe('retrieve() hybrid behavior', () => {
    let svc;
    let chunkStore;
    let MockChunk;

    beforeEach(() => {
      chunkStore = new Map();
      let nextId = 1;
      MockChunk = {
        async insertMany(docs) {
          return docs.map(d => {
            const doc = { _id: `c-${nextId++}`, ...d };
            chunkStore.set(doc._id, doc);
            return doc;
          });
        },
        find(_filter) {
          return {
            lean: async () => [...chunkStore.values()].filter(c => c.isActive),
          };
        },
        updateMany: async () => ({ matchedCount: 0 }),
      };
      svc = ragServiceFactory({
        embeddingProvider,
        ChunkModel: MockChunk,
        RetrievalModel: null,
      });
    });

    async function seedThreeArabicChunks() {
      await svc.ingestDocument({
        sourceDocId: 'policy-payment',
        sourceDocType: 'internal_policy',
        sourceDocTitle: 'سياسة طرق الدفع',
        text: 'طرق الدفع المقبولة: مدى وفيزا وApple Pay وSTC Pay والتحويل البنكي.',
        isOrgWide: true,
      });
      await svc.ingestDocument({
        sourceDocId: 'policy-cancellation',
        sourceDocType: 'internal_policy',
        sourceDocTitle: 'سياسة الإلغاء',
        text: 'إلغاء الموعد قبل 24 ساعة مجاني. بعدها رسوم 50%.',
        isOrgWide: true,
      });
      await svc.ingestDocument({
        sourceDocId: 'policy-transport',
        sourceDocType: 'internal_policy',
        sourceDocTitle: 'سياسة النقل',
        text: 'خدمة النقل بالباص للمستفيدين تحت 18 سنة برسوم شهرية.',
        isOrgWide: true,
      });
    }

    it('keyword fallback rescues when vector returns 0 above threshold', async () => {
      await seedThreeArabicChunks();
      // Use a high threshold so vector returns 0 (mock provider gives 0.06-0.12)
      const r = await svc.retrieve('طرق الدفع المتاحة', {
        topK: 1,
        similarityThreshold: 0.6, // vector won't reach this with mock
        // keywordFallback default = 'auto' → kicks in
      });
      expect(r.usedKeywordFallback).toBe(true);
      expect(r.vectorMatchCount).toBe(0);
      expect(r.chunks.length).toBeGreaterThan(0);
      // Most importantly: it picks the CORRECT chunk
      expect(r.chunks[0].sourceDocId).toBe('policy-payment');
      expect(r.chunks[0].matchSource).toBe('keyword');
    });

    it('keyword fallback does NOT trigger when vector finds matches (auto mode)', async () => {
      await seedThreeArabicChunks();
      // Drop threshold to 0 so vector always returns chunks → auto skips fallback
      const r = await svc.retrieve('any query', {
        topK: 3,
        similarityThreshold: 0,
        keywordFallback: 'auto',
      });
      expect(r.usedKeywordFallback).toBe(false);
      expect(r.vectorMatchCount).toBeGreaterThan(0);
      // All chunks marked as vector matches
      for (const c of r.chunks) {
        expect(c.matchSource).toBe('vector');
      }
    });

    it('keywordFallback:false disables fallback even when vector empty', async () => {
      await seedThreeArabicChunks();
      const r = await svc.retrieve('طرق الدفع', {
        topK: 1,
        similarityThreshold: 0.6,
        keywordFallback: false,
      });
      expect(r.usedKeywordFallback).toBe(false);
      expect(r.chunks.length).toBe(0); // strict: no vector, no fallback
    });

    it('keywordFallback:"always" merges keyword hits with vector hits', async () => {
      await seedThreeArabicChunks();
      const r = await svc.retrieve('سياسة الدفع', {
        topK: 5,
        similarityThreshold: 0,
        keywordFallback: 'always',
      });
      // Both vector hits AND keyword hits should be considered.
      // (With low threshold, all 3 chunks get vector hits; keyword hits
      // for the same chunks would be deduped via seenIds.)
      expect(r.chunks.length).toBeGreaterThan(0);
    });

    it('return shape includes usedKeywordFallback + vectorMatchCount', async () => {
      await seedThreeArabicChunks();
      const r = await svc.retrieve('سياسة', {
        topK: 3,
        similarityThreshold: 0.6,
      });
      expect(r).toHaveProperty('usedKeywordFallback');
      expect(r).toHaveProperty('vectorMatchCount');
      expect(typeof r.usedKeywordFallback).toBe('boolean');
      expect(typeof r.vectorMatchCount).toBe('number');
    });

    it('chunks below keyword min-score (0.15) are excluded from fallback', async () => {
      await seedThreeArabicChunks();
      // Query with totally unrelated words → 0 keyword hits in any chunk
      const r = await svc.retrieve('xyzzy unrelated nonsense', {
        topK: 5,
        similarityThreshold: 0.99, // ensure vector empty
        keywordFallback: 'auto',
      });
      // Either 0 chunks or only very-low quality matches — never garbage
      for (const c of r.chunks) {
        expect(c.similarity).toBeGreaterThanOrEqual(0.15);
      }
    });
  });

  // ── 8. Chatbot wiring ──────────────────────────────────────────────
  describe('chatbot wires keywordFallback:auto in the retrieve call', () => {
    const SERVICE_SRC = fs.readFileSync(
      path.join(__dirname, '..', 'intelligence', 'parent-chatbot.service.js'),
      'utf8'
    );

    it('parent-chatbot.service.js passes keywordFallback to retrieve()', () => {
      expect(SERVICE_SRC).toMatch(/keywordFallback:\s*['"]auto['"]/);
    });
  });
});

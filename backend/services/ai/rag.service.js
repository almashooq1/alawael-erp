/**
 * rag.service.js — RAG ingest + retrieve + audit (W283 Phase 3 #5).
 *
 * Pipeline:
 *   ingestDocument(doc, opts)  → chunks + embeds + persists
 *   retrieve(query, opts)      → embeds query, cosine search, returns top-K
 *   cite(callId, retrievalId)  → links a retrieval to an LLM call for audit
 *
 * MVP design: in-process cosine over MongoDB documents. Acceptable up to
 * ~10K chunks per branch. When that exceeds, swap retrieve() to MongoDB
 * Atlas Vector Search by replacing the .find().lean() + cosine loop with
 * an aggregation pipeline using $vectorSearch — same interface,
 * different storage.
 *
 * Chunking: simple paragraph-based, max 800 chars per chunk, 100-char
 * overlap with the previous chunk to preserve sentence boundaries.
 */

'use strict';

const crypto = require('crypto');
const mongoose = require('mongoose');

// W283g — lazy-require risk-metrics registry. Silent no-op if unavailable
// (older repos, test envs that don't wire the registry) so RAG stays usable.
let _metrics = null;
function _emit(name, labels) {
  try {
    if (!_metrics) _metrics = require('../../intelligence/risk-metrics.registry');
    _metrics.inc(name, labels);
  } catch {
    /* registry absent — silent no-op */
  }
}

const DEFAULT_CHUNK_SIZE = 800;
const DEFAULT_CHUNK_OVERLAP = 100;
const DEFAULT_TOP_K = 5;
const DEFAULT_SIMILARITY_THRESHOLD = 0.75;
// W283e: keyword fallback parameters. Activated when vector retrieval returns
// 0 chunks above threshold OR when explicitly enabled via opts.keywordFallback.
const KEYWORD_FALLBACK_MIN_SCORE = 0.15; // require ≥15% of query tokens to match a chunk
// Arabic stop-words (common particles + question words that don't carry meaning)
const STOP_WORDS = new Set([
  'في',
  'من',
  'إلى',
  'على',
  'عن',
  'مع',
  'ما',
  'هل',
  'لا',
  'هذا',
  'هذه',
  'ذلك',
  'التي',
  'الذي',
  'الذين',
  'و',
  'أو',
  'كيف',
  'متى',
  'لماذا',
  'أين',
  'يا',
  'أن',
  'إن',
  'كان',
  'كانت',
  'يكون',
  'تكون',
  'قد',
  'كل',
  'بعض',
  'هو',
  'هي',
  'هم',
  // common English particles in mixed queries
  'the',
  'a',
  'an',
  'is',
  'are',
  'of',
  'to',
  'in',
  'on',
  'at',
  'and',
  'or',
  'what',
  'when',
  'where',
  'why',
  'how',
  'do',
  'does',
]);

/**
 * normalizeArabic — diacritics + alif/yaa/taa-marbuta normalization.
 * Same logic the Parent Chatbot registry uses for keyword matching.
 */
function normalizeArabic(text) {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .replace(/[ً-ٰٟ]/g, '') // remove diacritics (fatha, kasra, damma, etc.)
    .replace(/[أإآ]/g, 'ا') // alif variants → bare alif
    .replace(/ى/g, 'ي') // alif maqsura → ya
    .replace(/ة/g, 'ه') // ta marbuta → ha
    .replace(/[ـ]/g, '') // remove tatweel
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * tokenize — normalize + split + drop stopwords + drop short tokens.
 * Returns a Set for cheap intersection checks.
 */
function tokenize(text) {
  if (!text) return new Set();
  return new Set(
    normalizeArabic(text)
      .split(/[\s,.;:!?،؛"'(){}\[\]<>—–\-_/\\@#%&*+=|~`]+/)
      .filter(w => w.length >= 2 && !STOP_WORDS.has(w))
  );
}

/**
 * keywordScore — fraction of query tokens that appear in chunk tokens.
 * Symmetric option (overlap / max) gives a value in [0, 1].
 */
function keywordScore(queryTokens, chunkTokens) {
  if (queryTokens.size === 0 || chunkTokens.size === 0) return 0;
  let hits = 0;
  for (const qt of queryTokens) {
    if (chunkTokens.has(qt)) hits++;
  }
  return hits / queryTokens.size;
}

function ragServiceFactory({ embeddingProvider, ChunkModel = null, RetrievalModel = null } = {}) {
  if (!embeddingProvider) throw new Error('rag: embeddingProvider required');

  const Chunk = ChunkModel || (mongoose.models?.ClinicalKnowledgeChunk ?? null);
  const Retrieval = RetrievalModel || (mongoose.models?.RAGRetrieval ?? null);

  // ── Chunking ──────────────────────────────────────────────────────────
  function chunkText(text, opts = {}) {
    const size = opts.chunkSize || DEFAULT_CHUNK_SIZE;
    const overlap = opts.chunkOverlap || DEFAULT_CHUNK_OVERLAP;
    if (typeof text !== 'string' || text.length === 0) return [];
    if (text.length <= size) return [text];
    const chunks = [];
    let start = 0;
    while (start < text.length) {
      const end = Math.min(start + size, text.length);
      chunks.push(text.slice(start, end));
      if (end >= text.length) break;
      start = end - overlap;
    }
    return chunks;
  }

  // ── INGEST ────────────────────────────────────────────────────────────
  async function ingestDocument(doc, opts = {}) {
    if (!Chunk) {
      const err = new Error('ClinicalKnowledgeChunk model not available');
      err.code = 'RAG_MODEL_UNAVAILABLE';
      throw err;
    }
    if (!doc?.sourceDocId || !doc?.sourceDocType || !doc?.sourceDocTitle || !doc?.text) {
      const err = new Error('sourceDocId + sourceDocType + sourceDocTitle + text required');
      err.code = 'RAG_INVALID_DOC';
      throw err;
    }

    // De-activate previous version (soft) before re-ingesting
    if (opts.replacePreviousVersion) {
      try {
        await Chunk.updateMany(
          { sourceDocId: doc.sourceDocId, isActive: true },
          { $set: { isActive: false } }
        );
      } catch {
        // best-effort
      }
    }

    const pieces = chunkText(doc.text, opts);
    const provider = embeddingProvider.getProvider();
    const dim = embeddingProvider.getDimensions();

    const chunkDocs = [];
    for (let i = 0; i < pieces.length; i++) {
      const piece = pieces[i];
      const embedding = await embeddingProvider.embed(piece);
      chunkDocs.push({
        sourceDocId: doc.sourceDocId,
        sourceDocType: doc.sourceDocType,
        sourceDocTitle: doc.sourceDocTitle,
        version: doc.version || 1,
        chunkIndex: i,
        sectionPath: doc.sectionPath || null,
        chunkText: piece,
        chunkTokens: Math.ceil(piece.length / 4), // rough Arabic-aware approximation
        languageHint: doc.languageHint || 'ar',
        embedding,
        embeddingDim: dim || embedding.length,
        embeddingProvider: provider,
        branchId: doc.branchId || null,
        isOrgWide: !!doc.isOrgWide,
        isActive: true, // explicit — don't rely on Mongoose default
        ingestedBy: opts.actor?.userId || null,
        metadata: doc.metadata || null,
      });
    }
    let inserted;
    try {
      inserted = await Chunk.insertMany(chunkDocs);
    } catch (err) {
      // Emit embed-error if the failure came from embed step (caught earlier)
      // OR a model-write error (less common). Best-effort telemetry.
      _emit('rag.embed.error', { provider, code: err?.code || 'INSERT_FAILED' });
      throw err;
    }
    _emit('rag.ingest', { provider, sourceDocType: doc.sourceDocType });
    return {
      sourceDocId: doc.sourceDocId,
      version: doc.version || 1,
      chunkCount: inserted.length,
      embeddingProvider: provider,
      embeddingDim: dim,
    };
  }

  // ── RETRIEVE ──────────────────────────────────────────────────────────
  async function retrieve(query, opts = {}) {
    if (!Chunk) {
      const err = new Error('ClinicalKnowledgeChunk model not available');
      err.code = 'RAG_MODEL_UNAVAILABLE';
      throw err;
    }
    if (typeof query !== 'string' || query.length === 0) {
      const err = new Error('query must be a non-empty string');
      err.code = 'RAG_INVALID_QUERY';
      throw err;
    }
    const topK = opts.topK || DEFAULT_TOP_K;
    const threshold =
      opts.similarityThreshold != null ? opts.similarityThreshold : DEFAULT_SIMILARITY_THRESHOLD;
    const provider = embeddingProvider.getProvider();

    const queryEmbedding = await embeddingProvider.embed(query);

    // Filter by branch + provider (vectors must come from same model)
    const baseFilter = {
      isActive: true,
      embeddingProvider: provider,
    };
    if (opts.branchId) {
      baseFilter.$or = [{ branchId: opts.branchId }, { isOrgWide: true }];
    } else {
      baseFilter.isOrgWide = true;
    }

    // In-process cosine — MVP. Swap for $vectorSearch when chunk count > 10K.
    const candidates = await Chunk.find(baseFilter).lean();
    const vectorScored = candidates
      .map(c => ({
        chunkId: c._id,
        sourceDocId: c.sourceDocId,
        sourceDocTitle: c.sourceDocTitle,
        sectionPath: c.sectionPath,
        chunkText: c.chunkText,
        _rawChunk: c, // kept temporarily for the keyword pass; stripped below
        similarity: embeddingProvider.cosineSimilarity(queryEmbedding, c.embedding),
        matchSource: 'vector',
      }))
      .filter(s => s.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);

    // W283e: keyword fallback. Default ON when vector pass yields 0 chunks
    // (avoids POLICY_QUERY downgrading to UNKNOWN purely because the
    // embedding provider is weak — mock-mode or poorly-tuned production
    // provider). Caller can disable via opts.keywordFallback === false,
    // or force-include keyword hits via opts.keywordFallback === 'always'.
    const fbMode = opts.keywordFallback === undefined ? 'auto' : opts.keywordFallback;
    let scored = vectorScored;
    let usedKeywordFallback = false;
    const shouldFallback =
      fbMode === 'always' || (fbMode !== false && fbMode !== 'never' && vectorScored.length === 0);

    if (shouldFallback) {
      const queryTokens = tokenize(query);
      const seenIds = new Set(vectorScored.map(s => String(s.chunkId)));
      const keywordHits = candidates
        .filter(c => !seenIds.has(String(c._id)))
        .map(c => {
          const chunkTokens = tokenize(c.chunkText + ' ' + c.sourceDocTitle);
          return {
            chunkId: c._id,
            sourceDocId: c.sourceDocId,
            sourceDocTitle: c.sourceDocTitle,
            sectionPath: c.sectionPath,
            chunkText: c.chunkText,
            similarity: keywordScore(queryTokens, chunkTokens),
            matchSource: 'keyword',
          };
        })
        .filter(s => s.similarity >= KEYWORD_FALLBACK_MIN_SCORE)
        .sort((a, b) => b.similarity - a.similarity);

      const slotsRemaining = Math.max(0, topK - vectorScored.length);
      const merged = [...vectorScored, ...keywordHits.slice(0, slotsRemaining)];
      if (keywordHits.length > 0) usedKeywordFallback = true;
      scored = merged.slice(0, topK);
    }

    // Strip the _rawChunk helper and rank
    scored = scored
      .map(s => {
        delete s._rawChunk;
        return s;
      })
      .map((s, idx) => ({ ...s, rank: idx + 1 }));

    // Log retrieval (best-effort)
    let retrievalId = null;
    if (Retrieval) {
      try {
        const created = await Retrieval.create({
          queryHash: crypto.createHash('sha256').update(query).digest('hex'),
          queryTokens: Math.ceil(query.length / 4),
          queryLang: opts.queryLang || 'ar',
          embeddingProvider: provider,
          requestedTopK: topK,
          similarityThreshold: threshold,
          retrievedChunks: scored.map(s => ({
            chunkId: s.chunkId,
            similarity: s.similarity,
            rank: s.rank,
          })),
          topSimilarity: scored.length > 0 ? scored[0].similarity : 0,
          chunkCount: scored.length,
          branchId: opts.branchId || null,
          requestedBy: opts.actor?.userId || null,
        });
        retrievalId = created._id;
      } catch {
        // logging failure must not block retrieval
      }
    }

    // W283g — retrieve telemetry. Three label dimensions:
    //   provider   → which embedder ran
    //   vector     → 'some' if vectorScored.length > 0, 'none' otherwise
    //   fallback   → 'rescued' (kw fired AND vector was empty),
    //                'merged' (kw fired AND vector had hits — 'always' mode),
    //                'unused' (kw didn't fire)
    const vectorLabel = vectorScored.length > 0 ? 'some' : 'none';
    let fallbackLabel = 'unused';
    if (usedKeywordFallback) {
      fallbackLabel = vectorScored.length === 0 ? 'rescued' : 'merged';
    }
    _emit('rag.retrieve', { provider, vector: vectorLabel, fallback: fallbackLabel });

    return {
      retrievalId,
      chunks: scored,
      topSimilarity: scored.length > 0 ? scored[0].similarity : 0,
      embeddingProvider: provider,
      usedKeywordFallback,
      vectorMatchCount: vectorScored.length,
    };
  }

  // ── CITE — link a retrieval to an LLM call for audit ──────────────────
  async function cite(retrievalId, callId) {
    if (!Retrieval || !retrievalId || !callId) return null;
    try {
      await Retrieval.findByIdAndUpdate(retrievalId, { $set: { usedInCallId: callId } });
      return { retrievalId, callId, citedAt: new Date() };
    } catch {
      return null;
    }
  }

  return {
    ingestDocument,
    retrieve,
    cite,
    _chunkText: chunkText,
    _normalizeArabic: normalizeArabic,
    _tokenize: tokenize,
    _keywordScore: keywordScore,
    DEFAULT_CHUNK_SIZE,
    DEFAULT_TOP_K,
    DEFAULT_SIMILARITY_THRESHOLD,
    KEYWORD_FALLBACK_MIN_SCORE,
  };
}

module.exports = ragServiceFactory;

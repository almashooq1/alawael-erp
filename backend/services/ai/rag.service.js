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

const DEFAULT_CHUNK_SIZE = 800;
const DEFAULT_CHUNK_OVERLAP = 100;
const DEFAULT_TOP_K = 5;
const DEFAULT_SIMILARITY_THRESHOLD = 0.75;

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
    const inserted = await Chunk.insertMany(chunkDocs);
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
    const scored = candidates
      .map(c => ({
        chunkId: c._id,
        sourceDocId: c.sourceDocId,
        sourceDocTitle: c.sourceDocTitle,
        sectionPath: c.sectionPath,
        chunkText: c.chunkText,
        similarity: embeddingProvider.cosineSimilarity(queryEmbedding, c.embedding),
      }))
      .filter(s => s.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK)
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

    return {
      retrievalId,
      chunks: scored,
      topSimilarity: scored.length > 0 ? scored[0].similarity : 0,
      embeddingProvider: provider,
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
    DEFAULT_CHUNK_SIZE,
    DEFAULT_TOP_K,
    DEFAULT_SIMILARITY_THRESHOLD,
  };
}

module.exports = ragServiceFactory;

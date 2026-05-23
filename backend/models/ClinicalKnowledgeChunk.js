/**
 * ClinicalKnowledgeChunk.js — RAG knowledge base chunks (W283 Phase 3 #5).
 *
 * Each chunk is a small (~800 char) piece of an authoritative document:
 * internal policies, clinical guidelines, regulatory requirements
 * (PDPL, MoH, Disability Authority circulars), CBAHI standards, etc.
 *
 * RAG flow (handled by `rag.service.js`):
 *   1. INGEST   — split a source doc into chunks, compute embeddings,
 *                 persist with metadata (sourceDoc, version, sectionPath).
 *   2. RETRIEVE — embed query, top-K cosine match, return chunks above
 *                 similarity threshold.
 *   3. CITE     — when a chunk is used in an LLM response, log it to
 *                 `RAGRetrieval` so the response is auditable.
 *
 * Design:
 *   • Embedding stored as Number[] (not Buffer) so MongoDB Atlas Vector
 *     Search can index it natively when that becomes available. For now,
 *     cosine similarity is computed in-process — acceptable up to ~10K
 *     chunks per branch.
 *   • `version` lets us re-ingest a doc without losing the old chunks;
 *     RAG-time filter `isActive: true` selects current versions only.
 *   • `tenantBranchId` for multi-tenancy — knowledge is per-branch by
 *     default; org-wide chunks set branchId=null + isOrgWide=true.
 *   • `embeddingProvider` tracks which model produced the vector —
 *     critical because vectors from different models are NOT
 *     interchangeable (different dimensionality, different basis).
 */

'use strict';

const mongoose = require('mongoose');

const EMBEDDING_PROVIDERS = Object.freeze([
  'mock',
  'openai-text-embedding-3-large',
  'openai-text-embedding-3-small',
  'cohere-embed-multilingual-v3',
]);

const SOURCE_DOC_TYPES = Object.freeze([
  'internal_policy',
  'clinical_guideline',
  'regulation',
  'cbahi_standard',
  'training_material',
  'sop',
  'circular',
  'other',
]);

const chunkSchema = new mongoose.Schema(
  {
    // Source identification
    sourceDocId: { type: String, required: true, trim: true, index: true },
    sourceDocType: { type: String, enum: SOURCE_DOC_TYPES, required: true, index: true },
    sourceDocTitle: { type: String, required: true, trim: true },
    version: { type: Number, required: true, default: 1, min: 1 },

    // Chunk position within source doc
    chunkIndex: { type: Number, required: true, min: 0 },
    sectionPath: { type: String, trim: true }, // e.g. "Chapter 3 > Section 2.1"

    // Content
    chunkText: { type: String, required: true },
    chunkTokens: { type: Number, min: 0 }, // approximate, helps with budget tracking
    languageHint: { type: String, enum: ['ar', 'en', 'mixed'], default: 'ar' },

    // Embedding
    embedding: { type: [Number], required: true }, // dimensionality varies by provider
    embeddingDim: { type: Number, required: true, min: 1 },
    embeddingProvider: { type: String, enum: EMBEDDING_PROVIDERS, required: true, index: true },

    // Scope
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
    isOrgWide: { type: Boolean, default: false, index: true },

    // Status
    isActive: { type: Boolean, default: true, index: true },

    // Provenance + retention
    ingestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    ingestedAt: { type: Date, default: Date.now },
    metadata: { type: mongoose.Schema.Types.Mixed }, // extra fields per doc type
  },
  { timestamps: true, collection: 'clinical_knowledge_chunks' }
);

// Compound indexes for "active chunks for branch X with provider Y"
chunkSchema.index({ branchId: 1, isActive: 1, embeddingProvider: 1 });
chunkSchema.index({ isOrgWide: 1, isActive: 1, embeddingProvider: 1 });
chunkSchema.index({ sourceDocId: 1, version: -1 });

module.exports = mongoose.model('ClinicalKnowledgeChunk', chunkSchema);
module.exports.EMBEDDING_PROVIDERS = EMBEDDING_PROVIDERS;
module.exports.SOURCE_DOC_TYPES = SOURCE_DOC_TYPES;

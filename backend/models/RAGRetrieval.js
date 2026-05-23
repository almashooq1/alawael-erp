/**
 * RAGRetrieval.js — audit trail for RAG retrievals (W283).
 *
 * Every time the RAG pipeline answers a query (Parent Chatbot, Care
 * Plan LLM, report generator), it logs:
 *   • queryHash — sha256 of the user query (we don't store raw user
 *     text per PDPL minimization)
 *   • retrievedChunkIds — which chunks were surfaced (for "show
 *     citations" UX + auditability)
 *   • topSimilarity — best match score, helps detect knowledge gaps
 *   • usedInCallId — links to the LlmTelemetryCall row, so when an LLM
 *     response is questioned we can trace exactly what sources backed it
 *
 * 30-day TTL aligns with existing LlmTelemetryCall TTL (PDPL minimization).
 */

'use strict';

const mongoose = require('mongoose');

const retrievalSchema = new mongoose.Schema(
  {
    queryHash: { type: String, required: true, index: true }, // sha256 hex
    queryTokens: { type: Number, min: 0 }, // approximate
    queryLang: { type: String, enum: ['ar', 'en', 'mixed'], default: 'ar' },

    embeddingProvider: { type: String, required: true },
    requestedTopK: { type: Number, required: true, min: 1, max: 50 },
    similarityThreshold: { type: Number, default: 0.75, min: 0, max: 1 },

    retrievedChunks: [
      {
        chunkId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClinicalKnowledgeChunk' },
        similarity: { type: Number, min: -1, max: 1 },
        rank: { type: Number, min: 1 },
      },
    ],
    topSimilarity: { type: Number, min: -1, max: 1 },
    chunkCount: { type: Number, default: 0 },

    // Cross-references
    usedInCallId: { type: String, trim: true, index: true }, // LlmTelemetryCall.callId
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    retrievedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false, collection: 'rag_retrievals' }
);

// 30-day TTL — aligns with LlmTelemetryCall PDPL retention
retrievalSchema.index({ retrievedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model('RAGRetrieval', retrievalSchema);

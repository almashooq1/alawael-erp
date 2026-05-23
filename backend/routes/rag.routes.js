/**
 * rag.routes.js — RAG admin + read endpoints (W283b).
 *
 * Admin-facing surface for knowledge-base management:
 *   POST /ingest            — ingest a document (chunks + embeds + persists)
 *   POST /retrieve          — manual retrieval for testing / preview
 *   GET  /chunks            — list active chunks (paginated, light fields)
 *   POST /deactivate/:id    — soft-delete a chunk (isActive=false)
 *
 * MFA tiers:
 *   POST /ingest                tier 2 (writes authoritative content; admin op)
 *   POST /deactivate/:id        tier 2 (mutates KB; admin op)
 *   POST /retrieve              tier 1 (read-only preview)
 *   GET  /chunks                tier 1 (list)
 *   GET  /health                no MFA (config probe)
 */

'use strict';

const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/auth');
const { attachMfaActor, requireMfaTier } = require('../middleware/requireMfaTier');
const safeError = require('../utils/safeError');
const logger = require('../utils/logger');

function getService(req) {
  return req.app._ragService;
}

router.use(authenticate);
router.use(attachMfaActor);

// ── Health probe — config only ─────────────────────────────────────────
router.get('/health', (req, res) => {
  const svc = getService(req);
  if (!svc) return res.status(503).json({ success: false, code: 'RAG_NOT_WIRED' });
  const provider = require('../services/ai/embeddingProvider');
  return res.json({
    success: true,
    embeddingProvider: provider.getProvider(),
    embeddingDimensions: provider.getDimensions(),
    defaults: {
      chunkSize: svc.DEFAULT_CHUNK_SIZE,
      topK: svc.DEFAULT_TOP_K,
      similarityThreshold: svc.DEFAULT_SIMILARITY_THRESHOLD,
    },
  });
});

// ── INGEST — admin op, tier 2 ──────────────────────────────────────────
router.post('/ingest', requireMfaTier(2), async (req, res) => {
  try {
    const svc = getService(req);
    if (!svc) return res.status(503).json({ success: false, code: 'RAG_NOT_WIRED' });
    const actor = { userId: req.user?._id || req.user?.id };
    const doc = {
      sourceDocId: req.body.sourceDocId,
      sourceDocType: req.body.sourceDocType,
      sourceDocTitle: req.body.sourceDocTitle,
      text: req.body.text,
      version: req.body.version || 1,
      languageHint: req.body.languageHint || 'ar',
      sectionPath: req.body.sectionPath || null,
      branchId: req.body.branchId || req.user?.branchId || null,
      isOrgWide: req.body.isOrgWide === true,
      metadata: req.body.metadata || null,
    };
    const opts = {
      replacePreviousVersion: req.body.replacePreviousVersion === true,
      chunkSize: req.body.chunkSize,
      chunkOverlap: req.body.chunkOverlap,
      actor,
    };
    const result = await svc.ingestDocument(doc, opts);
    return res.status(201).json({ success: true, ...result });
  } catch (err) {
    const status =
      err.code === 'RAG_INVALID_DOC' ? 400 : err.code === 'RAG_MODEL_UNAVAILABLE' ? 503 : 500;
    logger.warn('[rag] ingest error', { code: err.code });
    return res
      .status(status)
      .json({ success: false, code: err.code || 'INGEST_FAILED', error: safeError(err) });
  }
});

// ── RETRIEVE — preview, tier 1 ────────────────────────────────────────
router.post('/retrieve', requireMfaTier(1), async (req, res) => {
  try {
    const svc = getService(req);
    if (!svc) return res.status(503).json({ success: false, code: 'RAG_NOT_WIRED' });
    const actor = { userId: req.user?._id || req.user?.id };
    const result = await svc.retrieve(req.body.query, {
      topK: req.body.topK,
      similarityThreshold: req.body.similarityThreshold,
      branchId: req.body.branchId || req.user?.branchId || null,
      queryLang: req.body.queryLang || 'ar',
      actor,
    });
    return res.json({ success: true, ...result });
  } catch (err) {
    const status =
      err.code === 'RAG_INVALID_QUERY' ? 400 : err.code === 'RAG_MODEL_UNAVAILABLE' ? 503 : 500;
    return res
      .status(status)
      .json({ success: false, code: err.code || 'RETRIEVE_FAILED', error: safeError(err) });
  }
});

// ── LIST CHUNKS — light fields, tier 1 ────────────────────────────────
router.get('/chunks', requireMfaTier(1), async (req, res) => {
  try {
    const Chunk = require('../models/ClinicalKnowledgeChunk');
    const filter = { isActive: true };
    if (req.query.sourceDocId) filter.sourceDocId = req.query.sourceDocId;
    if (req.query.sourceDocType) filter.sourceDocType = req.query.sourceDocType;
    if (req.user?.branchId) {
      filter.$or = [{ branchId: req.user.branchId }, { isOrgWide: true }];
    } else {
      filter.isOrgWide = true;
    }
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const items = await Chunk.find(filter)
      .select('-embedding') // light — don't ship the vector
      .sort({ sourceDocId: 1, chunkIndex: 1 })
      .limit(limit)
      .lean();
    return res.json({ success: true, items, total: items.length });
  } catch (err) {
    return res.status(500).json({ success: false, error: safeError(err) });
  }
});

// ── DEACTIVATE A CHUNK — admin soft-delete, tier 2 ────────────────────
router.post('/deactivate/:id', requireMfaTier(2), async (req, res) => {
  try {
    const Chunk = require('../models/ClinicalKnowledgeChunk');
    const result = await Chunk.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: false } },
      { new: true }
    );
    if (!result) return res.status(404).json({ success: false, code: 'RAG_CHUNK_NOT_FOUND' });
    return res.json({ success: true, chunkId: result._id, isActive: result.isActive });
  } catch (err) {
    return res.status(500).json({ success: false, error: safeError(err) });
  }
});

// ── METRICS — W283g operational read, tier 1 ──────────────────────────
// Returns ONLY the rag.* family of counters from the shared risk-metrics
// registry. Filters out the W288/W297/W309 risk-sweep + gov-adapter
// counters so the dashboard sees a focused RAG quality view:
//
//   rag.ingest        (provider, sourceDocType)
//   rag.retrieve      (provider, vector, fallback)
//   rag.embed.error   (provider, code)
//
// Includes derived `health` summary: rescue-rate, error-rate per provider.
// Climbing rescue-rate is the signal to upgrade the embedder.
router.get('/metrics', requireMfaTier(1), async (_req, res) => {
  try {
    let registry;
    try {
      registry = require('../intelligence/risk-metrics.registry');
    } catch {
      return res.status(503).json({ success: false, code: 'METRICS_REGISTRY_UNAVAILABLE' });
    }
    const all = registry.snapshotGrouped() || {};
    const counters = {};
    for (const [name, labels] of Object.entries(all)) {
      if (name.startsWith('rag.')) counters[name] = labels;
    }

    // Derived quality summary
    const retrieve = counters['rag.retrieve'] || {};
    let totalRetrieves = 0;
    let rescued = 0;
    let vectorNone = 0;
    for (const [labelKey, count] of Object.entries(retrieve)) {
      totalRetrieves += count;
      if (labelKey.includes('fallback=rescued')) rescued += count;
      if (labelKey.includes('vector=none')) vectorNone += count;
    }
    const embedErr = counters['rag.embed.error'] || {};
    const totalErrors = Object.values(embedErr).reduce((s, n) => s + n, 0);

    const health = {
      totalRetrieves,
      rescueRate: totalRetrieves > 0 ? rescued / totalRetrieves : 0,
      vectorMissRate: totalRetrieves > 0 ? vectorNone / totalRetrieves : 0,
      totalEmbedErrors: totalErrors,
      embedErrorRate: totalRetrieves > 0 ? totalErrors / totalRetrieves : 0,
    };

    return res.json({ success: true, counters, health });
  } catch (err) {
    logger.error('[rag] metrics error', { err: err && err.message });
    return res
      .status(500)
      .json({ success: false, code: 'METRICS_FAILED', error: safeError(err) });
  }
});

module.exports = router;

'use strict';

/**
 * ragBootstrap.js — wire the W283 RAG service + routes (W283b).
 *
 * Constructs `ragService` (factory pattern, no MFA option needed — gates
 * live at the route layer + at consumer call sites). Attaches to
 * `app._ragService` for late binding by routes AND by other services
 * (Parent Chatbot W283c, Care Plan LLM, report generators).
 *
 * Mounts admin routes at:
 *   /api/rag
 *   /api/v1/rag
 *
 * No live-mode env required for the embedding provider in dev — defaults
 * to mock. For production, set EMBEDDING_PROVIDER + the corresponding
 * provider env (OPENAI_API_KEY or COHERE_API_KEY).
 */

function wireRag(app, deps = {}) {
  const { logger } = deps;
  if (!app || !logger) throw new Error('ragBootstrap.wireRag: app + logger required');

  try {
    const ragServiceFactory = require('../services/ai/rag.service');
    const embeddingProvider = require('../services/ai/embeddingProvider');
    const ragRouter = require('../routes/rag.routes');

    const ragService = ragServiceFactory({ embeddingProvider });

    app._ragService = ragService;
    app._embeddingProvider = embeddingProvider;

    app.use('/api/rag', ragRouter);
    app.use('/api/v1/rag', ragRouter);

    logger.info(
      `[startup] RAG wired (W283b): /api/rag + /api/v1/rag, embeddingProvider=${embeddingProvider.getProvider()}, dim=${embeddingProvider.getDimensions()}`
    );
  } catch (err) {
    logger.warn('[startup] RAG wiring failed (W283b)', { err: err.message });
  }
}

module.exports = { wireRag };

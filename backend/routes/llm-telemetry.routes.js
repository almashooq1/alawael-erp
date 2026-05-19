'use strict';

/**
 * llm-telemetry.routes.js — Wave 131 / cross-service LLM ops.
 *
 * Single admin endpoint that surfaces telemetry from EVERY LLM
 * service registered via Wave 131's llm-registry. Avoids
 * proliferating per-service telemetry routes as new LLM features
 * come online (currently 2 — parent-chatbot + care-plan; future
 * recommender / risk-score / etc.).
 *
 * Routes:
 *   GET /api/v1/ai/llm-telemetry        ← cross-service aggregate
 *   GET /api/v1/ai/llm-services         ← list registered service names
 *
 * Perm:
 *   ai.telemetry.read — wider than admin.chatbot.read because it
 *   covers all current + future LLM services, not just the chatbot.
 */

const express = require('express');
const safeError = require('../utils/safeError');

function actorFrom(req) {
  return {
    userId: req.user?.id || req.user?._id || null,
    role: req.user?.role || req.user?.roleCode || null,
  };
}

function createLlmTelemetryRouter({
  llmRegistry = null,
  governance = null,
  logger = console,
} = {}) {
  if (!llmRegistry || typeof llmRegistry.getAllTelemetry !== 'function') {
    throw new Error('llm-telemetry.routes: llmRegistry is required');
  }
  if (!governance || typeof governance.hasPermission !== 'function') {
    throw new Error('llm-telemetry.routes: governance service is required');
  }
  void logger;

  const router = express.Router();

  function requirePerm(code) {
    return (req, res, next) => {
      const actor = actorFrom(req);
      if (!actor.userId) {
        return res
          .status(401)
          .json({ success: false, message: 'AUTH_REQUIRED', reason: 'AUTH_REQUIRED' });
      }
      if (!governance.hasPermission(actor.role, code)) {
        return res.status(403).json({
          success: false,
          message: 'PERMISSION_DENIED',
          reason: 'PERMISSION_DENIED',
          requiredPermission: code,
        });
      }
      return next();
    };
  }

  router.get('/llm-telemetry', requirePerm('ai.telemetry.read'), (req, res) => {
    try {
      const q = req.query || {};
      const result = llmRegistry.getAllTelemetry({
        since: q.since || null,
        bucketHours: q.bucketHours ? Number(q.bucketHours) : 1,
      });
      return res.json({ success: true, data: result });
    } catch (err) {
      return safeError(res, err, 'ai.llm-telemetry');
    }
  });

  router.get('/llm-services', requirePerm('ai.telemetry.read'), (req, res) => {
    try {
      return res.json({ success: true, data: { services: llmRegistry.list() } });
    } catch (err) {
      return safeError(res, err, 'ai.llm-services');
    }
  });

  return router;
}

module.exports = { createLlmTelemetryRouter };

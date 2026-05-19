'use strict';

/**
 * llm-anomalies.routes.js — Wave 142.
 *
 * Admin surface for the LLM anomaly detector. Mirrors the Wave 113
 * (Hikvision) anomalies route shape — a single read-only endpoint
 * returning {ok, generatedAt, items[], summary{}} suitable for a
 * polling dashboard.
 *
 * Routes:
 *   GET /api/v1/ai/llm-anomalies            ← cached (30s TTL)
 *   GET /api/v1/ai/llm-anomalies?skipCache=1 ← force re-evaluation
 *
 * Perm:
 *   Reuses ai.telemetry.read — the anomaly payload exposes the same
 *   cost/fallback figures as the telemetry endpoint, so introducing
 *   a separate perm would only enlarge the surface area without
 *   meaningfully narrowing the data audience.
 */

const express = require('express');
const safeError = require('../utils/safeError');

function actorFrom(req) {
  return {
    userId: req.user?.id || req.user?._id || null,
    role: req.user?.role || req.user?.roleCode || null,
  };
}

function createLlmAnomaliesRouter({ detector = null, governance = null, logger = console } = {}) {
  if (!detector || typeof detector.detect !== 'function') {
    throw new Error('llm-anomalies.routes: detector is required');
  }
  if (!governance || typeof governance.hasPermission !== 'function') {
    throw new Error('llm-anomalies.routes: governance service is required');
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

  router.get('/llm-anomalies', requirePerm('ai.telemetry.read'), (req, res) => {
    try {
      const skipCache =
        req.query.skipCache === '1' ||
        req.query.skipCache === 'true' ||
        req.query.skipCache === true;
      const result = detector.detect({ skipCache });
      if (!result.ok) {
        return res
          .status(503)
          .json({ success: false, reason: result.reason, message: result.message });
      }
      return res.json({ success: true, data: result });
    } catch (err) {
      return safeError(res, err, 'ai.llm-anomalies');
    }
  });

  return router;
}

module.exports = { createLlmAnomaliesRouter };

'use strict';

/**
 * llm-anomalies.routes.js — Wave 142 + Wave 144 (history).
 *
 * Admin surface for the LLM anomaly detector. Mirrors the Wave 113
 * (Hikvision) anomalies route shape — a polling dashboard
 * endpoint plus (since Wave 144) history + trend + manual-scan.
 *
 * Routes:
 *   GET  /api/v1/ai/llm-anomalies              ← live, cached (30s)
 *   GET  /api/v1/ai/llm-anomalies?skipCache=1
 *   GET  /api/v1/ai/llm-anomalies/history      ← Wave 144 list
 *   GET  /api/v1/ai/llm-anomalies/trend        ← Wave 144 chart
 *   POST /api/v1/ai/llm-anomalies/scan         ← Wave 144 manual run
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

function createLlmAnomaliesRouter({
  detector = null,
  history = null,
  governance = null,
  logger = console,
} = {}) {
  if (!detector || typeof detector.detect !== 'function') {
    throw new Error('llm-anomalies.routes: detector is required');
  }
  if (!governance || typeof governance.hasPermission !== 'function') {
    throw new Error('llm-anomalies.routes: governance service is required');
  }
  // history is optional — when absent, the Wave 144 routes self-disable.
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

  function requireHistory(res) {
    if (!history) {
      res.status(503).json({
        success: false,
        reason: 'LLM_ANOMALY_HISTORY_UNAVAILABLE',
        message: 'persistence layer is not configured',
      });
      return false;
    }
    return true;
  }

  // ─── Wave 144 — history list ────────────────────────────────
  router.get('/llm-anomalies/history', requirePerm('ai.telemetry.read'), async (req, res) => {
    try {
      if (!requireHistory(res)) return;
      const q = req.query || {};
      const r = await history.listRecent({
        limit: q.limit ? Number(q.limit) : 50,
        since: q.since || null,
        source: q.source || null,
      });
      return res.json({ success: true, data: r });
    } catch (err) {
      return safeError(res, err, 'ai.llm-anomalies.history');
    }
  });

  // ─── Wave 144 — trend chart ─────────────────────────────────
  router.get('/llm-anomalies/trend', requirePerm('ai.telemetry.read'), async (req, res) => {
    try {
      if (!requireHistory(res)) return;
      const q = req.query || {};
      const r = await history.getTrend({
        hours: q.hours ? Number(q.hours) : 24,
        bucketMinutes: q.bucketMinutes ? Number(q.bucketMinutes) : 30,
      });
      return res.json({ success: true, data: r });
    } catch (err) {
      return safeError(res, err, 'ai.llm-anomalies.trend');
    }
  });

  // ─── Wave 144 — manual scan + persist ───────────────────────
  router.post('/llm-anomalies/scan', requirePerm('ai.telemetry.read'), async (req, res) => {
    try {
      if (!requireHistory(res)) return;
      const start = Date.now();
      const detectionResult = detector.detect({ skipCache: true });
      const durationMs = Date.now() - start;
      const actor = actorFrom(req);
      const persisted = await history.recordSnapshot({
        detectionResult,
        source: 'manual',
        durationMs,
        meta: { actor: actor.userId, role: actor.role },
      });
      if (!persisted.ok) {
        return res.status(persisted.reason ? 409 : 500).json({
          success: false,
          reason: persisted.reason,
          message: persisted.message,
          errors: persisted.errors,
        });
      }
      return res.json({
        success: true,
        data: { detection: detectionResult, snapshot: persisted.snapshot, durationMs },
      });
    } catch (err) {
      return safeError(res, err, 'ai.llm-anomalies.scan');
    }
  });

  return router;
}

module.exports = { createLlmAnomaliesRouter };

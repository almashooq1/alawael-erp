'use strict';

/**
 * insights.routes.js — Wave 19 (Intelligence Layer HTTP API).
 *
 * Mirrors the Wave 15 `alerts-workflow.routes.js` pattern. Every
 * write endpoint maps 1:1 onto an `InsightsService` method (Wave 18).
 * The route layer is narrow: parse + actor + status-code translation.
 *
 * Status code map:
 *
 *   service result                        HTTP
 *   ------------------------------------- -----
 *   { ok: true, insight }                 200
 *   { ok: true, noop: true }              200  (idempotent)
 *   { ok: false, reason: 'NOT_FOUND' }    404
 *   { ok: false, reason: 'ACTOR_REQUIRED' }       401
 *   { ok: false, reason: 'INVALID_REASON_CODE' }  400
 *   { ok: false, reason: 'NOTE_TEXT_REQUIRED' }   400
 *   { ok: false, reason: 'NOTE_TEXT_TOO_LONG' }   413
 *   { ok: false, reason: 'INVALID_PAYLOAD' }      400
 *   { ok: false, reason: 'VALIDATION_FAILED' }    422
 *
 * Authentication: router is mounted behind `authenticate` middleware
 * in app.js. There is no fine-grained role gating in this file —
 * intelligence insights are visible to every authenticated user,
 * filtered by branch/role downstream via the same pattern as alerts
 * dashboard routes (Wave 15.5).
 */

const express = require('express');
const safeError = require('../utils/safeError');

const REASON_TO_STATUS = Object.freeze({
  NOT_FOUND: 404,
  ACTOR_REQUIRED: 401,
  INVALID_REASON_CODE: 400,
  NOTE_TEXT_REQUIRED: 400,
  NOTE_TEXT_TOO_LONG: 413,
  INVALID_PAYLOAD: 400,
  VALIDATION_FAILED: 422,
});

const LIST_KIND_FILTER = new Set([
  'anomaly',
  'trend-deviation',
  'risk-score',
  'opportunity',
  'workflow-delay',
  'branch-underperform',
  'attendance-risk',
  'care-gap',
  'executive-digest',
  'weekly-summary',
]);
const LIST_SEVERITY_FILTER = new Set(['low', 'medium', 'high', 'critical']);
const LIST_STATE_FILTER = new Set(['active', 'confirmed', 'dismissed', 'resolved', 'expired']);
const LIST_CATEGORY_FILTER = new Set([
  'clinical',
  'financial',
  'hr',
  'operational',
  'quality',
  'compliance',
]);

function respond(res, result) {
  if (result && result.ok) {
    return res.json({ success: true, data: result });
  }
  const status = (result && REASON_TO_STATUS[result.reason]) || 400;
  return res.status(status).json({
    success: false,
    message: result?.reason || result?.message || 'INSIGHT_REJECTED',
    reason: result?.reason,
  });
}

function actorFrom(req) {
  return {
    userId: req.user?.id || req.user?._id || null,
    role: req.user?.role || req.user?.roleCode || null,
    ip: req.ip,
  };
}

/**
 * @param {object} opts
 *   - insights:     InsightsService instance (createInsightsService output)
 *   - insightModel: defaults to canonical model (used by list/get/scoreboard
 *                   read paths that don't go through the service)
 *   - logger:       console-compatible
 */
function createInsightsRouter({ insights, insightModel = null, logger = console } = {}) {
  if (!insights || typeof insights.confirmInsight !== 'function') {
    throw new Error('insights.routes: insights service is required');
  }
  void logger;

  function modelFor() {
    if (
      insightModel &&
      (insightModel.model ||
        typeof insightModel.findById === 'function' ||
        typeof insightModel.find === 'function')
    ) {
      return insightModel.model || insightModel;
    }
    return require('../intelligence/insight.model').model;
  }

  const router = express.Router();

  // GET / — list insights with role-blind filter contract.
  //   ?kind=anomaly&severity=high&category=clinical&state=active
  //   &branchId=<id>&generatorId=anomaly.v1&limit=50
  router.get('/', async (req, res) => {
    try {
      const Model = modelFor();
      const filter = { state: { $in: ['active', 'confirmed'] } };
      const q = req.query || {};

      if (q.kind && LIST_KIND_FILTER.has(q.kind)) filter.kind = q.kind;
      if (q.severity && LIST_SEVERITY_FILTER.has(q.severity)) filter.severity = q.severity;
      if (q.category && LIST_CATEGORY_FILTER.has(q.category)) filter.category = q.category;
      if (q.state && LIST_STATE_FILTER.has(q.state)) filter.state = q.state;
      if (q.branchId) filter.branchId = q.branchId;
      if (q.generatorId) filter['source.generatorId'] = q.generatorId;
      // Tend to hide expired ones unless explicitly asked.
      if (q.includeExpired !== 'true') {
        filter.$or = [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }];
      }

      const limit = Math.min(Math.max(parseInt(q.limit, 10) || 50, 1), 200);
      const docs = await Model.find(filter)
        .sort({ severity: 1, generatedAt: -1 })
        .limit(limit)
        .lean();

      return res.json({
        success: true,
        data: { insights: docs, count: docs.length, filter: { ...q, limit } },
      });
    } catch (err) {
      return safeError(res, err, 'insights.list');
    }
  });

  // GET /scoreboard — generator quality scoreboard.
  // Returns one row per generatorId with confirm/dismiss/noise/trust.
  router.get('/scoreboard', async (req, res) => {
    try {
      const rows = await insights.generatorScoreboard();
      return res.json({ success: true, data: { rows, count: rows.length } });
    } catch (err) {
      return safeError(res, err, 'insights.scoreboard');
    }
  });

  // GET /:id — fetch one insight (with all G-bound fields visible).
  router.get('/:id', async (req, res) => {
    try {
      const Model = modelFor();
      const doc = await Model.findById(req.params.id).lean();
      if (!doc) return res.status(404).json({ success: false, message: 'NOT_FOUND' });
      return res.json({ success: true, data: { insight: doc } });
    } catch (err) {
      return safeError(res, err, 'insights.get');
    }
  });

  // POST /:id/confirm — operator confirms the insight was actionable.
  router.post('/:id/confirm', async (req, res) => {
    try {
      const result = await insights.confirmInsight({
        insightId: req.params.id,
        actor: actorFrom(req),
      });
      return respond(res, result);
    } catch (err) {
      return safeError(res, err, 'insights.confirm');
    }
  });

  // POST /:id/dismiss — { reasonCode, note? }
  router.post('/:id/dismiss', async (req, res) => {
    try {
      const { reasonCode, note } = req.body || {};
      const result = await insights.dismissInsight({
        insightId: req.params.id,
        reasonCode,
        note: typeof note === 'string' ? note : null,
        actor: actorFrom(req),
      });
      return respond(res, result);
    } catch (err) {
      return safeError(res, err, 'insights.dismiss');
    }
  });

  // POST /:id/note — { text }
  router.post('/:id/note', async (req, res) => {
    try {
      const { text } = req.body || {};
      const result = await insights.addNote({
        insightId: req.params.id,
        text,
        actor: actorFrom(req),
      });
      return respond(res, result);
    } catch (err) {
      return safeError(res, err, 'insights.note');
    }
  });

  // POST /:id/resolve — engine or operator marks the underlying signal clear.
  router.post('/:id/resolve', async (req, res) => {
    try {
      const result = await insights.markResolved({
        insightId: req.params.id,
        actor: actorFrom(req),
      });
      return respond(res, result);
    } catch (err) {
      return safeError(res, err, 'insights.resolve');
    }
  });

  return router;
}

module.exports = { createInsightsRouter };

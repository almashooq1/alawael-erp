'use strict';

/**
 * no-show-prediction.routes.js — Wave 115 / P3.4.
 *
 * HTTP surface for the no-show prediction service.
 * Mounted at /api/v1/ai/no-show behind the authenticate middleware.
 *
 * Routes:
 *   POST /predict/appointment/:id   ← run fresh prediction (persists)
 *   POST /predict/batch             ← run batch (persists)
 *   GET  /summary                   ← branch aggregation
 *
 * Permission model mirrors Hikvision:
 *   ai.no-show.read    — GET summary (read aggregations)
 *   ai.no-show.predict — POST predict/appointment
 *   ai.no-show.batch   — POST predict/batch (gated higher because
 *                        it persists ~10-100 predictions per call)
 *
 * `dryRun=1` is supported on POST endpoints — runs the heuristic and
 * returns the result without persisting an AiPrediction document.
 */

const express = require('express');
const safeError = require('../utils/safeError');
const reg = require('../intelligence/no-show-prediction.registry');

const REASON_TO_STATUS = Object.freeze({
  PERMISSION_DENIED: 403,
  [reg.REASON.NO_SHOW_APPOINTMENT_NOT_FOUND]: 404,
  [reg.REASON.NO_SHOW_APPOINTMENT_INVALID_STATUS]: 409,
  [reg.REASON.NO_SHOW_BENEFICIARY_REQUIRED]: 400,
  [reg.REASON.NO_SHOW_PERSIST_FAILED]: 500,
  [reg.REASON.NO_SHOW_PREDICTION_UNAVAILABLE]: 503,
  [reg.REASON.NO_SHOW_VALIDATION_FAILED]: 422,
});

function actorFrom(req) {
  return {
    userId: req.user?.id || req.user?._id || null,
    role: req.user?.role || req.user?.roleCode || null,
    ip: req.ip,
  };
}

function respond(res, result) {
  if (result && result.ok) {
    const { ok: _ok, ...data } = result;
    void _ok;
    return res.json({ success: true, data });
  }
  const status = (result && REASON_TO_STATUS[result.reason]) || 400;
  return res.status(status).json({
    success: false,
    message: result?.reason || 'NO_SHOW_REJECTED',
    reason: result?.reason,
    ...(result?.details ? { details: result.details } : {}),
    ...(result?.message ? { error: result.message } : {}),
  });
}

function isTrue(v) {
  return v === '1' || v === 'true' || v === true;
}

/**
 * @param {object} opts
 * @param {object} opts.predictionService   — createNoShowPredictionService instance
 * @param {object} opts.governance          — governance service (hasPermission)
 * @param {object} [opts.logger]
 */
function createNoShowPredictionRouter({
  predictionService = null,
  governance = null,
  logger = console,
} = {}) {
  if (!predictionService || typeof predictionService.predictForAppointment !== 'function') {
    throw new Error('no-show-prediction.routes: predictionService is required');
  }
  if (!governance || typeof governance.hasPermission !== 'function') {
    throw new Error('no-show-prediction.routes: governance service is required');
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

  // ─── Routes ────────────────────────────────────────────────────

  // POST /predict/appointment/:id
  router.post('/predict/appointment/:id', requirePerm('ai.no-show.predict'), async (req, res) => {
    try {
      const dryRun = isTrue(req.query?.dryRun);
      const result = await predictionService.predictForAppointment(req.params.id, { dryRun });
      return respond(res, result);
    } catch (err) {
      return safeError(res, err, 'ai.no-show.predict');
    }
  });

  // POST /predict/batch
  router.post('/predict/batch', requirePerm('ai.no-show.batch'), async (req, res) => {
    try {
      const branchId = req.body?.branchId || req.query?.branchId || null;
      const horizonHours = Number(
        req.body?.horizonHours || req.query?.horizonHours || reg.DEFAULT_BATCH_HORIZON_HOURS
      );
      const dryRun = isTrue(req.body?.dryRun ?? req.query?.dryRun);
      const result = await predictionService.predictBatch({
        branchId,
        horizonHours,
        dryRun,
      });
      return respond(res, result);
    } catch (err) {
      return safeError(res, err, 'ai.no-show.batch');
    }
  });

  // GET /summary
  router.get('/summary', requirePerm('ai.no-show.read'), async (req, res) => {
    try {
      const branchId = req.query?.branchId || null;
      const since = req.query?.since || null;
      const result = await predictionService.summarizeByBranch({ branchId, since });
      return respond(res, result);
    } catch (err) {
      return safeError(res, err, 'ai.no-show.summary');
    }
  });

  return router;
}

module.exports = {
  createNoShowPredictionRouter,
  REASON_TO_STATUS,
};

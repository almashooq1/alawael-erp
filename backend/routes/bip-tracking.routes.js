'use strict';

/**
 * bip-tracking.routes.js — Wave 267
 * ════════════════════════════════════════════════════════════════════
 * HTTP surface for BIP fidelity + effectiveness tracking. Companion
 * to the existing FBA infrastructure (BehavioralFunctionAssessment
 * model already shipped via smart-assessment-engine).
 *
 * Endpoints (under /api/bip-tracking + /api/v1/bip-tracking):
 *
 *   GET   /_health
 *
 *   Fidelity:
 *   POST  /fidelity                                  → record check
 *   GET   /fidelity/fba/:fbaAssessmentId             → list history
 *   GET   /fidelity/fba/:fbaAssessmentId/trend       → trend (last N)
 *
 *   Effectiveness:
 *   POST  /effectiveness                             → record reading
 *   GET   /effectiveness/fba/:fbaAssessmentId        → list history
 *   GET   /effectiveness/fba/:fbaAssessmentId/trend  → trend (last N)
 *
 *   Cross-cutting:
 *   GET   /at-risk?branchId=                         → BIPs needing
 *                                                     attention
 *   GET   /diagnosis/fba/:fbaAssessmentId            → combined
 *                                                     fidelity ×
 *                                                     effectiveness
 *                                                     four-bucket
 *
 * Auth: all data routes require authenticate + requireBranchAccess.
 * _health is public (W226 convention).
 * ════════════════════════════════════════════════════════════════════
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const logger = require('../utils/logger');

const bip = require('../services/bipFidelityEffectiveness.service');

// ─── Health ──────────────────────────────────────────────────────
router.get('/_health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      wave: 'W267',
      surface: 'bip-tracking',
      endpoints: 9,
      services: ['bipFidelityEffectiveness.service (W267)'],
    },
  });
});

router.use(authenticate);
router.use(requireBranchAccess);

function _toErrorResponse(err) {
  const msg = err && err.message ? String(err.message) : 'unknown error';
  if (msg.match(/required|invalid|must be|cannot be|not found|at least one/i)) {
    return { status: 400, body: { success: false, error: msg } };
  }
  const body =
    process.env.NODE_ENV === 'production'
      ? { success: false, message: 'حدث خطأ داخلي' }
      : { success: false, message: msg };
  return { status: 500, body };
}

function _actorId(req) {
  return (req.user && (req.user._id || req.user.id)) || null;
}

function _parseDate(val) {
  if (!val) return undefined;
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

// ════════════════════════════════════════════════════════════════════
// Fidelity
// ════════════════════════════════════════════════════════════════════

router.post('/fidelity', async (req, res) => {
  try {
    const actor = _actorId(req);
    if (!actor) {
      return res.status(401).json({ success: false, error: 'authenticated user required' });
    }
    const doc = await bip.recordFidelityCheck(req.body || {}, actor);
    return res.status(201).json({ success: true, data: doc });
  } catch (err) {
    logger.warn('[bip-tracking] POST /fidelity failed: %s', err.message);
    const r = _toErrorResponse(err);
    return res.status(r.status).json(r.body);
  }
});

router.get('/fidelity/fba/:fbaAssessmentId', async (req, res) => {
  try {
    const opts = {
      from: _parseDate(req.query.from),
      to: _parseDate(req.query.to),
      limit: req.query.limit,
    };
    const out = await bip.listFidelityChecks(req.params.fbaAssessmentId, opts);
    return res.json({ success: true, data: out });
  } catch (err) {
    logger.warn('[bip-tracking] GET /fidelity list failed: %s', err.message);
    const r = _toErrorResponse(err);
    return res.status(r.status).json(r.body);
  }
});

router.get('/fidelity/fba/:fbaAssessmentId/trend', async (req, res) => {
  try {
    const lastN = req.query.lastN ? parseInt(req.query.lastN, 10) : undefined;
    const opts = lastN ? { lastN } : {};
    const out = await bip.computeFidelityTrend(req.params.fbaAssessmentId, opts);
    return res.json({ success: true, data: out });
  } catch (err) {
    logger.warn('[bip-tracking] GET /fidelity trend failed: %s', err.message);
    const r = _toErrorResponse(err);
    return res.status(r.status).json(r.body);
  }
});

// ════════════════════════════════════════════════════════════════════
// Effectiveness
// ════════════════════════════════════════════════════════════════════

router.post('/effectiveness', async (req, res) => {
  try {
    const actor = _actorId(req);
    if (!actor) {
      return res.status(401).json({ success: false, error: 'authenticated user required' });
    }
    const doc = await bip.recordEffectivenessReading(req.body || {}, actor);
    return res.status(201).json({ success: true, data: doc });
  } catch (err) {
    logger.warn('[bip-tracking] POST /effectiveness failed: %s', err.message);
    const r = _toErrorResponse(err);
    return res.status(r.status).json(r.body);
  }
});

router.get('/effectiveness/fba/:fbaAssessmentId', async (req, res) => {
  try {
    const opts = {
      from: _parseDate(req.query.from),
      to: _parseDate(req.query.to),
      limit: req.query.limit,
    };
    const out = await bip.listEffectivenessReadings(req.params.fbaAssessmentId, opts);
    return res.json({ success: true, data: out });
  } catch (err) {
    logger.warn('[bip-tracking] GET /effectiveness list failed: %s', err.message);
    const r = _toErrorResponse(err);
    return res.status(r.status).json(r.body);
  }
});

router.get('/effectiveness/fba/:fbaAssessmentId/trend', async (req, res) => {
  try {
    const lastN = req.query.lastN ? parseInt(req.query.lastN, 10) : undefined;
    const opts = lastN ? { lastN } : {};
    const out = await bip.computeEffectivenessTrend(req.params.fbaAssessmentId, opts);
    return res.json({ success: true, data: out });
  } catch (err) {
    logger.warn('[bip-tracking] GET /effectiveness trend failed: %s', err.message);
    const r = _toErrorResponse(err);
    return res.status(r.status).json(r.body);
  }
});

// ════════════════════════════════════════════════════════════════════
// Cross-cutting
// ════════════════════════════════════════════════════════════════════

router.get('/at-risk', async (req, res) => {
  try {
    const branchId = req.query.branchId || req.branchId || undefined;
    const out = await bip.listAtRiskBips({ branchId, limit: req.query.limit });
    return res.json({ success: true, data: out });
  } catch (err) {
    logger.warn('[bip-tracking] GET /at-risk failed: %s', err.message);
    const r = _toErrorResponse(err);
    return res.status(r.status).json(r.body);
  }
});

router.get('/diagnosis/fba/:fbaAssessmentId', async (req, res) => {
  try {
    const fbaId = req.params.fbaAssessmentId;
    const [fidTrend, effTrend] = await Promise.all([
      bip.computeFidelityTrend(fbaId).catch(() => null),
      bip.computeEffectivenessTrend(fbaId).catch(() => null),
    ]);
    const diagnosis = bip._diagnoseBip(fidTrend && fidTrend.latest, effTrend);
    return res.json({
      success: true,
      data: { diagnosis, fidelity: fidTrend, effectiveness: effTrend },
    });
  } catch (err) {
    logger.warn('[bip-tracking] GET /diagnosis failed: %s', err.message);
    const r = _toErrorResponse(err);
    return res.status(r.status).json(r.body);
  }
});

module.exports = router;

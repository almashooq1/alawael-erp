'use strict';

/**
 * gas.routes.js — Wave 264
 * ════════════════════════════════════════════════════════════════════
 * HTTP surface for Goal Attainment Scaling (GAS) — Kiresuk & Sherman
 * 1968 methodology.
 *
 * Endpoints (all under /api/gas and /api/v1/gas):
 *
 *   GET   /_health
 *
 *   Scales:
 *   GET   /scale/goal/:goalId               → active scale for goal
 *   GET   /scale/goal/:goalId/versions      → version history
 *   POST  /scale                            → create active scale
 *   POST  /scale/:id/supersede              → revise scale (new version)
 *   PATCH /scale/:id/archive                → archive
 *
 *   Scorings:
 *   POST  /scoring                          → record a scoring event
 *   POST  /scoring/:id/supersede            → correct a scoring
 *   GET   /scoring/goal/:goalId             → history for one goal
 *   GET   /scoring/beneficiary/:beneficiaryId → recent for beneficiary
 *
 *   Analytics:
 *   GET   /tscore/scale/:scaleId            → single-scale T-score
 *   GET   /tscore/beneficiary/:beneficiaryId → composite T-score
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

const gas = require('../services/gas.service');

// ─── Health check (public) ───────────────────────────────────────
router.get('/_health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      wave: 'W264',
      surface: 'gas',
      endpoints: 13,
      services: ['gas.service (W264)'],
    },
  });
});

router.use(authenticate);
router.use(requireBranchAccess);

// ─── Error helpers ───────────────────────────────────────────────
function _toErrorResponse(err) {
  const msg = err && err.message ? String(err.message) : 'unknown error';
  if (
    msg.match(
      /required|invalid|must be|cannot be|already exists|not found|cannot supersede|cannot score/i
    )
  ) {
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

function _parseBool(val) {
  if (typeof val === 'boolean') return val;
  if (val === 'true') return true;
  if (val === 'false') return false;
  return undefined;
}

// ════════════════════════════════════════════════════════════════════
// Scales
// ════════════════════════════════════════════════════════════════════

router.get('/scale/goal/:goalId', async (req, res) => {
  try {
    const doc = await gas.getActiveByGoal(req.params.goalId);
    if (!doc) {
      return res.status(404).json({ success: false, error: 'No active GAS scale for this goal' });
    }
    return res.json({ success: true, data: doc });
  } catch (err) {
    logger.warn('[gas] GET /scale/goal failed: %s', err.message);
    const r = _toErrorResponse(err);
    return res.status(r.status).json(r.body);
  }
});

router.get('/scale/goal/:goalId/versions', async (req, res) => {
  try {
    const items = await gas.listVersions(req.params.goalId);
    return res.json({ success: true, data: { items, total: items.length } });
  } catch (err) {
    logger.warn('[gas] GET /scale/goal/:goalId/versions failed: %s', err.message);
    const r = _toErrorResponse(err);
    return res.status(r.status).json(r.body);
  }
});

router.post('/scale', async (req, res) => {
  try {
    const actor = _actorId(req);
    if (!actor) {
      return res.status(401).json({ success: false, error: 'authenticated user required' });
    }
    const doc = await gas.createScale(req.body || {}, actor);
    return res.status(201).json({ success: true, data: doc });
  } catch (err) {
    logger.warn('[gas] POST /scale failed: %s', err.message);
    const r = _toErrorResponse(err);
    return res.status(r.status).json(r.body);
  }
});

router.post('/scale/:id/supersede', async (req, res) => {
  try {
    const actor = _actorId(req);
    if (!actor) {
      return res.status(401).json({ success: false, error: 'authenticated user required' });
    }
    const { supersedeReason_ar, ...payload } = req.body || {};
    const doc = await gas.supersedeScale(req.params.id, payload, supersedeReason_ar, actor);
    return res.json({ success: true, data: doc });
  } catch (err) {
    logger.warn('[gas] POST /scale/:id/supersede failed: %s', err.message);
    const r = _toErrorResponse(err);
    return res.status(r.status).json(r.body);
  }
});

router.patch('/scale/:id/archive', async (req, res) => {
  try {
    const actor = _actorId(req);
    if (!actor) {
      return res.status(401).json({ success: false, error: 'authenticated user required' });
    }
    const { archiveReason_ar } = req.body || {};
    const doc = await gas.archiveScale(req.params.id, archiveReason_ar, actor);
    return res.json({ success: true, data: doc });
  } catch (err) {
    logger.warn('[gas] PATCH /scale/:id/archive failed: %s', err.message);
    const r = _toErrorResponse(err);
    return res.status(r.status).json(r.body);
  }
});

// ════════════════════════════════════════════════════════════════════
// Scorings
// ════════════════════════════════════════════════════════════════════

router.post('/scoring', async (req, res) => {
  try {
    const actor = _actorId(req);
    if (!actor) {
      return res.status(401).json({ success: false, error: 'authenticated user required' });
    }
    const doc = await gas.recordScoring(req.body || {}, actor);
    return res.status(201).json({ success: true, data: doc });
  } catch (err) {
    logger.warn('[gas] POST /scoring failed: %s', err.message);
    const r = _toErrorResponse(err);
    return res.status(r.status).json(r.body);
  }
});

router.post('/scoring/:id/supersede', async (req, res) => {
  try {
    const actor = _actorId(req);
    if (!actor) {
      return res.status(401).json({ success: false, error: 'authenticated user required' });
    }
    const { supersedeReason_ar, ...payload } = req.body || {};
    const doc = await gas.supersedeScoring(req.params.id, payload, supersedeReason_ar, actor);
    return res.json({ success: true, data: doc });
  } catch (err) {
    logger.warn('[gas] POST /scoring/:id/supersede failed: %s', err.message);
    const r = _toErrorResponse(err);
    return res.status(r.status).json(r.body);
  }
});

router.get('/scoring/goal/:goalId', async (req, res) => {
  try {
    const opts = {
      from: _parseDate(req.query.from),
      to: _parseDate(req.query.to),
      includeSuperseded: _parseBool(req.query.includeSuperseded) || false,
      limit: req.query.limit,
    };
    const out = await gas.listScoringsByGoal(req.params.goalId, opts);
    return res.json({ success: true, data: out });
  } catch (err) {
    logger.warn('[gas] GET /scoring/goal failed: %s', err.message);
    const r = _toErrorResponse(err);
    return res.status(r.status).json(r.body);
  }
});

router.get('/scoring/beneficiary/:beneficiaryId', async (req, res) => {
  try {
    const opts = {
      from: _parseDate(req.query.from),
      to: _parseDate(req.query.to),
      includeSuperseded: _parseBool(req.query.includeSuperseded) || false,
      limit: req.query.limit,
    };
    const out = await gas.listScoringsByBeneficiary(req.params.beneficiaryId, opts);
    return res.json({ success: true, data: out });
  } catch (err) {
    logger.warn('[gas] GET /scoring/beneficiary failed: %s', err.message);
    const r = _toErrorResponse(err);
    return res.status(r.status).json(r.body);
  }
});

// ════════════════════════════════════════════════════════════════════
// Analytics
// ════════════════════════════════════════════════════════════════════

router.get('/tscore/scale/:scaleId', async (req, res) => {
  try {
    const opts = { upTo: _parseDate(req.query.upTo) };
    const t = await gas.computeIndividualTScore(req.params.scaleId, opts);
    return res.json({ success: true, data: { tScore: t } });
  } catch (err) {
    logger.warn('[gas] GET /tscore/scale failed: %s', err.message);
    const r = _toErrorResponse(err);
    return res.status(r.status).json(r.body);
  }
});

router.get('/tscore/beneficiary/:beneficiaryId', async (req, res) => {
  try {
    const opts = {
      from: _parseDate(req.query.from),
      upTo: _parseDate(req.query.upTo),
    };
    const out = await gas.computeBeneficiaryComposite(req.params.beneficiaryId, opts);
    return res.json({ success: true, data: out });
  } catch (err) {
    logger.warn('[gas] GET /tscore/beneficiary failed: %s', err.message);
    const r = _toErrorResponse(err);
    return res.status(r.status).json(r.body);
  }
});

module.exports = router;

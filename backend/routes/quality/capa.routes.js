'use strict';

/**
 * capa.routes.js — W345 (CAPA Pass 4 REST surface).
 *
 * Doctrine: 08-quality-risk-governance-engine.prompt.md.
 * Lib:     backend/intelligence/capa-lifecycle.lib.js (W337).
 * Service: backend/services/quality/capa.service.js (W344) — accessed via
 *          `req.app._capaService` (wired with enforceMfa:true by capaBootstrap).
 * Model:   backend/models/quality/CapaItem.model.js (pre-save hook enforces lib).
 *
 * MFA tiers (ADR-019):
 *   GET    /health                 no auth (states + types + sources)
 *   GET    /                       tier 1 (list by status, paginated)
 *   GET    /overdue                tier 1 (non-terminal items past dueDate)
 *   GET    /:id                    tier 1 (full doc)
 *   GET    /:id/audit              tier 1 (lifecycleHistory append-only)
 *   POST   /                       tier 1 (create CAPA, source.module=manual usually)
 *   POST   /:id/transition         tier 1 minimum; lib enforces tier 2 on
 *                                  VERIFIED→CLOSED + ANY→REJECTED (service-layer defense)
 *   POST   /sweep                  tier 2 (admin manual overdue sweep)
 *
 * Errors from the service layer (via lib) carry .code = INVALID_TRANSITION /
 * REASON_CODE_REQUIRED / MFA_TIER_INSUFFICIENT / CAPA_NOT_FOUND — mapped to
 * HTTP 422/400/403/404.
 */

const express = require('express');
const router = express.Router();

const { authenticate } = require('../../middleware/auth');
const { attachMfaActor, requireMfaTier } = require('../../middleware/requireMfaTier');
const lib = require('../../intelligence/capa-lifecycle.lib');
const logger = require('../../utils/logger');

function mapErrorToHttp(err) {
  if (err.code === 'CAPA_NOT_FOUND') {
    return { status: 404, body: { code: err.code, message: err.message } };
  }
  if (err.code === 'INVALID_TRANSITION') {
    return { status: 422, body: { code: err.code, message: err.message } };
  }
  if (err.code === 'REASON_CODE_REQUIRED') {
    return { status: 400, body: { code: err.code, message: err.message } };
  }
  if (err.code === 'MFA_TIER_INSUFFICIENT') {
    return { status: 403, body: { code: err.code, message: err.message } };
  }
  // Mongoose CapaTransitionError surfaces via the pre-save hook
  if (err.name === 'CapaTransitionError') {
    return { status: 422, body: { code: err.code || 'TRANSITION_BLOCKED', message: err.message } };
  }
  return { status: 500, body: { code: 'INTERNAL_ERROR', message: err.message } };
}

function _service(req) {
  const svc = req.app._capaService;
  if (!svc) {
    const err = new Error('CapaService not wired (capaBootstrap.wireCapa not called)');
    err.code = 'SERVICE_NOT_WIRED';
    throw err;
  }
  return svc;
}

// ── Health probe (no auth) ────────────────────────────────────────────────
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    states: lib.LIFECYCLE_STATES,
    types: lib.CAPA_TYPES,
    sources: lib.SOURCE_MODULES,
    priorities: lib.PRIORITIES,
  });
});

router.use(authenticate);
router.use(attachMfaActor);

// ── List by status (paginated) ────────────────────────────────────────────
router.get('/', requireMfaTier(1), async (req, res) => {
  try {
    const svc = _service(req);
    const status = req.query.status || 'OPEN';
    const branchId = req.query.branchId || req.user?.branchId || null;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const items = await svc.listByStatus({ status, branchId, limit });
    res.json({ success: true, count: items.length, items });
  } catch (err) {
    logger.error('[capa] GET / failed', err);
    const mapped = mapErrorToHttp(err);
    res.status(mapped.status).json({ success: false, ...mapped.body });
  }
});

// ── Overdue items ─────────────────────────────────────────────────────────
router.get('/overdue', requireMfaTier(1), async (req, res) => {
  try {
    const svc = _service(req);
    const branchId = req.query.branchId || req.user?.branchId || null;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 500);
    const items = await svc.listOverdue({ branchId, limit });
    res.json({ success: true, count: items.length, items });
  } catch (err) {
    logger.error('[capa] GET /overdue failed', err);
    const mapped = mapErrorToHttp(err);
    res.status(mapped.status).json({ success: false, ...mapped.body });
  }
});

// ── Single CAPA full doc ──────────────────────────────────────────────────
router.get('/:id', requireMfaTier(1), async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const Model = mongoose.model('CapaItem');
    const doc = await Model.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ success: false, code: 'CAPA_NOT_FOUND' });
    res.json({ success: true, capa: doc });
  } catch (err) {
    const mapped = mapErrorToHttp(err);
    res.status(mapped.status).json({ success: false, ...mapped.body });
  }
});

// ── Audit (lifecycleHistory append-only) ──────────────────────────────────
router.get('/:id/audit', requireMfaTier(1), async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const Model = mongoose.model('CapaItem');
    const doc = await Model.findById(
      req.params.id,
      'lifecycleHistory createdAt updatedAt capaNumber'
    ).lean();
    if (!doc) return res.status(404).json({ success: false, code: 'CAPA_NOT_FOUND' });
    res.json({
      success: true,
      capaNumber: doc.capaNumber,
      history: doc.lifecycleHistory || [],
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  } catch (err) {
    const mapped = mapErrorToHttp(err);
    res.status(mapped.status).json({ success: false, ...mapped.body });
  }
});

// ── Create CAPA (manual entry; producers call service directly) ───────────
router.post('/', requireMfaTier(1), async (req, res) => {
  try {
    const svc = _service(req);
    const actorUserId = req.user?._id || req.user?.id;
    const doc = await svc.createCapaItem({
      ...req.body,
      createdBy: actorUserId,
    });
    res.status(201).json({ success: true, capa: doc });
  } catch (err) {
    logger.error('[capa] POST / failed', err);
    const mapped = mapErrorToHttp(err);
    res.status(mapped.status).json({ success: false, ...mapped.body });
  }
});

// ── Transition CAPA ───────────────────────────────────────────────────────
// Route accepts tier 1; service rejects with MFA_TIER_INSUFFICIENT when the
// requested transition needs tier 2 (VERIFIED→CLOSED + ANY→REJECTED).
router.post('/:id/transition', requireMfaTier(1), async (req, res) => {
  try {
    const svc = _service(req);
    const actorUserId = req.user?._id || req.user?.id;
    const mfaTier = req.mfaActor?.tier ?? null;
    const { to, reasonCode = null, notes = null } = req.body || {};
    const doc = await svc.transitionCapaItem({
      capaId: req.params.id,
      to,
      actorUserId,
      reasonCode,
      notes,
      mfaTier,
    });
    res.json({ success: true, capa: doc });
  } catch (err) {
    logger.error('[capa] POST /:id/transition failed', err);
    const mapped = mapErrorToHttp(err);
    res.status(mapped.status).json({ success: false, ...mapped.body });
  }
});

// ── Admin manual sweep (tier 2) ───────────────────────────────────────────
router.post('/sweep', requireMfaTier(2), async (req, res) => {
  try {
    const svc = _service(req);
    const result = await svc.sweepOverdue({ now: new Date() });
    res.json({ success: true, ...result });
  } catch (err) {
    logger.error('[capa] POST /sweep failed', err);
    const mapped = mapErrorToHttp(err);
    res.status(mapped.status).json({ success: false, ...mapped.body });
  }
});

module.exports = router;

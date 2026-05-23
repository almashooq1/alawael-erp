/**
 * dpia.routes.js — Data Protection Impact Assessment endpoints (W285).
 *
 * State machine: draft → in_review → {approved|rejected}; approved + sign → enforceable.
 *
 * MFA tiers (per W273 pattern):
 *   - List / get / create / addRisk / transition: tier 1 (read + draft mutations)
 *   - Sign: tier 2 (legal artefact, defense-in-depth via dpiaService enforceMfa:true)
 *
 * Routes mounted at /api/dpia (also under /api/v1/dpia via dualMount).
 */

'use strict';

const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/auth');
const { attachMfaActor, requireMfaTier } = require('../middleware/requireMfaTier');
const safeError = require('../utils/safeError');
const logger = require('../utils/logger');

// Lazy require — service is constructed in startup bootstrap with enforceMfa:true
function getDpiaService(req) {
  return req.app._dpiaService;
}

router.use(authenticate);
router.use(attachMfaActor);

// ── LIST ───────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const svc = getDpiaService(req);
    if (!svc) return res.status(503).json({ success: false, code: 'DPIA_SERVICE_NOT_WIRED' });
    const status = typeof req.query.status === 'string' ? req.query.status : null;
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
    const items = await svc.listByStatus(status, { limit });
    res.json({ success: true, items, total: items.length });
  } catch (err) {
    logger.error('[dpia] list error', { err: err.message });
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

// ── GET ONE ────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const Dpia = require('../models/Dpia');
    const dpia = await Dpia.findById(req.params.id);
    if (!dpia) return res.status(404).json({ success: false, code: 'DPIA_NOT_FOUND' });
    res.json({ success: true, dpia });
  } catch (err) {
    logger.error('[dpia] get error', { err: err.message });
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

// ── CREATE ─────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const svc = getDpiaService(req);
    if (!svc) return res.status(503).json({ success: false, code: 'DPIA_SERVICE_NOT_WIRED' });
    const actor = { userId: req.user?._id || req.user?.id, branchId: req.user?.branchId };
    if (!actor.userId) return res.status(401).json({ success: false, code: 'ACTOR_REQUIRED' });
    const dpia = await svc.create(req.body, actor);
    res.status(201).json({ success: true, dpia });
  } catch (err) {
    const status = err.code === 'DPIA_ACTOR_REQUIRED' ? 401 : 400;
    res
      .status(status)
      .json({ success: false, code: err.code || 'CREATE_FAILED', error: safeError(err) });
  }
});

// ── ADD RISK ───────────────────────────────────────────────────────────
router.post('/:id/risks', async (req, res) => {
  try {
    const svc = getDpiaService(req);
    if (!svc) return res.status(503).json({ success: false, code: 'DPIA_SERVICE_NOT_WIRED' });
    const actor = { userId: req.user?._id || req.user?.id };
    const dpia = await svc.addRisk(req.params.id, req.body, actor);
    res.json({ success: true, dpia });
  } catch (err) {
    const status =
      err.code === 'DPIA_NOT_FOUND' ? 404 : err.code === 'DPIA_INVALID_STATE' ? 409 : 400;
    res
      .status(status)
      .json({ success: false, code: err.code || 'ADD_RISK_FAILED', error: safeError(err) });
  }
});

// ── TRANSITION ─────────────────────────────────────────────────────────
router.post('/:id/transition', async (req, res) => {
  try {
    const svc = getDpiaService(req);
    if (!svc) return res.status(503).json({ success: false, code: 'DPIA_SERVICE_NOT_WIRED' });
    const actor = { userId: req.user?._id || req.user?.id };
    const dpia = await svc.transition(
      req.params.id,
      req.body.newStatus,
      { rejectionReason: req.body.rejectionReason, reviewNotes: req.body.reviewNotes },
      actor
    );
    res.json({ success: true, dpia });
  } catch (err) {
    const status =
      err.code === 'DPIA_NOT_FOUND'
        ? 404
        : err.code === 'DPIA_INVALID_TRANSITION'
          ? 409
          : err.code === 'DPIA_REJECTION_REASON_REQUIRED'
            ? 400
            : 400;
    res
      .status(status)
      .json({ success: false, code: err.code || 'TRANSITION_FAILED', error: safeError(err) });
  }
});

// ── SIGN — MFA tier 2 required (W273-pattern + service-layer enforceMfa) ──
router.post('/:id/sign', requireMfaTier(2), async (req, res) => {
  try {
    const svc = getDpiaService(req);
    if (!svc) return res.status(503).json({ success: false, code: 'DPIA_SERVICE_NOT_WIRED' });
    const actor = {
      userId: req.user?._id || req.user?.id,
      mfaTier: req.actor?.mfaLevel || 0,
      mfaChallengeId: req.actor?.mfaChallengeId,
    };
    const dpia = await svc.sign(req.params.id, actor, { mfaChallengeId: actor.mfaChallengeId });
    res.json({ success: true, dpia });
  } catch (err) {
    const status =
      err.code === 'DPIA_NOT_FOUND'
        ? 404
        : err.code === 'DPIA_NOT_APPROVED'
          ? 409
          : err.code === 'DPIA_ALREADY_SIGNED'
            ? 409
            : err.code === 'DPIA_MFA_INSUFFICIENT'
              ? 403
              : 400;
    res
      .status(status)
      .json({ success: false, code: err.code || 'SIGN_FAILED', error: safeError(err) });
  }
});

// ── CHECK FEATURE APPROVAL ─────────────────────────────────────────────
router.get('/check/feature/:featureName', async (req, res) => {
  try {
    const svc = getDpiaService(req);
    if (!svc) return res.status(503).json({ success: false, code: 'DPIA_SERVICE_NOT_WIRED' });
    const result = await svc.isFeatureApproved(req.params.featureName, req.query.flag || null);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

module.exports = router;

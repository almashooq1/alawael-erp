'use strict';

/**
 * aac.routes.js — Wave 263
 * ════════════════════════════════════════════════════════════════════
 * HTTP surface for the AAC (Augmentative & Alternative Communication)
 * foundation. Read+write endpoints for beneficiary profiles, the PECS
 * transition workflow, and the Arabic-first symbol library.
 *
 * Endpoints (all under /api/aac and /api/v1/aac):
 *
 *   GET   /_health
 *
 *   GET   /profile/:beneficiaryId               → one profile
 *   PUT   /profile/:beneficiaryId               → upsert
 *   GET   /profiles?branchId=&modality=&pecsPhase=&status=&overdueOnly=
 *   POST  /profile/:beneficiaryId/pecs-phase    → advance/regress PECS
 *   GET   /reviews/overdue?branchId=
 *
 *   GET   /symbols?category=&status=&q=&isCulturalSaudi=
 *   POST  /symbols                              → create draft
 *   PATCH /symbols/:id/publish                  → mark published
 *
 * Auth: all data routes require authenticate + requireBranchAccess.
 * _health is public (W226 convention).
 * ════════════════════════════════════════════════════════════════════
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const { assertBranchMatch, effectiveBranchScope } = require('../middleware/assertBranchMatch');
const logger = require('../utils/logger');

const aac = require('../services/aacProfile.service');

// ─── Health check (public — matches W226 convention) ─────────────
router.get('/_health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      wave: 'W263',
      surface: 'aac',
      endpoints: 9,
      services: ['aacProfile.service (W263)'],
    },
  });
});

// All data routes authenticated + branch-scoped.
router.use(authenticate);
router.use(requireBranchAccess);

// ─── Error helpers (mirror measures-outcomes.routes.js) ──────────
function _toErrorResponse(err) {
  const msg = err && err.message ? String(err.message) : 'unknown error';
  // 403 path first — security errors carry an explicit status.
  if (err && err.status === 403) {
    return { status: 403, body: { success: false, error: msg } };
  }
  if (msg.match(/required|invalid|must be|cannot be|not found|cannot skip|cannot publish/i)) {
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

function _parseBool(val) {
  if (typeof val === 'boolean') return val;
  if (val === 'true') return true;
  if (val === 'false') return false;
  return undefined;
}

// ════════════════════════════════════════════════════════════════════
// Profile read / upsert
// ════════════════════════════════════════════════════════════════════

router.get('/profile/:beneficiaryId', async (req, res) => {
  try {
    const { beneficiaryId } = req.params;
    const doc = await aac.getByBeneficiary(beneficiaryId);
    if (!doc) {
      return res
        .status(404)
        .json({ success: false, error: 'AAC profile not found for beneficiary' });
    }
    assertBranchMatch(req, doc.branchId, 'AAC profile');
    return res.json({ success: true, data: doc });
  } catch (err) {
    logger.warn('[aac] GET /profile failed: %s', err.message);
    const r = _toErrorResponse(err);
    return res.status(r.status).json(r.body);
  }
});

router.put('/profile/:beneficiaryId', async (req, res) => {
  try {
    const { beneficiaryId } = req.params;
    const actor = _actorId(req);
    if (!actor) {
      return res.status(401).json({ success: false, error: 'authenticated user required' });
    }
    // Pre-flight cross-branch check: if profile exists, its branchId
    // must match. If it doesn't exist, force the incoming branchId to
    // the caller's scope (restricted users cannot create cross-branch).
    const existing = await aac.getByBeneficiary(beneficiaryId);
    if (existing) {
      assertBranchMatch(req, existing.branchId, 'AAC profile');
    } else if (req.branchScope && req.branchScope.restricted) {
      // Force branchId onto the body so cross-branch creation is
      // mechanically impossible.
      req.body = req.body || {};
      req.body.branchId = req.branchScope.branchId;
    }
    const doc = await aac.upsertProfile(beneficiaryId, req.body || {}, actor);
    return res.json({ success: true, data: doc });
  } catch (err) {
    logger.warn('[aac] PUT /profile failed: %s', err.message);
    const r = _toErrorResponse(err);
    return res.status(r.status).json(r.body);
  }
});

router.get('/profiles', async (req, res) => {
  try {
    // SECURITY: effectiveBranchScope ALWAYS returns the caller's
    // own branchId when restricted (ignoring user-supplied query).
    // Closes the W269 finding where a missing query param caused
    // the filter to be null (cross-branch leak).
    const branchId = effectiveBranchScope(req);
    const opts = {
      modality: req.query.modality || undefined,
      pecsPhase: req.query.pecsPhase ? parseInt(req.query.pecsPhase, 10) : undefined,
      status: req.query.status || 'active',
      overdueOnly: _parseBool(req.query.overdueOnly) || false,
      limit: req.query.limit,
      skip: req.query.skip,
    };
    const out = await aac.listByBranch(branchId, opts);
    return res.json({ success: true, data: out });
  } catch (err) {
    logger.warn('[aac] GET /profiles failed: %s', err.message);
    const r = _toErrorResponse(err);
    return res.status(r.status).json(r.body);
  }
});

router.post('/profile/:beneficiaryId/pecs-phase', async (req, res) => {
  try {
    const { beneficiaryId } = req.params;
    const actor = _actorId(req);
    if (!actor) {
      return res.status(401).json({ success: false, error: 'authenticated user required' });
    }
    // Pre-flight: load existing profile and check branch ownership
    // before allowing any append to the immutable transition history.
    const existing = await aac.getByBeneficiary(beneficiaryId);
    if (!existing) {
      return res
        .status(404)
        .json({ success: false, error: 'AAC profile not found for beneficiary' });
    }
    assertBranchMatch(req, existing.branchId, 'AAC profile');
    const { toPhase, criteriaMet, notes } = req.body || {};
    const doc = await aac.transitionPecsPhase(
      { beneficiaryId, toPhase, criteriaMet, notes },
      actor
    );
    return res.json({ success: true, data: doc });
  } catch (err) {
    logger.warn('[aac] POST /pecs-phase failed: %s', err.message);
    const r = _toErrorResponse(err);
    return res.status(r.status).json(r.body);
  }
});

router.get('/reviews/overdue', async (req, res) => {
  try {
    const branchId = effectiveBranchScope(req);
    const out = await aac.listOverdueReviews(branchId, { limit: req.query.limit });
    return res.json({ success: true, data: out });
  } catch (err) {
    logger.warn('[aac] GET /reviews/overdue failed: %s', err.message);
    const r = _toErrorResponse(err);
    return res.status(r.status).json(r.body);
  }
});

// ════════════════════════════════════════════════════════════════════
// Symbol library
// ════════════════════════════════════════════════════════════════════

router.get('/symbols', async (req, res) => {
  try {
    const opts = {
      category: req.query.category || undefined,
      status: req.query.status || 'published',
      q: req.query.q || undefined,
      isCulturalSaudi: _parseBool(req.query.isCulturalSaudi),
      limit: req.query.limit,
    };
    const out = await aac.listSymbols(opts);
    return res.json({ success: true, data: out });
  } catch (err) {
    logger.warn('[aac] GET /symbols failed: %s', err.message);
    const r = _toErrorResponse(err);
    return res.status(r.status).json(r.body);
  }
});

router.post('/symbols', async (req, res) => {
  try {
    const actor = _actorId(req);
    if (!actor) {
      return res.status(401).json({ success: false, error: 'authenticated user required' });
    }
    const doc = await aac.createSymbol(req.body || {}, actor);
    return res.status(201).json({ success: true, data: doc });
  } catch (err) {
    logger.warn('[aac] POST /symbols failed: %s', err.message);
    const r = _toErrorResponse(err);
    return res.status(r.status).json(r.body);
  }
});

router.patch('/symbols/:id/publish', async (req, res) => {
  try {
    const actor = _actorId(req);
    if (!actor) {
      return res.status(401).json({ success: false, error: 'authenticated user required' });
    }
    const doc = await aac.publishSymbol(req.params.id, actor);
    return res.json({ success: true, data: doc });
  } catch (err) {
    logger.warn('[aac] PATCH /symbols/:id/publish failed: %s', err.message);
    const r = _toErrorResponse(err);
    return res.status(r.status).json(r.body);
  }
});

module.exports = router;

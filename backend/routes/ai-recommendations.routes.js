'use strict';

/**
 * ai-recommendations.routes.js — W334 Pass 3 HTTP surface.
 *
 * Doctrine: 07-ai-recommendations.prompt.md (seed inheriting 00 + 02 + 03 + 04).
 * Lib: backend/intelligence/ai-recommendation-lifecycle.lib.js (W334 Pass 1).
 * Service: backend/services/aiRecommendation.service.js (W334 Pass 2).
 * Model: backend/models/AiRecommendationBundle.js (pre-save hook enforces lib).
 *
 * MFA tiers (ADR-019):
 *   GET    /health                   no auth (health probe)
 *   GET    /pending                  tier 1 (supervisor queue read)
 *   GET    /:id                      tier 1 (bundle details + explainability)
 *   GET    /:id/audit                tier 1 (history append-only)
 *   GET    /metrics                  tier 1 (health rates)
 *   POST   /:id/approve              tier 2 (significant action, lib enforces too)
 *   POST   /:id/reject               tier 1 (reasonCode required)
 *   POST   /sweep                    tier 2 (admin manual sweep)
 *
 * Errors from the service layer (via lib) carry .code = INVALID_TRANSITION /
 * REASON_CODE_REQUIRED / MFA_TIER_INSUFFICIENT — mapped to HTTP 422/400/403.
 */

const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/auth');
const { attachMfaActor, requireMfaTier } = require('../middleware/requireMfaTier');
const aiRecommendationService = require('../services/aiRecommendation.service');
const lib = require('../intelligence/ai-recommendation-lifecycle.lib');
const logger = require('../utils/logger');

function mapErrorToHttp(err) {
  if (err.code === 'INVALID_TRANSITION')
    return {
      status: 422,
      body: {
        code: err.code,
        message: err.message,
        fromStatus: err.fromStatus,
        toStatus: err.toStatus,
      },
    };
  if (err.code === 'REASON_CODE_REQUIRED')
    return { status: 400, body: { code: err.code, message: err.message } };
  if (err.code === 'MFA_TIER_INSUFFICIENT')
    return { status: 403, body: { code: err.code, message: err.message } };
  return { status: 500, body: { code: 'INTERNAL_ERROR', message: err.message } };
}

// ── Health probe (no auth) ─────────────────────────────────────────────
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    states: lib.LIFECYCLE_STATES,
    confidenceThresholds: lib.CONFIDENCE_THRESHOLDS,
  });
});

router.use(authenticate);
router.use(attachMfaActor);

// ── Supervisor queue ──────────────────────────────────────────────────
router.get('/pending', requireMfaTier(1), async (req, res) => {
  try {
    const branchId = req.query.branchId || req.user?.branchId || null;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const items = await aiRecommendationService.listPending({ branchId, limit });
    res.json({ success: true, count: items.length, items });
  } catch (err) {
    logger.error('[ai-recommendations] /pending failed', err);
    const mapped = mapErrorToHttp(err);
    res.status(mapped.status).json({ success: false, ...mapped.body });
  }
});

// ── Single bundle with explainability ─────────────────────────────────
router.get('/:id', requireMfaTier(1), async (req, res, next) => {
  const mongoose = require('mongoose');
  // Fall through to literal sibling routes (e.g. /metrics) for non-ObjectId ids.
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return next();
  try {
    const Bundle = mongoose.model('AiRecommendationBundle');
    const doc = await Bundle.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ success: false, code: 'NOT_FOUND' });
    res.json({ success: true, bundle: doc });
  } catch (err) {
    const mapped = mapErrorToHttp(err);
    res.status(mapped.status).json({ success: false, ...mapped.body });
  }
});

// ── Audit (history append-only) ───────────────────────────────────────
router.get('/:id/audit', requireMfaTier(1), async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const Bundle = mongoose.model('AiRecommendationBundle');
    const doc = await Bundle.findById(req.params.id, 'history createdAt updatedAt').lean();
    if (!doc) return res.status(404).json({ success: false, code: 'NOT_FOUND' });
    res.json({
      success: true,
      history: doc.history || [],
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  } catch (err) {
    const mapped = mapErrorToHttp(err);
    res.status(mapped.status).json({ success: false, ...mapped.body });
  }
});

// ── Approve (tier 2, lib enforces in pre-save hook) ───────────────────
router.post('/:id/approve', requireMfaTier(2), async (req, res) => {
  try {
    const doc = await aiRecommendationService.approve({
      bundleId: req.params.id,
      actorUserId: req.user?._id || req.user?.id,
      mfaTier: req.actor?.mfaLevel || 0,
      notes: req.body?.notes,
    });
    res.json({ success: true, bundle: doc });
  } catch (err) {
    logger.warn('[ai-recommendations] approve failed', { code: err.code, message: err.message });
    const mapped = mapErrorToHttp(err);
    res.status(mapped.status).json({ success: false, ...mapped.body });
  }
});

// ── Reject (tier 1, reasonCode required) ──────────────────────────────
router.post('/:id/reject', requireMfaTier(1), async (req, res) => {
  try {
    if (!req.body?.reasonCode) {
      return res.status(400).json({
        success: false,
        code: 'REASON_CODE_REQUIRED',
        message: 'reasonCode is required to reject',
      });
    }
    const doc = await aiRecommendationService.reject({
      bundleId: req.params.id,
      actorUserId: req.user?._id || req.user?.id,
      reasonCode: req.body.reasonCode,
      notes: req.body?.notes,
    });
    res.json({ success: true, bundle: doc });
  } catch (err) {
    logger.warn('[ai-recommendations] reject failed', { code: err.code, message: err.message });
    const mapped = mapErrorToHttp(err);
    res.status(mapped.status).json({ success: false, ...mapped.body });
  }
});

// ── Manual sweep (admin, tier 2) ──────────────────────────────────────
router.post('/sweep', requireMfaTier(2), async (req, res) => {
  try {
    const result = await aiRecommendationService.sweepExpired({ now: new Date() });
    res.json({ success: true, ...result });
  } catch (err) {
    logger.error('[ai-recommendations] sweep failed', err);
    const mapped = mapErrorToHttp(err);
    res.status(mapped.status).json({ success: false, ...mapped.body });
  }
});

// ── Metrics (observability) ───────────────────────────────────────────
router.get('/metrics', requireMfaTier(1), async (_req, res) => {
  try {
    const mongoose = require('mongoose');
    const Bundle = mongoose.model('AiRecommendationBundle');
    const countsByStatus = await Bundle.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const counts = Object.fromEntries(countsByStatus.map(r => [r._id, r.count]));
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const pending = counts.PENDING_REVIEW || 0;
    const approved = counts.APPROVED || 0;
    const rejected = counts.REJECTED || 0;
    const discarded = counts.DISCARDED || 0;
    const expired = counts.EXPIRED || 0;
    const decided = approved + rejected;
    const health = {
      total,
      pending,
      acceptanceRate: decided > 0 ? approved / decided : null,
      expiredRate: total > 0 ? expired / total : null,
      autoDiscardRate: total > 0 ? discarded / total : null,
    };
    res.json({ success: true, counts, health });
  } catch (err) {
    logger.error('[ai-recommendations] metrics failed', err);
    const mapped = mapErrorToHttp(err);
    res.status(mapped.status).json({ success: false, ...mapped.body });
  }
});

module.exports = router;

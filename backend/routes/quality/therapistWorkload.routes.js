'use strict';

/**
 * therapistWorkload.routes.js — W352 (Phase 9 dashboard REST surface, slice 2).
 *
 * MFA tiers (ADR-019):
 *   GET /health                       no auth (threshold definitions)
 *   GET /                             tier 1 (full workload across therapists)
 *
 * Query params:
 *   therapistIds   — comma-separated, optional (default: all therapists with data)
 *   branchId       — optional, filter underlying queries to one branch
 *
 * Pure read-only aggregation; no MFA tier 2 needed.
 */

const express = require('express');
const router = express.Router();

const { authenticate } = require('../../middleware/auth');
const { attachMfaActor, requireMfaTier } = require('../../middleware/requireMfaTier');
const {
  createTherapistWorkloadService,
  THRESHOLDS,
} = require('../../services/quality/therapistWorkload.service');
const { createDashboardCache } = require('../../services/quality/dashboard-cache.util');
const logger = require('../../utils/logger');

const service = createTherapistWorkloadService({ logger });

// W355 — 60s TTL cache; same rationale as branchQualityHeatmap.
const cache = createDashboardCache({ logger });
const cachedBuildWorkload = cache.wrap(service.buildWorkload.bind(service), {
  namespace: 'therapistWorkload',
});

router.get('/health', (_req, res) => {
  res.json({
    success: true,
    thresholds: THRESHOLDS,
    metrics: Object.keys(THRESHOLDS),
    notes: {
      'sessions.weekCompleted':
        'informational (no threshold) — completed-session count over the last 7 days',
    },
  });
});

router.use(authenticate);
router.use(attachMfaActor);

router.get('/', requireMfaTier(1), async (req, res) => {
  try {
    const therapistIdsStr = req.query.therapistIds;
    const therapistIds = therapistIdsStr
      ? String(therapistIdsStr)
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
      : null;
    const branchId = req.query.branchId || req.user?.branchId || null;
    const data = await cachedBuildWorkload({ therapistIds, branchId });
    res.json({ success: true, ...data });
  } catch (err) {
    logger.error('[therapistWorkload] GET / failed', err);
    res.status(500).json({ success: false, code: 'INTERNAL_ERROR', message: err.message });
  }
});

// W355 — ops observability for the cache.
router.get('/cache/stats', requireMfaTier(1), (_req, res) => {
  res.json({ success: true, namespace: 'therapistWorkload', ...cache.stats() });
});

module.exports = router;

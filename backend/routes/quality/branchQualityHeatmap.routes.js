'use strict';

/**
 * branchQualityHeatmap.routes.js — W350 (Phase 9 dashboard REST surface).
 *
 * MFA tiers (ADR-019):
 *   GET /health                no auth (threshold definitions)
 *   GET /                      tier 1 (full heatmap)
 *
 * Query params:
 *   branchIds  — comma-separated list, optional (default: all branches with any data)
 *
 * Returns:
 *   {
 *     success: true,
 *     generatedAt: ISO,
 *     thresholds: {...},
 *     branches: [{ branchId, severity, cells: { metricKey: { value, severity, threshold } } }],
 *     summary: { totalBranches, criticalBranches, warningBranches, okBranches }
 *   }
 *
 * Service is read-only (aggregations only) so no MFA tier 2 needed.
 */

const express = require('express');
const router = express.Router();

const { authenticate } = require('../../middleware/auth');
const { attachMfaActor, requireMfaTier } = require('../../middleware/requireMfaTier');
const {
  createBranchQualityHeatmapService,
  THRESHOLDS,
} = require('../../services/quality/branchQualityHeatmap.service');
const { createDashboardCache } = require('../../services/quality/dashboard-cache.util');
const logger = require('../../utils/logger');

// Single instance per process; aggregations are read-only.
const service = createBranchQualityHeatmapService({ logger });

// W355 — 60s TTL cache. Aggregations against CapaItem/AuditOccurrence/RcaInvestigation/
// FmeaWorksheet/Risk are read-heavy and the underlying data changes on human-action
// cadence (not sub-minute), so a 1-minute staleness window is acceptable.
const cache = createDashboardCache({ logger });
const cachedBuildHeatmap = cache.wrap(service.buildHeatmap.bind(service), {
  namespace: 'branchHeatmap',
});

router.get('/health', (_req, res) => {
  res.json({
    success: true,
    thresholds: THRESHOLDS,
    metrics: Object.keys(THRESHOLDS),
  });
});

router.use(authenticate);
router.use(attachMfaActor);

router.get('/', requireMfaTier(1), async (req, res) => {
  try {
    const branchIdsStr = req.query.branchIds;
    const branchIds = branchIdsStr
      ? String(branchIdsStr)
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
      : null;
    const data = await cachedBuildHeatmap({ branchIds });
    res.json({ success: true, ...data });
  } catch (err) {
    logger.error('[branchQualityHeatmap] GET / failed', err);
    res.status(500).json({ success: false, code: 'INTERNAL_ERROR', message: err.message });
  }
});

// W355 — ops observability for the cache.
router.get('/cache/stats', requireMfaTier(1), (_req, res) => {
  res.json({ success: true, namespace: 'branchHeatmap', ...cache.stats() });
});

module.exports = router;

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
const logger = require('../../utils/logger');

// Single instance per process; aggregations are read-only.
const service = createBranchQualityHeatmapService({ logger });

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
    const data = await service.buildHeatmap({ branchIds });
    res.json({ success: true, ...data });
  } catch (err) {
    logger.error('[branchQualityHeatmap] GET / failed', err);
    res.status(500).json({ success: false, code: 'INTERNAL_ERROR', message: err.message });
  }
});

module.exports = router;

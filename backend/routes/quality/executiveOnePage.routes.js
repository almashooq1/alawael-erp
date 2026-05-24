'use strict';

/**
 * executiveOnePage.routes.js — W353 (Phase 9 dashboard REST surface, slice 3).
 *
 * Single-page executive composite. MFA tiers (ADR-019):
 *   GET /health                 no auth (mention what's composed)
 *   GET /                       tier 1 (composite read; aggregates 3 sources)
 *
 * Query params:
 *   branchIds   — comma-separated, optional (filters all 3 underlying sources)
 *   topN        — integer 1-20, optional (default 5)
 */

const express = require('express');
const router = express.Router();

const { authenticate } = require('../../middleware/auth');
const { attachMfaActor, requireMfaTier } = require('../../middleware/requireMfaTier');
const {
  createExecutiveOnePageService,
} = require('../../services/quality/executiveOnePage.service');
const logger = require('../../utils/logger');

const service = createExecutiveOnePageService({ logger });

router.get('/health', (_req, res) => {
  res.json({
    success: true,
    composes: [
      'beneficiary KPIs (status breakdown + 7d intake)',
      'branch quality heatmap (W350+W351)',
      'therapist workload (W352)',
    ],
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
    let topN = parseInt(req.query.topN, 10);
    if (!Number.isFinite(topN) || topN < 1) topN = 5;
    if (topN > 20) topN = 20;
    const data = await service.build({ branchIds, topN });
    res.json({ success: true, ...data });
  } catch (err) {
    logger.error('[executiveOnePage] GET / failed', err);
    res.status(500).json({ success: false, code: 'INTERNAL_ERROR', message: err.message });
  }
});

module.exports = router;

'use strict';

/**
 * qualityHealthScore.routes.js — Phase 13 Commit 9 (4.0.59).
 *
 * HTTP surface for the Executive Compliance Health Score.
 *
 * Mounted by `_registry.js` at `/api/quality/health-score` and
 * `/api/v1/quality/health-score` via dualMount. (Mount path
 * chosen under the `quality` namespace so existing RBAC roles on
 * `/api/v1/quality` apply.)
 */

const express = require('express');
const { query, validationResult } = require('express-validator');

const { authenticate } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const safeError = require('../utils/safeError');
const { getDefault: getService } = require('../services/quality/healthScoreAggregator.service');
const { PILLARS, GRADE_BANDS } = require('../config/health-score.registry');

const router = express.Router();

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
}

// ── reference (exposes pillar catalogue + grade bands) ─────────────

router.get(
  '/reference',
  authenticate,
  wrap((req, res) => {
    res.json({
      success: true,
      data: {
        pillars: PILLARS,
        grades: GRADE_BANDS,
      },
    });
  })
);

// ── main score endpoint ────────────────────────────────────────────

router.get(
  '/',
  authenticate,
  requireBranchAccess,
  [
    query('branchId').optional().isMongoId(),
    query('tenantId').optional().isMongoId(),
    query('windowDays').optional().isInt({ min: 7, max: 365 }),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const data = await getService().compute({
        branchId: req.query.branchId,
        tenantId: req.query.tenantId,
        windowDays: req.query.windowDays ? Number(req.query.windowDays) : undefined,
      });
      res.json({ success: true, data });
    } catch (err) {
      safeError(res, err);
    }
  })
);

// ── hotspots-only endpoint (cheap polling) ─────────────────────────

router.get(
  '/hotspots',
  authenticate,
  requireBranchAccess,
  [
    query('branchId').optional().isMongoId(),
    query('windowDays').optional().isInt({ min: 7, max: 365 }),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const full = await getService().compute({
        branchId: req.query.branchId,
        tenantId: req.query.tenantId,
        windowDays: req.query.windowDays ? Number(req.query.windowDays) : undefined,
      });
      res.json({
        success: true,
        data: {
          hotspots: full.hotspots,
          score: full.score,
          grade: full.grade,
          computedAt: full.computedAt,
        },
      });
    } catch (err) {
      safeError(res, err);
    }
  })
);

module.exports = router;

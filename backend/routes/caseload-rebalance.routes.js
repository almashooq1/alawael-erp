'use strict';

/**
 * caseload-rebalance.routes.js — Wave 510 (Phase E3).
 *
 * Read-only HTTP surface for the W510 caseload rebalance analysis.
 *
 *   GET /api/v1/caseload-rebalance/branch/:branchId/suggestions
 *     ?threshold=12&improvement=0.1&limit=50
 *
 *   → { branchId, generatedAt, overloaded, underloaded, suggestions, reason? }
 *
 * Auth: authenticate + requireBranchAccess. Restricted callers can only
 * analyze their own branch (the branchScope middleware fails-closed on
 * mismatch).
 *
 * NEVER writes — the consumer surfaces suggestions in a supervisor UI
 * dialog where each "Apply" click runs a separate write through a
 * future endpoint (or the existing MeasureAlert reassignment route).
 */

const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const { assertBranchMatch } = require('../middleware/assertBranchMatch');
const logger = require('../utils/logger');
const safeError = require('../utils/safeError');

const rebalance = require('../services/caseload-rebalance.service');

router.use(authenticate);
router.use(requireBranchAccess);

function _parsePositiveInt(val, fallback, max) {
  const n = parseInt(val, 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return max && n > max ? max : n;
}

function _parseFloat01(val, fallback) {
  const n = parseFloat(val);
  if (!Number.isFinite(n) || n < 0 || n > 1) return fallback;
  return n;
}

router.get('/branch/:branchId/suggestions', async (req, res) => {
  try {
    const { branchId } = req.params;
    if (!branchId) {
      return res.status(400).json({ success: false, error: 'branchId required' });
    }

    // Cross-branch isolation guard — restricted callers can't analyze
    // foreign branches even if they hand-craft the URL.
    assertBranchMatch(req, branchId, 'caseload-rebalance');

    const overloadThreshold = _parsePositiveInt(req.query.threshold, 12, 100);
    const scoreImprovementThreshold = _parseFloat01(req.query.improvement, 0.1);
    const maxSuggestions = _parsePositiveInt(req.query.limit, 50, 200);

    const out = await rebalance.suggestRebalanceMoves({
      branchId,
      overloadThreshold,
      scoreImprovementThreshold,
      maxSuggestions,
    });
    return res.json({ success: true, data: out });
  } catch (err) {
    if (err && err.status === 403) {
      return res.status(403).json({ success: false, error: err.message });
    }
    logger.warn('[caseload-rebalance] /suggestions failed: %s', err.message || err);
    return safeError(res, err, 'caseload-rebalance.suggestions');
  }
});

module.exports = router;

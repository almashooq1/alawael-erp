'use strict';

const express = require('express');
const { authenticate } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const safeError = require('../utils/safeError');
const { getDefault: getService } = require('../services/quality/predictiveRisk.service');
const registry = require('../config/predictive-risk.registry');

const router = express.Router();
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get(
  '/reference',
  authenticate,
  wrap((req, res) => {
    res.json({
      success: true,
      data: { signalWeights: registry.SIGNAL_WEIGHTS, scoreBands: registry.SCORE_BANDS },
    });
  })
);

router.get(
  '/score',
  authenticate,
  requireBranchAccess,
  wrap(async (req, res) => {
    try {
      const data = await getService().getRiskReport({ branchId: req.query.branchId || null });
      res.json({ success: true, data });
    } catch (err) {
      return safeError(res, err);
    }
  })
);

router.post(
  '/score',
  authenticate,
  wrap((req, res) => {
    // Direct compute on caller-supplied signals — useful for what-if.
    try {
      const result = getService().computeScore(req.body || {});
      res.json({ success: true, data: result });
    } catch (err) {
      return safeError(res, err);
    }
  })
);

module.exports = router;

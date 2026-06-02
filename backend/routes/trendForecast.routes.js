'use strict';

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');
const { getDefault: getService } = require('../services/quality/trendForecast.service');

const router = express.Router();
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
};

router.post(
  '/forecast',
  authenticate,
  [body('values').isArray({ min: 3 })],
  handleValidation,
  wrap((req, res) => {
    try {
      const data = getService().forecastSeries(req.body.values, {
        horizon: Number(req.body.horizon) || 3,
        alpha: Number(req.body.alpha) || 0.3,
      });
      res.json({ success: true, data });
    } catch (err) {
      safeError(res, err);
    }
  })
);

router.post(
  '/level-shift',
  authenticate,
  [body('values').isArray({ min: 11 })],
  handleValidation,
  wrap((req, res) => {
    try {
      const data = getService().detectLevelShift(req.body.values, {
        referenceWindow: Number(req.body.referenceWindow) || 10,
      });
      res.json({ success: true, data });
    } catch (err) {
      safeError(res, err);
    }
  })
);

router.post(
  '/fit-line',
  authenticate,
  [body('values').isArray({ min: 2 })],
  handleValidation,
  wrap((req, res) => {
    try {
      const fit = getService().fitLine(req.body.values);
      if (!fit) return res.status(422).json({ success: false, error: 'insufficient data' });
      const { slope, intercept, r2 } = fit;
      res.json({ success: true, data: { slope, intercept, r2 } });
    } catch (err) {
      safeError(res, err);
    }
  })
);

router.get(
  '/indicators/:indicatorId/forecast',
  authenticate,
  [param('indicatorId').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const data = await getService().forecastIndicator(req.params.indicatorId, {
        months: Number(req.query.months) || 12,
        horizon: Number(req.query.horizon) || 3,
      });
      res.json({ success: true, data });
    } catch (err) {
      if (err.code === 'NOT_WIRED') {
        return res.status(503).json({ success: false, error: 'indicator model unavailable' });
      }
      safeError(res, err);
    }
  })
);

module.exports = router;

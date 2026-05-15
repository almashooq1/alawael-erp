'use strict';

const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');
const { getDefault: getService } = require('../services/quality/benchmark.service');

const router = express.Router();
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
};

router.get(
  '/',
  authenticate,
  wrap((req, res) => {
    res.json({ success: true, data: getService().list() });
  })
);

router.get(
  '/classify',
  authenticate,
  [query('metricCode').isString(), query('value').exists()],
  handleValidation,
  wrap((req, res) => {
    try {
      const r = getService().classify(req.query.metricCode, Number(req.query.value));
      if (!r) return res.status(404).json({ success: false, error: 'unknown metric' });
      res.json({ success: true, data: r });
    } catch (err) {
      safeError(res, err);
    }
  })
);

router.post(
  '/compare',
  authenticate,
  [body('observed').isObject()],
  handleValidation,
  wrap((req, res) => {
    try {
      const data = getService().compare(req.body.observed);
      res.json({ success: true, data });
    } catch (err) {
      safeError(res, err);
    }
  })
);

module.exports = router;

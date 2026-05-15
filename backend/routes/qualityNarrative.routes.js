'use strict';

const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');
const { getDefault: getService } = require('../services/quality/qualityNarrative.service');

const router = express.Router();
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
};

router.get(
  '/kinds',
  authenticate,
  wrap((req, res) => {
    res.json({ success: true, data: getService().listKinds() });
  })
);

router.post(
  '/generate',
  authenticate,
  [body('kind').isString()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const data = await getService().generate(req.body);
      res.json({ success: true, data });
    } catch (err) {
      if (err.code === 'VALIDATION') {
        return res.status(422).json({ success: false, error: err.message });
      }
      safeError(res, err);
    }
  })
);

router.post(
  '/redact',
  authenticate,
  [body('text').isString()],
  handleValidation,
  wrap((req, res) => {
    res.json({ success: true, data: { redacted: getService().redact(req.body.text) } });
  })
);

module.exports = router;

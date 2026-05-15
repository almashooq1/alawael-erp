'use strict';

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const safeError = require('../utils/safeError');
const { getDefault: getService } = require('../services/quality/inspectionSubmission.service');

const router = express.Router();
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
};
function mapStatusError(err, res) {
  if (err.code === 'VALIDATION')
    return res.status(422).json({ success: false, error: err.message });
  return safeError(res, err);
}

router.get(
  '/dashboard',
  authenticate,
  requireBranchAccess,
  wrap(async (req, res) => {
    try {
      const data = await getService().getDashboard({
        branchId: req.query.branchId,
        days: Number(req.query.days) || 30,
      });
      res.json({ success: true, data });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.get(
  '/',
  authenticate,
  requireBranchAccess,
  wrap(async (req, res) => {
    try {
      const items = await getService().list({
        branchId: req.query.branchId,
        inspectionType: req.query.inspectionType,
        outcome: req.query.outcome,
        fromDate: req.query.fromDate,
        toDate: req.query.toDate,
        limit: Number(req.query.limit) || 50,
        skip: Number(req.query.skip) || 0,
      });
      res.json({ success: true, data: items });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.get(
  '/:id',
  authenticate,
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().findById(req.params.id);
      if (!doc) return res.status(404).json({ success: false, error: 'Not found' });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.post(
  '/',
  authenticate,
  [
    body('clientUuid').isString().isLength({ min: 8 }),
    body('inspectionType').isString(),
    body('title').isString(),
    body('capturedAt').isISO8601(),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const { submission, duplicate } = await getService().submit(req.body, userId);
      res
        .status(duplicate ? 200 : 201)
        .json({ success: true, data: submission, meta: { duplicate } });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.post(
  '/bulk',
  authenticate,
  [body('submissions').isArray({ min: 1, max: 200 })],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const results = await getService().bulkSubmit(req.body.submissions, userId);
      res.json({ success: true, data: results });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

module.exports = router;

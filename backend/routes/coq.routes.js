'use strict';

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const safeError = require('../utils/safeError');
const { getDefault: getService } = require('../services/quality/coq.service');
const registry = require('../config/coq.registry');

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
  '/reference',
  authenticate,
  wrap((req, res) => {
    res.json({
      success: true,
      data: { categories: registry.COQ_CATEGORIES, thresholds: registry.HEALTH_THRESHOLDS },
    });
  })
);

router.get(
  '/dashboard',
  authenticate,
  requireBranchAccess,
  wrap(async (req, res) => {
    try {
      res.json({
        success: true,
        data: await getService().getDashboard({ branchId: req.query.branchId }),
      });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.get(
  '/entries',
  authenticate,
  requireBranchAccess,
  wrap(async (req, res) => {
    try {
      const items = await getService().listEntries({
        branchId: req.query.branchId,
        year: req.query.year,
        month: req.query.month,
        category: req.query.category,
        limit: Number(req.query.limit) || 100,
        skip: Number(req.query.skip) || 0,
      });
      res.json({ success: true, data: items });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.post(
  '/entries',
  authenticate,
  authorize(['admin', 'ceo', 'quality_manager', 'finance_manager']),
  [
    body('category').isIn(['prevention', 'appraisal', 'internal_failure', 'external_failure']),
    body('amount').isFloat({ min: 0 }),
    body('description').isString().isLength({ min: 3 }),
    body('period.year').isInt({ min: 2020 }),
    body('period.month').isInt({ min: 1, max: 12 }),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const doc = await getService().recordEntry(req.body, userId);
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.get(
  '/reports/monthly',
  authenticate,
  requireBranchAccess,
  [query('year').isInt({ min: 2020 }), query('month').isInt({ min: 1, max: 12 })],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const data = await getService().getMonthlyReport({
        branchId: req.query.branchId,
        year: Number(req.query.year),
        month: Number(req.query.month),
        revenue: req.query.revenue ? Number(req.query.revenue) : null,
      });
      res.json({ success: true, data });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.get(
  '/reports/yearly',
  authenticate,
  requireBranchAccess,
  [query('year').isInt({ min: 2020 })],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const data = await getService().getYearlyReport({
        branchId: req.query.branchId,
        year: Number(req.query.year),
        revenue: req.query.revenue ? Number(req.query.revenue) : null,
      });
      res.json({ success: true, data });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

module.exports = router;

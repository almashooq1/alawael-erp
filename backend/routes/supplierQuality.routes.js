'use strict';

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const safeError = require('../utils/safeError');
const { getDefault: getService } = require('../services/quality/supplierQuality.service');
const registry = require('../config/supplier-quality.registry');

const router = express.Router();
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
};
function mapStatusError(err, res) {
  if (err.code === 'NOT_FOUND') return res.status(404).json({ success: false, error: err.message });
  if (err.code === 'ILLEGAL_TRANSITION' || err.code === 'INVALID_PHASE') {
    return res.status(409).json({ success: false, error: err.message });
  }
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
      data: {
        scarStatuses: registry.SCAR_STATUSES,
        scarSeverity: registry.SCAR_SEVERITY,
        scorecardWeights: registry.SCORECARD_WEIGHTS,
        gradeBands: registry.GRADE_BANDS,
      },
    });
  })
);

router.get(
  '/scars/dashboard',
  authenticate,
  requireBranchAccess,
  wrap(async (req, res) => {
    try {
      const data = await getService().getDashboard({ branchId: req.query.branchId });
      res.json({ success: true, data });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.get(
  '/scars',
  authenticate,
  requireBranchAccess,
  wrap(async (req, res) => {
    try {
      const items = await getService().listScars({
        vendorId: req.query.vendorId,
        status: req.query.status,
        severity: req.query.severity,
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
  '/scars/:id',
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
  '/scars',
  authenticate,
  authorize(['admin', 'ceo', 'quality_manager', 'procurement_manager']),
  [
    body('vendorId').isMongoId(),
    body('title').isString().isLength({ min: 3 }),
    body('description').isString().isLength({ min: 5 }),
    body('severity').isIn(['minor', 'major', 'critical']),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const doc = await getService().raiseScar(req.body, userId);
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.post(
  '/scars/:id/transition',
  authenticate,
  authorize(['admin', 'ceo', 'quality_manager', 'procurement_manager']),
  [param('id').isMongoId(), body('to').isIn(registry.SCAR_STATUSES)],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const doc = await getService().setStatus(req.params.id, req.body.to, userId, req.body);
      res.json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.post(
  '/scars/:id/containment',
  authenticate,
  authorize(['admin', 'ceo', 'quality_manager', 'procurement_manager']),
  [param('id').isMongoId(), body('action').isString().isLength({ min: 3 })],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const doc = await getService().addContainment(req.params.id, req.body.action, userId);
      res.json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.post(
  '/scars/:id/supplier-response',
  authenticate,
  authorize(['admin', 'ceo', 'quality_manager', 'procurement_manager']),
  [
    param('id').isMongoId(),
    body('rootCause').isString().isLength({ min: 3 }),
    body('correctiveAction').isString().isLength({ min: 3 }),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const doc = await getService().submitSupplierResponse(req.params.id, req.body, userId);
      res.json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.post(
  '/scars/:id/verify',
  authenticate,
  authorize(['admin', 'ceo', 'quality_manager']),
  [param('id').isMongoId(), body('outcome').isIn(['effective', 'ineffective'])],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const doc = await getService().verifyEffectiveness(req.params.id, req.body, userId);
      res.json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.get(
  '/vendors/:vendorId/scorecard',
  authenticate,
  requireBranchAccess,
  [param('vendorId').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const data = await getService().computeVendorScorecard(req.params.vendorId, {
        windowDays: req.query.windowDays ? Number(req.query.windowDays) : 180,
      });
      res.json({ success: true, data });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

module.exports = router;

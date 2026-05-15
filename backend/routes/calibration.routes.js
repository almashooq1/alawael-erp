'use strict';

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const safeError = require('../utils/safeError');
const { getDefault: getService } = require('../services/quality/calibration.service');
const registry = require('../config/calibration.registry');

const router = express.Router();
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
};
function mapStatusError(err, res) {
  if (err.code === 'NOT_FOUND') return res.status(404).json({ success: false, error: err.message });
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
        statuses: registry.CAL_STATUSES,
        units: registry.CAL_FREQUENCY_UNITS,
        equipmentTypes: registry.EQUIPMENT_TYPES,
        outcomes: registry.CAL_OUTCOMES,
        reminderLeadDays: registry.REMINDER_LEAD_DAYS_DEFAULT,
      },
    });
  })
);

router.get(
  '/dashboard',
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
  '/',
  authenticate,
  requireBranchAccess,
  wrap(async (req, res) => {
    try {
      const items = await getService().list({
        branchId: req.query.branchId,
        status: req.query.status,
        type: req.query.type,
        dueWithinDays:
          req.query.dueWithinDays != null ? Number(req.query.dueWithinDays) : undefined,
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
  authorize(['admin', 'ceo', 'quality_manager', 'facility_manager']),
  [body('name').isString().isLength({ min: 2 }), body('type').isString()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const doc = await getService().registerAsset(req.body, userId);
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.post(
  '/:id/calibrations',
  authenticate,
  authorize(['admin', 'ceo', 'quality_manager', 'facility_manager']),
  [param('id').isMongoId(), body('outcome').isIn(['pass', 'pass_with_adjustment', 'fail'])],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const doc = await getService().recordCalibration(req.params.id, req.body, userId);
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.post(
  '/:id/status',
  authenticate,
  authorize(['admin', 'ceo', 'quality_manager', 'facility_manager']),
  [param('id').isMongoId(), body('status').isIn(registry.CAL_STATUSES)],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const doc = await getService().setStatus(
        req.params.id,
        req.body.status,
        req.body.reason,
        userId
      );
      res.json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.post(
  '/sweep-overdue',
  authenticate,
  authorize(['admin', 'ceo', 'quality_manager']),
  wrap(async (req, res) => {
    try {
      const swept = await getService().sweepOverdue();
      res.json({ success: true, data: { swept } });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

module.exports = router;

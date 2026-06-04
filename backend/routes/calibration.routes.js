'use strict';

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
// W277g — MFA tier-2 on calibration lifecycle. Status changes
// (in_service / out_of_service / retired) drive the JCI/Saudi-MOH
// asset register. Sweep-overdue is a bulk batch op against the
// entire asset inventory.
const { attachMfaActor, requireMfaTier } = require('../middleware/requireMfaTier');
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

function listScope(req) {
  const scope = { ...branchFilter(req) };
  if (!scope.branchId && req.query.branchId) scope.branchId = req.query.branchId;
  return scope;
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
      const data = await getService().getDashboard({ scopeFilter: listScope(req) });
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
        scopeFilter: listScope(req),
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
  requireBranchAccess,
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().findById(req.params.id, branchFilter(req));
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
  requireBranchAccess,
  authorize(['admin', 'ceo', 'quality_manager', 'facility_manager']),
  [body('name').isString().isLength({ min: 2 }), body('type').isString()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const payload = { ...req.body };
      if (req.branchScope?.branchId) payload.branchId = req.branchScope.branchId;
      const doc = await getService().registerAsset(payload, userId);
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.post(
  '/:id/calibrations',
  authenticate,
  requireBranchAccess,
  authorize(['admin', 'ceo', 'quality_manager', 'facility_manager']),
  [param('id').isMongoId(), body('outcome').isIn(['pass', 'pass_with_adjustment', 'fail'])],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const doc = await getService().recordCalibration(
        req.params.id,
        req.body,
        userId,
        branchFilter(req)
      );
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.post(
  '/:id/status',
  authenticate,
  requireBranchAccess,
  attachMfaActor,
  authorize(['admin', 'ceo', 'quality_manager', 'facility_manager']),
  requireMfaTier(2),
  [param('id').isMongoId(), body('status').isIn(registry.CAL_STATUSES)],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const doc = await getService().setStatus(
        req.params.id,
        req.body.status,
        req.body.reason,
        userId,
        branchFilter(req)
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
  attachMfaActor,
  authorize(['admin', 'ceo', 'quality_manager']),
  requireMfaTier(2),
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

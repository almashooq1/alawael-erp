'use strict';

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const safeError = require('../utils/safeError');
const { getDefault: getService } = require('../services/quality/auditScheduler.service');
const registry = require('../config/audit-schedule.registry');

const router = express.Router();
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
};
function mapStatusError(err, res) {
  if (err.code === 'NOT_FOUND') return res.status(404).json({ success: false, error: err.message });
  if (err.code === 'INVALID_PHASE')
    return res.status(409).json({ success: false, error: err.message });
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
        frequencyMonths: registry.AUDIT_FREQUENCY_MONTHS,
        statuses: registry.AUDIT_STATUSES,
        types: registry.AUDIT_TYPES,
        findingTypes: registry.FINDING_TYPES,
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
      res.json({
        success: true,
        data: await getService().getDashboard({ branchId: req.query.branchId }),
      });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

// Scopes
router.get(
  '/scopes',
  authenticate,
  requireBranchAccess,
  wrap(async (req, res) => {
    try {
      const items = await getService().listScopes({
        branchId: req.query.branchId,
        riskLevel: req.query.riskLevel,
        active: req.query.active === undefined ? undefined : req.query.active === 'true',
      });
      res.json({ success: true, data: items });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.post(
  '/scopes',
  authenticate,
  authorize(['admin', 'ceo', 'quality_manager']),
  [body('name').isString().isLength({ min: 2 })],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const doc = await getService().createScope(req.body, userId);
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

// Auto-generate next occurrence per scope.
router.post(
  '/generate-upcoming',
  authenticate,
  authorize(['admin', 'ceo', 'quality_manager']),
  wrap(async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const created = await getService().generateUpcoming({ branchId: req.body.branchId, userId });
      res.status(201).json({ success: true, data: { createdCount: created.length, created } });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

// Occurrences
router.get(
  '/occurrences',
  authenticate,
  requireBranchAccess,
  wrap(async (req, res) => {
    try {
      const items = await getService().listOccurrences({
        branchId: req.query.branchId,
        status: req.query.status,
        scopeId: req.query.scopeId,
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
  '/occurrences/:id',
  authenticate,
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().findOccurrenceById(req.params.id);
      if (!doc) return res.status(404).json({ success: false, error: 'Not found' });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.post(
  '/occurrences/:id/schedule',
  authenticate,
  authorize(['admin', 'ceo', 'quality_manager']),
  [param('id').isMongoId(), body('scheduledFor').isISO8601()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const doc = await getService().scheduleOccurrence(
        req.params.id,
        req.body.scheduledFor,
        userId
      );
      res.json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.post(
  '/occurrences/:id/start',
  authenticate,
  authorize(['admin', 'ceo', 'quality_manager', 'department_head']),
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const doc = await getService().startOccurrence(req.params.id, userId);
      res.json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.post(
  '/occurrences/:id/findings',
  authenticate,
  authorize(['admin', 'ceo', 'quality_manager', 'department_head']),
  [
    param('id').isMongoId(),
    body('type').isIn(['major_nc', 'minor_nc', 'opportunity', 'observation', 'commendation']),
    body('description').isString().isLength({ min: 3 }),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const doc = await getService().recordFinding(req.params.id, req.body, userId);
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.post(
  '/occurrences/:id/close',
  authenticate,
  authorize(['admin', 'ceo', 'quality_manager']),
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const doc = await getService().closeOccurrence(req.params.id, req.body || {}, userId);
      res.json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

module.exports = router;

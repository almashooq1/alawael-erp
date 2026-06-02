'use strict';

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const safeError = require('../utils/safeError');
const { getDefault: getService } = require('../services/quality/changeControl.service');
const registry = require('../config/change-control.registry');

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
        statuses: registry.CHANGE_STATUSES,
        types: registry.CHANGE_TYPES,
        riskLevels: registry.RISK_LEVELS,
        impactAreas: registry.IMPACT_AREAS,
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
        riskLevel: req.query.riskLevel,
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
  authorize(['admin', 'ceo', 'quality_manager', 'department_head']),
  [
    body('title').isString().isLength({ min: 3 }),
    body('rationale').isString().isLength({ min: 5 }),
    body('type').isString(),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const doc = await getService().createRequest(req.body, userId);
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.post(
  '/:id/impact-assessment',
  authenticate,
  authorize(['admin', 'ceo', 'quality_manager', 'department_head']),
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const doc = await getService().submitImpactAssessment(req.params.id, req.body, userId);
      res.json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.post(
  '/:id/cab-vote',
  authenticate,
  authorize(['admin', 'ceo', 'quality_manager', 'patient_safety_officer', 'department_head']),
  [param('id').isMongoId(), body('vote').isIn(['approve', 'reject', 'abstain'])],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const doc = await getService().castCabVote(req.params.id, req.body.vote, userId, req.body);
      res.json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.post(
  '/:id/cab-decide',
  authenticate,
  authorize(['admin', 'ceo', 'quality_manager']),
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const doc = await getService().decideCab(req.params.id, userId);
      res.json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.post(
  '/:id/transition',
  authenticate,
  authorize(['admin', 'ceo', 'quality_manager']),
  [param('id').isMongoId(), body('to').isIn(registry.CHANGE_STATUSES)],
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
  '/:id/steps',
  authenticate,
  authorize(['admin', 'ceo', 'quality_manager', 'department_head']),
  [
    param('id').isMongoId(),
    body('description').isString(),
    body('ownerUserId').isMongoId(),
    body('dueDate').isISO8601(),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const doc = await getService().addStep(req.params.id, req.body, userId);
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.patch(
  '/:id/steps/:stepId/status',
  authenticate,
  authorize(['admin', 'ceo', 'quality_manager', 'department_head']),
  [
    param('id').isMongoId(),
    param('stepId').isMongoId(),
    body('status').isIn(['open', 'in_progress', 'completed', 'cancelled']),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const doc = await getService().setStepStatus(
        req.params.id,
        req.params.stepId,
        req.body.status,
        userId
      );
      res.json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.post(
  '/:id/verify',
  authenticate,
  authorize(['admin', 'ceo', 'quality_manager']),
  [param('id').isMongoId(), body('outcome').isIn(['successful', 'unsuccessful'])],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const doc = await getService().verify(
        req.params.id,
        req.body.outcome,
        req.body.notes,
        userId
      );
      res.json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

module.exports = router;

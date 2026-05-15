'use strict';

/**
 * rca.routes.js — World-Class QMS Phase 29 Commit 2.
 *
 * HTTP surface for the structured RCA module (Ishikawa + 5 Whys).
 * Mounted by `_registry.js` at /api/rca and /api/v1/rca.
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');

const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const safeError = require('../utils/safeError');
const { getDefault: getService } = require('../services/quality/rca.service');
const registry = require('../config/rca.registry');

const router = express.Router();

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};
function mapStatusError(err, res) {
  if (err.code === 'NOT_FOUND') return res.status(404).json({ success: false, error: err.message });
  if (err.code === 'ILLEGAL_TRANSITION' || err.code === 'INVALID_PHASE') {
    return res.status(409).json({ success: false, error: err.message });
  }
  if (err.code === 'VALIDATION') {
    return res.status(422).json({ success: false, error: err.message });
  }
  if (err.code === 'INCOMPLETE') {
    return res.status(422).json({ success: false, error: err.message, rootCauses: err.rootCauses });
  }
  return safeError(res, err);
}

// ── reference data ─────────────────────────────────────────────────

router.get(
  '/reference',
  authenticate,
  wrap((req, res) => {
    res.json({
      success: true,
      data: {
        statuses: registry.RCA_STATUSES,
        severity: registry.SEVERITY,
        ishikawaVariants: {
          '6m': registry.ISHIKAWA_CATEGORIES_6M,
          healthcare: registry.ISHIKAWA_CATEGORIES_HEALTHCARE,
        },
        fiveWhys: { min: registry.FIVE_WHYS_MIN_DEPTH, max: registry.FIVE_WHYS_MAX_DEPTH },
      },
    });
  })
);

// ── dashboard / list / get ─────────────────────────────────────────

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
  [
    query('status').optional().isIn(registry.RCA_STATUSES),
    query('severity').optional().isInt({ min: 1, max: 6 }),
    query('limit').optional().isInt({ min: 1, max: 200 }),
    query('skip').optional().isInt({ min: 0 }),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const items = await getService().list({
        branchId: req.query.branchId,
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

// ── create ─────────────────────────────────────────────────────────

router.post(
  '/',
  authenticate,
  authorize(['admin', 'ceo', 'quality_manager', 'patient_safety_officer']),
  [
    body('title').isString().isLength({ min: 3, max: 200 }),
    body('eventDate').isISO8601(),
    body('eventDescription').isString().isLength({ min: 3 }),
    body('severity').isInt({ min: 1, max: 6 }),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const doc = await getService().createInvestigation(req.body, userId);
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

// ── Ishikawa ───────────────────────────────────────────────────────

router.post(
  '/:id/ishikawa/:category',
  authenticate,
  authorize(['admin', 'ceo', 'quality_manager', 'patient_safety_officer', 'department_head']),
  [
    param('id').isMongoId(),
    param('category').isString(),
    body('text').isString().isLength({ min: 2 }),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const doc = await getService().addIshikawaCause(
        req.params.id,
        req.params.category,
        req.body.text,
        userId
      );
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.delete(
  '/:id/ishikawa/:category/:causeId',
  authenticate,
  authorize(['admin', 'ceo', 'quality_manager', 'patient_safety_officer']),
  [param('id').isMongoId(), param('causeId').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const doc = await getService().removeIshikawaCause(
        req.params.id,
        req.params.category,
        req.params.causeId,
        userId
      );
      res.json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

// ── 5 Whys ─────────────────────────────────────────────────────────

router.put(
  '/:id/five-whys',
  authenticate,
  authorize(['admin', 'ceo', 'quality_manager', 'patient_safety_officer', 'department_head']),
  [param('id').isMongoId(), body('chain').isArray()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const doc = await getService().setFiveWhysChain(req.params.id, req.body.chain, userId);
      res.json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

// ── Root causes ────────────────────────────────────────────────────

router.post(
  '/:id/root-causes',
  authenticate,
  authorize(['admin', 'ceo', 'quality_manager', 'patient_safety_officer']),
  [
    param('id').isMongoId(),
    body('text').isString().isLength({ min: 3 }),
    body('source').isIn(['five_whys', 'ishikawa', 'manual']),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const doc = await getService().addRootCause(req.params.id, req.body, userId);
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.post(
  '/:id/promote',
  authenticate,
  authorize(['admin', 'ceo', 'quality_manager', 'patient_safety_officer']),
  [
    param('id').isMongoId(),
    body('source').isIn(['five_whys', 'ishikawa']),
    body('refId').isMongoId(),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const doc = await getService().promoteToRootCause(
        req.params.id,
        req.body.source,
        req.body.refId,
        req.body,
        userId
      );
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

// ── Actions ────────────────────────────────────────────────────────

router.post(
  '/:id/actions',
  authenticate,
  authorize(['admin', 'ceo', 'quality_manager', 'patient_safety_officer']),
  [
    param('id').isMongoId(),
    body('description').isString().isLength({ min: 3 }),
    body('ownerUserId').isMongoId(),
    body('dueDate').isISO8601(),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const doc = await getService().addAction(req.params.id, req.body, userId);
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.patch(
  '/:id/actions/:actionId/status',
  authenticate,
  authorize(['admin', 'ceo', 'quality_manager', 'patient_safety_officer', 'department_head']),
  [
    param('id').isMongoId(),
    param('actionId').isMongoId(),
    body('status').isIn(['open', 'in_progress', 'completed', 'overdue', 'cancelled']),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const doc = await getService().updateActionStatus(
        req.params.id,
        req.params.actionId,
        req.body,
        userId
      );
      res.json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

// ── Transitions ────────────────────────────────────────────────────

router.post(
  '/:id/transition',
  authenticate,
  authorize(['admin', 'ceo', 'quality_manager', 'patient_safety_officer']),
  [param('id').isMongoId(), body('to').isIn(registry.RCA_STATUSES)],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const doc = await getService().setStatus(req.params.id, req.body.to, userId);
      res.json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.post(
  '/:id/verify',
  authenticate,
  authorize(['admin', 'ceo', 'quality_manager', 'patient_safety_officer']),
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const doc = await getService().verify(req.params.id, req.body || {}, userId);
      res.json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.post(
  '/:id/cancel',
  authenticate,
  authorize(['admin', 'ceo', 'quality_manager']),
  [param('id').isMongoId(), body('reason').isString().isLength({ min: 3 })],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const doc = await getService().cancel(req.params.id, req.body.reason, userId);
      res.json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

module.exports = router;

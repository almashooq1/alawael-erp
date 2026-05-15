'use strict';

/**
 * paretoA3.routes.js — World-Class QMS Phase 29 Commit 4.
 *
 * Dual mounted at /api/pareto-a3 + /api/v1/pareto-a3.
 *
 * - /pareto/compute   — POST a flat item list, get distribution back
 * - /pareto/incidents — auto-pull from incident collection
 * - /pareto/complaints — same for complaints
 * - /a3 + /a3/:id ... — full A3 report lifecycle
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');

const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const safeError = require('../utils/safeError');
const { getDefault: getService, A3_SECTIONS } = require('../services/quality/paretoA3.service');
const { A3_STATUSES } = require('../config/pareto-a3.registry');

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

// ── reference ──────────────────────────────────────────────────────

router.get(
  '/reference',
  authenticate,
  wrap((req, res) => {
    res.json({
      success: true,
      data: { a3Sections: A3_SECTIONS, a3Statuses: A3_STATUSES },
    });
  })
);

// ── Pareto endpoints ───────────────────────────────────────────────

router.post(
  '/pareto/compute',
  authenticate,
  requireBranchAccess,
  [body('items').isArray()],
  handleValidation,
  wrap((req, res) => {
    try {
      const out = getService().paretoFromItems(req.body.items, {
        threshold: req.body.threshold || 0.8,
      });
      res.json({ success: true, data: out });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.get(
  '/pareto/incidents',
  authenticate,
  requireBranchAccess,
  wrap(async (req, res) => {
    try {
      const data = await getService().paretoIncidents({
        branchId: req.query.branchId,
        fromDate: req.query.fromDate,
        toDate: req.query.toDate,
        groupBy: req.query.groupBy || 'category',
        threshold: req.query.threshold ? Number(req.query.threshold) : undefined,
      });
      res.json({ success: true, data });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.get(
  '/pareto/complaints',
  authenticate,
  requireBranchAccess,
  wrap(async (req, res) => {
    try {
      const data = await getService().paretoComplaints({
        branchId: req.query.branchId,
        fromDate: req.query.fromDate,
        toDate: req.query.toDate,
        groupBy: req.query.groupBy || 'category',
        threshold: req.query.threshold ? Number(req.query.threshold) : undefined,
      });
      res.json({ success: true, data });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

// ── A3 endpoints ───────────────────────────────────────────────────

router.get(
  '/a3/dashboard',
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
  '/a3',
  authenticate,
  requireBranchAccess,
  [query('status').optional().isIn(A3_STATUSES)],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const items = await getService().list({
        branchId: req.query.branchId,
        status: req.query.status,
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
  '/a3/:id',
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
  '/a3',
  authenticate,
  authorize(['admin', 'ceo', 'quality_manager', 'patient_safety_officer', 'department_head']),
  [
    body('title').isString().isLength({ min: 3, max: 200 }),
    body('problemStatement').isString().isLength({ min: 5 }),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const doc = await getService().createReport(req.body, userId);
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.put(
  '/a3/:id/sections/:section',
  authenticate,
  authorize(['admin', 'ceo', 'quality_manager', 'patient_safety_officer', 'department_head']),
  [param('id').isMongoId(), body('body').isString()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const doc = await getService().updateSection(
        req.params.id,
        req.params.section,
        req.body.body,
        userId
      );
      res.json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.post(
  '/a3/:id/actions',
  authenticate,
  authorize(['admin', 'ceo', 'quality_manager', 'patient_safety_officer', 'department_head']),
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
  '/a3/:id/actions/:actionId/status',
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

router.post(
  '/a3/:id/transition',
  authenticate,
  authorize(['admin', 'ceo', 'quality_manager', 'patient_safety_officer']),
  [param('id').isMongoId(), body('to').isIn(A3_STATUSES)],
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
  '/a3/:id/cancel',
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

'use strict';

/**
 * purchaseRequest.routes.js — Phase 16 Commit 4 (4.0.69).
 *
 * HTTP surface for the PR→PO workflow.
 *
 * Mounted by `_registry.js` at /api/ops/purchase-requests and
 * /api/v1/ops/purchase-requests.
 *
 * Endpoints:
 *   GET  /reference                       — registry snapshot
 *   GET  /                                 — list (filters)
 *   GET  /:id                              — detail
 *   POST /                                 — create draft
 *   POST /:id/submit                       — draft → submitted
 *   POST /:id/approve                      — record current-level approval
 *   POST /:id/reject                       — reject (any level)
 *   POST /:id/return                       — return for clarification
 *   POST /:id/resubmit                     — returned → under_review
 *   POST /:id/cancel                       — open → cancelled
 *   POST /:id/convert-to-po                — approved → converted_to_po
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');

const { authenticate, authorize } = require('../../middleware/auth');
const safeError = require('../../utils/safeError');
const registry = require('../../config/purchaseRequest.registry');

const router = express.Router();

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
}

function mapError(err, res) {
  if (err.code === 'NOT_FOUND') {
    return res.status(404).json({ success: false, error: err.message });
  }
  if (err.code === 'ILLEGAL_TRANSITION') {
    return res.status(409).json({
      success: false,
      error: err.message,
      from: err.from,
      to: err.to,
    });
  }
  if (err.code === 'MISSING_FIELD') {
    return res.status(422).json({ success: false, error: err.message, fields: err.fields });
  }
  if (err.code === 'CONFLICT') {
    return res.status(409).json({ success: false, error: err.message });
  }
  return safeError(res, err);
}

function getService() {
  return (
    require('../../startup/operationsBootstrap')._getPurchaseRequestService?.() ||
    _fallbackService()
  );
}

let _fallback = null;
function _fallbackService() {
  if (_fallback) return _fallback;
  const {
    createPurchaseRequestService,
  } = require('../../services/operations/purchaseRequest.service');
  const PR = require('../../models/operations/PurchaseRequest.model');
  const PO = require('../../models/inventory/PurchaseOrder');
  _fallback = createPurchaseRequestService({ prModel: PR, poModel: PO });
  return _fallback;
}

// ── reference ──────────────────────────────────────────────────────

router.get(
  '/reference',
  authenticate,
  wrap((req, res) => {
    res.json({
      success: true,
      data: {
        statuses: registry.PR_STATUSES,
        terminalStatuses: registry.PR_TERMINAL_STATUSES,
        pauseStatuses: registry.PR_PAUSE_STATUSES,
        transitions: registry.PR_TRANSITIONS,
        approvalTiers: registry.APPROVAL_TIERS,
        purchaseMethods: registry.PURCHASE_METHODS,
        priorities: registry.PRIORITIES,
      },
    });
  })
);

// ── list / get ────────────────────────────────────────────────────

router.get(
  '/',
  authenticate,
  [
    query('branchId').optional().isMongoId(),
    query('status').optional().isIn(registry.PR_STATUSES),
    query('priority').optional().isIn(registry.PRIORITIES),
    query('limit').optional().isInt({ min: 1, max: 500 }),
    query('skip').optional().isInt({ min: 0 }),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const rows = await getService().list({
        branchId: req.query.branchId,
        status: req.query.status,
        department: req.query.department,
        priority: req.query.priority,
        limit: req.query.limit ? Number(req.query.limit) : 100,
        skip: req.query.skip ? Number(req.query.skip) : 0,
      });
      res.json({ success: true, data: rows });
    } catch (err) {
      mapError(err, res);
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
      if (!doc) return res.status(404).json({ success: false, error: 'PR not found' });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

// ── create draft ──────────────────────────────────────────────────

router.post(
  '/',
  authenticate,
  authorize(['admin', 'ops_manager', 'procurement_manager', 'department_head', 'staff']),
  [
    body('requiredDate').isISO8601(),
    body('items').isArray({ min: 1 }),
    body('items.*.itemName').isString().notEmpty(),
    body('items.*.quantity').isFloat({ gt: 0 }),
    body('priority').optional().isIn(registry.PRIORITIES),
    body('purchaseMethod').optional().isIn(registry.PURCHASE_METHODS),
    body('branchId').optional().isMongoId(),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().createDraft(req.body, {
        actorId: req.user?._id,
      });
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

// ── submit ────────────────────────────────────────────────────────

router.post(
  '/:id/submit',
  authenticate,
  authorize(['admin', 'ops_manager', 'procurement_manager', 'department_head', 'staff']),
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().submit(req.params.id, {
        actorId: req.user?._id,
        notes: req.body?.notes,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

// ── approve / reject ──────────────────────────────────────────────

router.post(
  '/:id/approve',
  authenticate,
  authorize(['admin', 'ops_manager', 'procurement_manager', 'department_head', 'cfo', 'ceo']),
  [param('id').isMongoId(), body('role').isString().notEmpty()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().approveStep(req.params.id, {
        approverId: req.user?._id,
        approverName: req.user?.name || null,
        role: req.body.role,
        comments: req.body.comments,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/:id/reject',
  authenticate,
  authorize(['admin', 'ops_manager', 'procurement_manager', 'department_head', 'cfo', 'ceo']),
  [param('id').isMongoId(), body('reason').isString().notEmpty()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().reject(req.params.id, {
        approverId: req.user?._id,
        reason: req.body.reason,
        role: req.body.role || null,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/:id/return',
  authenticate,
  authorize(['admin', 'ops_manager', 'procurement_manager', 'department_head', 'cfo', 'ceo']),
  [param('id').isMongoId(), body('notes').isString().notEmpty()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().returnForClarification(req.params.id, {
        actorId: req.user?._id,
        notes: req.body.notes,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/:id/resubmit',
  authenticate,
  authorize(['admin', 'ops_manager', 'procurement_manager', 'department_head', 'staff']),
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().resubmit(req.params.id, {
        actorId: req.user?._id,
        notes: req.body?.notes,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/:id/cancel',
  authenticate,
  authorize(['admin', 'ops_manager', 'procurement_manager', 'department_head']),
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().cancel(req.params.id, {
        actorId: req.user?._id,
        reason: req.body?.reason,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/:id/convert-to-po',
  authenticate,
  authorize(['admin', 'ops_manager', 'procurement_manager']),
  [
    param('id').isMongoId(),
    body('supplierId').optional().isMongoId(),
    body('supplierName').optional().isString(),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const result = await getService().convertToPo(req.params.id, {
        actorId: req.user?._id,
        supplierId: req.body.supplierId,
        supplierName: req.body.supplierName,
        poOverrides: req.body.poOverrides || {},
      });
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      mapError(err, res);
    }
  })
);

module.exports = router;

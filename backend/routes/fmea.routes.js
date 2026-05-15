'use strict';

/**
 * fmea.routes.js — World-Class QMS Phase 29 Commit 1.
 *
 * HTTP surface for FMEA / HFMEA worksheets. Mounted via _registry.js
 * at /api/fmea and /api/v1/fmea (dualMount).
 *
 * Response shape: { success: true, data } | { success: false, error }.
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');

const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const safeError = require('../utils/safeError');
const { getDefault: getService } = require('../services/quality/fmea.service');
const registry = require('../config/fmea.registry');

const router = express.Router();

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
}

function mapStatusError(err, res) {
  if (err.code === 'NOT_FOUND') {
    return res.status(404).json({ success: false, error: err.message });
  }
  if (err.code === 'ILLEGAL_TRANSITION' || err.code === 'INVALID_PHASE') {
    return res.status(409).json({ success: false, error: err.message });
  }
  if (err.code === 'VALIDATION' || err.code === 'INCOMPLETE') {
    return res
      .status(422)
      .json({ success: false, error: err.message, fields: err.fields, rows: err.rows });
  }
  if (err.code === 'FORBIDDEN') {
    return res.status(403).json({ success: false, error: err.message });
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
        statuses: registry.FMEA_STATUSES,
        types: registry.FMEA_TYPES,
        scales: {
          hfmea: {
            severity: registry.HFMEA_SEVERITY,
            probability: registry.HFMEA_PROBABILITY,
            decisionTree: registry.HFMEA_DECISION_TREE,
            quorumMin: registry.HFMEA_QUORUM_MIN,
            requiredRoles: registry.HFMEA_REQUIRED_ROLES,
          },
          aiag: {
            severity: registry.AIAG_SEVERITY,
            occurrence: registry.AIAG_OCCURRENCE,
            detection: registry.AIAG_DETECTION,
            actionPriority: registry.AIAG_ACTION_PRIORITY,
          },
        },
        actionTypes: registry.ACTION_TYPES,
      },
    });
  })
);

// ── dashboard ──────────────────────────────────────────────────────

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

// ── list ───────────────────────────────────────────────────────────

router.get(
  '/',
  authenticate,
  requireBranchAccess,
  [
    query('status').optional().isIn(registry.FMEA_STATUSES),
    query('type')
      .optional()
      .isIn(registry.FMEA_TYPES.map(t => t.code)),
    query('scale').optional().isIn(['aiag_10', 'hfmea_5']),
    query('limit').optional().isInt({ min: 1, max: 200 }),
    query('skip').optional().isInt({ min: 0 }),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const items = await getService().list({
        branchId: req.query.branchId,
        status: req.query.status,
        type: req.query.type,
        scale: req.query.scale,
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
      if (!doc) {
        return res.status(404).json({ success: false, error: 'Worksheet not found' });
      }
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
    body('type').isIn(registry.FMEA_TYPES.map(t => t.code)),
    body('scale').isIn(['aiag_10', 'hfmea_5']),
    body('title').isString().isLength({ min: 3, max: 200 }),
    body('scope').isString().isLength({ min: 3, max: 2000 }),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const doc = await getService().createWorksheet(req.body, userId);
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

// ── rows ───────────────────────────────────────────────────────────

router.post(
  '/:id/rows',
  authenticate,
  authorize(['admin', 'ceo', 'quality_manager', 'patient_safety_officer', 'department_head']),
  [
    param('id').isMongoId(),
    body('functionAr').isString().isLength({ min: 2 }),
    body('failureMode').isString().isLength({ min: 2 }),
    body('failureEffect').isString().isLength({ min: 2 }),
    body('severity').isInt({ min: 1, max: 10 }),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const ws = await getService().addRow(req.params.id, req.body, userId);
      res.status(201).json({ success: true, data: ws });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.patch(
  '/:id/rows/:rowId',
  authenticate,
  authorize(['admin', 'ceo', 'quality_manager', 'patient_safety_officer', 'department_head']),
  [param('id').isMongoId(), param('rowId').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const ws = await getService().updateRow(req.params.id, req.params.rowId, req.body, userId);
      res.json({ success: true, data: ws });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.delete(
  '/:id/rows/:rowId',
  authenticate,
  authorize(['admin', 'ceo', 'quality_manager']),
  [param('id').isMongoId(), param('rowId').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const ws = await getService().deleteRow(req.params.id, req.params.rowId, userId);
      res.json({ success: true, data: ws });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

// ── actions ────────────────────────────────────────────────────────

router.post(
  '/:id/rows/:rowId/actions',
  authenticate,
  authorize(['admin', 'ceo', 'quality_manager', 'patient_safety_officer', 'department_head']),
  [
    param('id').isMongoId(),
    param('rowId').isMongoId(),
    body('type').isIn(['eliminate', 'control', 'accept']),
    body('description').isString().isLength({ min: 3 }),
    body('ownerUserId').isMongoId(),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const ws = await getService().addAction(req.params.id, req.params.rowId, req.body, userId);
      res.status(201).json({ success: true, data: ws });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.patch(
  '/:id/rows/:rowId/actions/:actionId/status',
  authenticate,
  authorize(['admin', 'ceo', 'quality_manager', 'patient_safety_officer', 'department_head']),
  [
    param('id').isMongoId(),
    param('rowId').isMongoId(),
    param('actionId').isMongoId(),
    body('status').isIn(['open', 'in_progress', 'completed', 'overdue', 'cancelled']),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const ws = await getService().updateActionStatus(
        req.params.id,
        req.params.rowId,
        req.params.actionId,
        req.body,
        userId
      );
      res.json({ success: true, data: ws });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

// ── re-rate row (Step 8) ───────────────────────────────────────────

router.post(
  '/:id/rows/:rowId/rerate',
  authenticate,
  authorize(['admin', 'ceo', 'quality_manager', 'patient_safety_officer']),
  [
    param('id').isMongoId(),
    param('rowId').isMongoId(),
    body('severity').isInt({ min: 1, max: 10 }),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const ws = await getService().rerateRow(req.params.id, req.params.rowId, req.body, userId);
      res.json({ success: true, data: ws });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

// ── transitions ────────────────────────────────────────────────────

router.post(
  '/:id/submit',
  authenticate,
  authorize(['admin', 'ceo', 'quality_manager', 'patient_safety_officer']),
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const ws = await getService().submit(req.params.id, userId);
      res.json({ success: true, data: ws });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.post(
  '/:id/sign',
  authenticate,
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const ws = await getService().teamSign(req.params.id, req.body || {}, userId);
      res.json({ success: true, data: ws });
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
      const ws = await getService().verify(req.params.id, userId);
      res.json({ success: true, data: ws });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.post(
  '/:id/archive',
  authenticate,
  authorize(['admin', 'ceo', 'quality_manager']),
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const ws = await getService().archive(req.params.id, userId);
      res.json({ success: true, data: ws });
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
      const ws = await getService().cancel(req.params.id, req.body.reason, userId);
      res.json({ success: true, data: ws });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

module.exports = router;

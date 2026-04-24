'use strict';

/**
 * workOrder.routes.js — Phase 16 Commit 2 (4.0.67).
 *
 * Thin HTTP surface over the WO state-machine service. The full
 * CRUD for MaintenanceWorkOrder already exists elsewhere (legacy
 * `/api/maintenance-work-orders` routes) — this module adds the
 * ops-layer transition endpoints that keep the SLA engine in sync
 * and emit `ops.wo.*` events.
 *
 * Mounted by `_registry.js` at `/api/ops/work-orders` and
 * `/api/v1/ops/work-orders`.
 *
 * Endpoints:
 *   GET  /reference           — state graph + legal transitions
 *   POST /:id/transition      — move a WO to a new state
 *
 * Response shape: `{ success: true, data }` | `{ success: false, error }`.
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');

const { authenticate, authorize } = require('../../middleware/auth');
const safeError = require('../../utils/safeError');
const registry = require('../../config/workOrder.registry');
const WorkOrderModel = require('../../models/MaintenanceWorkOrder');

const router = express.Router();

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
}

function getStateMachine() {
  // Late binding so the singleton seated by operationsBootstrap is
  // picked up; the bootstrap replaces this on boot.
  return (
    require('../../startup/operationsBootstrap')._getWorkOrderStateMachine?.() || _buildFallback()
  );
}

// Fallback wiring — only hit in tests or pre-boot; creates a SM
// without SLA/dispatcher so HTTP still responds coherently.
let _fallback = null;
function _buildFallback() {
  if (_fallback) return _fallback;
  const {
    createWorkOrderStateMachine,
  } = require('../../services/operations/workOrderStateMachine.service');
  const WO = require('../../models/MaintenanceWorkOrder');
  _fallback = createWorkOrderStateMachine({ workOrderModel: WO });
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
        states: registry.WO_STATES,
        terminalStates: registry.TERMINAL_STATES,
        pauseStates: registry.PAUSE_STATES,
        responseStates: registry.RESPONSE_STATES,
        resolutionStates: registry.RESOLUTION_STATES,
        transitions: registry.TRANSITIONS,
        legacyAliases: registry.LEGACY_ALIASES,
      },
    });
  })
);

// ── list ──────────────────────────────────────────────────────────
//
// Thin list endpoint over the existing MaintenanceWorkOrder model.
// Kept narrow (filter + pagination) — the legacy CRUD routes still
// own create / edit. This exists so the Phase-16 UI can list WOs
// without having to consume the legacy enum vocabulary.

router.get(
  '/',
  authenticate,
  [
    query('branchId').optional().isMongoId(),
    query('status').optional().isString(),
    query('priority').optional().isIn(['low', 'normal', 'high', 'critical']),
    query('type').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 500 }),
    query('skip').optional().isInt({ min: 0 }),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const filter = {};
      if (req.query.branchId) filter.branchId = req.query.branchId;
      if (req.query.status) filter.status = req.query.status;
      if (req.query.priority) filter.priority = req.query.priority;
      if (req.query.type) filter.type = req.query.type;

      const limit = req.query.limit ? Number(req.query.limit) : 100;
      const skip = req.query.skip ? Number(req.query.skip) : 0;

      const rows = await WorkOrderModel.find(filter)
        .sort({ scheduledDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit);

      res.json({ success: true, data: rows });
    } catch (err) {
      safeError(res, err);
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
      const doc = await WorkOrderModel.findById(req.params.id);
      if (!doc) return res.status(404).json({ success: false, error: 'WO not found' });
      res.json({ success: true, data: doc });
    } catch (err) {
      safeError(res, err);
    }
  })
);

// ── transition ────────────────────────────────────────────────────

router.post(
  '/:id/transition',
  authenticate,
  authorize(['admin', 'ops_manager', 'maintenance_supervisor', 'maintenance_technician']),
  [
    param('id').isMongoId(),
    body('toState').isString().notEmpty(),
    body('notes').optional().isString(),
    body('patch').optional().isObject(),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const sm = getStateMachine();
      const wo = await sm.transition({
        workOrder: req.params.id,
        toState: req.body.toState,
        actorId: req.user?._id || null,
        notes: req.body.notes,
        patch: req.body.patch || {},
      });
      res.json({ success: true, data: wo });
    } catch (err) {
      if (err.code === 'ILLEGAL_TRANSITION') {
        return res.status(409).json({
          success: false,
          error: err.message,
          from: err.from,
          to: err.to,
          allowed: err.allowed,
        });
      }
      if (err.code === 'MISSING_FIELD') {
        return res.status(422).json({
          success: false,
          error: err.message,
          fields: err.fields,
        });
      }
      safeError(res, err);
    }
  })
);

module.exports = router;

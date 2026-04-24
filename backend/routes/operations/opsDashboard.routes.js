'use strict';

/**
 * opsDashboard.routes.js — Phase 16 Commit 5 (4.0.70).
 *
 * Read-only HTTP surface for the Ops Control Tower.
 *
 * Mounted at /api/ops/dashboard and /api/v1/ops/dashboard.
 *
 * Endpoints:
 *   GET /branch/:branchId              — single-branch real-time board
 *   GET /coo                            — cross-branch executive board
 *   GET /coo?windowHours=168            — configurable window (default 24h)
 *
 * All endpoints authenticated; COO endpoint restricted to COO / CEO /
 * admin roles. The service is defensive — a missing collection or a
 * thrown query returns `null` for that section, never a 500.
 */

const express = require('express');
const { param, query, validationResult } = require('express-validator');

const { authenticate, authorize } = require('../../middleware/auth');
const safeError = require('../../utils/safeError');

const router = express.Router();

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
}

function getService() {
  return require('../../startup/operationsBootstrap')._getOpsDashboardService?.() || _fallback();
}

let _fb = null;
function _fallback() {
  if (_fb) return _fb;
  const { createOpsDashboardService } = require('../../services/operations/opsDashboard.service');
  _fb = createOpsDashboardService({
    slaModel: require('../../models/operations/SLA.model'),
    slaBreachModel: require('../../models/operations/SLABreach.model'),
    workOrderModel: require('../../models/MaintenanceWorkOrder'),
    purchaseRequestModel: require('../../models/operations/PurchaseRequest.model'),
    facilityInspectionModel: require('../../models/operations/FacilityInspection.model'),
    facilityModel: require('../../models/operations/Facility.model'),
  });
  return _fb;
}

// ── Branch ops board ──────────────────────────────────────────────

router.get(
  '/branch/:branchId',
  authenticate,
  [param('branchId').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const data = await getService().getBranchOpsBoard(req.params.branchId);
      res.json({ success: true, data });
    } catch (err) {
      safeError(res, err);
    }
  })
);

// ── COO executive board ───────────────────────────────────────────

router.get(
  '/coo',
  authenticate,
  authorize(['admin', 'coo', 'ceo', 'ops_manager']),
  [query('windowHours').optional().isInt({ min: 1, max: 720 })],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const data = await getService().getCooExecutiveBoard({
        windowHours: req.query.windowHours ? Number(req.query.windowHours) : 24,
      });
      res.json({ success: true, data });
    } catch (err) {
      safeError(res, err);
    }
  })
);

module.exports = router;

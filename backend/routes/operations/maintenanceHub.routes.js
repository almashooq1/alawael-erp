'use strict';

/**
 * maintenanceHub.routes.js — W807.
 *
 * Unified maintenance + facility-asset control surface.
 * Mounted at /api/ops/maintenance-hub and /api/v1/ops/maintenance-hub.
 */

const express = require('express');
const { body, validationResult } = require('express-validator');

const { authenticate, authorize } = require('../../middleware/auth');
const safeError = require('../../utils/safeError');
const { requireBranchAccess, branchFilter } = require('../../middleware/branchScope.middleware');
const { createMaintenanceHubService } = require('../../services/operations/maintenanceHub.service');

require('../../models/FacilityAsset');
require('../../models/MaintenanceWorkOrder');
require('../../models/operations/Facility.model');

const router = express.Router();

router.use(authenticate);
router.use(requireBranchAccess);

const HUB_READ_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'ops_manager',
  'facility_manager',
  'maintenance_supervisor',
  'maintenance_technician',
  'maintenance',
  'safety_officer',
  'manager',
  'branch_manager',
];

const SPAWN_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'ops_manager',
  'facility_manager',
  'maintenance_supervisor',
  'maintenance',
];

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
}

function getHubService() {
  const MaintenanceWorkOrder = require('../../models/MaintenanceWorkOrder');
  const FacilityAsset = require('../../models/FacilityAsset');
  return createMaintenanceHubService({
    workOrderModel: MaintenanceWorkOrder,
    facilityAssetModel: FacilityAsset,
    workOrderStateMachine: getStateMachine(),
  });
}

function getStateMachine() {
  return (
    require('../../startup/operationsBootstrap')._getWorkOrderStateMachine?.() || _buildFallbackSm()
  );
}

let _fallbackSm = null;
function _buildFallbackSm() {
  if (_fallbackSm) return _fallbackSm;
  const {
    createWorkOrderStateMachine,
  } = require('../../services/operations/workOrderStateMachine.service');
  const WO = require('../../models/MaintenanceWorkOrder');
  _fallbackSm = createWorkOrderStateMachine({ workOrderModel: WO });
  return _fallbackSm;
}

router.get(
  '/snapshot',
  authorize(HUB_READ_ROLES),
  wrap(async (req, res) => {
    try {
      const svc = createMaintenanceHubService({
        workOrderModel: require('../../models/MaintenanceWorkOrder'),
        facilityAssetModel: require('../../models/FacilityAsset'),
      });
      const data = await svc.getSnapshot(branchFilter(req));
      res.json({ success: true, data });
    } catch (err) {
      safeError(res, err);
    }
  })
);

router.post(
  '/spawn-due-maintenance',
  authorize(SPAWN_ROLES),
  [
    body('limit').optional().isInt({ min: 1, max: 50 }),
    body('markInMaintenance').optional().isBoolean(),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const svc = getHubService();
      const data = await svc.spawnDueMaintenanceWorkOrders({
        branchFilter: branchFilter(req),
        actorId: req.user?._id || req.user?.id || null,
        limit: req.body?.limit ? Number(req.body.limit) : 25,
        markInMaintenance: req.body?.markInMaintenance === true,
      });
      res.status(201).json({ success: true, data });
    } catch (err) {
      if (err.message === 'WORK_ORDER_STATE_MACHINE_UNAVAILABLE') {
        return res.status(503).json({
          success: false,
          error: 'محرك أوامر الصيانة غير متاح',
        });
      }
      safeError(res, err);
    }
  })
);

module.exports = router;

'use strict';

/**
 * routeOptimization.routes.js — Phase 16 Commit 7 (4.0.72).
 *
 * HTTP surface for transport route planning + reconciliation.
 * Mounted at /api/ops/route-optimization and /api/v1/…
 *
 * Endpoints:
 *   GET  /reference                      — registry snapshot
 *   GET  /                                — list jobs (filters)
 *   GET  /:id                             — detail
 *   POST /                                — create new planning job
 *   POST /:id/requests                    — add pickup request
 *   POST /:id/optimize                    — run optimiser
 *   POST /:id/assign-vehicle              — assign vehicle
 *   POST /:id/assign-driver               — assign driver
 *   POST /:id/publish                     — lock plan + activate stop SLAs
 *   POST /:id/start                       — flip to in_transit
 *   POST /:id/stops/:stopId/status        — record stop outcome
 *   POST /:id/complete                    — close + compute variance
 *   POST /:id/cancel                      — cancel + close outstanding SLAs
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');

const { authenticate, authorize } = require('../../middleware/auth');
const safeError = require('../../utils/safeError');
const registry = require('../../config/routeOptimization.registry');

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
    return res.status(409).json({ success: false, error: err.message, from: err.from, to: err.to });
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
    require('../../startup/operationsBootstrap')._getRouteOptimizationService?.() || _fallback()
  );
}

let _fb = null;
function _fallback() {
  if (_fb) return _fb;
  const {
    createRouteOptimizationService,
  } = require('../../services/operations/routeOptimization.service');
  _fb = createRouteOptimizationService({
    jobModel: require('../../models/operations/RouteOptimizationJob.model'),
  });
  return _fb;
}

// ── reference ──────────────────────────────────────────────────────

router.get(
  '/reference',
  authenticate,
  wrap((req, res) => {
    res.json({
      success: true,
      data: {
        jobStatuses: registry.JOB_STATUSES,
        terminalStatuses: registry.JOB_TERMINAL_STATUSES,
        transitions: registry.JOB_TRANSITIONS,
        pickupPriorities: registry.PICKUP_PRIORITIES,
        stopStatuses: registry.STOP_STATUSES,
        vehicleCapabilities: registry.VEHICLE_CAPABILITIES,
        defaultShifts: registry.DEFAULT_SHIFTS,
        defaults: {
          minutesPerStop: registry.DEFAULT_MINUTES_PER_STOP,
          baseSpeedKmh: registry.DEFAULT_BASE_SPEED_KMH,
          maxStopsPerVehicle: registry.DEFAULT_MAX_STOPS_PER_VEHICLE,
        },
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
    query('status').optional().isIn(registry.JOB_STATUSES),
    query('limit').optional().isInt({ min: 1, max: 500 }),
    query('skip').optional().isInt({ min: 0 }),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const rows = await getService().list({
        branchId: req.query.branchId,
        status: req.query.status,
        shift: req.query.shift,
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
      if (!doc) return res.status(404).json({ success: false, error: 'Job not found' });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

// ── create + request + optimize ───────────────────────────────────

router.post(
  '/',
  authenticate,
  authorize(['admin', 'ops_manager', 'fleet_manager', 'dispatcher']),
  [
    body('branchId').isMongoId(),
    body('runDate').isISO8601(),
    body('departureTime').isISO8601(),
    body('shift').optional().isString(),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().createJob(req.body, { actorId: req.user?._id });
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/:id/requests',
  authenticate,
  authorize(['admin', 'ops_manager', 'fleet_manager', 'dispatcher']),
  [
    param('id').isMongoId(),
    body('pickupAddress').optional().isString(),
    body('beneficiaryId').optional().isMongoId(),
    body('priority').optional().isIn(registry.PICKUP_PRIORITIES),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().addRequest(req.params.id, req.body, {
        actorId: req.user?._id,
      });
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/:id/optimize',
  authenticate,
  authorize(['admin', 'ops_manager', 'fleet_manager', 'dispatcher']),
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().optimize(req.params.id, {
        actorId: req.user?._id,
        minutesPerStop: req.body?.minutesPerStop,
        maxStopsPerVehicle: req.body?.maxStopsPerVehicle,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

// ── assignments ───────────────────────────────────────────────────

router.post(
  '/:id/assign-vehicle',
  authenticate,
  authorize(['admin', 'ops_manager', 'fleet_manager', 'dispatcher']),
  [param('id').isMongoId(), body('vehicleId').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().assignVehicle(req.params.id, {
        vehicleId: req.body.vehicleId,
        registration: req.body.registration,
        capabilities: req.body.capabilities || [],
        actorId: req.user?._id,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/:id/assign-driver',
  authenticate,
  authorize(['admin', 'ops_manager', 'fleet_manager', 'dispatcher']),
  [param('id').isMongoId(), body('driverId').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().assignDriver(req.params.id, {
        driverId: req.body.driverId,
        nameSnapshot: req.body.nameSnapshot,
        actorId: req.user?._id,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

// ── lifecycle ─────────────────────────────────────────────────────

router.post(
  '/:id/publish',
  authenticate,
  authorize(['admin', 'ops_manager', 'fleet_manager', 'dispatcher']),
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().publish(req.params.id, { actorId: req.user?._id });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/:id/start',
  authenticate,
  authorize(['admin', 'ops_manager', 'fleet_manager', 'dispatcher', 'driver']),
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().start(req.params.id, {
        actorId: req.user?._id,
        tripId: req.body?.tripId,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/:id/stops/:stopId/status',
  authenticate,
  authorize(['admin', 'ops_manager', 'fleet_manager', 'dispatcher', 'driver']),
  [
    param('id').isMongoId(),
    param('stopId').isMongoId(),
    body('toStatus').isIn(registry.STOP_STATUSES),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const result = await getService().recordStopStatus(req.params.id, req.params.stopId, {
        toStatus: req.body.toStatus,
        when: req.body.when,
        notes: req.body.notes,
        actorId: req.user?._id,
      });
      res.json({ success: true, data: result });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/:id/complete',
  authenticate,
  authorize(['admin', 'ops_manager', 'fleet_manager', 'dispatcher']),
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().complete(req.params.id, { actorId: req.user?._id });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/:id/cancel',
  authenticate,
  authorize(['admin', 'ops_manager', 'fleet_manager']),
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

module.exports = router;

'use strict';

/**
 * facility.routes.js — Phase 16 Commit 3 (4.0.68).
 *
 * HTTP surface for Facility CRUD + FacilityInspection lifecycle.
 *
 * Mounted by `_registry.js` at:
 *   /api/ops/facilities      and  /api/v1/ops/facilities
 *   /api/ops/inspections     and  /api/v1/ops/inspections
 *   (both served by this single router at different sub-paths)
 *
 * Response shape: `{ success: true, data }` | `{ success: false, error }`.
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');

const { authenticate, authorize } = require('../../middleware/auth');
const safeError = require('../../utils/safeError');
const registry = require('../../config/facility.registry');

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
    return res.status(409).json({ success: false, error: err.message });
  }
  if (err.code === 'MISSING_FIELD') {
    return res.status(422).json({
      success: false,
      error: err.message,
      fields: err.fields,
    });
  }
  return safeError(res, err);
}

// Late-binding singletons set by operationsBootstrap.
function getFacilityService() {
  return (
    require('../../startup/operationsBootstrap')._getFacilityService?.() ||
    _fallbackFacilityService()
  );
}
function getInspectionService() {
  return (
    require('../../startup/operationsBootstrap')._getFacilityInspectionService?.() ||
    _fallbackInspectionService()
  );
}

let _fsFallback = null;
function _fallbackFacilityService() {
  if (_fsFallback) return _fsFallback;
  const { createFacilityService } = require('../../services/operations/facility.service');
  const Facility = require('../../models/operations/Facility.model');
  const FacilityInspection = require('../../models/operations/FacilityInspection.model');
  _fsFallback = createFacilityService({
    facilityModel: Facility,
    inspectionModel: FacilityInspection,
  });
  return _fsFallback;
}

let _isFallback = null;
function _fallbackInspectionService() {
  if (_isFallback) return _isFallback;
  const { createFacilityInspectionService } = require('../../services/operations/facility.service');
  const Facility = require('../../models/operations/Facility.model');
  const FacilityInspection = require('../../models/operations/FacilityInspection.model');
  _isFallback = createFacilityInspectionService({
    inspectionModel: FacilityInspection,
    facilityModel: Facility,
  });
  return _isFallback;
}

// ── reference ──────────────────────────────────────────────────────

router.get(
  '/reference',
  authenticate,
  wrap((req, res) => {
    res.json({
      success: true,
      data: {
        facilityTypes: registry.FACILITY_TYPES,
        facilityStatuses: registry.FACILITY_STATUSES,
        ownershipTypes: registry.OWNERSHIP_TYPES,
        inspectionTypes: registry.INSPECTION_TYPES,
        inspectionStatuses: registry.INSPECTION_STATUSES,
        findingSeverities: registry.FINDING_SEVERITIES,
        findingStatuses: registry.FINDING_STATUSES,
      },
    });
  })
);

// ── Facility CRUD ─────────────────────────────────────────────────

router.get(
  '/',
  authenticate,
  [
    query('branchId').optional().isMongoId(),
    query('type').optional().isIn(registry.FACILITY_TYPES),
    query('status').optional().isIn(registry.FACILITY_STATUSES),
    query('limit').optional().isInt({ min: 1, max: 500 }),
    query('skip').optional().isInt({ min: 0 }),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const rows = await getFacilityService().list({
        branchId: req.query.branchId,
        type: req.query.type,
        status: req.query.status,
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
      const doc = await getFacilityService().findById(req.params.id);
      if (!doc) return res.status(404).json({ success: false, error: 'Facility not found' });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/',
  authenticate,
  authorize(['admin', 'ops_manager', 'facility_manager']),
  [
    body('code').isString().notEmpty(),
    body('nameAr').isString().notEmpty(),
    body('nameEn').isString().notEmpty(),
    body('branchId').isMongoId(),
    body('type').isIn(registry.FACILITY_TYPES),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getFacilityService().create(req.body, { actorId: req.user?._id });
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.patch(
  '/:id',
  authenticate,
  authorize(['admin', 'ops_manager', 'facility_manager']),
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getFacilityService().update(req.params.id, req.body, {
        actorId: req.user?._id,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.delete(
  '/:id',
  authenticate,
  authorize(['admin', 'ops_manager']),
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getFacilityService().softDelete(req.params.id);
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/:id/recompute-compliance',
  authenticate,
  authorize(['admin', 'ops_manager', 'facility_manager']),
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const snap = await getFacilityService().recomputeComplianceSnapshot(req.params.id);
      if (!snap) return res.status(404).json({ success: false, error: 'Facility not found' });
      res.json({ success: true, data: snap });
    } catch (err) {
      mapError(err, res);
    }
  })
);

// ── Inspection lifecycle ──────────────────────────────────────────

router.get(
  '/inspections/list',
  authenticate,
  [
    query('facilityId').optional().isMongoId(),
    query('branchId').optional().isMongoId(),
    query('type').optional().isIn(registry.INSPECTION_TYPE_CODES),
    query('status').optional().isIn(registry.INSPECTION_STATUSES),
    query('limit').optional().isInt({ min: 1, max: 500 }),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const rows = await getInspectionService().list({
        facilityId: req.query.facilityId,
        branchId: req.query.branchId,
        type: req.query.type,
        status: req.query.status,
        limit: req.query.limit ? Number(req.query.limit) : 100,
      });
      res.json({ success: true, data: rows });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/inspections',
  authenticate,
  authorize(['admin', 'ops_manager', 'facility_manager', 'inspector']),
  [
    body('facilityId').isMongoId(),
    body('type').isIn(registry.INSPECTION_TYPE_CODES),
    body('scheduledFor').optional().isISO8601(),
    body('inspectorId').optional().isMongoId(),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getInspectionService().schedule({
        facilityId: req.body.facilityId,
        type: req.body.type,
        scheduledFor: req.body.scheduledFor,
        inspectorId: req.body.inspectorId,
        actorId: req.user?._id,
      });
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/inspections/:id/start',
  authenticate,
  authorize(['admin', 'ops_manager', 'facility_manager', 'inspector']),
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getInspectionService().start(req.params.id, {
        actorId: req.user?._id,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/inspections/:id/findings',
  authenticate,
  authorize(['admin', 'ops_manager', 'facility_manager', 'inspector']),
  [
    param('id').isMongoId(),
    body('description').isString().notEmpty(),
    body('severity').isIn(registry.FINDING_SEVERITIES),
    body('assetId').optional().isMongoId(),
    body('spawnWorkOrder').optional().isBoolean(),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const result = await getInspectionService().raiseFinding(
        req.params.id,
        {
          description: req.body.description,
          severity: req.body.severity,
          code: req.body.code,
          location: req.body.location,
          recommendation: req.body.recommendation,
          photos: req.body.photos,
        },
        {
          actorId: req.user?._id,
          spawnWorkOrder: req.body.spawnWorkOrder ?? null,
          assetId: req.body.assetId,
        }
      );
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.patch(
  '/inspections/:id/findings/:findingId',
  authenticate,
  authorize(['admin', 'ops_manager', 'facility_manager', 'inspector']),
  [
    param('id').isMongoId(),
    param('findingId').isMongoId(),
    body('toStatus').isIn(registry.FINDING_STATUSES),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const result = await getInspectionService().updateFindingStatus(
        req.params.id,
        req.params.findingId,
        {
          toStatus: req.body.toStatus,
          closureNotes: req.body.closureNotes,
          actorId: req.user?._id,
        }
      );
      res.json({ success: true, data: result });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/inspections/:id/complete',
  authenticate,
  authorize(['admin', 'ops_manager', 'facility_manager', 'inspector']),
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getInspectionService().complete(req.params.id, {
        summary: req.body.summary,
        actorId: req.user?._id,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/inspections/:id/close',
  authenticate,
  authorize(['admin', 'ops_manager', 'facility_manager']),
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getInspectionService().close(req.params.id, {
        actorId: req.user?._id,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

module.exports = router;

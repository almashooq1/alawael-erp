'use strict';

/**
 * qualityControls.routes.js — Phase 13 Commit 4 (4.0.58).
 *
 * HTTP surface for the Quality Control Library.
 *
 * Mounted by `_registry.js` at `/api/quality-controls` and
 * `/api/v1/quality-controls` via dualMount.
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');

const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const safeError = require('../utils/safeError');
const { getDefault: getService } = require('../services/quality/controlLibrary.service');
const registry = require('../config/control-library.registry');

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
  if (err.code === 'NOT_FOUND') return res.status(404).json({ success: false, error: err.message });
  return safeError(res, err);
}

// ── catalogue (pure registry) ──────────────────────────────────────

router.get(
  '/catalogue',
  authenticate,
  wrap((req, res) => {
    res.json({
      success: true,
      data: {
        total: registry.CONTROL_LIBRARY.length,
        summary: registry.summarizeByFramework(),
        controls: registry.CONTROL_LIBRARY,
      },
    });
  })
);

router.get(
  '/reference',
  authenticate,
  wrap((req, res) => {
    res.json({
      success: true,
      data: {
        categories: registry.CONTROL_CATEGORIES,
        types: registry.CONTROL_TYPES,
        frequencies: registry.CONTROL_FREQUENCIES,
        criticality: registry.CONTROL_CRITICALITY,
        testMethods: registry.CONTROL_TEST_METHODS,
        statuses: registry.CONTROL_STATUSES,
        outcomes: registry.TEST_RESULT_OUTCOMES,
      },
    });
  })
);

// ── coverage (for dashboards) ─────────────────────────────────────

router.get(
  '/coverage',
  authenticate,
  requireBranchAccess,
  wrap(async (req, res) => {
    try {
      const data = await getService().getCoverage({
        branchId: req.query.branchId,
        tenantId: req.query.tenantId,
      });
      res.json({ success: true, data });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

// ── list / get ─────────────────────────────────────────────────────

router.get(
  '/',
  authenticate,
  requireBranchAccess,
  [
    query('status').optional().isIn(registry.CONTROL_STATUSES),
    query('category').optional().isIn(registry.CONTROL_CATEGORIES),
    query('criticality').optional().isIn(registry.CONTROL_CRITICALITY),
    query('lastResult').optional().isIn(registry.TEST_RESULT_OUTCOMES),
    query('limit').optional().isInt({ min: 1, max: 500 }),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const data = await getService().list({
        branchId: req.query.branchId,
        tenantId: req.query.tenantId,
        status: req.query.status,
        category: req.query.category,
        criticality: req.query.criticality,
        framework: req.query.framework,
        lastResult: req.query.lastResult,
        overdueOnly: req.query.overdueOnly === 'true',
        limit: req.query.limit,
      });
      res.json({ success: true, data });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.get(
  '/:controlId',
  authenticate,
  requireBranchAccess,
  [param('controlId').isString().notEmpty()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().findByControlId(req.params.controlId, {
        tenantId: req.query.tenantId,
        branchId: req.query.branchId,
      });
      if (!doc) return res.status(404).json({ success: false, error: 'not found' });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

// ── seeding ────────────────────────────────────────────────────────

router.post(
  '/seed',
  authenticate,
  requireBranchAccess,
  authorize('admin', 'compliance_officer'),
  [body('branchId').optional().isMongoId(), body('tenantId').optional().isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const data = await getService().seed({
        tenantId: req.body.tenantId || null,
        branchId: req.body.branchId || null,
      });
      res.json({ success: true, data });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

// ── test runs ──────────────────────────────────────────────────────

router.post(
  '/:controlId/test-runs',
  authenticate,
  requireBranchAccess,
  authorize('admin', 'quality_manager', 'compliance_officer', 'auditor'),
  [
    param('controlId').isString().notEmpty(),
    body('outcome').isIn(registry.TEST_RESULT_OUTCOMES),
    body('score').optional().isFloat({ min: 0, max: 100 }),
    body('narrative').optional().isString(),
    body('evidenceIds').optional().isArray(),
    body('gaps').optional().isArray(),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const svc = getService();
      const selector = {
        controlId: req.params.controlId,
        tenantId: req.body.tenantId || null,
        branchId: req.body.branchId || null,
      };
      const doc = await svc.recordTestRun(selector, req.body, req.user._id);
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.post(
  '/:controlId/auto-check',
  authenticate,
  requireBranchAccess,
  authorize('admin', 'quality_manager', 'compliance_officer'),
  [param('controlId').isString().notEmpty()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const svc = getService();
      const selector = {
        controlId: req.params.controlId,
        tenantId: req.body.tenantId || null,
        branchId: req.body.branchId || null,
      };
      const doc = await svc.runAutoCheck(selector, req.body.ctx || {}, req.user._id);
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

// ── lifecycle ──────────────────────────────────────────────────────

router.post(
  '/:controlId/deprecate',
  authenticate,
  requireBranchAccess,
  authorize('admin', 'compliance_officer'),
  [param('controlId').isString().notEmpty(), body('reason').isString().trim().notEmpty()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const svc = getService();
      const selector = {
        controlId: req.params.controlId,
        tenantId: req.body.tenantId || null,
        branchId: req.body.branchId || null,
      };
      const doc = await svc.deprecate(selector, req.body.reason, req.user._id);
      res.json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.post(
  '/:controlId/not-applicable',
  authenticate,
  requireBranchAccess,
  authorize('admin', 'compliance_officer'),
  [param('controlId').isString().notEmpty(), body('reason').isString().trim().notEmpty()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const svc = getService();
      const selector = {
        controlId: req.params.controlId,
        tenantId: req.body.tenantId || null,
        branchId: req.body.branchId || null,
      };
      const doc = await svc.markNotApplicable(selector, req.body.reason, req.user._id);
      res.json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.post(
  '/:controlId/reactivate',
  authenticate,
  requireBranchAccess,
  authorize('admin', 'compliance_officer'),
  [param('controlId').isString().notEmpty()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const svc = getService();
      const selector = {
        controlId: req.params.controlId,
        tenantId: req.body.tenantId || null,
        branchId: req.body.branchId || null,
      };
      const doc = await svc.reactivate(selector, req.user._id);
      res.json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

module.exports = router;

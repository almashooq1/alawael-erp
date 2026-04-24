'use strict';

/**
 * care/retention.routes.js — Phase 17 Commit 8 (4.0.90).
 *
 * Mounted at /api/care/retention (and /api/v1/care/retention).
 *
 *   GET  /reference                           → vocab
 *   POST /assess/:beneficiaryId               → force reassessment
 *   POST /compute/:beneficiaryId              → dry-run (no persist)
 *   GET  /:beneficiaryId/latest               → latest snapshot
 *   GET  /:beneficiaryId/trend                → history
 *   GET  /high-risk                           → branch-wide dashboard
 *   POST /:id/acknowledge                     → mark reviewed
 *   POST /sweep                               → batch assess
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');

const { authenticate, authorize } = require('../../middleware/auth');
const safeError = require('../../utils/safeError');
const registry = require('../../config/care/retention.registry');

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
  if (err.code === 'NOT_FOUND') return res.status(404).json({ success: false, error: err.message });
  if (err.code === 'MISSING_FIELD') {
    return res.status(422).json({ success: false, error: err.message, fields: err.fields });
  }
  return safeError(res, err);
}

function getService() {
  return require('../../startup/careBootstrap')._getRetentionService?.() || null;
}

function svcOrFail(res) {
  const svc = getService();
  if (!svc) {
    res.status(503).json({
      success: false,
      error: 'Retention service not wired (care bootstrap incomplete)',
    });
    return null;
  }
  return svc;
}

const managerRoles = ['admin', 'social_manager', 'care_manager', 'retention_manager'];
const viewRoles = [
  ...managerRoles,
  'social_worker',
  'social_supervisor',
  'psychologist',
  'care_coordinator',
];

// ── reference ─────────────────────────────────────────────────────

router.get(
  '/reference',
  authenticate,
  wrap((req, res) => {
    res.json({
      success: true,
      data: {
        riskBands: registry.RISK_BANDS,
        riskFactors: registry.RISK_FACTORS,
        interventionTypes: registry.INTERVENTION_TYPES,
        bandInterventionMatrix: registry.BAND_INTERVENTION_MATRIX,
        thresholds: registry.THRESHOLDS,
      },
    });
  })
);

// ── assess / compute (dry run) ────────────────────────────────────

router.post(
  '/assess/:beneficiaryId',
  authenticate,
  authorize(managerRoles),
  [param('beneficiaryId').isMongoId(), body('force').optional().isBoolean().toBoolean()],
  handleValidation,
  wrap(async (req, res) => {
    const svc = svcOrFail(res);
    if (!svc) return;
    try {
      const doc = await svc.assess(req.params.beneficiaryId, {
        force: req.body?.force === true,
        triggeredBy: 'manual',
        actorId: req.user?._id,
      });
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/compute/:beneficiaryId',
  authenticate,
  authorize(viewRoles),
  [param('beneficiaryId').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    const svc = svcOrFail(res);
    if (!svc) return;
    try {
      const computed = await svc.computeRiskScore(req.params.beneficiaryId);
      res.json({ success: true, data: computed });
    } catch (err) {
      mapError(err, res);
    }
  })
);

// ── reads ─────────────────────────────────────────────────────────

router.get(
  '/high-risk',
  authenticate,
  authorize(viewRoles),
  [
    query('branchId').optional().isMongoId(),
    query('band').optional().isIn(registry.RISK_BAND_CODES),
    query('acknowledged').optional().isBoolean().toBoolean(),
    query('limit').optional().isInt({ min: 1, max: 500 }),
  ],
  handleValidation,
  wrap(async (req, res) => {
    const svc = svcOrFail(res);
    if (!svc) return;
    try {
      const rows = await svc.listHighRisk({
        branchId: req.query.branchId,
        band: req.query.band,
        acknowledged:
          req.query.acknowledged === true ? true : req.query.acknowledged === false ? false : null,
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
  '/:beneficiaryId/latest',
  authenticate,
  authorize(viewRoles),
  [param('beneficiaryId').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    const svc = svcOrFail(res);
    if (!svc) return;
    try {
      const doc = await svc.getLatest(req.params.beneficiaryId);
      if (!doc)
        return res
          .status(404)
          .json({ success: false, error: 'No retention assessment for this beneficiary' });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.get(
  '/:beneficiaryId/trend',
  authenticate,
  authorize(viewRoles),
  [param('beneficiaryId').isMongoId(), query('limit').optional().isInt({ min: 1, max: 100 })],
  handleValidation,
  wrap(async (req, res) => {
    const svc = svcOrFail(res);
    if (!svc) return;
    try {
      const data = await svc.getTrend(req.params.beneficiaryId, {
        limit: req.query.limit ? Number(req.query.limit) : 20,
      });
      res.json({ success: true, data });
    } catch (err) {
      mapError(err, res);
    }
  })
);

// ── acknowledge ───────────────────────────────────────────────────

router.post(
  '/:id/acknowledge',
  authenticate,
  authorize(managerRoles),
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    const svc = svcOrFail(res);
    if (!svc) return;
    try {
      const doc = await svc.acknowledge(req.params.id, {
        actorId: req.user?._id,
        notes: req.body?.notes,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

// ── sweep ─────────────────────────────────────────────────────────

router.post(
  '/sweep',
  authenticate,
  authorize(['admin', 'retention_manager']),
  [
    body('branchId').optional().isMongoId(),
    body('beneficiaryIds').optional().isArray(),
    body('limit').optional().isInt({ min: 1, max: 1000 }),
  ],
  handleValidation,
  wrap(async (req, res) => {
    const svc = svcOrFail(res);
    if (!svc) return;
    try {
      const result = await svc.sweep({
        branchId: req.body.branchId,
        beneficiaryIds: req.body.beneficiaryIds,
        limit: req.body.limit ? Number(req.body.limit) : 100,
        triggeredBy: 'manual',
        actorId: req.user?._id,
      });
      res.json({ success: true, data: result });
    } catch (err) {
      mapError(err, res);
    }
  })
);

module.exports = router;

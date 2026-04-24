'use strict';

/**
 * care/welfare.routes.js — Phase 17 Commit 4 (4.0.86).
 * Mounted at /api/care/welfare and /api/v1/care/welfare.
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');

const { authenticate, authorize } = require('../../middleware/auth');
const safeError = require('../../utils/safeError');
const registry = require('../../config/care/welfare.registry');

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
  if (err.code === 'ILLEGAL_TRANSITION') {
    return res.status(409).json({ success: false, error: err.message, from: err.from, to: err.to });
  }
  if (err.code === 'MISSING_FIELD') {
    return res.status(422).json({ success: false, error: err.message, fields: err.fields });
  }
  if (err.code === 'CONFLICT') return res.status(409).json({ success: false, error: err.message });
  return safeError(res, err);
}

function getService() {
  return require('../../startup/careBootstrap')._getWelfareService?.() || _fallback();
}

let _fb = null;
function _fallback() {
  if (_fb) return _fb;
  const { createWelfareService } = require('../../services/care/welfare.service');
  _fb = createWelfareService({
    applicationModel: require('../../models/care/WelfareApplication.model'),
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
        applicationTypes: registry.APPLICATION_TYPES,
        targetAgencies: registry.TARGET_AGENCIES,
        applicationStatuses: registry.APPLICATION_STATUSES,
        terminalStatuses: registry.APPLICATION_TERMINAL_STATUSES,
        pauseStatuses: registry.APPLICATION_PAUSE_STATUSES,
        transitions: registry.APPLICATION_TRANSITIONS,
        frequencies: registry.DISBURSEMENT_FREQUENCIES,
        cancellationReasons: registry.CANCELLATION_REASONS,
      },
    });
  })
);

router.get(
  '/analytics',
  authenticate,
  [
    query('branchId').optional().isMongoId(),
    query('windowDays').optional().isInt({ min: 1, max: 365 }),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const data = await getService().getAnalytics({
        branchId: req.query.branchId,
        windowDays: req.query.windowDays ? Number(req.query.windowDays) : 90,
      });
      res.json({ success: true, data });
    } catch (err) {
      mapError(err, res);
    }
  })
);

// ── list / get ────────────────────────────────────────────────────

router.get(
  '/',
  authenticate,
  [
    query('branchId').optional().isMongoId(),
    query('beneficiaryId').optional().isMongoId(),
    query('caseId').optional().isMongoId(),
    query('status').optional().isIn(registry.APPLICATION_STATUSES),
    query('applicationType').optional().isIn(registry.APPLICATION_TYPES),
    query('targetAgency').optional().isIn(registry.TARGET_AGENCIES),
    query('limit').optional().isInt({ min: 1, max: 500 }),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const rows = await getService().list({
        branchId: req.query.branchId,
        beneficiaryId: req.query.beneficiaryId,
        caseId: req.query.caseId,
        status: req.query.status,
        applicationType: req.query.applicationType,
        targetAgency: req.query.targetAgency,
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
      if (!doc) return res.status(404).json({ success: false, error: 'Application not found' });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.get(
  '/beneficiary/:beneficiaryId/history',
  authenticate,
  [param('beneficiaryId').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const rows = await getService().beneficiaryHistory(req.params.beneficiaryId);
      res.json({ success: true, data: rows });
    } catch (err) {
      mapError(err, res);
    }
  })
);

// ── lifecycle ────────────────────────────────────────────────────

router.post(
  '/',
  authenticate,
  authorize(['admin', 'social_worker', 'social_supervisor', 'social_manager']),
  [
    body('beneficiaryId').isMongoId(),
    body('applicationType').isIn(registry.APPLICATION_TYPES),
    body('targetAgency').isIn(registry.TARGET_AGENCIES),
    body('caseId').optional().isMongoId(),
    body('branchId').optional().isMongoId(),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().createApplication(req.body, {
        actorId: req.user?._id,
      });
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/:id/submit',
  authenticate,
  authorize(['admin', 'social_worker', 'social_supervisor']),
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().submitApplication(req.params.id, {
        submittedAt: req.body?.submittedAt,
        actorId: req.user?._id,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/:id/transition',
  authenticate,
  authorize(['admin', 'social_worker', 'social_supervisor', 'social_manager']),
  [param('id').isMongoId(), body('toStatus').isIn(registry.APPLICATION_STATUSES)],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().transitionApplication(req.params.id, req.body.toStatus, {
        actorId: req.user?._id,
        notes: req.body.notes,
        patch: req.body.patch || {},
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/:id/info-request',
  authenticate,
  authorize(['admin', 'social_worker', 'social_supervisor']),
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().recordInfoRequest(req.params.id, {
        notes: req.body?.notes,
        actorId: req.user?._id,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/:id/resume',
  authenticate,
  authorize(['admin', 'social_worker', 'social_supervisor']),
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().resumeFromInfoRequest(req.params.id, {
        actorId: req.user?._id,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/:id/approve',
  authenticate,
  authorize(['admin', 'social_worker', 'social_supervisor']),
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().approveApplication(req.params.id, {
        approvedAt: req.body?.approvedAt,
        approvedAmount: req.body?.approvedAmount,
        partial: !!req.body?.partial,
        actorId: req.user?._id,
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
  authorize(['admin', 'social_worker', 'social_supervisor']),
  [param('id').isMongoId(), body('rejectionReason').isString().notEmpty()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().rejectApplication(req.params.id, {
        rejectionReason: req.body.rejectionReason,
        rejectionNotes: req.body.rejectionNotes,
        actorId: req.user?._id,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/:id/appeal',
  authenticate,
  authorize(['admin', 'social_worker', 'social_supervisor', 'social_manager']),
  [param('id').isMongoId(), body('reason').isString().notEmpty()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().fileAppeal(req.params.id, {
        reason: req.body.reason,
        supportingDocuments: req.body.supportingDocuments || [],
        actorId: req.user?._id,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/:id/appeals/:appealId/decide',
  authenticate,
  authorize(['admin', 'social_worker', 'social_supervisor', 'social_manager']),
  [
    param('id').isMongoId(),
    param('appealId').isMongoId(),
    body('outcome').isIn(['approved', 'rejected']),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().decideAppeal(req.params.id, req.params.appealId, {
        outcome: req.body.outcome,
        decisionNotes: req.body.decisionNotes,
        approvedAt: req.body.approvedAt,
        rejectionReason: req.body.rejectionReason,
        actorId: req.user?._id,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/:id/disbursements',
  authenticate,
  authorize(['admin', 'social_worker', 'social_supervisor', 'finance_manager']),
  [param('id').isMongoId(), body('amount').isFloat({ gt: 0 })],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().recordDisbursement(req.params.id, {
        amount: req.body.amount,
        disbursedAt: req.body.disbursedAt,
        receiptReference: req.body.receiptReference,
        notes: req.body.notes,
        actorId: req.user?._id,
      });
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/:id/close',
  authenticate,
  authorize(['admin', 'social_worker', 'social_supervisor', 'social_manager']),
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().closeApplication(req.params.id, {
        notes: req.body?.notes,
        actorId: req.user?._id,
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
  authorize(['admin', 'social_worker', 'social_supervisor', 'social_manager']),
  [param('id').isMongoId(), body('cancellationReason').isIn(registry.CANCELLATION_REASONS)],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().cancelApplication(req.params.id, {
        cancellationReason: req.body.cancellationReason,
        actorId: req.user?._id,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/:id/documents',
  authenticate,
  authorize(['admin', 'social_worker', 'social_supervisor']),
  [
    param('id').isMongoId(),
    body('kind').isString().notEmpty(),
    body('fileName').isString().notEmpty(),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().addDocument(req.params.id, req.body, {
        actorId: req.user?._id,
      });
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

module.exports = router;

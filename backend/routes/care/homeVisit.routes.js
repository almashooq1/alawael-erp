'use strict';

/**
 * care/homeVisit.routes.js — Phase 17 Commit 3 (4.0.85).
 *
 * HTTP surface for the home-visit subsystem. Mounted at
 * `/api/care/home-visits` and `/api/v1/care/home-visits`.
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');

const { authenticate, authorize } = require('../../middleware/auth');
const safeError = require('../../utils/safeError');
const registry = require('../../config/care/homeVisit.registry');

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
  return require('../../startup/careBootstrap')._getHomeVisitService?.() || _fallback();
}

let _fb = null;
function _fallback() {
  if (_fb) return _fb;
  const { createHomeVisitService } = require('../../services/care/homeVisit.service');
  _fb = createHomeVisitService({
    visitModel: require('../../models/care/HomeVisit.model'),
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
        visitTypes: registry.VISIT_TYPES,
        visitStatuses: registry.VISIT_STATUSES,
        terminalStatuses: registry.VISIT_TERMINAL_STATUSES,
        transitions: registry.VISIT_TRANSITIONS,
        observationDomains: registry.OBSERVATION_DOMAINS,
        observationConcernLevels: registry.OBSERVATION_CONCERN_LEVELS,
        actionItemPriorities: registry.ACTION_ITEM_PRIORITIES,
        actionItemStatuses: registry.ACTION_ITEM_STATUSES,
        cancellationReasons: registry.CANCELLATION_REASONS,
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
    query('caseId').optional().isMongoId(),
    query('beneficiaryId').optional().isMongoId(),
    query('assignedWorkerId').optional().isMongoId(),
    query('status').optional().isIn(registry.VISIT_STATUSES),
    query('visitType').optional().isIn(registry.VISIT_TYPES),
    query('fromDate').optional().isISO8601(),
    query('toDate').optional().isISO8601(),
    query('limit').optional().isInt({ min: 1, max: 500 }),
    query('skip').optional().isInt({ min: 0 }),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const rows = await getService().list({
        branchId: req.query.branchId,
        caseId: req.query.caseId,
        beneficiaryId: req.query.beneficiaryId,
        assignedWorkerId: req.query.assignedWorkerId,
        status: req.query.status,
        visitType: req.query.visitType,
        fromDate: req.query.fromDate,
        toDate: req.query.toDate,
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
      if (!doc) return res.status(404).json({ success: false, error: 'Visit not found' });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

// ── schedule ─────────────────────────────────────────────────────

router.post(
  '/',
  authenticate,
  authorize(['admin', 'social_worker', 'social_supervisor', 'social_manager']),
  [
    body('visitType').isIn(registry.VISIT_TYPES),
    body('scheduledFor').isISO8601(),
    body('assignedWorkerId').isMongoId(),
    body('caseId').optional().isMongoId(),
    body('beneficiaryId').optional().isMongoId(),
    body('branchId').optional().isMongoId(),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().scheduleVisit(req.body, { actorId: req.user?._id });
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

// ── lifecycle transitions ────────────────────────────────────────

router.post(
  '/:id/en-route',
  authenticate,
  authorize(['admin', 'social_worker', 'social_supervisor']),
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().markEnRoute(req.params.id, { actorId: req.user?._id });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/:id/arrived',
  authenticate,
  authorize(['admin', 'social_worker', 'social_supervisor']),
  [param('id').isMongoId(), body('coordinates').optional().isObject()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().markArrived(req.params.id, {
        actorId: req.user?._id,
        coordinates: req.body?.coordinates,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/:id/observations',
  authenticate,
  authorize(['admin', 'social_worker', 'social_supervisor']),
  [
    param('id').isMongoId(),
    body('domain').isIn(registry.OBSERVATION_DOMAIN_CODES),
    body('concernLevel').optional().isIn(registry.OBSERVATION_CONCERN_LEVELS),
    body('notes').optional().isString(),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().addObservation(req.params.id, req.body, {
        actorId: req.user?._id,
      });
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/:id/photos',
  authenticate,
  authorize(['admin', 'social_worker', 'social_supervisor']),
  [param('id').isMongoId(), body('url').isURL()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().addPhoto(req.params.id, req.body, {
        actorId: req.user?._id,
      });
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/:id/action-items',
  authenticate,
  authorize(['admin', 'social_worker', 'social_supervisor']),
  [
    param('id').isMongoId(),
    body('title').isString().notEmpty(),
    body('priority').optional().isIn(registry.ACTION_ITEM_PRIORITIES),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().addActionItem(req.params.id, req.body, {
        actorId: req.user?._id,
      });
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.patch(
  '/:id/action-items/:itemId',
  authenticate,
  authorize(['admin', 'social_worker', 'social_supervisor']),
  [
    param('id').isMongoId(),
    param('itemId').isMongoId(),
    body('toStatus').isIn(registry.ACTION_ITEM_STATUSES),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().updateActionItem(req.params.id, req.params.itemId, {
        toStatus: req.body.toStatus,
        outcome: req.body.outcome,
        actorId: req.user?._id,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/:id/complete',
  authenticate,
  authorize(['admin', 'social_worker', 'social_supervisor']),
  [
    param('id').isMongoId(),
    body('visitSummary').isString().notEmpty(),
    body('overallConcernLevel').optional().isIn(registry.OBSERVATION_CONCERN_LEVELS),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().completeVisit(req.params.id, {
        visitSummary: req.body.visitSummary,
        overallConcernLevel: req.body.overallConcernLevel,
        departureCoordinates: req.body.departureCoordinates,
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
      const doc = await getService().cancelVisit(req.params.id, {
        cancellationReason: req.body.cancellationReason,
        cancellationNotes: req.body.cancellationNotes,
        actorId: req.user?._id,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/:id/no-answer',
  authenticate,
  authorize(['admin', 'social_worker', 'social_supervisor']),
  [param('id').isMongoId(), body('noAnswerNotes').isString().notEmpty()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().markNoAnswer(req.params.id, {
        noAnswerNotes: req.body.noAnswerNotes,
        actorId: req.user?._id,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/:id/reschedule',
  authenticate,
  authorize(['admin', 'social_worker', 'social_supervisor', 'social_manager']),
  [param('id').isMongoId(), body('rescheduledTo').isISO8601()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const result = await getService().rescheduleVisit(req.params.id, {
        rescheduledTo: req.body.rescheduledTo,
        reason: req.body.reason,
        actorId: req.user?._id,
      });
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      mapError(err, res);
    }
  })
);

// ── worker schedule ──────────────────────────────────────────────

router.get(
  '/workers/:userId/schedule',
  authenticate,
  [
    param('userId').isMongoId(),
    query('fromDate').optional().isISO8601(),
    query('toDate').optional().isISO8601(),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const rows = await getService().workerSchedule(req.params.userId, {
        fromDate: req.query.fromDate,
        toDate: req.query.toDate,
      });
      res.json({ success: true, data: rows });
    } catch (err) {
      mapError(err, res);
    }
  })
);

module.exports = router;

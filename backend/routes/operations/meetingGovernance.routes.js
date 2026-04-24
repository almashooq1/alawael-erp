'use strict';

/**
 * meetingGovernance.routes.js — Phase 16 Commit 6 (4.0.71).
 *
 * HTTP surface for the meeting-governance subsystem.
 *
 * Mounted at /api/ops/meeting-governance and
 * /api/v1/ops/meeting-governance.
 *
 * Endpoints:
 *   GET  /reference                           — registry snapshot
 *   POST /meetings/:id/end                    — flip meeting → completed, start minutes SLA
 *   POST /meetings/:id/publish-minutes        — resolve minutes SLA
 *   POST /meetings/:id/decisions              — assign a new decision
 *   GET  /decisions                           — list (filters)
 *   GET  /decisions/:id                       — detail
 *   POST /decisions/:id/transition            — status-machine transition
 *   GET  /follow-up                           — cross-meeting follow-up board
 *   POST /sweep-overdue                       — admin: run overdue sweep now
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');

const { authenticate, authorize } = require('../../middleware/auth');
const safeError = require('../../utils/safeError');
const registry = require('../../config/meetingGovernance.registry');

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
    return res.status(409).json({
      success: false,
      error: err.message,
      from: err.from,
      to: err.to,
    });
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
    require('../../startup/operationsBootstrap')._getMeetingGovernanceService?.() || _fallback()
  );
}

let _fb = null;
function _fallback() {
  if (_fb) return _fb;
  const {
    createMeetingGovernanceService,
  } = require('../../services/operations/meetingGovernance.service');
  _fb = createMeetingGovernanceService({
    meetingModel: require('../../models/Meeting'),
    decisionModel: require('../../models/operations/MeetingDecision.model'),
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
        decisionTypes: registry.DECISION_TYPES,
        decisionStatuses: registry.DECISION_STATUSES,
        terminalStatuses: registry.TERMINAL_STATUSES,
        pauseStatuses: registry.PAUSE_STATUSES,
        priorities: registry.PRIORITIES,
        transitions: registry.DECISION_TRANSITIONS,
      },
    });
  })
);

// ── meeting lifecycle ─────────────────────────────────────────────

router.post(
  '/meetings/:id/end',
  authenticate,
  authorize(['admin', 'ops_manager', 'meeting_chair', 'meeting_secretary']),
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().endMeeting(req.params.id, {
        actorId: req.user?._id,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/meetings/:id/publish-minutes',
  authenticate,
  authorize(['admin', 'ops_manager', 'meeting_secretary']),
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().publishMinutes(req.params.id, {
        actorId: req.user?._id,
        minutesContent: req.body?.minutesContent || null,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/meetings/:id/decisions',
  authenticate,
  authorize(['admin', 'ops_manager', 'meeting_chair', 'meeting_secretary']),
  [
    param('id').isMongoId(),
    body('title').isString().notEmpty(),
    body('ownerUserId').isMongoId(),
    body('priority').optional().isIn(registry.PRIORITIES),
    body('type').optional().isIn(registry.DECISION_TYPES),
    body('dueDate').optional().isISO8601(),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().assignDecision(req.params.id, req.body, {
        actorId: req.user?._id,
      });
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

// ── decisions CRUD + transition ───────────────────────────────────

router.get(
  '/decisions',
  authenticate,
  [
    query('meetingId').optional().isMongoId(),
    query('ownerUserId').optional().isMongoId(),
    query('branchId').optional().isMongoId(),
    query('status').optional().isIn(registry.DECISION_STATUSES),
    query('priority').optional().isIn(registry.PRIORITIES),
    query('limit').optional().isInt({ min: 1, max: 500 }),
    query('skip').optional().isInt({ min: 0 }),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const rows = await getService().listDecisions({
        meetingId: req.query.meetingId,
        ownerUserId: req.query.ownerUserId,
        branchId: req.query.branchId,
        status: req.query.status,
        priority: req.query.priority,
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
  '/decisions/:id',
  authenticate,
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().findDecisionById(req.params.id);
      if (!doc) return res.status(404).json({ success: false, error: 'Decision not found' });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/decisions/:id/transition',
  authenticate,
  authorize([
    'admin',
    'ops_manager',
    'meeting_chair',
    'meeting_secretary',
    'decision_owner',
    'department_head',
    'staff',
  ]),
  [
    param('id').isMongoId(),
    body('toStatus').isIn(registry.DECISION_STATUSES),
    body('notes').optional().isString(),
    body('patch').optional().isObject(),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().updateDecisionStatus(req.params.id, req.body.toStatus, {
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

// ── follow-up board ───────────────────────────────────────────────

router.get(
  '/follow-up',
  authenticate,
  [
    query('ownerUserId').optional().isMongoId(),
    query('branchId').optional().isMongoId(),
    query('overdueOnly').optional().isBoolean(),
    query('limit').optional().isInt({ min: 1, max: 500 }),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const board = await getService().getFollowUpBoard({
        ownerUserId: req.query.ownerUserId,
        branchId: req.query.branchId,
        includeOverdueOnly: req.query.overdueOnly === 'true',
        limit: req.query.limit ? Number(req.query.limit) : 100,
      });
      res.json({ success: true, data: board });
    } catch (err) {
      mapError(err, res);
    }
  })
);

// ── admin: sweep overdue ──────────────────────────────────────────

router.post(
  '/sweep-overdue',
  authenticate,
  authorize(['admin', 'ops_manager']),
  wrap(async (req, res) => {
    try {
      const report = await getService().sweepOverdue();
      res.json({ success: true, data: report });
    } catch (err) {
      mapError(err, res);
    }
  })
);

module.exports = router;

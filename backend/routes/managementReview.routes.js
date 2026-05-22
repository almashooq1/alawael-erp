'use strict';

/**
 * managementReview.routes.js — Phase 13 Commit 1 (4.0.55).
 *
 * HTTP surface for ISO 9001 §9.3 management reviews.
 *
 * Mounted by `_registry.js` at `/api/management-review` and
 * `/api/v1/management-review` via dualMount.
 *
 * All mutating endpoints require `authenticate` + `authorize`
 * (quality_manager / admin / ceo), and respect branch scoping via
 * `requireBranchAccess`. Validation uses express-validator.
 *
 * Response shape: `{ success: true, data }` | `{ success: false, error }`.
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');

const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
// W277g — MFA tier-2 on management-review lifecycle. close/cancel
// lock the ISO 9001 §9.3 record; approvals are the multi-role
// sign-off (quality_manager + ceo + medical_director + ...).
const { attachMfaActor, requireMfaTier } = require('../middleware/requireMfaTier');
const safeError = require('../utils/safeError');
const { getDefault: getService } = require('../services/quality/managementReview.service');
const registry = require('../config/management-review.registry');

const router = express.Router();

// ── helpers ────────────────────────────────────────────────────────

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
}

function mapStatusError(err, res) {
  if (err.code === 'NOT_FOUND') {
    return res.status(404).json({ success: false, error: err.message });
  }
  if (err.code === 'ILLEGAL_TRANSITION' || err.code === 'INVALID_PHASE') {
    return res.status(409).json({ success: false, error: err.message });
  }
  if (err.code === 'INCOMPLETE_REVIEW') {
    return res.status(422).json({ success: false, error: err.message, missing: err.missing });
  }
  return safeError(res, err);
}

// ── reference data (registry) ──────────────────────────────────────

router.get(
  '/reference',
  authenticate,
  wrap((req, res) => {
    res.json({
      success: true,
      data: {
        statuses: registry.REVIEW_STATUSES,
        types: registry.REVIEW_TYPES,
        inputs: registry.REVIEW_INPUTS,
        outputs: registry.REVIEW_OUTPUTS,
        decisionTypes: registry.DECISION_TYPES,
        actionPriorities: registry.ACTION_PRIORITIES,
        requiredAttendeeRoles: registry.REQUIRED_ATTENDEE_ROLES,
        quorumMin: registry.QUORUM_MIN,
        defaultCycleMonths: registry.DEFAULT_CYCLE_MONTHS,
      },
    });
  })
);

// ── dashboard ──────────────────────────────────────────────────────

router.get(
  '/dashboard',
  authenticate,
  requireBranchAccess,
  wrap(async (req, res) => {
    try {
      const data = await getService().getDashboard({ branchId: req.query.branchId });
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
    query('status').optional().isIn(registry.REVIEW_STATUSES),
    query('type').optional().isIn(registry.REVIEW_TYPES),
    query('limit').optional().isInt({ min: 1, max: 200 }),
    query('skip').optional().isInt({ min: 0 }),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const rows = await getService().list({
        branchId: req.query.branchId,
        status: req.query.status,
        type: req.query.type,
        fromDate: req.query.fromDate,
        toDate: req.query.toDate,
        limit: req.query.limit,
        skip: req.query.skip,
      });
      res.json({ success: true, data: rows });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.get(
  '/:id',
  authenticate,
  requireBranchAccess,
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().findById(req.params.id);
      if (!doc) return res.status(404).json({ success: false, error: 'not found' });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

// ── schedule ───────────────────────────────────────────────────────

router.post(
  '/',
  authenticate,
  requireBranchAccess,
  authorize('admin', 'quality_manager', 'ceo'),
  [
    body('title').isString().trim().notEmpty(),
    body('scheduledFor').isISO8601(),
    body('type').optional().isIn(registry.REVIEW_TYPES),
    body('cycleLabel').optional().isString(),
    body('agenda').optional().isArray(),
    body('branchId').optional().isMongoId(),
    body('tenantId').optional().isMongoId(),
    body('previousReviewId').optional().isMongoId(),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().scheduleReview(req.body, req.user._id);
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

// ── agenda ─────────────────────────────────────────────────────────

router.post(
  '/:id/agenda',
  authenticate,
  requireBranchAccess,
  authorize('admin', 'quality_manager'),
  [
    param('id').isMongoId(),
    body('agenda').optional().isArray(),
    body('attendees').optional().isArray(),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().setAgenda(req.params.id, req.body, req.user._id);
      res.json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

// ── start meeting ──────────────────────────────────────────────────

router.post(
  '/:id/start',
  authenticate,
  requireBranchAccess,
  authorize('admin', 'quality_manager', 'ceo'),
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().startMeeting(req.params.id, req.user._id);
      res.json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

// ── inputs / outputs / decisions / actions ────────────────────────

router.post(
  '/:id/inputs',
  authenticate,
  requireBranchAccess,
  authorize('admin', 'quality_manager'),
  [
    param('id').isMongoId(),
    body('code').isString().notEmpty(),
    body('summary').isString().notEmpty(),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().recordInput(req.params.id, req.body, req.user._id);
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.post(
  '/:id/outputs',
  authenticate,
  requireBranchAccess,
  authorize('admin', 'quality_manager'),
  [
    param('id').isMongoId(),
    body('code').isString().notEmpty(),
    body('description').isString().notEmpty(),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().recordOutput(req.params.id, req.body, req.user._id);
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.post(
  '/:id/decisions',
  authenticate,
  requireBranchAccess,
  authorize('admin', 'quality_manager', 'ceo'),
  [
    param('id').isMongoId(),
    body('type').isIn(registry.DECISION_TYPES),
    body('title').isString().notEmpty(),
    body('rationale').isString().notEmpty(),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().recordDecision(req.params.id, req.body, req.user._id);
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.post(
  '/:id/actions',
  authenticate,
  requireBranchAccess,
  authorize('admin', 'quality_manager', 'ceo'),
  [
    param('id').isMongoId(),
    body('title').isString().notEmpty(),
    body('ownerUserId').isMongoId(),
    body('priority').optional().isIn(registry.ACTION_PRIORITIES),
    body('dueDate').optional().isISO8601(),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().assignAction(req.params.id, req.body, req.user._id);
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

// ── close / cancel / approve ───────────────────────────────────────

router.post(
  '/:id/close',
  authenticate,
  attachMfaActor,
  requireBranchAccess,
  authorize('admin', 'quality_manager', 'ceo'),
  requireMfaTier(2),
  [
    param('id').isMongoId(),
    body('closureNotes').optional().isString(),
    body('nextReviewScheduledFor').optional().isISO8601(),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().closeReview(req.params.id, req.body, req.user._id);
      res.json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.post(
  '/:id/cancel',
  authenticate,
  attachMfaActor,
  requireBranchAccess,
  authorize('admin', 'quality_manager', 'ceo'),
  requireMfaTier(2),
  [param('id').isMongoId(), body('reason').isString().trim().notEmpty()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().cancelReview(req.params.id, req.body.reason, req.user._id);
      res.json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.post(
  '/:id/approvals',
  authenticate,
  attachMfaActor,
  requireBranchAccess,
  authorize('admin', 'quality_manager', 'ceo', 'medical_director', 'hr_manager', 'finance_manager'),
  requireMfaTier(2),
  [
    param('id').isMongoId(),
    body('role').isString().notEmpty(),
    body('signatureHash').optional().isString(),
    body('notes').optional().isString(),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().approve(req.params.id, req.body, req.user._id);
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

// ── analytics (trend + action-completion rate) ─────────────────────

router.get(
  '/analytics',
  authenticate,
  requireBranchAccess,
  [query('months').optional().isInt({ min: 1, max: 24 })],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const data = await getService().getAnalytics({
        branchId: req.query.branchId,
        months: req.query.months ? Number(req.query.months) : 12,
      });
      res.json({ success: true, data });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

// ── action status update ───────────────────────────────────────────

router.patch(
  '/:id/actions/:actionId',
  authenticate,
  requireBranchAccess,
  authorize('admin', 'quality_manager', 'ceo'),
  [
    param('id').isMongoId(),
    param('actionId').isMongoId(),
    body('status').isIn(['open', 'in_progress', 'completed', 'overdue', 'cancelled']),
    body('completionNotes').optional().isString(),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().updateActionStatus(
        req.params.id,
        req.params.actionId,
        req.body,
        req.user._id
      );
      res.json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

// ── minutes ────────────────────────────────────────────────────────

router.patch(
  '/:id/minutes',
  authenticate,
  requireBranchAccess,
  authorize('admin', 'quality_manager'),
  [param('id').isMongoId(), body('minutes').isString()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().setMinutes(req.params.id, req.body.minutes, req.user._id);
      res.json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

module.exports = router;

'use strict';

/**
 * complianceCalendar.routes.js — Phase 13 Commit 3 (4.0.57).
 *
 * HTTP surface for the unified compliance calendar. Mounted by
 * `_registry.js` at `/api/compliance-calendar` and
 * `/api/v1/compliance-calendar` via dualMount.
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');

const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const safeError = require('../utils/safeError');
const { getDefault: getService } = require('../services/quality/complianceCalendar.service');
const registry = require('../config/compliance-calendar.registry');

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
  if (err.code === 'ILLEGAL_TRANSITION') {
    return res.status(409).json({ success: false, error: err.message });
  }
  return safeError(res, err);
}

// ── reference ──────────────────────────────────────────────────────

router.get(
  '/reference',
  authenticate,
  wrap((req, res) => {
    res.json({
      success: true,
      data: {
        types: registry.CALENDAR_EVENT_TYPES,
        statuses: registry.CALENDAR_EVENT_STATUSES,
        severities: registry.CALENDAR_SEVERITIES,
        sourceAdapters: registry.SOURCE_ADAPTERS,
        defaultBands: registry.DEFAULT_URGENCY_BANDS,
        defaultAlertWindows: registry.DEFAULT_ALERT_WINDOWS,
      },
    });
  })
);

// ── stats ──────────────────────────────────────────────────────────

router.get(
  '/stats',
  authenticate,
  requireBranchAccess,
  [query('withinDays').optional().isInt({ min: 1, max: 365 })],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const data = await getService().getStats({
        branchId: req.query.branchId,
        withinDays: req.query.withinDays ? Number(req.query.withinDays) : undefined,
      });
      res.json({ success: true, data });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

// ── unified list (stored + computed) ──────────────────────────────

router.get(
  '/',
  authenticate,
  requireBranchAccess,
  [
    query('withinDays').optional().isInt({ min: 1, max: 365 }),
    query('type').optional().isIn(registry.CALENDAR_EVENT_TYPES),
    query('severity').optional().isIn(registry.CALENDAR_SEVERITIES),
    query('status').optional().isIn(registry.CALENDAR_EVENT_STATUSES),
    query('source').optional().isIn(registry.SOURCE_ADAPTERS),
    query('limit').optional().isInt({ min: 1, max: 500 }),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const data = await getService().list({
        branchId: req.query.branchId,
        withinDays: req.query.withinDays ? Number(req.query.withinDays) : undefined,
        type: req.query.type,
        severity: req.query.severity,
        status: req.query.status,
        source: req.query.source,
        includeResolved: req.query.includeResolved === 'true',
        limit: req.query.limit,
      });
      res.json({ success: true, data });
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

// ── create stored event ────────────────────────────────────────────

router.post(
  '/',
  authenticate,
  requireBranchAccess,
  authorize('admin', 'quality_manager', 'compliance_officer'),
  [
    body('title').isString().trim().notEmpty(),
    body('type').isIn(registry.CALENDAR_EVENT_TYPES),
    body('dueDate').isISO8601(),
    body('severity').optional().isIn(registry.CALENDAR_SEVERITIES),
    body('branchId').optional().isMongoId(),
    body('ownerUserId').optional().isMongoId(),
    body('regulationRefs').optional().isArray(),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().createEvent(req.body, req.user._id);
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

// ── resolve / cancel / snooze ──────────────────────────────────────

router.post(
  '/:id/resolve',
  authenticate,
  requireBranchAccess,
  authorize('admin', 'quality_manager', 'compliance_officer'),
  [
    param('id').isMongoId(),
    body('evidenceId').optional().isMongoId(),
    body('notes').optional().isString(),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().resolve(req.params.id, req.body, req.user._id);
      res.json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.post(
  '/:id/cancel',
  authenticate,
  requireBranchAccess,
  authorize('admin', 'quality_manager', 'compliance_officer'),
  [param('id').isMongoId(), body('reason').isString().trim().notEmpty()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().cancel(req.params.id, req.body.reason, req.user._id);
      res.json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.post(
  '/:id/snooze',
  authenticate,
  requireBranchAccess,
  authorize('admin', 'quality_manager', 'compliance_officer'),
  [param('id').isMongoId(), body('newDueDate').isISO8601(), body('reason').optional().isString()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().snooze(
        req.params.id,
        req.body.newDueDate,
        req.body.reason,
        req.user._id
      );
      res.json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

module.exports = router;

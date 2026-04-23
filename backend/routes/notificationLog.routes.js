'use strict';

/**
 * notificationLog.routes.js — Phase 15 Commit 2 (4.0.65).
 *
 * Admin surface for the NotificationLog audit trail. Lets ops
 * answer "did the CEO get notified about the sentinel incident
 * two hours ago?" without SSH-ing into the DB.
 *
 * Endpoints:
 *
 *   GET  /api/v1/quality/notifications                 — list w/ filters
 *   GET  /api/v1/quality/notifications/stats           — bucket counts
 *   GET  /api/v1/quality/notifications/:id             — single row
 *   POST /api/v1/quality/notifications/:id/resend      — re-dispatch via bus
 *
 * Mount style mirrors `managementReview.routes.js`. Response
 * envelope `{ success, data }` — same as rest of Phase 13.
 */

const express = require('express');
const { param, query, validationResult } = require('express-validator');

const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const safeError = require('../utils/safeError');

const router = express.Router();

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
}

function loadModel() {
  try {
    return require('../models/quality/NotificationLog.model');
  } catch {
    return null;
  }
}

// ── list ──────────────────────────────────────────────────────────

router.get(
  '/',
  authenticate,
  requireBranchAccess,
  [
    query('limit').optional().isInt({ min: 1, max: 500 }),
    query('skip').optional().isInt({ min: 0 }),
    query('status').optional().isIn(['pending', 'sent', 'failed', 'skipped', 'deduplicated']),
    query('priority').optional().isIn(['critical', 'high', 'normal', 'low']),
    query('policyId').optional().isString(),
    query('eventName').optional().isString(),
    query('channel').optional().isString(),
    query('branchId').optional().isMongoId(),
  ],
  handleValidation,
  wrap(async (req, res) => {
    const NotificationLog = loadModel();
    if (!NotificationLog) {
      return res.json({ success: true, data: [] });
    }
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;
    if (req.query.policyId) filter.policyId = req.query.policyId;
    if (req.query.eventName) filter.eventName = req.query.eventName;
    if (req.query.channel) filter.channel = req.query.channel;
    if (req.query.branchId) filter.branchId = req.query.branchId;
    try {
      const rows = await NotificationLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(Number(req.query.skip) || 0)
        .limit(Math.min(Number(req.query.limit) || 100, 500))
        .lean();
      res.json({ success: true, data: rows });
    } catch (err) {
      safeError(res, err);
    }
  })
);

// ── stats ─────────────────────────────────────────────────────────

router.get(
  '/stats',
  authenticate,
  requireBranchAccess,
  [query('hours').optional().isInt({ min: 1, max: 720 })],
  handleValidation,
  wrap(async (req, res) => {
    const NotificationLog = loadModel();
    if (!NotificationLog) {
      return res.json({
        success: true,
        data: { total: 0, byStatus: {}, byPriority: {}, byChannel: {} },
      });
    }
    const hours = Number(req.query.hours) || 24;
    const since = new Date(Date.now() - hours * 3600000);
    const filter = { createdAt: { $gte: since } };
    if (req.query.branchId) filter.branchId = req.query.branchId;

    try {
      const rows = await NotificationLog.find(filter).select('status priority channel').lean();
      const byStatus = {};
      const byPriority = {};
      const byChannel = {};
      for (const r of rows) {
        byStatus[r.status] = (byStatus[r.status] || 0) + 1;
        byPriority[r.priority] = (byPriority[r.priority] || 0) + 1;
        byChannel[r.channel] = (byChannel[r.channel] || 0) + 1;
      }
      res.json({
        success: true,
        data: {
          total: rows.length,
          windowHours: hours,
          byStatus,
          byPriority,
          byChannel,
        },
      });
    } catch (err) {
      safeError(res, err);
    }
  })
);

// ── single ────────────────────────────────────────────────────────

router.get(
  '/:id',
  authenticate,
  requireBranchAccess,
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    const NotificationLog = loadModel();
    if (!NotificationLog) {
      return res.status(404).json({ success: false, error: 'not_found' });
    }
    try {
      const doc = await NotificationLog.findById(req.params.id).lean();
      if (!doc) return res.status(404).json({ success: false, error: 'not_found' });
      res.json({ success: true, data: doc });
    } catch (err) {
      safeError(res, err);
    }
  })
);

// ── resend ────────────────────────────────────────────────────────

router.post(
  '/:id/resend',
  authenticate,
  requireBranchAccess,
  authorize('admin', 'quality_manager', 'compliance_officer'),
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    const NotificationLog = loadModel();
    if (!NotificationLog) {
      return res.status(404).json({ success: false, error: 'log_unavailable' });
    }
    try {
      const doc = await NotificationLog.findById(req.params.id).lean();
      if (!doc) return res.status(404).json({ success: false, error: 'not_found' });

      // Re-emit the original event onto the bus. The router picks
      // it up fresh — if it's within the dedup window for the same
      // recipient the re-emission is recorded as `deduplicated`
      // (no duplicate send).
      let bus;
      try {
        bus = require('../services/quality/qualityEventBus.service').getDefault();
      } catch (err) {
        return res.status(500).json({ success: false, error: `bus_unavailable: ${err.message}` });
      }
      await bus.emit(doc.eventName, doc.payloadSummary || {});
      res.json({
        success: true,
        data: { requeued: true, eventName: doc.eventName, eventKey: doc.eventKey },
      });
    } catch (err) {
      safeError(res, err);
    }
  })
);

module.exports = router;

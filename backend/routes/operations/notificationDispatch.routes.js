'use strict';

/**
 * notificationDispatch.routes.js — Phase 16 Commit 8 (4.0.73).
 *
 * HTTP surface for user-level notification preferences + admin
 * digest control.
 *
 * Mounted at /api/ops/notification-dispatch and /api/v1/…
 *
 * Endpoints:
 *   GET  /reference                 — registry snapshot
 *   GET  /preferences/me            — current user's prefs
 *   PATCH /preferences/me           — update current user's prefs
 *   GET  /preferences/:userId       — admin view
 *   PATCH /preferences/:userId      — admin update
 *   GET  /digest/pending            — admin: pending digest queue
 *   POST /digest/flush              — admin: run digest sweep now
 *   POST /dnd                       — current user: set manual DND
 *   DELETE /dnd                     — current user: clear DND
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');

const { authenticate, authorize } = require('../../middleware/auth');
const safeError = require('../../utils/safeError');
const registry = require('../../config/notificationDispatch.registry');

const router = express.Router();

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
}

function getService() {
  return (
    require('../../startup/operationsBootstrap')._getNotificationDispatchService?.() || _fallback()
  );
}

let _fb = null;
function _fallback() {
  if (_fb) return _fb;
  const {
    createNotificationDispatchService,
  } = require('../../services/operations/notificationDispatch.service');
  _fb = createNotificationDispatchService({
    preferencesModel: require('../../models/operations/NotificationPreferences.model'),
    digestModel: require('../../models/operations/NotificationDigestItem.model'),
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
        priorityChannelMatrix: registry.PRIORITY_CHANNEL_MATRIX,
        bypassPriorities: registry.BYPASS_PRIORITIES,
        digestEligiblePriorities: registry.DIGEST_ELIGIBLE_PRIORITIES,
        supportedChannels: registry.SUPPORTED_CHANNELS,
        defaultQuietHours: registry.DEFAULT_QUIET_HOURS,
        defaultDigestHour: registry.DEFAULT_DIGEST_HOUR,
        deferralReasons: registry.DEFERRAL_REASONS,
      },
    });
  })
);

// ── per-user preferences (self) ───────────────────────────────────

router.get(
  '/preferences/me',
  authenticate,
  wrap(async (req, res) => {
    try {
      const doc = await getService().getOrDefaultPrefs(req.user?._id);
      res.json({ success: true, data: doc });
    } catch (err) {
      safeError(res, err);
    }
  })
);

router.patch(
  '/preferences/me',
  authenticate,
  wrap(async (req, res) => {
    try {
      const doc = await getService().updatePrefs(req.user?._id, req.body, {
        actorId: req.user?._id,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      safeError(res, err);
    }
  })
);

// ── DND toggle (self) ─────────────────────────────────────────────

router.post(
  '/dnd',
  authenticate,
  [body('until').isISO8601(), body('reason').optional().isString()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().updatePrefs(req.user?._id, {
        dndUntil: new Date(req.body.until),
        dndReason: req.body.reason || null,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      safeError(res, err);
    }
  })
);

router.delete(
  '/dnd',
  authenticate,
  wrap(async (req, res) => {
    try {
      const doc = await getService().updatePrefs(req.user?._id, {
        dndUntil: null,
        dndReason: null,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      safeError(res, err);
    }
  })
);

// ── admin: arbitrary user prefs ───────────────────────────────────

router.get(
  '/preferences/:userId',
  authenticate,
  authorize(['admin', 'ops_manager']),
  [param('userId').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().getOrDefaultPrefs(req.params.userId);
      res.json({ success: true, data: doc });
    } catch (err) {
      safeError(res, err);
    }
  })
);

router.patch(
  '/preferences/:userId',
  authenticate,
  authorize(['admin', 'ops_manager']),
  [param('userId').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().updatePrefs(req.params.userId, req.body, {
        actorId: req.user?._id,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      safeError(res, err);
    }
  })
);

// ── admin: digest queue ───────────────────────────────────────────

router.get(
  '/digest/pending',
  authenticate,
  authorize(['admin', 'ops_manager']),
  [query('userId').optional().isMongoId(), query('limit').optional().isInt({ min: 1, max: 1000 })],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const rows = await getService().listPendingDigest({
        userId: req.query.userId,
        limit: req.query.limit ? Number(req.query.limit) : 500,
      });
      res.json({ success: true, data: rows });
    } catch (err) {
      safeError(res, err);
    }
  })
);

router.post(
  '/digest/flush',
  authenticate,
  authorize(['admin', 'ops_manager']),
  wrap(async (req, res) => {
    try {
      const report = await getService().flushDigests({});
      res.json({ success: true, data: report });
    } catch (err) {
      safeError(res, err);
    }
  })
);

module.exports = router;

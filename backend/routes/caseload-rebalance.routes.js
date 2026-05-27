'use strict';

/**
 * caseload-rebalance.routes.js — Wave 510 + W512.
 *
 * W510 — read-only analysis:
 *   GET /api/v1/caseload-rebalance/branch/:branchId/suggestions
 *     ?threshold=12&improvement=0.1&limit=50
 *
 * W512 — apply a single move (the W511 frontend "Apply" button):
 *   POST /api/v1/caseload-rebalance/apply
 *     body: { alertId, fromTherapistId, toTherapistId, reason? }
 *     → { action: 'applied' | 'skipped', reason?, alert? }
 *
 * Auth: authenticate + requireBranchAccess on both. Restricted callers
 * can only operate on their own branch (assertBranchMatch enforces).
 *
 * Apply is atomic — the underlying findOneAndUpdate only succeeds if
 * the alert is STILL open AND STILL assigned to the expected
 * fromTherapistId. Stale suggestions (manual reassignment happened
 * after the suggestion list was computed) safely no-op.
 */

const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const { authenticate } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const { assertBranchMatch } = require('../middleware/assertBranchMatch');
const logger = require('../utils/logger');
const safeError = require('../utils/safeError');

const rebalance = require('../services/caseload-rebalance.service');

// Best-effort audit logger — mirrors therapist-portal.routes pattern.
// AuditLog is optional; audit failures must never break the request.
function _auditLog(eventType, req, extras = {}) {
  try {
    let Model = null;
    try {
      Model = mongoose.model('AuditLog');
    } catch {
      try {
        require('../models/auditLog.model');
        Model = mongoose.model('AuditLog');
      } catch {
        return;
      }
    }
    if (!Model || typeof Model.create !== 'function') return;
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    Model.create({
      eventType,
      eventCategory: extras.category || 'clinical',
      severity: extras.severity || 'info',
      status: extras.status || 'success',
      ip: req.ip,
      userAgent: req.get && req.get('user-agent'),
      userId,
      actionDetails: extras.actionDetails || {},
      affectedResources: extras.affectedResources || [],
      result: extras.result || 'success',
    }).catch(() => {});
  } catch {
    /* swallow */
  }
}

router.use(authenticate);
router.use(requireBranchAccess);

function _parsePositiveInt(val, fallback, max) {
  const n = parseInt(val, 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return max && n > max ? max : n;
}

function _parseFloat01(val, fallback) {
  const n = parseFloat(val);
  if (!Number.isFinite(n) || n < 0 || n > 1) return fallback;
  return n;
}

router.get('/branch/:branchId/suggestions', async (req, res) => {
  try {
    const { branchId } = req.params;
    if (!branchId) {
      return res.status(400).json({ success: false, error: 'branchId required' });
    }

    // Cross-branch isolation guard — restricted callers can't analyze
    // foreign branches even if they hand-craft the URL.
    assertBranchMatch(req, branchId, 'caseload-rebalance');

    const overloadThreshold = _parsePositiveInt(req.query.threshold, 12, 100);
    const scoreImprovementThreshold = _parseFloat01(req.query.improvement, 0.1);
    const maxSuggestions = _parsePositiveInt(req.query.limit, 50, 200);

    const out = await rebalance.suggestRebalanceMoves({
      branchId,
      overloadThreshold,
      scoreImprovementThreshold,
      maxSuggestions,
    });
    return res.json({ success: true, data: out });
  } catch (err) {
    if (err && err.status === 403) {
      return res.status(403).json({ success: false, error: err.message });
    }
    logger.warn('[caseload-rebalance] /suggestions failed: %s', err.message || err);
    return safeError(res, err, 'caseload-rebalance.suggestions');
  }
});

// ════════════════════════════════════════════════════════════════════
// W512 — Apply a single rebalance move (atomic)
// ════════════════════════════════════════════════════════════════════

router.post('/apply', express.json(), async (req, res) => {
  try {
    const { alertId, fromTherapistId, toTherapistId, reason } = req.body || {};
    if (!alertId || typeof alertId !== 'string') {
      return res.status(400).json({ success: false, error: 'alertId required (string)' });
    }
    if (!fromTherapistId || typeof fromTherapistId !== 'string') {
      return res.status(400).json({ success: false, error: 'fromTherapistId required (string)' });
    }
    if (!toTherapistId || typeof toTherapistId !== 'string') {
      return res.status(400).json({ success: false, error: 'toTherapistId required (string)' });
    }

    // Branch isolation — load the alert lightly to grab branchId, then assert.
    let MeasureAlert;
    try {
      MeasureAlert = mongoose.model('MeasureAlert');
    } catch {
      require('../domains/goals/models/MeasureAlert');
      MeasureAlert = mongoose.model('MeasureAlert');
    }
    const alertProbe = await MeasureAlert.findById(alertId).select('_id branchId').lean();
    if (!alertProbe) {
      return res.status(404).json({ success: false, error: 'alert_not_found' });
    }
    if (alertProbe.branchId) {
      assertBranchMatch(req, alertProbe.branchId, 'caseload-rebalance.apply');
    }

    const result = await rebalance.applyMove({
      alertId,
      fromTherapistId,
      toTherapistId,
      reason: typeof reason === 'string' ? reason.slice(0, 500) : null,
      actorId: req.user?._id || req.user?.id || null,
    });

    if (result.action === 'applied') {
      _auditLog('caseload.alert_reassigned', req, {
        category: 'clinical',
        severity: 'info',
        actionDetails: {
          alertId,
          fromTherapistId,
          toTherapistId,
          reason: reason || null,
        },
        affectedResources: [
          { type: 'MeasureAlert', id: alertId },
          { type: 'User', id: fromTherapistId },
          { type: 'User', id: toTherapistId },
        ],
      });

      // W514 — emit medical.measure_alert.reassigned for downstream
      // realtime subscribers (both therapists' inboxes, notification
      // service, future calendar-sync). Fire-and-forget; emit failure
      // must never break the user-facing response. We resolve the bus
      // lazily so the route doesn't require integrationBus to be
      // initialized at module load (test environments often skip it).
      try {
        const { integrationBus } = require('../integration/systemIntegrationBus');
        if (integrationBus && typeof integrationBus.publish === 'function') {
          Promise.resolve()
            .then(() =>
              integrationBus.publish('medical', 'measure_alert.reassigned', {
                alertId,
                beneficiaryId: String(result.alert?.beneficiaryId || ''),
                branchId: String(result.alert?.branchId || alertProbe.branchId || ''),
                fromTherapistId,
                toTherapistId,
                actorId: String(req.user?._id || req.user?.id || ''),
                reason: typeof reason === 'string' ? reason.slice(0, 500) : '',
                alertType: String(result.alert?.alertType || ''),
                severity: String(result.alert?.severity || ''),
              })
            )
            .catch(emitErr => {
              logger.warn(
                '[caseload-rebalance] reassign emit failed: %s',
                emitErr.message || emitErr
              );
            });
        }
      } catch (busErr) {
        logger.warn(
          '[caseload-rebalance] integrationBus unavailable for reassign emit: %s',
          busErr.message || busErr
        );
      }

      return res.json({ success: true, data: result });
    }

    // 409 for stale/conflict skip reasons; 200 for benign skips.
    const conflictReasons = new Set([
      'not_currently_assigned',
      'not_open',
      'same_therapist',
      'invalid_to_therapist',
    ]);
    const status = conflictReasons.has(result.reason) ? 409 : 200;
    return res.status(status).json({ success: status === 200, data: result });
  } catch (err) {
    if (err && err.status === 403) {
      return res.status(403).json({ success: false, error: err.message });
    }
    logger.warn('[caseload-rebalance] /apply failed: %s', err.message || err);
    return safeError(res, err, 'caseload-rebalance.apply');
  }
});

module.exports = router;

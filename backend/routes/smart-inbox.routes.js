'use strict';

/**
 * smart-inbox.routes.js — Wave 507 (Phase E2 — Supervisor/Therapist Inbox).
 *
 * HTTP surface for the W431 smart-inbox-ranker.lib. Returns the caller's
 * top-N actionable items, ranked by urgency + role bias.
 *
 *   GET /api/v1/smart-inbox/me?limit=20
 *
 * Behaviour:
 *   - Pulls OPEN MeasureAlerts assigned to the caller (assigneeId === req.user.id).
 *   - Pulls open alerts in the caller's branch when no caseload assignment exists yet
 *     (i.e. supervisors / managers who triage rather than execute).
 *   - Normalizes each into the InboxItem shape the W431 lib understands.
 *   - Calls smartInboxRanker.topN(items, limit, ctx) with role-bias.
 *   - Returns { items: [{ item, score, signals }, ...], scope, role }.
 *
 * Scope decision:
 *   - When req.user has at least 1 assigned MeasureAlert → scope='assigned' →
 *     ONLY returns items where assigneeId === req.user.id.
 *   - Otherwise (typical for supervisor/manager) → scope='branch' →
 *     returns open alerts in the caller's branch, ranked.
 *
 * Branch isolation:
 *   - The MeasureAlert query is always wrapped with branchFilter(req) so
 *     restricted callers never see foreign branches.
 *   - Cross-branch callers (admin / super_admin / head_office_admin) get
 *     unscoped queries.
 *
 * Auth: authenticate (any logged-in user). Branch scope enforced by
 *   middleware/branchScope.middleware.js.
 *
 * Pairs with the W506 SSE feed: client subscribes to
 *   'medical.measure_alert.raised' AND polls /smart-inbox/me on each event
 *   to get the re-ranked top-N.
 */

const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const { authenticate } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const logger = require('../utils/logger');
const safeError = require('../utils/safeError');

const ranker = require('../intelligence/smart-inbox-ranker.lib');
const metricsModule = require('../intelligence/smart-platform-metrics.service');

// W435+: lazy-bind to the smart-platform metrics facade. Emits
// incInboxRanking(top_severity) once per ranked response so ops can
// see the inbox-ranker activity rate per role/severity distribution.
// Wrapped in try/catch — metric failure never breaks the response.
function _emitRankingMetric(items) {
  try {
    const m = metricsModule.getDefault();
    if (!m || typeof m.incInboxRanking !== 'function') return;
    if (!items || items.length === 0) {
      m.incInboxRanking('empty');
      return;
    }
    const topSeverity = String(items[0]?.item?.severity || 'unknown').toLowerCase();
    m.incInboxRanking(topSeverity);
  } catch {
    /* metric drop — never throw into route hot path */
  }
}

// Severity stays "medium" if a producer left it null — matches the ranker's
// default weight assumption (medium ≈ 0.4).
const DEFAULT_SEVERITY = 'medium';

function _modelOrNull(name, fallbackPath) {
  try {
    return mongoose.model(name);
  } catch {
    try {
      require(fallbackPath);
      return mongoose.model(name);
    } catch {
      return null;
    }
  }
}

function _resolveUserId(req) {
  return req.user?._id || req.user?.id || null;
}

function _resolveRole(req) {
  return req.user?.role || req.user?.roleCode || 'user';
}

/**
 * Convert a raw MeasureAlert doc into the InboxItem shape the
 * W431 lib understands. The ranker doesn't care about the source
 * model — only the normalized fields.
 */
function _normalizeAlert(doc) {
  // Age computed from firstSeenAt to "now" in hours. Saturates per ranker.
  const ageMs = doc.firstSeenAt ? Date.now() - new Date(doc.firstSeenAt).getTime() : 0;
  const ageHours = ageMs > 0 ? ageMs / 3600000 : 0;
  return {
    id: String(doc._id),
    source: 'measure_alert',
    severity: doc.severity || DEFAULT_SEVERITY,
    ageHours,
    alertType: doc.alertType || 'UNKNOWN',
    // beneficiaryRiskTier is sometimes carried through; the ranker default
    // tolerates undefined and falls back to neutral weight.
    beneficiaryRiskTier: doc.evidence?.beneficiaryRiskTier || undefined,
    slaBreached: !!doc.slaBreached,
    // Pass-through for the UI — not used by the ranker.
    raw: {
      beneficiaryId: String(doc.beneficiaryId || ''),
      measureId: String(doc.measureId || ''),
      measureCode: doc.measureCode || '',
      alertType: doc.alertType || '',
      severity: doc.severity || '',
      branchId: doc.branchId ? String(doc.branchId) : null,
      firstSeenAt: doc.firstSeenAt ? new Date(doc.firstSeenAt).toISOString() : null,
      lastEvaluatedAt: doc.lastEvaluatedAt ? new Date(doc.lastEvaluatedAt).toISOString() : null,
      goalTitle: doc.evidence?.goalTitle || null,
      messageAr: doc.evidence?.message_ar || null,
    },
  };
}

// All routes authenticated + branch-scoped.
router.use(authenticate);
router.use(requireBranchAccess);

/**
 * GET /me?limit=N — caller's top-N ranked actionable items.
 *
 * Default limit=20, max 100.
 */
router.get('/me', async (req, res) => {
  try {
    const MeasureAlert = _modelOrNull('MeasureAlert', '../domains/goals/models/MeasureAlert');
    if (!MeasureAlert) {
      return res.status(503).json({
        success: false,
        error: 'models_unavailable',
        message: 'MeasureAlert model not registered',
      });
    }

    const userId = _resolveUserId(req);
    const role = _resolveRole(req);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

    // ── Step 1: assigned-to-me first (the W92 reviewer-queue cut) ──
    let scope = 'assigned';
    let candidates = [];
    if (userId) {
      candidates = await MeasureAlert.find({
        ...branchFilter(req),
        assigneeId: userId,
        status: 'open',
      })
        .select(
          '_id beneficiaryId measureId measureCode alertType severity status ' +
            'branchId firstSeenAt lastEvaluatedAt evidence slaBreached'
        )
        .limit(500) // cap before ranking; lib then trims to top-N
        .lean();
    }

    // ── Step 2: fall back to branch-scoped open alerts for triage roles ──
    if (candidates.length === 0) {
      scope = 'branch';
      candidates = await MeasureAlert.find({
        ...branchFilter(req),
        status: 'open',
      })
        .select(
          '_id beneficiaryId measureId measureCode alertType severity status ' +
            'branchId firstSeenAt lastEvaluatedAt evidence slaBreached'
        )
        .limit(500)
        .lean();
    }

    if (candidates.length === 0) {
      return res.json({
        success: true,
        data: { scope, role, items: [], total: 0 },
      });
    }

    // ── Step 3: normalize + rank ──
    const normalized = candidates.map(_normalizeAlert);
    // Compute role bias per-item (each alertType may have different weight).
    const ranked = normalized.map(item => {
      const ctx = { roleWeight: ranker.roleBiasFor(role, item.alertType) };
      const result = ranker.scoreItem(item, ctx);
      return { item, score: result.score, signals: result.signals };
    });
    // Sort DESC by score, then take top-N.
    ranked.sort((a, b) => b.score - a.score);
    const items = ranked.slice(0, limit);

    // W435+: emit ranker activity counter (top-severity label) so the
    // Phase F2 observability surface reports inbox usage in production.
    _emitRankingMetric(items);

    return res.json({
      success: true,
      data: {
        scope,
        role,
        items,
        total: candidates.length,
      },
    });
  } catch (err) {
    logger.warn('[smart-inbox] /me failed: %s', err.message);
    return safeError(res, err, 'smart-inbox.me');
  }
});

module.exports = router;

'use strict';

/**
 * beneficiary-lifecycle.routes.js — Wave 40 (Beneficiary 360 Phase 2).
 *
 * HTTP surface for the Wave-39 lifecycle service. Every endpoint
 * gates on a `beneficiary.lifecycle.*` permission code (registered in
 * governance.registry Wave 40 extension). The service layer enforces
 * the deeper checks (self-approval, Nafath, reasonCode allowlist,
 * reversal window, etc.).
 *
 * Endpoints (mounted at /api/v1/beneficiary-lifecycle behind authenticate):
 *
 *   POST   /transitions
 *           body: { beneficiaryId, branchId, destinationBranchId?,
 *                   transitionId, reason?, reasonCode?, evidenceLinks?,
 *                   correlationId?, metadata? }
 *           → 200 { transitionRecord } | 4xx
 *
 *   POST   /transitions/:id/approve
 *           body: { approverRole, decision='approve'|'reject',
 *                   nafathSignatureId?, comment? }
 *
 *   POST   /transitions/:id/execute
 *
 *   POST   /transitions/:id/cancel
 *           body: { reason? }
 *
 *   POST   /transitions/:id/reverse
 *           body: { reason? }
 *
 *   GET    /transitions/:id
 *
 *   GET    /beneficiaries/:beneficiaryId/transitions
 *
 *   GET    /beneficiaries/:beneficiaryId/allowed-transitions?currentState=active
 *
 *   GET    /transitions/_health    — Ops probe (auth-free if needed at app.js)
 *
 * Status code map:
 *
 *   ok=true                       → 200
 *   ACTOR_REQUIRED                → 401
 *   PERMISSION_DENIED             → 403
 *   TRANSITION_NOT_FOUND          → 404
 *   BENEFICIARY_NOT_FOUND         → 404
 *   INVALID_FROM_STATE            → 409
 *   INVALID_REASON_CODE           → 400
 *   REASON_REQUIRED               → 400
 *   ALREADY_FINAL / ALREADY_EXECUTED → 409
 *   NOT_APPROVED                  → 409
 *   NOT_REVERSIBLE                → 409
 *   REVERSAL_WINDOW_EXPIRED       → 410
 *   SELF_APPROVAL                 → 403
 *   DUPLICATE_APPROVAL            → 409
 *   NAFATH_REQUIRED               → 412
 */

const express = require('express');
const safeError = require('../utils/safeError');
const reg = require('../intelligence/beneficiary-lifecycle.registry');
const {
  branchScopedBeneficiaryParam,
  assertBranchMatch,
  effectiveBranchScope,
} = require('../middleware/assertBranchMatch');
// Wave 597 — actionable roll-up over a transition's persisted side-effect
// audit rows (W595 reducer, wired live into executeTransition in W596).
const {
  summarizeSideEffectResults,
} = require('../intelligence/beneficiary-lifecycle-side-effects.service');

const REASON_TO_STATUS = Object.freeze({
  ACTOR_REQUIRED: 401,
  PERMISSION_DENIED: 403,
  TRANSITION_NOT_FOUND: 404,
  BENEFICIARY_NOT_FOUND: 404,
  INVALID_FROM_STATE: 409,
  INVALID_REASON_CODE: 400,
  REASON_REQUIRED: 400,
  ALREADY_FINAL: 409,
  ALREADY_EXECUTED: 409,
  NOT_APPROVED: 409,
  NOT_REVERSIBLE: 409,
  REVERSAL_WINDOW_EXPIRED: 410,
  SELF_APPROVAL: 403,
  DUPLICATE_APPROVAL: 409,
  NAFATH_REQUIRED: 412,
  UNKNOWN_TRANSITION: 400,
  // Wave 95 — MFA-tier enforcement (route-wiring of Wave 86 service guard)
  MFA_TIER_REQUIRED: 403,
  MFA_FRESHNESS_REQUIRED: 403,
});

function actorFrom(req) {
  // Wave 95 — propagate MFA tier + freshness from the Wave-86
  // loadMfaActor middleware into the actor object the service uses
  // to enforce its tier guard. Falls back to {0, null} when the
  // middleware isn't mounted (test contexts that bypass it).
  const fromMfa = req.actor || {};
  return {
    userId: req.user?.id || req.user?._id || fromMfa.userId || null,
    role: req.user?.role || req.user?.roleCode || fromMfa.role || null,
    ip: req.ip || fromMfa.ip || null,
    mfaLevel: typeof fromMfa.mfaLevel === 'number' ? fromMfa.mfaLevel : 0,
    mfaAssertedAt: fromMfa.mfaAssertedAt || null,
  };
}

function respond(res, result) {
  if (result && result.ok) {
    return res.json({ success: true, data: result });
  }
  const status = (result && REASON_TO_STATUS[result.reason]) || 400;
  return res.status(status).json({
    success: false,
    message: result?.reason || 'LIFECYCLE_REJECTED',
    reason: result?.reason,
    ...(result?.allowed ? { allowed: result.allowed } : {}),
    ...(result?.status ? { currentWorkflowStatus: result.status } : {}),
    ...(result?.ageDays !== undefined ? { ageDays: result.ageDays } : {}),
    // Wave 95 — surface the MFA-tier guard's diagnostic fields so the
    // web-admin can render an actionable "step-up to tier N" prompt.
    ...(result?.requiredTier !== undefined ? { requiredTier: result.requiredTier } : {}),
    ...(result?.actorTier !== undefined ? { actorTier: result.actorTier } : {}),
    ...(result?.maxAgeMin !== undefined ? { maxAgeMin: result.maxAgeMin } : {}),
    ...(result?.ageMin !== undefined ? { ageMin: result.ageMin } : {}),
  });
}

/**
 * @param {object} opts
 *   - service     — Wave-39 lifecycle service (createBeneficiaryLifecycleService output)
 *   - governance  — Wave-26 governance service (hasPermission)
 *   - logger      — console-compatible
 */
function createBeneficiaryLifecycleRouter({ service, governance, logger = console } = {}) {
  if (!service || typeof service.requestTransition !== 'function') {
    throw new Error('beneficiary-lifecycle.routes: lifecycle service is required');
  }
  if (!governance || typeof governance.hasPermission !== 'function') {
    throw new Error('beneficiary-lifecycle.routes: governance service is required');
  }
  void logger;

  const router = express.Router();
  // W440: auto-enforce branch ownership on every :beneficiaryId param.
  router.param('beneficiaryId', branchScopedBeneficiaryParam);

  // Permission helper — wraps governance.hasPermission with structured
  // response on denial.
  function ensurePermission(req, res, permissionCode) {
    const actor = actorFrom(req);
    if (!actor.userId) {
      res.status(401).json({
        success: false,
        message: 'ACTOR_REQUIRED',
        reason: 'ACTOR_REQUIRED',
      });
      return false;
    }
    if (!governance.hasPermission(actor.role, permissionCode)) {
      res.status(403).json({
        success: false,
        message: 'PERMISSION_DENIED',
        reason: 'PERMISSION_DENIED',
        requiredPermission: permissionCode,
      });
      return false;
    }
    return true;
  }

  // ─── POST /transitions ─────────────────────────────────────
  router.post('/transitions', async (req, res) => {
    try {
      const body = req.body || {};
      const { transitionId } = body;
      if (!transitionId || !reg.findTransition(transitionId)) {
        return res.status(400).json({
          success: false,
          message: 'TRANSITION_NOT_FOUND',
          reason: 'TRANSITION_NOT_FOUND',
        });
      }
      const permCode = `beneficiary.lifecycle.${transitionId}.request`;
      if (!ensurePermission(req, res, permCode)) return;

      const result = await service.requestTransition({
        beneficiaryId: body.beneficiaryId,
        branchId: body.branchId,
        destinationBranchId: body.destinationBranchId || null,
        transitionId,
        actor: actorFrom(req),
        reason: body.reason || null,
        reasonCode: body.reasonCode || null,
        evidenceLinks: Array.isArray(body.evidenceLinks) ? body.evidenceLinks : [],
        correlationId: body.correlationId || null,
        metadata: body.metadata || {},
      });
      return respond(res, result);
    } catch (err) {
      return safeError(res, err, 'lifecycle.transition.request');
    }
  });

  // ─── POST /transitions/:id/approve ─────────────────────────
  router.post('/transitions/:id/approve', async (req, res) => {
    try {
      if (!ensurePermission(req, res, 'beneficiary.lifecycle.transition.approve')) return;
      const body = req.body || {};
      const result = await service.approveTransition({
        transitionRecordId: req.params.id,
        actor: actorFrom(req),
        approverRole: body.approverRole,
        decision: body.decision || 'approve',
        nafathSignatureId: body.nafathSignatureId || null,
        comment: body.comment || null,
      });
      return respond(res, result);
    } catch (err) {
      return safeError(res, err, 'lifecycle.transition.approve');
    }
  });

  // ─── POST /transitions/:id/execute ─────────────────────────
  router.post('/transitions/:id/execute', async (req, res) => {
    try {
      if (!ensurePermission(req, res, 'beneficiary.lifecycle.transition.execute')) return;
      const result = await service.executeTransition({
        transitionRecordId: req.params.id,
        actor: actorFrom(req),
      });
      return respond(res, result);
    } catch (err) {
      return safeError(res, err, 'lifecycle.transition.execute');
    }
  });

  // ─── POST /transitions/:id/cancel ─────────────────────────
  // Permission logic: cancel-own when actor === requestedBy, else
  // cancel-any (DPO/exec). We check the cheaper one first.
  router.post('/transitions/:id/cancel', async (req, res) => {
    try {
      const actor = actorFrom(req);
      if (!actor.userId) {
        return res.status(401).json({
          success: false,
          message: 'ACTOR_REQUIRED',
          reason: 'ACTOR_REQUIRED',
        });
      }
      // First peek at the record to know if actor is the requester
      const history = await service.getTransitionHistory(null).catch(() => []);
      void history; // we don't actually need history; using a focused fetch
      // We don't expose the model — rely on service to enforce.
      // Permission test: cancel-own works if actor === requestedBy; otherwise
      // try cancel-any. The service itself isn't doing the requester
      // check; we approximate by checking the broader permission only.
      const hasAny = governance.hasPermission(
        actor.role,
        'beneficiary.lifecycle.transition.cancel-any'
      );
      const hasOwn = governance.hasPermission(
        actor.role,
        'beneficiary.lifecycle.transition.cancel-own'
      );
      if (!hasAny && !hasOwn) {
        return res.status(403).json({
          success: false,
          message: 'PERMISSION_DENIED',
          reason: 'PERMISSION_DENIED',
          requiredPermission: 'beneficiary.lifecycle.transition.cancel-own',
        });
      }
      // Note: enforcement that requester actually matches actor for
      // cancel-own is a service-layer concern in Wave 41. For Wave 40,
      // the permission requires the actor to AT LEAST hold cancel-own,
      // which `all-authenticated` always satisfies.
      const result = await service.cancelTransition({
        transitionRecordId: req.params.id,
        actor,
        reason: req.body?.reason || null,
      });
      return respond(res, result);
    } catch (err) {
      return safeError(res, err, 'lifecycle.transition.cancel');
    }
  });

  // ─── POST /transitions/:id/reverse ─────────────────────────
  router.post('/transitions/:id/reverse', async (req, res) => {
    try {
      if (!ensurePermission(req, res, 'beneficiary.lifecycle.transition.reverse')) return;
      const result = await service.reverseTransition({
        transitionRecordId: req.params.id,
        actor: actorFrom(req),
        reason: req.body?.reason || null,
      });
      return respond(res, result);
    } catch (err) {
      return safeError(res, err, 'lifecycle.transition.reverse');
    }
  });

  // ─── GET /transitions/:id ──────────────────────────────────
  router.get('/transitions/:id', async (req, res) => {
    try {
      if (!ensurePermission(req, res, 'beneficiary.lifecycle.transitions.read')) return;
      // No direct fetch on the service; reuse history filter by null
      // and let the test mock provide; production wires a real fetch
      // in Wave 41 alongside actor-scoped read.
      if (typeof service.getTransitionById === 'function') {
        const record = await service.getTransitionById(req.params.id);
        if (!record) {
          return res.status(404).json({
            success: false,
            message: 'TRANSITION_NOT_FOUND',
            reason: 'TRANSITION_NOT_FOUND',
          });
        }
        return res.json({ success: true, data: { transitionRecord: record } });
      }
      return res.status(501).json({
        success: false,
        message: 'GET_BY_ID_NOT_WIRED',
        reason: 'GET_BY_ID_NOT_WIRED',
      });
    } catch (err) {
      return safeError(res, err, 'lifecycle.transition.get');
    }
  });

  // ─── GET /transitions/:id/side-effects-summary ────────────
  // Wave 597 — actionable operational roll-up of the side-effects that
  // ran when this transition was executed. Recomputes the W595 summary
  // from the persisted `sideEffectsAudit` rows so dashboards/operators
  // see real clinical-mutation totals + category buckets without
  // re-aggregating the raw audit array.
  router.get('/transitions/:id/side-effects-summary', async (req, res) => {
    try {
      if (!ensurePermission(req, res, 'beneficiary.lifecycle.transitions.read')) return;
      if (typeof service.getTransitionById !== 'function') {
        return res.status(501).json({
          success: false,
          message: 'GET_BY_ID_NOT_WIRED',
          reason: 'GET_BY_ID_NOT_WIRED',
        });
      }
      const record = await service.getTransitionById(req.params.id);
      if (!record) {
        return res.status(404).json({
          success: false,
          message: 'TRANSITION_NOT_FOUND',
          reason: 'TRANSITION_NOT_FOUND',
        });
      }
      // Cross-branch isolation (W269 doctrine): a restricted caller may
      // only read a transition owned by their branch. No-op for
      // cross-branch roles + test contexts without req.branchScope.
      assertBranchMatch(req, record.sourceBranchId, 'lifecycle transition');

      const auditRows = Array.isArray(record.sideEffectsAudit) ? record.sideEffectsAudit : [];
      const sideEffectsSummary = summarizeSideEffectResults(
        auditRows.map(s => ({
          ...(s && s.metadata && typeof s.metadata === 'object' ? s.metadata : {}),
          status: s ? s.status : undefined,
        }))
      );
      return res.json({
        success: true,
        data: {
          transitionRecordId: record._id,
          transitionId: record.transitionId,
          status: record.status,
          sideEffectsSummary,
          sideEffectsAudit: auditRows,
        },
      });
    } catch (err) {
      // assertBranchMatch throws Error & { status: 403|404 } — honor it.
      if (err && Number.isInteger(err.status)) {
        return res.status(err.status).json({ success: false, error: err.message });
      }
      return safeError(res, err, 'lifecycle.transition.side-effects-summary');
    }
  });

  // ─── GET /beneficiaries/:beneficiaryId/transitions ────────
  router.get('/beneficiaries/:beneficiaryId/transitions', async (req, res) => {
    try {
      if (!ensurePermission(req, res, 'beneficiary.lifecycle.transitions.read')) return;
      const records = await service.getTransitionHistory(req.params.beneficiaryId);
      return res.json({
        success: true,
        data: { transitions: records, count: records.length },
      });
    } catch (err) {
      return safeError(res, err, 'lifecycle.transition.history');
    }
  });

  // ─── GET /beneficiaries/:beneficiaryId/side-effects-summary ─
  // Wave 599 — beneficiary-level actionable roll-up. Aggregates the
  // persisted side-effect audit rows across EVERY transition in the
  // beneficiary's lifecycle history and feeds them through the same
  // W595 reducer used by the per-transition endpoint, so a single panel
  // can show the real clinical-mutation totals + category buckets a
  // beneficiary accumulated over their whole journey. Cross-branch
  // isolation (W269) is enforced upstream by the `beneficiaryId`
  // `branchScopedBeneficiaryParam` middleware registered above — a
  // restricted caller can only resolve a beneficiary owned by their
  // branch, so no per-row branch filtering is needed (and filtering by
  // sourceBranchId would wrongly hide a transferred beneficiary's
  // pre-transfer journey from their current branch).
  router.get('/beneficiaries/:beneficiaryId/side-effects-summary', async (req, res) => {
    try {
      if (!ensurePermission(req, res, 'beneficiary.lifecycle.transitions.read')) return;
      const records = await service.getTransitionHistory(req.params.beneficiaryId);
      const all = Array.isArray(records) ? records : [];

      const flatRows = [];
      let transitionsWithSideEffects = 0;
      for (const record of all) {
        const auditRows =
          record && Array.isArray(record.sideEffectsAudit) ? record.sideEffectsAudit : [];
        if (auditRows.length > 0) transitionsWithSideEffects += 1;
        for (const s of auditRows) {
          flatRows.push({
            ...(s && s.metadata && typeof s.metadata === 'object' ? s.metadata : {}),
            status: s ? s.status : undefined,
          });
        }
      }

      const sideEffectsSummary = summarizeSideEffectResults(flatRows);
      return res.json({
        success: true,
        data: {
          beneficiaryId: req.params.beneficiaryId,
          transitionsConsidered: all.length,
          transitionsWithSideEffects,
          sideEffectsSummary,
        },
      });
    } catch (err) {
      return safeError(res, err, 'lifecycle.beneficiary.side-effects-summary');
    }
  });

  // ─── GET /side-effects-summary (branch-level) ──────────────
  // Wave 601 — branch-scoped operational roll-up. Aggregates the
  // persisted side-effect audit rows across EVERY transition of EVERY
  // beneficiary, scoped to the caller's branch, and feeds them through
  // the same W595 reducer. Powers a quality/ops dashboard tile showing
  // how many real clinical mutations (cancelled appointments, closed
  // episodes, episode-releases) the branch accumulated.
  //
  // Cross-branch isolation (W269): `effectiveBranchScope` returns the
  // restricted caller's OWN branch (ignoring any `?branchId=` spoof);
  // an unrestricted cross-branch role may pass `?branchId=` to scope,
  // or omit it to aggregate every branch. Records are filtered by
  // `sourceBranchId` — the branch that owned the beneficiary when the
  // transition executed.
  router.get('/side-effects-summary', async (req, res) => {
    try {
      if (!ensurePermission(req, res, 'beneficiary.lifecycle.transitions.read')) return;
      const branchScope = effectiveBranchScope(req);

      // Wave 604 — optional `?windowDays=N` bounds the operational scan to
      // transitions that occurred within the last N days. Omitted/invalid =>
      // whole history (backward compatible with W601). Best-effort age uses
      // executedAt (side effects fire at execution) then requestedAt then the
      // mongoose timestamps; records without ANY timestamp are kept (cannot
      // prove they are old — never silently drop data).
      let windowDays = null;
      if (req.query.windowDays != null && req.query.windowDays !== '') {
        const parsed = Number(req.query.windowDays);
        if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0 || parsed > 3650) {
          return res.status(400).json({
            success: false,
            message: 'INVALID_WINDOW_DAYS',
            reason: 'INVALID_WINDOW_DAYS',
          });
        }
        windowDays = parsed;
      }
      const cutoffMs =
        windowDays != null ? Date.now() - windowDays * 24 * 60 * 60 * 1000 : null;
      const recordTimeMs = r => {
        const raw = r && (r.executedAt || r.requestedAt || r.createdAt || r.updatedAt);
        if (raw == null) return null;
        const t = new Date(raw).getTime();
        return Number.isFinite(t) ? t : null;
      };

      const records = await service.getTransitionHistory(null);
      const all = Array.isArray(records) ? records : [];
      const branchScoped = branchScope ? all.filter(r => r && r.sourceBranchId === branchScope) : all;
      const scoped =
        cutoffMs == null
          ? branchScoped
          : branchScoped.filter(r => {
              const t = recordTimeMs(r);
              return t == null || t >= cutoffMs; // keep undateable rows
            });

      const flatRows = [];
      const beneficiaries = new Set();
      let transitionsWithSideEffects = 0;
      for (const record of scoped) {
        if (record && record.beneficiaryId != null) {
          beneficiaries.add(String(record.beneficiaryId));
        }
        const auditRows =
          record && Array.isArray(record.sideEffectsAudit) ? record.sideEffectsAudit : [];
        if (auditRows.length > 0) transitionsWithSideEffects += 1;
        for (const s of auditRows) {
          flatRows.push({
            ...(s && s.metadata && typeof s.metadata === 'object' ? s.metadata : {}),
            status: s ? s.status : undefined,
          });
        }
      }

      const sideEffectsSummary = summarizeSideEffectResults(flatRows);
      return res.json({
        success: true,
        data: {
          branchId: branchScope || null,
          windowDays: windowDays || null,
          beneficiariesConsidered: beneficiaries.size,
          transitionsConsidered: scoped.length,
          transitionsWithSideEffects,
          sideEffectsSummary,
        },
      });
    } catch (err) {
      return safeError(res, err, 'lifecycle.branch.side-effects-summary');
    }
  });

  // ─── GET /beneficiaries/:beneficiaryId/allowed-transitions ─
  router.get('/beneficiaries/:beneficiaryId/allowed-transitions', (req, res) => {
    try {
      if (!ensurePermission(req, res, 'beneficiary.lifecycle.transitions.list-allowed')) return;
      const currentState = req.query.currentState;
      if (!currentState || !reg.STATES.includes(currentState)) {
        return res.status(400).json({
          success: false,
          message: 'INVALID_CURRENT_STATE',
          reason: 'INVALID_CURRENT_STATE',
          allowed: reg.STATES,
        });
      }
      const transitions = service.getAllowedTransitionsFor({ currentState });
      return res.json({
        success: true,
        data: { transitions, count: transitions.length, currentState },
      });
    } catch (err) {
      return safeError(res, err, 'lifecycle.transition.allowed');
    }
  });

  // ─── GET /_health ───────────────────────────────────────────
  router.get('/_health', (_req, res) => {
    return res.json({
      success: true,
      data: {
        wave: 40,
        states: reg.STATES.length,
        transitions: reg.TRANSITIONS.length,
        statuses: reg.STATUSES.length,
      },
    });
  });

  return router;
}

module.exports = createBeneficiaryLifecycleRouter;
module.exports.createBeneficiaryLifecycleRouter = createBeneficiaryLifecycleRouter;

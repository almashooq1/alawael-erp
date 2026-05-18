'use strict';

/**
 * access-review.routes.js — Wave 72.
 *
 * HTTP surface for the Wave-72 access-review service + the Wave-38
 * simulator. Closes the documented red-team #12 gap ("Wave 38
 * shipped foundations but no routes — Wave 39 work" → Wave 39 went
 * to lifecycle instead).
 *
 * Mounted at /api/v1/access-review behind authenticate.
 *
 *   POST   /attestations
 *           body: { cycleId, reviewType, reviewerId?, reviewerRole,
 *                   targetUserId, targetRole, targetScope,
 *                   criteriaAnswers?, decision, justificationAr?,
 *                   justificationEn?, evidenceLinks?,
 *                   nafathSignatureId?, coSignerNafathIds? }
 *           reviewerId defaults to req.user.id when omitted.
 *           200 { attestation, riskScoreAtDecision } | 4xx
 *
 *   GET    /attestations/:id
 *
 *   GET    /attestations?cycleId=&reviewType=&reviewerId=&targetUserId=
 *                       &decision=&since=&until=&limit=&skip=
 *
 *   GET    /cycles/:cycleId/status
 *
 *   GET    /chain/:targetUserId/verify
 *           → { broken: [...], chainLength }
 *
 *   POST   /simulate/actor
 *           body: { userId, roles[], scope?, isServiceAccount?,
 *                   isTempElevated?, lastUsedAt? }
 *
 *   POST   /simulate/grant
 *           body: { actor, proposedRole }
 *
 *   GET    /registry  — REVIEW_TYPES + DECISIONS + HIGH_SENSITIVITY_ROLES
 *                       + REVIEWER_ROUTING + ACTOR_BUNDLE_CONFLICTS
 *
 * Status code map:
 *   ok                            → 200
 *   PERMISSION_DENIED             → 403
 *   NOT_FOUND                     → 404
 *   REVIEWER_REQUIRED             → 400
 *   TARGET_REQUIRED               → 400
 *   SELF_ATTESTATION              → 403
 *   INVALID_REVIEW_TYPE           → 400
 *   INVALID_DECISION              → 400
 *   JUSTIFICATION_REQUIRED        → 400
 *   COSIGNERS_REQUIRED            → 400
 *   MODEL_VALIDATION_FAILED       → 422
 *   SAVE_FAILED                   → 500
 *   CYCLE_ID_REQUIRED             → 400
 *
 * Permission gates (via governance.hasPermission):
 *   POST /attestations              → access-review.attestation.create
 *   GET  /attestations/:id          → access-review.attestation.read
 *   GET  /attestations              → access-review.attestation.list
 *   GET  /cycles/:cycleId/status    → access-review.cycle.read
 *   GET  /chain/:targetUserId/...   → access-review.chain.verify
 *   POST /simulate/actor            → access-review.simulate
 *   POST /simulate/grant            → access-review.simulate
 *   GET  /registry                  → all-authenticated (no gate)
 */

const express = require('express');
const safeError = require('../utils/safeError');
const reg = require('../intelligence/access-review.registry');

const REASON_TO_STATUS = Object.freeze({
  PERMISSION_DENIED: 403,
  NOT_FOUND: 404,
  REVIEWER_REQUIRED: 400,
  TARGET_REQUIRED: 400,
  SELF_ATTESTATION: 403,
  INVALID_REVIEW_TYPE: 400,
  INVALID_DECISION: 400,
  JUSTIFICATION_REQUIRED: 400,
  COSIGNERS_REQUIRED: 400,
  MODEL_VALIDATION_FAILED: 422,
  SAVE_FAILED: 500,
  CYCLE_ID_REQUIRED: 400,
  // Wave 74 — scheduler reasons
  ACTORS_MUST_BE_ARRAY: 400,
  EVENTS_MUST_BE_ARRAY: 400,
  USERS_MUST_BE_ARRAY: 400,
  SIMULATOR_REQUIRED: 503,
  NOTIFIER_UNAVAILABLE: 503,
  SERVICE_REQUIRED: 503,
  STATUS_LOOKUP_FAILED: 500,
});

function actorFrom(req) {
  return {
    userId: req.user?.id || req.user?._id || null,
    role: req.user?.role || req.user?.roleCode || null,
    ip: req.ip,
  };
}

function respond(res, result) {
  if (result && result.ok) {
    const { ok: _ok, ...data } = result;
    void _ok;
    return res.json({ success: true, data });
  }
  const status = (result && REASON_TO_STATUS[result.reason]) || 400;
  return res.status(status).json({
    success: false,
    message: result?.reason || 'ACCESS_REVIEW_REJECTED',
    reason: result?.reason,
    ...(result?.errors ? { errors: result.errors } : {}),
    ...(result?.error ? { error: result.error } : {}),
  });
}

/**
 * @param {object} opts
 *   - service    — Wave-72 access-review service
 *   - simulator  — Wave-38 simulator (createAccessReviewSimulator output)
 *   - scheduler  — Wave-74 scheduler (optional; when present, exposes
 *                  /cycles + /events/* endpoints)
 *   - governance — Wave-26 governance service (hasPermission)
 *   - logger
 */
function createAccessReviewRouter({
  service,
  simulator,
  scheduler = null,
  governance,
  logger = console,
} = {}) {
  if (!service || typeof service.createAttestation !== 'function') {
    throw new Error('access-review.routes: service is required');
  }
  if (!governance || typeof governance.hasPermission !== 'function') {
    throw new Error('access-review.routes: governance service is required');
  }
  void logger;

  const router = express.Router();

  function requirePerm(code) {
    return (req, res, next) => {
      const actor = actorFrom(req);
      if (!actor.userId) {
        return res
          .status(401)
          .json({ success: false, message: 'AUTH_REQUIRED', reason: 'AUTH_REQUIRED' });
      }
      if (!governance.hasPermission(actor.role, code)) {
        return res.status(403).json({
          success: false,
          message: 'PERMISSION_DENIED',
          reason: 'PERMISSION_DENIED',
          requiredPermission: code,
        });
      }
      return next();
    };
  }

  // POST /attestations
  router.post(
    '/attestations',
    requirePerm('access-review.attestation.create'),
    async (req, res) => {
      try {
        const body = req.body || {};
        const reviewerId = body.reviewerId || req.user?.id || req.user?._id || null;
        const result = await service.createAttestation({ ...body, reviewerId });
        return respond(res, result);
      } catch (err) {
        return safeError(res, err, 'access-review.attestation.create');
      }
    }
  );

  // GET /attestations/:id
  router.get(
    '/attestations/:id',
    requirePerm('access-review.attestation.read'),
    async (req, res) => {
      try {
        const result = await service.getAttestation(req.params.id);
        return respond(res, result);
      } catch (err) {
        return safeError(res, err, 'access-review.attestation.read');
      }
    }
  );

  // GET /attestations  (list with filters)
  router.get('/attestations', requirePerm('access-review.attestation.list'), async (req, res) => {
    try {
      const filter = {
        cycleId: req.query.cycleId,
        reviewType: req.query.reviewType,
        reviewerId: req.query.reviewerId,
        targetUserId: req.query.targetUserId,
        decision: req.query.decision,
        since: req.query.since,
        until: req.query.until,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        skip: req.query.skip ? Number(req.query.skip) : undefined,
      };
      const result = await service.listAttestations(filter);
      return respond(res, result);
    } catch (err) {
      return safeError(res, err, 'access-review.attestation.list');
    }
  });

  // GET /cycles/:cycleId/status
  router.get(
    '/cycles/:cycleId/status',
    requirePerm('access-review.cycle.read'),
    async (req, res) => {
      try {
        const result = await service.getCycleStatus(req.params.cycleId);
        return respond(res, result);
      } catch (err) {
        return safeError(res, err, 'access-review.cycle.status');
      }
    }
  );

  // GET /chain/:targetUserId/verify
  router.get(
    '/chain/:targetUserId/verify',
    requirePerm('access-review.chain.verify'),
    async (req, res) => {
      try {
        const result = await service.verifyHashChain(req.params.targetUserId);
        return respond(res, result);
      } catch (err) {
        return safeError(res, err, 'access-review.chain.verify');
      }
    }
  );

  // POST /simulate/actor
  router.post('/simulate/actor', requirePerm('access-review.simulate'), (req, res) => {
    try {
      if (!simulator || typeof simulator.simulateActor !== 'function') {
        return res.status(503).json({
          success: false,
          message: 'SIMULATOR_UNAVAILABLE',
          reason: 'SIMULATOR_UNAVAILABLE',
        });
      }
      const actor = req.body || {};
      if (actor.lastUsedAt && typeof actor.lastUsedAt === 'string') {
        actor.lastUsedAt = new Date(actor.lastUsedAt);
      }
      const report = simulator.simulateActor(actor);
      return res.json({ success: true, data: report });
    } catch (err) {
      return safeError(res, err, 'access-review.simulate.actor');
    }
  });

  // POST /simulate/grant
  router.post('/simulate/grant', requirePerm('access-review.simulate'), (req, res) => {
    try {
      if (!simulator || typeof simulator.simulateGrant !== 'function') {
        return res.status(503).json({
          success: false,
          message: 'SIMULATOR_UNAVAILABLE',
          reason: 'SIMULATOR_UNAVAILABLE',
        });
      }
      const { actor = {}, proposedRole } = req.body || {};
      if (!proposedRole) {
        return res.status(400).json({
          success: false,
          message: 'PROPOSED_ROLE_REQUIRED',
          reason: 'PROPOSED_ROLE_REQUIRED',
        });
      }
      const result = simulator.simulateGrant(actor, proposedRole);
      return res.json({ success: true, data: result });
    } catch (err) {
      return safeError(res, err, 'access-review.simulate.grant');
    }
  });

  // ─── Wave 74 — Scheduler endpoints (only wired if scheduler provided) ─

  function ensureScheduler(res) {
    if (!scheduler || typeof scheduler.openCycle !== 'function') {
      res.status(503).json({
        success: false,
        message: 'SCHEDULER_UNAVAILABLE',
        reason: 'SCHEDULER_UNAVAILABLE',
      });
      return false;
    }
    return true;
  }

  // POST /cycles  — open a new cycle (manual or cron-triggered)
  router.post('/cycles', requirePerm('access-review.cycle.open'), (req, res) => {
    try {
      if (!ensureScheduler(res)) return undefined;
      const result = scheduler.openCycle({
        cycleId: req.body?.cycleId,
        scope: req.body?.scope ?? null,
        openedBy: req.user?.id || req.user?._id || null,
        openedAt: req.body?.openedAt ?? null,
      });
      return respond(res, result);
    } catch (err) {
      return safeError(res, err, 'access-review.cycle.open');
    }
  });

  // POST /cycles/:cycleId/build  — build reviewer queues
  router.post('/cycles/:cycleId/build', requirePerm('access-review.cycle.build'), (req, res) => {
    try {
      if (!ensureScheduler(res)) return undefined;
      const result = scheduler.buildReviewerQueues({
        cycleId: req.params.cycleId,
        actors: Array.isArray(req.body?.actors) ? req.body.actors : [],
      });
      return respond(res, result);
    } catch (err) {
      return safeError(res, err, 'access-review.cycle.build');
    }
  });

  // POST /cycles/:cycleId/notify  — fan out notifications via unifiedNotifier
  router.post(
    '/cycles/:cycleId/notify',
    requirePerm('access-review.cycle.notify'),
    async (req, res) => {
      try {
        if (!ensureScheduler(res)) return undefined;
        const result = await scheduler.notifyReviewers({
          cycleId: req.params.cycleId,
          queues: Array.isArray(req.body?.queues) ? req.body.queues : [],
        });
        return respond(res, result);
      } catch (err) {
        return safeError(res, err, 'access-review.cycle.notify');
      }
    }
  );

  // POST /cycles/:cycleId/close  — seal the cycle and return the report
  router.post(
    '/cycles/:cycleId/close',
    requirePerm('access-review.cycle.close'),
    async (req, res) => {
      try {
        if (!ensureScheduler(res)) return undefined;
        const result = await scheduler.closeCycle({
          cycleId: req.params.cycleId,
          closedBy: req.user?.id || req.user?._id || null,
          expectedAttestations:
            req.body?.expectedAttestations != null ? Number(req.body.expectedAttestations) : null,
        });
        return respond(res, result);
      } catch (err) {
        return safeError(res, err, 'access-review.cycle.close');
      }
    }
  );

  // POST /events/mover  — event-driven MOVER review trigger
  router.post('/events/mover', requirePerm('access-review.event.mover'), (req, res) => {
    try {
      if (!ensureScheduler(res)) return undefined;
      const result = scheduler.detectMovers({
        cycleId: req.body?.cycleId,
        moverEvents: Array.isArray(req.body?.moverEvents) ? req.body.moverEvents : [],
      });
      return respond(res, result);
    } catch (err) {
      return safeError(res, err, 'access-review.event.mover');
    }
  });

  // POST /events/dormancy-scan  — cron-callable DORMANT scan
  router.post('/events/dormancy-scan', requirePerm('access-review.event.dormancy'), (req, res) => {
    try {
      if (!ensureScheduler(res)) return undefined;
      const result = scheduler.detectDormantAccounts({
        cycleId: req.body?.cycleId,
        users: Array.isArray(req.body?.users) ? req.body.users : [],
        thresholds: req.body?.thresholds || {},
      });
      return respond(res, result);
    } catch (err) {
      return safeError(res, err, 'access-review.event.dormancy');
    }
  });

  // GET /registry  — exposes the static Wave-38 maps for UI rendering
  router.get('/registry', (_req, res) => {
    return res.json({
      success: true,
      data: {
        reviewTypes: reg.REVIEW_TYPES,
        decisions: reg.DECISIONS,
        highSensitivityRoles: reg.HIGH_SENSITIVITY_ROLES,
        reviewerRouting: reg.REVIEWER_ROUTING,
        actorBundleConflicts: reg.ACTOR_BUNDLE_CONFLICTS,
      },
    });
  });

  return router;
}

module.exports = createAccessReviewRouter;
module.exports.createAccessReviewRouter = createAccessReviewRouter;

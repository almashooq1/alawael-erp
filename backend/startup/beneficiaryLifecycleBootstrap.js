'use strict';

/**
 * beneficiaryLifecycleBootstrap.js — Wave 277 Pass 5 of app.js refactor.
 *
 * Extracted verbatim from app.js (~102 LOC) into a single bootstrap
 * function. NO behaviour change — same service-construction order,
 * same `/api/v1/beneficiary-lifecycle` mount with the Wave-95
 * layered MFA middleware stack, same `app._beneficiaryLifecycleService`
 * reference.
 *
 * Beneficiary 360 Phase 2 (Wave 40) ships the HTTP surface for the
 * Wave-39 lifecycle state machine + workflow orchestrator. Every
 * endpoint gates on a `beneficiary.lifecycle.*` permission in
 * governance.registry; the service performs deeper guards (self-
 * approval, Nafath, reasonCode allowlist, reversal window).
 *
 * ── Wave 95 — layered MFA enforcement ────────────────────────────
 *
 * Three-layer guard chain on lifecycle routes:
 *   authenticate → loadMfaActor(mfaSvc) → router → service guard
 *
 * `loadMfaActor` populates req.actor with mfaLevel + mfaAssertedAt
 * from the in-process MFA state map (Wave 86). The actorFrom() helper
 * in the router copies those into the actor the service uses for its
 * tier check.
 *
 * Late binding: `app._mfaChallengeService` is set BEFORE this
 * bootstrap runs (its construction is upstream in app.js). If
 * absent, the middleware is skipped and the service guard sees
 * mfaLevel=0 — HIGH/CRITICAL transitions fail closed with
 * MFA_TIER_REQUIRED until the operator wires MFA. This preserves
 * pre-extract behaviour exactly.
 *
 * @param {import('express').Express} app
 * @param {{ logger: any }} deps
 */
function wireBeneficiaryLifecycle(app, deps = {}) {
  const { logger } = deps;
  if (!app || !logger) {
    throw new Error(
      'beneficiaryLifecycleBootstrap.wireBeneficiaryLifecycle: app + logger required'
    );
  }

  try {
    const {
      createBeneficiaryLifecycleService,
    } = require('../intelligence/beneficiary-lifecycle.service');
    const createBeneficiaryLifecycleRouter = require('../routes/beneficiary-lifecycle.routes');

    let transitionModel = null;
    try {
      transitionModel = require('../models/BeneficiaryLifecycleTransition');
    } catch {
      /* model optional in test/dev — router fails gracefully without it */
    }

    let beneficiaryModel = null;
    try {
      beneficiaryModel = require('../models/Beneficiary');
    } catch {
      /* same */
    }

    let auditLogger = null;
    try {
      const { auditLogService } = require('../services/auditLog.service');
      if (auditLogService && typeof auditLogService.log === 'function') {
        auditLogger = auditLogService;
      }
    } catch {
      /* audit optional */
    }

    if (transitionModel) {
      const lifecycleSvc = createBeneficiaryLifecycleService({
        transitionLog: transitionModel,
        beneficiaryModel,
        // No side-effect handlers wired in Wave 40 — those land in Wave 41+
        // alongside scheduler / care-team / notification wiring.
        sideEffectHandlers: {},
        auditLogger,
        logger,
        // Wave 95 — production routes now enforce the Wave-86 MFA tier
        // guard. Off by default for unit tests that construct the
        // service without an actor; the route layer below loads
        // req.actor via loadMfaActor middleware so the guard sees a
        // real mfaLevel + mfaAssertedAt.
        enforceMfa: true,
      });

      let governanceSvc = null;
      try {
        const { createGovernanceService } = require('../intelligence/governance.service');
        governanceSvc = createGovernanceService({ logger });
      } catch {
        /* governance service should always load; logged at top */
      }

      if (governanceSvc) {
        const { authenticate: blAuthMw } = require('../middleware/auth');
        // Wave 95 — Layered MFA enforcement on lifecycle routes:
        //   authenticate → loadMfaActor(mfaSvc) → router → service guard
        // The middleware populates req.actor with mfaLevel + mfaAssertedAt
        // from the in-process MFA state map (Wave 86). The actorFrom()
        // helper in the router copies those fields into the actor object
        // the service uses for its tier check. If the MFA service didn't
        // load (try/catch above), we skip the middleware and the service
        // guard sees mfaLevel=0 — which means HIGH/CRITICAL transitions
        // fail closed with MFA_TIER_REQUIRED until the operator fixes MFA.
        const mfaActorMiddlewares = [];
        if (app._mfaChallengeService) {
          const { loadMfaActor } = require('../middleware/mfa-actor');
          mfaActorMiddlewares.push(loadMfaActor(app._mfaChallengeService));
        }
        app.use(
          '/api/v1/beneficiary-lifecycle',
          blAuthMw,
          ...mfaActorMiddlewares,
          createBeneficiaryLifecycleRouter({
            service: lifecycleSvc,
            governance: governanceSvc,
            logger,
          })
        );
        app._beneficiaryLifecycleService = lifecycleSvc;
        logger.info(
          '[BeneficiaryLifecycle] ✓ Phase 2 routes mounted at /api/v1/beneficiary-lifecycle'
        );
      } else {
        logger.warn('[BeneficiaryLifecycle] routes skipped: governance service unavailable');
      }
    } else {
      logger.warn(
        '[BeneficiaryLifecycle] routes skipped: BeneficiaryLifecycleTransition model not loaded'
      );
    }
  } catch (blErr) {
    logger.warn('[BeneficiaryLifecycle] routes skipped:', blErr.message);
  }
}

module.exports = { wireBeneficiaryLifecycle };

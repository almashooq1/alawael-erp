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

    // ── Wave 583 — wire the lifecycle side-effect handlers ────────────────
    // Until this wave the service ran with `sideEffectHandlers: {}`, so every
    // declared side-effect (≈40 ops across 15 transitions, including the
    // clinically-critical `record_deceased` effects from Wave 581) was a
    // silent no-op. The factory below derives a registry-complete handler map
    // from `beneficiary-lifecycle.registry` so nothing falls through to the
    // 'no handler wired' branch:
    //   • end-active-schedules → cancel the beneficiary's FUTURE appointments
    //   • close-open-episodes  → close the beneficiary's OPEN episodes of care
    //   • every other op       → categorized deferred emit (notification /
    //                            compliance / workflow) onto `eventSink`.
    let lifecycleSideEffectHandlers = {};
    try {
      const {
        createBeneficiaryLifecycleSideEffectHandlers,
      } = require('../intelligence/beneficiary-lifecycle-side-effects.service');

      let appointmentModel = null;
      try {
        appointmentModel = require('../models/Appointment');
      } catch {
        /* appointment model optional — handler self-skips if absent */
      }

      let episodeModel = null;
      try {
        episodeModel = require('../domains/episodes/models/EpisodeOfCare');
      } catch {
        /* episode model optional — handler self-skips if absent */
      }

      lifecycleSideEffectHandlers = createBeneficiaryLifecycleSideEffectHandlers({
        appointmentModel,
        episodeModel,
        // Deferred ops emit a structured `beneficiary.lifecycle.side_effect`
        // event so existing notification / compliance / workflow infra can
        // pick them up. Until a dedicated bus is wired here we log them so the
        // intent is observable rather than silent.
        eventSink: (eventName, payload) => {
          logger.info(`[BeneficiaryLifecycle] ${eventName}`, payload);
        },
        logger,
      });
      logger.info(
        `[BeneficiaryLifecycle] ✓ side-effect handlers wired (${Object.keys(lifecycleSideEffectHandlers).length} ops)`
      );
    } catch (seErr) {
      logger.warn('[BeneficiaryLifecycle] side-effect handlers not wired:', seErr.message);
    }

    if (transitionModel) {
      const lifecycleSvc = createBeneficiaryLifecycleService({
        transitionLog: transitionModel,
        beneficiaryModel,
        // Wave 583 — registry-complete side-effect handlers (see above).
        sideEffectHandlers: lifecycleSideEffectHandlers,
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

'use strict';

/**
 * accessReviewBootstrap.js — Wave 277 Pass 4 of app.js refactor.
 *
 * Extracted verbatim from app.js (~114 LOC) into a single bootstrap
 * function. NO behaviour change — same service-construction order,
 * same `/api/v1/access-review` mount, same 4 `app._accessReviewXxx`
 * references for cross-feature consumers.
 *
 * Access Review (Waves 72 + 74 + 80) closes red-team finding #12:
 *   • Wave 38 — registry + simulator + AccessReviewAttestation model
 *   • Wave 72 — workflow + hash chain + cycle status + chain verification
 *   • Wave 74 — operational scheduler (notifier + audience resolver)
 *   • Wave 80 — cycle templates resolver
 *
 * Every endpoint gates on `access-review.*` permission codes added to
 * governance.registry in Wave 72. Graceful degradation: missing model
 * → router skipped with a warning, no crash.
 *
 * Late binding: `arResolveAudience` reads `app._resolveUsersForRole`
 * at call time (set by alerts/priority engine, Waves 11-16) — same
 * pattern as carePlanningBootstrap (Pass 3).
 *
 * @param {import('express').Express} app
 * @param {{ logger: any }} deps
 */
function wireAccessReview(app, deps = {}) {
  const { logger } = deps;
  if (!app || !logger) {
    throw new Error('accessReviewBootstrap.wireAccessReview: app + logger required');
  }

  try {
    const { createAccessReviewService } = require('../intelligence/access-review.service');
    const {
      createAccessReviewSimulator,
    } = require('../intelligence/access-review-simulator.service');
    const createAccessReviewRouter = require('../routes/access-review.routes');

    let attestationModel = null;
    try {
      attestationModel = require('../models/AccessReviewAttestation');
    } catch {
      /* model optional in test/dev — router skipped if absent */
    }

    if (attestationModel) {
      let anchorLedger = null;
      try {
        const { anchorLedgerService } = require('../services/anchorLedger.service');
        if (anchorLedgerService && typeof anchorLedgerService.commit === 'function') {
          anchorLedger = anchorLedgerService;
        }
      } catch {
        /* anchor optional — HIGH-sensitivity attestations skip the ledger commit */
      }

      const simulator = createAccessReviewSimulator({ logger });
      const accessReviewSvc = createAccessReviewService({
        attestationModel,
        simulator,
        anchorLedger,
        logger,
      });

      // Wave 74 — operational scheduler. Wires unifiedNotifier when
      // available so reviewer queues can ship inbox notifications;
      // otherwise notifyReviewers returns NOTIFIER_UNAVAILABLE 503.
      let arNotifier = null;
      try {
        const unified = require('../services/unifiedNotifier');
        if (unified && typeof unified.send === 'function') arNotifier = unified;
      } catch {
        /* optional */
      }
      const arResolveAudience = async (role, branchId) => {
        if (typeof app._resolveUsersForRole === 'function') {
          try {
            return await app._resolveUsersForRole(role, branchId);
          } catch {
            return [];
          }
        }
        return [];
      };
      const {
        createAccessReviewScheduler,
      } = require('../intelligence/access-review-scheduler.service');
      const accessReviewScheduler = createAccessReviewScheduler({
        service: accessReviewSvc,
        simulator,
        notifier: arNotifier,
        resolveAudienceForRole: arResolveAudience,
        logger,
      });

      // Wave 80 — Cycle templates resolver (pure registry passthrough).
      const {
        createAccessReviewTemplatesService,
      } = require('../intelligence/access-review-templates.service');
      const accessReviewTemplates = createAccessReviewTemplatesService({ logger });

      let governanceSvc = null;
      try {
        const { createGovernanceService } = require('../intelligence/governance.service');
        governanceSvc = createGovernanceService({ logger });
      } catch {
        /* governance must load — top-level boot already logged the failure */
      }

      if (governanceSvc) {
        const { authenticate: arAuthMw } = require('../middleware/auth');
        app.use(
          '/api/v1/access-review',
          arAuthMw,
          createAccessReviewRouter({
            service: accessReviewSvc,
            simulator,
            scheduler: accessReviewScheduler,
            templatesService: accessReviewTemplates,
            governance: governanceSvc,
            logger,
          })
        );
        app._accessReviewService = accessReviewSvc;
        app._accessReviewSimulator = simulator;
        app._accessReviewScheduler = accessReviewScheduler;
        app._accessReviewTemplates = accessReviewTemplates;
        logger.info(
          '[AccessReview] ✓ Wave 72+74+80 routes mounted at /api/v1/access-review (closes red-team #12; scheduler + templates ready)'
        );
      } else {
        logger.warn('[AccessReview] routes skipped: governance service unavailable');
      }
    } else {
      logger.warn('[AccessReview] routes skipped: AccessReviewAttestation model not loaded');
    }
  } catch (arErr) {
    logger.warn('[AccessReview] routes skipped:', arErr.message);
  }
}

module.exports = { wireAccessReview };

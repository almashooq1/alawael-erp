'use strict';

/**
 * carePlanningBootstrap.js — Wave 277 Pass 3 of app.js refactor.
 *
 * Extracted verbatim from app.js (~138 LOC) into a single bootstrap
 * function so the entry point shrinks. NO behaviour change — same
 * `bootstrapCarePlanning(...)` call, same dependency-loading order,
 * same `app.use('/api/v1/care-plans', ...)` mount, same 7
 * `app._carePlanXxx` references for cross-feature consumers.
 *
 * Care Planning Engine spans Waves 41-48:
 *   • Wave 41 — CarePlanVersion model + validator + service
 *   • Wave 42 — 24 endpoints (extended each subsequent wave)
 *   • Wave 43 — family-version generator
 *   • Wave 44 — recommendation builder + validator + progress reviewer
 *   • Wave 45 — side-effect handlers + audit-trail aggregator
 *   • Wave 46 — programs library + group-plan service
 *   • Wave 47 — 6 report generators
 *   • Wave 48 — explanation + role-views + LLM caller
 *
 * All dependencies are optional except CarePlanVersion + governance.
 * Missing deps degrade gracefully (no notifier → side-effects log + skip).
 *
 * ── Late binding ─────────────────────────────────────────────────
 *
 * `resolveAudienceForRole` reads `app._resolveUsersForRole` AT CALL
 * TIME — that helper is set by the Alerts/Priority engine (Waves
 * 11-16) which runs LATER in app.js startup. Late-binding preserves
 * the original behaviour: if alerts isn't ready yet, returns []; once
 * alerts mounts, the resolver works.
 *
 * @param {import('express').Express} app
 * @param {{ logger: any }} deps
 */
function wireCarePlanning(app, deps = {}) {
  const { logger } = deps;
  if (!app || !logger) {
    throw new Error('carePlanningBootstrap.wireCarePlanning: app + logger required');
  }

  try {
    const { bootstrapCarePlanning } = require('../intelligence/care-plan-bootstrap');

    let CarePlanVersion = null;
    try {
      CarePlanVersion = require('../models/CarePlanVersion');
    } catch (_) {
      /* model optional — care-plan routes won't mount without it */
    }

    if (CarePlanVersion) {
      let governanceSvc = null;
      try {
        const { createGovernanceService } = require('../intelligence/governance.service');
        governanceSvc = createGovernanceService({ logger });
      } catch (_) {
        /* governance must be available */
      }

      if (governanceSvc) {
        // Optional shared infrastructure — bootstrap accepts each as null.
        let cpAuditLogger = null;
        try {
          const { auditLogService } = require('../services/auditLog.service');
          if (auditLogService && typeof auditLogService.log === 'function') {
            cpAuditLogger = auditLogService;
          }
        } catch (_) {
          /* audit optional */
        }

        let cpNotifier = null;
        try {
          const unified = require('../services/unifiedNotifier');
          if (unified && typeof unified.send === 'function') cpNotifier = unified;
        } catch (_) {
          /* notifier optional */
        }

        let BeneficiaryFile = null;
        try {
          BeneficiaryFile = require('../models/BeneficiaryFile');
        } catch (_) {
          /* file model optional */
        }

        let anchorLedger = null;
        try {
          const { anchorLedgerService } = require('../services/anchorLedger.service');
          if (anchorLedgerService && typeof anchorLedgerService.commit === 'function') {
            anchorLedger = anchorLedgerService;
          }
        } catch (_) {
          /* anchor optional */
        }

        // Late-bind audience resolution to the existing app helper (set
        // elsewhere by the Alert/Priority Engine, Wave 11–16). Falls back
        // to an empty list if the helper isn't ready yet.
        const resolveAudienceForRole = async (role, branchId) => {
          if (typeof app._resolveUsersForRole === 'function') {
            try {
              return await app._resolveUsersForRole(role, branchId);
            } catch (_) {
              return [];
            }
          }
          return [];
        };

        // Optional Anthropic client — only wired when ANTHROPIC_API_KEY is set
        let anthropicClient = null;
        if (process.env.ANTHROPIC_API_KEY) {
          try {
            const Anthropic = require('@anthropic-ai/sdk');
            anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
          } catch (_) {
            logger.warn(
              '[CarePlan] ANTHROPIC_API_KEY set but @anthropic-ai/sdk not installed — LLM caller disabled'
            );
          }
        }

        // W1253 — ADR-040 (b): hand the engine the UI's care-plan model so the
        // W50 overdue scanner sees UI-authored plans. Optional; fail-soft.
        let UnifiedCarePlanModel = null;
        try {
          UnifiedCarePlanModel =
            require('../domains/care-plans/models/UnifiedCarePlan').UnifiedCarePlan || null;
        } catch (_e) {
          /* optional — engine degrades to legacy-only scanning */
        }

        const careplan = bootstrapCarePlanning({
          CarePlanVersion,
          UnifiedCarePlan: UnifiedCarePlanModel,
          BeneficiaryFile,
          governance: governanceSvc,
          notifier: cpNotifier,
          auditLogger: cpAuditLogger,
          anchorLedger,
          resolveAudienceForRole,
          anthropicClient,
          logger,
        });

        const { authenticate: cpAuthMw } = require('../middleware/auth');
        // W1551: the router carries branch-isolation machinery (bodyScopedBeneficiaryGuard,
        // router.param('id', branchScopedResourceParam), effectiveBranchScope in listPlans),
        // but ALL of it no-ops unless requireBranchAccess has populated req.branchScope.
        // Without this middleware the entire care-plan surface (beneficiary PHI + clinical
        // lifecycle) was open cross-branch IDOR. requireBranchAccess resolves the user's
        // branch from the JWT or the W930 DB-enrichment and sets req.branchScope.
        const { requireBranchAccess } = require('../middleware/branchScope.middleware');
        app.use('/api/v1/care-plans', cpAuthMw, requireBranchAccess, careplan.router);

        // Expose service + sub-modules on app for cross-feature integration
        app._carePlanService = careplan.service;
        app._carePlanHandlers = careplan.sideEffectHandlers;
        app._carePlanLLM = careplan.llmCaller;
        app._carePlanReports = careplan.reportGenerator;
        app._carePlanRoleViews = careplan.roleViews;
        app._carePlanGroupService = careplan.groupPlan;
        app._carePlanProgramsLibrary = careplan.programsLibrary;
        // W973 — expose the background workers (overdue-review scanner W50 +
        // family-retry worker W45). bootstrapCarePlanning builds them with a
        // `runOnce()` contract and explicitly leaves scheduling to the caller;
        // startup/carePlanWorkersBootstrap.js consumes this (env-gated, default OFF).
        app._carePlanWorkers = careplan.workers;

        logger.info(
          '[CarePlan] ✓ Engine mounted at /api/v1/care-plans (Waves 41–48: 24 endpoints, ' +
            '8 plan types, 13 statuses, 13 transitions, 17 validation rules, ' +
            (anthropicClient ? 'LLM caller live' : 'LLM caller disabled — no ANTHROPIC_API_KEY') +
            ')'
        );
      } else {
        logger.warn('[CarePlan] routes skipped: governance service unavailable');
      }
    } else {
      logger.warn('[CarePlan] routes skipped: CarePlanVersion model not loaded');
    }
  } catch (cpErr) {
    logger.warn('[CarePlan] routes skipped:', cpErr.message);
  }
}

module.exports = { wireCarePlanning };

'use strict';

/**
 * care-plan-bootstrap.js — Wave 48.
 *
 * Single composition root for the care-planning engine. Wires together:
 *
 *   • CarePlanVersion Mongoose model        (Wave 41)
 *   • care-plan validator service           (Wave 41)
 *   • care-plan main service                (Wave 41)
 *   • care-plan routes                      (Wave 42)
 *   • family-version generator              (Wave 43)
 *   • arabic-readability helper             (Wave 43)
 *   • recommendation builder + validator    (Wave 44)
 *   • progress reviewer                     (Wave 44)
 *   • side-effect handlers                  (Wave 45)
 *   • audit-trail aggregator                (Wave 45)
 *   • programs library                      (Wave 46)
 *   • group-plan service                    (Wave 46)
 *   • report generator (6 reports)          (Wave 47)
 *   • explanation generator                 (Wave 48)
 *   • role-views renderer                   (Wave 48)
 *   • LLM caller                            (Wave 48)
 *
 * Usage in app.js:
 *
 *   const { bootstrapCarePlanning } = require('./intelligence/care-plan-bootstrap');
 *   const careplan = bootstrapCarePlanning({
 *     CarePlanVersion: require('./models/CarePlanVersion'),
 *     BeneficiaryFile: require('./models/BeneficiaryFile'),  // optional
 *     governance: governanceService,                          // Wave-26
 *     notifier: unifiedNotifier,                              // existing
 *     familyChannelClient: smsClient,                         // existing
 *     auditLogger: auditLogger,
 *     anchorLedger: anchorLedger,
 *     resolveAudienceForRole: app._resolveUsersForRole,
 *     anthropicClient: anthropicClient,                       // optional
 *   });
 *   app.use('/api/v1/care-plans', authenticate, careplan.router);
 *
 * The function returns a frozen object: { router, service, handlers,
 * validator, llmCaller, reportGenerator, explanationGenerator,
 * roleViews, groupPlan, programsLibrary, auditTrail }.
 *
 * Every dependency is OPTIONAL except `CarePlanVersion` and `governance`.
 * Missing optional deps degrade gracefully (e.g. no LLM caller → the
 * `/recommendations/validate` endpoint still works; no anthropicClient
 * → no `recommend()` method on llmCaller).
 */

const { createCarePlanValidator } = require('./care-plan-validator.service');
const { createCarePlanService } = require('./care-plan.service');
const {
  createCarePlanSideEffectHandlers,
  HANDLER_NAMES,
} = require('./care-plan-side-effects.service');
const { createCarePlanLLMCaller } = require('./care-plan-llm-caller.service');
const recommendationBuilder = require('./care-plan-recommendation-builder.service');
const progressReviewer = require('./care-plan-progress-reviewer.service');
const auditTrail = require('./care-plan-audit-trail.service');
const familyGen = require('./family-version-generator.service');
const readability = require('./arabic-readability.service');
const programsLibrary = require('./care-plan-programs-library.registry');
const groupPlanService = require('./group-plan.service');
const reportGenerator = require('./care-plan-report-generator.service');
const explanationGenerator = require('./care-plan-explanation-generator.service');
const roleViews = require('./care-plan-role-views.service');
const careRouterFactory = require('../routes/care-plan.routes');
const { createCarePlanMetrics } = require('./care-plan-metrics.service');
const { createFamilyRetryWorker } = require('./care-plan-family-retry.worker');
const { createOverdueReviewScanner } = require('./care-plan-overdue-review.scanner');
const { createPlateauDetectorScheduler } = require('./care-plan-plateau-detector.scheduler');

function bootstrapCarePlanning(opts = {}) {
  const {
    CarePlanVersion,
    UnifiedCarePlan = null, // W1253 — optional second scan source (ADR-040 (b))
    BeneficiaryFile = null,
    governance,
    notifier = null,
    familyChannelClient = null,
    auditLogger = null,
    anchorLedger = null,
    resolveAudienceForRole = null,
    anthropicClient = null,
    promClient = null,
    metricsRegistry = null,
    insightEmitter = null,
    collectProgressSignals = null,
    logger = console,
    now = () => new Date(),
    sideEffectHandlersOverride = null,
  } = opts;

  if (!CarePlanVersion) {
    throw new Error('care-plan-bootstrap: CarePlanVersion model is required');
  }
  if (!governance || typeof governance.hasPermission !== 'function') {
    throw new Error('care-plan-bootstrap: governance service with hasPermission is required');
  }

  // 1. Metrics facade — no-op when prom-client absent. Built first
  //    so the service + workers can emit during their construction.
  const metrics = createCarePlanMetrics({ promClient, registry: metricsRegistry });

  // 2. Validator (pure)
  const validator = createCarePlanValidator({
    // resolveEvidenceRef can be overridden by the caller via opts; left null
    // by default — the validator skips that rule when no resolver is wired.
    resolveEvidenceRef: opts.resolveEvidenceRef || null,
    now,
    logger,
  });

  // 2.5 Side-effect handlers (metrics flow into family-send outcome)
  const sideEffectHandlers =
    sideEffectHandlersOverride ||
    createCarePlanSideEffectHandlers({
      notifier,
      beneficiaryFileModel: BeneficiaryFile,
      familyChannelClient,
      auditLogger,
      resolveAudienceForRole,
      now,
      logger,
      metrics,
    });

  // 3. Main service — pass the side-effect handlers in keyed by the
  //    `care-plan.<transitionId>` convention the service expects
  const service = createCarePlanService({
    planVersionModel: CarePlanVersion,
    validator,
    sideEffectHandlers,
    metrics,
    notifier:
      notifier && typeof notifier.send === 'function'
        ? async ({ event, payload, actor }) => {
            try {
              await notifier.send({ event, audience: [], payload, actor });
            } catch (err) {
              logger.warn && logger.warn(`[care-plan] notifier.send threw: ${err.message}`);
            }
          }
        : null,
    auditLogger,
    anchorLedger,
    logger,
    now,
  });

  // computeSignatureHash is now exposed by the service factory itself
  // (derives from planVersionModel.computeSignatureHash by default).

  // 4. LLM caller (optional)
  let llmCaller = null;
  if (anthropicClient) {
    // Wave 134: optionally persist telemetry (TTL 30d).
    let llmTelemetryModel = null;
    try {
      llmTelemetryModel = require('../models/LlmTelemetryCall');
    } catch {
      /* model missing — telemetry stays in-memory only */
    }
    llmCaller = createCarePlanLLMCaller({
      client: anthropicClient,
      validator: {
        isGoalSmart: validator.isGoalSmart,
        resolveEvidenceRef: opts.resolveEvidenceRef || null,
      },
      telemetryPersistModel: llmTelemetryModel,
      logger,
    });
    // Wave 131: register in the cross-service LLM telemetry registry
    // so /api/v1/ai/llm-telemetry can aggregate care-plan alongside
    // parent-chatbot. Best-effort — registry failures don't block
    // care-plan bootstrap.
    try {
      const { getDefaultRegistry } = require('./llm-registry.lib');
      getDefaultRegistry({ logger }).register('care-plan', llmCaller);
    } catch (regErr) {
      if (logger && typeof logger.warn === 'function') {
        logger.warn(`[care-plan] llm-registry registration failed: ${regErr.message}`);
      }
    }
  }

  // 6. Background workers (caller is responsible for scheduling)
  const familyRetryWorker = createFamilyRetryWorker({
    planVersionModel: CarePlanVersion,
    unifiedPlanModel: UnifiedCarePlan, // W1254 — UI-authored plans now served too
    sideEffectHandlers,
    logger,
    now,
    metrics,
  });

  const overdueReviewScanner = createOverdueReviewScanner({
    planVersionModel: CarePlanVersion,
    unifiedPlanModel: UnifiedCarePlan, // W1253 — UI-authored plans now scanned too
    notifier: notifier && typeof notifier.send === 'function' ? notifier : null,
    resolveAudienceForRole,
    logger,
    now,
    metrics,
  });

  // Plateau scheduler needs a collectSignals fn; if caller didn't wire one,
  // we expose the scheduler but it will refuse to run.
  let plateauScheduler = null;
  if (typeof collectProgressSignals === 'function') {
    plateauScheduler = createPlateauDetectorScheduler({
      planVersionModel: CarePlanVersion,
      collectSignals: collectProgressSignals,
      notifier: notifier && typeof notifier.send === 'function' ? notifier : null,
      insightEmitter,
      resolveAudienceForRole,
      logger,
      now,
      metrics,
    });
  }

  // 7. Router
  const router = careRouterFactory({ service, governance, logger });

  return Object.freeze({
    router,
    service,
    validator,
    sideEffectHandlers,
    handlerNames: HANDLER_NAMES,
    llmCaller,
    metrics,
    workers: {
      familyRetry: familyRetryWorker,
      overdueReview: overdueReviewScanner,
      plateauDetector: plateauScheduler,
    },
    // Pure helpers (re-exposed)
    recommendationBuilder,
    progressReviewer,
    auditTrail,
    familyGen,
    readability,
    programsLibrary,
    groupPlan: groupPlanService,
    reportGenerator,
    explanationGenerator,
    roleViews,
  });
}

module.exports = {
  bootstrapCarePlanning,
};

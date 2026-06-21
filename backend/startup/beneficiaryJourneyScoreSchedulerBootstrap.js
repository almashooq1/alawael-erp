'use strict';

/**
 * beneficiaryJourneyScoreSchedulerBootstrap.js — Wave 0 (Phase 4).
 *
 * Wires the score-driven auto-transition scheduler after the lifecycle service
 * is available (it is stashed on `app._beneficiaryLifecycleService` by
 * `beneficiaryLifecycleBootstrap`). This bootstrap is intentionally separate
 * from `setupSchedulers` because the lifecycle service is mounted late in
 * app.js and the scheduler depends on it.
 */

const { registerShutdownHook } = require('../utils/gracefulShutdown');

function wireBeneficiaryJourneyScoreScheduler(app, deps = {}) {
  const { logger } = deps;
  if (!app || !logger) {
    throw new Error('beneficiaryJourneyScoreSchedulerBootstrap: app + logger required');
  }

  if (process.env.BENEFICIARY_JOURNEY_SCORE_SCHEDULER_DISABLED === 'true') {
    logger.info('[BeneficiaryJourneyScoreScheduler] disabled via env');
    return null;
  }

  if (
    process.env.NODE_ENV === 'test' &&
    process.env.BENEFICIARY_JOURNEY_SCORE_SCHEDULER_DISABLED !== 'false'
  ) {
    logger.info(
      '[BeneficiaryJourneyScoreScheduler] skipped in test environment (set BENEFICIARY_JOURNEY_SCORE_SCHEDULER_DISABLED=false to force-start)'
    );
    return null;
  }

  const lifecycleService = app._beneficiaryLifecycleService;
  if (!lifecycleService) {
    logger.warn(
      '[BeneficiaryJourneyScoreScheduler] skipped: app._beneficiaryLifecycleService not available'
    );
    return null;
  }

  try {
    const {
      createBeneficiaryJourneyScoreScheduler,
    } = require('../intelligence/beneficiary-journey-score.scheduler');

    const Beneficiary = require('../models/Beneficiary');
    const BeneficiaryJourneyScore = require('../models/BeneficiaryJourneyScore');
    const BeneficiaryLifecycleTransition = require('../models/BeneficiaryLifecycleTransition');

    // Optional signal models — loaded if they exist, otherwise scoring falls back
    // to the beneficiary master record only.
    const optionalModels = {};
    const tryRequire = path => {
      try {
        const mod = require(path);
        // Some model files export the model directly; others export an object.
        return mod.default || mod;
      } catch {
        return null;
      }
    };
    optionalModels.assessmentModel = tryRequire('../models/Assessment');
    optionalModels.clinicalAssessmentModel = tryRequire('../models/ClinicalAssessment');
    optionalModels.goalModel = tryRequire('../models/Goal');
    optionalModels.therapeuticGoalModel =
      tryRequire('../domains/goals/models/TherapeuticGoal')?.TherapeuticGoal || null;
    optionalModels.icfAssessmentModel = tryRequire('../models/icf/ICFAssessment.model');
    optionalModels.gasScoreSnapshotModel = tryRequire('../models/GasScoreSnapshot');
    optionalModels.episodeModel =
      tryRequire('../domains/episodes/models/EpisodeOfCare')?.EpisodeOfCare || null;

    let cron = null;
    try {
      cron = require('node-cron');
    } catch (cronErr) {
      logger.warn(
        '[BeneficiaryJourneyScoreScheduler] node-cron not available, scheduler not started:',
        cronErr.message
      );
      return null;
    }

    const { integrationBus } = require('../integration/systemIntegrationBus');

    const scheduler = createBeneficiaryJourneyScoreScheduler({
      beneficiaryModel: Beneficiary,
      journeyScoreModel: BeneficiaryJourneyScore,
      transitionLog: BeneficiaryLifecycleTransition,
      lifecycleService,
      integrationBus,
      logger,
      ...optionalModels,
    });

    const schedule = process.env.BENEFICIARY_JOURNEY_SCORE_CRON || '0 */6 * * *';
    scheduler.start({ schedule, cron, runOnStart: false });
    registerShutdownHook('BeneficiaryJourneyScoreScheduler', scheduler.stop);

    logger.info(`[BeneficiaryJourneyScoreScheduler] ✓ started on schedule ${schedule}`);
    return scheduler;
  } catch (err) {
    logger.warn('[BeneficiaryJourneyScoreScheduler] failed to start:', err.message);
    return null;
  }
}

module.exports = { wireBeneficiaryJourneyScoreScheduler };

'use strict';
/**
 * riskSweeperBootstrap.js — Wave 288.
 *
 * Wires the Risk Sweeper service onto `app._riskSweeperService` (so
 * routes / debug tools can invoke it manually) and optionally schedules
 * a daily cron sweep per configured branch.
 *
 * Env contract:
 *   ENABLE_RISK_SWEEP_CRON=true        — opt-in flag (default off).
 *   RISK_SWEEP_BRANCH_IDS=b1,b2,...    — required when cron is on.
 *   RISK_SWEEP_CRON='0 2 * * *'        — optional override (default daily @02:00 KSA).
 */

const mongoose = require('mongoose');

function loadOptional(modulePath) {
  try {
    return require(modulePath);
  } catch {
    return null;
  }
}

function wireRiskSweeper(app, deps = {}) {
  const logger = deps.logger || console;

  const { getBeneficiaryRiskProfile } = require('../intelligence/risk');
  const { RiskSweeperService } = require('../services/risk-sweeper.service');
  const RiskSnapshot = require('../models/RiskSnapshot');

  // Resolve optional models lazily — keeps boot resilient when stubs absent.
  const Beneficiary = (() => {
    try {
      return mongoose.model('Beneficiary');
    } catch {
      return null;
    }
  })();
  const AiAlert = (() => {
    try {
      return mongoose.model('AiAlert');
    } catch {
      return null;
    }
  })();

  if (!Beneficiary) {
    logger.warn('[startup] risk-sweeper: Beneficiary model not registered — service NOT wired');
    return;
  }

  // ── Wave 290: optional plan-review trigger (CRITICAL review on escalation) ──
  let planReviewService = null;
  let onAlertRaised = null;
  const hooks = [];
  try {
    const CarePlan = (() => {
      try {
        return mongoose.model('CarePlan');
      } catch {
        return null;
      }
    })();
    const PlanReview = (() => {
      try {
        return mongoose.model('PlanReview');
      } catch {
        return null;
      }
    })();
    if (CarePlan && PlanReview) {
      const { RiskPlanReviewService } = require('../services/risk-plan-review.service');
      planReviewService = new RiskPlanReviewService({
        CarePlanModel: CarePlan,
        PlanReviewModel: PlanReview,
        logger,
      });
      hooks.push(ctx => planReviewService.triggerOnEscalation(ctx));
      app._riskPlanReviewService = planReviewService;
      logger.info('[startup] risk-plan-review service wired (W290)');
    } else {
      logger.warn(
        '[startup] risk-plan-review: CarePlan or PlanReview model missing — auto-review NOT wired'
      );
    }
  } catch (err) {
    logger.warn('[startup] risk-plan-review wiring failed', { err: err && err.message });
  }

  // ── Wave 293: optional family-notification on first-critical ──
  try {
    if (AiAlert) {
      const { RiskFamilyNotifyService } = require('../services/risk-family-notify.service');
      const familyNotifier = new RiskFamilyNotifyService({
        AiAlertModel: AiAlert,
        logger,
      });
      hooks.push(ctx => familyNotifier.notifyIfFirstCritical(ctx));
      app._riskFamilyNotifier = familyNotifier;
      logger.info('[startup] risk-family-notify service wired (W293)');
    } else {
      logger.warn('[startup] risk-family-notify: AiAlert missing — notifier NOT wired');
    }
  } catch (err) {
    logger.warn('[startup] risk-family-notify wiring failed', { err: err && err.message });
  }

  if (hooks.length) {
    onAlertRaised = async ctx => {
      for (const fn of hooks) {
        try {
          await fn(ctx);
        } catch (err) {
          logger.warn('[risk-sweeper] post-alert hook failed', {
            err: err && err.message,
          });
        }
      }
    };
  }

  const service = new RiskSweeperService({
    getProfile: getBeneficiaryRiskProfile,
    BeneficiaryModel: Beneficiary,
    RiskSnapshotModel: RiskSnapshot,
    AiAlertModel: AiAlert,
    onAlertRaised,
    logger,
  });
  app._riskSweeperService = service;
  logger.info('[startup] risk-sweeper service wired (W288)');

  // ── Wave 292: plan-review SLA service (acknowledge + overdue sweep) ──
  try {
    const PlanReview = (() => {
      try {
        return mongoose.model('PlanReview');
      } catch {
        return null;
      }
    })();
    if (PlanReview && AiAlert) {
      const { PlanReviewSlaService } = require('../services/plan-review-sla.service');
      const slaService = new PlanReviewSlaService({
        PlanReviewModel: PlanReview,
        AiAlertModel: AiAlert,
        BeneficiaryModel: Beneficiary,
        logger,
      });
      app._planReviewSlaService = slaService;
      logger.info('[startup] plan-review SLA service wired (W292)');

      const slaCronEnabled =
        String(process.env.ENABLE_PLAN_REVIEW_SLA_CRON || '').toLowerCase() === 'true';
      if (slaCronEnabled) {
        const cronMod = loadOptional('node-cron');
        const slaBranchIds = String(process.env.PLAN_REVIEW_SLA_BRANCH_IDS || '')
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);
        if (cronMod && slaBranchIds.length) {
          const slaSchedule = process.env.PLAN_REVIEW_SLA_CRON || '15 * * * *'; // hourly @ :15
          const slaTask = cronMod.schedule(
            slaSchedule,
            async () => {
              for (const branchId of slaBranchIds) {
                try {
                  await slaService.sweep({ branchId });
                } catch (err) {
                  logger.error('[plan-review-sla:cron] branch failed', {
                    branchId,
                    err: err && err.message,
                  });
                }
              }
            },
            { timezone: 'Asia/Riyadh' }
          );
          app._planReviewSlaCronTask = slaTask;
          logger.info('[startup] plan-review SLA cron scheduled', {
            schedule: slaSchedule,
            branchCount: slaBranchIds.length,
            tz: 'Asia/Riyadh',
          });
        } else if (slaBranchIds.length === 0) {
          logger.warn(
            '[startup] plan-review SLA cron: PLAN_REVIEW_SLA_BRANCH_IDS empty — NOT scheduled'
          );
        }
      }
    } else {
      logger.warn('[startup] plan-review SLA: PlanReview or AiAlert missing — service NOT wired');
    }
  } catch (err) {
    logger.warn('[startup] plan-review SLA wiring failed', { err: err && err.message });
  }

  // ── Wave 289: HTTP route surface (manual trigger + dashboard query) ──
  try {
    const riskSweepRouter = require('../routes/risk-sweep.routes');
    app.use('/api/risk-sweep', riskSweepRouter);
    app.use('/api/v1/risk-sweep', riskSweepRouter);
    logger.info('[startup] risk-sweep routes mounted at /api/risk-sweep (W289)');
  } catch (err) {
    logger.warn('[startup] risk-sweep routes NOT mounted', { err: err && err.message });
  }

  const cronEnabled = String(process.env.ENABLE_RISK_SWEEP_CRON || '').toLowerCase() === 'true';
  if (!cronEnabled) {
    logger.info('[startup] risk-sweeper cron DISABLED (set ENABLE_RISK_SWEEP_CRON=true to enable)');
    return;
  }

  const cron = loadOptional('node-cron');
  if (!cron) {
    logger.warn('[startup] risk-sweeper cron: node-cron not installed');
    return;
  }

  const branchIds = String(process.env.RISK_SWEEP_BRANCH_IDS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  if (branchIds.length === 0) {
    logger.warn('[startup] risk-sweeper cron: RISK_SWEEP_BRANCH_IDS empty — cron NOT scheduled');
    return;
  }

  const schedule = process.env.RISK_SWEEP_CRON || '0 2 * * *';
  const task = cron.schedule(
    schedule,
    async () => {
      logger.info('[risk-sweeper:cron] starting daily sweep', { branchCount: branchIds.length });
      for (const branchId of branchIds) {
        try {
          await service.runSweepForBranch({ branchId });
        } catch (err) {
          logger.error('[risk-sweeper:cron] branch failed', {
            branchId,
            err: err && err.message,
          });
        }
      }
    },
    { timezone: 'Asia/Riyadh' }
  );

  app._riskSweeperCronTask = task;
  logger.info('[startup] risk-sweeper cron scheduled', {
    schedule,
    branchCount: branchIds.length,
    tz: 'Asia/Riyadh',
  });
}

module.exports = { wireRiskSweeper };

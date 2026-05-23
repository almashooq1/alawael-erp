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
      onAlertRaised = ctx => planReviewService.triggerOnEscalation(ctx);
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

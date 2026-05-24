'use strict';

/**
 * aiRecommendationBootstrap.js — W334 Pass 3.
 *
 * Wires the AI Recommendations REST surface + optional cron sweeper.
 *
 * Mounts (dual):
 *   /api/ai-recommendations
 *   /api/v1/ai-recommendations
 *
 * Cron sweeper (env-gated):
 *   ENABLE_AI_RECOMMENDATION_CRON=true  → schedule daily 03:00 Asia/Riyadh
 *   Default: disabled (manual /sweep endpoint still works for ops)
 *
 * The sweeper transitions stale PENDING_REVIEW bundles (expiresAt < now) to
 * EXPIRED via the model's pre-save hook (per-doc save runs lib.validateTransition
 * and appends to history[]).
 */

function loadOptional(modulePath) {
  try {
    return require(modulePath);
  } catch {
    return null;
  }
}

function wireAiRecommendations(app, deps = {}) {
  const { logger } = deps;
  if (!app || !logger) {
    throw new Error('aiRecommendationBootstrap.wireAiRecommendations: app + logger required');
  }

  try {
    const router = require('../routes/ai-recommendations.routes');
    app.use('/api/ai-recommendations', router);
    app.use('/api/v1/ai-recommendations', router);
    logger.info(
      '[startup] AI recommendations wired (W334 P3): /api/ai-recommendations + /api/v1/ai-recommendations'
    );
  } catch (err) {
    logger.error('[startup] AI recommendations route wiring failed', err);
    return;
  }

  // ── Cron sweeper (env-gated) ──────────────────────────────────────────
  if (process.env.ENABLE_AI_RECOMMENDATION_CRON !== 'true') {
    logger.info(
      '[startup] AI recommendations cron sweeper disabled (ENABLE_AI_RECOMMENDATION_CRON!=true)'
    );
    return;
  }

  const cron = loadOptional('node-cron');
  if (!cron) {
    logger.warn('[startup] node-cron not available; AI recommendations sweeper not scheduled');
    return;
  }

  const aiRecommendationService = require('../services/aiRecommendation.service');

  // Daily at 03:00 Asia/Riyadh. Mirrors W284c speech retention sweeper cadence.
  cron.schedule(
    '0 3 * * *',
    async () => {
      try {
        const result = await aiRecommendationService.sweepExpired({ now: new Date() });
        logger.info(
          `[ai-recommendations] daily sweep: scanned=${result.scanned} expired=${result.expiredCount} errors=${result.errors.length}`
        );
        if (result.errors.length > 0) {
          for (const e of result.errors.slice(0, 5)) {
            logger.warn('[ai-recommendations] sweep error', e);
          }
        }
      } catch (err) {
        logger.error('[ai-recommendations] sweep cron failed', err);
      }
    },
    { timezone: 'Asia/Riyadh' }
  );

  logger.info('[startup] AI recommendations cron sweeper scheduled (daily 03:00 Asia/Riyadh)');

  // ── W338: plateau-alert → AiRecommendationBundle producer cron ────────
  // Env-gated separately so ops can roll the producer pipeline independently
  // from the expiry sweeper (both share node-cron; both are env-gated).
  // Runs at 03:30 Asia/Riyadh (30 min after the expiry sweeper) so any
  // bundles created today don't immediately expire on the same tick.
  if (process.env.ENABLE_AI_RECOMMENDATION_PLATEAU_ADAPTER_CRON !== 'true') {
    logger.info(
      '[startup] AI recommendations plateau adapter disabled (ENABLE_AI_RECOMMENDATION_PLATEAU_ADAPTER_CRON!=true)'
    );
    return;
  }

  const plateauAdapter = require('../services/aiRecommendation-plateau-adapter.service');
  const mongoose = require('mongoose');

  cron.schedule(
    '30 3 * * *',
    async () => {
      try {
        let alertModel;
        try {
          alertModel = mongoose.model('MeasureAlert');
        } catch {
          logger.warn(
            '[ai-recommendations] plateau adapter skipped: MeasureAlert model not registered'
          );
          return;
        }
        const result = await plateauAdapter.createBundlesFromOpenPlateauAlerts({
          alertModel,
          aiRecService: aiRecommendationService,
          limit: 200,
        });
        logger.info(
          `[ai-recommendations] daily plateau adapter: scanned=${result.scanned} converted=${result.converted} skipped=${result.skipped} errors=${result.errors.length}`
        );
        if (result.errors.length > 0) {
          for (const e of result.errors.slice(0, 5)) {
            logger.warn('[ai-recommendations] plateau adapter error', e);
          }
        }
      } catch (err) {
        logger.error('[ai-recommendations] plateau adapter cron failed', err);
      }
    },
    { timezone: 'Asia/Riyadh' }
  );

  logger.info(
    '[startup] AI recommendations plateau adapter cron scheduled (daily 03:30 Asia/Riyadh)'
  );
}

module.exports = { wireAiRecommendations };

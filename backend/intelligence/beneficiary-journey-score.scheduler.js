'use strict';

/**
 * beneficiary-journey-score.scheduler.js — Wave 0 (Phase 4).
 *
 * Periodic scheduler that recomputes the readiness score for active
 * beneficiaries and, when the recommendation is actionable and the confidence
 * is high enough, automatically requests the corresponding lifecycle
 * transition through the single chokepoint (`beneficiary-lifecycle.service`).
 *
 * The scheduler NEVER mutates `Beneficiary.status` directly — it only creates
 * pending transition records so the normal approval / MFA / side-effect flow
 * runs unchanged.
 *
 * Factory design matches the existing scheduler pattern (plateau detector,
 * HR workflow scheduler, etc.): caller owns the cron driver; the scheduler
 * exposes `start()`, `stop()`, and `runOnce()`.
 */

const {
  RECOMMENDATIONS,
  computeAndSaveJourneyScore,
  previewJourneyScore,
} = require('../services/beneficiaryJourneyScore.service');
const schedulerRegistry = require('./scheduler-registry');

const DEFAULTS = Object.freeze({
  schedule: '0 */6 * * *', // every 6 hours
  batchSize: 200,
  autoRequestMinConfidence: 0.8,
  cooldownDays: 7,
  minScoreDelta: 0,
});

const SCHEDULER_KEY = 'beneficiary-journey-score';

const SCHEDULER_ACTOR = Object.freeze({
  userId: 'system:journey-score-scheduler',
  role: 'system',
});

// Recommendations that map to a concrete lifecycle transition.
const RECOMMENDATION_TO_TRANSITION = Object.freeze({
  [RECOMMENDATIONS.DISCHARGE]: 'discharge',
  [RECOMMENDATIONS.SUSPEND]: 'suspend',
});

// Reason code used for auto-requested transitions that require one.
const AUTO_REASON_CODE = 'admin';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * @param {object} deps
 *   - beneficiaryModel     Mongoose model (Beneficiary)
 *   - journeyScoreModel    Mongoose model (BeneficiaryJourneyScore)
 *   - transitionLog        Mongoose model (BeneficiaryLifecycleTransition)
 *   - lifecycleService     { requestTransition } — the beneficiary lifecycle service
 *   - assessmentModel      Mongoose model (ProgramAssessment) optional
 *   - clinicalAssessmentModel Mongoose model (ClinicalAssessment) optional
 *   - goalModel            Mongoose model (Goal) optional
 *   - therapeuticGoalModel Mongoose model (TherapeuticGoal) optional
 *   - icfAssessmentModel   Mongoose model (ICFAssessment) optional
 *   - gasScoreSnapshotModel Mongoose model (GasScoreSnapshot) optional
 *   - episodeModel         Mongoose model (EpisodeOfCare) optional
 *   - integrationBus       optional event bus with .publish(domain, eventType, payload)
 *   - logger               console-compatible (optional)
 *   - now                  () => Date
 */
function createBeneficiaryJourneyScoreScheduler({
  beneficiaryModel = null,
  journeyScoreModel = null,
  transitionLog = null,
  lifecycleService = null,
  assessmentModel = null,
  clinicalAssessmentModel = null,
  goalModel = null,
  therapeuticGoalModel = null,
  icfAssessmentModel = null,
  gasScoreSnapshotModel = null,
  episodeModel = null,
  integrationBus = null,
  logger = console,
  now = () => new Date(),
} = {}) {
  if (!beneficiaryModel) {
    throw new Error('beneficiary-journey-score.scheduler: beneficiaryModel is required');
  }
  if (!journeyScoreModel) {
    throw new Error('beneficiary-journey-score.scheduler: journeyScoreModel is required');
  }
  if (!transitionLog) {
    throw new Error('beneficiary-journey-score.scheduler: transitionLog is required');
  }
  if (!lifecycleService || typeof lifecycleService.requestTransition !== 'function') {
    throw new Error(
      'beneficiary-journey-score.scheduler: lifecycleService.requestTransition is required'
    );
  }

  let task = null;
  let stopped = false;

  async function _hasPendingTransition(beneficiaryId, transitionId) {
    try {
      const existing = await transitionLog.findOne({
        beneficiaryId,
        transitionId,
        status: { $in: ['pending', 'approved'] },
      });
      return !!existing;
    } catch (err) {
      logger.warn &&
        logger.warn(`[journey-score-scheduler] pending transition check failed: ${err.message}`);
      return true; // fail-safe: skip auto-request if we cannot verify
    }
  }

  async function _isInCooldown(beneficiaryId, transitionId, cooldownDays) {
    try {
      const previous = await journeyScoreModel
        .findOne({ beneficiaryId })
        .select('lastAutoRequestedAt lastAutoTransitionId')
        .lean();
      if (!previous || !previous.lastAutoRequestedAt) return false;
      if (String(previous.lastAutoTransitionId) !== String(transitionId)) return false;
      const ageDays = (now() - new Date(previous.lastAutoRequestedAt)) / MS_PER_DAY;
      return ageDays < cooldownDays;
    } catch (err) {
      logger.warn && logger.warn(`[journey-score-scheduler] cooldown check failed: ${err.message}`);
      return true; // fail-safe
    }
  }

  async function _stampAutoRequest(beneficiaryId, transitionId) {
    try {
      await journeyScoreModel.updateOne(
        { beneficiaryId },
        { $set: { lastAutoRequestedAt: now(), lastAutoTransitionId: transitionId } }
      );
    } catch (err) {
      logger.warn &&
        logger.warn(`[journey-score-scheduler] auto-request stamp failed: ${err.message}`);
    }
  }

  function _isNotifyEnabled() {
    return process.env.BENEFICIARY_AUTO_TRANSITION_NOTIFY_ENABLED === 'true';
  }

  async function _publishAutoRequestedEvent({
    beneficiaryId,
    branchId,
    transitionId,
    transitionRecord,
    score,
    confidence,
  }) {
    if (!_isNotifyEnabled()) return { published: false, reason: 'disabled' };
    if (!integrationBus || typeof integrationBus.publish !== 'function') {
      logger.warn &&
        logger.warn(
          '[journey-score-scheduler] auto-transition notify enabled but integrationBus not available'
        );
      return { published: false, reason: 'bus-unavailable' };
    }
    try {
      await integrationBus.publish(
        'beneficiary',
        'lifecycle.auto_requested',
        {
          beneficiaryId,
          branchId,
          transitionId,
          transitionRecordId: transitionRecord?._id || null,
          score,
          confidence,
        },
        { aggregateType: 'Beneficiary', aggregateId: String(beneficiaryId) }
      );
      return { published: true };
    } catch (err) {
      logger.warn &&
        logger.warn(
          `[journey-score-scheduler] auto-requested event publish failed: ${err.message}`
        );
      return { published: false, reason: err.message };
    }
  }

  async function runOnce({
    limit = DEFAULTS.batchSize,
    minConfidence = DEFAULTS.autoRequestMinConfidence,
    cooldownDays = DEFAULTS.cooldownDays,
    minScoreDelta = DEFAULTS.minScoreDelta,
    dryRun = false,
  } = {}) {
    const started = now();
    const summary = {
      scanned: 0,
      scored: 0,
      errors: 0,
      autoRequested: 0,
      skippedDuplicate: 0,
      damped: 0,
      recommendations: {
        continue: 0,
        discharge: 0,
        suspend: 0,
        intensive_support: 0,
        review: 0,
      },
      proposed: [], // populated in dryRun mode
      ranAt: started.toISOString(),
    };

    let candidates = [];
    try {
      const cursor = beneficiaryModel
        .find({ status: 'active' })
        .select('_id branchId status')
        .lean();
      if (cursor && typeof cursor.limit === 'function') {
        candidates = await cursor.limit(limit);
      } else if (cursor && typeof cursor.exec === 'function') {
        candidates = await cursor.exec();
      } else if (Array.isArray(cursor)) {
        candidates = cursor;
      } else if (cursor && typeof cursor.then === 'function') {
        candidates = await cursor;
      }
    } catch (err) {
      logger.warn && logger.warn(`[journey-score-scheduler] query failed: ${err.message}`);
      summary.errors += 1;
      return summary;
    }

    candidates = Array.isArray(candidates) ? candidates : [];
    summary.scanned = candidates.length;

    for (const beneficiary of candidates) {
      try {
        let scoreDoc;
        let previous = null;

        const scoreDeps = {
          beneficiaryModel,
          journeyScoreModel,
          assessmentModel,
          clinicalAssessmentModel,
          goalModel,
          therapeuticGoalModel,
          icfAssessmentModel,
          gasScoreSnapshotModel,
          episodeModel,
        };

        if (dryRun) {
          scoreDoc = await previewJourneyScore({
            beneficiaryId: beneficiary._id,
            deps: scoreDeps,
            now,
          });
        } else {
          previous = await journeyScoreModel
            .findOne({ beneficiaryId: beneficiary._id })
            .select('score recommendation lastAutoRequestedAt lastAutoTransitionId')
            .lean();

          scoreDoc = await computeAndSaveJourneyScore({
            beneficiaryId: beneficiary._id,
            deps: scoreDeps,
            computedBy: SCHEDULER_ACTOR.userId,
            now,
          });
        }

        summary.scored += 1;

        const recommendation = scoreDoc.recommendation;
        summary.recommendations[recommendation] =
          (summary.recommendations[recommendation] || 0) + 1;

        const transitionId = RECOMMENDATION_TO_TRANSITION[recommendation];
        if (!transitionId) continue;

        if (scoreDoc.confidence < minConfidence) continue;

        // Damping / flapping guard: skip if the recommendation and transition
        // are unchanged within the cooldown window, and the score did not move
        // more than the configured delta.
        const scoreChanged =
          !previous ||
          previous.recommendation !== recommendation ||
          minScoreDelta <= 0 ||
          Math.abs((previous.score || 0) - scoreDoc.score) >= minScoreDelta;
        const cooledDown = !(await _isInCooldown(beneficiary._id, transitionId, cooldownDays));

        if (!scoreChanged || !cooledDown) {
          summary.damped += 1;
          if (dryRun) {
            summary.proposed.push({
              beneficiaryId: beneficiary._id,
              branchId: beneficiary.branchId || null,
              transitionId,
              score: scoreDoc.score,
              confidence: scoreDoc.confidence,
              recommendation,
              action: 'damped',
              reason: !scoreChanged ? 'recommendation-unchanged' : 'cooldown-active',
            });
          }
          continue;
        }

        if (dryRun) {
          summary.proposed.push({
            beneficiaryId: beneficiary._id,
            branchId: beneficiary.branchId || null,
            transitionId,
            score: scoreDoc.score,
            confidence: scoreDoc.confidence,
            recommendation,
            action: 'would-request',
          });
          continue;
        }

        const duplicate = await _hasPendingTransition(beneficiary._id, transitionId);
        if (duplicate) {
          summary.skippedDuplicate += 1;
          continue;
        }

        const request = await lifecycleService.requestTransition({
          beneficiaryId: beneficiary._id,
          branchId: beneficiary.branchId || null,
          transitionId,
          actor: SCHEDULER_ACTOR,
          reason: 'Auto-requested by journey-score scheduler',
          reasonCode: transitionId === 'suspend' ? AUTO_REASON_CODE : undefined,
        });

        if (request.ok) {
          summary.autoRequested += 1;
          await _stampAutoRequest(beneficiary._id, transitionId);
          await _publishAutoRequestedEvent({
            beneficiaryId: beneficiary._id,
            branchId: beneficiary.branchId || null,
            transitionId,
            transitionRecord: request.transitionRecord,
            score: scoreDoc.score,
            confidence: scoreDoc.confidence,
          });
          logger.info &&
            logger.info(
              `[journey-score-scheduler] auto-requested ${transitionId} for beneficiary ${beneficiary._id} (score=${scoreDoc.score}, confidence=${scoreDoc.confidence})`
            );
        } else {
          logger.warn &&
            logger.warn(
              `[journey-score-scheduler] auto-request ${transitionId} rejected: ${request.reason}`
            );
        }
      } catch (err) {
        summary.errors += 1;
        logger.warn &&
          logger.warn(
            `[journey-score-scheduler] beneficiary ${beneficiary._id} failed: ${err.message}`
          );
      }
    }

    return summary;
  }

  function start({
    schedule = DEFAULTS.schedule,
    cron = null,
    runOnStart = false,
    limit = DEFAULTS.batchSize,
    minConfidence = DEFAULTS.autoRequestMinConfidence,
    cooldownDays = DEFAULTS.cooldownDays,
    minScoreDelta = DEFAULTS.minScoreDelta,
  } = {}) {
    if (task) return { alreadyRunning: true };
    stopped = false;

    schedulerRegistry.register(SCHEDULER_KEY, {
      meta: { schedule, intervalMs: null },
    });

    const driver = cron || (typeof require === 'function' ? tryRequireNodeCron() : null);
    if (!driver) {
      throw new Error(
        'beneficiary-journey-score.scheduler: node-cron not available and no cron driver provided'
      );
    }

    const wrapped = async () => {
      if (stopped) return;
      const started = Date.now();
      try {
        const summary = await runOnce({ limit, minConfidence, cooldownDays, minScoreDelta });
        schedulerRegistry.recordRun(SCHEDULER_KEY, { ok: true, durationMs: Date.now() - started });
        return summary;
      } catch (err) {
        schedulerRegistry.recordRun(SCHEDULER_KEY, {
          ok: false,
          error: err,
          durationMs: Date.now() - started,
        });
        logger.warn && logger.warn(`[journey-score-scheduler] cron tick failed: ${err.message}`);
        throw err;
      }
    };

    task = driver.schedule(schedule, wrapped);

    if (runOnStart) {
      setImmediate(wrapped);
    }

    logger.info && logger.info(`[journey-score-scheduler] started on schedule ${schedule}`);

    return { stop };
  }

  function stop() {
    stopped = true;
    if (task && typeof task.stop === 'function') {
      task.stop();
    }
    task = null;
    logger.info && logger.info('[journey-score-scheduler] stopped');
  }

  return Object.freeze({ start, stop, runOnce });
}

function tryRequireNodeCron() {
  try {
    return require('node-cron');
  } catch {
    return null;
  }
}

module.exports = {
  createBeneficiaryJourneyScoreScheduler,
  DEFAULTS,
  SCHEDULER_KEY,
};

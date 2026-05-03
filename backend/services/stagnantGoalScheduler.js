/**
 * stagnantGoalScheduler.js
 *
 * Sweeps every active goal in every active care plan and raises a
 * `GOAL_STAGNANT` red flag against the beneficiary when no progress has
 * been recorded in the last 28 days. Mirrors the pattern set by
 * `redFlagScheduler.js` — pure `runOnce` core + optional cron wrapper.
 *
 * Why this exists:
 *   The therapist portal lets clinicians flag stagnant goals manually,
 *   but waiting on the human is the failure mode the rule is designed
 *   to catch. A weekly sweep ensures the supervisor's dashboard shows
 *   stagnant goals even when the assigned therapist hasn't logged in.
 *
 * Idempotency:
 *   `RedFlagState` has a unique index on (beneficiaryId, flagId, status).
 *   Re-raising for the same beneficiary while an active flag exists
 *   throws E11000 — we catch and skip silently. This means re-running
 *   the sweep daily is safe and cheap.
 *
 * Dependency injection:
 *   The factory takes `CarePlan`, `GoalProgressEntry`, `RedFlagState`,
 *   and `Notification` model handles. Tests pass mocks; production
 *   passes the real Mongoose models. Logger is optional.
 */

'use strict';

const DEFAULT_LOGGER = { info: () => {}, warn: () => {}, error: () => {} };

const STAGNANT_AFTER_DAYS = 28; // 4 weeks — matches the catalog's "≥ 4 أسابيع"
const FLAG_ID = 'auto:GOAL_STAGNANT';

// Same goal subdocument paths the therapist portal walks. Kept in sync
// with routes/therapist-portal.routes.js GOAL_PATHS.
const GOAL_PATHS = [
  'educational.domains.academic.goals',
  'educational.domains.classroom.goals',
  'educational.domains.communication.goals',
  'therapeutic.domains.speech.goals',
  'therapeutic.domains.occupational.goals',
  'therapeutic.domains.physical.goals',
  'therapeutic.domains.behavioral.goals',
  'therapeutic.domains.psychological.goals',
  'lifeSkills.domains.selfCare.goals',
  'lifeSkills.domains.homeSkills.goals',
  'lifeSkills.domains.social.goals',
  'lifeSkills.domains.transport.goals',
  'lifeSkills.domains.financial.goals',
];

function pluck(obj, path) {
  let cur = obj;
  for (const k of path.split('.')) {
    cur = cur ? cur[k] : null;
  }
  return cur;
}

function createStagnantGoalScheduler(deps = {}) {
  const CarePlan = deps.CarePlan;
  const GoalProgressEntry = deps.GoalProgressEntry;
  const RedFlagState = deps.RedFlagState;
  const Notification = deps.Notification || null;
  const logger = deps.logger || DEFAULT_LOGGER;
  const stagnantAfterDays = Number(deps.stagnantAfterDays) || STAGNANT_AFTER_DAYS;

  if (!CarePlan || typeof CarePlan.find !== 'function') {
    throw new Error('stagnantGoalScheduler: CarePlan model is required');
  }
  if (!GoalProgressEntry || typeof GoalProgressEntry.findOne !== 'function') {
    throw new Error('stagnantGoalScheduler: GoalProgressEntry model is required');
  }
  if (!RedFlagState || typeof RedFlagState.create !== 'function') {
    throw new Error('stagnantGoalScheduler: RedFlagState model is required');
  }

  /**
   * Walk every IN_PROGRESS goal in every ACTIVE care plan.
   * Returns flat list of { beneficiaryId, carePlanId, goalId, title }.
   */
  async function listActiveGoals() {
    const plans = await CarePlan.find({ status: 'ACTIVE' }).lean();
    const out = [];
    for (const plan of plans) {
      for (const path of GOAL_PATHS) {
        const goals = pluck(plan, path);
        if (!Array.isArray(goals)) continue;
        for (const g of goals) {
          if (!g || !g._id) continue;
          if (g.status && g.status !== 'IN_PROGRESS') continue;
          out.push({
            beneficiaryId: String(plan.beneficiary),
            carePlanId: String(plan._id),
            goalId: String(g._id),
            title: g.title || '—',
          });
        }
      }
    }
    return out;
  }

  /**
   * Pure core: scan goals, raise stagnant flags for those with no
   * progress in the threshold window. Caller passes `now` to keep
   * tests deterministic.
   */
  async function runOnce({ now = new Date() } = {}) {
    const cutoff = new Date(now.getTime() - stagnantAfterDays * 24 * 3600 * 1000);
    const goals = await listActiveGoals();

    let scanned = 0;
    let stagnant = 0;
    let flagged = 0;
    let alreadyActive = 0;
    let errors = 0;

    for (const g of goals) {
      scanned++;
      try {
        // Find the most recent progress entry for this goal.
        const last = await GoalProgressEntry.findOne({ goalId: g.goalId })
          .sort({ recordedAt: -1 })
          .select('recordedAt')
          .lean();

        // Stagnant when (a) no progress ever recorded, or (b) last entry is older than cutoff.
        const isStagnant = !last || !last.recordedAt || new Date(last.recordedAt) < cutoff;
        if (!isStagnant) continue;
        stagnant++;

        // Only raise once per beneficiary per active window — the unique
        // index on (beneficiaryId, flagId, status) enforces this at the DB.
        try {
          await RedFlagState.create({
            beneficiaryId: g.beneficiaryId,
            flagId: FLAG_ID,
            status: 'active',
            severity: 'warning',
            domain: 'CLINICAL',
            blocking: false,
            raisedAt: now,
            lastObservedAt: now,
            observedValue: {
              code: 'GOAL_STAGNANT',
              priority: 'MEDIUM',
              goalId: g.goalId,
              carePlanId: g.carePlanId,
              goalTitle: g.title,
              lastProgressAt:
                last && last.recordedAt ? new Date(last.recordedAt).toISOString() : null,
              detectedBy: 'scheduler',
              thresholdDays: stagnantAfterDays,
            },
          });
          flagged++;
        } catch (dbErr) {
          if (dbErr && dbErr.code === 11000) {
            alreadyActive++;
          } else {
            throw dbErr;
          }
        }
      } catch (err) {
        errors++;
        logger.warn(
          { goalId: g.goalId, beneficiaryId: g.beneficiaryId, err: err && err.message },
          'stagnantGoalScheduler: per-goal failure (skipped)'
        );
      }
    }

    const summary = { scanned, stagnant, flagged, alreadyActive, errors, runAt: now.toISOString() };
    logger.info(summary, 'stagnantGoalScheduler: sweep complete');

    // Optional supervisor digest: when at least one new flag was raised
    // this run, drop a single info notification (not one per goal).
    if (flagged > 0 && Notification && typeof Notification.create === 'function') {
      try {
        await Notification.create({
          recipientId: deps.supervisorBroadcastId || undefined,
          title: `${flagged} هدف راكد جديد بحاجة للمراجعة`,
          message: `تم رفع ${flagged} علامة GOAL_STAGNANT أوتوماتيكيًا بعد ${stagnantAfterDays} يومًا بدون تقدم.`,
          type: 'alert',
          category: 'clinical',
          priority: 'medium',
          actionUrl: '/admin/care-plans?filter=stagnant',
          metadata: summary,
        });
      } catch {
        /* digest is best-effort; never fail the sweep */
      }
    }

    return summary;
  }

  /**
   * Optional cron wrapper. Caller injects node-cron (or compatible) to
   * keep this module from forcing a dependency on hosts that schedule
   * via k8s/CronJob or equivalent.
   */
  function start({ schedule = '0 3 * * *', cron } = {}) {
    if (!cron || typeof cron.schedule !== 'function') {
      throw new Error('stagnantGoalScheduler.start: node-cron compatible cron is required');
    }
    const job = cron.schedule(schedule, () => {
      runOnce().catch(err =>
        logger.error({ err: err && err.message }, 'stagnantGoalScheduler: sweep failed')
      );
    });
    return { stop: () => job.stop() };
  }

  return { runOnce, start, listActiveGoals };
}

module.exports = createStagnantGoalScheduler;
module.exports.STAGNANT_AFTER_DAYS = STAGNANT_AFTER_DAYS;
module.exports.FLAG_ID = FLAG_ID;

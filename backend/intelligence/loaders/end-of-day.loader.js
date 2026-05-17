'use strict';

/**
 * end-of-day.loader.js — Wave 32.
 *
 * Real data loader for the `end-of-day.v1` generator (Wave 25).
 * Aggregates per-branch daily activity into the summary shape the
 * generator expects:
 *
 *   {
 *     summaries: [{
 *       roleGroup: 'branch_manager',
 *       branchId,
 *       resolvedCount,        // alerts resolved today (UTC day)
 *       snoozedCount,         // alerts snoozed today
 *       openFollowUpCount,    // follow-ups open AND due today/past
 *       pendingApprovalCount, // [optional] caller-supplied
 *     }],
 *     now,
 *   }
 *
 * Strategy:
 *   1. Accept the branchIds list from the caller (the orchestrator's
 *      deps; production wires it from Branch.find). We do NOT auto-
 *      enumerate via Alert.distinct() because empty branches would
 *      be missed.
 *   2. For each branch: query Alert + FollowUp in parallel.
 *   3. Skip branches with zero activity (generator already silent on
 *      quiet days; this saves the round-trip).
 *
 * Defensive: if Alert OR FollowUp model is missing, the loader
 * still returns whatever it CAN compute — never crashes the tick.
 */

const DEFAULT_MAX_BRANCHES = 50;

function startOfTodayUTC(now) {
  const d = new Date(now);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function endOfTodayUTC(now) {
  const d = new Date(now);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

/**
 * @param {object} deps
 *   - Alert         — Mongoose model (used for resolved + snoozed counts)
 *   - FollowUp      — Wave-27 FollowUp model (open follow-ups due today)
 *   - branchIds     — array of branch ObjectIds to summarize (REQUIRED)
 *   - roleGroup     — which role group to tag summaries with (default
 *                     'branch_manager' — the primary EOD audience)
 *   - maxBranches   — defensive cap
 *   - now, logger
 *
 * Returns `async () => ctx` OR null when branchIds is missing/empty
 * (caller controls; loader skips silently if no branches configured).
 */
function createEndOfDayLoader({
  Alert = null,
  FollowUp = null,
  branchIds = null,
  roleGroup = 'branch_manager',
  maxBranches = DEFAULT_MAX_BRANCHES,
  now = () => new Date(),
  logger = console,
} = {}) {
  if (!Array.isArray(branchIds) || branchIds.length === 0) {
    logger.warn &&
      logger.warn('[end-of-day.loader] no branchIds configured — skipping (returning null)');
    return null;
  }

  return async function load() {
    const tickAt = now();
    const dayStart = startOfTodayUTC(tickAt);
    const dayEnd = endOfTodayUTC(tickAt);
    const limited = branchIds.slice(0, maxBranches);

    // Run aggregations in parallel per branch.
    const summaries = await Promise.all(
      limited.map(async branchId => {
        let resolvedCount = 0;
        let snoozedCount = 0;
        let openFollowUpCount = 0;

        // Alerts resolved today
        if (Alert) {
          try {
            resolvedCount = await Alert.countDocuments({
              branchId,
              resolvedAt: { $gte: dayStart, $lte: dayEnd },
            });
          } catch (err) {
            logger.warn &&
              logger.warn(`[end-of-day.loader] alert.resolved query failed: ${err.message}`);
          }

          // Alerts snoozed today — snoozeUntil set today (Wave 11 field)
          try {
            snoozedCount = await Alert.countDocuments({
              branchId,
              snoozeUntil: { $ne: null, $gte: dayStart },
              resolvedAt: null,
            });
          } catch (err) {
            logger.warn &&
              logger.warn(`[end-of-day.loader] alert.snoozed query failed: ${err.message}`);
          }
        }

        // Open follow-ups in this branch
        if (FollowUp) {
          try {
            openFollowUpCount = await FollowUp.countDocuments({
              branchId,
              status: 'open',
            });
          } catch (err) {
            logger.warn && logger.warn(`[end-of-day.loader] followup query failed: ${err.message}`);
          }
        }

        return {
          roleGroup,
          branchId,
          resolvedCount,
          snoozedCount,
          openFollowUpCount,
          pendingApprovalCount: 0, // wave 33 will wire this from approval workflows
        };
      })
    );

    // Drop branches with zero activity (generator is silent on quiet
    // days anyway; this prevents emitting empty insights).
    const withActivity = summaries.filter(
      s =>
        (s.resolvedCount || 0) +
          (s.snoozedCount || 0) +
          (s.openFollowUpCount || 0) +
          (s.pendingApprovalCount || 0) >
        0
    );

    return { summaries: withActivity, now: tickAt };
  };
}

module.exports = {
  createEndOfDayLoader,
  DEFAULT_MAX_BRANCHES,
  // Exposed for tests
  _internal: { startOfTodayUTC, endOfTodayUTC },
};

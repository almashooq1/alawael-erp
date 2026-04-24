/**
 * behaviorTrackingObservations.js — Beneficiary-360 Commit 29.
 *
 * Adapter for:
 *
 *   behavioral.aggression.frequency.spike_200
 *     → frequencyDelta(beneficiaryId) →
 *       { aggressionDeltaPct: <number|null> }
 *     Condition: `aggressionDeltaPct >= 200` → flag raised.
 *     (A 200% increase = tripled aggression frequency.)
 *
 * Registered as `behaviorTrackingService` in the locator.
 *
 * Design decisions:
 *
 *   1. **Two 30-day windows: current + prior.** The flag
 *      compares "this month" to "the month before". Baseline =
 *      count in [now-60d, now-30d); current = count in
 *      [now-30d, now]. Same-length windows so the ratio is fair.
 *
 *   2. **Relative percent change, not absolute.** The registry
 *      condition says `>= 200` meaning ≥ 200% increase (tripled).
 *      `deltaPct = ((current - baseline) / baseline) * 100`.
 *
 *   3. **Zero-baseline handling.** Dividing by zero is a classic
 *      footgun. If baseline is 0 AND current is > 0, we return a
 *      sentinel 9999 — "went from quiet to loud, that's infinite
 *      growth, obviously a spike". If BOTH are 0, we return 0
 *      (no change, flag quiet).
 *
 *   4. **Aggression-type only.** Other behavior types (self-injury,
 *      elopement, etc.) are tracked in the same collection but do
 *      NOT count here. If new flags land for those types, they
 *      can parameterize this same function.
 *
 *   5. **`now` + window sizes injectable** so tests can exercise
 *      the math deterministically.
 */

'use strict';

const DEFAULT_EXPORTS = requireOptional('../../models/BehaviorIncident');

const MS_PER_DAY = 24 * 3600 * 1000;
const DEFAULT_WINDOW_DAYS = 30;
const ZERO_TO_NONZERO_SENTINEL = 9999;

function requireOptional(path) {
  try {
    return require(path);
  } catch {
    return null;
  }
}

function createBehaviorTrackingObservations(deps = {}) {
  const Model = deps.model || (DEFAULT_EXPORTS && DEFAULT_EXPORTS.BehaviorIncident);
  if (Model == null) {
    throw new Error('behaviorTrackingObservations: BehaviorIncident model is required');
  }

  async function frequencyDelta(beneficiaryId, options = {}) {
    const now = options.now instanceof Date ? options.now : new Date();
    const windowDays =
      typeof options.windowDays === 'number' ? options.windowDays : DEFAULT_WINDOW_DAYS;
    const behaviorType = options.behaviorType || 'aggression';

    const currentStart = new Date(now.getTime() - windowDays * MS_PER_DAY);
    const baselineStart = new Date(now.getTime() - 2 * windowDays * MS_PER_DAY);

    const [currentCount, baselineCount] = await Promise.all([
      Model.countDocuments({
        beneficiaryId,
        behaviorType,
        observedAt: { $gte: currentStart, $lte: now },
      }),
      Model.countDocuments({
        beneficiaryId,
        behaviorType,
        observedAt: { $gte: baselineStart, $lt: currentStart },
      }),
    ]);

    if (baselineCount === 0) {
      if (currentCount === 0) {
        return { aggressionDeltaPct: 0 };
      }
      return { aggressionDeltaPct: ZERO_TO_NONZERO_SENTINEL };
    }

    const delta = ((currentCount - baselineCount) / baselineCount) * 100;
    return { aggressionDeltaPct: Math.round(delta * 100) / 100 };
  }

  return Object.freeze({
    frequencyDelta,
    _ZERO_TO_NONZERO_SENTINEL: ZERO_TO_NONZERO_SENTINEL,
  });
}

module.exports = {
  createBehaviorTrackingObservations,
  ZERO_TO_NONZERO_SENTINEL,
};

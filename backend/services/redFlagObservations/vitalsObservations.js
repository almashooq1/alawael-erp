/**
 * vitalsObservations.js — Beneficiary-360 Commit 24.
 *
 * Adapter for:
 *
 *   clinical.pediatric.weight.drop_5pct
 *     → beneficiaryTrend(beneficiaryId) →
 *       { weight: { deltaPct90d: <number|null> } }
 *     Condition: `deltaPct90d <= -5` → flag raised.
 *
 * Registered as `vitalsService` in the locator. Reads the new
 * `VitalSign` collection.
 *
 * Design decisions:
 *
 *   1. **Baseline = oldest weight on-or-before `now - 90 days`
 *      (fallback: oldest weight in the 90d window).** If the
 *      beneficiary has any pre-window measurement, we prefer it.
 *      Otherwise the earliest in-window measurement anchors the
 *      delta. Either way we compare against an OLDER point so
 *      "recent weight loss" is what the delta captures.
 *
 *   2. **Latest = most recent weight within the last 14 days.**
 *      A rehab center weighs pediatric patients regularly; using
 *      the last 14 days ensures we're looking at a current signal
 *      rather than a stale 45-day-old entry.
 *
 *   3. **Null semantics.** Without at least one baseline AND one
 *      current reading, `deltaPct90d: null` — the `<=` comparison
 *      against null is false, so the flag stays clear. Missing
 *      data is NOT an alarm; a separate "vitals not recorded"
 *      flag would catch that.
 *
 *   4. **Structured under `weight`** so future types
 *      (height.deltaPct365d, bp.spikeSystolic, etc.) compose
 *      into the same method without breaking the flag's path.
 */

'use strict';

const DEFAULT_EXPORTS = requireOptional('../../models/VitalSign');

const MS_PER_DAY = 24 * 3600 * 1000;

function requireOptional(path) {
  try {
    return require(path);
  } catch {
    return null;
  }
}

function createVitalsObservations(deps = {}) {
  const VitalSign = deps.model || (DEFAULT_EXPORTS && DEFAULT_EXPORTS.VitalSign);
  if (VitalSign == null) {
    throw new Error('vitalsObservations: VitalSign model is required');
  }

  async function pickBaselineWeight(beneficiaryId, now) {
    const windowStart = new Date(now.getTime() - 90 * MS_PER_DAY);
    // Prefer the latest pre-window measurement (true baseline).
    const preWindow = await VitalSign.findOne(
      {
        beneficiaryId,
        measurementType: 'weight',
        recordedAt: { $lte: windowStart },
      },
      'value recordedAt'
    )
      .sort({ recordedAt: -1 })
      .lean();
    if (preWindow) return preWindow;
    // Fallback: the EARLIEST in-window measurement still lets us
    // compute a meaningful delta.
    const earliestInWindow = await VitalSign.findOne(
      {
        beneficiaryId,
        measurementType: 'weight',
        recordedAt: { $gt: windowStart, $lte: now },
      },
      'value recordedAt'
    )
      .sort({ recordedAt: 1 })
      .lean();
    return earliestInWindow;
  }

  async function pickCurrentWeight(beneficiaryId, now) {
    const recentStart = new Date(now.getTime() - 14 * MS_PER_DAY);
    return VitalSign.findOne(
      {
        beneficiaryId,
        measurementType: 'weight',
        recordedAt: { $gte: recentStart, $lte: now },
      },
      'value recordedAt'
    )
      .sort({ recordedAt: -1 })
      .lean();
  }

  async function beneficiaryTrend(beneficiaryId, options = {}) {
    const now = options.now instanceof Date ? options.now : new Date();
    const [baseline, current] = await Promise.all([
      pickBaselineWeight(beneficiaryId, now),
      pickCurrentWeight(beneficiaryId, now),
    ]);

    if (!baseline || !current || baseline.value <= 0) {
      return { weight: { deltaPct90d: null } };
    }
    // Same row being used for both is a no-op; avoid reporting a
    // spurious zero when there's only one measurement on file.
    if (
      String(baseline._id) === String(current._id) ||
      baseline.recordedAt.getTime() === current.recordedAt.getTime()
    ) {
      return { weight: { deltaPct90d: null } };
    }
    const delta = ((current.value - baseline.value) / baseline.value) * 100;
    return { weight: { deltaPct90d: Math.round(delta * 100) / 100 } };
  }

  return Object.freeze({ beneficiaryTrend });
}

module.exports = { createVitalsObservations };

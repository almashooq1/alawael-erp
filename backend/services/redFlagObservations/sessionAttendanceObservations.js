/**
 * sessionAttendanceObservations.js — Beneficiary-360 Commit 11a.
 *
 * Real observation adapter for the two attendance-domain flags:
 *
 *   attendance.monthly.rate.low_70
 *     → beneficiaryMonthlyRate(beneficiaryId) →
 *       { attendanceRate: <number 0-100> }
 *
 *   attendance.missed.streak_3_consecutive
 *     → consecutiveMissedForBeneficiary(beneficiaryId) →
 *       { streakCount: <number> }
 *
 * Registered under the name `attendanceService` in the locator so the
 * registry's declared source paths resolve. This file is the adapter
 * boundary: it knows about SessionAttendance (Mongoose), the flags
 * don't.
 *
 * Design decisions:
 *
 *   1. Thin, pure-ish layer. Each method does one query, computes
 *      one derived number, returns a plain object. No caching, no
 *      side effects — the scheduler runs this on every sweep and
 *      it should be cheap enough to do so (the [beneficiaryId,
 *      scheduledDate desc] index turns these into range scans).
 *
 *   2. "Missed" = status in {absent, no_show}. `cancelled` is not
 *      counted as a miss (cancellations are outside the
 *      beneficiary's control). `late` is a partial-credit signal
 *      the rehab team tracks elsewhere and does not factor into
 *      the "didn't attend" streak.
 *
 *   3. Monthly rate window = trailing 30 days from now. We don't
 *      lock to calendar-month boundaries — the flag's purpose is
 *      "have they been showing up?", not "report card for March".
 *      When the engine injects a frozen `now`, we honor it; the
 *      window shifts accordingly.
 *
 *   4. Empty history returns neutral values: 100% rate, 0 streak.
 *      Neutral means no flag fires — better than raising noise on
 *      newly-admitted beneficiaries who have no sessions yet.
 */

'use strict';

const DEFAULT_MODEL = requireOptional('../../models/SessionAttendance');

const MS_PER_DAY = 24 * 3600 * 1000;

// Lazy-load the model so tests can run without Mongo installed —
// the adapter is a factory and DI'ing the model is the testable path.
function requireOptional(path) {
  try {
    return require(path);
  } catch {
    return null;
  }
}

const MISS_STATUSES = Object.freeze(['absent', 'no_show']);
const PRESENT_STATUSES = Object.freeze(['present', 'late']);

function createSessionAttendanceObservations(deps = {}) {
  const Model = deps.model || DEFAULT_MODEL;
  if (Model == null) {
    throw new Error('sessionAttendanceObservations: SessionAttendance model is required');
  }

  /**
   * Ratio of present/late vs total attendance-worthy (present+late+
   * absent+no_show) over the last 30 days. `cancelled` rows are
   * excluded from both numerator and denominator.
   */
  async function beneficiaryMonthlyRate(beneficiaryId, options = {}) {
    const now = options.now instanceof Date ? options.now : new Date();
    const since = new Date(now.getTime() - 30 * MS_PER_DAY);
    const rows = await Model.find(
      { beneficiaryId, scheduledDate: { $gte: since, $lte: now } },
      'status'
    ).lean();

    const present = rows.filter(r => PRESENT_STATUSES.includes(r.status)).length;
    const missed = rows.filter(r => MISS_STATUSES.includes(r.status)).length;
    const total = present + missed;
    if (total === 0) return { attendanceRate: 100 };
    return { attendanceRate: Math.round((present / total) * 10000) / 100 };
  }

  /**
   * Count of the most recent consecutive missed (absent or no_show)
   * sessions. Cancellations break the streak (they count as "not
   * a miss" but also not a "present" — we treat them as neutral
   * and keep counting backwards). A single `present` or `late` row
   * breaks the streak.
   */
  async function consecutiveMissedForBeneficiary(beneficiaryId) {
    const rows = await Model.find({ beneficiaryId }, 'status scheduledDate')
      .sort({ scheduledDate: -1 })
      .limit(20)
      .lean();
    let streak = 0;
    for (const r of rows) {
      if (PRESENT_STATUSES.includes(r.status)) break;
      if (MISS_STATUSES.includes(r.status)) {
        streak++;
      }
      // cancelled → skip without incrementing, don't break the streak
    }
    return { streakCount: streak };
  }

  return Object.freeze({
    beneficiaryMonthlyRate,
    consecutiveMissedForBeneficiary,
  });
}

module.exports = { createSessionAttendanceObservations };

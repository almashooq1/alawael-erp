/**
 * caseloadObservations.js — Beneficiary-360 Commit 16.
 *
 * Adapter for:
 *
 *   operational.therapist.caseload.exceeded
 *     → activeCountForTherapist(beneficiaryId) → { activeCases: <number> }
 *
 * Registered as `caseloadService` in the locator. The flag's method
 * name is therapist-scoped but the engine always hands us a
 * beneficiary id — so this adapter bridges: we find the therapists
 * who treat this beneficiary, compute each one's active caseload,
 * and return the MAX. A single overloaded therapist on the care
 * team raises the flag for the beneficiary.
 *
 * Design decisions:
 *
 *   1. **Caseload definition: distinct beneficiaries treated in the
 *      last 30 days.** Not "all active care plans" — the rehab
 *      intent is "how many people are you actually seeing right
 *      now?". A therapist with 40 care plans on paper but only
 *      15 active patients this month isn't overloaded.
 *
 *   2. **Assignment window: 60 days.** A therapist is considered
 *      "this beneficiary's therapist" if they've had at least one
 *      session together in the last 60 days. Same window the CPE
 *      adapter uses, so the two stay aligned on who counts as a
 *      current care-team member.
 *
 *   3. **Max across therapists**, not sum. If the beneficiary sees
 *      therapist A (caseload 32) and B (caseload 25), the flag
 *      should fire because A is the risk — not because the sum is
 *      57.
 *
 *   4. **Zero-safe fallback.** A beneficiary with no recent
 *      sessions returns `{ activeCases: 0 }`. No therapists ⇒ no
 *      overload risk ⇒ flag clear.
 *
 *   5. **Single Mongo round-trip per therapist** via `distinct`.
 *      For a typical care team (2–5 therapists) this is fine; for
 *      larger teams we could collapse to one `$group` pipeline,
 *      but that's not the hot path today.
 */

'use strict';

const DEFAULT_SESSION_ATTENDANCE = requireOptional('../../models/SessionAttendance');

const MS_PER_DAY = 24 * 3600 * 1000;

function requireOptional(path) {
  try {
    return require(path);
  } catch {
    return null;
  }
}

function createCaseloadObservations(deps = {}) {
  const SessionAttendance = deps.sessionAttendanceModel || DEFAULT_SESSION_ATTENDANCE;
  if (SessionAttendance == null) {
    throw new Error('caseloadObservations: SessionAttendance model is required');
  }

  async function activeCountForTherapist(beneficiaryId, options = {}) {
    const now = options.now instanceof Date ? options.now : new Date();
    const assignmentWindowDays =
      typeof options.assignmentWindowDays === 'number' ? options.assignmentWindowDays : 60;
    const caseloadWindowDays =
      typeof options.caseloadWindowDays === 'number' ? options.caseloadWindowDays : 30;

    const assignmentSince = new Date(now.getTime() - assignmentWindowDays * MS_PER_DAY);
    const caseloadSince = new Date(now.getTime() - caseloadWindowDays * MS_PER_DAY);

    // 1. Therapists currently treating this beneficiary.
    const therapistIds = await SessionAttendance.distinct('therapistId', {
      beneficiaryId,
      scheduledDate: { $gte: assignmentSince, $lte: now },
      therapistId: { $ne: null },
    });

    if (therapistIds.length === 0) return { activeCases: 0 };

    // 2. For each therapist, count distinct beneficiaries seen in
    //    the caseload window.
    const counts = await Promise.all(
      therapistIds.map(async tId => {
        const bens = await SessionAttendance.distinct('beneficiaryId', {
          therapistId: tId,
          scheduledDate: { $gte: caseloadSince, $lte: now },
        });
        return bens.length;
      })
    );

    return { activeCases: Math.max(...counts) };
  }

  return Object.freeze({ activeCountForTherapist });
}

module.exports = { createCaseloadObservations };

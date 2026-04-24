/**
 * cpeObservations.js — Beneficiary-360 Commit 13.
 *
 * Adapter for:
 *
 *   operational.therapist.license.expiring_60d
 *     → licensesExpiringInDays(beneficiaryId) → { count: <number> }
 *
 * Registered as `cpeService` in the locator. The flag is
 * beneficiary-scoped (the engine always passes a beneficiary id),
 * but the underlying concern is therapist licensing. The adapter
 * bridges the two by:
 *
 *   1. Looking up the therapists who have actually treated this
 *      beneficiary in the recent window (default 60 days via
 *      SessionAttendance) — these are the clinicians whose license
 *      status materially affects THIS beneficiary's care.
 *
 *   2. For each such therapist, checking `scfhs_expiry` on the HR
 *      Employee record. Counting those expiring within the next
 *      60 days (configurable).
 *
 * A beneficiary with no recent sessions returns `{ count: 0 }` —
 * they have no currently-assigned practitioner exposed to renewal
 * risk, so the flag doesn't fire. Safe default.
 *
 * Design decisions:
 *
 *   1. Therapist linkage via SessionAttendance, NOT CarePlan. Care
 *      plans specify the assigned team; session attendance records
 *      who actually DID the work. The latter is the audit-relevant
 *      fact for a license-expiry alert: the beneficiary is being
 *      treated by this person right now.
 *
 *   2. Already-expired licenses (scfhs_expiry < now) also count
 *      toward the flag — "expiring in 60 days" inclusively covers
 *      "already lapsed". Otherwise we'd quietly miss the most
 *      urgent cases.
 *
 *   3. The adapter is purely read-only and side-effect-free. It
 *      doesn't write to CpeRecord, doesn't change employee state.
 *      Observation only.
 *
 *   4. All three models (SessionAttendance, HR Employee, and the
 *      optional employee-resolver) are injected. Tests drive the
 *      behavior with minimal fixtures; production uses real
 *      models via bootstrap.
 */

'use strict';

const DEFAULT_SESSION_ATTENDANCE = requireOptional('../../models/SessionAttendance');
const DEFAULT_EMPLOYEE = requireOptional('../../models/HR/Employee');

const MS_PER_DAY = 24 * 3600 * 1000;

function requireOptional(path) {
  try {
    return require(path);
  } catch {
    return null;
  }
}

function createCpeObservations(deps = {}) {
  const SessionAttendance = deps.sessionAttendanceModel || DEFAULT_SESSION_ATTENDANCE;
  const Employee = deps.employeeModel || DEFAULT_EMPLOYEE;
  if (SessionAttendance == null) {
    throw new Error('cpeObservations: SessionAttendance model is required');
  }
  if (Employee == null) {
    throw new Error('cpeObservations: Employee (HR) model is required');
  }

  /**
   * Count therapists whose license expires within `days` days and
   * who have treated `beneficiaryId` within the same window.
   *
   * Accepts `options.now` (clock injection for tests) and
   * `options.days` (default 60) so the same adapter can serve
   * different SLA brackets if we add them later.
   */
  async function licensesExpiringInDays(beneficiaryId, options = {}) {
    const now = options.now instanceof Date ? options.now : new Date();
    const days = typeof options.days === 'number' ? options.days : 60;
    const since = new Date(now.getTime() - days * MS_PER_DAY);
    const until = new Date(now.getTime() + days * MS_PER_DAY);

    // 1. Therapists who treated this beneficiary in the recent window.
    //    Use `distinct` so the set is de-duplicated at query level.
    const therapistIds = await SessionAttendance.distinct('therapistId', {
      beneficiaryId,
      scheduledDate: { $gte: since, $lte: now },
      therapistId: { $ne: null },
    });

    if (therapistIds.length === 0) return { count: 0 };

    // 2. Employees among those ids whose SCFHS license expires
    //    within the next `days` days (inclusive of already-expired).
    const count = await Employee.countDocuments({
      _id: { $in: therapistIds },
      scfhs_expiry: { $lte: until },
    });

    return { count };
  }

  return Object.freeze({ licensesExpiringInDays });
}

module.exports = { createCpeObservations };

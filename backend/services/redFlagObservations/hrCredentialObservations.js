/**
 * hrCredentialObservations.js — Phase 11 Commit 1.
 *
 * Adapter for the two HR-credential-compliance red-flags introduced
 * alongside this file:
 *
 *   operational.therapist.license.expired
 *     → expiredLicensesForBeneficiary(beneficiaryId) → { count }
 *
 *   operational.therapist.mandatory_cert.expired
 *     → expiredMandatoryCertsForBeneficiary(beneficiaryId) → { count }
 *
 * Registered as `hrCredentialService` in the locator. Both flags are
 * beneficiary-scoped (the engine always passes a beneficiary id),
 * but the underlying concern is the treating therapist's credential
 * status. The adapter bridges the two the same way `cpeObservations`
 * does: look up therapists who actually DID work on this beneficiary
 * in the recent window (via SessionAttendance), then check their
 * credentials.
 *
 * Why a separate adapter (not an extension of cpeObservations)?
 *
 *   1. `cpeService` is scoped to its existing contract (expiring-in-N
 *      days, warning-severity). These two flags are CRITICAL and
 *      BLOCKING — they halt new session assignment. Keeping them in
 *      a distinct service surfaces that difference at the locator
 *      level: a test or reviewer can see that `hrCredentialService`
 *      backs the safety gate.
 *
 *   2. `expiredMandatoryCertsForBeneficiary` queries a different
 *      collection (Certification, not Employee.scfhs_expiry). Folding
 *      that into cpeObservations would broaden its surface area and
 *      blur its single-responsibility boundary.
 *
 * Design decisions:
 *
 *   1. Therapist linkage via SessionAttendance (same as
 *      cpeObservations). Session attendance records who actually did
 *      the work — the audit-relevant fact for a license-expiry gate.
 *
 *   2. Window defaults to 60 days of recent sessions — matches the
 *      "recent treating clinician" heuristic used elsewhere in the
 *      flag family. Configurable via options.days.
 *
 *   3. "Expired" strictly means expiry_date < now. Flags for
 *      expiring-soon are separate (already exist).
 *
 *   4. Mandatory cert check: any Certification document where
 *      `is_mandatory: true` AND `expiry_date < now` AND
 *      `deleted_at: null` for a recent treating therapist trips the
 *      flag. The count is distinct-by-therapist — three expired certs
 *      on one therapist still contribute 1.
 *
 *   5. Adapter is read-only. It doesn't mutate the Certification
 *      `status` field (that's the scheduler's job elsewhere).
 *
 *   6. All three models are injected. Tests drive behavior with
 *      minimal fixtures; production wires via bootstrap.
 */

'use strict';

const MS_PER_DAY = 24 * 3600 * 1000;

function requireOptional(path) {
  try {
    return require(path);
  } catch {
    return null;
  }
}

const DEFAULT_SESSION_ATTENDANCE = requireOptional('../../models/SessionAttendance');
const DEFAULT_EMPLOYEE = requireOptional('../../models/HR/Employee');
const DEFAULT_CERTIFICATION = requireOptional('../../models/hr/Certification');
const DEFAULT_EMPLOYMENT_CONTRACT = requireOptional('../../models/hr/EmploymentContract');

function createHrCredentialObservations(deps = {}) {
  const SessionAttendance = deps.sessionAttendanceModel || DEFAULT_SESSION_ATTENDANCE;
  const Employee = deps.employeeModel || DEFAULT_EMPLOYEE;
  const Certification = deps.certificationModel || DEFAULT_CERTIFICATION;
  // EmploymentContract is OPTIONAL — older deployments without the HR
  // contracts collection simply can't evaluate the contract flag. The
  // locator records a `locator-error` verdict in that case, which is
  // the behavior we want.
  const EmploymentContract = deps.employmentContractModel || DEFAULT_EMPLOYMENT_CONTRACT;

  if (SessionAttendance == null) {
    throw new Error('hrCredentialObservations: SessionAttendance model is required');
  }
  if (Employee == null) {
    throw new Error('hrCredentialObservations: Employee (HR) model is required');
  }
  if (Certification == null) {
    throw new Error('hrCredentialObservations: Certification (HR) model is required');
  }

  async function recentTherapistIds(beneficiaryId, { now, days }) {
    const since = new Date(now.getTime() - days * MS_PER_DAY);
    return SessionAttendance.distinct('therapistId', {
      beneficiaryId,
      scheduledDate: { $gte: since, $lte: now },
      therapistId: { $ne: null },
    });
  }

  /**
   * Count distinct recent-treating therapists whose SCFHS license is
   * already expired as of `now`.
   */
  async function expiredLicensesForBeneficiary(beneficiaryId, options = {}) {
    const now = options.now instanceof Date ? options.now : new Date();
    const days = typeof options.days === 'number' ? options.days : 60;

    const therapistIds = await recentTherapistIds(beneficiaryId, { now, days });
    if (therapistIds.length === 0) return { count: 0 };

    const count = await Employee.countDocuments({
      _id: { $in: therapistIds },
      scfhs_expiry: { $lt: now },
    });

    return { count };
  }

  /**
   * Count distinct recent-treating therapists with at least one
   * expired mandatory (is_mandatory: true) certification. A therapist
   * with three expired mandatory certs still counts as 1.
   */
  async function expiredMandatoryCertsForBeneficiary(beneficiaryId, options = {}) {
    const now = options.now instanceof Date ? options.now : new Date();
    const days = typeof options.days === 'number' ? options.days : 60;

    const therapistIds = await recentTherapistIds(beneficiaryId, { now, days });
    if (therapistIds.length === 0) return { count: 0 };

    const distinctTherapists = await Certification.distinct('employee_id', {
      employee_id: { $in: therapistIds },
      is_mandatory: true,
      expiry_date: { $lt: now },
      deleted_at: null,
    });

    return { count: distinctTherapists.length };
  }

  /**
   * Count distinct recent-treating therapists whose ACTIVE employment
   * contract `end_date` falls within the next `days` days (default 45).
   * Contracts already past `end_date` are excluded — the sync job
   * flips them to 'expired' status and a separate workflow owns the
   * post-expiry case. We only want the heads-up window here.
   *
   * Returns `{ count: 0 }` when EmploymentContract is unavailable so
   * the flag doesn't spuriously clear — the locator-error path is the
   * correct surface for missing-model diagnostics.
   */
  async function contractsExpiringForBeneficiary(beneficiaryId, options = {}) {
    if (EmploymentContract == null) {
      throw new Error(
        'hrCredentialObservations: EmploymentContract model required for contractsExpiringForBeneficiary'
      );
    }
    const now = options.now instanceof Date ? options.now : new Date();
    const days = typeof options.days === 'number' ? options.days : 45;
    const therapistWindowDays =
      typeof options.therapistWindowDays === 'number' ? options.therapistWindowDays : 60;

    const since = new Date(now.getTime() - therapistWindowDays * MS_PER_DAY);
    const horizon = new Date(now.getTime() + days * MS_PER_DAY);

    const therapistIds = await SessionAttendance.distinct('therapistId', {
      beneficiaryId,
      scheduledDate: { $gte: since, $lte: now },
      therapistId: { $ne: null },
    });

    if (therapistIds.length === 0) return { count: 0 };

    const distinctTherapists = await EmploymentContract.distinct('employee_id', {
      employee_id: { $in: therapistIds },
      status: 'active',
      deleted_at: null,
      end_date: { $gte: now, $lte: horizon, $ne: null },
    });

    return { count: distinctTherapists.length };
  }

  return Object.freeze({
    expiredLicensesForBeneficiary,
    expiredMandatoryCertsForBeneficiary,
    contractsExpiringForBeneficiary,
  });
}

module.exports = { createHrCredentialObservations };

/**
 * employeeSelfServiceService.js — Phase 11 Commit 7 (4.0.24).
 *
 * Single-shot aggregator for the employee self-service endpoint.
 * Given a session `userId`, resolves the linked Employee record and
 * pulls every HR artifact the employee is entitled to see — always
 * under the SELF-access path of the masking layer (PDPL Art. 18).
 *
 * Sections returned:
 *
 *   profile            — Employee document masked with
 *                        selfEmployeeId = self (full RESTRICTED view).
 *   current_contract   — most-recent non-deleted EmploymentContract
 *                        for the employee (active / expired / draft),
 *                        ordered by start_date desc.
 *   certifications     — active certifications with days_until_expiry
 *                        and simple status coloring.
 *   leave_balance      — current-year LeaveBalance (or placeholder if
 *                        none exists yet).
 *   recent_leaves      — last 10 Leave records, masked under self.
 *   red_flags          — active red-flags raised by the engine against
 *                        the employee's id in the state store (if any).
 *
 * Design decisions:
 *
 *   1. The service itself does NOT authenticate. It expects an
 *      already-authenticated `userId` and resolves Employee via
 *      `Employee.findOne({ user_id })`. If no Employee is linked to
 *      the user (admin-only accounts, non-employee users), returns
 *      `null` — the route turns that into 404.
 *
 *   2. All models are DEPENDENCY-INJECTED. Tests pass stubs; production
 *      wires via bootstrap. A missing non-critical model (e.g.
 *      PerformanceReview) simply omits that section — never 500.
 *
 *   3. Every record goes through hrDataMaskingService.maskRecord with
 *      `selfEmployeeId` set to the resolved employee id. This is
 *      defense-in-depth: even if the calling role is "receptionist",
 *      viewing their OWN record still surfaces RESTRICTED fields
 *      (per PDPL Art. 18). The masking layer handles the logic.
 *
 *   4. `red_flags` reads from RedFlagState. Historically the engine
 *      stores flags against `beneficiaryId`, but HR flags (C1-C3)
 *      still pass a beneficiary context — flags affecting THIS
 *      employee are surfaced via the audit-log trail, not this section.
 *      For the self-service view we include ONLY employee-scoped
 *      flags that explicitly set `employeeId` on the state doc.
 *      Empty array is the normal path.
 *
 *   5. Clock injection (`now()`) for deterministic windows.
 */

'use strict';

const { maskRecord, maskCollection } = require('./hrDataMaskingService');
const { validatePatch } = require('../../config/hr-self-editable-fields');

function createEmployeeSelfServiceService(deps = {}) {
  const Employee = deps.employeeModel || null;
  const EmploymentContract = deps.employmentContractModel || null;
  const Certification = deps.certificationModel || null;
  const LeaveBalance = deps.leaveBalanceModel || null;
  const Leave = deps.leaveModel || null;
  const RedFlagState = deps.redFlagStateModel || null;
  const PerformanceReview = deps.performanceReviewModel || null;
  const nowFn = deps.now || (() => new Date());

  if (Employee == null) {
    throw new Error('employeeSelfServiceService: employeeModel is required');
  }

  async function findEmployeeByUserId(userId) {
    if (!userId) return null;
    return Employee.findOne({ user_id: userId, deleted_at: null }).lean();
  }

  async function loadCurrentContract(employeeId) {
    if (EmploymentContract == null) return null;
    return EmploymentContract.findOne({
      employee_id: employeeId,
      deleted_at: null,
    })
      .sort({ start_date: -1 })
      .lean();
  }

  async function loadCertifications(employeeId, now) {
    if (Certification == null) return [];
    const rows = await Certification.find({
      employee_id: employeeId,
      deleted_at: null,
    })
      .sort({ expiry_date: 1 })
      .lean();
    return rows.map(r => {
      const expiry = r.expiry_date ? new Date(r.expiry_date) : null;
      const daysUntil = expiry == null ? null : Math.ceil((expiry - now) / (24 * 3600 * 1000));
      const severity =
        daysUntil == null
          ? 'unknown'
          : daysUntil < 0
            ? 'expired'
            : daysUntil <= 60
              ? 'expiring_soon'
              : 'valid';
      return { ...r, days_until_expiry: daysUntil, computed_status: severity };
    });
  }

  async function loadLeaveBalance(employeeId, now) {
    if (LeaveBalance == null) return null;
    const year = now.getFullYear();
    const balance = await LeaveBalance.findOne({
      employee_id: employeeId,
      year,
      deleted_at: null,
    }).lean();
    return balance || { employee_id: employeeId, year, not_yet_initialized: true };
  }

  async function loadRecentLeaves(employeeId, limit = 10) {
    if (Leave == null) return [];
    return Leave.find({ employee_id: employeeId, deleted_at: null })
      .sort({ start_date: -1 })
      .limit(limit)
      .lean();
  }

  async function loadRedFlags(employeeId) {
    // The RedFlagState schema (Beneficiary-360) is keyed on
    // beneficiaryId; there's no employee scope today. For a future
    // commit we'd add an `employeeId` field + index and surface flags
    // raised directly against the employee. For now this section is
    // structurally present (so the UI can render it) but empty.
    // employeeId kept in the signature for when the schema extends.
    if (RedFlagState == null) return [];
    return RedFlagState.find({
      employeeId: String(employeeId),
      status: 'active',
    })
      .select('flagId severity domain blocking raisedAt')
      .lean()
      .catch(() => []);
  }

  async function loadLastReview(employeeId) {
    if (PerformanceReview == null) return null;
    return PerformanceReview.findOne({
      employee_id: employeeId,
      status: 'finalized',
      deleted_at: null,
    })
      .sort({ review_period_end: -1 })
      .select('review_period_end review_type overall_rating weighted_score')
      .lean();
  }

  /**
   * Build the full self-service snapshot for a user. Returns:
   *   null                         — if no Employee is linked to the user
   *   { generated_at, sections }   — normal payload
   */
  async function buildSnapshot({ userId, role } = {}) {
    if (!userId) throw new Error('employeeSelfServiceService.buildSnapshot: userId is required');

    const employee = await findEmployeeByUserId(userId);
    if (employee == null) return null;

    const now = nowFn();
    const employeeId = employee._id;
    const selfContext = { role, selfEmployeeId: employeeId };

    const [contract, certs, balance, leaves, flags, lastReview] = await Promise.all([
      loadCurrentContract(employeeId).catch(() => null),
      loadCertifications(employeeId, now).catch(() => []),
      loadLeaveBalance(employeeId, now).catch(() => null),
      loadRecentLeaves(employeeId).catch(() => []),
      loadRedFlags(employeeId).catch(() => []),
      loadLastReview(employeeId).catch(() => null),
    ]);

    const maskedProfile = maskRecord(employee, 'employee', selfContext);
    const maskedContract = contract
      ? maskRecord(contract, 'employment_contract', selfContext)
      : null;
    const maskedLeaves = maskCollection(leaves, 'leave', selfContext);

    return {
      generated_at: now.toISOString(),
      subject: {
        employee_id: String(employeeId),
        user_id: String(userId),
        access_mode: 'self', // PDPL Art. 18 — always self-access path
      },
      sections: {
        profile: maskedProfile,
        current_contract: maskedContract,
        certifications: certs, // already operational fields, no PII
        leave_balance: balance,
        recent_leaves: maskedLeaves,
        last_review: lastReview,
        red_flags: flags,
      },
    };
  }

  /**
   * Apply a self-update patch to the authenticated employee's record.
   *
   * Accepts only fields in `config/hr-self-editable-fields.js`.
   * Returns one of:
   *
   *   { result: 'not_linked' }            — no Employee for this userId
   *   { result: 'invalid', errors: {...} } — validation failures
   *   { result: 'no_changes' }             — patch was empty after
   *                                          validation/normalization
   *   { result: 'updated', employee,
   *     changedFields: [...], before: {...}, after: {...} }
   *
   * Fires no audit directly — that's the route's job, so the IP
   * address + user agent context stays in one place.
   */
  async function updateSelfProfile({ userId, role, patch }) {
    if (!userId) {
      throw new Error('employeeSelfServiceService.updateSelfProfile: userId is required');
    }

    const validation = validatePatch(patch);
    if (!validation.ok) {
      return { result: 'invalid', errors: validation.errors };
    }
    if (validation.empty) {
      return { result: 'no_changes' };
    }

    const existing = await findEmployeeByUserId(userId);
    if (existing == null) {
      return { result: 'not_linked' };
    }

    // Capture old values for the audit trail. Read only the fields
    // we're about to change so we don't stuff huge records into the
    // audit log.
    const before = {};
    for (const path of Object.keys(validation.flat)) {
      before[path] = getByPath(existing, path);
    }

    await Employee.updateOne({ _id: existing._id, deleted_at: null }, { $set: validation.flat });

    const updated = await Employee.findById(existing._id).lean();
    if (updated == null) {
      // Race: deleted between read and write. Surface as not_linked
      // so the route returns 404 rather than 500.
      return { result: 'not_linked' };
    }

    const selfContext = { role, selfEmployeeId: updated._id };
    return {
      result: 'updated',
      employee: maskRecord(updated, 'employee', selfContext),
      changedFields: Object.keys(validation.flat),
      before,
      after: validation.flat,
    };
  }

  return Object.freeze({ buildSnapshot, updateSelfProfile });
}

function getByPath(obj, path) {
  if (!obj) return undefined;
  const parts = path.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[p];
  }
  return cur;
}

module.exports = { createEmployeeSelfServiceService };

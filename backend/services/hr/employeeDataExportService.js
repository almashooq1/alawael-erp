'use strict';

/**
 * employeeDataExportService.js — Phase 11 Commit 17 (4.0.34).
 *
 * PDPL Art. 18 Data Portability implementation. Given an employee
 * id, aggregates EVERYTHING the HR system knows about that person
 * into a single JSON document suitable for offline download.
 *
 * Sections:
 *
 *   profile             Employee record (full fields — export is a
 *                       self-access path, caller is the subject)
 *   contracts           All EmploymentContract docs for this employee
 *                       (active, expired, terminated, draft). Ordered
 *                       newest-first.
 *   certifications      All Certification docs (valid, expired,
 *                       soft-deleted excluded).
 *   leaves              All Leave docs (including cancelled).
 *   leave_balances      Per-year LeaveBalance docs.
 *   performance_reviews All finalized + draft + submitted PerformanceReview
 *                       docs.
 *   change_requests     All HrChangeRequest docs where this employee
 *                       is the subject.
 *   access_log          Recent HR audit events touching this employee
 *                       (last 365 days, capped at 5000 events).
 *
 * Design decisions:
 *
 *   1. DI'd models everywhere. Missing model → section is `null`
 *      in the export, rest still ships. Graceful degradation
 *      consistent with the other HR services.
 *
 *   2. NO masking. PDPL Art. 18 grants the data subject access
 *      to their OWN data without redaction; the route is only
 *      callable by the subject themselves (or by an admin with
 *      explicit DSAR authorization in a future commit). If the
 *      caller somehow reaches this service without being the
 *      subject, the route layer is responsible for the gate.
 *
 *   3. Export metadata includes version + article + timestamp so
 *      downstream regulators can verify provenance of a PDPL
 *      response file.
 *
 *   4. Access log capped at 5000 rows. DSAR spec says "all", but
 *      a therapist with 3 years of service generates tens of
 *      thousands of audit rows (every session write hits HR via
 *      session attendance). 5000 is a pragmatic ceiling; the
 *      response includes `access_log_truncated: true` when hit.
 *
 *   5. The service is PURE aggregation — no mutation, no writes.
 *      The ROUTE fires a `data.exported` audit event separately.
 */

const EXPORT_FORMAT_VERSION = '1.0.0';
const DEFAULT_ACCESS_LOG_WINDOW_DAYS = 365;
const ACCESS_LOG_HARD_CAP = 5000;

function createEmployeeDataExportService(deps = {}) {
  const Employee = deps.employeeModel || null;
  const EmploymentContract = deps.employmentContractModel || null;
  const Certification = deps.certificationModel || null;
  const LeaveBalance = deps.leaveBalanceModel || null;
  const Leave = deps.leaveModel || null;
  const PerformanceReview = deps.performanceReviewModel || null;
  const HrChangeRequest = deps.changeRequestModel || null;
  const auditService = deps.auditService || null;
  const nowFn = deps.now || (() => new Date());

  if (Employee == null) {
    throw new Error('employeeDataExportService: employeeModel is required');
  }

  async function findEmployeeByUserId(userId) {
    if (!userId) return null;
    return Employee.findOne({ user_id: userId, deleted_at: null }).lean();
  }

  async function findEmployeeById(employeeId) {
    if (!employeeId) return null;
    return Employee.findOne({ _id: employeeId, deleted_at: null }).lean();
  }

  async function loadSection(model, query, options = {}) {
    if (model == null) return null;
    try {
      let q = model.find(query);
      if (options.sort) q = q.sort(options.sort);
      if (options.limit) q = q.limit(options.limit);
      return await q.lean();
    } catch {
      return null;
    }
  }

  async function loadAccessLog(employeeId) {
    if (auditService == null || typeof auditService.recentAccessesFor !== 'function') {
      return { events: null, truncated: false };
    }
    try {
      const rows = await auditService.recentAccessesFor({
        employeeId: String(employeeId),
        windowDays: DEFAULT_ACCESS_LOG_WINDOW_DAYS,
        limit: ACCESS_LOG_HARD_CAP + 1, // +1 so we detect truncation
      });
      const truncated = rows.length > ACCESS_LOG_HARD_CAP;
      const events = (truncated ? rows.slice(0, ACCESS_LOG_HARD_CAP) : rows).map(e => {
        const custom = (e.metadata && e.metadata.custom) || {};
        return {
          at: e.createdAt,
          actor_user_id: e.userId ? String(e.userId) : null,
          actor_role: e.userRole || null,
          action: custom.action || null,
          event_type: e.eventType,
          resource: e.resource,
          is_self_access: Boolean(custom.isSelfAccess),
          ip_address: e.ipAddress || null,
        };
      });
      return { events, truncated };
    } catch {
      return { events: null, truncated: false };
    }
  }

  /**
   * Build the full export payload.
   *
   *   { userId }        — resolves via Employee.user_id
   *   { employeeId }    — direct Employee._id lookup (admin path)
   *
   * Returns `null` if no employee is found. Returns the full payload
   * otherwise.
   */
  async function buildExport({ userId = null, employeeId = null } = {}) {
    if (!userId && !employeeId) {
      throw new Error('employeeDataExportService.buildExport: userId or employeeId required');
    }

    const employee = employeeId
      ? await findEmployeeById(employeeId)
      : await findEmployeeByUserId(userId);
    if (!employee) return null;

    const id = employee._id;
    const now = nowFn();

    const [
      contracts,
      certifications,
      leaves,
      leaveBalances,
      performanceReviews,
      changeRequests,
      accessLogResult,
    ] = await Promise.all([
      loadSection(
        EmploymentContract,
        { employee_id: id, deleted_at: null },
        { sort: { start_date: -1 } }
      ),
      loadSection(
        Certification,
        { employee_id: id, deleted_at: null },
        { sort: { expiry_date: -1 } }
      ),
      loadSection(Leave, { employee_id: id, deleted_at: null }, { sort: { start_date: -1 } }),
      loadSection(LeaveBalance, { employee_id: id, deleted_at: null }, { sort: { year: -1 } }),
      loadSection(
        PerformanceReview,
        { employee_id: id, deleted_at: null },
        { sort: { review_period_end: -1 } }
      ),
      loadSection(
        HrChangeRequest,
        { employee_id: id, deleted_at: null },
        { sort: { createdAt: -1 } }
      ),
      loadAccessLog(id),
    ]);

    return {
      export_metadata: {
        generated_at: now.toISOString(),
        pdpl_article: 'PDPL Art. 18',
        format_version: EXPORT_FORMAT_VERSION,
        access_log_window_days: DEFAULT_ACCESS_LOG_WINDOW_DAYS,
        access_log_truncated: Boolean(accessLogResult && accessLogResult.truncated),
      },
      subject: {
        employee_id: String(id),
        employee_number: employee.employee_number || null,
        user_id: employee.user_id ? String(employee.user_id) : null,
        branch_id: employee.branch_id ? String(employee.branch_id) : null,
      },
      sections: {
        profile: employee,
        contracts,
        certifications,
        leaves,
        leave_balances: leaveBalances,
        performance_reviews: performanceReviews,
        change_requests: changeRequests,
        access_log: accessLogResult ? accessLogResult.events : null,
      },
    };
  }

  return Object.freeze({
    buildExport,
    EXPORT_FORMAT_VERSION,
    ACCESS_LOG_HARD_CAP,
  });
}

module.exports = {
  createEmployeeDataExportService,
  EXPORT_FORMAT_VERSION,
  ACCESS_LOG_HARD_CAP,
};

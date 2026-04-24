'use strict';

/**
 * hrChangeRequestService.js — Phase 11 Commit 11 (4.0.28).
 *
 * Governance layer between the admin PATCH endpoint (C10) and the
 * actual Employee record. Sensitive changes — as defined by
 * `hr-approval-rules.js` — are stored here in `pending` state; a
 * second HR_MANAGER-or-higher approves + applies, at which point
 * the change hits the Employee collection.
 *
 * Methods:
 *
 *   createRequest({ employeeId, requestorUserId, requestorRole,
 *                   proposedChanges, baseline, reason, rulesTriggered,
 *                   branchId })
 *     → creates doc in status:'pending'.
 *
 *   approveRequest({ requestId, approverUserId, approverRole })
 *     → transitions 'pending' → 'approved' → applies to Employee →
 *       'applied'. Self-approval forbidden.
 *
 *   rejectRequest({ requestId, approverUserId, approverRole, reason })
 *     → 'pending' → 'rejected'.
 *
 *   cancelRequest({ requestId, actorUserId })
 *     → requestor can cancel while 'pending'.
 *
 *   listPending({ branchId, employeeId, limit, skip })
 *     → paginated list for approver UI.
 *
 * Design decisions:
 *
 *   1. SELF-APPROVAL FORBIDDEN. The approver cannot be the requestor.
 *      Governance — you can't propose and sign-off your own raise.
 *
 *   2. STALE-BASELINE CHECK. At apply time, compare stored
 *      `baseline_values` to the Employee's CURRENT values for the
 *      same fields. If they diverge, refuse to apply and record
 *      `apply_error: 'stale_baseline'`. The request stays 'approved'
 *      (so it's auditable) but is marked inapplicable — requestor
 *      creates a new request with fresh baseline.
 *
 *   3. FIRE-AND-FORGET AUDIT. Each state transition fires an audit
 *      log entry if the audit service is injected; failures don't
 *      break the transition.
 *
 *   4. APPROVE → APPLY is a single service call. No intermediate
 *      `approved` limbo state — auditors can see the full timeline
 *      on one doc. (If a partial failure occurs, status remains
 *      `approved` with `apply_error` populated; see stale-baseline
 *      case.)
 *
 *   5. DI'd models + audit service. Tests use stubs; production
 *      wires real.
 */

function createHrChangeRequestService(deps = {}) {
  const HrChangeRequest = deps.changeRequestModel;
  const Employee = deps.employeeModel;
  const auditService = deps.auditService || null;
  // Optional — when present, state transitions fire webhook events
  // (hr.change_request.pending|approved|rejected|cancelled). Fire-
  // and-forget; dispatcher failures are swallowed so a slow/broken
  // receiver never blocks an approval.
  const webhookDispatcher = deps.webhookDispatcher || null;

  if (HrChangeRequest == null)
    throw new Error('hrChangeRequestService: changeRequestModel is required');
  if (Employee == null) throw new Error('hrChangeRequestService: employeeModel is required');

  async function createRequest({
    employeeId,
    requestorUserId,
    requestorRole,
    proposedChanges,
    baseline,
    reason = null,
    rulesTriggered = [],
    branchId = null,
    ipAddress = null,
  } = {}) {
    if (!employeeId) throw new Error('createRequest: employeeId is required');
    if (!requestorUserId) throw new Error('createRequest: requestorUserId is required');
    if (!proposedChanges || Object.keys(proposedChanges).length === 0) {
      throw new Error('createRequest: proposedChanges must be non-empty');
    }

    const doc = await HrChangeRequest.create({
      employee_id: employeeId,
      branch_id: branchId,
      requestor_user_id: requestorUserId,
      requestor_role: requestorRole,
      proposed_changes: proposedChanges,
      baseline_values: baseline || {},
      reason,
      rules_triggered: rulesTriggered,
      status: 'pending',
    });

    fireAudit({
      method: 'logHrAccess',
      payload: {
        actorUserId: requestorUserId,
        actorRole: requestorRole,
        entityType: 'employee',
        entityId: String(employeeId),
        action: 'change_request_created',
        ipAddress,
        metadata: {
          requestId: String(doc._id),
          rulesTriggered,
          changedFields: Object.keys(proposedChanges),
          changeCount: Object.keys(proposedChanges).length,
        },
      },
    });

    fireWebhook('hr.change_request.pending', buildRequestEnvelope(doc));

    return { result: 'created', request: doc.toObject() };
  }

  async function approveRequest({
    requestId,
    approverUserId,
    approverRole,
    ipAddress = null,
  } = {}) {
    if (!requestId) return { result: 'not_found' };
    if (!approverUserId) return { result: 'denied', reason: 'approver_required' };

    const doc = await HrChangeRequest.findById(requestId);
    if (!doc || doc.deleted_at) return { result: 'not_found' };

    if (doc.status !== 'pending') {
      return { result: 'invalid_state', currentStatus: doc.status };
    }
    if (String(doc.requestor_user_id) === String(approverUserId)) {
      fireAudit({
        method: 'logHrAccessDenied',
        payload: {
          actorUserId: approverUserId,
          actorRole: approverRole,
          entityType: 'change_request',
          entityId: String(requestId),
          action: 'approve',
          reason: 'self_approval_forbidden',
          ipAddress,
        },
      });
      return { result: 'denied', reason: 'self_approval_forbidden' };
    }

    // Stale-baseline check: read current Employee values for the
    // fields we're about to change and compare to snapshot.
    const existing = await Employee.findById(doc.employee_id).lean();
    if (!existing) {
      return { result: 'not_found', reason: 'employee_missing' };
    }
    const stalePaths = [];
    for (const [path, snapshot] of Object.entries(doc.baseline_values || {})) {
      const current = getByPath(existing, path);
      if (!shallowEqual(current, snapshot)) stalePaths.push(path);
    }

    doc.approver_user_id = approverUserId;
    doc.approver_role = approverRole;
    doc.approved_at = new Date();

    if (stalePaths.length > 0) {
      doc.status = 'approved';
      doc.apply_error = `stale_baseline: ${stalePaths.join(',')}`;
      await doc.save();

      fireAudit({
        method: 'logHrAccess',
        payload: {
          actorUserId: approverUserId,
          actorRole: approverRole,
          entityType: 'employee',
          entityId: String(doc.employee_id),
          action: 'change_request_approved_stale',
          ipAddress,
          metadata: {
            requestId: String(doc._id),
            stalePaths,
          },
        },
      });
      return {
        result: 'approved_not_applied',
        reason: 'stale_baseline',
        stalePaths,
        request: doc.toObject(),
      };
    }

    // Apply the patch to Employee. Use runValidators so schema enum
    // + format rules catch anything that slipped through at proposal
    // time.
    try {
      await Employee.updateOne(
        { _id: doc.employee_id, deleted_at: null },
        { $set: doc.proposed_changes },
        { runValidators: true, context: 'query' }
      );
    } catch (err) {
      doc.status = 'approved';
      doc.apply_error = `validation_failed: ${err && err.message ? err.message : 'unknown'}`;
      await doc.save();
      fireWebhook(
        'hr.change_request.approved',
        buildRequestEnvelope(doc, {
          applied: false,
          apply_error: doc.apply_error,
          approver_user_id: String(approverUserId),
          approver_role: approverRole || null,
        })
      );
      return {
        result: 'approved_not_applied',
        reason: 'validation_failed',
        error: err && err.message,
        request: doc.toObject(),
      };
    }

    doc.status = 'applied';
    doc.applied_at = new Date();
    await doc.save();

    fireAudit({
      method: 'logHrAccess',
      payload: {
        actorUserId: approverUserId,
        actorRole: approverRole,
        entityType: 'employee',
        entityId: String(doc.employee_id),
        action: 'change_request_applied',
        ipAddress,
        metadata: {
          requestId: String(doc._id),
          changedFields: Object.keys(doc.proposed_changes),
          rulesTriggered: doc.rules_triggered,
        },
      },
    });

    fireWebhook(
      'hr.change_request.approved',
      buildRequestEnvelope(doc, {
        applied: true,
        approver_user_id: String(approverUserId),
        approver_role: approverRole || null,
        applied_at: doc.applied_at ? doc.applied_at.toISOString() : null,
      })
    );

    return { result: 'applied', request: doc.toObject() };
  }

  async function rejectRequest({
    requestId,
    approverUserId,
    approverRole,
    reason = null,
    ipAddress = null,
  } = {}) {
    if (!requestId) return { result: 'not_found' };
    const doc = await HrChangeRequest.findById(requestId);
    if (!doc || doc.deleted_at) return { result: 'not_found' };
    if (doc.status !== 'pending') {
      return { result: 'invalid_state', currentStatus: doc.status };
    }

    doc.status = 'rejected';
    doc.approver_user_id = approverUserId;
    doc.approver_role = approverRole;
    doc.rejected_at = new Date();
    doc.rejection_reason = reason;
    await doc.save();

    fireAudit({
      method: 'logHrAccess',
      payload: {
        actorUserId: approverUserId,
        actorRole: approverRole,
        entityType: 'employee',
        entityId: String(doc.employee_id),
        action: 'change_request_rejected',
        ipAddress,
        metadata: {
          requestId: String(doc._id),
          rejectionReason: reason,
        },
      },
    });

    fireWebhook(
      'hr.change_request.rejected',
      buildRequestEnvelope(doc, {
        approver_user_id: String(approverUserId),
        approver_role: approverRole || null,
        rejection_reason: reason || null,
      })
    );

    return { result: 'rejected', request: doc.toObject() };
  }

  async function cancelRequest({ requestId, actorUserId, ipAddress = null } = {}) {
    if (!requestId) return { result: 'not_found' };
    const doc = await HrChangeRequest.findById(requestId);
    if (!doc || doc.deleted_at) return { result: 'not_found' };
    if (doc.status !== 'pending') {
      return { result: 'invalid_state', currentStatus: doc.status };
    }
    if (String(doc.requestor_user_id) !== String(actorUserId)) {
      return { result: 'denied', reason: 'only_requestor_can_cancel' };
    }
    doc.status = 'cancelled';
    await doc.save();
    fireAudit({
      method: 'logHrAccess',
      payload: {
        actorUserId,
        actorRole: doc.requestor_role,
        entityType: 'employee',
        entityId: String(doc.employee_id),
        action: 'change_request_cancelled',
        ipAddress,
        metadata: { requestId: String(doc._id) },
      },
    });
    fireWebhook(
      'hr.change_request.cancelled',
      buildRequestEnvelope(doc, {
        actor_user_id: String(actorUserId),
      })
    );

    return { result: 'cancelled', request: doc.toObject() };
  }

  async function listPending({ branchId = null, employeeId = null, limit = 25, skip = 0 } = {}) {
    const query = { status: 'pending', deleted_at: null };
    if (branchId) query.branch_id = branchId;
    if (employeeId) query.employee_id = employeeId;
    const [items, total] = await Promise.all([
      HrChangeRequest.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Math.min(limit, 100))
        .lean(),
      HrChangeRequest.countDocuments(query),
    ]);
    return { items, total };
  }

  function fireAudit({ method, payload }) {
    if (!auditService || typeof auditService[method] !== 'function') return;
    auditService[method](payload).catch(() => {});
  }

  function fireWebhook(eventType, payload) {
    if (!webhookDispatcher || typeof webhookDispatcher.dispatch !== 'function') {
      return;
    }
    // Fire-and-forget — a slow receiver must not block the HTTP
    // response that approved/rejected a change request.
    Promise.resolve()
      .then(() => webhookDispatcher.dispatch(eventType, payload))
      .catch(() => {});
  }

  function buildRequestEnvelope(doc, extra = {}) {
    return {
      request_id: String(doc._id),
      employee_id: String(doc.employee_id),
      branch_id: doc.branch_id ? String(doc.branch_id) : null,
      requestor_user_id: String(doc.requestor_user_id),
      requestor_role: doc.requestor_role || null,
      status: doc.status,
      changed_fields: Object.keys(doc.proposed_changes || {}),
      rules_triggered: doc.rules_triggered || [],
      ...extra,
    };
  }

  return Object.freeze({
    createRequest,
    approveRequest,
    rejectRequest,
    cancelRequest,
    listPending,
  });
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

function shallowEqual(a, b) {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (a instanceof Date || b instanceof Date) {
    return String(a) === String(b);
  }
  if (a != null && b != null && typeof a === 'object' && typeof b === 'object') {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    for (const k of aKeys) if (!shallowEqual(a[k], b[k])) return false;
    return true;
  }
  return String(a) === String(b);
}

module.exports = { createHrChangeRequestService };

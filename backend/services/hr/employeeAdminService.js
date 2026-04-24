/**
 * employeeAdminService.js — Phase 11 Commit 8 (4.0.25).
 *
 * HR-admin side of the PDPL-compliant employee directory. Where the
 * self-service endpoint (C7) serves "me", this service serves "any
 * employee I'm authorized to see" to HR managers, branch managers,
 * compliance officers, and auditors.
 *
 * Two methods:
 *
 *   listEmployees({ filters, role, callerUserId, ... })
 *     → paginated list of masked records.
 *
 *   getEmployeeById({ employeeId, role, callerUserId, ... })
 *     → single masked record. Returns null for not-found.
 *
 * Design decisions:
 *
 *   1. ROLE-GATED at the service boundary. A caller below INTERNAL
 *      tier (therapist, receptionist) who hits list/detail gets
 *      `access: 'denied'` back so the route layer can return 403. The
 *      route doesn't have to know the tier map — the service owns it.
 *
 *   2. BRANCH-SCOPED by default for sub-HQ roles. A BRANCH_MANAGER
 *      who doesn't pass `branchId` gets their own branch enforced
 *      (via `callerBranchId` in context). HQ HR roles are unscoped
 *      by default but can narrow if they want. This keeps branch
 *      managers from accidentally listing every employee org-wide.
 *
 *   3. SELF-ACCESS ELEVATION still applies. If an HR_OFFICER hits
 *      `/employees/:id` on their OWN record, they see RESTRICTED
 *      fields even though their role max is CONFIDENTIAL. Matches
 *      the self-service path — same semantic, two entry points.
 *
 *   4. Every read (list + detail) is an audit event; the service
 *      fires the call if `auditService` is injected. Fire-and-forget
 *      — audit failures don't break responses.
 *
 *   5. Projection pruning — for list queries we select only fields
 *      visible to the caller's role (via `visibleFields()`). The DB
 *      never even returns data the caller can't see. Defense in depth
 *      above masking.
 *
 *   6. Pagination with a hard ceiling (perPage ≤ 100). Prevents a
 *      cheap HR role from enumerating every employee with one call.
 */

'use strict';

const { maskRecord, maskCollection, visibleFields } = require('./hrDataMaskingService');
const {
  CLASSIFICATIONS,
  CLASSIFICATION_RANK,
  maxClassificationForRole,
} = require('../../config/hr-data-classification');
const {
  validatePatch: validateAdminPatch,
  writeTierForRole,
} = require('../../config/hr-admin-editable-fields');
const { detectTriggeredRules } = require('../../config/hr-approval-rules');

const MAX_PAGE_SIZE = 100;
const MIN_LIST_TIER = CLASSIFICATIONS.INTERNAL; // BRANCH_MANAGER and up

// HQ-tier roles that are NOT auto-scoped to a single branch. Others
// with list access still must pass through `callerBranchId` scope if
// present.
const HQ_UNSCOPED_ROLES = new Set([
  'super_admin',
  'head_office_admin',
  'ceo',
  'group_gm',
  'group_cfo',
  'group_chro',
  'compliance_officer',
  'internal_auditor',
  'hr_manager',
  'hr_supervisor',
]);

function createEmployeeAdminService(deps = {}) {
  const Employee = deps.employeeModel || null;
  const auditService = deps.auditService || null;
  // Optional: when wired, sensitive patches (per hr-approval-rules.js)
  // are routed to a pending ChangeRequest instead of hitting Employee
  // directly. When absent, the service applies immediately (legacy
  // behavior for deployments without the approval workflow).
  const changeRequestService = deps.changeRequestService || null;

  if (Employee == null) {
    throw new Error('employeeAdminService: employeeModel is required');
  }

  function canList(role) {
    const max = maxClassificationForRole(role);
    return CLASSIFICATION_RANK[max] >= CLASSIFICATION_RANK[MIN_LIST_TIER];
  }

  function clampPageSize(perPage) {
    const n = Number.parseInt(perPage, 10);
    if (Number.isNaN(n) || n < 1) return 25;
    return Math.min(n, MAX_PAGE_SIZE);
  }

  function clampPage(page) {
    const n = Number.parseInt(page, 10);
    if (Number.isNaN(n) || n < 1) return 1;
    return n;
  }

  function effectiveBranchId({ role, requestedBranchId, callerBranchId }) {
    if (HQ_UNSCOPED_ROLES.has(role)) {
      // HQ roles see cross-branch by default; accept any explicit narrowing.
      return requestedBranchId || null;
    }
    // Sub-HQ roles are always scoped to their branch — requested is
    // ignored if it disagrees.
    return callerBranchId || requestedBranchId || null;
  }

  async function listEmployees({
    filters = {},
    role,
    callerUserId,
    callerBranchId = null,
    ipAddress = null,
  } = {}) {
    if (!canList(role)) {
      fireDeniedAudit({
        actorUserId: callerUserId,
        actorRole: role,
        action: 'list',
        entityType: 'employee',
        reason: 'insufficient_privilege_for_list',
        ipAddress,
      });
      return { access: 'denied', reason: 'insufficient_privilege_for_list' };
    }

    const perPage = clampPageSize(filters.perPage);
    const page = clampPage(filters.page);
    const branchId = effectiveBranchId({
      role,
      requestedBranchId: filters.branchId,
      callerBranchId,
    });

    const query = { deleted_at: null };
    if (branchId) query.branch_id = branchId;
    if (filters.status) query.status = filters.status;
    if (filters.department) query.department = filters.department;
    if (filters.q) {
      const rx = new RegExp(escapeRegex(String(filters.q)), 'i');
      query.$or = [{ name_ar: rx }, { name_en: rx }, { employee_number: rx }, { job_title_ar: rx }];
    }

    // Projection pruning — only pull fields this role can ever see.
    // Self-access can't change this at query time (we'd have to know
    // which row IS self) so we pull role-baseline fields. If the
    // caller IS one of the returned rows, masking under self-access
    // restores those fields from a second Mongo read (skipped here —
    // admin-list context.)
    const projection = visibleFields('employee', { role }).reduce((acc, f) => {
      if (!f.includes('.')) acc[f] = 1;
      return acc;
    }, {});
    if (Object.keys(projection).length === 0) projection._id = 1;

    const [items, total] = await Promise.all([
      Employee.find(query, projection)
        .sort({ name_ar: 1 })
        .skip((page - 1) * perPage)
        .limit(perPage)
        .lean(),
      Employee.countDocuments(query),
    ]);

    const masked = maskCollection(items, 'employee', { role });

    fireSuccessAudit({
      actorUserId: callerUserId,
      actorRole: role,
      entityType: 'employee',
      action: 'list',
      ipAddress,
      metadata: {
        page,
        perPage,
        total,
        returnedCount: masked.length,
        filters: {
          branchId: branchId ? String(branchId) : null,
          status: filters.status || null,
          department: filters.department || null,
          hasQuery: Boolean(filters.q),
        },
      },
    });

    return {
      access: 'granted',
      page,
      perPage,
      total,
      totalPages: Math.ceil(total / perPage),
      items: masked,
    };
  }

  async function getEmployeeById({
    employeeId,
    role,
    callerUserId,
    callerBranchId = null,
    selfEmployeeId = null,
    ipAddress = null,
  } = {}) {
    if (!employeeId) {
      return { access: 'denied', reason: 'missing_id' };
    }

    // Detail view is gated at INTERNAL tier too. Self-access is the
    // exception: an employee CAN view their own record via this path
    // regardless of role — useful for mobile apps hitting a uniform
    // endpoint.
    const isSelf = selfEmployeeId && String(selfEmployeeId) === String(employeeId);

    if (!isSelf && !canList(role)) {
      fireDeniedAudit({
        actorUserId: callerUserId,
        actorRole: role,
        action: 'view',
        entityType: 'employee',
        entityId: employeeId,
        reason: 'insufficient_privilege_for_detail',
        ipAddress,
      });
      return { access: 'denied', reason: 'insufficient_privilege_for_detail' };
    }

    const record = await Employee.findOne({
      _id: employeeId,
      deleted_at: null,
    }).lean();

    if (record == null) {
      return { access: 'not_found', reason: 'employee_not_found' };
    }

    // Branch scoping for sub-HQ roles: if the caller is scoped to a
    // branch and the record belongs to a different branch, treat as
    // denied (avoid "found" leaks that reveal record existence).
    if (
      !isSelf &&
      !HQ_UNSCOPED_ROLES.has(role) &&
      callerBranchId &&
      record.branch_id &&
      String(record.branch_id) !== String(callerBranchId)
    ) {
      fireDeniedAudit({
        actorUserId: callerUserId,
        actorRole: role,
        action: 'view',
        entityType: 'employee',
        entityId: employeeId,
        reason: 'out_of_branch_scope',
        ipAddress,
      });
      return { access: 'denied', reason: 'out_of_branch_scope' };
    }

    const masked = maskRecord(record, 'employee', {
      role,
      selfEmployeeId,
    });

    fireSuccessAudit({
      actorUserId: callerUserId,
      actorRole: role,
      entityType: 'employee',
      entityId: employeeId,
      action: 'view',
      ipAddress,
      metadata: { isSelfAccess: isSelf },
      isSelfAccess: isSelf,
    });

    return {
      access: 'granted',
      employee: masked,
    };
  }

  // ─── audit helpers ──────────────────────────────────────────────

  function fireSuccessAudit(args) {
    if (!auditService || !auditService.logHrAccess) return;
    auditService
      .logHrAccess({
        ...args,
        isSelfAccess: Boolean(args.isSelfAccess),
      })
      .catch(() => {});
  }
  function fireDeniedAudit(args) {
    if (!auditService || !auditService.logHrAccessDenied) return;
    auditService.logHrAccessDenied(args).catch(() => {});
  }

  /**
   * Apply an admin patch to an employee record.
   *
   * Authorization is field-level: each path in the patch is checked
   * against the caller's write tier. Unknown fields + under-tiered
   * fields both reject the ENTIRE patch (atomic). The record must
   * also be in the caller's branch scope (HQ roles are unscoped).
   *
   * Returns
   *   { result: 'denied', reason }              — role has no write tier
   *   { result: 'not_found' }                   — employee not there
   *   { result: 'out_of_branch_scope' }         — sub-HQ role, wrong branch
   *   { result: 'invalid', errors }             — per-field errors
   *   { result: 'no_changes' }                  — patch validated to empty
   *   { result: 'updated', employee, changedFields, before, after }
   */
  async function updateEmployee({
    employeeId,
    role,
    callerUserId,
    callerBranchId = null,
    patch,
    ipAddress = null,
  }) {
    if (!employeeId) {
      return { result: 'denied', reason: 'missing_id' };
    }
    const tier = writeTierForRole(role);
    if (tier === 'none') {
      fireDeniedAudit({
        actorUserId: callerUserId,
        actorRole: role,
        action: 'update',
        entityType: 'employee',
        entityId: employeeId,
        reason: 'no_write_tier',
        ipAddress,
      });
      return { result: 'denied', reason: 'no_write_tier' };
    }

    const validation = validateAdminPatch(patch, role);
    if (!validation.ok) {
      return { result: 'invalid', errors: validation.errors };
    }
    if (validation.empty) {
      return { result: 'no_changes' };
    }

    const existing = await Employee.findOne({
      _id: employeeId,
      deleted_at: null,
    }).lean();
    if (existing == null) {
      return { result: 'not_found' };
    }

    // Branch scope enforcement for sub-HQ roles. Match the getEmployeeById
    // rule: out-of-scope writes are rejected, not quietly limited.
    if (
      !HQ_UNSCOPED_ROLES.has(role) &&
      callerBranchId &&
      existing.branch_id &&
      String(existing.branch_id) !== String(callerBranchId)
    ) {
      fireDeniedAudit({
        actorUserId: callerUserId,
        actorRole: role,
        action: 'update',
        entityType: 'employee',
        entityId: employeeId,
        reason: 'out_of_branch_scope',
        ipAddress,
      });
      return { result: 'out_of_branch_scope' };
    }

    const before = {};
    for (const path of Object.keys(validation.flat)) {
      before[path] = getByPath(existing, path);
    }

    // Phase 11 C11 — approval gate. If any rule triggers, route to
    // HrChangeRequest instead of applying directly. The caller still
    // gets a structured response so the UI can show "pending approval
    // from <role>".
    const rulesTriggered = detectTriggeredRules({
      patch: validation.flat,
      existing,
    });
    if (rulesTriggered.length > 0 && changeRequestService) {
      const createRes = await changeRequestService.createRequest({
        employeeId,
        requestorUserId: callerUserId,
        requestorRole: role,
        proposedChanges: validation.flat,
        baseline: before,
        rulesTriggered,
        branchId: existing.branch_id || null,
        ipAddress,
      });
      return {
        result: 'pending_approval',
        requestId: createRes.request && createRes.request._id,
        rulesTriggered,
        changedFields: Object.keys(validation.flat),
        before,
        proposed: validation.flat,
      };
    }

    try {
      await Employee.updateOne(
        { _id: employeeId, deleted_at: null },
        { $set: validation.flat },
        { runValidators: true, context: 'query' }
      );
    } catch (err) {
      // Surface Mongoose validation errors back per-field so the UI
      // can render them next to the right input.
      if (err && err.errors) {
        const errors = {};
        for (const [key, val] of Object.entries(err.errors)) {
          errors[key] = val && val.message ? val.message : 'invalid';
        }
        return { result: 'invalid', errors };
      }
      throw err;
    }

    const updated = await Employee.findById(employeeId).lean();
    if (updated == null) return { result: 'not_found' };

    const selfContext = {
      role,
      selfEmployeeId:
        callerUserId && existing.user_id && String(existing.user_id) === String(callerUserId)
          ? existing._id
          : null,
    };

    fireSuccessAudit({
      actorUserId: callerUserId,
      actorRole: role,
      entityType: 'employee',
      entityId: employeeId,
      action: 'update',
      ipAddress,
      metadata: {
        changedFields: Object.keys(validation.flat),
        changeCount: Object.keys(validation.flat).length,
        writeTier: tier,
      },
    });

    return {
      result: 'updated',
      employee: maskRecord(updated, 'employee', selfContext),
      changedFields: Object.keys(validation.flat),
      before,
      after: validation.flat,
    };
  }

  return Object.freeze({ listEmployees, getEmployeeById, updateEmployee });
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

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { createEmployeeAdminService };

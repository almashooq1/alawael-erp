'use strict';

/**
 * hrBranchScope.plugin.js — denormalize the canonical tenant key (`branchId`)
 * onto employee-scoped HR models, **derived from the record's Employee**, so the
 * platform-standard W269 cross-branch isolation (`branchFilter` +
 * `assertBranchMatch`) works on HR rows that were authored without a branch field.
 *
 * ── Why a dedicated HR plugin (and not `authorization/tenantScope.plugin.js`) ──
 * The generic tenantScope plugin stamps the **caller's** branch from the request
 * context. That is wrong for HR: a payroll / loan / health-insurance record must
 * carry the **employee's** branch, not whoever happens to create it (an HQ admin
 * creating a branch-A employee's record must tag it branch A). This plugin derives
 * `branchId` from `Employee.branch_id` via the record's employee FK, and OVERRIDES
 * any client-supplied `branchId` on create — which also closes a branch-spoof hole.
 *
 * ── Behaviour ──
 *   • Adds a `branchId` path (ref 'Branch', indexed, nullable) iff the schema
 *     doesn't already declare one. Additive + nullable → zero breaking change on
 *     existing documents (they validate; backfill fills branchId later).
 *   • On `validate` (fires on `.create()` + `.save()` with validation): when the
 *     configured employee FK is present, looks up `Employee.branch_id` and sets
 *     `branchId`. Best-effort — never throws (lazy `mongoose.model('Employee')`;
 *     swallows a missing model / not-found employee so saves never 500 on the hook).
 *   • Records with no employee FK (e.g. a candidate visa) keep `branchId: null`;
 *     the route layer decides whether null is fail-closed or allowed.
 *
 * ── Enforcement note ──
 * This plugin makes branch isolation *possible* (the row now has a filterable
 * tenant key); it does NOT enforce it. Enforcement stays explicit at the route
 * layer (`requireBranchAccess` + `branchFilter` on lists + `assertBranchMatch` on
 * id/action paths), per the W269 doctrine — see `middleware/assertBranchMatch.js`.
 *
 * Usage (in the model file, before `mongoose.model(...)`):
 *   const hrBranchScope = require('./hrBranchScope.plugin');
 *   LoanSchema.plugin(hrBranchScope);                              // default FK 'employeeId'
 *   ShiftSwapSchema.plugin(hrBranchScope, { employeeField: 'requesterId' });
 *
 * @module models/HR/hrBranchScope.plugin
 */

const mongoose = require('mongoose');
const { TENANT_FIELD } = require('../../config/constants/tenant.constants');

/**
 * @param {import('mongoose').Schema} schema
 * @param {{ field?: string, employeeField?: string }} [options]
 */
function hrBranchScopePlugin(schema, options = {}) {
  const field = options.field || TENANT_FIELD; // 'branchId'
  const employeeField = options.employeeField || 'employeeId';

  // 1) Add the tenant key only when the schema doesn't already have it
  //    (WorkforcePosition / EmploymentContract already carry a branch field).
  if (!schema.path(field)) {
    schema.add({
      [field]: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch',
        default: null,
        index: true,
      },
    });
  }

  // Introspection markers so behavioural drift tests can verify application
  // at runtime (mirrors the tenantScope.plugin `__tenantScoped` convention).
  schema.static('__hrBranchScoped', () => true);
  schema.static('__hrBranchField', () => field);
  schema.static('__hrEmployeeField', () => employeeField);

  // 2) Derive branchId from the employee at write time. Single hook on
  //    `validate` — it fires for both `.create()` and `.save()` (validation
  //    runs before persistence), so there is no double Employee lookup.
  schema.pre('validate', async function deriveHrBranchId() {
    const empId = this[employeeField];
    if (!empId) return; // no employee FK → leave branchId as-is (global/anon)
    // Re-derive when branchId is unset OR the employee link changed (covers
    // create — every path is "modified" on a new doc — and re-assignment).
    if (this[field] && !this.isModified(employeeField)) return;
    try {
      const Employee = mongoose.model('Employee');
      const emp = await Employee.findById(empId).select('branch_id branchId').lean();
      const branch = emp && (emp.branch_id || emp.branchId);
      if (branch) this[field] = branch; // override any client-supplied value
    } catch (_err) {
      // Employee model unavailable or lookup failed → best-effort, never throw.
    }
  });
}

module.exports = hrBranchScopePlugin;

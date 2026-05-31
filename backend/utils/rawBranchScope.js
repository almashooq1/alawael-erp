'use strict';

/**
 * rawBranchScope.js — W269 branch scoping for RAW driver aggregates.
 * ════════════════════════════════════════════════════════════════════
 * `db.collection('x').aggregate([{ $match: matchBase }])` bypasses the
 * tenantScope Mongoose plugin entirely (it only sees find()-family on
 * registered models). So a route that builds its `$match` from a
 * user-supplied `?branch_id=` leaks across branches two ways:
 *   1. OMISSION — caller drops the param → no branch predicate → all branches.
 *   2. SPOOFING — caller passes ANY valid ObjectId → reads that branch.
 * (Confirmed C3a leak in reports-analytics-module.routes.js — see
 * docs/architecture/AUTHZ_REMEDIATION_BACKLOG.md.)
 *
 * This applies the canonical W269 rule to a raw-collection `$match` base:
 *   - RESTRICTED caller (effectiveBranchScope returns a branchId) → the
 *     branch is FORCED to their own; the query param is ignored (no omit,
 *     no spoof).
 *   - HQ / cross-branch caller (effectiveBranchScope returns null) → MAY
 *     optionally narrow to a valid `?branch_id`; omitting it = all branches
 *     (legitimate for HQ).
 *
 * Mutates + returns matchBase. Uses `branch_id` (snake_case) — the field the
 * raw analytics collections use. NOTE: if a target collection does not carry
 * `branch_id`, a restricted caller gets an EMPTY result (fail-closed) — which
 * is the correct posture: better an empty dashboard than a cross-branch leak.
 *
 * @param {object} matchBase    the $match object to mutate
 * @param {object} req          the Express request (needs req.branchScope)
 * @param {string} [queryBranchId]  the caller-supplied ?branch_id (HQ only)
 * @returns {object} the same matchBase (for chaining)
 */
const mongoose = require('mongoose');
const { effectiveBranchScope } = require('../middleware/assertBranchMatch');

function applyRawBranchScope(matchBase, req, queryBranchId) {
  const base = matchBase || {};
  const scoped = effectiveBranchScope(req); // restricted → branchId; HQ → null
  if (scoped) {
    // FORCED to the caller's own branch. Never throw on a non-ObjectId branch id
    // (a branch CODE would crash `new ObjectId`): fall back to the raw value,
    // which simply won't match an ObjectId-typed column → fail-closed (empty),
    // never a cross-branch leak.
    const s = String(scoped);
    base.branch_id = mongoose.Types.ObjectId.isValid(s) ? new mongoose.Types.ObjectId(s) : s;
  } else if (queryBranchId && mongoose.Types.ObjectId.isValid(queryBranchId)) {
    base.branch_id = new mongoose.Types.ObjectId(queryBranchId); // HQ optional filter
  }
  return base;
}

module.exports = { applyRawBranchScope };

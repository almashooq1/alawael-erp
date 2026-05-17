'use strict';

/**
 * withBranchScope.js — Wave 33.
 *
 * The chokepoint that injects branch isolation into every Mongo
 * query. Constitution §8 rule #1:
 *
 *   "Every API query is branch-filtered server-side. The query
 *    layer injects branchId ∈ actor.scopedBranchIds BEFORE the
 *    request leaves the route handler. Frontend cannot omit or
 *    override."
 *
 * Usage (the ONLY supported pattern for branch-scoped reads):
 *
 *   // BEFORE (forbidden — branch user could read any branch):
 *   const docs = await Beneficiary.find({ status: 'active' });
 *
 *   // AFTER (Wave 33 — branch-scoped, IDOR-safe):
 *   const docs = await Beneficiary.find(
 *     withBranchScope(req.actor, { status: 'active' })
 *   );
 *
 * Behavior matrix:
 *   actor scope         → filter modification
 *   ─────────────────     ─────────────────────────────────────────
 *   GLOBAL              → no change (caller filter passes through)
 *   REGION              → branchId: { $in: actor.regionBranchIds }
 *   BRANCH              → branchId: { $in: [actor.branchId, ...elev] }
 *   OWN / ASSIGNED      → branchId: $in + $or:[{createdBy},{assignedTo}]
 *   TEMP_ELEVATED       → unioned in (only if not expired)
 *   missing actor       → throws (must pass SYSTEM_BYPASS explicitly)
 *   SYSTEM_BYPASS       → no change + audit-warning event
 *
 * The function NEVER mutates the input filter — returns a new object.
 * Existing `$or` in caller's filter is preserved by wrapping in `$and`
 * with the scope's `$or` (so both conditions hold).
 *
 * Caller-supplied `branchId` is RESPECTED but VALIDATED: if the
 * specified branch isn't in the actor's scope, the helper returns a
 * "match nothing" filter (driver returns empty instead of leaking
 * a 403 that confirms the record exists elsewhere).
 */

const DefaultAuthzService = require('./authz.service');

// Sentinel that callers pass as `actor` to explicitly skip scope.
// Used by: migrations, scheduled jobs, integration tokens that have
// already gone through their own scope-equivalent check.
const SYSTEM_BYPASS = Symbol('withBranchScope.SYSTEM_BYPASS');

// "Match nothing" sentinel filter — Mongo returns 0 docs without an
// error. Caller's code handles empty results normally; no 403/404
// information leak about other branches' data.
const MATCH_NOTHING = Object.freeze({ _id: { $exists: false } });

/**
 * Compose the caller's filter with the scope filter.
 *
 * @param {object} actor
 *   - Either a real actor (from req.actor) OR SYSTEM_BYPASS sentinel.
 * @param {object} filter
 *   - The caller's intended Mongo filter (passed through after
 *     scope is added).
 * @param {object} opts
 *   - branchField: string (default 'branchId') — for models that use
 *     a different field name (e.g. legacy models with `branch_id`).
 *   - authzService: injected for tests; defaults to a fresh instance.
 *   - onSystemBypass: optional logger callback when SYSTEM_BYPASS is
 *     used — for the audit trail.
 * @returns {object}
 *   - A new filter with branch scope applied.
 */
function withBranchScope(actor, filter = {}, opts = {}) {
  const branchField = opts.branchField || 'branchId';
  const authzService = opts.authzService || _defaultAuthzService();

  // SYSTEM_BYPASS — explicit opt-out for system callers
  if (actor === SYSTEM_BYPASS) {
    if (typeof opts.onSystemBypass === 'function') {
      try {
        opts.onSystemBypass({ filter });
      } catch {
        /* logger error must not bubble */
      }
    }
    return { ...filter };
  }

  // Missing actor → throw. Routes MUST explicitly pass an actor or
  // the bypass sentinel. Silent default-deny via empty filter would
  // hide bugs.
  if (!actor || typeof actor !== 'object') {
    throw new Error(
      'withBranchScope: actor is required. ' +
        'Pass req.actor for user requests, or withBranchScope.SYSTEM_BYPASS for system jobs.'
    );
  }

  const scope = authzService.computeScopedBranchIds(actor);

  // GLOBAL — no branch filter needed. Caller's filter passes through.
  if (scope.isGlobalScope) {
    return { ...filter };
  }

  // No scope at all (no role / unknown role) → match nothing.
  if (!scope.scopedBranchIds || scope.scopedBranchIds.length === 0) {
    return { ...MATCH_NOTHING };
  }

  // Caller specified their own branchId — validate it's in scope.
  if (Object.prototype.hasOwnProperty.call(filter, branchField)) {
    const callerBranch = filter[branchField];
    // Handle both single-value AND $in operators
    if (typeof callerBranch === 'string' || typeof callerBranch === 'object') {
      const callerBranchSet = _normalizeBranchClause(callerBranch);
      const validIntersection = callerBranchSet.filter(b =>
        scope.scopedBranchIds.includes(String(b))
      );
      if (validIntersection.length === 0) {
        // Caller asked for a branch they don't have access to → return
        // a filter that matches nothing (Mongo returns []).
        return { ...MATCH_NOTHING };
      }
      // Narrow to the intersection — caller might have asked for
      // { branchId: { $in: ['B-1', 'B-2'] } } but only has access to B-1
      const out = { ...filter };
      out[branchField] =
        validIntersection.length === 1 ? validIntersection[0] : { $in: validIntersection };
      return _attachOwnerScope(out, scope, actor);
    }
  }

  // Default: inject scoped branches
  const out = { ...filter };
  out[branchField] =
    scope.scopedBranchIds.length === 1 ? scope.scopedBranchIds[0] : { $in: scope.scopedBranchIds };

  return _attachOwnerScope(out, scope, actor);
}

// ─── Helpers ────────────────────────────────────────────────────

/**
 * For OWN / ASSIGNED scope, also require the record to be owned by
 * the actor. Combines safely with caller's existing $or via $and.
 */
function _attachOwnerScope(filter, scope, actor) {
  if (scope.scopeLevel !== 'OWN' && scope.scopeLevel !== 'ASSIGNED') {
    return filter;
  }
  if (!actor.userId) return filter;

  const ownerOr = [
    { createdBy: actor.userId },
    { assignedTo: actor.userId },
    { ownerId: actor.userId },
  ];

  // If caller already has $or, wrap both in $and so they don't clobber
  // each other. Otherwise just add $or directly.
  if (Object.prototype.hasOwnProperty.call(filter, '$or')) {
    const callerOr = filter.$or;
    const callerAnd = Array.isArray(filter.$and) ? filter.$and : [];
    const newFilter = { ...filter };
    delete newFilter.$or;
    newFilter.$and = [...callerAnd, { $or: callerOr }, { $or: ownerOr }];
    return newFilter;
  }
  return { ...filter, $or: ownerOr };
}

/**
 * Normalize a Mongo branchId clause to an array of branch ids.
 *   'B-1'              → ['B-1']
 *   { $in: ['B-1'] }   → ['B-1']
 *   { $eq: 'B-1' }     → ['B-1']
 */
function _normalizeBranchClause(clause) {
  if (typeof clause === 'string') return [clause];
  if (typeof clause !== 'object' || clause === null) return [];
  if (Array.isArray(clause.$in)) return clause.$in.map(String);
  if (clause.$eq !== undefined) return [String(clause.$eq)];
  return [];
}

let _cachedAuthzService = null;
function _defaultAuthzService() {
  if (!_cachedAuthzService) {
    _cachedAuthzService = DefaultAuthzService.createAuthzService();
  }
  return _cachedAuthzService;
}

withBranchScope.SYSTEM_BYPASS = SYSTEM_BYPASS;
withBranchScope.MATCH_NOTHING = MATCH_NOTHING;

module.exports = withBranchScope;
module.exports.SYSTEM_BYPASS = SYSTEM_BYPASS;
module.exports.MATCH_NOTHING = MATCH_NOTHING;
module.exports.withBranchScope = withBranchScope;

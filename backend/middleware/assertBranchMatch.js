'use strict';

/**
 * assertBranchMatch.js
 * ════════════════════════════════════════════════════════════════════
 * Closes the gap surfaced by the 2026-05-22 security review of the
 * W263 (AAC) + W264 (GAS) + W267 (BIP tracking) waves:
 *
 *   `requireBranchAccess` (branchScope.middleware.js) rejects requests
 *   that EXPLICITLY name a foreign branch, but does NOT auto-filter
 *   queries and does NOT block ID-based path/body lookups
 *   (`beneficiaryId`, `fbaAssessmentId`, `scaleId`, `goalId`, …).
 *   Services were assuming the middleware enforced isolation when in
 *   fact the burden is on each callsite.
 *
 * This helper is the per-document assertion every read/write of a
 * tenant-owned resource MUST call before returning or mutating data
 * to a branch-scoped caller.
 *
 * Usage in a route:
 *   const { assertBranchMatch } = require('../middleware/assertBranchMatch');
 *   const doc = await service.getById(req.params.id);
 *   if (!doc) return res.status(404)...;
 *   try {
 *     assertBranchMatch(req, doc.branchId, 'AAC profile');
 *   } catch (err) {
 *     return res.status(err.status || 500).json({ success: false, error: err.message });
 *   }
 *   res.json({ success: true, data: doc });
 *
 * Or inside a route's existing try/catch by re-throwing — _toErrorResponse
 * caller-side error helpers in the three route files in scope all map
 * messages matching `/cross-branch|access denied/i` to 403 below.
 *
 * Behaviour:
 *   - When the caller has cross-branch role (`req.branchScope.restricted === false`),
 *     the function is a no-op and returns immediately.
 *   - When restricted and `docBranchId` is missing or null, throws
 *     (fail-closed) — a tenant-owned document MUST carry branchId.
 *   - When restricted and `docBranchId` does not equal
 *     `req.branchScope.branchId`, throws a 403-flagged Error.
 *
 * Note: existing route tests in __tests__/{aac,gas,bip-tracking}-* use
 * direct-handler invocation with `req = {}` (no `req.branchScope`).
 * The first guard (`!req.branchScope?.restricted`) makes this a no-op
 * in that test pattern — existing tests stay green without modification.
 * @module middleware/assertBranchMatch
 */

/**
 * Assert that the calling user's branch scope permits access to a
 * specific tenant-owned document. Throws a 403-flagged Error on
 * mismatch; no-op on cross-branch (unrestricted) callers.
 *
 * @param {object} req - Express request, expected to carry `branchScope`
 *   from requireBranchAccess middleware. When absent, treated as
 *   unrestricted (matches test/internal-call ergonomics).
 * @param {string|ObjectId|null|undefined} docBranchId - The `branchId`
 *   of the document being accessed.
 * @param {string} [label='document'] - Label for error messages
 *   (e.g. 'AAC profile', 'GAS scale', 'FBA assessment').
 * @throws {Error & {status: 403}} on cross-branch access denied
 * @throws {Error & {status: 403}} when docBranchId missing for a
 *   restricted caller (fail-closed: refusing un-tagged docs)
 */
function assertBranchMatch(req, docBranchId, label = 'document') {
  // Cross-branch role → no-op. Also covers internal calls + tests where
  // req has no branchScope at all (?. + && guards both).
  if (!req || !req.branchScope || !req.branchScope.restricted) return;

  if (!docBranchId) {
    const err = new Error(`cross-branch access denied: ${label} has no branchId (fail-closed)`);
    err.status = 403;
    throw err;
  }

  const actorBranchId = String(req.branchScope.branchId || '');
  const docBranchIdStr = String(docBranchId);

  if (actorBranchId !== docBranchIdStr) {
    const err = new Error(`cross-branch access denied for ${label}`);
    err.status = 403;
    throw err;
  }
}

/**
 * Return the canonical branchId the caller is restricted to, or `null`
 * for cross-branch roles. Use to enforce a branch filter on list
 * queries WITHOUT trusting user-supplied `req.query.branchId`.
 *
 * For restricted users this ALWAYS returns their own branchId
 * regardless of what they typed in the query string — the supplied
 * value is ignored for safety. Cross-branch users see whatever they
 * supply (or all branches when omitted).
 *
 * @param {object} req
 * @returns {string|null}
 */
function effectiveBranchScope(req) {
  if (!req || !req.branchScope) return null;
  if (req.branchScope.restricted) {
    return req.branchScope.branchId ? String(req.branchScope.branchId) : null;
  }
  // Cross-branch role: honour explicit query filter if provided.
  if (req.query && req.query.branchId) return String(req.query.branchId);
  return null;
}

module.exports = {
  assertBranchMatch,
  effectiveBranchScope,
};

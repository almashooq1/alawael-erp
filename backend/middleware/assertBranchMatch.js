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

  const docBranchIdStr = String(docBranchId);

  // W597 — when the caller is multi-branch (active secondment), membership
  // in their branch set grants access. When branchIds[] is absent (the
  // default — secondment scope off), this collapses to the original strict
  // equality against the single primary branchId.
  const allowed =
    Array.isArray(req.branchScope.branchIds) && req.branchScope.branchIds.length
      ? req.branchScope.branchIds.map(String)
      : [String(req.branchScope.branchId || '')];

  if (!allowed.includes(docBranchIdStr)) {
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
  if (!req) return null;
  if (req.branchScope && req.branchScope.restricted) {
    return req.branchScope.branchId ? String(req.branchScope.branchId) : null;
  }
  // Cross-branch role OR test/internal path (no branchScope): honour
  // explicit query filter if provided. Treating missing scope as
  // "no constraint" preserves back-compat with handler-level unit
  // tests that pass `req = { query: { branchId: ... } }` and don't
  // simulate the requireBranchAccess middleware output.
  if (req.query && req.query.branchId) return String(req.query.branchId);
  return null;
}

/**
 * Enforce cross-branch isolation on a beneficiary-keyed route.
 *
 * For restricted callers ONLY: loads the Beneficiary by id, asserts
 * `beneficiary.branchId === req.branchScope.branchId`, throws 403 on
 * mismatch (or 404 when not found).
 *
 * For cross-branch / unrestricted callers and tests without
 * `req.branchScope`: returns immediately without any DB lookup —
 * the underlying service is allowed to handle "not found" via its
 * normal path. This keeps existing route tests green (they stub the
 * service and never set up a Beneficiary fixture).
 *
 * Throws — does not return a value. Errors carry `err.status`
 * (403 cross-branch, 404 not-found, 503 model-unavailable).
 * Catch via the route's existing try/catch + _toErrorResponse.
 *
 * @param {object} req
 * @param {string} beneficiaryId
 * @returns {Promise<void>}
 */
async function enforceBeneficiaryBranch(req, beneficiaryId) {
  if (!req || !req.branchScope || !req.branchScope.restricted) {
    return; // cross-branch / unscoped / test path — no-op
  }
  if (!beneficiaryId) {
    const err = new Error('beneficiaryId is required');
    err.status = 400;
    throw err;
  }
  const mongoose = require('mongoose');
  let Beneficiary;
  try {
    Beneficiary = mongoose.model('Beneficiary');
  } catch (_e) {
    try {
      require('../models/Beneficiary');
      Beneficiary = mongoose.model('Beneficiary');
    } catch (_e2) {
      // Restricted caller + model unavailable → fail closed.
      const err = new Error('Beneficiary model unavailable — refusing for safety (fail-closed)');
      err.status = 503;
      throw err;
    }
  }
  const ben = await Beneficiary.findById(beneficiaryId).select('branchId').lean();
  if (!ben) {
    const err = new Error('beneficiary not found');
    err.status = 404;
    throw err;
  }
  assertBranchMatch(req, ben.branchId, 'beneficiary');
}

// Back-compat alias kept until W269b consumers migrate. Returns the
// loaded beneficiary OR null on not-found OR sentinel for unrestricted
// callers, mirroring the original signature.
async function loadBeneficiaryAndAssertBranch(req, beneficiaryId) {
  if (!req || !req.branchScope || !req.branchScope.restricted) {
    return { _id: beneficiaryId, branchId: null, _unchecked: true };
  }
  if (!beneficiaryId) {
    const err = new Error('beneficiaryId is required');
    err.status = 400;
    throw err;
  }
  const mongoose = require('mongoose');
  let Beneficiary;
  try {
    Beneficiary = mongoose.model('Beneficiary');
  } catch (_e) {
    try {
      require('../models/Beneficiary');
      Beneficiary = mongoose.model('Beneficiary');
    } catch (_e2) {
      const err = new Error('Beneficiary model unavailable — refusing for safety (fail-closed)');
      err.status = 503;
      throw err;
    }
  }
  const ben = await Beneficiary.findById(beneficiaryId).select('branchId').lean();
  if (!ben) return null;
  assertBranchMatch(req, ben.branchId, 'beneficiary');
  return ben;
}

/**
 * Reject 403 when a restricted caller supplies a list of branch IDs
 * that includes any branch other than their own. Cross-branch roles
 * pass through unchanged.
 *
 * Designed for endpoints like `/ministry-comparison?branchIds=A,B,C`
 * where the query carries a list rather than a single ID.
 *
 * @param {object} req
 * @param {string[]} branchIds
 */
function assertBranchIdsAllowed(req, branchIds) {
  if (!req || !req.branchScope || !req.branchScope.restricted) return;
  if (!Array.isArray(branchIds) || branchIds.length === 0) return;
  // W597 — allowed set = secondment branchIds[] when present, else the
  // single primary branchId (back-compat default).
  const ownSet =
    Array.isArray(req.branchScope.branchIds) && req.branchScope.branchIds.length
      ? new Set(req.branchScope.branchIds.map(String))
      : new Set([String(req.branchScope.branchId || '')]);
  if (ownSet.size === 1 && ownSet.has('')) {
    const err = new Error(
      'cross-branch access denied: restricted user has no branchId (fail-closed)'
    );
    err.status = 403;
    throw err;
  }
  for (const id of branchIds) {
    if (!ownSet.has(String(id))) {
      const err = new Error(`cross-branch access denied: branchId ${id} outside caller scope`);
      err.status = 403;
      throw err;
    }
  }
}

/**
 * Express param-middleware that auto-runs enforceBeneficiaryBranch on
 * every `:beneficiaryId` URL parameter in the router it's attached to.
 *
 * Usage (one line per route file):
 *   const { branchScopedBeneficiaryParam } = require('../middleware/assertBranchMatch');
 *   router.param('beneficiaryId', branchScopedBeneficiaryParam);
 *
 * Closes the W269 → W269h gap (drift guard caught req.branchId
 * regression; this param-middleware closes the LARGER gap where
 * routes had a :beneficiaryId path param but never explicitly
 * called enforceBeneficiaryBranch). With this hook installed,
 * every restricted user's request hits a Beneficiary.findById +
 * branchId match BEFORE the route handler runs. Cross-branch
 * roles and tests without req.branchScope skip the lookup entirely.
 *
 * On 403/404/503 from the helper, this middleware sends the response
 * directly (short-circuiting the route handler chain). All other
 * errors fall through to the standard Express error middleware via
 * next(err).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @param {string} beneficiaryId - the URL parameter value
 */
async function branchScopedBeneficiaryParam(req, res, next, beneficiaryId) {
  try {
    await enforceBeneficiaryBranch(req, beneficiaryId);
    next();
  } catch (err) {
    if (err && err.status === 403) {
      return res.status(403).json({ success: false, error: err.message });
    }
    if (err && err.status === 404) {
      return res.status(404).json({ success: false, error: err.message });
    }
    if (err && err.status === 503) {
      return res
        .status(503)
        .json({ success: false, error: 'models_unavailable', message: err.message });
    }
    if (err && err.status === 400) {
      return res.status(400).json({ success: false, error: err.message });
    }
    next(err);
  }
}

/**
 * Express middleware that auto-enforces branch ownership when a
 * request body carries any of the 3 canonical beneficiary identifier
 * field names. Complements `branchScopedBeneficiaryParam` which only
 * fires for URL params.
 *
 * Recognised body fields (in priority order — first non-empty wins):
 *   1. `beneficiaryId` — primary canonical (camelCase id)
 *   2. `beneficiary`   — FK singular (ObjectId-string; W442)
 *   3. `beneficiary_id` — snake_case (W442)
 *
 * Apply once per route file:
 *   router.use(bodyScopedBeneficiaryGuard);
 *
 * Closes the W440 → W441 → W442 series gap: 47+ route files take a
 * beneficiary identifier in POST/PUT handlers without enforcement.
 * These are WRITE paths — a cross-branch write creates/modifies
 * records tagged to a foreign beneficiary, which is arguably more
 * dangerous than the read-path leaks W269 closed.
 *
 * Behaviour:
 *   - No body or no recognised field in body → no-op
 *   - Cross-branch role / no req.branchScope → no-op (test back-compat)
 *   - Restricted + mismatch → 403
 *   - Restricted + not-found → 404
 *
 * Order matters: place AFTER authenticate + requireBranchAccess so
 * `req.branchScope` is populated. The middleware no-ops when scope
 * is absent, preserving test ergonomics.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function bodyScopedBeneficiaryGuard(req, res, next) {
  const body = req && req.body;
  if (!body) return next();
  // W442: accept any of 3 canonical FK field names. Priority: explicit
  // *Id first, then snake_case, then the FK-singular `beneficiary`.
  // Body validators upstream may already coerce these — we only need
  // ONE to enforce branch isolation.
  const raw = body.beneficiaryId || body.beneficiary_id || body.beneficiary;
  if (!raw) return next();
  // Some endpoints pass `beneficiary` as a context object
  // ({ age, diagnosis, ... }) rather than an ObjectId — the
  // assessmentRecommendationEngine and a few scoring routes do this.
  // Only enforce when the value is string-like AND ObjectId-shaped.
  // Mongoose ObjectId instances coerce to 24-hex via String().
  if (typeof raw !== 'string' && (typeof raw !== 'object' || raw === null || !raw.toString)) {
    return next();
  }
  const bidStr = String(raw);
  // 24-hex Mongo ObjectId is the canonical shape across this codebase.
  // Anything else (object stringification, non-hex code) falls through.
  if (!/^[a-f0-9]{24}$/i.test(bidStr)) return next();
  try {
    await enforceBeneficiaryBranch(req, bidStr);
    next();
  } catch (err) {
    if (err && err.status === 403) {
      return res.status(403).json({ success: false, error: err.message });
    }
    if (err && err.status === 404) {
      return res.status(404).json({ success: false, error: err.message });
    }
    if (err && err.status === 503) {
      return res
        .status(503)
        .json({ success: false, error: 'models_unavailable', message: err.message });
    }
    if (err && err.status === 400) {
      return res.status(400).json({ success: false, error: err.message });
    }
    next(err);
  }
}

module.exports = {
  assertBranchMatch,
  effectiveBranchScope,
  enforceBeneficiaryBranch,
  loadBeneficiaryAndAssertBranch,
  assertBranchIdsAllowed,
  branchScopedBeneficiaryParam,
  bodyScopedBeneficiaryGuard,
};

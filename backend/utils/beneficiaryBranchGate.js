/**
 * beneficiaryBranchGate — single-record cross-tenant gate for clinical
 * collections whose schemas do NOT carry a direct `branchId` field
 * (CarePlan, TherapySession, etc).
 *
 * Background — why this exists:
 *   The legacy `routes/beneficiaries.js` cross-tenant fix (commit
 *   `5ca905fde`, 2026-05-25) was atomic: `findOne({_id, ...branchFilter})`
 *   because Beneficiary itself stores `branchId`. CarePlan + TherapySession
 *   do not — they're scoped indirectly through their parent beneficiary,
 *   so the equivalent fix needs an extra lookup.
 *
 *   Two patterns are in use across `/api` today and both are wrong:
 *     1. `findById(id)` with NO check at all → any authenticated user can
 *        read/write any branch's clinical data via direct ID. PDPL leak.
 *     2. `findById(id).populate('beneficiary', 'branchId')` then read the
 *        doc, compare branchIds, return 403 if mismatch → leaks PHI to
 *        memory + lets the caller distinguish "exists in other branch"
 *        vs "does not exist" via timing. Timing channel is borderline
 *        practical with network jitter, but the in-memory disclosure is
 *        real: any post-fetch logging / audit hook fires before the
 *        403 check.
 *
 *   This helper makes both classes a one-liner. The beneficiary lookup is
 *   cached on `req` for the lifetime of the request, so repeated calls
 *   for the same beneficiary inside one handler are free.
 *
 * Usage:
 *   const { assertBeneficiaryInScope } = require('../utils/beneficiaryBranchGate');
 *   const denied = await assertBeneficiaryInScope(req, beneficiaryIdFromUntrustedDoc);
 *   if (denied) return denied;  // already a 404 NextResponse
 *
 * Returns:
 *   null    → caller may proceed
 *   Express response (404)  → already written + ended; caller MUST return
 */

'use strict';

const mongoose = require('mongoose');
const { branchFilter } = require('../middleware/branchScope.middleware');

const CACHE_SYMBOL = Symbol.for('alawael.beneficiaryScopeCache');

function getCache(req) {
  if (!req[CACHE_SYMBOL]) req[CACHE_SYMBOL] = new Map();
  return req[CACHE_SYMBOL];
}

/**
 * Return a 404-and-done response if `beneficiaryId` is not in the
 * caller's branch scope, else `null`. Uniform "not found" so existence
 * isn't probable.
 *
 * Cross-branch / regional / HQ roles get an empty `branchFilter(req)`
 * (matches anything), so they pass through unchanged.
 *
 * `beneficiaryId` may be a string, ObjectId, or a populated subdoc with
 * `_id` — all coerced to string for the cache key.
 */
async function assertBeneficiaryInScope(req, beneficiaryId, res) {
  if (!beneficiaryId) {
    // Doc with no beneficiary linkage — nothing to gate.
    return null;
  }
  const id = String(beneficiaryId._id || beneficiaryId);
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: 'معرّف المستفيد غير صالح' });
  }

  const cache = getCache(req);
  if (cache.has(id)) {
    return cache.get(id) ? null : res.status(404).json({ success: false, message: 'غير موجود' });
  }

  // Lazy-require to avoid circular deps at middleware-load time.
  const Beneficiary = require('../models/Beneficiary');
  const scope = branchFilter(req);
  const hit = await Beneficiary.findOne({ _id: id, ...scope })
    .select('_id')
    .lean();
  cache.set(id, !!hit);
  if (!hit) {
    return res.status(404).json({ success: false, message: 'غير موجود' });
  }
  return null;
}

/**
 * Convenience: fetch a doc by id from a model whose schema has a
 * `beneficiary` ObjectId field, and reject (404) if the linked
 * beneficiary is not in the caller's branch scope.
 *
 * Returns `{ doc, denied }` where exactly one is non-null. Caller
 * pattern:
 *
 *   const { doc, denied } = await fetchScopedByBeneficiary(Model, id, req, res);
 *   if (denied) return;          // response already sent
 *   // safe to use `doc`
 */
async function fetchScopedByBeneficiary(Model, id, req, res, opts = {}) {
  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    return { doc: null, denied: true };
  }
  // We need beneficiary to enforce scope, so always select it.
  const query = Model.findById(id);
  if (opts.select) query.select(opts.select);
  if (opts.populate) {
    for (const p of [].concat(opts.populate)) query.populate(p);
  }
  const doc = opts.lean ? await query.lean() : await query;
  if (!doc) {
    res.status(404).json({ success: false, message: 'غير موجود' });
    return { doc: null, denied: true };
  }
  // Handle populated vs raw — `doc.beneficiary` may be an ObjectId, a
  // populated subdoc, or a populated Mongoose document.
  const benId = doc.beneficiary?._id || doc.beneficiary;
  const denied = await assertBeneficiaryInScope(req, benId, res);
  if (denied) return { doc: null, denied: true };
  return { doc, denied: false };
}

module.exports = {
  assertBeneficiaryInScope,
  fetchScopedByBeneficiary,
};

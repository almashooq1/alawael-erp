'use strict';

/**
 * access-grant-model-canonical-wave599.test.js
 * ════════════════════════════════════════════════════════════════════
 * ADR-034 D4 drift guard. After W597 made `models/UserBranchRole.js` the
 * canonical request-time access-scope grant, this guard prevents a 5th
 * "delegation"-shaped ACCESS primitive from silently appearing (the exact
 * fragmentation ADR-034 untangles).
 *
 * "Access-grant shape" = a Mongoose schema carrying ALL of:
 *   • a user ref       — toUserId | userId
 *   • a branch field   — branchId | branchIds
 *   • a time window    — (effectiveFrom & effectiveTo) | (validFrom & validUntil)
 *   • a lifecycle enum — 'active' + 'revoked' + 'expired'
 *
 * This shape is what discriminates an ACCESS grant from the two distinct
 * concerns that merely share the word "delegation":
 *   • models/Delegation.js (authority governance) — delegator/delegatee +
 *     startDate/endDate + branch:String → fails user-ref, window AND branch
 *     signals → not matched.
 *   • WorkflowDelegation (workflow routing) — same → not matched.
 *
 * Ratchet pattern (W340/W325c lineage): two assertions force the allowlist
 * to stay equal to source-truth — a NEW match outside the allowlist fails,
 * and a STALE allowlist entry that no longer matches fails (so when D2
 * deletes DelegationGrant, its allowlist entry MUST be removed in the same
 * commit).
 *
 * Static (regex on source) — no DB. Detector unit-tested on inline
 * fixtures so the guard can't silently match nothing.
 */

const fs = require('fs');
const path = require('path');

const BACKEND = path.join(__dirname, '..');

/**
 * Pure detector — true iff `src` defines an access-grant-shaped schema.
 * @param {string} src
 * @returns {boolean}
 */
function hasAccessGrantShape(src) {
  const userRef = /\b(toUserId|userId)\b/.test(src);
  const branch = /\b(branchId|branchIds)\b/.test(src);
  const window =
    (/\beffectiveFrom\b/.test(src) && /\beffectiveTo\b/.test(src)) ||
    (/\bvalidFrom\b/.test(src) && /\bvalidUntil\b/.test(src));
  const lifecycle =
    /['"]active['"]/.test(src) && /['"]revoked['"]/.test(src) && /['"]expired['"]/.test(src);
  return userRef && branch && window && lifecycle;
}

/** Recursively collect *.js files under `dir` (skips node_modules/__tests__). */
function walkJs(dir) {
  const out = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === '__tests__') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walkJs(full));
    else if (e.isFile() && e.name.endsWith('.js')) out.push(full);
  }
  return out;
}

const rel = p => path.relative(BACKEND, p).split(path.sep).join('/');

// The ONLY files allowed to carry the access-grant shape. UserBranchRole
// is canonical (ADR-034 D1); DelegationGrant is allowlisted ONLY during the
// D2 deprecation window — remove it when the model is deleted.
const ALLOWLIST = new Set([
  'models/UserBranchRole.js',
  'authorization/delegations/delegation.model.js',
]);

// ── Detector self-tests (prove the regex fires AND discriminates) ────
describe('W599 detector — fires on access-grant shape, ignores the rest', () => {
  it('fires on a UserBranchRole-style schema', () => {
    const src = `
      userId: { type: ObjectId, ref: 'User' },
      branchId: { type: ObjectId, ref: 'Branch' },
      validFrom: Date, validUntil: Date,
      status: { enum: ['active', 'revoked', 'expired'] }`;
    expect(hasAccessGrantShape(src)).toBe(true);
  });

  it('fires on a DelegationGrant-style schema', () => {
    const src = `
      toUserId: { type: ObjectId, ref: 'User' },
      branchIds: [{ type: ObjectId, ref: 'Branch' }],
      effectiveFrom: Date, effectiveTo: Date,
      status: { enum: ['active', 'revoked', 'expired'] }`;
    expect(hasAccessGrantShape(src)).toBe(true);
  });

  it('does NOT fire on the admin authority-governance shape (delegator/startDate/branch:String)', () => {
    const src = `
      delegator: { type: ObjectId, ref: 'User' },
      delegatee: { type: ObjectId, ref: 'User' },
      startDate: Date, endDate: Date, branch: String,
      status: { enum: ['draft', 'active', 'suspended', 'expired', 'revoked'] }`;
    expect(hasAccessGrantShape(src)).toBe(false);
  });

  it('does NOT fire on a plain tenant-scoped business model', () => {
    const src = `
      beneficiaryId: { type: ObjectId, ref: 'Beneficiary' },
      branchId: { type: ObjectId, ref: 'Branch' },
      status: { enum: ['active', 'archived'] }`;
    expect(hasAccessGrantShape(src)).toBe(false);
  });
});

// ── Ratchet drift guard against real source ──────────────────────────
describe('W599 — access-grant shape stays canonical to UserBranchRole', () => {
  const scanned = [
    ...walkJs(path.join(BACKEND, 'models')),
    ...walkJs(path.join(BACKEND, 'authorization')),
  ];
  const matched = scanned.filter(f => hasAccessGrantShape(fs.readFileSync(f, 'utf8'))).map(rel);

  it('scans a non-trivial number of files (guard is actually running)', () => {
    expect(scanned.length).toBeGreaterThan(50);
  });

  it('every access-grant-shaped model is in the allowlist (no new 5th primitive)', () => {
    const offenders = matched.filter(m => !ALLOWLIST.has(m));
    expect(offenders).toEqual([]);
  });

  it('every allowlist entry still matches the shape (ratchet — prune on D2 delete)', () => {
    const stale = [...ALLOWLIST].filter(a => !matched.includes(a));
    expect(stale).toEqual([]);
  });
});

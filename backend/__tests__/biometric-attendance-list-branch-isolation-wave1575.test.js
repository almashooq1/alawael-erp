'use strict';

/**
 * biometric-attendance-list-branch-isolation-wave1575.test.js — W1575 (static)
 *
 * branchid-override IDOR: the biometric-attendance LIST handlers built
 * `const query = {}` then `if (branchId) query.branchId = branchId` — so a
 * restricted BIOMETRIC_ROLE user (receptionist/manager) could pass any
 * `?branchId=` to read another branch's devices/shifts/attendance-logs/
 * overtime/policies, or omit it to read ALL branches. (The `:id` device reads
 * were already W448-correct.)
 *
 * Fix: `const query = { ...branchFilter(req) }` + gate the query branchId with
 * `!bf.branchId` (cross-branch roles only) — the W1570 inventory pattern.
 *
 * Static (source-regex) only — no jest.unmock/DB — not sprint-enumerated.
 */

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'biometric-attendance.routes.js'),
  'utf8'
);

describe('W1575 — biometric-attendance list handlers are branch-isolated', () => {
  test('no list handler trusts ?branchId unconditionally', () => {
    // The vulnerable form: `if (branchId) query.branchId = branchId;`
    expect(SRC).not.toMatch(/if \(branchId\) query\.branchId = branchId;/);
    // Also no bare `const query = branchId ? { branchId } : {}` override.
    expect(SRC).not.toMatch(/const query = branchId \? \{ branchId \} : \{\}/);
  });

  test('list handlers seed the query from branchFilter(req)', () => {
    // 5 handlers were fixed (devices, shifts, logs, overtime, policies).
    const seeded = (SRC.match(/const query = \{ \.\.\.bf \}/g) || []).length;
    expect(seeded).toBeGreaterThanOrEqual(4);
    expect(SRC).toMatch(/const bf = branchFilter\(req\)/);
  });

  test('query branchId is gated to cross-branch roles (!bf.branchId)', () => {
    const gated = (SRC.match(/if \(branchId && !bf\.branchId\) query\.branchId = branchId;/g) || [])
      .length;
    expect(gated).toBeGreaterThanOrEqual(4);
  });

  test('branchFilter is imported', () => {
    expect(SRC).toMatch(/branchFilter.*require\('\.\.\/middleware\/branchScope\.middleware'\)/);
  });
});

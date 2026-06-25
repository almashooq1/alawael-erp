/**
 * W1505 — WhatsApp assignable-staff endpoint drift guard
 *
 * Static (source-shape) guards for the branch-scoped staff roster that powers
 * the Inbox transfer picker. No DB, no boot.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROUTE_SRC = fs.readFileSync(path.join(__dirname, '../routes/whatsapp.routes.js'), 'utf8');

function staffSlice() {
  const idx = ROUTE_SRC.indexOf("'/assignable-staff'");
  return idx === -1 ? '' : ROUTE_SRC.slice(idx, idx + 700);
}

describe('W1505 GET /assignable-staff', () => {
  test('route is declared', () => {
    expect(ROUTE_SRC).toContain("'/assignable-staff'");
  });

  test('is branch-scoped + filters to active staff', () => {
    const slice = staffSlice();
    expect(slice).toMatch(/effectiveBranchScope\(req\)/);
    expect(slice).toMatch(/if\s*\(branchScope\)\s*filter\.branchId\s*=\s*branchScope/);
    expect(slice).toMatch(/isActive:\s*true/);
  });

  test('returns ONLY the minimal display projection (id + fullName + role)', () => {
    const slice = staffSlice();
    expect(slice).toMatch(/\.select\(\s*['"]_id fullName role['"]\s*\)/);
  });

  test('never leaks sensitive fields (password / mfa / token / secret)', () => {
    const slice = staffSlice();
    expect(slice).not.toMatch(/password|mfa|token|secret|backupCodes/i);
  });

  test('uses the lazy User-model resolver', () => {
    expect(ROUTE_SRC).toMatch(/function getUserModel/);
    expect(staffSlice()).toMatch(/getUserModel\(\)/);
  });
});

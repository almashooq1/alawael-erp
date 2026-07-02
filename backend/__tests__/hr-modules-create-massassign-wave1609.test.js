'use strict';

/**
 * W1609 — hr-modules generic-CRUD create mass-assignment / cross-branch-create guard.
 *
 * WHY: `attachCrud`'s `router.post(prefix, authorize(writeRoles), …)` did
 * `M.create({ ...req.body })` — a raw spread. The read/get/patch paths all apply
 * branch isolation (listScopeFilter / guardDocBranch), but the CREATE did not, so
 * a writeRoles user (some modules allow `employee`) could forge system keys AND
 * POST a foreign `branchId` to create records in another branch. Fix: strip
 * forgeable system fields + pin the caller's own branch (branchFilter) for
 * branch-isolated modules. (W269/W1448 hardened reads/updates but left create.)
 *
 * Static: reads the route source as text.
 */

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.resolve(__dirname, '..', 'routes', 'hr', 'hr-modules.routes.js'),
  'utf8'
);

describe('hr-modules generic CRUD create hardening (W1609)', () => {
  test('POST create does NOT spread raw req.body into M.create (mass-assign / cross-branch)', () => {
    expect(SRC).not.toMatch(/M\.create\(\s*\{\s*\.\.\.req\.body\s*\}\s*\)/);
  });

  test('create path strips forgeable system fields + pins the caller branch for scoped modules', () => {
    const createIdx = SRC.indexOf('router.post(prefix');
    expect(createIdx).toBeGreaterThan(-1);
    const block = SRC.slice(createIdx, createIdx + 1200);
    // strips system fields
    expect(block).toMatch(/_id[\s\S]*__v/);
    // pins caller branch (matches read/update isolation) for branch-isolated modules
    expect(block).toMatch(/branchFilter\(req\)/);
    expect(block).toMatch(/body\.branchId\s*=/);
  });
});

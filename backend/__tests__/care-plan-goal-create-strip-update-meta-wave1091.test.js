'use strict';

/**
 * care-plan-goal-create-strip-update-meta-wave1091.test.js — W1091.
 *
 * Anti-mass-assignment drift guard for the care-plan goal CREATE route.
 *
 * POST /admin/care-plans/:id/goals/:domainPath used to `$push: { [path]:
 * req.body }` — raw, unsanitized — letting a client mass-assign meta/auth
 * fields (_id, createdBy/At, role, isAdmin) or pollute the prototype on goal
 * CREATE. The sibling PATCH route already sanitized via stripUpdateMeta()
 * (the W506/W507 "zero raw req.body" doctrine); only this POST skipped it.
 * Surfaced while securing the R1 Goal.linkedMeasures write path (the field
 * lands in this very array).
 *
 * Pure source-text analysis (no boot). Locks the create route to the same
 * sanitizer the update route uses, and forbids the raw-spread regression.
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/care-plan-goal-create-strip-update-meta-wave1091.test.js
 */

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'care-plans-admin.routes.js'),
  'utf-8'
);

describe('W1091 — care-plan goal CREATE is sanitized (no mass assignment)', () => {
  test('stripUpdateMeta is imported/available in the route module', () => {
    expect(SRC).toMatch(/stripUpdateMeta/);
  });

  test('the goal-create $push wraps the body in stripUpdateMeta()', () => {
    expect(SRC).toMatch(/\$push:\s*\{\s*\[path\]:\s*stripUpdateMeta\(\s*req\.body\s*\)/);
  });

  test('ANTI-REGRESSION: no raw `$push: { [path]: req.body }` spread remains', () => {
    // The fixed form is `[path]: stripUpdateMeta(req.body)`. A raw push would be
    // `[path]: req.body` with nothing between the colon and req.body — forbid it.
    expect(SRC).not.toMatch(/\[path\]:\s*req\.body\b/);
  });

  test('the PATCH update route still sanitizes via stripUpdateMeta (unchanged)', () => {
    expect(SRC).toMatch(/Object\.assign\(\s*goal,\s*stripUpdateMeta\(\s*req\.body\s*\)\s*\)/);
  });
});

/**
 * W504 — close cross-beneficiary IDOR on POST
 * /api/students/:id/assignments/:assignmentId/submit.
 *
 * Pre-W504 the handler:
 *   1. Called assertBeneficiaryInScope(req, req.params.id) — ensures
 *      caller can act on beneficiary :id.
 *   2. Loaded the assignment via HomeAssignment.findById(req.params.assignmentId)
 *      — WITHOUT verifying that assignment.beneficiary === :id.
 *   3. Mutated and saved the assignment.
 *
 * Attack:
 *
 *   - Staff in branch A has scope on beneficiary X (in branch A).
 *   - Staff knows or guesses an :assignmentId belonging to beneficiary
 *     Y (in branch B, completely outside scope).
 *   - Staff hits POST /students/X/assignments/<Y's-assignmentId>/submit.
 *   - Step 1 passes (X is in scope).
 *   - Step 2 loads Y's assignment.
 *   - Step 3 mutates Y's assignment.
 *
 * Net effect: cross-branch assignment tampering. The branch boundary
 * is enforced on the URL prefix (the :id) but not on the nested
 * resource that the URL claims it belongs to.
 *
 * Fix: replace findById with findOne({_id: :assignmentId, beneficiary:
 * :id}). Now the assignment is fetched only if it actually belongs to
 * the in-scope beneficiary. Non-matching :assignmentId → 404 (no
 * leak), no mutation. Matches the W269 + W441 + W442 doctrine
 * (bind sub-resource to its parent in the same Mongoose query).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROUTE_FILE = path.join(__dirname, '..', 'routes', 'students.routes.js');
const src = fs.readFileSync(ROUTE_FILE, 'utf8');

describe('W504 — students.routes assignment-submit IDOR closed', () => {
  test('POST submit uses findOne({_id, beneficiary: req.params.id}) (not bare findById)', () => {
    // Source contains the binding query
    expect(src).toMatch(
      /HomeAssignment\.findOne\(\s*\{[\s\S]*?_id:\s*req\.params\.assignmentId[\s\S]*?beneficiary:\s*req\.params\.id[\s\S]*?\}\s*\)/
    );
  });

  test('bare HomeAssignment.findById(req.params.assignmentId) no longer present', () => {
    // Strip line comments so the historical doc-comment ("Pre-W504 the route
    // fetched by :assignmentId alone and mutated WITHOUT ...") doesn't
    // false-positive.
    const code = src
      .split('\n')
      .map(l => l.replace(/\/\/.*$/, ''))
      .join('\n');
    expect(code).not.toMatch(/HomeAssignment\.findById\(\s*req\.params\.assignmentId\s*\)/);
  });

  test('assertBeneficiaryInScope still gates the parent :id (defense-in-depth Layer 1)', () => {
    // Layer 1 (parent gate) must remain — the IDOR fix is Layer 2 on top.
    expect(src).toMatch(/assertBeneficiaryInScope\(\s*req\s*,\s*req\.params\.id/);
  });

  test('W504 doc comment present', () => {
    expect(src).toMatch(/W504/);
  });

  test('module loads without throwing', () => {
    expect(() => require('../routes/students.routes')).not.toThrow();
  });
});

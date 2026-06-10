'use strict';

/**
 * mass-assignment-update-routes-wave1112.test.js — anti-mass-assignment drift guard.
 *
 * A sweep (sibling of W1091) found several authenticated PUT/PATCH handlers
 * writing raw `$set: req.body` to the DB — deviating from this codebase's own
 * UPDATE doctrine (W506/W507: care-plans-admin PATCH + ~18 Object.assign sites
 * all wrap the body in stripUpdateMeta). Raw `$set: req.body` lets an authed
 * client overwrite any schema field on an existing doc (status/ownership/etc.).
 *
 * Fixed the two verified-LIVE, clinically-sensitive surfaces (both dualMountAuth):
 *   - routes/tasks.routes.js               PUT /:id                 (Task)
 *   - routes/therapist-extended.routes.js  PUT treatment-plans/:id  (CarePlan)
 *                                          PATCH …/goals/:goalId    (CarePlan goal)
 *                                          PUT prescriptions/:id    (Prescription)
 *                                          PUT professional-dev/:id (ProfessionalDev)
 *
 * Full tiered findings (incl. workflow + hr-modules + Tier-2/3, pending per-route
 * mount verification) live in
 * docs/architecture/SECURITY-mass-assignment-sweep-2026-06-10.md.
 *
 * Pure source-text drift guard. Run:
 *   cd backend && npx jest --config=jest.config.js __tests__/mass-assignment-update-routes-wave1112.test.js
 */

const fs = require('fs');
const path = require('path');

const read = p => fs.readFileSync(path.join(__dirname, '..', 'routes', p), 'utf-8');
const TASKS = read('tasks.routes.js');
const THERAPIST = read('therapist-extended.routes.js');

describe('W1112 — UPDATE routes sanitize req.body (no mass assignment)', () => {
  test('tasks.routes imports stripUpdateMeta from utils/sanitize', () => {
    expect(TASKS).toMatch(/require\(['"]\.\.\/utils\/sanitize['"]\)/);
    expect(TASKS).toMatch(/stripUpdateMeta/);
  });

  test('therapist-extended.routes imports stripUpdateMeta from utils/sanitize', () => {
    expect(THERAPIST).toMatch(/require\(['"]\.\.\/utils\/sanitize['"]\)/);
    expect(THERAPIST).toMatch(/stripUpdateMeta/);
  });

  test('ANTI-REGRESSION: no raw `$set: req.body` in tasks.routes', () => {
    expect(TASKS).not.toMatch(/\$set:\s*req\.body\b/);
  });

  test('ANTI-REGRESSION: no raw `$set: req.body` in therapist-extended.routes', () => {
    expect(THERAPIST).not.toMatch(/\$set:\s*req\.body\b/);
  });

  test('ANTI-REGRESSION: the goals subdoc replace sanitizes the body spread', () => {
    // Must NOT spread req.body raw into the matched goal element.
    expect(THERAPIST).not.toMatch(/'goals\.\$':\s*\{\s*\.\.\.req\.body\b/);
    expect(THERAPIST).toMatch(/'goals\.\$':\s*\{\s*\.\.\.stripUpdateMeta\(req\.body\)/);
  });

  test('the fixed $set paths use stripUpdateMeta', () => {
    expect(TASKS).toMatch(/\$set:\s*stripUpdateMeta\(req\.body\)/);
    expect(THERAPIST).toMatch(/\$set:\s*stripUpdateMeta\(req\.body\)/);
  });
});

'use strict';

/**
 * bi-analytics-branch-scope-wave656.test.js
 * ════════════════════════════════════════════════════════════════════
 * R4 Phase-B guard for the executive BI dashboard (routes/bi-analytics.routes.js).
 * It aggregates four branchId-bearing models — Beneficiary, TherapySession
 * (W647), CarePlan (W654), ClinicalAssessment — across /sessions, /beneficiaries,
 * /goals, /branches. W656 finished it by scoping the demographics + per-branch
 * comparison; W647/W654 did sessions + goals.
 *
 * This guard locks the dashboard: every aggregate on those models must carry a
 * branch-scoped $match (via `scope`/branchFilter), and the router must keep
 * requireBranchAccess so branchFilter(req) actually resolves. branchFilter = {}
 * for cross-branch/HQ analysts, so org-wide BI is preserved while branch-level
 * users are restricted.
 */

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'bi-analytics.routes.js'),
  'utf8'
);

const MODELS = ['Beneficiary', 'TherapySession', 'CarePlan', 'ClinicalAssessment'];

function aggregateBodies(src, model) {
  const re = new RegExp(`${model}\\.aggregate\\s*\\(\\s*\\[`, 'g');
  const bodies = [];
  let m;
  while ((m = re.exec(src))) {
    const end = src.indexOf(']),', m.index);
    bodies.push(src.slice(m.index, end === -1 ? m.index + 700 : end));
  }
  return bodies;
}

describe('W656 — every bi-analytics aggregate on a branch-bearing model is scoped', () => {
  it('the router enforces requireBranchAccess (branchFilter resolves)', () => {
    expect(SRC).toMatch(/router\.use\(\s*requireBranchAccess\s*\)/);
    expect(SRC).toMatch(/branchFilter/);
  });

  for (const model of MODELS) {
    it(`every ${model}.aggregate pipeline has a branch-scoped $match`, () => {
      const bodies = aggregateBodies(SRC, model);
      const unscoped = bodies
        .map((b, i) => ({ i, ok: /\$match[^]*?(scope|branchFilter)/.test(b) }))
        .filter(x => !x.ok)
        .map(x => x.i);
      expect(unscoped).toEqual([]);
    });
  }
});

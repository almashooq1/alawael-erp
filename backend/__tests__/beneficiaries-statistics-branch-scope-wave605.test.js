'use strict';

/**
 * beneficiaries-statistics-branch-scope-wave605.test.js
 * ════════════════════════════════════════════════════════════════════
 * R4 remediation regression guard. The R4 audit (audit:untenanted-
 * aggregations --pii-routes) surfaced a CONFIRMED cross-branch leak:
 * GET /api/beneficiaries/statistics ran `Beneficiary.aggregate([{ $match:
 * { isArchived... } }])` with NO branchId. Since .aggregate() bypasses the
 * tenantScope plugin, a single-branch caller saw all-13-branch counts /
 * age + progress distributions. Fixed by adding `...branchFilter(req)` to
 * each pipeline's $match.
 *
 * This static guard locks the fix: EVERY `Beneficiary.aggregate(` call in
 * routes/beneficiaries.js must reference branchFilter inside the pipeline,
 * so the leak can't silently regress. (routes/beneficiaries.js applies
 * router.use(requireBranchAccess), so req.branchScope is always populated.)
 */

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'routes', 'beneficiaries.js'), 'utf8');

describe('W605 — every Beneficiary.aggregate in beneficiaries.js is branch-scoped', () => {
  // Collect each `Beneficiary.aggregate(` call site + a window covering its
  // pipeline (up to the next `]);` that closes the aggregate array).
  function aggregateBodies(src) {
    const bodies = [];
    const re = /Beneficiary\.aggregate\s*\(\s*\[/g;
    let m;
    while ((m = re.exec(src))) {
      const start = m.index;
      const end = src.indexOf(']);', start);
      bodies.push(src.slice(start, end === -1 ? start + 800 : end + 3));
    }
    return bodies;
  }

  const bodies = aggregateBodies(SRC);

  it('finds the statistics aggregates (guard is actually running)', () => {
    expect(bodies.length).toBeGreaterThanOrEqual(3);
  });

  it('every Beneficiary.aggregate pipeline references branchFilter(req)', () => {
    const unscoped = bodies
      .map((b, i) => ({ i, ok: /branchFilter\s*\(\s*req\s*\)/.test(b) }))
      .filter(x => !x.ok)
      .map(x => x.i);
    expect(unscoped).toEqual([]);
  });

  it('the route file still enforces requireBranchAccess (req.branchScope populated)', () => {
    expect(SRC).toMatch(/router\.use\(\s*requireBranchAccess\s*\)/);
  });
});

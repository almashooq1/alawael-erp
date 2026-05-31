'use strict';

/**
 * crisis-incident-aggregate-branch-scope-wave608.test.js
 * ════════════════════════════════════════════════════════════════════
 * R4 remediation regression guard (sibling of W605). The crisis dashboard
 * (routes/crisis.routes.js) ran two `CrisisIncident.aggregate([{ $match:
 * { isDeleted... } }])` pipelines with NO branchId. CrisisIncident is
 * beneficiary-clinical (ADR-033) and carries branchId, but .aggregate()
 * bypasses the tenantScope plugin → a single-branch caller saw all-branch
 * crisis type/severity breakdowns. Fixed by adding `...branchFilter(req)`
 * to each $match (returns {} for cross-branch/HQ roles, so emergency-ops
 * oversight keeps all-branch visibility).
 *
 * The facility EmergencyPlan / EmergencyDrill queries are intentionally
 * NOT scoped — those models have no branchId and are org-wide (ADR-033
 * facility-emergency subsystem).
 */

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'routes', 'crisis.routes.js'), 'utf8');

describe('W608 — every CrisisIncident.aggregate in crisis.routes.js is branch-scoped', () => {
  function aggregateBodies(src) {
    const bodies = [];
    const re = /CrisisIncident\.aggregate\s*\(\s*\[/g;
    let m;
    while ((m = re.exec(src))) {
      const start = m.index;
      const end = src.indexOf(']);', start);
      bodies.push(src.slice(start, end === -1 ? start + 800 : end + 3));
    }
    return bodies;
  }

  const bodies = aggregateBodies(SRC);

  it('finds the CrisisIncident aggregates (guard is running)', () => {
    expect(bodies.length).toBeGreaterThanOrEqual(2);
  });

  it('every CrisisIncident.aggregate pipeline references branchFilter(req)', () => {
    const unscoped = bodies
      .map((b, i) => ({ i, ok: /branchFilter\s*\(\s*req\s*\)/.test(b) }))
      .filter(x => !x.ok)
      .map(x => x.i);
    expect(unscoped).toEqual([]);
  });

  it('the router still enforces requireBranchAccess', () => {
    expect(SRC).toMatch(/router\.use\(\s*requireBranchAccess\s*\)/);
  });
});

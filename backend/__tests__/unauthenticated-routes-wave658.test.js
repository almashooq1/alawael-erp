'use strict';

/**
 * unauthenticated-routes-wave658.test.js
 * ════════════════════════════════════════════════════════════════════
 * R4 security follow-up (surfaced by W657's per-mount auth discovery).
 * This repo authenticates PER-MOUNT: dualMountAuth() adds `authenticate`,
 * dualMount() does not. The new audit:unauthenticated-routes tool found
 * three route files mounted via plain dualMount with NO in-file auth —
 * i.e. anonymous-reachable:
 *   - alerts.routes.js            (operational alerts)
 *   - rehab-licenses.routes.js    (92 routes, compliance/admin)
 *   - independentLiving.routes.js (31 routes, clinical /assessments)
 * W658 promoted all three to dualMountAuth.
 *
 * This guard locks the fix: those mounts must stay dualMountAuth, and
 * the audit must report ZERO high-confidence unauthenticated files.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const FEATURES = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'registries', 'features.registry.js'),
  'utf8'
);
const CLINICAL = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'registries', 'clinical-assessment.registry.js'),
  'utf8'
);

describe('W658 — the three anon-reachable routes are now mounted with auth', () => {
  it("alerts is dualMountAuth (not bare dualMount)", () => {
    expect(FEATURES).toMatch(/dualMountAuth\(app,\s*'alerts'/);
    expect(FEATURES).not.toMatch(/dualMount\(app,\s*'alerts'/);
  });
  it('rehab-licenses is dualMountAuth', () => {
    expect(FEATURES).toMatch(/dualMountAuth\(app,\s*'rehab-licenses'/);
    expect(FEATURES).not.toMatch(/dualMount\(app,\s*'rehab-licenses'/);
  });
  it('independent-living is dualMountAuth', () => {
    expect(CLINICAL).toMatch(/dualMountAuth\(app,\s*'independent-living'/);
    expect(CLINICAL).not.toMatch(/dualMount\(app,\s*'independent-living'/);
  });
});

describe('W658 — audit reports zero high-confidence unauthenticated routes', () => {
  it('audit:unauthenticated-routes --json → confirmedCount 0', () => {
    const out = execFileSync(
      process.execPath,
      [path.join(__dirname, '..', 'scripts', 'audit-unauthenticated-routes.js'), '--json'],
      { encoding: 'utf8' }
    );
    const result = JSON.parse(out);
    expect(result.confirmedCount).toBe(0);
  });
});

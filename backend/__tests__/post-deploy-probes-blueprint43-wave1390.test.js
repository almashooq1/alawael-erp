'use strict';

/**
 * W1390 — lock the post-deploy smoke probes for the blueprint-43 +
 * launch-readiness surfaces.
 *
 * post-deploy-smoke.js catches "route registered in code but unmounted in the
 * registry" (its documented purpose). This session shipped 5 auth-gated read
 * surfaces that back LIVE web-admin screens — a silent 404 on any = a blank
 * operator page. This guard ensures their probes stay in the smoke list (a
 * future probe-list refactor can't silently drop them).
 *
 * Static: reads the script source (the script's main() hits the network, so
 * we assert on the PROBES declaration text, not by running it).
 */

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'scripts', 'post-deploy-smoke.js'),
  'utf8'
);

const REQUIRED_PROBES = [
  '/api/v1/next-best-action/catalogue', // W1206
  '/api/v1/pathway-bundles', // W1205
  '/api/v1/outcomes-rollup/center', // W1214
  '/api/v1/email-templates', // W1242
  '/api/v1/launch-readiness', // W1375
];

describe('W1390 — blueprint-43 / launch surfaces have post-deploy mount probes', () => {
  test.each(REQUIRED_PROBES)('probes %s via mountedRoute', (probePath) => {
    // mountedRoute(name, path) → critical mount probe (accepts 401/403, rejects 404/5xx)
    const re = new RegExp(`mountedRoute\\([^)]*'${probePath.replace(/[/]/g, '\\/')}'`);
    expect(SRC).toMatch(re);
  });

  test('all five are declared inside the PROBES array (before its close)', () => {
    const probesStart = SRC.indexOf('const PROBES = [');
    const probesEnd = SRC.indexOf('];', probesStart);
    expect(probesStart).toBeGreaterThan(-1);
    const block = SRC.slice(probesStart, probesEnd);
    for (const p of REQUIRED_PROBES) expect(block).toContain(p);
  });

  test('they use the critical mount predicate (not a bespoke weaker check)', () => {
    // mountedRoute sets critical:true + expect r.status!==404 && <500 — assert
    // we reused the helper rather than hand-rolling a probe that could pass on 404.
    for (const p of REQUIRED_PROBES) {
      expect(SRC).toMatch(new RegExp(`mountedRoute\\('[^']+',\\s*'${p.replace(/[/]/g, '\\/')}'\\)`));
    }
  });
});

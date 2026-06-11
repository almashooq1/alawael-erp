/**
 * W1192 — locks the canonical auditor's `../routes` safeMount coverage.
 *
 * `scripts/audit-unauthenticated-routes.js` models per-mount auth so it can flag
 * routes mounted with no auth and no in-file gate. It modelled `dualMount(Auth)`,
 * `app.use`, and `safeMount(app, …, './X.routes')` — but NOT the dominant
 * `safeMount(app, paths, '../routes/X.routes')` spelling the registries actually
 * use. That blind spot is exactly why the W1190/W1191 anonymous dashboard/rehab
 * `safeMount` aliases reported `confirmedCount: 0` while they were live.
 *
 * W1192 adds the `../routes` safeMount regex (~115 more mounts modelled) and
 * allowlists the 3 intentionally-public routes it newly surfaces. This guard
 * locks both so the coverage can't silently regress.
 *
 * NOTE: this auditor is a TRIAGE heuristic (file-centric — it clears a route that
 * is authed at ANY mount, so it does NOT catch a route authed at one mount yet
 * exposed unauthed at another — the W1191 class). The mount-centric authority for
 * the safeMount class is `dashboard-rehab-safemount-auth-wave1191`; this guard
 * only hardens the canonical tool's confirmedCount signal.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const AUDITOR = path.join(__dirname, '..', 'scripts', 'audit-unauthenticated-routes.js');
const src = fs.readFileSync(AUDITOR, 'utf8');

describe('W1192 auditor models ../routes safeMount + stays clean', () => {
  test('source models the ../routes safeMount spelling (anti-revert)', () => {
    // declared + used in a mark(false, …) loop → 2+ occurrences
    expect((src.match(/safeMountParentRe/g) || []).length).toBeGreaterThanOrEqual(2);
    // the regex targets the ../routes form (not just ./)
    expect(src).toContain('../routes/X.routes'); // appears in the explaining comment
  });

  test('KNOWN_PUBLIC allowlists the 3 intentionally-public routes W1192 surfaced', () => {
    for (const slug of ['build-info.routes.js', 'integrations-metrics.routes.js', 'otp-auth.routes.js']) {
      expect(src).toContain(`'${slug}'`);
    }
  });

  test('audit --json → confirmedCount 0 with the broadened safeMount model', () => {
    const out = execFileSync(process.execPath, [AUDITOR, '--json'], { encoding: 'utf8' });
    const result = JSON.parse(out);
    expect(result.confirmedCount).toBe(0);
  });
});

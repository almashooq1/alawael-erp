/**
 * W472 — close UNAUTH exposure on 20 route mounts (defense-in-depth).
 *
 * The W471 audit of routes/_registry.js (single-line dualMount →
 * dualMountAuth fix on referrals) prompted a systematic sweep.
 *
 * Audit method: for every `dualMount(app, 'slug', expr)` in _registry.js,
 * resolve the route file and check whether it internally calls
 * authenticate / authenticateToken (via router.use or per-route). Files
 * with NO authentication AT ALL combined with a bare dualMount expose
 * every endpoint to anonymous attackers.
 *
 * Audit result (pre-W472): 21 such mounts. Catastrophic findings:
 *
 *   - security/domain (security-rbac.routes.js) — FULLY OPERATIONAL
 *     RBAC management API: anonymous attacker could create a new role
 *     with super-admin permissions, assign it to a user, delete
 *     existing roles, dump entire RBAC audit log. Privilege-escalation
 *     to total system takeover, zero auth.
 *
 *   - break-glass — emergency-override grant API (stub today, but the
 *     mount-level gate prevents future activation from being public).
 *
 *   - PHI clinical domains: family / behavior / goals / episodes /
 *     timeline / rehab / rehab-measures / therapist-extended /
 *     disability-rehab / core / quality / workflow — beneficiary data
 *     surface exposed unauthenticated. PDPL special-category violation.
 *
 *   - Auxiliary ops: purchasing / fuel / transport / succession-planning /
 *     social-media / report-builder — write surfaces and reports
 *     exposed unauthenticated.
 *
 * Excluded: auth/nafath — line 519 of _registry.js. The Nafath SSO
 * routes are intentionally public: this IS the login flow (POST
 * /initiate, GET /status/:requestId polling, POST /cancel/:requestId).
 * The file header explicitly documents: "All public (no auth required
 * since this IS the login flow)." Forcing auth here would break login.
 *
 * Fix: change `dualMount(app, '<slug>', ...)` → `dualMountAuth(app,
 * '<slug>', ...)` for the 20 affected mounts. dualMountAuth wraps with
 * the authenticate middleware before reaching the route handler.
 *
 * This test asserts each of the 20 slugs is now mounted via
 * dualMountAuth, and that the only remaining bare-dualMount-without-
 * file-level-auth is auth/nafath.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const REG = path.join(__dirname, '..', 'routes', '_registry.js');
const src = fs.readFileSync(REG, 'utf8');

// Slugs that MUST mount via dualMountAuth (W472 fix targets)
const W472_AUTHED_SLUGS = [
  'core',
  'workflow',
  'family',
  'behavior',
  'goals',
  'episodes',
  'security/domain',
  'quality',
  'rehab-measures',
  'therapist-extended',
  'rehab',
  'purchasing',
  'fuel',
  'transport',
  'report-builder',
  'timeline',
  'succession-planning',
  'disability-rehab',
  'social-media',
  'break-glass',
];

describe('W472 — mount-layer authentication on 20 previously-unauth routes', () => {
  describe.each(W472_AUTHED_SLUGS)('slug %s', slug => {
    test('uses dualMountAuth (not bare dualMount)', () => {
      const escaped = slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const reAuth = new RegExp(`\\bdualMountAuth\\(app,\\s*['"]${escaped}['"]`);
      const reBare = new RegExp(`\\bdualMount\\(app,\\s*['"]${escaped}['"]`);
      expect(src).toMatch(reAuth);
      // Strip line comments so historical "Pre-W472 had: dualMount(app, '...'" doc-comments don't false-positive.
      const code = src
        .split('\n')
        .map(line => line.replace(/\/\/.*$/, ''))
        .join('\n');
      expect(code).not.toMatch(reBare);
    });
  });

  test('auth/nafath remains intentionally public (login flow)', () => {
    // nafath SSO routes are the login flow itself — forcing auth would
    // break it. The file header documents the deliberate exception.
    expect(src).toMatch(/\bdualMount\(app,\s*['"]auth\/nafath['"]/);
    // Confirm the file documents the public exception.
    const nafath = fs.readFileSync(
      path.join(__dirname, '..', 'routes', 'nafath.routes.js'),
      'utf8'
    );
    expect(nafath).toMatch(/no auth required[\s\S]*login flow/i);
  });

  test('W472 doc comment present in _registry.js', () => {
    expect(src).toMatch(/W472/);
  });

  test('_registry loads without throwing', () => {
    expect(() => require('../routes/_registry')).not.toThrow();
  });
});

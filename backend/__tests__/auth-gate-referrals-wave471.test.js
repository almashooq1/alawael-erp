/**
 * W471 — close unauthenticated-endpoint exposure on referrals.routes.js.
 *
 * routes/referrals.routes.js exposes 24 endpoints handling patient
 * referrals between facilities — PHI surface that includes:
 *   - patient demographics, urgency, assessments
 *   - inter-facility communications
 *   - FHIR IDs (HL7 interop)
 *   - referring + receiving facility names
 *   - documents attached to referrals
 *
 * Pre-W471 the route file did NOT call router.use(authenticate) at
 * all, AND the mount in routes/_registry.js used `dualMount` instead
 * of `dualMountAuth`. The literal mount config:
 *
 *   dualMount(app, 'referrals', safeRequire('../routes/referrals.routes'));
 *
 * meant the entire surface at /api/referrals + /api/v1/referrals was
 * accessible to ANONYMOUS attackers. Sibling clinical routes
 * (icf-assessments, tasks) on adjacent lines correctly used
 * dualMountAuth, which is the convention for PHI routes whose
 * route file doesn't internally call authenticate.
 *
 * Fix: change dualMount → dualMountAuth at the mount line. This
 * wraps every request to /api/(v1/)?referrals/* with the
 * authenticate middleware before reaching the route handler.
 */

const fs = require('fs');
const path = require('path');

describe('W471 — referrals routes require authentication at mount', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'routes', '_registry.js'), 'utf8');

  test('referrals mount uses dualMountAuth (not bare dualMount)', () => {
    expect(src).toMatch(
      /dualMountAuth\(app,\s*['"]referrals['"],\s*safeRequire\(['"]\.\.\/routes\/referrals\.routes['"]\)\)/
    );
  });

  test("NO bare `dualMount(app, 'referrals', ...)` remains", () => {
    // Strip line comments so the historical "Pre-W471 had: `dualMount(app, 'referrals',`" doc-comment doesn't false-positive.
    const code = src
      .split('\n')
      .map(line => line.replace(/\/\/.*$/, ''))
      .join('\n');
    expect(code).not.toMatch(/\bdualMount\(app,\s*['"]referrals['"]/);
  });

  test('comment documents the W471 fix', () => {
    expect(src).toMatch(/W471/);
  });

  test('_registry loads without throwing', () => {
    expect(() => require('../routes/_registry')).not.toThrow();
  });
});

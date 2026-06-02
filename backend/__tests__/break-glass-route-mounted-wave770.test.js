'use strict';

/**
 * break-glass-route-mounted-wave770.test.js
 * ════════════════════════════════════════════════════════════════════
 * W770 — the live web-admin /admin/break-glass surface calls
 * /api/v1/break-glass, but the HTTP layer had a SPLIT:
 *   - routes/break-glass.routes.js was a HOLLOW STUB (returns [] / echoes
 *     body, no DB) — and was never even mounted, AND
 *   - authorization/break-glass/break-glass.routes.js holds the REAL
 *     DB-backed, L2-co-signed, 3/month-rate-limited audited engine —
 *     but its router was never wired to HTTP.
 *
 * W770 deleted the stub and wired the REAL router via dualMountAuth in
 * features.registry. This guard locks both halves of that fix so the
 * hollow surface cannot silently come back and the real engine stays
 * mounted (auth-gated).
 */

const fs = require('fs');
const path = require('path');

const BACKEND = path.join(__dirname, '..');
const FEATURES = fs.readFileSync(
  path.join(BACKEND, 'routes', 'registries', 'features.registry.js'),
  'utf8'
);

describe('W770 — break-glass HTTP wiring', () => {
  it('the hollow routes/break-glass.routes.js stub is deleted', () => {
    expect(fs.existsSync(path.join(BACKEND, 'routes', 'break-glass.routes.js'))).toBe(false);
  });

  it('features.registry mounts break-glass via dualMountAuth (auth-gated)', () => {
    expect(FEATURES).toMatch(/dualMountAuth\(\s*\n?\s*app,\s*\n?\s*'break-glass'/);
  });

  it('features.registry wires the REAL authorization/break-glass router', () => {
    expect(FEATURES).toMatch(
      /require\(['"]\.\.\/\.\.\/authorization\/break-glass\/break-glass\.routes['"]\)/
    );
    expect(FEATURES).toMatch(
      /require\(['"]\.\.\/\.\.\/authorization\/break-glass\/session\.model['"]\)/
    );
  });

  it('the real router exports a buildRouter factory requiring SessionModel', () => {
    const mod = require('../authorization/break-glass/break-glass.routes');
    expect(typeof mod.buildRouter).toBe('function');
    expect(() => mod.buildRouter({})).toThrow(/SessionModel required/);
  });
});

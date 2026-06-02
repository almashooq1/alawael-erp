'use strict';

/**
 * stub-surface-cleanup-wave773.test.js — W773 drift guard.
 * 1. Dead executive-dashboard stubs deleted (zero consumers).
 * 2. Purchasing mounted + wired to ops PR adapter.
 * 3. integrations-hub lazy-binds integrationService.
 */

const fs = require('fs');
const path = require('path');

const BACKEND = path.join(__dirname, '..');
const PHASES = fs.readFileSync(
  path.join(BACKEND, 'routes', 'registries', 'phases.registry.js'),
  'utf8'
);
const FEATURES = fs.readFileSync(
  path.join(BACKEND, 'routes', 'registries', 'features.registry.js'),
  'utf8'
);
const INTEGRATIONS = fs.readFileSync(
  path.join(BACKEND, 'routes', 'integrations.routes.js'),
  'utf8'
);
const PURCHASING = fs.readFileSync(path.join(BACKEND, 'routes', 'purchasing.routes.js'), 'utf8');

describe('W773 — executive-dashboard hollow stubs removed', () => {
  it.each(['routes/executive-dashboard.js', 'routes/executive-dashboard-enhanced.js'])(
    '%s deleted',
    rel => {
      expect(fs.existsSync(path.join(BACKEND, rel))).toBe(false);
    }
  );

  it('phases.registry no longer mounts executive-dashboard paths', () => {
    expect(PHASES).not.toMatch(/executive-dashboard-enhanced/);
    expect(PHASES).not.toMatch(/routes\/executive-dashboard['"]/);
  });

  it('ceo-dashboard real surface stays mounted in phases.registry', () => {
    expect(PHASES).toMatch(/ceoDashboard\.routes/);
  });
});

describe('W773 — purchasing legacy adapter', () => {
  it('features.registry mounts purchasing via dualMountAuth', () => {
    expect(FEATURES).toMatch(/dualMountAuth\(app,\s*'purchasing'/);
  });

  it('purchasing.routes uses purchasingAdapter.service with await', () => {
    expect(PURCHASING).toMatch(/purchasingAdapter\.service/);
    expect(PURCHASING).toMatch(/\bawait\b/);
    expect(PURCHASING).not.toMatch(/const ok = \(res, data/);
  });
});

describe('W773 — integrations-hub service wiring', () => {
  it('integrations.routes requires integrationService and lazy-binds locals', () => {
    expect(INTEGRATIONS).toMatch(/require\(['"]\.\.\/services\/integrationService['"]\)/);
    expect(INTEGRATIONS).toMatch(/req\.app\.locals\.integrationService/);
  });
});

'use strict';

/**
 * stub-surface-cleanup-wave771.test.js
 * ════════════════════════════════════════════════════════════════════
 * W771 — three hollow route files were mounted AHEAD of (or instead of)
 * the live engines and silently shadowed real behavior:
 *   • routes/report-builder.routes.js shadowed phases.registry's
 *     reportBuilder.routes (web-admin got empty [] payloads)
 *   • routes/alerts.routes.js shadowed app.js's alerts-workflow router
 *     (POST /:id/acknowledge returned fake OK, never hit measureAlertEngine)
 *   • routes/approvals.routes.js shadowed authorization/approvals (never
 *     wired — legacy frontend got echo stubs)
 *
 * Fixes: delete stubs, remove duplicate mounts, wire real approvals engine.
 */

const fs = require('fs');
const path = require('path');

const BACKEND = path.join(__dirname, '..');
const FEATURES = fs.readFileSync(
  path.join(BACKEND, 'routes', 'registries', 'features.registry.js'),
  'utf8'
);
const REGISTRY = fs.readFileSync(path.join(BACKEND, 'routes', '_registry.js'), 'utf8');
const PHASES = fs.readFileSync(
  path.join(BACKEND, 'routes', 'registries', 'phases.registry.js'),
  'utf8'
);
const APP_JS = fs.readFileSync(path.join(BACKEND, 'app.js'), 'utf8');

describe('W771 — hollow stub route files deleted', () => {
  it.each([
    'routes/report-builder.routes.js',
    'routes/alerts.routes.js',
    'routes/approvals.routes.js',
  ])('%s is gone', rel => {
    expect(fs.existsSync(path.join(BACKEND, rel))).toBe(false);
  });
});

describe('W771 — report-builder: only the real router is mounted', () => {
  it('_registry does not dualMount the hollow report-builder.routes stub', () => {
    expect(REGISTRY).not.toMatch(
      /dualMountAuth\(app,\s*'report-builder',\s*safeRequire\(['"]\.\.\/routes\/report-builder\.routes['"]\)/
    );
  });

  it('phases.registry mounts reportBuilder.routes (service-backed)', () => {
    expect(PHASES).toMatch(/reportBuilder\.routes/);
  });
});

describe('W771 — alerts: workflow in app.js, not hollow features gap-fill', () => {
  it('features.registry does not mount routes/alerts.routes stub', () => {
    expect(FEATURES).not.toMatch(/routes\/alerts\.routes/);
    expect(FEATURES).not.toMatch(/dualMountAuth\(app,\s*'alerts'/);
  });

  it('app.js mounts createAlertsWorkflowRouter at /api/v1/alerts', () => {
    expect(APP_JS).toMatch(/createAlertsWorkflowRouter/);
    expect(APP_JS).toMatch(/['"]\/api\/v1\/alerts['"]/);
  });
});

describe('W771 — approvals: real authorization engine wired', () => {
  it('features.registry wires authorization/approvals via dualMountAuth', () => {
    expect(FEATURES).toMatch(/authorization\/approvals\/approvals\.routes/);
    expect(FEATURES).toMatch(/dualMountAuth\(app,\s*'approvals'/);
    expect(FEATURES).not.toMatch(
      /dualMountAuth\(app,\s*'approvals',\s*safeRequire\(['"]\.\.\/routes\/approvals\.routes['"]\)/
    );
  });

  it('buildRouter factory requires ApprovalRequestModel', () => {
    const mod = require('../authorization/approvals/approvals.routes');
    expect(typeof mod.buildRouter).toBe('function');
    expect(() => mod.buildRouter({})).toThrow(/ApprovalRequestModel required/);
  });
});

describe('W771 — _registry break-glass duplicate removed (W770 lives in features)', () => {
  it('_registry does not safeRequire deleted break-glass.routes stub', () => {
    expect(REGISTRY).not.toMatch(/routes\/break-glass\.routes/);
  });
});

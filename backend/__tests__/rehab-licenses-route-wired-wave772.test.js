'use strict';

/**
 * rehab-licenses-route-wired-wave772.test.js — W772 drift guard.
 * Locks rehab-licenses.routes.js as a wired surface (service + await),
 * not the pre-W772 hollow ok() stub.
 */

const fs = require('fs');
const path = require('path');

const BACKEND = path.join(__dirname, '..');
const ROUTES = fs.readFileSync(path.join(BACKEND, 'routes', 'rehab-licenses.routes.js'), 'utf8');
const FEATURES = fs.readFileSync(
  path.join(BACKEND, 'routes', 'registries', 'features.registry.js'),
  'utf8'
);

describe('W772 — rehab-licenses HTTP wiring', () => {
  it('routes file requires rehabLicenses.service (not hollow ok-only stub)', () => {
    expect(ROUTES).toMatch(/require\(['"]\.\.\/services\/rehabLicenses\.service['"]\)/);
    expect(ROUTES).toMatch(/\bawait\b/);
    expect(ROUTES).not.toMatch(/const ok = \(res, data/);
  });

  it('features.registry mounts rehab-licenses via dualMountAuth', () => {
    expect(FEATURES).toMatch(/dualMountAuth\(app,\s*'rehab-licenses'/);
    expect(FEATURES).toMatch(/rehab-licenses\.routes/);
  });

  it('service module exports ENTITY_TYPE discriminator', () => {
    const svc = require('../services/rehabLicenses.service');
    expect(svc.ENTITY_TYPE).toBe('rehab_center_license');
    expect(typeof svc.list).toBe('function');
    expect(typeof svc.getDashboard).toBe('function');
  });
});

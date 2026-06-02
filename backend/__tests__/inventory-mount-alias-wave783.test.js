'use strict';

/**
 * inventory-mount-alias-wave783.test.js — W783 drift guard.
 * web-admin calls /api/v1/inventory/* (see apps/web-admin/src/lib/api.ts INV_BASE).
 */

const fs = require('fs');
const path = require('path');

const FEATURES = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'registries', 'features.registry.js'),
  'utf8'
);

describe('W783 — inventory API alias for web-admin', () => {
  it('features.registry mounts inventory-enhanced at /inventory (dual mount)', () => {
    expect(FEATURES).toMatch(/dualMount\(app,\s*'inventory',\s*inventoryEnhancedRoutes\)/);
  });

  it('inventory-enhanced mount preserved for backward compatibility', () => {
    expect(FEATURES).toMatch(/dualMount\(app,\s*'inventory-enhanced',\s*inventoryEnhancedRoutes\)/);
  });
});

'use strict';

/**
 * purchasing-po-adr-wave797.test.js — W797 ADR-039 triple-backend drift guard.
 */

const fs = require('fs');
const path = require('path');

const ADR = fs.readFileSync(
  path.join(
    __dirname,
    '..',
    '..',
    'docs',
    'architecture',
    'decisions',
    '039-purchase-order-triple-backend.md'
  ),
  'utf8'
);
const CUTOVER = fs.readFileSync(
  path.join(
    __dirname,
    '..',
    '..',
    'docs',
    'architecture',
    'PRODUCTION_CUTOVER_W780_W792_PURCHASING.md'
  ),
  'utf8'
);
const FEATURES = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'registries', 'features.registry.js'),
  'utf8'
);

describe('W797 — ADR-039 purchase order triple-backend', () => {
  it('ADR documents three tiers and rejects redirect-only unification', () => {
    expect(ADR).toMatch(/039\. Purchase Order Triple-Backend/);
    expect(ADR).toMatch(/InventoryStock/);
    expect(ADR).toMatch(/InventoryModulePurchaseOrder/);
    expect(ADR).toMatch(/\/api\/v1\/inventory\/purchase-orders/);
    expect(ADR).toMatch(/\/api\/v1\/purchasing\/orders/);
    expect(ADR).toMatch(/partially_received/);
    expect(ADR).toMatch(/Approach B/);
    expect(ADR).toMatch(/no cross-redirect/i);
  });

  it('cutover doc points to ADR-039 for web-admin follow-up', () => {
    expect(CUTOVER).toMatch(/039-purchase-order-triple-backend/);
    expect(CUTOVER).toMatch(/ADR-039/);
  });

  it('registry keeps purchasing and inventory mounts separate', () => {
    expect(FEATURES).toMatch(/dualMountAuth\(app,\s*['"]purchasing['"]/);
    // Inventory routes are split into module vs enhanced mounts (W797 separation preserved).
    expect(FEATURES).toMatch(/dualMount\(app,\s*['"]inventory-/);
    expect(FEATURES).not.toMatch(
      /dualMountAuth\(app,\s*['"]purchasing['"][\s\S]*inventory-enhanced\.routes/
    );
  });
});

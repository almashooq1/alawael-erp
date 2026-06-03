'use strict';

/**
 * purchasing-cutover-doc-wave793.test.js — W793 cutover doc drift guard.
 */

const fs = require('fs');
const path = require('path');

const DOC = fs.readFileSync(
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
const REGISTRY = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'registries', 'features.registry.js'),
  'utf8'
);

describe('W793 — purchasing cutover documentation', () => {
  it('cutover doc exists with three-PO-model warning', () => {
    expect(DOC).toMatch(/Production Cutover.*W780.*W799/i);
    expect(DOC).toMatch(/three PO models/i);
    expect(DOC).toMatch(/InventoryModulePurchaseOrder/);
    expect(DOC).toMatch(/\/api\/v1\/inventory\/purchase-orders/);
  });

  it('documents W786 stock path and W789–W792 workflow', () => {
    expect(DOC).toMatch(/purchasingStockReceive/);
    expect(DOC).toMatch(/convert-to-po/);
    expect(DOC).toMatch(/lineItems/);
    expect(DOC).toMatch(/purchasing-routes-stock-wave792/);
    expect(DOC).toMatch(/branch-purchasing/);
    expect(DOC).toMatch(/PurchasingManagement/);
  });

  it('registry still dualMountAuth purchasing (doc ↔ code sync)', () => {
    expect(REGISTRY).toMatch(/dualMountAuth\(app,\s*['"]purchasing['"]/);
  });
});

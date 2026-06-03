'use strict';

/**
 * purchasing-modules-doc-wave798.test.js — W798 MODULES.md discoverability guard.
 */

const fs = require('fs');
const path = require('path');

const MODULES = fs.readFileSync(path.join(__dirname, '..', '..', 'docs', 'MODULES.md'), 'utf8');
const GAPS = fs.readFileSync(
  path.join(__dirname, '..', '..', 'docs', 'PRODUCTION_GAPS_BEFORE_LIVE.md'),
  'utf8'
);

describe('W798 — purchasing surfaces in MODULES.md', () => {
  it('lists three API tiers and legacy frontend paths', () => {
    expect(MODULES).toMatch(/\/api\/v1\/purchasing/);
    expect(MODULES).toMatch(/\/api\/v1\/inventory/);
    expect(MODULES).toMatch(/\/api\/v1\/inventory-module/);
    expect(MODULES).toMatch(/ADR-039/);
    expect(MODULES).toMatch(/pages\/supply-chain/);
    expect(MODULES).toMatch(/PRODUCTION_CUTOVER_W780_W792_PURCHASING/);
  });
});

describe('W798 — PRODUCTION_GAPS links purchasing cutover', () => {
  it('references cutover doc and ADR-039', () => {
    expect(GAPS).toMatch(/PRODUCTION_CUTOVER_W780_W792_PURCHASING/);
    expect(GAPS).toMatch(/039-purchase-order-triple-backend/);
  });
});

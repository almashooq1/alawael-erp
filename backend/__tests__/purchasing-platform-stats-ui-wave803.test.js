'use strict';

/**
 * purchasing-platform-stats-ui-wave803.test.js — W803 legacy UI drift guard.
 */

const fs = require('fs');
const path = require('path');

const OPS = fs.readFileSync(
  path.join(__dirname, '..', '..', 'frontend', 'src', 'services', 'operationsService.js'),
  'utf8'
);
const PAGE = fs.readFileSync(
  path.join(
    __dirname,
    '..',
    '..',
    'frontend',
    'src',
    'pages',
    'supply-chain',
    'PurchasingManagement.js'
  ),
  'utf8'
);
const BRANCH = fs.readFileSync(
  path.join(
    __dirname,
    '..',
    '..',
    'frontend',
    'src',
    'pages',
    'supply-chain',
    'BranchPurchasing.js'
  ),
  'utf8'
);
const BANNER = fs.readFileSync(
  path.join(
    __dirname,
    '..',
    '..',
    'frontend',
    'src',
    'pages',
    'supply-chain',
    'PurchasingPlatformStatsBanner.js'
  ),
  'utf8'
);

describe('W803 — purchasing platform-stats legacy UI', () => {
  it('operationsService exposes getPlatformStats', () => {
    expect(OPS).toMatch(/getPlatformStats/);
    expect(OPS).toMatch(/\/api\/v1\/purchasing\/platform-stats/);
  });

  it('shared banner component calls platform-stats', () => {
    expect(BANNER).toMatch(/getPlatformStats/);
    expect(BANNER).toMatch(/ADR-039/);
    expect(BANNER).toMatch(/legacyPurchasing/);
    expect(BANNER).toMatch(/inventoryStock/);
  });

  it('PurchasingManagement and BranchPurchasing mount the banner (W803/W804)', () => {
    expect(PAGE).toMatch(/PurchasingPlatformStatsBanner/);
    expect(BRANCH).toMatch(/PurchasingPlatformStatsBanner/);
  });
});

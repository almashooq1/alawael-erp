'use strict';

/**
 * branch-purchasing-convert-wave789.test.js — W789 PR→PO convert + inventory picker drift guard.
 */

const fs = require('fs');
const path = require('path');

const SERVICE = fs.readFileSync(
  path.join(__dirname, '..', '..', 'frontend', 'src', 'services', 'branchWarehouseService.js'),
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
    'BranchPurchasing.js'
  ),
  'utf8'
);

describe('W789 — branch purchasing PR convert + item picker', () => {
  it('purchaseRequestService exposes convertToPo + inventoryModuleItemService', () => {
    expect(SERVICE).toMatch(/convertToPo.*convert-to-po/s);
    expect(SERVICE).toMatch(/export const inventoryModuleItemService/);
    expect(SERVICE).toMatch(/inventory-module\/items/);
  });

  it('BranchPurchasing wires convert action and inventory item select', () => {
    expect(PAGE).toMatch(/handleConvertToPo/);
    expect(PAGE).toMatch(/convertToPo/);
    expect(PAGE).toMatch(/inventoryModuleItemService/);
    expect(PAGE).toMatch(/صنف المخزون/);
    expect(PAGE).toMatch(/تحويل لأمر شراء/);
    expect(PAGE).toMatch(/under_review/);
  });
});

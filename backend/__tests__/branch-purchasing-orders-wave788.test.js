'use strict';

/**
 * branch-purchasing-orders-wave788.test.js — W788 BranchPurchasing PO tab drift guard.
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

describe('W788 — branch purchasing purchase orders', () => {
  it('purchaseOrderService wraps orders + receipts endpoints', () => {
    expect(SERVICE).toMatch(/export const purchaseOrderService/);
    expect(SERVICE).toMatch(/purchasing\/orders.*unwrapApiList/s);
    expect(SERVICE).toMatch(/orders\/\$\{id\}\/receipts/);
    expect(SERVICE).toMatch(/patch\(`\/api\/v1\/purchasing\/orders\/\$\{id\}\/receive`/);
  });

  it('BranchPurchasing renders PO tab with receive and GRN dialog', () => {
    expect(PAGE).toMatch(/أوامر الشراء/);
    expect(PAGE).toMatch(/purchaseOrderService/);
    expect(PAGE).toMatch(/handleReceivePO/);
    expect(PAGE).toMatch(/handleViewPoGrns/);
    expect(PAGE).toMatch(/poGrnDialogOpen/);
  });
});

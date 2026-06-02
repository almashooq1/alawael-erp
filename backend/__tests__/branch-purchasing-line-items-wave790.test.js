'use strict';

/**
 * branch-purchasing-line-items-wave790.test.js — W790 PO/GRN line-item UI drift guard.
 */

const fs = require('fs');
const path = require('path');

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

describe('W790 — branch purchasing line items UI', () => {
  it('renders itemsSummary cells and PO detail dialog with line items', () => {
    expect(PAGE).toMatch(/renderItemsCell/);
    expect(PAGE).toMatch(/itemsSummary/);
    expect(PAGE).toMatch(/LineItemsTable/);
    expect(PAGE).toMatch(/handleViewPoDetail/);
    expect(PAGE).toMatch(/poDetailDialogOpen/);
    expect(PAGE).toMatch(/linkedItemCount/);
    expect(PAGE).toMatch(/purchaseOrderService\.getById/);
  });
});

'use strict';

/**
 * purchasing-management-lines-wave791.test.js — W791 /purchasing UI line-items drift guard.
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
    'PurchasingManagement.js'
  ),
  'utf8'
);
const SERVICE = fs.readFileSync(
  path.join(__dirname, '..', '..', 'frontend', 'src', 'services', 'operationsService.js'),
  'utf8'
);

describe('W791 — PurchasingManagement line items', () => {
  it('operationsService exposes getPurchaseOrder + getOrderReceipts', () => {
    expect(SERVICE).toMatch(/getPurchaseOrder/);
    expect(SERVICE).toMatch(/getOrderReceipts/);
    expect(SERVICE).toMatch(/orders\/\$\{id\}\/receipts/);
  });

  it('PurchasingManagement renders itemsSummary and PO line table', () => {
    expect(PAGE).toMatch(/renderItemsCell/);
    expect(PAGE).toMatch(/itemsSummary/);
    expect(PAGE).toMatch(/PoLineItemsTable/);
    expect(PAGE).toMatch(/handleViewPO/);
    expect(PAGE).toMatch(/getPurchaseOrder/);
    expect(PAGE).toMatch(/getOrderReceipts/);
    expect(PAGE).toMatch(/linkedItemCount/);
  });
});

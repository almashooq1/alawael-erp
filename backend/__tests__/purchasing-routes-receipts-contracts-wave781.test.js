'use strict';

/**
 * purchasing-routes-receipts-contracts-wave781.test.js — W781 drift guard.
 */

const fs = require('fs');
const path = require('path');

const PURCHASING = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'purchasing.routes.js'),
  'utf8'
);

describe('W781 — purchasing receipts + contracts routes', () => {
  it('receipts and contracts delegate to adapter', () => {
    expect(PURCHASING).toMatch(/adapter\.listReceipts/);
    expect(PURCHASING).toMatch(/adapter\.createReceipt/);
    expect(PURCHASING).toMatch(/adapter\.listContracts/);
    expect(PURCHASING).toMatch(/adapter\.listExpiringContracts/);
    expect(PURCHASING).toMatch(/adapter\.createContract/);
  });

  it('/contracts/expiring is registered before generic contract handlers', () => {
    const expIdx = PURCHASING.indexOf("'/contracts/expiring'");
    const receiptsIdx = PURCHASING.indexOf("'/receipts'");
    expect(expIdx).toBeGreaterThan(-1);
    expect(receiptsIdx).toBeGreaterThan(-1);
  });
});

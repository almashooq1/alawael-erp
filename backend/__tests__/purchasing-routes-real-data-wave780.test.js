'use strict';

/**
 * purchasing-routes-real-data-wave780.test.js — W780 drift guard.
 * purchasing.routes must not return hollow vendor/order stubs.
 */

const fs = require('fs');
const path = require('path');

const PURCHASING = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'purchasing.routes.js'),
  'utf8'
);

describe('W780 — purchasing routes wired to adapter', () => {
  it('no placeholder _id: new responses for vendors or orders', () => {
    expect(PURCHASING).not.toMatch(/_id:\s*['"]new['"]/);
  });

  it('vendors GET delegates to adapter.listVendors', () => {
    expect(PURCHASING).toMatch(/adapter\.listVendors/);
    expect(PURCHASING).not.toMatch(/\/vendors[\s\S]*?data:\s*\[\s*\]/);
  });

  it('orders expose /approve before generic :id handlers', () => {
    const approveIdx = PURCHASING.indexOf("'/orders/:id/approve'");
    const getByIdIdx = PURCHASING.indexOf("router.get(\n  '/orders/:id'");
    expect(approveIdx).toBeGreaterThan(-1);
    expect(getByIdIdx).toBeGreaterThan(approveIdx);
  });

  it('orders use adapter for create, approve, receive', () => {
    expect(PURCHASING).toMatch(/adapter\.createOrder/);
    expect(PURCHASING).toMatch(/adapter\.approveOrder/);
    expect(PURCHASING).toMatch(/adapter\.receiveOrder/);
  });

  it('PUT /requests/:id updates draft via adapter (no echo stub)', () => {
    expect(PURCHASING).toMatch(/adapter\.updateRequest/);
    expect(PURCHASING).not.toMatch(
      /router\.put\([\s\S]*?\/requests\/:id[\s\S]*?\{\s*_id:\s*req\.params\.id,\s*\.\.\.req\.body\s*\}/
    );
  });

  it('requests expose submit + convert-to-po and POST approve alias', () => {
    expect(PURCHASING).toMatch(/adapter\.submitRequest/);
    expect(PURCHASING).toMatch(/adapter\.convertRequestToPo/);
    expect(PURCHASING).toMatch(/\/requests\/:id\/submit/);
    expect(PURCHASING).toMatch(/\/requests\/:id\/convert-to-po/);
    expect(PURCHASING).toMatch(/router\.post\(\s*\n\s*'\/requests\/:id\/approve'/);
  });
});

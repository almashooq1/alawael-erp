/**
 * Wave 933 — guard for the purchase-order create fix.
 *
 * POST /api/v1/inventory/purchase-orders passed requestedBy INSIDE the data arg
 * (so the service's 2nd `requestedBy` param was undefined) and never stamped the
 * required branchId. The route now injects branchId (W269) and passes requestedBy
 * as the proper 2nd argument (id||_id). The web-admin form is rebuilt to send the
 * catalog refs (supplierId/warehouseId/branchId + itemId/quantityOrdered/unitCost).
 *
 * Static source guard (pure-unit, no DB).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROUTE = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'inventory-enhanced.routes.js'),
  'utf8'
);

describe('W933 — purchase-order create branch + requestedBy', () => {
  it('the POST handler injects branchId from the scope', () => {
    const idx = ROUTE.indexOf("router.post('/purchase-orders'");
    expect(idx).toBeGreaterThan(-1);
    const region = ROUTE.slice(idx, idx + 800);
    expect(region).toMatch(/req\.branchScope\?\.branchId/);
    expect(region).toMatch(/branchId/);
  });

  it('passes requestedBy as the 2nd arg via id||_id (not buried in data)', () => {
    expect(ROUTE).toMatch(/const actorId = req\.user\?\.id \|\| req\.user\?\._id/);
    expect(ROUTE).toMatch(/createPurchaseOrder\([\s\S]*?,\s*actorId\s*\)/);
  });
});

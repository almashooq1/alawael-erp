/**
 * Wave 933 — guards for the transport Vehicle create fix.
 *
 * Two pre-existing blockers stopped the web-admin vehicle form from saving:
 *  1. Vehicle.pre('save') used the mixed `async function (next) { … next() }`
 *     style → "next is not a function" under Mongoose 9 (every save threw).
 *  2. The POST /vehicles route never stamped the required branch_id.
 *
 * Static source guards (pure-unit, no DB).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const MODEL = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'transport', 'Vehicle.js'),
  'utf8'
);
const ROUTE = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'transport-module.routes.js'),
  'utf8'
);

describe('W933 — vehicle create: async hook + branch injection', () => {
  it('the pre(save) hook is a pure async hook (no mixed next param)', () => {
    expect(MODEL).toMatch(/pre\(\s*'save'\s*,\s*async function\s*\(\s*\)/);
    // The broken mixed signature must not return.
    expect(MODEL).not.toMatch(/pre\(\s*'save'\s*,\s*async function\s*\(\s*next\s*\)/);
  });

  it('the POST /vehicles handler stamps branch_id from the scope (not blindly from body)', () => {
    const idx = ROUTE.indexOf("router.post(\n  '/vehicles'");
    expect(idx).toBeGreaterThan(-1);
    const region = ROUTE.slice(idx, idx + 800);
    expect(region).toMatch(/req\.branchScope\?\.branchId/);
    expect(region).toMatch(/branch_id:\s*branchId/);
  });
});

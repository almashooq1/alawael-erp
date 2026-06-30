'use strict';

/**
 * W1562 — DELETE /transport-module/vehicles/:id soft-delete was persisting
 * status:'decommissioned', a value NOT in the Vehicle.status enum
 * {active,maintenance,out_of_service,retired}. Because findOneAndUpdate skips
 * enum validation by default, the invalid status was written silently (data
 * corruption on the soft-deleted record). Fixed to the enum's terminal value
 * 'retired' (permanently removed from service).
 *
 * Guard: (1) load-based — the exact Vehicle model the route writes to does NOT
 * accept 'decommissioned' and DOES accept 'retired'; (2) static — the vehicles
 * DELETE handler writes status:'retired', never 'decommissioned'.
 */

const fs = require('fs');
const path = require('path');

const ROUTE = path.join(__dirname, '..', 'routes', 'transport-module.routes.js');

function stripComments(s) {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + ''.padEnd(m.length - p1.length, ' '));
}

describe('W1562 transport vehicle soft-delete status is enum-valid', () => {
  const src = fs.readFileSync(ROUTE, 'utf8');
  const code = stripComments(src);

  test('the exact Vehicle model the route requires has the expected status enum', () => {
    const Vehicle = require('../models/transport/Vehicle');
    const values = Vehicle.schema.path('status').enumValues;
    expect(values).toEqual(expect.arrayContaining(['active', 'maintenance', 'out_of_service', 'retired']));
    expect(values).toContain('retired');
    expect(values).not.toContain('decommissioned');
  });

  test('route writes status:\'retired\' (in enum), never the invalid \'decommissioned\'', () => {
    expect(code).not.toMatch(/status:\s*'decommissioned'/);
    expect(code).not.toMatch(/status:\s*"decommissioned"/);
    expect(code).toMatch(/status:\s*'retired'/);
  });

  test('the soft-delete DELETE handler is the site that sets the terminal status', () => {
    // the vehicles DELETE block sets both deleted_at and status:'retired'
    const block = code.slice(code.indexOf("'/vehicles/:id'"));
    const del = block.slice(0, block.indexOf('GET /transport-module/vehicles/:id/location') + 1 || block.length);
    expect(del).toMatch(/deleted_at:\s*new Date\(\)/);
    expect(del).toMatch(/status:\s*'retired'/);
  });
});

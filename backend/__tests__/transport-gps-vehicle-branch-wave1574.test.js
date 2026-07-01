/**
 * W1574 — transport GPS endpoints must gate on the vehicle's branch (deferred from #779).
 *
 * GpsTracking has NO branch field, and the vehicle-keyed GPS endpoints
 * (GET /vehicles/:id/location, GET /gps/:vehicleId/live, GET /gps/:vehicleId/history)
 * read GpsTracking by vehicle_id straight from req.params with no ownership check →
 * any authenticated user could read ANOTHER branch's vehicle live position + full
 * track (revealing routes / pickup locations). Fixed: resolve the vehicle scoped by
 * branch first (Vehicle.findOne({_id, ...branchScope(req)})) → 404 if foreign.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '../routes/transport-module.routes.js'), 'utf8');

function handler(sig) {
  const i = SRC.indexOf(sig);
  return i === -1 ? '' : SRC.slice(i, i + 700);
}

describe('W1574 — vehicle-keyed GPS endpoints gate on the vehicle branch', () => {
  test('GET /vehicles/:id/location resolves a branch-scoped vehicle before the GPS read', () => {
    const h = handler("'/vehicles/:id/location'");
    expect(h).toMatch(/Vehicle\.findOne\(\{\s*_id: req\.params\.id,\s*deleted_at: null,\s*\.\.\.branchScope\(req\)/s);
    expect(h.indexOf('Vehicle.findOne')).toBeLessThan(h.indexOf('GpsTracking.findOne'));
  });
  test('GET /gps/:vehicleId/live gates on the vehicle branch + validates the id', () => {
    const h = handler("'/gps/:vehicleId/live'");
    expect(h).toMatch(/mongoose\.isValidObjectId\(req\.params\.vehicleId\)/);
    expect(h).toMatch(/Vehicle\.findOne\(\{\s*_id: req\.params\.vehicleId,[\s\S]*\.\.\.branchScope\(req\)/s);
    expect(h.indexOf('Vehicle.findOne')).toBeLessThan(h.indexOf('GpsTracking.findOne'));
  });
  test('GET /gps/:vehicleId/history gates on the vehicle branch', () => {
    const h = handler("'/gps/:vehicleId/history'");
    expect(h).toMatch(/mongoose\.isValidObjectId\(req\.params\.vehicleId\)/);
    expect(h).toMatch(/Vehicle\.findOne\(\{\s*_id: req\.params\.vehicleId,[\s\S]*\.\.\.branchScope\(req\)/s);
    expect(h.indexOf('Vehicle.findOne')).toBeLessThan(h.indexOf('const filter'));
  });
});

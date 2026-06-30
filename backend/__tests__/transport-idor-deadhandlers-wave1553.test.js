/**
 * W1553 — transport-module branch isolation + dead-handler + phantom-field fixes
 * (2026-06-30 hunt).
 *
 * All transport models use snake_case `branch_id`; the route's local `branchScope(req)`
 * maps the camelCase branchFilter() output to `{branch_id}`. requireBranchAccess is
 * applied (router.use) but does NOT auto-filter, and many list/stats/:id handlers
 * either omitted branchScope or sourced the branch from the OPTIONAL client query →
 * cross-branch PII leak. Plus two static service methods were called on instances
 * (→ TypeError 500 dead handlers) and a phantom `stop_order` waypoint field.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '../routes/transport-module.routes.js'), 'utf8');
const ROUTE_MODEL = fs.readFileSync(
  path.join(__dirname, '../models/transport/TransportRoute.js'),
  'utf8'
);

describe('W1553 — list/stats/:id queries are branch-scoped', () => {
  test('list filters spread branchScope(req)', () => {
    expect(
      (SRC.match(/const filter = \{ deleted_at: null, \.\.\.branchScope\(req\) \}/g) || []).length
    ).toBe(4);
    expect(SRC).toMatch(/const tripFilter = \{ deleted_at: null, \.\.\.branchScope\(req\) \}/);
    expect(SRC).toMatch(/const vehicleFilter = \{ deleted_at: null, status: 'active', \.\.\.branchScope\(req\) \}/);
  });
  test('aggregate $match stages are branch-scoped', () => {
    expect((SRC.match(/match: \{ deleted_at: null, \.\.\.branchScope\(req\) \}/g) || []).length).toBe(4);
  });
  test('every :id lookup is branch-scoped', () => {
    expect(SRC).not.toMatch(/\{ _id: req\.params\.id, deleted_at: null \}(?!,)/);
    expect(
      (SRC.match(/\{ _id: req\.params\.id, deleted_at: null, \.\.\.branchScope\(req\) \}/g) || []).length
    ).toBeGreaterThanOrEqual(13);
  });
  test('an explicit client branch_id is honoured only for cross-branch roles', () => {
    expect((SRC.match(/if \(branch_id && !branchScope\(req\)\.branch_id\) filter\.branch_id = branch_id/g) || []).length).toBe(2);
    expect(SRC).not.toMatch(/if \(branch_id\) filter\.branch_id = branch_id;/);
  });
});

describe('W1553 — static service methods are called statically (no instance call)', () => {
  test('optimizeRoute is delegated to the static (not the instance)', () => {
    expect(SRC).toMatch(/RouteOptimizationService\.optimizeRoute\(req\.params\.id\)/);
    expect(SRC).not.toMatch(/routeOptimizer\.optimizeRoute/);
  });
  test('getTrackingLink is called statically + awaited with (tripId, vehicleId)', () => {
    expect(SRC).toMatch(/await ParentNotificationService\.getTrackingLink\(\s*activeTrip\?\._id,\s*req\.params\.vehicleId/s);
    expect(SRC).not.toMatch(/notificationService\.getTrackingLink/);
  });
});

describe('W1553 — phantom waypoint field + mass-assignment', () => {
  test('waypoint order uses the real schema field `order` (schema has no stop_order)', () => {
    expect(ROUTE_MODEL).toMatch(/order: \{ type: Number, required: true \}/);
    expect(ROUTE_MODEL).not.toMatch(/stop_order/);
    expect(SRC).toMatch(/order: \(route\.waypoints\?\.length \|\| 0\) \+ 1/);
  });
  test('POST /routes and POST /maintenance pin branch_id from branchScope', () => {
    expect((SRC.match(/\.\.\.req\.body, \.\.\.branchScope\(req\)/g) || []).length).toBeGreaterThanOrEqual(2);
  });
});

'use strict';

/**
 * write-side-enum-status.test.js
 *
 * Two create endpoints hardcoded a `status` literal that is NOT in the model's enum,
 * so the create threw a ValidationError → the endpoint failed on EVERY call:
 *   - maintenance POST /requests: MaintenanceRequest.create({ status: 'open' }) but the
 *     enum is {new,assigned,in_progress,completed,cancelled} → 400 every time.
 *   - traffic-accidents POST: TrafficAccident.create({ status: 'open' }) but the enum is
 *     {pending,investigating,resolved,disputed} → failed every time.
 * And the PATCH /:id/close update wrote `status: 'closed'` (also absent from the enum →
 * invalid write / throw).
 *
 * Fixed to the enum-valid initial/terminal values (new / pending / resolved). Validated
 * via validateSync().errors.status so other required fields don't mask the enum check.
 */

const fs = require('fs');
const path = require('path');

const stripComments = s =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');

describe('write-side enum status (static)', () => {
  const read = rel => stripComments(fs.readFileSync(path.join(__dirname, '..', rel), 'utf8'));
  test('maintenance create uses a valid status (new), not open', () => {
    const src = read('routes/maintenance.js');
    expect(src).toMatch(/status:\s*'new'/);
    expect(src).not.toMatch(/status:\s*'open'/);
  });
  test('traffic-accidents create=pending + close=resolved, not open/closed', () => {
    const src = read('routes/trafficAccidents.js'); // comments stripped
    expect(src).toMatch(/status:\s*'pending'/);
    expect(src).toMatch(/status:\s*'resolved'/);
    expect(src).not.toMatch(/status:\s*'open'/);
    expect(src).not.toMatch(/status:\s*'closed'/);
  });
});

describe('write-side enum status (behavioral — old value fails the enum, new value passes)', () => {
  jest.unmock('mongoose');
  jest.setTimeout(60000);
  let mongoose;
  let MaintenanceRequest;
  let TrafficAccident;

  beforeAll(() => {
    mongoose = require('mongoose');
    MaintenanceRequest = require('../models/Maintenance/MaintenanceRequest');
    TrafficAccident = require('../models/Traffic/TrafficAccident');
  });

  const statusErr = (Model, status) =>
    new Model({ status }).validateSync()?.errors?.status; // undefined if status is valid

  test('MaintenanceRequest: open is an enum error; new is not', () => {
    expect(statusErr(MaintenanceRequest, 'open')).toBeDefined();
    expect(statusErr(MaintenanceRequest, 'new')).toBeUndefined();
  });
  test('TrafficAccident: open/closed are enum errors; pending/resolved are not', () => {
    expect(statusErr(TrafficAccident, 'open')).toBeDefined();
    expect(statusErr(TrafficAccident, 'closed')).toBeDefined();
    expect(statusErr(TrafficAccident, 'pending')).toBeUndefined();
    expect(statusErr(TrafficAccident, 'resolved')).toBeUndefined();
  });
});

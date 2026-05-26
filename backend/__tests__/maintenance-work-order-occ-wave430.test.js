'use strict';

/**
 * W430 — anti-regression guard for MaintenanceWorkOrder optimistic
 * concurrency.
 *
 * Same race-class as W428 / W429. The state-machine service
 * `services/operations/workOrderStateMachine.service.js` transition()
 * does findById → push statusHistory → set status → save() with SLA
 * activate/observe side-effects + `ops.wo.${event}` bus emit on every
 * transition. Pre-W430 two concurrent transitions would silently
 * duplicate the audit trail + SLA observe + downstream bus events.
 *
 * Fix: schema-level optimistic concurrency. Mongoose tracks __v; the
 * second concurrent save() throws VersionError; the state-machine
 * service surfaces it through its own error class.
 */

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'models', 'MaintenanceWorkOrder.js');

describe('W430 MaintenanceWorkOrder optimistic concurrency', () => {
  let src;
  beforeAll(() => {
    src = fs.readFileSync(FILE, 'utf8');
  });

  it('schema sets optimisticConcurrency: true', () => {
    expect(src).toMatch(
      /maintenanceWorkOrderSchema\.set\(\s*['"]optimisticConcurrency['"]\s*,\s*true\s*\)/
    );
  });

  it('W430 marker comment present (catches accidental revert)', () => {
    expect(src).toMatch(/W430/);
  });

  it('still exports the canonical Mongoose model', () => {
    expect(src).toMatch(/mongoose\.models\.MaintenanceWorkOrder/);
  });

  it('OCC line appears AFTER the schema definition', () => {
    const schemaIdx = src.indexOf('maintenanceWorkOrderSchema = new mongoose.Schema');
    const occIdx = src.indexOf("maintenanceWorkOrderSchema.set('optimisticConcurrency'");
    expect(schemaIdx).toBeGreaterThan(-1);
    expect(occIdx).toBeGreaterThan(schemaIdx);
  });

  it('OCC line appears BEFORE module.exports', () => {
    const occIdx = src.indexOf("maintenanceWorkOrderSchema.set('optimisticConcurrency'");
    const exportIdx = src.indexOf('module.exports');
    expect(occIdx).toBeGreaterThan(-1);
    expect(exportIdx).toBeGreaterThan(occIdx);
  });
});

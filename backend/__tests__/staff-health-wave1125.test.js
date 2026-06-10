'use strict';

/**
 * staff-health-wave1125.test.js — W1125 (static drift guard).
 *
 * Source-shape contract for the StaffHealthRecord occupational-health model +
 * route + registry mount: record types, lifecycle, Wave-18 invariants (incl. the
 * markModified pre-validate), confidential read-role restriction, branch
 * isolation, no mass-assignment, and the dual-mount.
 */

const fs = require('fs');
const path = require('path');

const MODEL_SRC = fs.readFileSync(path.join(__dirname, '..', 'models', 'StaffHealthRecord.js'), 'utf8');
const ROUTE_SRC = fs.readFileSync(path.join(__dirname, '..', 'routes', 'staff-health.routes.js'), 'utf8');
const REG_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'registries', 'features.registry.js'),
  'utf8'
);
const Model = require('../models/StaffHealthRecord');

describe('W1125 — model shape', () => {
  it('covers the 6 occupational-health record types', () => {
    for (const t of ['immunization', 'tb_screening', 'fitness_for_work', 'exposure_incident', 'periodic_checkup', 'respirator_fit_test']) {
      expect(Model.TYPES).toContain(t);
    }
  });

  it('has the open→…→closed lifecycle incl. restricted', () => {
    for (const s of ['open', 'in_progress', 'completed', 'cleared', 'restricted', 'closed']) {
      expect(Model.STATUSES).toContain(s);
    }
  });

  it('declares type-aware Wave-18 invariants', () => {
    expect(MODEL_SRC).toMatch(/path\('__invariants'\)\.validate/);
    expect(MODEL_SRC).toMatch(/exposureType required for an exposure_incident/);
    expect(MODEL_SRC).toMatch(/vaccineName required for an immunization/);
  });

  it('forces invariants to run on update-saves (markModified pre-validate) — the W1123 lesson', () => {
    expect(MODEL_SRC).toMatch(/pre\(\s*'validate'/);
    expect(MODEL_SRC).toMatch(/markModified\('__invariants'\)/);
  });

  it('exposes the surveillanceOverdue virtual + auto OHR number', () => {
    expect(MODEL_SRC).toMatch(/virtual\('surveillanceOverdue'\)/);
    expect(MODEL_SRC).toMatch(/OHR-\$\{year\}-/);
  });
});

describe('W1125 — route surface', () => {
  it('mounts the lifecycle + cohort + per-employee endpoints', () => {
    for (const p of [
      "router.get('/'",
      "router.get('/by-employee/:employeeId'",
      "router.get('/due'",
      "router.get('/exposures'",
      "router.get('/restricted'",
      "router.get('/stats'",
      "router.post('/'",
      "router.post('/:id/complete'",
      "router.post('/:id/restrict'",
      "router.post('/:id/close'",
      "router.delete('/:id'",
    ]) {
      expect(ROUTE_SRC).toContain(p);
    }
  });

  it('treats occupational-health data as confidential (narrow READ_ROLES, no broad nursing)', () => {
    expect(ROUTE_SRC).toMatch(/CONFIDENTIAL/i);
    expect(ROUTE_SRC).toMatch(/occupational_health/);
    // broad clinical roles must NOT be in the read set
    const readBlock = ROUTE_SRC.slice(ROUTE_SRC.indexOf('const READ_ROLES'), ROUTE_SRC.indexOf('const WRITE_ROLES'));
    expect(readBlock).not.toMatch(/'nursing'/);
    expect(readBlock).not.toMatch(/'therapist'/);
  });

  it('enforces branch isolation + role guards + no mass-assignment', () => {
    expect(ROUTE_SRC).toMatch(/requireBranchAccess/);
    expect(ROUTE_SRC).toMatch(/branchFilter\(req\)/);
    expect(ROUTE_SRC).not.toMatch(/req\.branchId/);
    expect(ROUTE_SRC).not.toMatch(/\.\.\.req\.body/);
    expect(ROUTE_SRC).toMatch(/requireRole\(CLINICAL_ROLES\)/);
  });
});

describe('W1125 — registry mount', () => {
  it('is dual-mounted with auth in features.registry', () => {
    expect(REG_SRC).toMatch(/safeRequire\('\.\.\/routes\/staff-health\.routes'\)/);
    expect(REG_SRC).toMatch(/dualMountAuth\(app, 'staff-health'/);
  });
});

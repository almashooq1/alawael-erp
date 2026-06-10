'use strict';

/**
 * biomedical-waste-wave1123.test.js — W1123 (static drift guard).
 *
 * Source-shape contract for the BiomedicalWasteRecord model + route + registry
 * mount: the WHO categories / lifecycle / disposal methods are present, the
 * Wave-18 invariants are declared, the route enforces branch isolation +
 * role guards + avoids mass-assignment, and the route is dual-mounted.
 */

const fs = require('fs');
const path = require('path');

const MODEL_SRC = fs.readFileSync(path.join(__dirname, '..', 'models', 'BiomedicalWasteRecord.js'), 'utf8');
const ROUTE_SRC = fs.readFileSync(path.join(__dirname, '..', 'routes', 'biomedical-waste.routes.js'), 'utf8');
const REG_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'registries', 'features.registry.js'),
  'utf8'
);
const Model = require('../models/BiomedicalWasteRecord');

describe('W1123 — model shape', () => {
  it('exposes the 8 WHO waste categories', () => {
    for (const c of ['infectious', 'sharps', 'pathological', 'pharmaceutical', 'cytotoxic', 'chemical', 'radioactive', 'general']) {
      expect(Model.CATEGORIES).toContain(c);
    }
  });

  it('has the generate→store→collect→dispose(+rejected) lifecycle', () => {
    expect(Model.STATUSES).toEqual(['generated', 'stored', 'collected', 'disposed', 'rejected']);
  });

  it('lists treatment/disposal methods incl. incineration + autoclave', () => {
    expect(Model.DISPOSAL_METHODS).toContain('incineration');
    expect(Model.DISPOSAL_METHODS).toContain('autoclave_steam');
  });

  it('declares Wave-18 invariants via __invariants validate', () => {
    expect(MODEL_SRC).toMatch(/__invariants/);
    expect(MODEL_SRC).toMatch(/path\('__invariants'\)\.validate/);
    expect(MODEL_SRC).toMatch(/puncture-proof/); // sharps rule
    expect(MODEL_SRC).toMatch(/invalidate\('disposalMethod'/);
  });

  it('exposes storageOverdue + isHazardous virtuals (source)', () => {
    expect(MODEL_SRC).toMatch(/virtual\('storageOverdue'\)/);
    expect(MODEL_SRC).toMatch(/virtual\('isHazardous'\)/);
  });

  it('auto-generates a BMW record number in a pre-save hook', () => {
    expect(MODEL_SRC).toMatch(/BMW-\$\{year\}-/);
    expect(MODEL_SRC).toMatch(/\.pre\(\s*'save'/);
  });
});

describe('W1123 — route surface', () => {
  it('mounts the full lifecycle + cohort + stats endpoints', () => {
    for (const p of [
      "router.get('/'",
      "router.get('/pending-collection'",
      "router.get('/overdue-storage'",
      "router.get('/awaiting-disposal'",
      "router.get('/by-category'",
      "router.get('/stats'",
      "router.post('/'",
      "router.post('/:id/store'",
      "router.post('/:id/collect'",
      "router.post('/:id/dispose'",
      "router.post('/:id/reject'",
      "router.delete('/:id'",
    ]) {
      expect(ROUTE_SRC).toContain(p);
    }
  });

  it('enforces branch isolation (branchFilter on queries, requireBranchAccess)', () => {
    expect(ROUTE_SRC).toMatch(/requireBranchAccess/);
    expect(ROUTE_SRC).toMatch(/branchFilter\(req\)/);
    // never the forbidden req.branchId pattern (W269h)
    expect(ROUTE_SRC).not.toMatch(/req\.branchId/);
  });

  it('guards every mutation with requireRole and disposal with DISPOSE_ROLES', () => {
    expect(ROUTE_SRC).toMatch(/requireRole\(WRITE_ROLES\)/);
    expect(ROUTE_SRC).toMatch(/requireRole\(DISPOSE_ROLES\)/);
    expect(ROUTE_SRC).toMatch(/requireRole\(DELETE_ROLES\)/);
  });

  it('avoids mass-assignment (no req.body spread / Object.assign of body)', () => {
    expect(ROUTE_SRC).not.toMatch(/\.\.\.req\.body/);
    expect(ROUTE_SRC).not.toMatch(/Object\.assign\(\s*row\s*,\s*req\.body/);
  });

  it('validates :id with mongoose.isValidObjectId on lookups', () => {
    expect(ROUTE_SRC).toMatch(/mongoose\.isValidObjectId\(req\.params\.id\)/);
  });
});

describe('W1123 — registry mount', () => {
  it('is dual-mounted with auth in features.registry', () => {
    expect(REG_SRC).toMatch(/safeRequire\('\.\.\/routes\/biomedical-waste\.routes'\)/);
    expect(REG_SRC).toMatch(/dualMountAuth\(app, 'biomedical-waste'/);
  });
});

'use strict';

/**
 * W1041 drift guard — MedicationReconciliation + medication-reconciliation
 * routes shape integrity. Static analysis only (jest.setup mocks mongoose).
 */

const fs = require('fs');
const path = require('path');

const MODEL_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'MedicationReconciliation.js'),
  'utf8'
);
const ROUTES_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'medication-reconciliation.routes.js'),
  'utf8'
);
const REGISTRY_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'registries', 'features.registry.js'),
  'utf8'
);

const model = require('../models/MedicationReconciliation');

describe('W1041 MedicationReconciliation — exports & enums', () => {
  it('exports TYPES (admission/discharge/transfer/periodic_review)', () => {
    expect(model.TYPES).toEqual(['admission', 'discharge', 'transfer', 'periodic_review']);
  });

  it('exports DECISIONS', () => {
    expect(model.DECISIONS).toEqual(['continue', 'discontinue', 'modify', 'hold', 'new']);
  });

  it('exports DISCREPANCY_TYPES incl omission + duplication + dose_change', () => {
    expect(model.DISCREPANCY_TYPES).toContain('none');
    expect(model.DISCREPANCY_TYPES).toContain('omission');
    expect(model.DISCREPANCY_TYPES).toContain('duplication');
    expect(model.DISCREPANCY_TYPES).toContain('dose_change');
  });

  it('exports SOURCES', () => {
    expect(model.SOURCES).toContain('home');
    expect(model.SOURCES).toContain('prescribed');
  });

  it('computeReconciliationStats is an exported function with correct math', () => {
    expect(typeof model.computeReconciliationStats).toBe('function');
    const r = model.computeReconciliationStats([
      { discrepancyType: 'omission', discrepancyResolved: false },
      { discrepancyType: 'none' },
      { discrepancyType: 'dose_change', discrepancyResolved: true },
    ]);
    expect(r).toEqual({ medicationCount: 3, discrepancyCount: 2, unresolvedDiscrepancyCount: 1 });
  });
});

describe('W1041 MedicationReconciliation — schema refs', () => {
  it("registers as mongoose.model('MedicationReconciliation', ...)", () => {
    expect(MODEL_SRC).toMatch(/mongoose\.model\(\s*['"]MedicationReconciliation['"]/);
  });

  it("beneficiaryId ref:'Beneficiary' + branchId ref:'Branch'", () => {
    expect(MODEL_SRC).toMatch(/beneficiaryId[\s\S]{0,120}ref:\s*['"]Beneficiary['"]/);
    expect(MODEL_SRC).toMatch(/branchId[\s\S]{0,120}ref:\s*['"]Branch['"]/);
  });

  it("collection is 'medication_reconciliations'", () => {
    expect(MODEL_SRC).toMatch(/collection:\s*['"]medication_reconciliations['"]/);
  });

  it('declares an embedded medications sub-schema (_id:false)', () => {
    expect(MODEL_SRC).toMatch(/MedicationItemSchema/);
    expect(MODEL_SRC).toMatch(/_id:\s*false/);
  });
});

describe('W1041 MedicationReconciliation — Wave-18 invariants + virtuals', () => {
  it('declares the __invariants path + validate()', () => {
    expect(MODEL_SRC).toMatch(/path\(['"]__invariants['"]\)\.validate/);
  });

  it('gates reconciliationType + modify-requires-notes + reconciled-requires-reconciler', () => {
    expect(MODEL_SRC).toMatch(/invalidate\(\s*['"]reconciliationType['"]/);
    expect(MODEL_SRC).toMatch(/decision\s*===\s*['"]modify['"]/);
    expect(MODEL_SRC).toMatch(/invalidate\(\s*['"]medications['"]/);
    expect(MODEL_SRC).toMatch(/invalidate\(\s*['"]reconciledBy['"]/);
    expect(MODEL_SRC).toMatch(/invalidate\(\s*['"]reconciledAt['"]/);
  });

  it('declares medicationCount + discrepancyCount + unresolvedDiscrepancyCount + hasUnresolvedDiscrepancies virtuals', () => {
    expect(MODEL_SRC).toMatch(/virtual\(['"]medicationCount['"]\)/);
    expect(MODEL_SRC).toMatch(/virtual\(['"]discrepancyCount['"]\)/);
    expect(MODEL_SRC).toMatch(/virtual\(['"]unresolvedDiscrepancyCount['"]\)/);
    expect(MODEL_SRC).toMatch(/virtual\(['"]hasUnresolvedDiscrepancies['"]\)/);
  });
});

describe('W1041 medication-reconciliation routes — endpoint surface', () => {
  it('GET /unresolved', () => {
    expect(ROUTES_SRC).toMatch(/router\.get\(\s*['"]\/unresolved['"]/);
  });
  it('GET / (list)', () => {
    expect(ROUTES_SRC).toMatch(/router\.get\(\s*['"]\/['"]/);
  });
  it('GET /by-beneficiary/:id', () => {
    expect(ROUTES_SRC).toMatch(/router\.get\(\s*['"]\/by-beneficiary\/:id['"]/);
  });
  it('GET /stats', () => {
    expect(ROUTES_SRC).toMatch(/router\.get\(\s*['"]\/stats['"]/);
  });
  it('GET /:id', () => {
    expect(ROUTES_SRC).toMatch(/router\.get\(\s*['"]\/:id['"]/);
  });
  it('POST / (create)', () => {
    expect(ROUTES_SRC).toMatch(/router\.post\(\s*['"]\/['"]/);
  });
  it('POST /:id/reconcile', () => {
    expect(ROUTES_SRC).toMatch(/router\.post\(\s*['"]\/:id\/reconcile['"]/);
  });
  it('POST /:id/resolve-discrepancy', () => {
    expect(ROUTES_SRC).toMatch(/router\.post\(\s*['"]\/:id\/resolve-discrepancy['"]/);
  });
  it('PATCH /:id', () => {
    expect(ROUTES_SRC).toMatch(/router\.patch\(\s*['"]\/:id['"]/);
  });
  it('DELETE /:id', () => {
    expect(ROUTES_SRC).toMatch(/router\.delete\(\s*['"]\/:id['"]/);
  });

  it('authenticates + branch-scopes (no bare findById)', () => {
    expect(ROUTES_SRC).toMatch(/router\.use\(authenticateToken\)/);
    expect(ROUTES_SRC).toMatch(/router\.use\(requireBranchAccess\)/);
    expect(ROUTES_SRC).not.toMatch(/findById\(req\.params/);
    const branchFilterUses = ROUTES_SRC.match(/branchFilter\(req\)/g) || [];
    expect(branchFilterUses.length).toBeGreaterThanOrEqual(7);
  });

  it('blocks edits after reconcile (409 in reconcile + patch)', () => {
    const reconciledBlocks = ROUTES_SRC.match(/status\s*===\s*['"]reconciled['"]/g) || [];
    expect(reconciledBlocks.length).toBeGreaterThanOrEqual(2);
  });
});

describe('W1041 features.registry.js mount', () => {
  it("loads via safeRequire('../routes/medication-reconciliation.routes')", () => {
    expect(REGISTRY_SRC).toMatch(
      /medicationReconciliationRoutes\s*=\s*safeRequire\(['"]\.\.\/routes\/medication-reconciliation\.routes['"]\)/
    );
  });

  it('mounts at /medication-reconciliation via dualMountAuth', () => {
    expect(REGISTRY_SRC).toMatch(
      /dualMountAuth\(\s*app\s*,\s*['"]medication-reconciliation['"]\s*,\s*medicationReconciliationRoutes\s*,\s*authenticate\s*\)/
    );
  });

  it('wave comment cites W1041 + Arabic label', () => {
    expect(REGISTRY_SRC).toMatch(/Wave 1041/);
    expect(REGISTRY_SRC).toMatch(/مطابقة الأدوية/);
  });
});

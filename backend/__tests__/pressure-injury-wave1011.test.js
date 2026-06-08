'use strict';

/**
 * W1011 drift guard — PressureInjuryRecord + pressure-injury routes shape
 * integrity. Static analysis only (backend/jest.setup.js mocks mongoose).
 *
 * Locks:
 *   • model registers as 'PressureInjuryRecord' with canonical Beneficiary
 *     + Branch refs
 *   • NPIAP STAGES + ORIGINS + BODY_SITES + STATUSES + OFFLOADING_ORDERS
 *     exported and don't shrink without a wave commit
 *   • Wave-18 invariants: enum gating, other⇒bodySiteOther, active⇒
 *     offloadingOrders, infectionSigns⇒infectionAction, healed/closed⇒
 *     healedAt, nextReviewDue≥date
 *   • computeBradenRisk pure exported static
 *   • areaCm2 + isFacilityAcquired + isReassessmentOverdue virtuals
 *   • route file declares 11 endpoints, branch-scopes every query, mounts
 *     at /pressure-injury via dualMountAuth
 */

const fs = require('fs');
const path = require('path');

const MODEL_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'PressureInjuryRecord.js'),
  'utf8'
);
const ROUTES_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'pressure-injury.routes.js'),
  'utf8'
);
const REGISTRY_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'registries', 'features.registry.js'),
  'utf8'
);

const model = require('../models/PressureInjuryRecord');

describe('W1011 PressureInjuryRecord — exports & enums', () => {
  it('exports the 6 NPIAP stages', () => {
    expect(model.STAGES).toEqual([
      'stage_1',
      'stage_2',
      'stage_3',
      'stage_4',
      'unstageable',
      'deep_tissue_injury',
    ]);
  });

  it('exports ORIGINS incl facility_acquired (HAPI)', () => {
    expect(model.ORIGINS).toEqual([
      'facility_acquired',
      'present_on_admission',
      'community_acquired',
    ]);
  });

  it('exports BODY_SITES incl other + sacrum + heels', () => {
    expect(model.BODY_SITES).toContain('sacrum');
    expect(model.BODY_SITES).toContain('heel_left');
    expect(model.BODY_SITES).toContain('other');
  });

  it('exports STATUSES lifecycle', () => {
    expect(model.STATUSES).toEqual(['active', 'monitoring', 'healing', 'healed', 'closed']);
  });

  it('exports a non-empty OFFLOADING_ORDERS catalog', () => {
    expect(Array.isArray(model.OFFLOADING_ORDERS)).toBe(true);
    expect(model.OFFLOADING_ORDERS.length).toBeGreaterThanOrEqual(8);
    expect(model.OFFLOADING_ORDERS).toContain('repositioning_2hourly');
    expect(model.OFFLOADING_ORDERS).toContain('wound_nurse_referral');
  });
});

describe('W1011 PressureInjuryRecord — schema refs', () => {
  it("registers as mongoose.model('PressureInjuryRecord', ...)", () => {
    expect(MODEL_SRC).toMatch(/mongoose\.model\(\s*['"]PressureInjuryRecord['"]/);
  });

  it("beneficiaryId ref:'Beneficiary' + branchId ref:'Branch'", () => {
    expect(MODEL_SRC).toMatch(/beneficiaryId[\s\S]{0,120}ref:\s*['"]Beneficiary['"]/);
    expect(MODEL_SRC).toMatch(/branchId[\s\S]{0,120}ref:\s*['"]Branch['"]/);
  });

  it("collection is 'pressure_injury_records'", () => {
    expect(MODEL_SRC).toMatch(/collection:\s*['"]pressure_injury_records['"]/);
  });
});

describe('W1011 PressureInjuryRecord — Wave-18 invariants', () => {
  it('declares the __invariants path + validate()', () => {
    expect(MODEL_SRC).toMatch(/path\(['"]__invariants['"]\)\.validate/);
  });

  it('gates bodySite/stage/origin/status enums', () => {
    expect(MODEL_SRC).toMatch(/invalidate\(\s*['"]bodySite['"]/);
    expect(MODEL_SRC).toMatch(/invalidate\(\s*['"]stage['"]/);
    expect(MODEL_SRC).toMatch(/invalidate\(\s*['"]origin['"]/);
    expect(MODEL_SRC).toMatch(/invalidate\(\s*['"]status['"]/);
  });

  it('other⇒bodySiteOther; active⇒offloadingOrders', () => {
    expect(MODEL_SRC).toMatch(/invalidate\(\s*['"]bodySiteOther['"]/);
    expect(MODEL_SRC).toMatch(/invalidate\(\s*\n?\s*['"]offloadingOrders['"]/);
  });

  it('infectionSigns⇒infectionAction; healed/closed⇒healedAt', () => {
    expect(MODEL_SRC).toMatch(/invalidate\(\s*['"]infectionAction['"]/);
    expect(MODEL_SRC).toMatch(/invalidate\(\s*['"]healedAt['"]/);
  });

  it('nextReviewDue ≥ date', () => {
    expect(MODEL_SRC).toMatch(/invalidate\(\s*['"]nextReviewDue['"]/);
  });
});

describe('W1011 PressureInjuryRecord — computeBradenRisk + virtuals', () => {
  it('computeBradenRisk is an exported function with correct bands', () => {
    expect(typeof model.computeBradenRisk).toBe('function');
    expect(model.computeBradenRisk(9)).toBe('severe');
    expect(model.computeBradenRisk(23)).toBe('not_at_risk');
  });

  it('declares areaCm2 + isFacilityAcquired + isReassessmentOverdue virtuals', () => {
    expect(MODEL_SRC).toMatch(/virtual\(['"]areaCm2['"]\)/);
    expect(MODEL_SRC).toMatch(/virtual\(['"]isFacilityAcquired['"]\)/);
    expect(MODEL_SRC).toMatch(/virtual\(['"]isReassessmentOverdue['"]\)/);
  });
});

describe('W1011 pressure-injury routes — endpoint surface', () => {
  it('GET /active', () => {
    expect(ROUTES_SRC).toMatch(/router\.get\(\s*['"]\/active['"]/);
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
  it('GET /due', () => {
    expect(ROUTES_SRC).toMatch(/router\.get\(\s*['"]\/due['"]/);
  });
  it('GET /:id', () => {
    expect(ROUTES_SRC).toMatch(/router\.get\(\s*['"]\/:id['"]/);
  });
  it('POST / (create)', () => {
    expect(ROUTES_SRC).toMatch(/router\.post\(\s*['"]\/['"]/);
  });
  it('POST /:id/reassessment', () => {
    expect(ROUTES_SRC).toMatch(/router\.post\(\s*['"]\/:id\/reassessment['"]/);
  });
  it('POST /:id/resolve', () => {
    expect(ROUTES_SRC).toMatch(/router\.post\(\s*['"]\/:id\/resolve['"]/);
  });
  it('PATCH /:id', () => {
    expect(ROUTES_SRC).toMatch(/router\.patch\(\s*['"]\/:id['"]/);
  });
  it('DELETE /:id', () => {
    expect(ROUTES_SRC).toMatch(/router\.delete\(\s*['"]\/:id['"]/);
  });

  it('authenticates + branch-scopes', () => {
    expect(ROUTES_SRC).toMatch(/router\.use\(authenticateToken\)/);
    expect(ROUTES_SRC).toMatch(/router\.use\(requireBranchAccess\)/);
  });

  it('every read query flows through branchFilter (no bare findById)', () => {
    expect(ROUTES_SRC).not.toMatch(/findById\(req\.params/);
    const branchFilterUses = ROUTES_SRC.match(/branchFilter\(req\)/g) || [];
    expect(branchFilterUses.length).toBeGreaterThanOrEqual(7);
  });

  it('blocks edits after close (409 in reassessment + resolve + patch)', () => {
    const closedBlocks = ROUTES_SRC.match(/status\s*===\s*['"]closed['"]/g) || [];
    expect(closedBlocks.length).toBeGreaterThanOrEqual(3);
  });

  it('surfaces HAPI rate in stats', () => {
    expect(ROUTES_SRC).toMatch(/hapiRate/);
  });
});

describe('W1011 features.registry.js mount', () => {
  it("loads via safeRequire('../routes/pressure-injury.routes')", () => {
    expect(REGISTRY_SRC).toMatch(
      /pressureInjuryRoutes\s*=\s*safeRequire\(['"]\.\.\/routes\/pressure-injury\.routes['"]\)/
    );
  });

  it('mounts at /pressure-injury via dualMountAuth (NOT plain dualMount)', () => {
    expect(REGISTRY_SRC).toMatch(
      /dualMountAuth\(\s*app\s*,\s*['"]pressure-injury['"]\s*,\s*pressureInjuryRoutes\s*,\s*authenticate\s*\)/
    );
  });

  it('wave comment cites W1011 + Arabic label', () => {
    expect(REGISTRY_SRC).toMatch(/Wave 1011/);
    expect(REGISTRY_SRC).toMatch(/سجل إصابات الضغط/);
  });
});

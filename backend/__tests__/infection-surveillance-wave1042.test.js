'use strict';

/**
 * W1042 drift guard — InfectionSurveillanceCase + infection-surveillance
 * routes shape integrity. Static analysis only (jest.setup mocks mongoose).
 */

const fs = require('fs');
const path = require('path');

const MODEL_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'InfectionSurveillanceCase.js'),
  'utf8'
);
const ROUTES_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'infection-surveillance.routes.js'),
  'utf8'
);
const REGISTRY_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'registries', 'features.registry.js'),
  'utf8'
);

const model = require('../models/InfectionSurveillanceCase');

describe('W1042 InfectionSurveillanceCase — exports & enums', () => {
  it('exports CATEGORIES incl respiratory + gastrointestinal + skin_soft_tissue', () => {
    expect(model.CATEGORIES).toContain('respiratory');
    expect(model.CATEGORIES).toContain('gastrointestinal');
    expect(model.CATEGORIES).toContain('skin_soft_tissue');
    expect(model.CATEGORIES).toContain('vaccine_preventable');
  });

  it('exports CASE_STATUSES (suspected/confirmed/ruled_out/resolved)', () => {
    expect(model.CASE_STATUSES).toEqual(['suspected', 'confirmed', 'ruled_out', 'resolved']);
  });

  it('exports PRECAUTION_TYPES incl contact/droplet/airborne', () => {
    expect(model.PRECAUTION_TYPES).toEqual(['none', 'standard', 'contact', 'droplet', 'airborne']);
  });
});

describe('W1042 InfectionSurveillanceCase — schema refs', () => {
  it("registers as mongoose.model('InfectionSurveillanceCase', ...)", () => {
    expect(MODEL_SRC).toMatch(/mongoose\.model\(\s*['"]InfectionSurveillanceCase['"]/);
  });

  it("beneficiaryId ref:'Beneficiary' + branchId ref:'Branch'", () => {
    expect(MODEL_SRC).toMatch(/beneficiaryId[\s\S]{0,120}ref:\s*['"]Beneficiary['"]/);
    expect(MODEL_SRC).toMatch(/branchId[\s\S]{0,120}ref:\s*['"]Branch['"]/);
  });

  it("collection is 'infection_surveillance_cases'", () => {
    expect(MODEL_SRC).toMatch(/collection:\s*['"]infection_surveillance_cases['"]/);
  });
});

describe('W1042 InfectionSurveillanceCase — Wave-18 invariants + virtuals', () => {
  it('declares the __invariants path + validate()', () => {
    expect(MODEL_SRC).toMatch(/path\(['"]__invariants['"]\)\.validate/);
  });

  it('gates category/caseStatus/precautionType enums', () => {
    expect(MODEL_SRC).toMatch(/invalidate\(\s*['"]category['"]/);
    expect(MODEL_SRC).toMatch(/invalidate\(\s*['"]caseStatus['"]/);
    expect(MODEL_SRC).toMatch(/invalidate\(\s*['"]precautionType['"]/);
  });

  it('confirmed⇒pathogen; resolved⇒resolutionDate; excluded⇒exclusionStart; reported⇒authorityReportDate', () => {
    expect(MODEL_SRC).toMatch(/invalidate\(\s*['"]pathogen['"]/);
    expect(MODEL_SRC).toMatch(/invalidate\(\s*['"]resolutionDate['"]/);
    expect(MODEL_SRC).toMatch(/invalidate\(\s*['"]exclusionStart['"]/);
    expect(MODEL_SRC).toMatch(/invalidate\(\s*['"]authorityReportDate['"]/);
  });

  it('declares isActive + isCurrentlyExcluded + durationDays virtuals', () => {
    expect(MODEL_SRC).toMatch(/virtual\(['"]isActive['"]\)/);
    expect(MODEL_SRC).toMatch(/virtual\(['"]isCurrentlyExcluded['"]\)/);
    expect(MODEL_SRC).toMatch(/virtual\(['"]durationDays['"]\)/);
  });
});

describe('W1042 infection-surveillance routes — endpoint surface', () => {
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
  it('GET /:id', () => {
    expect(ROUTES_SRC).toMatch(/router\.get\(\s*['"]\/:id['"]/);
  });
  it('POST / (create)', () => {
    expect(ROUTES_SRC).toMatch(/router\.post\(\s*['"]\/['"]/);
  });
  it('POST /:id/resolve', () => {
    expect(ROUTES_SRC).toMatch(/router\.post\(\s*['"]\/:id\/resolve['"]/);
  });
  it('POST /:id/report-authority', () => {
    expect(ROUTES_SRC).toMatch(/router\.post\(\s*['"]\/:id\/report-authority['"]/);
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

  it('blocks edits once resolved (409 in resolve + patch)', () => {
    const resolvedBlocks = ROUTES_SRC.match(/caseStatus\s*===\s*['"]resolved['"]/g) || [];
    expect(resolvedBlocks.length).toBeGreaterThanOrEqual(2);
  });
});

describe('W1042 features.registry.js mount', () => {
  it("loads via safeRequire('../routes/infection-surveillance.routes')", () => {
    expect(REGISTRY_SRC).toMatch(
      /infectionSurveillanceRoutes\s*=\s*safeRequire\(['"]\.\.\/routes\/infection-surveillance\.routes['"]\)/
    );
  });

  it('mounts at /infection-surveillance via dualMountAuth', () => {
    expect(REGISTRY_SRC).toMatch(
      /dualMountAuth\(\s*app\s*,\s*['"]infection-surveillance['"]\s*,\s*infectionSurveillanceRoutes\s*,\s*authenticate\s*\)/
    );
  });

  it('wave comment cites W1042 + Arabic label', () => {
    expect(REGISTRY_SRC).toMatch(/Wave 1042/);
    expect(REGISTRY_SRC).toMatch(/ترصّد العدوى/);
  });
});

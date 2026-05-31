'use strict';

/**
 * W683 drift guard — InstrumentalSwallowStudy + instrumental-swallow routes.
 *
 * Locks the W683 VFSS/FEES results build:
 *   • model registers as 'InstrumentalSwallowStudy' with canonical
 *     Beneficiary + Branch refs + DysphagiaAssessment (W670) +
 *     BeneficiaryDietPrescription (W368) cross-links
 *   • STUDY_TYPES / STATUSES / PHASES / IDDSI_LEVELS exported + stable
 *   • Wave-18 invariants (PAS 1..8 / aspiration⇒PAS≥6 / silent⇒aspiration /
 *     completed⇒performedDate+performedByName+finding / cancelled⇒reason)
 *   • indicatesAspiration + isComplete virtuals
 *   • routes: 10 endpoints incl. /pending-results + /record-result;
 *     branch-scoped, no req.branchId
 *   • mounts at /instrumental-swallow via dualMountAuth + canonical registered
 *
 * Static analysis only (jest.setup.js mocks mongoose). Pair with the
 * behavioral counterpart.
 */

const fs = require('fs');
const path = require('path');

const MODEL_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'InstrumentalSwallowStudy.js'),
  'utf8'
);
const ROUTES_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'instrumental-swallow.routes.js'),
  'utf8'
);
const REGISTRY_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'registries', 'features.registry.js'),
  'utf8'
);
const CANONICAL_INDEX_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'intelligence', 'canonical', 'index.js'),
  'utf8'
);

const model = require('../models/InstrumentalSwallowStudy');

describe('W683 InstrumentalSwallowStudy — exports & enums', () => {
  it('exports STUDY_TYPES (vfss/fees/mbss)', () => {
    expect(model.STUDY_TYPES).toEqual(['vfss', 'fees', 'mbss']);
  });
  it('exports STATUSES (ordered/scheduled/completed/cancelled)', () => {
    expect(model.STATUSES).toEqual(['ordered', 'scheduled', 'completed', 'cancelled']);
  });
  it('exports PHASES (4 swallow phases)', () => {
    expect(model.PHASES).toEqual(['oral_preparatory', 'oral', 'pharyngeal', 'oesophageal']);
  });
  it('exports IDDSI_LEVELS 0..7', () => {
    expect(model.IDDSI_LEVELS).toEqual(['0', '1', '2', '3', '4', '5', '6', '7']);
  });
});

describe('W683 InstrumentalSwallowStudy — canonical refs', () => {
  it('beneficiaryId refs Beneficiary', () => {
    expect(MODEL_SRC).toMatch(/beneficiaryId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]Beneficiary['"]/);
  });
  it('branchId refs Branch', () => {
    expect(MODEL_SRC).toMatch(/branchId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]Branch['"]/);
  });
  it('dysphagiaAssessmentId cross-links DysphagiaAssessment (W670)', () => {
    expect(MODEL_SRC).toMatch(
      /dysphagiaAssessmentId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]DysphagiaAssessment['"]/
    );
  });
  it('dietPrescriptionId cross-links BeneficiaryDietPrescription (W368)', () => {
    expect(MODEL_SRC).toMatch(
      /dietPrescriptionId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]BeneficiaryDietPrescription['"]/
    );
  });
});

describe('W683 InstrumentalSwallowStudy — Wave-18 invariants', () => {
  it('declares __invariants validate', () => {
    expect(MODEL_SRC).toMatch(/path\(['"]__invariants['"]\)\.validate/);
  });
  it('enforces PAS 1..8 range', () => {
    expect(MODEL_SRC).toMatch(
      /penetrationAspirationScale[\s\S]{0,160}invalidate\(['"]penetrationAspirationScale['"]/
    );
  });
  it('blocks aspirationDetected without PAS >= 6', () => {
    expect(MODEL_SRC).toMatch(
      /aspirationDetected[\s\S]{0,160}<\s*6[\s\S]{0,120}invalidate\(\s*['"]penetrationAspirationScale['"]/
    );
  });
  it('blocks silentAspiration without aspirationDetected', () => {
    expect(MODEL_SRC).toMatch(
      /silentAspiration[\s\S]{0,120}invalidate\(['"]aspirationDetected['"]/
    );
  });
  it('blocks completed without performedDate + performedByName', () => {
    expect(MODEL_SRC).toMatch(
      /status\s*===\s*['"]completed['"][\s\S]{0,200}invalidate\(['"]performedDate['"]/
    );
    expect(MODEL_SRC).toMatch(/invalidate\(['"]performedByName['"]/);
  });
  it('blocks cancelled without cancelReason', () => {
    expect(MODEL_SRC).toMatch(
      /status\s*===\s*['"]cancelled['"][\s\S]{0,200}invalidate\(['"]cancelReason['"]/
    );
  });
});

describe('W683 InstrumentalSwallowStudy — virtuals', () => {
  it('declares indicatesAspiration + isComplete virtuals', () => {
    expect(MODEL_SRC).toMatch(/virtual\(['"]indicatesAspiration['"]\)/);
    expect(MODEL_SRC).toMatch(/virtual\(['"]isComplete['"]\)/);
  });
});

describe('W683 instrumental-swallow routes — endpoint surface', () => {
  it('GET /pending-results', () => {
    expect(ROUTES_SRC).toMatch(/router\.get\(\s*['"]\/pending-results['"]/);
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
  it('POST / (order)', () => {
    expect(ROUTES_SRC).toMatch(/router\.post\(\s*['"]\/['"]/);
  });
  it('POST /:id/schedule', () => {
    expect(ROUTES_SRC).toMatch(/router\.post\(\s*['"]\/:id\/schedule['"]/);
  });
  it('POST /:id/record-result', () => {
    expect(ROUTES_SRC).toMatch(/router\.post\(\s*['"]\/:id\/record-result['"]/);
  });
  it('POST /:id/cancel', () => {
    expect(ROUTES_SRC).toMatch(/router\.post\(\s*['"]\/:id\/cancel['"]/);
  });
  it('PATCH /:id', () => {
    expect(ROUTES_SRC).toMatch(/router\.patch\(\s*['"]\/:id['"]/);
  });
  it('DELETE /:id (admin-only)', () => {
    expect(ROUTES_SRC).toMatch(/router\.delete\(\s*['"]\/:id['"]/);
  });

  it('authenticates + branch-scopes, never reads req.branchId', () => {
    expect(ROUTES_SRC).toMatch(/router\.use\(authenticateToken\)/);
    expect(ROUTES_SRC).toMatch(/router\.use\(requireBranchAccess\)/);
    expect(ROUTES_SRC).not.toMatch(/req\.branchId/);
  });
});

describe('W683 wiring — registry + canonical', () => {
  it("loads via safeRequire('../routes/instrumental-swallow.routes')", () => {
    expect(REGISTRY_SRC).toMatch(
      /instrumentalSwallowRoutes\s*=\s*safeRequire\(['"]\.\.\/routes\/instrumental-swallow\.routes['"]\)/
    );
  });
  it('mounts at /instrumental-swallow via dualMountAuth', () => {
    expect(REGISTRY_SRC).toMatch(
      /dualMountAuth\(\s*app\s*,\s*['"]instrumental-swallow['"]\s*,\s*instrumentalSwallowRoutes\s*,\s*authenticate\s*\)/
    );
  });
  it('wave comment cites W683 + Arabic label', () => {
    expect(REGISTRY_SRC).toMatch(/Wave 683/);
    expect(REGISTRY_SRC).toMatch(/دراسة البلع التصويرية/);
  });
  it('canonical index registers instrumental-swallow-study schema', () => {
    expect(CANONICAL_INDEX_SRC).toMatch(
      /require\(['"]\.\/schemas\/instrumental-swallow-study\.canonical['"]\)/
    );
  });
});

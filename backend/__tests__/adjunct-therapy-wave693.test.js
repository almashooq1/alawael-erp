'use strict';

/**
 * W693 drift guard — AdjunctTherapySession + adjunct-therapy routes.
 *
 * Locks the W693 adjunct-therapy (hydro/hippo/animal) build:
 *   • model registers as 'AdjunctTherapySession' with canonical Beneficiary
 *     + Branch + CarePlanVersion + User refs
 *   • MODALITIES / STATUSES / READINESS_LEVELS / RESPONSES / ANIMAL_TYPES exported
 *   • Wave-18 invariants — incl. the SAFETY GATE: completed⇒medicalCleared;
 *     completed⇒content; cancelled⇒reason; incident⇒notes;
 *     animal-modality completed⇒animalType
 *   • isCleared + hadIncident virtuals
 *   • routes: 10 endpoints incl. /clear + /complete (clearance-gated 409)
 *   • mounts at /adjunct-therapy via dualMountAuth + canonical registered
 */

const fs = require('fs');
const path = require('path');

const MODEL_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'AdjunctTherapySession.js'),
  'utf8'
);
const ROUTES_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'adjunct-therapy.routes.js'),
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

const model = require('../models/AdjunctTherapySession');

describe('W693 AdjunctTherapySession — exports & enums', () => {
  it('exports MODALITIES (hydrotherapy/hippotherapy/animal_assisted)', () => {
    expect(model.MODALITIES).toEqual(['hydrotherapy', 'hippotherapy', 'animal_assisted']);
  });
  it('exports STATUSES', () => {
    expect(model.STATUSES).toEqual(['scheduled', 'completed', 'cancelled', 'no_show']);
  });
  it('exports READINESS_LEVELS / RESPONSES / ANIMAL_TYPES', () => {
    expect(model.READINESS_LEVELS).toEqual(['not_assessed', 'emerging', 'ready']);
    expect(model.RESPONSES).toEqual(['positive', 'neutral', 'distressed', 'refused']);
    expect(model.ANIMAL_TYPES).toEqual(['horse', 'dog', 'other', 'none']);
  });
});

describe('W693 AdjunctTherapySession — canonical refs', () => {
  it('beneficiaryId refs Beneficiary', () => {
    expect(MODEL_SRC).toMatch(/beneficiaryId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]Beneficiary['"]/);
  });
  it('branchId refs Branch', () => {
    expect(MODEL_SRC).toMatch(/branchId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]Branch['"]/);
  });
  it('carePlanVersionId refs CarePlanVersion', () => {
    expect(MODEL_SRC).toMatch(
      /carePlanVersionId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]CarePlanVersion['"]/
    );
  });
  it('therapistId refs User', () => {
    expect(MODEL_SRC).toMatch(/therapistId\s*:\s*\{[\s\S]{0,160}ref\s*:\s*['"]User['"]/);
  });
});

describe('W693 AdjunctTherapySession — Wave-18 invariants (incl. safety gate)', () => {
  it('declares __invariants validate', () => {
    expect(MODEL_SRC).toMatch(/path\(['"]__invariants['"]\)\.validate/);
  });
  it('SAFETY GATE: blocks completed without medicalCleared', () => {
    expect(MODEL_SRC).toMatch(
      /status\s*===\s*['"]completed['"][\s\S]{0,200}invalidate\(['"]medicalCleared['"]/
    );
  });
  it('blocks completed without content (activities/outcomeNotes)', () => {
    expect(MODEL_SRC).toMatch(/invalidate\(['"]outcomeNotes['"]/);
  });
  it('blocks cancelled without cancelReason', () => {
    expect(MODEL_SRC).toMatch(
      /status\s*===\s*['"]cancelled['"][\s\S]{0,200}invalidate\(['"]cancelReason['"]/
    );
  });
  it('blocks incidentDuringSession without incidentNotes', () => {
    expect(MODEL_SRC).toMatch(
      /incidentDuringSession[\s\S]{0,160}invalidate\(['"]incidentNotes['"]/
    );
  });
  it('blocks animal modality completed without animalType', () => {
    expect(MODEL_SRC).toMatch(/ANIMAL_MODALITIES[\s\S]{0,160}invalidate\(['"]animalType['"]/);
  });
});

describe('W693 AdjunctTherapySession — virtuals', () => {
  it('declares isCleared + hadIncident virtuals', () => {
    expect(MODEL_SRC).toMatch(/virtual\(['"]isCleared['"]\)/);
    expect(MODEL_SRC).toMatch(/virtual\(['"]hadIncident['"]\)/);
  });
});

describe('W693 adjunct-therapy routes — endpoint surface', () => {
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
  it('POST /:id/clear (medical clearance gate)', () => {
    expect(ROUTES_SRC).toMatch(/router\.post\(\s*['"]\/:id\/clear['"]/);
  });
  it('POST /:id/complete', () => {
    expect(ROUTES_SRC).toMatch(/router\.post\(\s*['"]\/:id\/complete['"]/);
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
  it('complete endpoint refuses without clearance (409)', () => {
    expect(ROUTES_SRC).toMatch(/!row\.medicalCleared[\s\S]{0,200}\.status\(409\)/);
  });
  it('clearance restricted to a CLEAR_ROLES set (clinical decision)', () => {
    expect(ROUTES_SRC).toMatch(/CLEAR_ROLES/);
  });
  it('authenticates + branch-scopes, never reads req.branchId', () => {
    expect(ROUTES_SRC).toMatch(/router\.use\(authenticateToken\)/);
    expect(ROUTES_SRC).toMatch(/router\.use\(requireBranchAccess\)/);
    expect(ROUTES_SRC).not.toMatch(/req\.branchId/);
  });
});

describe('W693 wiring — registry + canonical', () => {
  it("loads via safeRequire('../routes/adjunct-therapy.routes')", () => {
    expect(REGISTRY_SRC).toMatch(
      /adjunctTherapyRoutes\s*=\s*safeRequire\(['"]\.\.\/routes\/adjunct-therapy\.routes['"]\)/
    );
  });
  it('mounts at /adjunct-therapy via dualMountAuth', () => {
    expect(REGISTRY_SRC).toMatch(
      /dualMountAuth\(\s*app\s*,\s*['"]adjunct-therapy['"]\s*,\s*adjunctTherapyRoutes\s*,\s*authenticate\s*\)/
    );
  });
  it('wave comment cites W693 + Arabic label', () => {
    expect(REGISTRY_SRC).toMatch(/Wave 693/);
    expect(REGISTRY_SRC).toMatch(/العلاج المساند/);
  });
  it('canonical index registers adjunct-therapy-session schema', () => {
    expect(CANONICAL_INDEX_SRC).toMatch(
      /require\(['"]\.\/schemas\/adjunct-therapy-session\.canonical['"]\)/
    );
  });
});

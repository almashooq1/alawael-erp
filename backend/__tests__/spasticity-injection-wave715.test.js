'use strict';

/**
 * W715 drift guard — SpasticityInjection + spasticity-injection routes.
 */

const fs = require('fs');
const path = require('path');

const MODEL_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'SpasticityInjection.js'),
  'utf8'
);
const ROUTES_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'spasticity-injection.routes.js'),
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

const model = require('../models/SpasticityInjection');

describe('W715 SpasticityInjection — exports & enums', () => {
  it('exports AGENTS (botulinum A/B, phenol, ITB, other)', () => {
    expect(model.AGENTS).toEqual([
      'botulinum_toxin_a',
      'botulinum_toxin_b',
      'phenol',
      'baclofen_itb',
      'other',
    ]);
  });
  it('exports STATUSES (planned/completed/cancelled)', () => {
    expect(model.STATUSES).toEqual(['planned', 'completed', 'cancelled']);
  });
  it('exports SIDES / GUIDANCE / MAS (Modified Ashworth 0..4 incl. 1+)', () => {
    expect(model.SIDES).toEqual(['left', 'right', 'midline']);
    expect(model.MAS).toEqual(['0', '1', '1+', '2', '3', '4']);
    expect(model.GUIDANCE).toEqual(expect.arrayContaining(['ultrasound', 'emg', 'e_stim']));
  });
});

describe('W715 SpasticityInjection — canonical refs', () => {
  it('beneficiaryId refs Beneficiary', () => {
    expect(MODEL_SRC).toMatch(/beneficiaryId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]Beneficiary['"]/);
  });
  it('branchId refs Branch', () => {
    expect(MODEL_SRC).toMatch(/branchId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]Branch['"]/);
  });
  it('carePlanVersionId refs CarePlanVersion; physicianId refs User', () => {
    expect(MODEL_SRC).toMatch(
      /carePlanVersionId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]CarePlanVersion['"]/
    );
    expect(MODEL_SRC).toMatch(/physicianId\s*:\s*\{[\s\S]{0,160}ref\s*:\s*['"]User['"]/);
  });
});

describe('W715 SpasticityInjection — Wave-18 invariants', () => {
  it('declares __invariants validate', () => {
    expect(MODEL_SRC).toMatch(/path\(['"]__invariants['"]\)\.validate/);
  });
  it('CONSENT GATE: blocks completed without consentObtained', () => {
    expect(MODEL_SRC).toMatch(
      /status\s*===\s*['"]completed['"][\s\S]{0,300}invalidate\(\s*['"]consentObtained['"]/
    );
  });
  it('blocks completed without a targeted muscle', () => {
    expect(MODEL_SRC).toMatch(/invalidate\(\s*['"]targetedMuscles['"]/);
  });
  it('blocks cancelled without cancelReason', () => {
    expect(MODEL_SRC).toMatch(
      /status\s*===\s*['"]cancelled['"][\s\S]{0,200}invalidate\(['"]cancelReason['"]/
    );
  });
});

describe('W715 SpasticityInjection — virtuals', () => {
  it('declares isFollowUpDue + muscleCount', () => {
    expect(MODEL_SRC).toMatch(/virtual\(['"]isFollowUpDue['"]\)/);
    expect(MODEL_SRC).toMatch(/virtual\(['"]muscleCount['"]\)/);
  });
});

describe('W715 routes — endpoint surface', () => {
  const eps = [
    /router\.get\(\s*['"]\/follow-up-due['"]/,
    /router\.get\(\s*['"]\/['"]/,
    /router\.get\(\s*['"]\/by-beneficiary\/:id['"]/,
    /router\.get\(\s*['"]\/stats['"]/,
    /router\.get\(\s*['"]\/:id['"]/,
    /router\.post\(\s*['"]\/['"]/,
    /router\.post\(\s*['"]\/:id\/complete['"]/,
    /router\.post\(\s*['"]\/:id\/cancel['"]/,
    /router\.patch\(\s*['"]\/:id['"]/,
    /router\.delete\(\s*['"]\/:id['"]/,
  ];
  it('declares all 10 endpoints', () => {
    for (const re of eps) expect(ROUTES_SRC).toMatch(re);
  });
  it('complete endpoint enforces the consent gate (409)', () => {
    expect(ROUTES_SRC).toMatch(/consentObtained[\s\S]{0,160}\.status\(409\)/);
  });
  it('writes restricted to clinicians; branch-scoped; no req.branchId', () => {
    expect(ROUTES_SRC).toMatch(/router\.use\(requireBranchAccess\)/);
    expect(ROUTES_SRC).toMatch(/branchFilter\(req\)/);
    expect(ROUTES_SRC).not.toMatch(/req\.branchId/);
  });
});

describe('W715 wiring — registry + canonical', () => {
  it("loads via safeRequire('../routes/spasticity-injection.routes')", () => {
    expect(REGISTRY_SRC).toMatch(
      /spasticityInjectionRoutes\s*=\s*safeRequire\(['"]\.\.\/routes\/spasticity-injection\.routes['"]\)/
    );
  });
  it('mounts at /spasticity-injection via dualMountAuth', () => {
    expect(REGISTRY_SRC).toMatch(
      /dualMountAuth\(\s*app\s*,\s*['"]spasticity-injection['"]\s*,\s*spasticityInjectionRoutes\s*,\s*authenticate\s*\)/
    );
  });
  it('wave comment cites W715 + Arabic label', () => {
    expect(REGISTRY_SRC).toMatch(/Wave 715/);
    expect(REGISTRY_SRC).toMatch(/عيادة التشنّج/);
  });
  it('canonical index registers spasticity-injection schema', () => {
    expect(CANONICAL_INDEX_SRC).toMatch(
      /require\(['"]\.\/schemas\/spasticity-injection\.canonical['"]\)/
    );
  });
});

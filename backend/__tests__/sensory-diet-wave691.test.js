'use strict';

/**
 * W691 drift guard — SensoryDietProgram + sensory-diet routes.
 *
 * Locks the W691 sensory-diet + Snoezelen build:
 *   • model registers as 'SensoryDietProgram' with canonical Beneficiary +
 *     Branch + CarePlanVersion + User refs
 *   • STATUSES / SENSORY_SYSTEMS / PURPOSES / REGULATION_OUTCOMES exported
 *   • Wave-18 invariants (active⇒≥1 activity / discontinued⇒reason)
 *   • regulatedSessionCount / isActive / isReviewOverdue virtuals
 *   • routes: 10 endpoints incl. /review-due + /snoezelen-session + /transition
 *   • mounts at /sensory-diet via dualMountAuth + canonical registered
 */

const fs = require('fs');
const path = require('path');

const MODEL_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'SensoryDietProgram.js'),
  'utf8'
);
const ROUTES_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'sensory-diet.routes.js'),
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

const model = require('../models/SensoryDietProgram');

describe('W691 SensoryDietProgram — exports & enums', () => {
  it('exports STATUSES', () => {
    expect(model.STATUSES).toEqual(['active', 'on_hold', 'completed', 'discontinued']);
  });
  it('exports SENSORY_SYSTEMS (7 systems incl. interoceptive)', () => {
    expect(model.SENSORY_SYSTEMS).toEqual([
      'proprioceptive',
      'vestibular',
      'tactile',
      'visual',
      'auditory',
      'oral',
      'interoceptive',
    ]);
  });
  it('exports PURPOSES (alerting/calming/organizing)', () => {
    expect(model.PURPOSES).toEqual(['alerting', 'calming', 'organizing']);
  });
  it('exports REGULATION_OUTCOMES', () => {
    expect(model.REGULATION_OUTCOMES).toEqual([
      'regulated',
      'partially_regulated',
      'no_change',
      'escalated',
    ]);
  });
});

describe('W691 SensoryDietProgram — canonical refs', () => {
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
  it('sensoryProfileAssessmentId is a plain ObjectId with NO ref (avoids phantom)', () => {
    expect(MODEL_SRC).not.toMatch(/sensoryProfileAssessmentId[\s\S]{0,80}ref\s*:/);
  });
});

describe('W691 SensoryDietProgram — Wave-18 invariants', () => {
  it('declares __invariants validate', () => {
    expect(MODEL_SRC).toMatch(/path\(['"]__invariants['"]\)\.validate/);
  });
  it('blocks active program with no activities', () => {
    expect(MODEL_SRC).toMatch(
      /status\s*===\s*['"]active['"][\s\S]{0,200}invalidate\(['"]activities['"]/
    );
  });
  it('blocks discontinued without discontinueReason', () => {
    expect(MODEL_SRC).toMatch(
      /status\s*===\s*['"]discontinued['"][\s\S]{0,200}invalidate\(['"]discontinueReason['"]/
    );
  });
});

describe('W691 SensoryDietProgram — virtuals', () => {
  it('declares regulatedSessionCount / isActive / isReviewOverdue', () => {
    expect(MODEL_SRC).toMatch(/virtual\(['"]regulatedSessionCount['"]\)/);
    expect(MODEL_SRC).toMatch(/virtual\(['"]isActive['"]\)/);
    expect(MODEL_SRC).toMatch(/virtual\(['"]isReviewOverdue['"]\)/);
  });
});

describe('W691 sensory-diet routes — endpoint surface', () => {
  it('GET /review-due', () => {
    expect(ROUTES_SRC).toMatch(/router\.get\(\s*['"]\/review-due['"]/);
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
  it('POST /:id/snoezelen-session', () => {
    expect(ROUTES_SRC).toMatch(/router\.post\(\s*['"]\/:id\/snoezelen-session['"]/);
  });
  it('POST /:id/transition', () => {
    expect(ROUTES_SRC).toMatch(/router\.post\(\s*['"]\/:id\/transition['"]/);
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

describe('W691 wiring — registry + canonical', () => {
  it("loads via safeRequire('../routes/sensory-diet.routes')", () => {
    expect(REGISTRY_SRC).toMatch(
      /sensoryDietRoutes\s*=\s*safeRequire\(['"]\.\.\/routes\/sensory-diet\.routes['"]\)/
    );
  });
  it('mounts at /sensory-diet via dualMountAuth', () => {
    expect(REGISTRY_SRC).toMatch(
      /dualMountAuth\(\s*app\s*,\s*['"]sensory-diet['"]\s*,\s*sensoryDietRoutes\s*,\s*authenticate\s*\)/
    );
  });
  it('wave comment cites W691 + Arabic label', () => {
    expect(REGISTRY_SRC).toMatch(/Wave 691/);
    expect(REGISTRY_SRC).toMatch(/الحمية الحسية/);
  });
  it('canonical index registers sensory-diet-program schema', () => {
    expect(CANONICAL_INDEX_SRC).toMatch(
      /require\(['"]\.\/schemas\/sensory-diet-program\.canonical['"]\)/
    );
  });
});

'use strict';

/**
 * W689 drift guard — DttSession + dtt-session routes.
 *
 * Locks the W689 ABA discrete-trial build:
 *   • model registers as 'DttSession' with canonical Beneficiary + Branch
 *     + CarePlanVersion + User refs (behaviorPlanId is plain ObjectId — NO
 *     ref, to avoid a phantom on the unregistered BIP model name)
 *   • PROGRAM_AREAS / STATUSES / PROMPT_LEVELS / RESPONSES exported
 *   • Wave-18 invariants (completed⇒≥1 target with trials / cancelled⇒
 *     reason / mastered-target⇒has-trials)
 *   • totalTrials + independentCorrectRate virtuals
 *   • routes: 10 endpoints incl. /record-data + trend on by-beneficiary
 *   • mounts at /dtt-session via dualMountAuth + canonical registered
 */

const fs = require('fs');
const path = require('path');

const MODEL_SRC = fs.readFileSync(path.join(__dirname, '..', 'models', 'DttSession.js'), 'utf8');
const ROUTES_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'dtt-session.routes.js'),
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

const model = require('../models/DttSession');

describe('W689 DttSession — exports & enums', () => {
  it('exports PROGRAM_AREAS (7 domains)', () => {
    expect(model.PROGRAM_AREAS).toEqual([
      'communication',
      'social',
      'motor',
      'academic',
      'self_help',
      'play',
      'behavior_reduction',
    ]);
  });
  it('exports STATUSES', () => {
    expect(model.STATUSES).toEqual(['scheduled', 'completed', 'cancelled', 'no_show']);
  });
  it('exports PROMPT_LEVELS ending in independent (least-to-most hierarchy)', () => {
    expect(model.PROMPT_LEVELS).toContain('independent');
    expect(model.PROMPT_LEVELS).toContain('full_physical');
    expect(model.PROMPT_LEVELS[model.PROMPT_LEVELS.length - 1]).toBe('independent');
  });
  it('exports RESPONSES (correct/incorrect/no_response)', () => {
    expect(model.RESPONSES).toEqual(['correct', 'incorrect', 'no_response']);
  });
});

describe('W689 DttSession — canonical refs', () => {
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
  it('behaviorPlanId is a plain ObjectId with NO ref (avoids phantom)', () => {
    expect(MODEL_SRC).toMatch(
      /behaviorPlanId\s*:\s*\{\s*type:\s*mongoose\.Schema\.Types\.ObjectId,\s*default:\s*null\s*\}/
    );
    expect(MODEL_SRC).not.toMatch(/behaviorPlanId[\s\S]{0,80}ref\s*:/);
  });
});

describe('W689 DttSession — Wave-18 invariants', () => {
  it('declares __invariants validate', () => {
    expect(MODEL_SRC).toMatch(/path\(['"]__invariants['"]\)\.validate/);
  });
  it('blocks completed without a target holding trials', () => {
    expect(MODEL_SRC).toMatch(
      /status\s*===\s*['"]completed['"][\s\S]{0,260}invalidate\(['"]targets['"]/
    );
  });
  it('blocks cancelled without cancelReason', () => {
    expect(MODEL_SRC).toMatch(
      /status\s*===\s*['"]cancelled['"][\s\S]{0,200}invalidate\(['"]cancelReason['"]/
    );
  });
  it('blocks masteryAchieved target with no trials', () => {
    expect(MODEL_SRC).toMatch(/masteryAchieved[\s\S]{0,160}invalidate\(['"]targets['"]/);
  });
});

describe('W689 DttSession — virtuals', () => {
  it('declares totalTrials + independentCorrectRate virtuals', () => {
    expect(MODEL_SRC).toMatch(/virtual\(['"]totalTrials['"]\)/);
    expect(MODEL_SRC).toMatch(/virtual\(['"]independentCorrectRate['"]\)/);
  });
});

describe('W689 dtt-session routes — endpoint surface', () => {
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
  it('POST /:id/record-data', () => {
    expect(ROUTES_SRC).toMatch(/router\.post\(\s*['"]\/:id\/record-data['"]/);
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
  it('by-beneficiary returns an independent-correct-rate trend', () => {
    expect(ROUTES_SRC).toMatch(/trend/);
    expect(ROUTES_SRC).toMatch(/independentCorrectRate/);
  });
  it('authenticates + branch-scopes, never reads req.branchId', () => {
    expect(ROUTES_SRC).toMatch(/router\.use\(authenticateToken\)/);
    expect(ROUTES_SRC).toMatch(/router\.use\(requireBranchAccess\)/);
    expect(ROUTES_SRC).not.toMatch(/req\.branchId/);
  });
});

describe('W689 wiring — registry + canonical', () => {
  it("loads via safeRequire('../routes/dtt-session.routes')", () => {
    expect(REGISTRY_SRC).toMatch(
      /dttSessionRoutes\s*=\s*safeRequire\(['"]\.\.\/routes\/dtt-session\.routes['"]\)/
    );
  });
  it('mounts at /dtt-session via dualMountAuth', () => {
    expect(REGISTRY_SRC).toMatch(
      /dualMountAuth\(\s*app\s*,\s*['"]dtt-session['"]\s*,\s*dttSessionRoutes\s*,\s*authenticate\s*\)/
    );
  });
  it('wave comment cites W689 + Arabic label', () => {
    expect(REGISTRY_SRC).toMatch(/Wave 689/);
    expect(REGISTRY_SRC).toMatch(/المحاولات المنفصلة/);
  });
  it('canonical index registers dtt-session schema', () => {
    expect(CANONICAL_INDEX_SRC).toMatch(/require\(['"]\.\/schemas\/dtt-session\.canonical['"]\)/);
  });
});

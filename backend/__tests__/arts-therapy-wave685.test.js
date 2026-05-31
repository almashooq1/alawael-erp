'use strict';

/**
 * W685 drift guard — CreativeArtsTherapySession + arts-therapy routes.
 *
 * Locks the W685 creative-arts therapy build:
 *   • model registers as 'CreativeArtsTherapySession' with canonical
 *     Beneficiary + Branch + CarePlanVersion + User refs
 *   • MODALITIES / STATUSES / FORMATS / ENGAGEMENT_LEVELS / MOODS exported
 *   • Wave-18 invariants (group⇒groupSize≥2 / completed⇒engagement+notes /
 *     cancelled⇒cancelReason)
 *   • moodShift + moodImproved virtuals
 *   • routes: 9 endpoints incl. /stats + /:id/complete; branch-scoped
 *   • mounts at /arts-therapy via dualMountAuth + canonical registered
 */

const fs = require('fs');
const path = require('path');

const MODEL_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'CreativeArtsTherapySession.js'),
  'utf8'
);
const ROUTES_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'arts-therapy.routes.js'),
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

const model = require('../models/CreativeArtsTherapySession');

describe('W685 CreativeArtsTherapySession — exports & enums', () => {
  it('exports MODALITIES (music/art/drama/dance_movement/play)', () => {
    expect(model.MODALITIES).toEqual(['music', 'art', 'drama', 'dance_movement', 'play']);
  });
  it('exports STATUSES (scheduled/completed/cancelled/no_show)', () => {
    expect(model.STATUSES).toEqual(['scheduled', 'completed', 'cancelled', 'no_show']);
  });
  it('exports FORMATS + ENGAGEMENT_LEVELS + MOODS', () => {
    expect(model.FORMATS).toEqual(['individual', 'group']);
    expect(model.ENGAGEMENT_LEVELS).toEqual(['none', 'low', 'moderate', 'high']);
    expect(model.MOODS).toEqual(['distressed', 'anxious', 'sad', 'neutral', 'content', 'happy']);
  });
  it('exports MOOD_RANK as a frozen positivity map', () => {
    expect(Object.isFrozen(model.MOOD_RANK)).toBe(true);
    expect(model.MOOD_RANK.happy).toBeGreaterThan(model.MOOD_RANK.distressed);
  });
});

describe('W685 CreativeArtsTherapySession — canonical refs', () => {
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

describe('W685 CreativeArtsTherapySession — Wave-18 invariants', () => {
  it('declares __invariants validate', () => {
    expect(MODEL_SRC).toMatch(/path\(['"]__invariants['"]\)\.validate/);
  });
  it('blocks group format without groupSize >= 2', () => {
    expect(MODEL_SRC).toMatch(
      /format\s*===\s*['"]group['"][\s\S]{0,160}invalidate\(['"]groupSize['"]/
    );
  });
  it('blocks completed without engagementLevel', () => {
    expect(MODEL_SRC).toMatch(
      /status\s*===\s*['"]completed['"][\s\S]{0,200}invalidate\(['"]engagementLevel['"]/
    );
  });
  it('blocks cancelled without cancelReason', () => {
    expect(MODEL_SRC).toMatch(
      /status\s*===\s*['"]cancelled['"][\s\S]{0,200}invalidate\(['"]cancelReason['"]/
    );
  });
});

describe('W685 CreativeArtsTherapySession — virtuals', () => {
  it('declares moodShift + moodImproved virtuals', () => {
    expect(MODEL_SRC).toMatch(/virtual\(['"]moodShift['"]\)/);
    expect(MODEL_SRC).toMatch(/virtual\(['"]moodImproved['"]\)/);
  });
});

describe('W685 arts-therapy routes — endpoint surface', () => {
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
  it('stats computes mood-improved rate', () => {
    expect(ROUTES_SRC).toMatch(/moodImprovedRate/);
  });
  it('authenticates + branch-scopes, never reads req.branchId', () => {
    expect(ROUTES_SRC).toMatch(/router\.use\(authenticateToken\)/);
    expect(ROUTES_SRC).toMatch(/router\.use\(requireBranchAccess\)/);
    expect(ROUTES_SRC).not.toMatch(/req\.branchId/);
  });
});

describe('W685 wiring — registry + canonical', () => {
  it("loads via safeRequire('../routes/arts-therapy.routes')", () => {
    expect(REGISTRY_SRC).toMatch(
      /artsTherapyRoutes\s*=\s*safeRequire\(['"]\.\.\/routes\/arts-therapy\.routes['"]\)/
    );
  });
  it('mounts at /arts-therapy via dualMountAuth', () => {
    expect(REGISTRY_SRC).toMatch(
      /dualMountAuth\(\s*app\s*,\s*['"]arts-therapy['"]\s*,\s*artsTherapyRoutes\s*,\s*authenticate\s*\)/
    );
  });
  it('wave comment cites W685 + Arabic label', () => {
    expect(REGISTRY_SRC).toMatch(/Wave 685/);
    expect(REGISTRY_SRC).toMatch(/الفنون التعبيرية/);
  });
  it('canonical index registers creative-arts-therapy-session schema', () => {
    expect(CANONICAL_INDEX_SRC).toMatch(
      /require\(['"]\.\/schemas\/creative-arts-therapy-session\.canonical['"]\)/
    );
  });
});

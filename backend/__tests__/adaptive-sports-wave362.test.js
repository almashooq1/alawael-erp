'use strict';

/**
 * W362 drift guard — AdaptiveSportsProgram + adaptive-sports routes.
 *
 * Locks W362 build:
 *   • SPORTS = 19 entries covering wheelchair sports + adapted variants
 *   • CATEGORIES (3) + PHYSICAL_DEMAND (3) + STATUSES (5) + SESSION_TYPES
 *     (5) + INDEPENDENCE_LEVELS (4) enums frozen
 *   • Wave-18 invariants: high-demand⇒medicalClearance (when non-draft);
 *     active⇒startDate; completed⇒endDate; discontinued⇒reason; session
 *     integrity (date+duration); achievement integrity (title+earnedAt)
 *   • virtuals: sessionCount + achievementCount + totalMinutesLogged
 *   • 17 endpoints at /adaptive-sports
 *
 * Static analysis only.
 */

const fs = require('fs');
const path = require('path');

const MODEL_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'AdaptiveSportsProgram.js'),
  'utf8'
);
const ROUTES_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'adaptive-sports.routes.js'),
  'utf8'
);
const REGISTRY_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'registries', 'features.registry.js'),
  'utf8'
);

const model = require('../models/AdaptiveSportsProgram');

describe('W362 AdaptiveSportsProgram — exports & enums', () => {
  it('SPORTS has 19 entries covering wheelchair + hippotherapy + sensory', () => {
    expect(model.SPORTS).toEqual(
      expect.arrayContaining([
        'wheelchair_basketball',
        'wheelchair_tennis',
        'boccia',
        'goalball',
        'adapted_swimming',
        'hippotherapy',
        'sensory_movement',
      ])
    );
    expect(model.SPORTS.length).toBe(19);
  });

  it('CATEGORIES = team/individual/therapy_adjacent', () => {
    expect(model.CATEGORIES).toEqual(['team', 'individual', 'therapy_adjacent']);
  });

  it('PHYSICAL_DEMAND = low/moderate/high', () => {
    expect(model.PHYSICAL_DEMAND).toEqual(['low', 'moderate', 'high']);
  });

  it('STATUSES = draft/active/paused/completed/discontinued', () => {
    expect(model.STATUSES).toEqual(['draft', 'active', 'paused', 'completed', 'discontinued']);
  });

  it('SESSION_TYPES = training/competition/demo/social/assessment', () => {
    expect(model.SESSION_TYPES).toEqual([
      'training',
      'competition',
      'demo',
      'social',
      'assessment',
    ]);
  });

  it('INDEPENDENCE_LEVELS = 4-tier (full → independent)', () => {
    expect(model.INDEPENDENCE_LEVELS).toEqual([
      'full_support',
      'moderate_support',
      'minimal_support',
      'independent',
    ]);
  });
});

describe('W362 AdaptiveSportsProgram — canonical refs', () => {
  it('beneficiaryId refs Beneficiary', () => {
    expect(MODEL_SRC).toMatch(/beneficiaryId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]Beneficiary['"]/);
  });

  it('branchId refs Branch', () => {
    expect(MODEL_SRC).toMatch(/branchId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]Branch['"]/);
  });

  it('primaryCoachId + coachId (session) ref User', () => {
    expect(MODEL_SRC).toMatch(/primaryCoachId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]User['"]/);
    expect(MODEL_SRC).toMatch(/coachId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]User['"]/);
  });

  it('linkedCarePlanVersionId refs CarePlanVersion (W41)', () => {
    expect(MODEL_SRC).toMatch(
      /linkedCarePlanVersionId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]CarePlanVersion['"]/
    );
  });
});

describe('W362 AdaptiveSportsProgram — Wave-18 invariants', () => {
  it('declares __invariants virtual path', () => {
    expect(MODEL_SRC).toMatch(/path\(['"]__invariants['"]\)\.validate/);
  });

  it('active requires startDate', () => {
    expect(MODEL_SRC).toMatch(
      /status\s*===\s*['"]active['"][\s\S]{0,200}invalidate\(\s*['"]startDate['"]/
    );
  });

  it('completed requires endDate', () => {
    expect(MODEL_SRC).toMatch(
      /status\s*===\s*['"]completed['"][\s\S]{0,200}invalidate\(\s*['"]endDate['"]/
    );
  });

  it('discontinued requires discontinuationReason', () => {
    expect(MODEL_SRC).toMatch(
      /status\s*===\s*['"]discontinued['"][\s\S]{0,300}invalidate\(\s*['"]discontinuationReason['"]/
    );
  });

  it('high physicalDemand requires medicalClearance when non-draft', () => {
    expect(MODEL_SRC).toMatch(
      /physicalDemand\s*===\s*['"]high['"][\s\S]{0,400}invalidate\(\s*\n?\s*['"]medicalClearance['"]/
    );
  });

  it('endDate must be ≥ startDate', () => {
    expect(MODEL_SRC).toMatch(/this\.endDate\s*<\s*this\.startDate/);
  });

  it('session integrity (date + durationMinutes)', () => {
    expect(MODEL_SRC).toMatch(/sessions\.\$\{i\}\.date/);
    expect(MODEL_SRC).toMatch(/sessions\.\$\{i\}\.durationMinutes/);
  });

  it('achievement integrity (title + earnedAt)', () => {
    expect(MODEL_SRC).toMatch(/achievements\.\$\{i\}\.title/);
    expect(MODEL_SRC).toMatch(/achievements\.\$\{i\}\.earnedAt/);
  });
});

describe('W362 AdaptiveSportsProgram — virtuals', () => {
  it('sessionCount + achievementCount + totalMinutesLogged', () => {
    expect(MODEL_SRC).toMatch(/virtual\(['"]sessionCount['"]\)/);
    expect(MODEL_SRC).toMatch(/virtual\(['"]achievementCount['"]\)/);
    expect(MODEL_SRC).toMatch(/virtual\(['"]totalMinutesLogged['"]\)/);
  });
});

describe('W362 adaptive-sports routes — endpoint surface', () => {
  const endpoints = [
    ['get', '/catalog'],
    ['get', '/'],
    ['get', '/by-beneficiary/:id'],
    ['get', '/by-sport/:sport'],
    ['get', '/stats'],
    ['get', '/:id'],
    ['post', '/'],
    ['post', '/:id/activate'],
    ['post', '/:id/complete'],
    ['post', '/:id/discontinue'],
    ['post', '/:id/sessions'],
    ['post', '/:id/achievements'],
    ['post', '/:id/medical-clearance'],
    ['patch', '/:id'],
    ['delete', '/:id/sessions/:sessionId'],
    ['delete', '/:id/achievements/:achId'],
    ['delete', '/:id'],
  ];

  for (const [verb, p] of endpoints) {
    it(`${verb.toUpperCase()} ${p}`, () => {
      const escaped = p.replace(/\//g, '\\/');
      const re = new RegExp(`router\\.${verb}\\(\\s*['"]${escaped}['"]`);
      expect(ROUTES_SRC).toMatch(re);
    });
  }

  it('authenticates via router.use(authenticateToken)', () => {
    expect(ROUTES_SRC).toMatch(/router\.use\(authenticateToken\)/);
  });

  it('activate blocks if high physical demand without clearance', () => {
    expect(ROUTES_SRC).toMatch(
      /physicalDemand\s*===\s*['"]high['"][\s\S]{0,300}!row\.medicalClearance/
    );
  });

  it('discontinue requires reason', () => {
    expect(ROUTES_SRC).toMatch(/reason\s*مطلوب/);
  });

  it('write set includes coach role', () => {
    expect(ROUTES_SRC).toMatch(/WRITE_ROLES\s*=\s*\[[\s\S]{0,400}['"]coach['"]/);
  });
});

describe('W362 features.registry.js mount', () => {
  it("loads via safeRequire('../routes/adaptive-sports.routes')", () => {
    expect(REGISTRY_SRC).toMatch(
      /adaptiveSportsRoutes\s*=\s*safeRequire\(['"]\.\.\/routes\/adaptive-sports\.routes['"]\)/
    );
  });

  it('mounts at /adaptive-sports via dualMountAuth', () => {
    expect(REGISTRY_SRC).toMatch(
      /dualMountAuth\(\s*app\s*,\s*['"]adaptive-sports['"]\s*,\s*adaptiveSportsRoutes\s*,\s*authenticate\s*\)/
    );
  });

  it('wave comment cites W362 + Arabic label', () => {
    expect(REGISTRY_SRC).toMatch(/Wave 362/);
    expect(REGISTRY_SRC).toMatch(/الرياضة التكيّفية/);
  });
});

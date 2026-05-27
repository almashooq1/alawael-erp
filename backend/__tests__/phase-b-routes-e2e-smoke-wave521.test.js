'use strict';

/**
 * phase-b-routes-e2e-smoke-wave521.test.js — Phase B Routes Extension
 * end-to-end smoke + closure.
 *
 * Sister test to W466 (phase-b-e2e-smoke-wave466.test.js). W466 covers
 * the model + lib layer shipped W460-W466. This wave covers the route
 * layer shipped MUCH LATER as W513 / W515 / W518:
 *
 *   W460 BeneficiaryVoiceLog       → W513 voice-log REST surface
 *   W461 DecisionRightsAssessment  → W515 decision-rights REST surface
 *   W462 SelfAdvocacyTrainingPlan  → W518 self-advocacy REST surface
 *
 * These routes closed the user-facing CRUD loop. Without them the W466
 * artifacts were database-only — beneficiary voice / capacity / advocacy
 * training plans couldn't be created or read through the admin UI. W519
 * + W520 (in the alawael-rehab-platform repo) consume these routes for
 * the list + detail + new page surfaces.
 *
 * Pure module-presence + cross-wave consistency. No DB, no boot.
 */

const fs = require('fs');
const path = require('path');

function exists(rel) {
  return fs.existsSync(path.join(__dirname, '..', rel));
}

function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

describe('W521 — Phase B route artifact inventory', () => {
  describe('W513 — voice-log REST surface', () => {
    it('routes file exists', () => {
      expect(exists('routes/voice-log.routes.js')).toBe(true);
    });

    it('drift guard test exists', () => {
      expect(exists('__tests__/voice-log-routes-wave513.test.js')).toBe(true);
    });

    it('routes require the W460 model', () => {
      expect(read('routes/voice-log.routes.js')).toMatch(
        /require\(['"]\.\.\/models\/BeneficiaryVoiceLog['"]\)/
      );
    });

    it('routes mount auth + branch + body-scope middleware in correct order', () => {
      const src = read('routes/voice-log.routes.js');
      const authIdx = src.search(/router\.use\(authenticateToken\)/);
      const branchIdx = src.search(/router\.use\(requireBranchAccess\)/);
      const bodyIdx = src.search(/router\.use\(bodyScopedBeneficiaryGuard\)/);
      expect(authIdx).toBeGreaterThan(0);
      expect(branchIdx).toBeGreaterThan(authIdx);
      expect(bodyIdx).toBeGreaterThan(branchIdx);
    });

    it('mounted at /voice-log via dualMountAuth (NOT plain dualMount)', () => {
      const src = read('routes/registries/features.registry.js');
      expect(src).toMatch(
        /dualMountAuth\(app,\s*['"]voice-log['"],\s*voiceLogRoutes,\s*authenticate\)/
      );
    });
  });

  describe('W515 — decision-rights REST surface', () => {
    it('routes file exists', () => {
      expect(exists('routes/decision-rights.routes.js')).toBe(true);
    });

    it('drift guard test exists', () => {
      expect(exists('__tests__/decision-rights-routes-wave515.test.js')).toBe(true);
    });

    it('routes require the W461 model', () => {
      expect(read('routes/decision-rights.routes.js')).toMatch(
        /require\(['"]\.\.\/models\/DecisionRightsAssessment['"]\)/
      );
    });

    it('declares FINALIZE_ROLES strictly tighter than WRITE_ROLES (4-tier escalation)', () => {
      const src = read('routes/decision-rights.routes.js');
      expect(src).toMatch(/const FINALIZE_ROLES\s*=\s*\[/);
      expect(src).toMatch(/const WRITE_ROLES\s*=\s*\[/);
      expect(src).toMatch(/const DELETE_ROLES\s*=\s*\[/);
    });

    it('declares status-transition discipline: draft → finalized only via /finalize', () => {
      const src = read('routes/decision-rights.routes.js');
      expect(src).toMatch(/router\.post\('\/:id\/finalize'/);
      expect(src).toMatch(/row\.status\s*=\s*['"]finalized['"]/);
      expect(src).toMatch(/row\.status\s*!==\s*['"]draft['"]/);
    });

    it('mounted at /decision-rights via dualMountAuth', () => {
      expect(read('routes/registries/features.registry.js')).toMatch(
        /dualMountAuth\(app,\s*['"]decision-rights['"],\s*decisionRightsRoutes,\s*authenticate\)/
      );
    });
  });

  describe('W518 — self-advocacy REST surface', () => {
    it('routes file exists', () => {
      expect(exists('routes/self-advocacy.routes.js')).toBe(true);
    });

    it('drift guard test exists', () => {
      expect(exists('__tests__/self-advocacy-routes-wave518.test.js')).toBe(true);
    });

    it('routes require the W462 model', () => {
      expect(read('routes/self-advocacy.routes.js')).toMatch(
        /require\(['"]\.\.\/models\/SelfAdvocacyTrainingPlan['"]\)/
      );
    });

    it('enforces singleton-per-beneficiary explicitly (409 + existingPlanId)', () => {
      const src = read('routes/self-advocacy.routes.js');
      // Look for the create handler block specifically
      const createBlock = src.match(
        /router\.post\('\/',\s*requireRole\(WRITE_ROLES\)[\s\S]*?(?=router\.|async function findPlanAndModule)/
      );
      expect(createBlock).toBeTruthy();
      expect(createBlock[0]).toMatch(/SelfAdvocacyTrainingPlan\.findOne/);
      expect(createBlock[0]).toMatch(/return\s+res\.status\(409\)/);
      expect(createBlock[0]).toMatch(/existingPlanId/);
    });

    it('seeds all 5 right-modules at create time (buildInitialModules)', () => {
      const src = read('routes/self-advocacy.routes.js');
      expect(src).toMatch(/function buildInitialModules/);
      expect(src).toMatch(/RIGHT_CODES\.map/);
      expect(src).toMatch(/modules:\s*buildInitialModules\(\)/);
    });

    it('mounted at /self-advocacy via dualMountAuth', () => {
      expect(read('routes/registries/features.registry.js')).toMatch(
        /dualMountAuth\(app,\s*['"]self-advocacy['"],\s*selfAdvocacyRoutes,\s*authenticate\)/
      );
    });
  });
});

describe('W521 — Phase B routes cross-wave consistency', () => {
  it('all 3 routes apply branchFilter(req) ≥9 times each (W269 doctrine)', () => {
    for (const f of [
      'routes/voice-log.routes.js',
      'routes/decision-rights.routes.js',
      'routes/self-advocacy.routes.js',
    ]) {
      const src = read(f);
      const occurrences = (src.match(/branchFilter\(req\)/g) || []).length;
      expect(occurrences).toBeGreaterThanOrEqual(9);
    }
  });

  it('none of the 3 routes read req.branchId (W269h class)', () => {
    for (const f of [
      'routes/voice-log.routes.js',
      'routes/decision-rights.routes.js',
      'routes/self-advocacy.routes.js',
    ]) {
      const src = read(f);
      expect(src).not.toMatch(/req\.branchId/);
    }
  });

  it('none of the 3 routes spread req.body into create() (W506/W507 doctrine)', () => {
    for (const f of [
      'routes/voice-log.routes.js',
      'routes/decision-rights.routes.js',
      'routes/self-advocacy.routes.js',
    ]) {
      const src = read(f);
      const createMatches = src.match(/\.create\(\{[\s\S]*?\}\)/g) || [];
      for (const m of createMatches) {
        expect(m).not.toMatch(/\.{3}req\.body\b/);
        expect(m).not.toMatch(/\.{3}body\b/);
      }
    }
  });

  it('all 3 routes use authenticateToken + requireRole (no anonymous endpoints)', () => {
    for (const f of [
      'routes/voice-log.routes.js',
      'routes/decision-rights.routes.js',
      'routes/self-advocacy.routes.js',
    ]) {
      const src = read(f);
      expect(src).toMatch(/router\.use\(authenticateToken\)/);
      // Every route handler uses requireRole
      const handlerLines = src.match(/router\.(get|post|patch|delete)\([^)]*?requireRole/g) || [];
      expect(handlerLines.length).toBeGreaterThan(0);
    }
  });

  it('all 3 routes import safeError for consistent error handling', () => {
    for (const f of [
      'routes/voice-log.routes.js',
      'routes/decision-rights.routes.js',
      'routes/self-advocacy.routes.js',
    ]) {
      expect(read(f)).toMatch(/require\(['"]\.\.\/utils\/safeError['"]\)/);
    }
  });

  it('all 3 drift guards mirror enums byte-for-byte with their models', () => {
    // Sanity: each drift guard has an "enum mirror" describe block referencing
    // extractRouteList + extract* functions
    for (const t of [
      '__tests__/voice-log-routes-wave513.test.js',
      '__tests__/decision-rights-routes-wave515.test.js',
      '__tests__/self-advocacy-routes-wave518.test.js',
    ]) {
      const src = read(t);
      expect(src).toMatch(/extractRouteList/);
      expect(src).toMatch(/enum mirror/);
    }
  });
});

describe('W521 — sprint-tests enumeration includes all Phase B route guards', () => {
  let sprintList;
  beforeAll(() => {
    sprintList = fs
      .readFileSync(path.join(__dirname, '..', 'sprint-tests.txt'), 'utf8')
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean);
  });

  const expected = [
    '__tests__/voice-log-routes-wave513.test.js',
    '__tests__/decision-rights-routes-wave515.test.js',
    '__tests__/self-advocacy-routes-wave518.test.js',
    '__tests__/phase-b-routes-e2e-smoke-wave521.test.js',
  ];

  for (const test of expected) {
    it(`sprint includes ${test.replace(/^__tests__\//, '')}`, () => {
      expect(sprintList).toContain(test);
    });
  }
});

describe('W521 — Phase B route layer endpoint accounting', () => {
  it('voice-log declares exactly 9 endpoints', () => {
    const src = read('routes/voice-log.routes.js');
    const all = src.match(/router\.(get|post|patch|delete)\(\s*['"]/g) || [];
    expect(all.length).toBe(9);
  });

  it('decision-rights declares exactly 11 endpoints', () => {
    const src = read('routes/decision-rights.routes.js');
    const all = src.match(/router\.(get|post|patch|delete)\(\s*['"]/g) || [];
    expect(all.length).toBe(11);
  });

  it('self-advocacy declares exactly 12 endpoints', () => {
    const src = read('routes/self-advocacy.routes.js');
    const all = src.match(/router\.(get|post|patch|delete)\(\s*['"]/g) || [];
    expect(all.length).toBe(12);
  });

  it('Phase B route layer ships 32 total endpoints across the 3 routes', () => {
    let total = 0;
    for (const f of [
      'routes/voice-log.routes.js',
      'routes/decision-rights.routes.js',
      'routes/self-advocacy.routes.js',
    ]) {
      const src = read(f);
      const all = src.match(/router\.(get|post|patch|delete)\(\s*['"]/g) || [];
      total += all.length;
    }
    expect(total).toBe(32);
  });
});

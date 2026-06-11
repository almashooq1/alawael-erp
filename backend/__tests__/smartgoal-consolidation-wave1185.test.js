'use strict';

/**
 * smartgoal-consolidation-wave1185.test.js — ADR-040 SmartGoal consolidation guard.
 *
 * Covers the consolidation tooling (scripts/consolidate-smartgoal.js):
 *   1. the PURE SmartGoal→TherapeuticGoal mapper + its refuse-to-fabricate
 *      contract (it must flag episodeId/type/target.value as missing-required,
 *      never invent them);
 *   2. the script is DRY-RUN by default + require.main-guarded + never drops a
 *      collection;
 *   3. SmartGoal is firmly @deprecated;
 *   4. a deprecation LOCK — only the 2 baselined write-callers may create
 *      SmartGoal; any NEW write-caller fails CI (ratchet, ADR-040 step 3).
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/smartgoal-consolidation-wave1185.test.js
 */

const fs = require('fs');
const path = require('path');
const {
  mapSmartGoalToTherapeutic,
  STATUS_MAP,
  CLINICAL_REQUIRED_ABSENT,
} = require('../scripts/consolidate-smartgoal');

const BACKEND = path.join(__dirname, '..');
const SCRIPT_SRC = fs.readFileSync(
  path.join(BACKEND, 'scripts', 'consolidate-smartgoal.js'),
  'utf-8'
);
const SMARTGOAL_SRC = fs.readFileSync(path.join(BACKEND, 'models', 'SmartGoal.js'), 'utf-8');

describe('SmartGoal consolidation (W1185) — pure mapper + refuse-to-fabricate', () => {
  test('maps the mechanically-safe fields (beneficiary, title, status, progress, branch, dates)', () => {
    const { mapped } = mapSmartGoalToTherapeutic({
      _id: 'sg1',
      beneficiary: 'b1',
      title: 'Walk 10m',
      status: 'paused',
      overallProgress: 40,
      branch: 'br1',
      timeBoundDate: '2026-09-01',
      specific: 'walk',
    });
    expect(mapped.beneficiaryId).toBe('b1');
    expect(mapped.title).toBe('Walk 10m');
    expect(mapped.status).toBe('deferred'); // paused → deferred
    expect(mapped.currentProgress).toBe(40);
    expect(mapped.branchId).toBe('br1');
    expect(mapped.specific).toBe('walk');
  });

  test('status map covers all SmartGoal statuses; unknown → draft', () => {
    expect(STATUS_MAP).toEqual({
      active: 'active',
      achieved: 'achieved',
      paused: 'deferred',
      cancelled: 'discontinued',
    });
    expect(
      mapSmartGoalToTherapeutic({ _id: 'x', beneficiary: 'b', status: 'weird' }).mapped.status
    ).toBe('draft');
  });

  test('ALWAYS flags the clinical-required fields TherapeuticGoal needs but SmartGoal lacks', () => {
    const { missingRequired } = mapSmartGoalToTherapeutic({
      _id: 'x',
      beneficiary: 'b',
      title: 't',
      status: 'active',
    });
    expect(CLINICAL_REQUIRED_ABSENT).toEqual(['episodeId', 'type', 'target.value']);
    for (const f of CLINICAL_REQUIRED_ABSENT) expect(missingRequired).toContain(f);
  });

  test('the mapper does NOT fabricate episodeId / type / target — they are absent from `mapped`', () => {
    const { mapped } = mapSmartGoalToTherapeutic({
      _id: 'x',
      beneficiary: 'b',
      title: 't',
      status: 'active',
    });
    expect(mapped.episodeId).toBeUndefined();
    expect(mapped.type).toBeUndefined();
    expect(mapped.target).toBeUndefined();
  });

  test('carries an idempotency marker (the source SmartGoal id) in tags', () => {
    const { mapped } = mapSmartGoalToTherapeutic({
      _id: 'sg99',
      beneficiary: 'b',
      status: 'active',
    });
    expect(mapped.tags).toContain('migrated-from-smartgoal');
    expect(mapped.tags).toContain('sg99');
  });

  test('null/undefined input is safe', () => {
    expect(mapSmartGoalToTherapeutic(null)).toEqual({ mapped: null, missingRequired: [] });
  });
});

describe('SmartGoal consolidation (W1185) — script safety', () => {
  test('DRY-RUN by default (--execute opt-in)', () => {
    expect(SCRIPT_SRC).toMatch(/const EXECUTE = process\.argv\.includes\('--execute'\)/);
  });
  test('refuses to fabricate even with --execute (no migration of non-empty without clinical fields)', () => {
    expect(SCRIPT_SRC).toMatch(/refusing to fabricate|will NOT fabricate/i);
  });
  test('does NOT drop collections (no destructive drop/deleteMany)', () => {
    expect(SCRIPT_SRC).not.toMatch(/\.(drop|deleteMany|deleteOne|collection\.drop)\(/);
  });
  test('require.main-guarded', () => {
    expect(SCRIPT_SRC).toMatch(/if \(require\.main === module\)/);
  });
});

describe('SmartGoal consolidation (W1185) — deprecation lock', () => {
  test('SmartGoal.js carries the @deprecated (ADR-040) marker', () => {
    expect(SMARTGOAL_SRC).toMatch(/@deprecated[\s\S]*ADR-040/);
  });

  // Ratchet: only these 2 files may CREATE SmartGoal (ADR-040 step 3). Adding a
  // new write-caller must fail here until ADR-040 is revisited.
  const BASELINE_WRITE_CALLERS = new Set([
    'routes/assessmentRecommendation.routes.js',
    'services/therapistPortal.service.js',
  ]);

  function scan(dir, acc) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === '__tests__' || e.name === 'archived') continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) scan(full, acc);
      else if (e.name.endsWith('.js')) acc.push(full);
    }
    return acc;
  }

  test('no NEW SmartGoal write-callers beyond the baselined 2', () => {
    const files = scan(BACKEND, []);
    // a "write" = `new SmartGoal(` or `SmartGoal.create(` / `.insertMany(` /
    // `.bulkWrite(` on a var assigned from mongoose.model('SmartGoal').
    const WRITE_RE = /new SmartGoal\s*\(|SmartGoal\.(?:create|insertMany|bulkWrite)\s*\(/;
    const offenders = [];
    for (const f of files) {
      const rel = path.relative(BACKEND, f).replace(/\\/g, '/');
      const src = fs.readFileSync(f, 'utf-8');
      if (WRITE_RE.test(src) && !BASELINE_WRITE_CALLERS.has(rel)) offenders.push(rel);
    }
    expect(offenders).toEqual([]);
  });
});

'use strict';

/**
 * W1204 drift guard — Blueprint 43 R3: golden-thread interface gate.
 *
 * Two layers:
 *  1. PURE — the enforcement lib's decision table (mode resolution, payload
 *     shape acceptance, gate evaluation, rejection envelope).
 *  2. STATIC — the three wired enforcement points keep calling the gate
 *     (goal create ×2 + session complete) and the 422 contract stays present.
 *
 * No DB, no HTTP — safe under jest.setup's mocked mongoose.
 */

const fs = require('fs');
const path = require('path');

const lib = require('../intelligence/golden-thread-enforcement.lib');

const BACKEND = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(BACKEND, rel), 'utf8');

describe('W1204 golden-thread enforcement lib (pure)', () => {
  describe('enforcementMode()', () => {
    test('defaults to off when unset', () => {
      expect(lib.enforcementMode({})).toBe('off');
    });
    test('reads warn / enforce, case-insensitive + trimmed', () => {
      expect(lib.enforcementMode({ GOLDEN_THREAD_ENFORCEMENT: 'warn' })).toBe('warn');
      expect(lib.enforcementMode({ GOLDEN_THREAD_ENFORCEMENT: ' ENFORCE ' })).toBe('enforce');
    });
    test('unknown values degrade to off (fail-safe, never brick writes)', () => {
      expect(lib.enforcementMode({ GOLDEN_THREAD_ENFORCEMENT: 'strict' })).toBe('off');
      expect(lib.enforcementMode({ GOLDEN_THREAD_ENFORCEMENT: '1' })).toBe('off');
    });
  });

  describe('countGoalMeasureLinks() — accepted payload shapes', () => {
    test('canonical objectives[].measureLinks[] (W235 shape)', () => {
      expect(
        lib.countGoalMeasureLinks({
          objectives: [{ measureLinks: [{ measureId: 'm1' }, { measureId: 'm2' }] }, {}],
        })
      ).toBe(2);
    });
    test('top-level linkedMeasures[] (W1090 Goal.js shape)', () => {
      expect(lib.countGoalMeasureLinks({ linkedMeasures: [{ measureId: 'm1' }] })).toBe(1);
    });
    test('flat measureLinks[] fallback', () => {
      expect(lib.countGoalMeasureLinks({ measureLinks: [{ measureId: 'm1' }] })).toBe(1);
    });
    test('entries without a measure id are NOT counted (refuse-to-fabricate)', () => {
      expect(lib.countGoalMeasureLinks({ linkedMeasures: [{ note: 'x' }, null, 'str'] })).toBe(0);
    });
    test('empty / malformed payloads count zero', () => {
      expect(lib.countGoalMeasureLinks(null)).toBe(0);
      expect(lib.countGoalMeasureLinks({})).toBe(0);
      expect(lib.countGoalMeasureLinks({ objectives: 'nope' })).toBe(0);
    });
  });

  describe('countSessionGoalRefs()', () => {
    test('counts goalProgress entries carrying goalId', () => {
      expect(
        lib.countSessionGoalRefs({ goalProgress: [{ goalId: 'g1' }, { rating: 3 }, null] })
      ).toBe(1);
    });
    test('missing goalProgress counts zero', () => {
      expect(lib.countSessionGoalRefs({})).toBe(0);
      expect(lib.countSessionGoalRefs(null)).toBe(0);
    });
  });

  describe('check + evaluateGate decision table', () => {
    const badGoal = {};
    const goodGoal = { linkedMeasures: [{ measureId: 'm1' }] };

    test('off mode → pass even on violation', () => {
      const gate = lib.evaluateGate(lib.checkGoalPayload(badGoal), {});
      expect(gate).toEqual({ action: 'pass', mode: 'off', violations: [] });
    });
    test('warn mode → warn with violations attached', () => {
      const gate = lib.evaluateGate(lib.checkGoalPayload(badGoal), {
        GOLDEN_THREAD_ENFORCEMENT: 'warn',
      });
      expect(gate.action).toBe('warn');
      expect(gate.violations).toHaveLength(1);
      expect(gate.violations[0].code).toBe('GOAL_WITHOUT_MEASURE');
    });
    test('enforce mode → reject', () => {
      const gate = lib.evaluateGate(lib.checkSessionCompletionPayload({}), {
        GOLDEN_THREAD_ENFORCEMENT: 'enforce',
      });
      expect(gate.action).toBe('reject');
      expect(gate.violations[0].code).toBe('SESSION_WITHOUT_GOAL');
    });
    test('enforce mode + valid payload → pass', () => {
      const gate = lib.evaluateGate(lib.checkGoalPayload(goodGoal), {
        GOLDEN_THREAD_ENFORCEMENT: 'enforce',
      });
      expect(gate.action).toBe('pass');
    });
    test('violations carry bilingual messages', () => {
      const { violations } = lib.checkGoalPayload(badGoal);
      expect(violations[0].messageAr).toMatch(/مقياس/);
      expect(violations[0].messageEn).toMatch(/measure/i);
    });
  });

  describe('rejectionEnvelope()', () => {
    test('stable 422 envelope shape', () => {
      const { violations } = lib.checkGoalPayload({});
      const env = lib.rejectionEnvelope(violations);
      expect(env.success).toBe(false);
      expect(env.code).toBe('GOLDEN_THREAD_VIOLATION');
      expect(env.violations).toBe(violations);
      expect(typeof env.message).toBe('string');
    });
  });
});

describe('W1204 static wiring — gate stays installed at the three enforcement points', () => {
  test('POST /goals (domains/goals) calls the gate + 422 contract', () => {
    const src = read('domains/goals/routes/goals.routes.js');
    expect(src).toMatch(/golden-thread-enforcement\.lib/);
    expect(src).toMatch(/checkGoalPayload\(req\.body\)/);
    expect(src).toMatch(/status\(422\)/);
    expect(src).toMatch(/rejectionEnvelope/);
  });

  test('care-plans-admin embedded goal create calls the gate + 422 contract', () => {
    const src = read('routes/care-plans-admin.routes.js');
    expect(src).toMatch(/golden-thread-enforcement\.lib/);
    expect(src).toMatch(/checkGoalPayload\(req\.body\)/);
    expect(src).toMatch(/status\(422\)/);
  });

  test('PUT /sessions/:id/complete calls the gate + 422 contract', () => {
    const src = read('domains/sessions/routes/sessions.routes.js');
    expect(src).toMatch(/golden-thread-enforcement\.lib/);
    expect(src).toMatch(/checkSessionCompletionPayload\(\s*req\.body\s*\)/);
    expect(src).toMatch(/status\(422\)/);
  });

  test('enforcement-status observability endpoint exists on golden-thread routes', () => {
    const src = read('domains/goals/routes/golden-thread.routes.js');
    expect(src).toMatch(/golden-thread\/enforcement-status/);
    expect(src).toMatch(/enforcementMode\(\)/);
  });

  test('gate is NOT wired at session scheduling (intake must keep working)', () => {
    const src = read('domains/sessions/routes/sessions.routes.js');
    // The schedule handler (validateCreateSession block) must not gate.
    const scheduleBlock = src.split('validateCreateSession')[2] || '';
    const beforeNextRoute = scheduleBlock.split('router.get')[0];
    expect(beforeNextRoute).not.toMatch(/checkSessionCompletionPayload/);
  });

  test('lib stays env-lazy (no top-level process.env read — Phase-27 doctrine)', () => {
    const src = read('intelligence/golden-thread-enforcement.lib.js');
    const topLevel = src.split('function enforcementMode')[0];
    expect(topLevel).not.toMatch(/process\.env\.GOLDEN_THREAD_ENFORCEMENT/);
  });
});

'use strict';

/**
 * golden-thread-next-actions-wave1158.test.js — pure guard for the Smart
 * Attention Queue derivation (deriveNextActions) in goldenThread.service.js.
 *
 * Turns each goal's golden-thread break-stage (W1156) into ONE concrete,
 * prioritized next-best-action — the blueprint §4.3 Smart Attention Queue seed,
 * deterministic ("الذكاء يقترح، الإنسان يقرّر"), no ML. Paired with the
 * behavioral counterpart `golden-thread-next-actions-behavioral-wave1158.test.js`.
 *
 * Pure logic — requiring the service must NOT open a DB connection.
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/golden-thread-next-actions-wave1158.test.js
 */

const { deriveNextActions } = require('../services/goldenThread.service');

const t = (goalId, threadStage, extra = {}) => ({
  goalId,
  title: `goal-${goalId}`,
  threadStage,
  sessionCount: 0,
  ...extra,
});

describe('golden-thread (W1158) — deriveNextActions (pure)', () => {
  test('exported without opening a DB connection', () => {
    expect(typeof deriveNextActions).toBe('function');
  });

  test('maps each break-stage to its canonical action code', () => {
    const actions = deriveNextActions({
      threads: [
        t('a', 'no_measure_link'),
        t('b', 'linked_no_baseline'),
        t('c', 'linked_no_outcome'),
      ],
    });
    const byGoal = Object.fromEntries(actions.map(a => [String(a.goalId), a.code]));
    expect(byGoal.a).toBe('LINK_MEASURE');
    expect(byGoal.b).toBe('CAPTURE_BASELINE');
    expect(byGoal.c).toBe('RECORD_PROGRESS');
  });

  test('sorts most-urgent first (LINK_MEASURE before CAPTURE_BASELINE before RECORD_PROGRESS)', () => {
    const actions = deriveNextActions({
      threads: [
        t('c', 'linked_no_outcome'),
        t('a', 'no_measure_link'),
        t('b', 'linked_no_baseline'),
      ],
    });
    expect(actions.map(a => a.code)).toEqual([
      'LINK_MEASURE',
      'CAPTURE_BASELINE',
      'RECORD_PROGRESS',
    ]);
    expect(actions.map(a => a.priority)).toEqual([1, 2, 3]);
  });

  test('a fully-complete goal WITH sessions yields NO action (on track)', () => {
    const actions = deriveNextActions({ threads: [t('x', 'complete', { sessionCount: 3 })] });
    expect(actions).toHaveLength(0);
  });

  test('a complete goal with ZERO sessions is flagged NO_SESSIONS (priority 4)', () => {
    const actions = deriveNextActions({ threads: [t('y', 'complete', { sessionCount: 0 })] });
    expect(actions).toHaveLength(1);
    expect(actions[0].code).toBe('NO_SESSIONS');
    expect(actions[0].priority).toBe(4);
  });

  test('every action carries goalId + a non-empty Arabic action string', () => {
    const actions = deriveNextActions({ threads: [t('a', 'no_measure_link')] });
    expect(actions[0].goalId).toBe('a');
    expect(typeof actions[0].action).toBe('string');
    expect(actions[0].action.length).toBeGreaterThan(10);
  });

  test('empty / undefined trace is safe', () => {
    expect(deriveNextActions({ threads: [] })).toEqual([]);
    expect(deriveNextActions()).toEqual([]);
  });
});

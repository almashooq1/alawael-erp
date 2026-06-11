'use strict';

/**
 * operations-health-wave1195.test.js — unit tests for the pure
 * `gradeOperationsHealth()` of the READ-ONLY unified Branch Operations Health
 * snapshot (scripts/operations-health.js).
 *
 * Pure logic — no DB. Requiring the script must NOT open a connection (the CLI
 * main() is guarded by `require.main === module`), so this is safe + fast.
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/operations-health-wave1195.test.js
 */

const { gradeOperationsHealth, HEALTH_GRADES } = require('../scripts/operations-health');

const thread = (complete, counts = {}) => ({
  total: counts.total || 10,
  percentages: { complete },
  counts,
});
const doc = (rate, scanned = 10, awaiting = 0) => ({
  completedScanned: scanned,
  documentedRate: rate,
  awaitingCount: awaiting,
});
const overdue = (total, breached = 0) => ({
  total,
  counts: { OVERDUE: total - breached, ESCALATED: 0, BREACHED: breached },
});

describe('operations-health — gradeOperationsHealth (pure)', () => {
  test('requiring the script exports the grader WITHOUT opening a DB connection', () => {
    expect(typeof gradeOperationsHealth).toBe('function');
    expect(HEALTH_GRADES).toEqual(['HEALTHY', 'WATCH', 'AT_RISK', 'NO_DATA']);
  });

  test('all dimensions empty → NO_DATA, composite null, no actions', () => {
    const r = gradeOperationsHealth({});
    expect(r.grade).toBe('NO_DATA');
    expect(r.composite).toBeNull();
    expect(r.actions).toEqual([]);
    expect(r.scores).toEqual({ thread: null, documentation: null });
  });

  test('strong thread + strong docs + no overdue → HEALTHY, high composite, zero actions', () => {
    const r = gradeOperationsHealth({
      thread: thread(90, { total: 10, complete: 9, no_measure_link: 1 }),
      documentation: doc(95, 20, 1),
      overdue: overdue(0),
      productivity: { therapistCount: 4 },
    });
    expect(r.grade).toBe('HEALTHY');
    expect(r.composite).toBe(93); // mean(90,95)=92.5 → round 93, no penalty
    expect(r.actions).toHaveLength(0);
    expect(r.productivity.therapistCount).toBe(4);
  });

  test('thread 50–79 → WATCH with a P2 golden_thread action', () => {
    const r = gradeOperationsHealth({
      thread: thread(70, { total: 10, complete: 7, no_measure_link: 3 }),
      documentation: doc(95),
    });
    expect(r.grade).toBe('WATCH');
    const a = r.actions.find(x => x.dimension === 'golden_thread');
    expect(a.priority).toBe('P2');
    expect(a.action).toMatch(/PRIMARY measure/);
  });

  test('thread < 50 → AT_RISK with a P1 action', () => {
    const r = gradeOperationsHealth({
      thread: thread(30, { total: 10, complete: 3, linked_no_baseline: 7 }),
      documentation: doc(95),
    });
    expect(r.grade).toBe('AT_RISK');
    const a = r.actions[0];
    expect(a.priority).toBe('P1');
    expect(a.dimension).toBe('golden_thread');
    expect(a.action).toMatch(/BASELINE/);
  });

  test('documentation < 60 → AT_RISK; 60–84 → WATCH', () => {
    const low = gradeOperationsHealth({ thread: thread(90), documentation: doc(50, 10, 5) });
    expect(low.grade).toBe('AT_RISK');
    expect(low.actions.find(a => a.dimension === 'documentation').priority).toBe('P1');

    const mid = gradeOperationsHealth({ thread: thread(90), documentation: doc(75, 10, 2) });
    expect(mid.grade).toBe('WATCH');
    expect(mid.actions.find(a => a.dimension === 'documentation').priority).toBe('P2');
  });

  test('any overdue → at least WATCH; BREACHED → AT_RISK + composite penalty', () => {
    const watch = gradeOperationsHealth({
      thread: thread(90),
      documentation: doc(95),
      overdue: overdue(2, 0),
    });
    expect(watch.grade).toBe('WATCH');

    const risk = gradeOperationsHealth({
      thread: thread(90),
      documentation: doc(95),
      overdue: overdue(3, 1),
    });
    expect(risk.grade).toBe('AT_RISK');
    // mean(90,95)=92.5; penalty=min(30, 1*10 + 3*2)=16 → 93-16=77
    expect(risk.composite).toBe(77);
    const oa = risk.actions.find(a => a.dimension === 'overdue_reports');
    expect(oa.priority).toBe('P1');
    expect(oa.action).toMatch(/1 BREACHED/);
  });

  test('a null-score dimension does NOT force AT_RISK (empty branch reads honestly)', () => {
    // no thread data, no docs data, but 1 overdue → WATCH (not AT_RISK)
    const r = gradeOperationsHealth({ overdue: overdue(1, 0) });
    expect(r.grade).toBe('WATCH');
    expect(r.scores.thread).toBeNull();
    expect(r.composite).toBeNull(); // no scored dimension → no composite
  });

  test('worst-stage selection picks the highest-count broken stage for the action', () => {
    const r = gradeOperationsHealth({
      thread: thread(40, {
        total: 10,
        complete: 4,
        no_measure_link: 1,
        linked_no_baseline: 1,
        linked_no_outcome: 4,
      }),
    });
    expect(r.actions[0].action).toMatch(/PROGRESS to close the outcome loop/);
  });

  test('actions are ordered P1 before P2', () => {
    const r = gradeOperationsHealth({
      thread: thread(70, { total: 10, complete: 7, no_measure_link: 3 }), // P2
      documentation: doc(50, 10, 5), // P1
      overdue: overdue(1, 0), // P2
    });
    expect(r.actions[0].priority).toBe('P1');
    expect(r.actions[r.actions.length - 1].priority).toBe('P2');
  });
});

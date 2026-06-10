'use strict';

/**
 * golden-thread-service-wave1156.test.js — static + pure guard for the
 * READ-ONLY golden-thread traversal service (services/goldenThread.service.js).
 *
 * The service is the FIRST consumer of the reverse-traversal indexes added in
 * W1149 (session→goal) + W1151 (goal→assessment) + W1154 (goal→plan / IEP→canonical).
 * It assembles the connected clinical graph for one beneficiary. This guard
 * covers the pure `assembleThread()` graph-builder (no DB) + the wiring of the
 * service as the `goldenThread` widget on the 360 dashboard.
 *
 * Paired with the behavioral counterpart `golden-thread-service-behavioral-wave1156.test.js`.
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/golden-thread-service-wave1156.test.js
 */

const fs = require('fs');
const path = require('path');
const { assembleThread, THREAD_STAGES } = require('../services/goldenThread.service');

describe('golden-thread service (W1156) — assembleThread (pure graph-builder)', () => {
  test('requiring the service exports the pure assembler WITHOUT opening a DB connection', () => {
    expect(typeof assembleThread).toBe('function');
    expect(THREAD_STAGES).toContain('complete');
  });

  test('connects a goal to its measures, sessions, and source assessment', () => {
    const goalId = 'g1';
    const appId = 'app1';
    const { threads, summary } = assembleThread({
      goals: [
        {
          _id: goalId,
          title: 'Walk 10m',
          status: 'active',
          currentProgress: 40,
          baseline: { value: 5 },
          objectives: [
            { measureLinks: [{ measureId: 'm1', measureCode: 'GMFM', linkType: 'PRIMARY' }] },
          ],
          measureApplicationId: appId,
        },
      ],
      sessionsByGoalId: {
        g1: [
          { _id: 's1', status: 'completed' },
          { _id: 's2', status: 'completed' },
        ],
      },
      applicationsById: { app1: { _id: appId, measureId: 'm1' } },
    });
    expect(threads).toHaveLength(1);
    const t = threads[0];
    expect(t.measureLinks).toHaveLength(1);
    expect(t.sessionCount).toBe(2);
    expect(t.sourceAssessment._id).toBe(appId);
    expect(t.threadStage).toBe('complete');
    expect(summary).toMatchObject({
      goalCount: 1,
      completeCount: 1,
      sessionLinkedCount: 1,
      assessmentDerivedCount: 1,
    });
  });

  test('classifies break-stages: no measure / no baseline / no outcome / complete', () => {
    const { threads } = assembleThread({
      goals: [
        { _id: 'a', objectives: [] }, // no measure
        { _id: 'b', objectives: [{ measureLinks: [{ measureId: 'm', linkType: 'PRIMARY' }] }] }, // linked, no baseline
        {
          _id: 'c',
          baseline: { value: 1 },
          objectives: [{ measureLinks: [{ measureId: 'm', linkType: 'PRIMARY' }] }],
        }, // linked + baseline, no outcome
        {
          _id: 'd',
          baseline: { value: 1 },
          currentProgress: 30,
          objectives: [{ measureLinks: [{ measureId: 'm', linkType: 'PRIMARY' }] }],
        }, // complete
      ],
    });
    expect(threads.map(t => t.threadStage)).toEqual([
      'no_measure_link',
      'linked_no_baseline',
      'linked_no_outcome',
      'complete',
    ]);
  });

  test('an unlinked measureLink does not count; an unresolved assessment is flagged', () => {
    const { threads } = assembleThread({
      goals: [
        {
          _id: 'g',
          objectives: [
            { measureLinks: [{ measureId: 'm', status: 'unlinked', linkType: 'PRIMARY' }] },
          ],
          measureApplicationId: 'missing-app',
        },
      ],
      applicationsById: {}, // app not found
    });
    expect(threads[0].measureLinks).toHaveLength(0);
    expect(threads[0].threadStage).toBe('no_measure_link');
    expect(threads[0].sourceAssessment).toEqual({ _id: 'missing-app', resolved: false });
  });

  test('empty / undefined input is safe', () => {
    expect(assembleThread().threads).toEqual([]);
    expect(assembleThread().summary.goalCount).toBe(0);
  });
});

describe('golden-thread service (W1156) — wired as the 360 `goldenThread` widget', () => {
  const SVC = fs.readFileSync(
    path.join(__dirname, '..', 'domains', 'core', 'services', 'beneficiary360.service.js'),
    'utf-8'
  );
  test('beneficiary360 requires the golden-thread service', () => {
    expect(SVC).toMatch(
      /require\(\s*['"]\.\.\/\.\.\/\.\.\/services\/goldenThread\.service['"]\s*\)/
    );
  });
  test('goldenThread is registered as a widget (allWidgets + builders)', () => {
    expect(SVC).toMatch(/'goldenThread'/);
    expect(SVC).toMatch(/goldenThread:\s*\(\)\s*=>\s*goldenThreadService\.traceByBeneficiary/);
  });
});

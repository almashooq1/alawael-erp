'use strict';

/**
 * hr-workflow-scheduler.test.js — Phase 30 follow-up.
 *
 * Unit coverage for the cron wrapper around hrWorkflowEngine. The
 * scheduler itself is a thin lifecycle layer — the engine is mocked
 * here so we can exercise:
 *
 *   - constructor refuses to start without an engine
 *   - runOnce() succeeds and records a summary
 *   - runOnce() concurrent re-entry is suppressed
 *   - runOnce() failure populates lastRunSummary with error
 *   - start() refuses without a cron dependency
 *   - start() then stop() lifecycle works
 *   - lastRunSummary returns the expected shape
 */

const { createHrWorkflowScheduler } = require('../services/hr/hrWorkflowScheduler');

function silentLogger() {
  return { info() {}, warn() {}, error() {}, debug() {} };
}

function makeEngine(impl) {
  return { run: impl };
}

function makeFakeCron() {
  const tasks = [];
  return {
    tasks,
    schedule(expression, fn) {
      const task = {
        expression,
        fn,
        stopped: false,
        stop() {
          this.stopped = true;
        },
      };
      tasks.push(task);
      return task;
    },
  };
}

describe('hrWorkflowScheduler', () => {
  test('throws when engine is missing or lacks run()', () => {
    expect(() => createHrWorkflowScheduler({ logger: silentLogger() })).toThrow(/engine with run/);
    expect(() => createHrWorkflowScheduler({ engine: {}, logger: silentLogger() })).toThrow(
      /engine with run/
    );
  });

  test('runOnce reports per-rule findings and totals', async () => {
    const engine = makeEngine(async () => ({
      ranAt: new Date().toISOString(),
      summary: [
        { ruleId: 'rule-a', findings: [{ severity: 'medium' }, { severity: 'high' }], fired: 2 },
        { ruleId: 'rule-b', findings: [], fired: 0 },
        { ruleId: 'rule-c', skipped: 'disabled', findings: [] },
      ],
    }));
    const sched = createHrWorkflowScheduler({ engine, logger: silentLogger() });
    const result = await sched.runOnce();
    expect(result.totalFindings).toBe(2);
    expect(result.totalFired).toBe(2);
    expect(result.rulesEvaluated).toBe(3);
    expect(result.perRule).toHaveLength(3);
    expect(result.perRule.find(r => r.ruleId === 'rule-c').skipped).toBe('disabled');
    expect(sched.getLastRunSummary()).toEqual(result);
  });

  test('concurrent runOnce is suppressed — only one in flight', async () => {
    let resolveFirst;
    const firstRun = new Promise(resolve => {
      resolveFirst = resolve;
    });
    const engine = makeEngine(async () => {
      await firstRun;
      return { ranAt: new Date().toISOString(), summary: [] };
    });
    const sched = createHrWorkflowScheduler({ engine, logger: silentLogger() });

    const p1 = sched.runOnce();
    const p2 = sched.runOnce();
    resolveFirst();
    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).not.toBeNull();
    expect(r2).toBeNull(); // second call short-circuited
  });

  test('engine failure stores error and re-throws', async () => {
    const engine = makeEngine(async () => {
      throw new Error('mongo down');
    });
    const sched = createHrWorkflowScheduler({ engine, logger: silentLogger() });
    await expect(sched.runOnce()).rejects.toThrow(/mongo down/);
    const last = sched.getLastRunSummary();
    expect(last.error).toMatch(/mongo down/);
  });

  test('start() refuses without a cron dep', () => {
    const sched = createHrWorkflowScheduler({
      engine: makeEngine(async () => ({ summary: [] })),
      logger: silentLogger(),
    });
    expect(() => sched.start()).toThrow(/cron dep/);
  });

  test('start/stop lifecycle wires and unwires the cron task', () => {
    const cron = makeFakeCron();
    const sched = createHrWorkflowScheduler({
      engine: makeEngine(async () => ({ summary: [] })),
      cron,
      logger: silentLogger(),
    });
    const task = sched.start({ expression: '*/5 * * * *' });
    expect(cron.tasks).toHaveLength(1);
    expect(cron.tasks[0].expression).toBe('*/5 * * * *');
    expect(task).toBe(cron.tasks[0]);

    // Second start is a no-op
    const again = sched.start();
    expect(again).toBe(task);
    expect(cron.tasks).toHaveLength(1);

    sched.stop();
    expect(task.stopped).toBe(true);

    // After stop, start again should work
    const fresh = sched.start();
    expect(fresh).not.toBe(task);
    expect(cron.tasks).toHaveLength(2);
  });

  test('cron tick invokes the engine via runOnce', async () => {
    let called = 0;
    const cron = makeFakeCron();
    const engine = makeEngine(async () => {
      called += 1;
      return { summary: [] };
    });
    const sched = createHrWorkflowScheduler({ engine, cron, logger: silentLogger() });
    sched.start();
    await cron.tasks[0].fn();
    expect(called).toBe(1);
  });
});

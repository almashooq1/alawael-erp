/**
 * engine-wave12.test.js — Wave 12.
 *
 * Verifies the three new behaviors layered onto AlertsEngine.runAll():
 *
 *   1. Cooldown — a freshly-resolved (ruleId, key) pair held back for
 *      `cooldownMin` minutes before it can raise again.
 *   2. Dependency suppression — when rule X is active, rules listing
 *      X in `suppressIf` skip the raise; surface in `result.suppressed`.
 *   3. Re-open detection — past-cooldown re-detection of a previously
 *      resolved (ruleId, key) surfaces in `result.reopened` alongside
 *      the raise.
 *
 * Backward compat: the engine without `getRecentResolve` callback must
 * behave exactly as Phase 11 (existing 254 tests).
 */

'use strict';

const { AlertsEngine } = require('../alerts/engine');

// ─── Helpers ─────────────────────────────────────────────────────
function buildRule({
  id,
  severity = 'warning',
  category = 'operational',
  findings = [],
  ...extra
}) {
  return {
    id,
    severity,
    category,
    description: `rule ${id}`,
    async evaluate() {
      return findings;
    },
    ...extra,
  };
}

function findingOf(key, extra = {}) {
  return { key, message: `${key} found`, ...extra };
}

// ─── Backward compatibility ──────────────────────────────────────
describe('engine.runAll — backward compatibility (no ctx callbacks)', () => {
  test('without getRecentResolve, behaves exactly as Phase 11', async () => {
    const eng = new AlertsEngine();
    eng.register(buildRule({ id: 'r', findings: [findingOf('k1'), findingOf('k2')] }));

    const first = await eng.runAll({});
    expect(first.raised).toHaveLength(2);
    // The new arrays exist and are empty.
    expect(first.reopened).toEqual([]);
    expect(first.suppressed).toEqual([]);
    expect(first.cooledDown).toEqual([]);
  });

  test('dedup still suppresses the second tick', async () => {
    const eng = new AlertsEngine();
    eng.register(buildRule({ id: 'r', findings: [findingOf('k1')] }));
    await eng.runAll({});
    const second = await eng.runAll({});
    expect(second.raised).toHaveLength(0);
    expect(second.activeCount).toBe(1);
  });
});

// ─── Cooldown ────────────────────────────────────────────────────
describe('engine.runAll — cooldown', () => {
  test('holds raise back when within cooldown window', async () => {
    const T0 = new Date('2026-05-16T08:00:00Z');
    const T1 = new Date('2026-05-16T08:30:00Z'); // 30min later
    const eng = new AlertsEngine({ now: () => T1 });

    eng.register(
      buildRule({
        id: 'r-cool',
        severity: 'warning',
        cooldownMin: 60, // 60-minute cooldown
        findings: [findingOf('k1')],
      })
    );

    const result = await eng.runAll({
      getRecentResolve: async () => ({ resolvedAt: T0 }),
    });

    expect(result.raised).toHaveLength(0);
    expect(result.cooledDown).toHaveLength(1);
    expect(result.cooledDown[0]).toMatchObject({
      ruleId: 'r-cool',
      key: 'k1',
    });
  });

  test('raises after cooldown expires + flags as reopened', async () => {
    const T0 = new Date('2026-05-16T08:00:00Z');
    const T2 = new Date('2026-05-16T09:30:00Z'); // 90min later, past 60min cooldown
    const eng = new AlertsEngine({ now: () => T2 });

    eng.register(
      buildRule({
        id: 'r-cool',
        severity: 'warning',
        cooldownMin: 60,
        findings: [findingOf('k1')],
      })
    );

    const result = await eng.runAll({
      getRecentResolve: async () => ({ resolvedAt: T0 }),
    });

    expect(result.raised).toHaveLength(1);
    expect(result.reopened).toHaveLength(1);
    expect(result.reopened[0]).toMatchObject({
      ruleId: 'r-cool',
      key: 'k1',
      previousResolvedAt: T0,
    });
    expect(result.cooledDown).toEqual([]);
  });

  test('cooldownMin=0 (critical default) always re-raises immediately', async () => {
    const T0 = new Date('2026-05-16T08:00:00Z');
    const T1 = new Date('2026-05-16T08:00:01Z'); // 1 second later
    const eng = new AlertsEngine({ now: () => T1 });

    eng.register(
      buildRule({
        id: 'r-crit',
        severity: 'critical', // default cooldown 0
        findings: [findingOf('k1')],
      })
    );

    const result = await eng.runAll({
      getRecentResolve: async () => ({ resolvedAt: T0 }),
    });

    expect(result.raised).toHaveLength(1);
    expect(result.cooledDown).toEqual([]);
    // No previousResolvedAt → cooldownMin=0 → no reopen tracking
    expect(result.reopened).toHaveLength(1); // still flagged as reopen
  });

  test('getRecentResolve throwing degrades gracefully (no exception)', async () => {
    const eng = new AlertsEngine();
    eng.register(buildRule({ id: 'r', findings: [findingOf('k1')] }));
    const result = await eng.runAll({
      getRecentResolve: async () => {
        throw new Error('mongo down');
      },
    });
    // Engine ignores the error, treats as no recent resolve → raises.
    expect(result.raised).toHaveLength(1);
  });

  test('null/undefined response from getRecentResolve treats as fresh raise', async () => {
    const eng = new AlertsEngine();
    eng.register(buildRule({ id: 'r', findings: [findingOf('k1')] }));
    const result = await eng.runAll({
      getRecentResolve: async () => null,
    });
    expect(result.raised).toHaveLength(1);
    expect(result.reopened).toEqual([]);
  });
});

// ─── Dependency suppression ──────────────────────────────────────
describe('engine.runAll — dependency suppression', () => {
  test('suppresses rule B when its suppressIf:[A] is active', async () => {
    const eng = new AlertsEngine();
    eng.register(buildRule({ id: 'A', findings: [findingOf('k1')] }));
    eng.register(
      buildRule({
        id: 'B',
        findings: [findingOf('k1')], // same entity
        suppressIf: ['A'],
      })
    );

    const result = await eng.runAll({});

    const aRaised = result.raised.filter(r => r.ruleId === 'A');
    const bRaised = result.raised.filter(r => r.ruleId === 'B');
    expect(aRaised).toHaveLength(1);
    expect(bRaised).toHaveLength(0);
    expect(result.suppressed).toHaveLength(1);
    expect(result.suppressed[0]).toMatchObject({
      ruleId: 'B',
      suppressedBy: ['A'],
    });
  });

  test('B raises normally when A is NOT active', async () => {
    const eng = new AlertsEngine();
    eng.register(buildRule({ id: 'A', findings: [] }));
    eng.register(buildRule({ id: 'B', findings: [findingOf('k1')], suppressIf: ['A'] }));

    const result = await eng.runAll({});

    expect(result.raised.filter(r => r.ruleId === 'B')).toHaveLength(1);
    expect(result.suppressed).toEqual([]);
  });

  test('suppression honors in-flight active alerts from previous ticks', async () => {
    const eng = new AlertsEngine();
    eng.register(buildRule({ id: 'A', findings: [findingOf('k1')] }));
    eng.register(buildRule({ id: 'B', findings: [], suppressIf: ['A'] }));

    // Tick 1: A raises, B has no findings.
    await eng.runAll({});

    // Tick 2: A no longer reports, B starts reporting. Because A is
    // still in activeAlerts (auto-resolve happens at end-of-tick),
    // B is suppressed *this* tick — by design, since the dependency
    // relationship doesn't know that A is about to disappear.
    eng.rules.get('A').evaluate = async () => [];
    eng.rules.get('B').evaluate = async () => [findingOf('k1')];

    const tick2 = await eng.runAll({});
    expect(tick2.raised.filter(r => r.ruleId === 'B')).toHaveLength(0);
    expect(tick2.suppressed.filter(s => s.ruleId === 'B')).toHaveLength(1);
    expect(tick2.resolved.filter(r => r.compoundKey === 'A::k1')).toHaveLength(1);

    // Tick 3: A is now gone from activeAlerts, B can raise cleanly.
    const tick3 = await eng.runAll({});
    expect(tick3.raised.filter(r => r.ruleId === 'B')).toHaveLength(1);
    expect(tick3.suppressed).toEqual([]);
  });

  test('multiple suppressors are listed in the suppression report', async () => {
    const eng = new AlertsEngine();
    eng.register(buildRule({ id: 'A1', findings: [findingOf('a')] }));
    eng.register(buildRule({ id: 'A2', findings: [findingOf('b')] }));
    eng.register(buildRule({ id: 'B', findings: [findingOf('k1')], suppressIf: ['A1', 'A2'] }));

    const result = await eng.runAll({});

    expect(result.raised.filter(r => r.ruleId === 'B')).toHaveLength(0);
    expect(result.suppressed[0].suppressedBy).toEqual(['A1', 'A2']);
  });
});

// ─── Combined cooldown + suppression ─────────────────────────────
describe('engine.runAll — cooldown + suppression interaction', () => {
  test('suppression takes precedence over cooldown', async () => {
    // If both apply, the finding still surfaces only in `suppressed` —
    // a clear single explanation for why it didn't raise.
    const T0 = new Date('2026-05-16T08:00:00Z');
    const T1 = new Date('2026-05-16T08:10:00Z'); // within 60min cooldown
    const eng = new AlertsEngine({ now: () => T1 });

    eng.register(buildRule({ id: 'A', findings: [findingOf('a')] }));
    eng.register(
      buildRule({
        id: 'B',
        severity: 'warning',
        cooldownMin: 60,
        findings: [findingOf('k1')],
        suppressIf: ['A'],
      })
    );

    const result = await eng.runAll({
      getRecentResolve: async ruleId => (ruleId === 'B' ? { resolvedAt: T0 } : null),
    });

    expect(result.raised.filter(r => r.ruleId === 'B')).toHaveLength(0);
    expect(result.suppressed.filter(s => s.ruleId === 'B')).toHaveLength(1);
    expect(result.cooledDown.filter(c => c.ruleId === 'B')).toHaveLength(0);
  });
});

// ─── Auto-resolve still works ─────────────────────────────────────
describe('engine.runAll — auto-resolve preserved', () => {
  test('alerts not seen this tick are auto-resolved (Wave 12 doesnt break this)', async () => {
    const eng = new AlertsEngine();
    eng.register(buildRule({ id: 'r', findings: [findingOf('k1')] }));
    const first = await eng.runAll({});
    expect(first.raised).toHaveLength(1);

    eng.rules.get('r').evaluate = async () => [];
    const second = await eng.runAll({});
    expect(second.resolved).toHaveLength(1);
    expect(second.resolved[0].compoundKey).toBe('r::k1');
    expect(second.activeCount).toBe(0);
  });
});

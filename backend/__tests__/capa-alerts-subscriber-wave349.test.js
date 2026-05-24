'use strict';

/**
 * W349 — CAPA alerts subscriber drift guard.
 *
 * Tests the subscriber against a stub bus so we don't depend on the real
 * QualityEventBus (which is fine to load, but using a stub keeps the test
 * focused). Also asserts source-shape invariants on capaBootstrap to
 * verify the getDefault() wiring + the subscriber mount.
 */

const fs = require('fs');
const path = require('path');

const {
  wireCapaAlerts,
  DOWNSTREAM_EVENT,
} = require('../services/quality/capa-alerts-subscriber.service');

const BOOTSTRAP_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'startup', 'capaBootstrap.js'),
  'utf8'
);

function makeStubBus() {
  const listeners = new Map();
  const emitted = [];
  return {
    listeners,
    emitted,
    on(pattern, fn) {
      if (!listeners.has(pattern)) listeners.set(pattern, new Set());
      listeners.get(pattern).add(fn);
      return () => listeners.get(pattern).delete(fn);
    },
    async emit(name, payload) {
      emitted.push({ name, payload });
      const fns = listeners.get(name) || new Set();
      for (const fn of fns) await fn(payload);
    },
  };
}

function makeNoopLogger() {
  return { warn: () => {}, info: () => {}, error: () => {} };
}

describe('W349 — wireCapaAlerts contract', () => {
  it('exports wireCapaAlerts factory + DOWNSTREAM_EVENT constant', () => {
    expect(typeof wireCapaAlerts).toBe('function');
    expect(DOWNSTREAM_EVENT).toBe('notification.capa.overdue.alert');
  });

  it('rejects when bus is missing or lacks .on()', () => {
    expect(() => wireCapaAlerts({})).toThrow(/bus with \.on/);
    expect(() => wireCapaAlerts({ bus: {} })).toThrow(/bus with \.on/);
  });

  it('returns { unsubscribe, downstreamEvent } shape', () => {
    const bus = makeStubBus();
    const wired = wireCapaAlerts({ bus, logger: makeNoopLogger() });
    expect(typeof wired.unsubscribe).toBe('function');
    expect(wired.downstreamEvent).toBe('notification.capa.overdue.alert');
  });

  it('subscribes exactly to "quality.capa.overdue" (not a wildcard)', () => {
    const bus = makeStubBus();
    wireCapaAlerts({ bus, logger: makeNoopLogger() });
    expect(bus.listeners.has('quality.capa.overdue')).toBe(true);
    expect([...bus.listeners.keys()]).toEqual(['quality.capa.overdue']);
  });
});

describe('W349 — event handling + downstream emission', () => {
  it('emits notification.capa.overdue.alert with normalized payload on overdue event', async () => {
    const bus = makeStubBus();
    wireCapaAlerts({ bus, logger: makeNoopLogger() });
    await bus.emit('quality.capa.overdue', {
      capaId: 'capa-1',
      capaNumber: 'CAPA-2026-0042',
      status: 'IN_PROGRESS',
      ownerUserId: 'user-1',
      branchId: 'branch-1',
      daysOverdue: 12,
      dueDate: '2026-05-12',
    });
    // 2 emits total: the source quality.capa.overdue + the downstream notification.capa.overdue.alert
    expect(bus.emitted).toHaveLength(2);
    expect(bus.emitted[1].name).toBe('notification.capa.overdue.alert');
    expect(bus.emitted[1].payload).toMatchObject({
      source: 'quality.capa.overdue',
      capaId: 'capa-1',
      capaNumber: 'CAPA-2026-0042',
      status: 'IN_PROGRESS',
      ownerUserId: 'user-1',
      branchId: 'branch-1',
      daysOverdue: 12,
      severity: 'warning',
    });
    expect(bus.emitted[1].payload.detectedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('severity mapping: <7d→info, 7-29d→warning, ≥30d→critical, unknown→warning', async () => {
    const bus = makeStubBus();
    wireCapaAlerts({ bus, logger: makeNoopLogger() });
    for (const [days, expected] of [
      [0, 'info'],
      [3, 'info'],
      [7, 'warning'],
      [15, 'warning'],
      [29, 'warning'],
      [30, 'critical'],
      [120, 'critical'],
    ]) {
      bus.emitted.length = 0;
      await bus.emit('quality.capa.overdue', {
        capaNumber: 'X',
        daysOverdue: days,
      });
      const downstream = bus.emitted.find(e => e.name === 'notification.capa.overdue.alert');
      expect(downstream.payload.severity).toBe(expected);
    }
    // Unknown / non-finite daysOverdue defaults to warning
    bus.emitted.length = 0;
    await bus.emit('quality.capa.overdue', { capaNumber: 'X', daysOverdue: 'oops' });
    const fallback = bus.emitted.find(e => e.name === 'notification.capa.overdue.alert');
    expect(fallback.payload.severity).toBe('warning');
  });

  it('handles missing payload fields gracefully (all nullable)', async () => {
    const bus = makeStubBus();
    wireCapaAlerts({ bus, logger: makeNoopLogger() });
    await bus.emit('quality.capa.overdue', {});
    const downstream = bus.emitted.find(e => e.name === 'notification.capa.overdue.alert');
    expect(downstream.payload.capaId).toBeNull();
    expect(downstream.payload.daysOverdue).toBeNull();
    expect(downstream.payload.severity).toBe('warning');
  });

  it('thrown downstream emit does NOT break the subscriber', async () => {
    const bus = makeStubBus();
    let logged = '';
    const logger = {
      warn: () => {},
      info: () => {},
      error: msg => {
        logged = msg;
      },
    };
    const downstreamEmit = async () => {
      throw new Error('simulated downstream failure');
    };
    wireCapaAlerts({ bus, logger, downstreamEmit });
    await expect(
      bus.emit('quality.capa.overdue', { capaNumber: 'CAPA-2026-0001' })
    ).resolves.not.toThrow();
    expect(logged).toMatch(/downstream emit failed for CAPA-2026-0001/);
  });

  it('uses custom downstreamEmit when provided (skips bus.emit)', async () => {
    const bus = makeStubBus();
    const customEmits = [];
    const downstreamEmit = (name, payload) => {
      customEmits.push({ name, payload });
    };
    wireCapaAlerts({ bus, logger: makeNoopLogger(), downstreamEmit });
    await bus.emit('quality.capa.overdue', { capaNumber: 'X', daysOverdue: 5 });
    expect(customEmits).toHaveLength(1);
    expect(customEmits[0].name).toBe('notification.capa.overdue.alert');
    // The downstream alert should NOT have gone to bus.emit (since we overrode emitter)
    const downstreamOnBus = bus.emitted.find(e => e.name === 'notification.capa.overdue.alert');
    expect(downstreamOnBus).toBeUndefined();
  });
});

describe('W349 — capaBootstrap wiring source-shape', () => {
  it('reads bus via busModule.getDefault() (not .emit / .default.emit)', () => {
    expect(BOOTSTRAP_SRC).toMatch(/busModule\.getDefault\s*===\s*['"]function['"]/);
    expect(BOOTSTRAP_SRC).toMatch(/busInstance\s*=\s*busModule\.getDefault\(\)/);
  });

  it('emitEvent closure binds busInstance.emit (the singleton instance method)', () => {
    expect(BOOTSTRAP_SRC).toMatch(/emitEvent\s*=\s*\(name,\s*payload\)\s*=>\s*busInstance\.emit/);
  });

  it('wires capa-alerts-subscriber when busInstance is available', () => {
    expect(BOOTSTRAP_SRC).toMatch(
      /require\(\s*['"]\.\.\/services\/quality\/capa-alerts-subscriber\.service['"]\s*\)/
    );
    expect(BOOTSTRAP_SRC).toMatch(/wireCapaAlerts\(\s*\{\s*bus:\s*busInstance/);
  });

  it('attaches subscriber to app._capaAlertsSubscriber for inspectability', () => {
    expect(BOOTSTRAP_SRC).toMatch(/app\._capaAlertsSubscriber\s*=\s*wired/);
  });

  it('logs the downstream event name on successful wire', () => {
    expect(BOOTSTRAP_SRC).toMatch(/wired\.downstreamEvent/);
  });

  it('logs DISABLED when bus not loaded (degrades gracefully)', () => {
    expect(BOOTSTRAP_SRC).toMatch(/CAPA alerts subscriber DISABLED.*qualityEventBus not loaded/);
  });
});

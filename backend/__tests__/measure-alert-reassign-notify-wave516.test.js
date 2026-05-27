'use strict';

/**
 * measure-alert-reassign-notify-wave516.test.js — Wave 516.
 *
 * Drift guard for services/measure-alert-reassign-notify.service.js. Pure
 * unit tests with a stub bus — no Mongoose needed (the subscriber only
 * touches the event bus + logger).
 *
 * Covers:
 *   - Subscribes to medical.measure_alert.reassigned
 *   - Emits downstream notification.measure_alert.reassigned.alert with
 *     normalized payload on every valid event
 *   - Skips malformed events (missing alertId / from / to) with a log warn
 *   - Per-event try/catch: thrown downstream handler doesn't break the bus
 *   - Stats counter tracks received / notified / skipped / errored
 *   - throws on missing integrationBus
 *   - _normalizePayload includes recipients[] = [fromTherapistId, toTherapistId]
 *   - _severityFor coerces missing/unknown to 'info' but preserves canonical levels
 */

const service = require('../services/measure-alert-reassign-notify.service');

function makeBusStub() {
  const handlers = new Map();
  const published = [];
  return {
    subscribe(pattern, handler) {
      handlers.set(pattern, handler);
      return () => handlers.delete(pattern);
    },
    publish(domain, eventType, payload) {
      published.push({ domain, eventType, payload });
      return Promise.resolve();
    },
    async fire(pattern, payload) {
      const h = handlers.get(pattern);
      if (h) await h({ payload });
    },
    handlers,
    published,
  };
}

function makeLoggerStub() {
  return {
    infos: [],
    warns: [],
    errors: [],
    info(...args) {
      this.infos.push(args.join(' '));
    },
    warn(...args) {
      this.warns.push(args.join(' '));
    },
    error(...args) {
      this.errors.push(args.join(' '));
    },
  };
}

// ════════════════════════════════════════════════════════════════════
// _normalizePayload + _severityFor pure helpers
// ════════════════════════════════════════════════════════════════════

describe('W516 — _normalizePayload', () => {
  test('builds recipients list from from + to therapist IDs', () => {
    const p = service._normalizePayload({
      alertId: 'a1',
      fromTherapistId: 'tA',
      toTherapistId: 'tB',
      branchId: 'b1',
      actorId: 'u1',
    });
    expect(p.recipients).toEqual(['tA', 'tB']);
    expect(p.source).toBe('medical.measure_alert.reassigned');
  });

  test('filters falsy therapist IDs from recipients (defense-in-depth)', () => {
    const p = service._normalizePayload({
      alertId: 'a1',
      fromTherapistId: null,
      toTherapistId: 'tB',
    });
    expect(p.recipients).toEqual(['tB']);
  });

  test('notifiedAt is an ISO timestamp', () => {
    const p = service._normalizePayload({
      alertId: 'a1',
      fromTherapistId: 'tA',
      toTherapistId: 'tB',
    });
    expect(p.notifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});

describe('W516 — _severityFor', () => {
  test('preserves canonical levels', () => {
    expect(service._severityFor('critical')).toBe('critical');
    expect(service._severityFor('high')).toBe('high');
    expect(service._severityFor('medium')).toBe('medium');
    expect(service._severityFor('low')).toBe('low');
  });

  test('falls back to info on missing/unknown', () => {
    expect(service._severityFor()).toBe('info');
    expect(service._severityFor('')).toBe('info');
    expect(service._severityFor('unknown')).toBe('info');
    expect(service._severityFor(null)).toBe('info');
  });

  test('case-insensitive', () => {
    expect(service._severityFor('CRITICAL')).toBe('critical');
    expect(service._severityFor('High')).toBe('high');
  });
});

// ════════════════════════════════════════════════════════════════════
// wireMeasureAlertReassignNotify subscription
// ════════════════════════════════════════════════════════════════════

describe('W516 — wireMeasureAlertReassignNotify', () => {
  test('throws when bus lacks .subscribe', () => {
    expect(() => service.wireMeasureAlertReassignNotify({ integrationBus: {} })).toThrow(
      /subscribe/
    );
  });

  test('subscribes to medical.measure_alert.reassigned', () => {
    const bus = makeBusStub();
    const wired = service.wireMeasureAlertReassignNotify({
      integrationBus: bus,
      logger: makeLoggerStub(),
    });
    expect(bus.handlers.has(service.SOURCE_PATTERN)).toBe(true);
    expect(wired.DOWNSTREAM_EVENT).toBe('measure_alert.reassigned.alert');
    expect(wired.DOWNSTREAM_DOMAIN).toBe('notification');
  });

  test('emits downstream notification on valid event', async () => {
    const bus = makeBusStub();
    const logger = makeLoggerStub();
    const wired = service.wireMeasureAlertReassignNotify({
      integrationBus: bus,
      logger,
    });

    await bus.fire(service.SOURCE_PATTERN, {
      alertId: 'a1',
      beneficiaryId: 'b1',
      branchId: 'br1',
      fromTherapistId: 'tA',
      toTherapistId: 'tB',
      actorId: 'u1',
      alertType: 'FORECAST_OFF_TRACK',
      severity: 'high',
      reason: 'rebalancing load',
    });

    const stats = wired.ranSinceBoot();
    expect(stats.received).toBe(1);
    expect(stats.notified).toBe(1);
    expect(stats.skipped).toBe(0);
    expect(stats.errored).toBe(0);

    expect(bus.published).toHaveLength(1);
    expect(bus.published[0].domain).toBe('notification');
    expect(bus.published[0].eventType).toBe('measure_alert.reassigned.alert');
    const p = bus.published[0].payload;
    expect(p.alertId).toBe('a1');
    expect(p.recipients).toEqual(['tA', 'tB']);
    expect(p.severity).toBe('high');
  });

  test('skips malformed events (missing alertId)', async () => {
    const bus = makeBusStub();
    const logger = makeLoggerStub();
    const wired = service.wireMeasureAlertReassignNotify({
      integrationBus: bus,
      logger,
    });
    await bus.fire(service.SOURCE_PATTERN, {
      fromTherapistId: 'tA',
      toTherapistId: 'tB',
    });
    const stats = wired.ranSinceBoot();
    expect(stats.received).toBe(1);
    expect(stats.skipped).toBe(1);
    expect(stats.notified).toBe(0);
    expect(bus.published).toHaveLength(0);
    expect(logger.warns.length).toBeGreaterThan(0);
  });

  test('skips malformed events (missing fromTherapistId)', async () => {
    const bus = makeBusStub();
    const wired = service.wireMeasureAlertReassignNotify({
      integrationBus: bus,
      logger: makeLoggerStub(),
    });
    await bus.fire(service.SOURCE_PATTERN, {
      alertId: 'a1',
      toTherapistId: 'tB',
    });
    expect(wired.ranSinceBoot().skipped).toBe(1);
    expect(bus.published).toHaveLength(0);
  });

  test('thrown downstream emit does NOT break the bus + counts as errored', async () => {
    const bus = makeBusStub();
    const logger = makeLoggerStub();
    let calls = 0;
    const throwingEmit = () => {
      calls++;
      return Promise.reject(new Error('channel down'));
    };
    const wired = service.wireMeasureAlertReassignNotify({
      integrationBus: bus,
      logger,
      downstreamEmit: throwingEmit,
    });
    await bus.fire(service.SOURCE_PATTERN, {
      alertId: 'a1',
      fromTherapistId: 'tA',
      toTherapistId: 'tB',
    });
    // Fire AGAIN to prove the handler is still alive after the throw.
    await bus.fire(service.SOURCE_PATTERN, {
      alertId: 'a2',
      fromTherapistId: 'tA',
      toTherapistId: 'tB',
    });
    expect(calls).toBe(2);
    const stats = wired.ranSinceBoot();
    expect(stats.received).toBe(2);
    expect(stats.errored).toBe(2);
    expect(stats.lastError).toMatch(/channel down/);
    expect(logger.errors.length).toBeGreaterThan(0);
  });

  test('downstreamEmit override replaces bus.publish path', async () => {
    const bus = makeBusStub();
    const captured = [];
    const captureEmit = async (eventType, payload) => {
      captured.push({ eventType, payload });
    };
    service.wireMeasureAlertReassignNotify({
      integrationBus: bus,
      logger: makeLoggerStub(),
      downstreamEmit: captureEmit,
    });
    await bus.fire(service.SOURCE_PATTERN, {
      alertId: 'a1',
      fromTherapistId: 'tA',
      toTherapistId: 'tB',
    });
    expect(captured).toHaveLength(1);
    expect(captured[0].eventType).toBe('measure_alert.reassigned.alert');
    // bus.publish was NOT called because the override took over
    expect(bus.published).toHaveLength(0);
  });

  test('unsubscribe stops future events from being received', async () => {
    const bus = makeBusStub();
    const wired = service.wireMeasureAlertReassignNotify({
      integrationBus: bus,
      logger: makeLoggerStub(),
    });
    wired.unsubscribe();
    await bus.fire(service.SOURCE_PATTERN, {
      alertId: 'a1',
      fromTherapistId: 'tA',
      toTherapistId: 'tB',
    });
    expect(wired.ranSinceBoot().received).toBe(0);
  });
});

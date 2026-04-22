/**
 * reporting-locator.test.js — Phase 10 Commit 2.
 *
 * Locator is a wiring function; tests prove the collaborators are
 * assembled correctly and that start/stop propagates to the scheduler.
 * Actual behavior is covered by the per-unit tests.
 */

'use strict';

const { buildReportingPlatform } = require('../services/reporting');

describe('buildReportingPlatform', () => {
  test('returns engine, scheduler, channels, resolver', () => {
    const out = buildReportingPlatform({
      models: {
        Notification: { model: { create: jest.fn() } },
      },
      communication: {
        emailService: { send: jest.fn() },
        smsService: { send: jest.fn() },
      },
    });
    expect(out.engine).toBeDefined();
    expect(out.scheduler).toBeDefined();
    expect(out.channels.email).toBeDefined();
    expect(out.channels.sms).toBeDefined();
    expect(out.channels.in_app).toBeDefined();
    expect(out.recipientResolver).toBeDefined();
    expect(typeof out.start).toBe('function');
    expect(typeof out.stop).toBe('function');
  });

  test('start/stop cycles the scheduler with interval fallback', () => {
    const platform = buildReportingPlatform({
      models: {},
      communication: {},
    });
    platform.start();
    expect(platform.scheduler.isRunning()).toBe(true);
    platform.stop();
    expect(platform.scheduler.isRunning()).toBe(false);
  });

  test('locator does not throw when no deps are provided (degraded mode)', () => {
    expect(() => buildReportingPlatform()).not.toThrow();
  });
});

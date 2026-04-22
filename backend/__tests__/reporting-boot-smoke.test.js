/**
 * reporting-boot-smoke.test.js — Phase 10 Commit 16.
 *
 * Smoke test for the boot integration landed in `server.js`. We don't
 * exercise the whole server (that needs MongoDB); we verify the same
 * entry points server.js calls:
 *
 *   buildReportingPlatform(deps) → { start, stop, engine, scheduler,
 *                                     opsScheduler, kpiValueResolver,
 *                                     channels, recipientResolver,
 *                                     rateLimiter }
 *
 * must start cleanly without cron (interval fallback), expose the
 * auto-wired kpiValueResolver, then stop without leaking timers.
 */

'use strict';

const { buildReportingPlatform } = require('../services/reporting');

describe('reporting boot — platform.start()/stop() lifecycle', () => {
  test('builds a fully wired platform with no deps (degraded mode)', () => {
    const platform = buildReportingPlatform();
    expect(platform.engine).toBeDefined();
    expect(platform.scheduler).toBeDefined();
    expect(platform.opsScheduler).toBeDefined();
    expect(platform.channels).toBeDefined();
    expect(platform.recipientResolver).toBeDefined();
    expect(platform.rateLimiter).toBeDefined();
    // C13 + C15 exposed the resolver on the platform; verify it's
    // installed even in degraded mode.
    expect(typeof platform.kpiValueResolver).toBe('function');
    // And the engine has the same function wired in.
    expect(platform.engine.valueResolver).toBe(platform.kpiValueResolver);
  });

  test('start() registers scheduler jobs; stop() cleans them up', () => {
    const platform = buildReportingPlatform();
    platform.start();
    expect(platform.scheduler.isRunning()).toBe(true);
    expect(platform.opsScheduler.isRunning()).toBe(true);
    platform.stop();
    expect(platform.scheduler.isRunning()).toBe(false);
    expect(platform.opsScheduler.isRunning()).toBe(false);
  });

  test('stop() clears all scheduler timers — no lingering intervals', () => {
    const platform = buildReportingPlatform();
    platform.start();
    const beforeStop = platform.scheduler._jobs.size + platform.opsScheduler._jobs.size;
    expect(beforeStop).toBeGreaterThan(0);
    platform.stop();
    expect(platform.scheduler._jobs.size).toBe(0);
    expect(platform.opsScheduler._jobs.size).toBe(0);
  });

  test('boot works with the same dep shape server.js passes (degraded models)', () => {
    // server.js hands in real mongoose models; here we pass stubs so
    // the locator sees them but nothing connects to Mongo.
    const platform = buildReportingPlatform({
      models: {
        Beneficiary: { model: {} },
        Guardian: { model: {} },
        User: { model: {} },
        Session: { model: {} },
        Employee: { model: {} },
        Branch: { model: {} },
        Notification: { model: { create: async () => ({ _id: 'n1' }) } },
      },
      communication: {
        emailService: { send: async () => ({ success: true, emailId: 'e1' }) },
        smsService: { send: async () => ({ success: true, smsId: 's1' }) },
        whatsappService: {
          sendText: async () => ({ success: true, messageId: 'w1' }),
          sendDocument: async () => ({ success: true, messageId: 'w2' }),
        },
      },
      logger: { info: () => {}, warn: () => {}, error: () => {} },
    });
    expect(() => platform.start()).not.toThrow();
    platform.stop();
  });
});

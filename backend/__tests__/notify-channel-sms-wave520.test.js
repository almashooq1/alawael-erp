'use strict';

/**
 * notify-channel-sms-wave520.test.js — Wave 520.
 *
 * Drift guard for services/notify-channel-sms.service.js. Pure unit tests
 * with stub bus + stub sendSMS + stub getUserById.
 *
 * Covers:
 *   - SMS body length cap (≤140 chars, 2 segments)
 *   - FROM vs TO direction copy
 *   - severity included when present
 *   - Dedupe within 24h window
 *   - Skip recipient with no phone
 *   - Skip malformed events
 *   - smsService stub `{skipped: true}` returns counted as
 *     providerNotConfigured (NOT errored — graceful degradation)
 *   - sendSMS throw counts as errored, bus stays alive
 *   - Throws on missing integrationBus
 *   - Real provider success path (sent++ no skipped)
 */

const service = require('../services/notify-channel-sms.service');

function makeBusStub() {
  const handlers = new Map();
  return {
    subscribe(p, h) {
      handlers.set(p, h);
      return () => handlers.delete(p);
    },
    async fire(p, payload) {
      const h = handlers.get(p);
      if (h) await h({ payload });
    },
    handlers,
  };
}

function makeLoggerStub() {
  return {
    infos: [],
    warns: [],
    errors: [],
    info(...a) {
      this.infos.push(a.join(' '));
    },
    warn(...a) {
      this.warns.push(a.join(' '));
    },
    error(...a) {
      this.errors.push(a.join(' '));
    },
  };
}

function makePayload(overrides = {}) {
  return {
    source: 'medical.measure_alert.reassigned',
    alertId: 'alert-1',
    beneficiaryId: 'b1',
    branchId: 'br1',
    fromTherapistId: 'tFrom',
    toTherapistId: 'tTo',
    actorId: 'sup',
    alertType: 'FORECAST_OFF_TRACK',
    severity: 'high',
    reason: 'rebalancing',
    notifiedAt: new Date().toISOString(),
    recipients: ['tFrom', 'tTo'],
    ...overrides,
  };
}

function makeUserLookup(byId) {
  return async id => byId[String(id)] || null;
}

// ════════════════════════════════════════════════════════════════════
// _renderSmsBody pure helper
// ════════════════════════════════════════════════════════════════════

describe('W520 — _renderSmsBody', () => {
  test('FROM recipient: "نُقلت حالة من قائمتك"', () => {
    const body = service._renderSmsBody({
      payload: makePayload(),
      isFrom: true,
      isTo: false,
    });
    expect(body).toMatch(/نُقلت حالة من قائمتك/);
    expect(body).toContain('high');
  });

  test('TO recipient: "استلمت حالة جديدة"', () => {
    const body = service._renderSmsBody({
      payload: makePayload(),
      isFrom: false,
      isTo: true,
    });
    expect(body).toMatch(/استلمت حالة جديدة/);
  });

  test('omits severity when missing', () => {
    const body = service._renderSmsBody({
      payload: makePayload({ severity: '' }),
      isFrom: false,
      isTo: true,
    });
    expect(body).not.toMatch(/\(\s*\)/); // no empty parens
  });

  test('truncates at SMS_BODY_MAX_CHARS', () => {
    const longReason = 'X'.repeat(500);
    const body = service._renderSmsBody({
      payload: makePayload({ reason: longReason, severity: longReason }),
      isFrom: false,
      isTo: true,
    });
    expect(body.length).toBeLessThanOrEqual(service.SMS_BODY_MAX_CHARS);
  });
});

// ════════════════════════════════════════════════════════════════════
// wireSmsNotificationChannel
// ════════════════════════════════════════════════════════════════════

describe('W520 — wireSmsNotificationChannel', () => {
  test('throws on missing integrationBus', () => {
    expect(() => service.wireSmsNotificationChannel({ integrationBus: {} })).toThrow(/subscribe/);
  });

  test('subscribes to W516 downstream pattern', () => {
    const bus = makeBusStub();
    service.wireSmsNotificationChannel({
      integrationBus: bus,
      logger: makeLoggerStub(),
      sendSMS: async () => ({ success: true }),
      getUserById: async () => ({ phone: '+966555' }),
    });
    expect(bus.handlers.has(service.EVENT_PATTERN)).toBe(true);
  });

  test('sends one SMS per recipient on valid event (real provider success)', async () => {
    const bus = makeBusStub();
    const calls = [];
    const send = async (to, message) => {
      calls.push({ to, message });
      return { success: true, messageId: `mid-${calls.length}` };
    };
    const wired = service.wireSmsNotificationChannel({
      integrationBus: bus,
      logger: makeLoggerStub(),
      sendSMS: send,
      getUserById: makeUserLookup({
        tFrom: { _id: 'tFrom', phone: '+966555111' },
        tTo: { _id: 'tTo', phone: '+966555222' },
      }),
    });
    await bus.fire(service.EVENT_PATTERN, makePayload());
    expect(calls).toHaveLength(2);
    const tos = calls.map(c => c.to).sort();
    expect(tos).toEqual(['+966555111', '+966555222']);
    const stats = wired.ranSinceBoot();
    expect(stats.sent).toBe(2);
    expect(stats.providerNotConfigured).toBe(0);
  });

  test('stub provider {skipped: true} counts as providerNotConfigured (NOT errored)', async () => {
    const bus = makeBusStub();
    const stubSend = async () => ({ success: false, skipped: true, reason: 'no_provider' });
    const wired = service.wireSmsNotificationChannel({
      integrationBus: bus,
      logger: makeLoggerStub(),
      sendSMS: stubSend,
      getUserById: makeUserLookup({
        tFrom: { _id: 'tFrom', phone: '+966555111' },
        tTo: { _id: 'tTo', phone: '+966555222' },
      }),
    });
    await bus.fire(service.EVENT_PATTERN, makePayload());
    const stats = wired.ranSinceBoot();
    expect(stats.sent).toBe(0);
    expect(stats.providerNotConfigured).toBe(2);
    expect(stats.errored).toBe(0);
  });

  test('dedupe within window — re-fire same alert/recipient = skipped', async () => {
    const bus = makeBusStub();
    const calls = [];
    const send = async (to, m) => {
      calls.push({ to, m });
      return { success: true };
    };
    const wired = service.wireSmsNotificationChannel({
      integrationBus: bus,
      logger: makeLoggerStub(),
      sendSMS: send,
      getUserById: makeUserLookup({
        tFrom: { _id: 'tFrom', phone: '+966555111' },
        tTo: { _id: 'tTo', phone: '+966555222' },
      }),
    });
    await bus.fire(service.EVENT_PATTERN, makePayload());
    await bus.fire(service.EVENT_PATTERN, makePayload());
    expect(calls).toHaveLength(2); // NOT 4
    const stats = wired.ranSinceBoot();
    expect(stats.sent).toBe(2);
    expect(stats.skipped).toBe(2);
  });

  test('skips recipient with no phone', async () => {
    const bus = makeBusStub();
    const send = async () => ({ success: true });
    const logger = makeLoggerStub();
    const wired = service.wireSmsNotificationChannel({
      integrationBus: bus,
      logger,
      sendSMS: send,
      getUserById: makeUserLookup({
        tFrom: { _id: 'tFrom' /* no phone */ },
        tTo: { _id: 'tTo', phone: '+966555' },
      }),
    });
    await bus.fire(service.EVENT_PATTERN, makePayload());
    const stats = wired.ranSinceBoot();
    expect(stats.sent).toBe(1);
    expect(stats.skipped).toBe(1);
    expect(logger.warns.some(w => w.includes('no phone'))).toBe(true);
  });

  test('skips malformed events', async () => {
    const bus = makeBusStub();
    const wired = service.wireSmsNotificationChannel({
      integrationBus: bus,
      logger: makeLoggerStub(),
      sendSMS: async () => ({ success: true }),
      getUserById: makeUserLookup({}),
    });
    await bus.fire(service.EVENT_PATTERN, { recipients: ['tA'] }); // no alertId
    expect(wired.ranSinceBoot().skipped).toBe(1);
    expect(wired.ranSinceBoot().sent).toBe(0);
  });

  test('sendSMS throw counts as errored + bus stays alive', async () => {
    const bus = makeBusStub();
    let calls = 0;
    const send = async () => {
      calls++;
      throw new Error('SMS gateway down');
    };
    const logger = makeLoggerStub();
    const wired = service.wireSmsNotificationChannel({
      integrationBus: bus,
      logger,
      sendSMS: send,
      getUserById: makeUserLookup({
        tFrom: { _id: 'tFrom', phone: '+966555' },
        tTo: { _id: 'tTo', phone: '+966666' },
      }),
    });
    await bus.fire(service.EVENT_PATTERN, makePayload());
    await bus.fire(service.EVENT_PATTERN, makePayload({ alertId: 'alert-2' }));
    expect(calls).toBeGreaterThanOrEqual(2);
    const stats = wired.ranSinceBoot();
    expect(stats.errored).toBeGreaterThanOrEqual(1);
    expect(stats.lastError).toMatch(/SMS gateway down/);
    expect(logger.errors.length).toBeGreaterThan(0);
  });

  test('provider success=false with reason counts as errored', async () => {
    const bus = makeBusStub();
    const send = async () => ({ success: false, reason: 'invalid_number' });
    const wired = service.wireSmsNotificationChannel({
      integrationBus: bus,
      logger: makeLoggerStub(),
      sendSMS: send,
      getUserById: makeUserLookup({
        tFrom: { _id: 'tFrom', phone: '+1234' },
        tTo: { _id: 'tTo', phone: '+5678' },
      }),
    });
    await bus.fire(service.EVENT_PATTERN, makePayload());
    const stats = wired.ranSinceBoot();
    expect(stats.errored).toBe(2);
    expect(stats.sent).toBe(0);
    expect(stats.lastError).toMatch(/invalid_number/);
  });
});

/**
 * W1511 — WhatsApp post-session subscriber (M5 automation) — 3-artifact guard
 *
 * (1) pure helper + handler behavioral tests (mocked deps),
 * (2) IN-PROCESS integration test through the REAL integration bus (publish →
 *     subscriber → send), per the W387 pattern — no HTTP boot, no DB,
 * (3) static: env-gated default-OFF + consent-gated + startup wiring present.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const sub = require('../services/whatsapp/whatsappPostSessionSubscriber');

const SVC_SRC = fs.readFileSync(
  path.join(__dirname, '../services/whatsapp/whatsappPostSessionSubscriber.js'),
  'utf8'
);
const STARTUP_SRC = fs.readFileSync(path.join(__dirname, '../startup/integrationBus.js'), 'utf8');

describe('W1511 pickGuardian (pure)', () => {
  test('prefers legal guardian → primary caregiver → first with phone', () => {
    expect(
      sub.pickGuardian([
        { phone: '1' },
        { hasLegalGuardianship: true, phone: '2' },
        { isPrimaryCaregiver: true, phone: '3' },
      ]).phone
    ).toBe('2');
    expect(sub.pickGuardian([{ phone: '1' }, { isPrimaryCaregiver: true, phone: '3' }]).phone).toBe(
      '3'
    );
    expect(sub.pickGuardian([{ relationship: 'father', phone: '9' }]).phone).toBe('9');
  });

  test('null on empty / no phone', () => {
    expect(sub.pickGuardian([])).toBeNull();
    expect(sub.pickGuardian([{ isPrimaryCaregiver: true }])).toBeNull();
    expect(sub.pickGuardian(null)).toBeNull();
  });
});

describe('W1511 handleSessionCompleted (behavioral, mocked deps)', () => {
  const baseDeps = (overrides = {}) => ({
    getGuardianPhone: async () => ({ phone: '966500000000', beneficiaryName: 'سعد' }),
    Consent: { canMessage: async () => ({ allowed: true, reason: 'opted_in' }) },
    whatsappService: { sendNotification: jest.fn(async () => ({ success: true, stub: true })) },
    ...overrides,
  });

  test('sends when guardian + consent ok', async () => {
    const deps = baseDeps();
    const r = await sub.handleSessionCompleted({ beneficiaryId: 'b1', sessionType: 'فردية' }, deps);
    expect(r.sent).toBe(true);
    expect(deps.whatsappService.sendNotification).toHaveBeenCalledTimes(1);
  });

  test('no send when consent denied', async () => {
    const deps = baseDeps({
      Consent: { canMessage: async () => ({ allowed: false, reason: 'opted_out' }) },
    });
    const r = await sub.handleSessionCompleted({ beneficiaryId: 'b1' }, deps);
    expect(r.sent).toBe(false);
    expect(r.reason).toMatch(/consent:opted_out/);
    expect(deps.whatsappService.sendNotification).not.toHaveBeenCalled();
  });

  test('no send when no guardian phone', async () => {
    const deps = baseDeps({ getGuardianPhone: async () => null });
    const r = await sub.handleSessionCompleted({ beneficiaryId: 'b1' }, deps);
    expect(r).toEqual({ sent: false, reason: 'no_guardian_phone' });
  });

  test('no send when payload lacks beneficiaryId', async () => {
    const r = await sub.handleSessionCompleted({}, baseDeps());
    expect(r).toEqual({ sent: false, reason: 'no_beneficiary' });
  });
});

describe('W1511 wire is env-gated (default OFF)', () => {
  const orig = process.env[sub.ENV_FLAG];
  afterEach(() => {
    if (orig === undefined) delete process.env[sub.ENV_FLAG];
    else process.env[sub.ENV_FLAG] = orig;
  });

  test('returns null + never subscribes when flag is not "true"', () => {
    delete process.env[sub.ENV_FLAG];
    const bus = { subscribe: jest.fn() };
    expect(sub.wireWhatsappPostSessionSummary(bus, {})).toBeNull();
    expect(bus.subscribe).not.toHaveBeenCalled();
  });
});

describe('W1511 in-process integration (REAL bus, mocked send)', () => {
  const orig = process.env[sub.ENV_FLAG];
  afterAll(() => {
    if (orig === undefined) delete process.env[sub.ENV_FLAG];
    else process.env[sub.ENV_FLAG] = orig;
  });

  test('publish sessions.session.completed → guardian notified via the bus', async () => {
    process.env[sub.ENV_FLAG] = 'true';
    const { integrationBus } = require('../integration/systemIntegrationBus');
    integrationBus.initialize({ eventStore: null, messageQueue: null, socketEmitter: null });

    const sendNotification = jest.fn(async () => ({ success: true, stub: true }));
    const unsub = sub.wireWhatsappPostSessionSummary(integrationBus, {
      getGuardianPhone: async () => ({ phone: '966500000000' }),
      Consent: { canMessage: async () => ({ allowed: true, reason: 'opted_in' }) },
      whatsappService: { sendNotification },
    });

    try {
      await integrationBus.publish('sessions', 'session.completed', {
        sessionId: 's1',
        beneficiaryId: 'b1',
        branchId: 'br1',
        sessionType: 'فردية',
      });
      // dispatch is async (setImmediate) — flush a couple of ticks
      await new Promise(r => setImmediate(r));
      await new Promise(r => setImmediate(r));

      expect(sendNotification).toHaveBeenCalledTimes(1);
      expect(sendNotification.mock.calls[0][0]).toBe('966500000000');
    } finally {
      if (unsub) unsub();
    }
  });
});

describe('W1511 static — env-gate + consent + wiring', () => {
  test('subscriber is default-OFF + consent-gated + listens on session.completed', () => {
    expect(SVC_SRC).toMatch(/ENABLE_WHATSAPP_POST_SESSION_SUMMARY/);
    expect(SVC_SRC).toMatch(/!==\s*'true'/);
    expect(SVC_SRC).toMatch(/canMessage/);
    expect(SVC_SRC).toMatch(/'sessions\.session\.completed'/);
  });

  test('startup/integrationBus.js wires the subscriber', () => {
    expect(STARTUP_SRC).toMatch(/wireWhatsappPostSessionSummary/);
    expect(STARTUP_SRC).toMatch(
      /require\(['"]\.\.\/services\/whatsapp\/whatsappPostSessionSubscriber['"]\)/
    );
  });
});

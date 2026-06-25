/**
 * W1513 — WhatsApp complaint-resolved subscriber (M6) — 3-artifact guard
 *
 * (1) shared resolver pure test, (2) handler behavioral (mocked deps),
 * (3) IN-PROCESS integration through the REAL integration bus (publish
 *     complaint.complaint.resolved → subscriber → send) per the W387 pattern,
 * (4) static: env-gate default-OFF + consent + startup wiring.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const sub = require('../services/whatsapp/whatsappComplaintResolvedSubscriber');
const resolver = require('../services/whatsapp/whatsappGuardianResolver');

const SVC_SRC = fs.readFileSync(
  path.join(__dirname, '../services/whatsapp/whatsappComplaintResolvedSubscriber.js'),
  'utf8'
);
const STARTUP_SRC = fs.readFileSync(path.join(__dirname, '../startup/integrationBus.js'), 'utf8');

describe('W1513 shared guardian resolver (pure)', () => {
  test('pickGuardian prefers legal guardian → primary caregiver → first with phone', () => {
    expect(
      resolver.pickGuardian([
        { phone: '1' },
        { hasLegalGuardianship: true, phone: '2' },
        { isPrimaryCaregiver: true, phone: '3' },
      ]).phone
    ).toBe('2');
    expect(resolver.pickGuardian([{ phone: '1' }, { isPrimaryCaregiver: true, phone: '3' }]).phone).toBe('3');
    expect(resolver.pickGuardian([])).toBeNull();
    expect(resolver.pickGuardian([{ isPrimaryCaregiver: true }])).toBeNull();
  });
});

describe('W1513 handleComplaintResolved (behavioral, mocked deps)', () => {
  const baseDeps = (overrides = {}) => ({
    getGuardianPhone: async () => ({ phone: '966500000000', beneficiaryName: 'سعد' }),
    Consent: { canMessage: async () => ({ allowed: true, reason: 'opted_in' }) },
    whatsappService: { sendNotification: jest.fn(async () => ({ success: true, stub: true })) },
    ...overrides,
  });

  test('sends with complaint number when guardian + consent ok', async () => {
    const deps = baseDeps();
    const r = await sub.handleComplaintResolved({ beneficiaryId: 'b1', complaintNumber: 'C-2026-7' }, deps);
    expect(r.sent).toBe(true);
    expect(deps.whatsappService.sendNotification).toHaveBeenCalledTimes(1);
    expect(deps.whatsappService.sendNotification.mock.calls[0][2]).toMatch(/C-2026-7/);
  });

  test('no send when consent denied', async () => {
    const deps = baseDeps({ Consent: { canMessage: async () => ({ allowed: false, reason: 'opted_out' }) } });
    const r = await sub.handleComplaintResolved({ beneficiaryId: 'b1' }, deps);
    expect(r.sent).toBe(false);
    expect(r.reason).toMatch(/consent:opted_out/);
    expect(deps.whatsappService.sendNotification).not.toHaveBeenCalled();
  });

  test('no send when no guardian phone / no beneficiary', async () => {
    expect(await sub.handleComplaintResolved({ beneficiaryId: 'b1' }, baseDeps({ getGuardianPhone: async () => null }))).toEqual({
      sent: false,
      reason: 'no_guardian_phone',
    });
    expect(await sub.handleComplaintResolved({}, baseDeps())).toEqual({ sent: false, reason: 'no_beneficiary' });
  });
});

describe('W1513 wire is env-gated (default OFF)', () => {
  const orig = process.env[sub.ENV_FLAG];
  afterEach(() => {
    if (orig === undefined) delete process.env[sub.ENV_FLAG];
    else process.env[sub.ENV_FLAG] = orig;
  });

  test('returns null + never subscribes when flag is not "true"', () => {
    delete process.env[sub.ENV_FLAG];
    const bus = { subscribe: jest.fn() };
    expect(sub.wireWhatsappComplaintResolved(bus, {})).toBeNull();
    expect(bus.subscribe).not.toHaveBeenCalled();
  });
});

describe('W1513 in-process integration (REAL bus, mocked send)', () => {
  const orig = process.env[sub.ENV_FLAG];
  afterAll(() => {
    if (orig === undefined) delete process.env[sub.ENV_FLAG];
    else process.env[sub.ENV_FLAG] = orig;
  });

  test('publish complaint.complaint.resolved → guardian notified via the bus', async () => {
    process.env[sub.ENV_FLAG] = 'true';
    const { integrationBus } = require('../integration/systemIntegrationBus');
    integrationBus.initialize({ eventStore: null, messageQueue: null, socketEmitter: null });

    const sendNotification = jest.fn(async () => ({ success: true, stub: true }));
    const unsub = sub.wireWhatsappComplaintResolved(integrationBus, {
      getGuardianPhone: async () => ({ phone: '966511111111' }),
      Consent: { canMessage: async () => ({ allowed: true, reason: 'opted_in' }) },
      whatsappService: { sendNotification },
    });

    try {
      await integrationBus.publish('complaint', 'complaint.resolved', {
        complaintId: 'c1',
        complaintNumber: 'C-1',
        beneficiaryId: 'b1',
        branchId: 'br1',
      });
      await new Promise(r => setImmediate(r));
      await new Promise(r => setImmediate(r));
      expect(sendNotification).toHaveBeenCalledTimes(1);
      expect(sendNotification.mock.calls[0][0]).toBe('966511111111');
    } finally {
      if (unsub) unsub();
    }
  });
});

describe('W1513 static — env-gate + consent + wiring + event name', () => {
  test('subscriber is default-OFF + consent-gated + listens on complaint.complaint.resolved', () => {
    expect(SVC_SRC).toMatch(/ENABLE_WHATSAPP_COMPLAINT_RESOLVED/);
    expect(SVC_SRC).toMatch(/!==\s*'true'/);
    expect(SVC_SRC).toMatch(/canMessage/);
    expect(SVC_SRC).toMatch(/'complaint\.complaint\.resolved'/);
  });

  test('startup/integrationBus.js wires the subscriber', () => {
    expect(STARTUP_SRC).toMatch(/wireWhatsappComplaintResolved/);
    expect(STARTUP_SRC).toMatch(
      /require\(['"]\.\.\/services\/whatsapp\/whatsappComplaintResolvedSubscriber['"]\)/
    );
  });
});

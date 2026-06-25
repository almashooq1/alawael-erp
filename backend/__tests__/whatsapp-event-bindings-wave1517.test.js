/**
 * W1517 — WhatsApp configurable event-bindings (M5 automation builder) guard
 *
 * (1) pure helpers (renderMessage / pickGuardian / model dispatchFilter),
 * (2) handleEvent behavioral (mocked Binding + deps),
 * (3) IN-PROCESS integration through the REAL bus (publish a bindable event →
 *     dispatcher → send), (4) static: model shape + route mount + env-gate +
 *     startup wiring.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const disp = require('../services/whatsapp/whatsappEventBindingDispatcher');

const DISP_SRC = fs.readFileSync(
  path.join(__dirname, '../services/whatsapp/whatsappEventBindingDispatcher.js'),
  'utf8'
);
const MODEL_SRC = fs.readFileSync(path.join(__dirname, '../models/WhatsAppEventBinding.js'), 'utf8');
const REG_SRC = fs.readFileSync(path.join(__dirname, '../routes/registries/communication.registry.js'), 'utf8');
const ROUTE_SRC = fs.readFileSync(path.join(__dirname, '../routes/whatsapp-automation.routes.js'), 'utf8');
const STARTUP_SRC = fs.readFileSync(path.join(__dirname, '../startup/integrationBus.js'), 'utf8');

// mockBinding: a stand-in model exposing the dispatch contract.
function mockBinding(rows) {
  return {
    BINDABLE_EVENTS: ['invoices.invoice.paid', 'sessions.session.completed'],
    dispatchFilter: (event, branchId) => ({ event, branchId }),
    find: () => ({ lean: async () => rows }),
  };
}

describe('W1517 pure helpers', () => {
  test('renderMessage substitutes {beneficiaryName} / {sessionType} + caps length', () => {
    expect(disp.renderMessage('مرحباً {beneficiaryName} — جلسة {sessionType}', { beneficiaryName: 'سعد', sessionType: 'نطق' })).toBe(
      'مرحباً سعد — جلسة نطق'
    );
    expect(disp.renderMessage('أهلاً {beneficiaryName}', {})).toBe('أهلاً ');
    expect(disp.renderMessage('x'.repeat(2000), {})).toHaveLength(1024);
  });

  test('pickGuardian prefers legal guardian → primary → first with phone', () => {
    expect(disp.pickGuardian([{ phone: '1' }, { hasLegalGuardianship: true, phone: '2' }]).phone).toBe('2');
    expect(disp.pickGuardian([])).toBeNull();
  });
});

describe('W1517 handleEvent (behavioral, mocked deps)', () => {
  const baseDeps = (rows, overrides = {}) => ({
    Binding: mockBinding(rows),
    getGuardianPhone: async () => ({ phone: '966500000000', beneficiaryName: 'سعد' }),
    Consent: { canMessage: async () => ({ allowed: true, reason: 'opted_in' }) },
    whatsappService: { sendNotification: jest.fn(async () => ({ success: true, stub: true })) },
    ...overrides,
  });

  test('sends one message per matching enabled binding', async () => {
    const deps = baseDeps([
      { _id: 'x', title: 'دفعة', body: 'تم استلام دفعتك يا {beneficiaryName}' },
      { _id: 'y', title: 'شكراً', body: 'شكراً' },
    ]);
    const r = await disp.handleEvent('invoices.invoice.paid', { beneficiaryId: 'b1' }, deps);
    expect(r).toEqual({ sent: 2, matched: 2 });
    expect(deps.whatsappService.sendNotification).toHaveBeenCalledTimes(2);
    expect(deps.whatsappService.sendNotification.mock.calls[0][2]).toMatch(/سعد/);
  });

  test('no bindings → nothing sent', async () => {
    const deps = baseDeps([]);
    expect(await disp.handleEvent('invoices.invoice.paid', { beneficiaryId: 'b1' }, deps)).toEqual({ sent: 0, matched: 0 });
    expect(deps.whatsappService.sendNotification).not.toHaveBeenCalled();
  });

  test('consent denied → matched but not sent', async () => {
    const deps = baseDeps([{ _id: 'x', title: 't', body: 'b' }], {
      Consent: { canMessage: async () => ({ allowed: false, reason: 'opted_out' }) },
    });
    expect(await disp.handleEvent('invoices.invoice.paid', { beneficiaryId: 'b1' }, deps)).toEqual({ sent: 0, matched: 1 });
  });

  test('no beneficiary in payload → no-op', async () => {
    const deps = baseDeps([{ _id: 'x', title: 't', body: 'b' }]);
    expect(await disp.handleEvent('invoices.invoice.paid', {}, deps)).toEqual({ sent: 0, matched: 0 });
  });
});

describe('W1517 wire is env-gated (default OFF)', () => {
  const orig = process.env[disp.ENV_FLAG];
  afterEach(() => {
    if (orig === undefined) delete process.env[disp.ENV_FLAG];
    else process.env[disp.ENV_FLAG] = orig;
  });
  test('returns [] + never subscribes when flag not "true"', () => {
    delete process.env[disp.ENV_FLAG];
    const bus = { subscribe: jest.fn() };
    expect(disp.wireEventBindingDispatcher(bus, {})).toEqual([]);
    expect(bus.subscribe).not.toHaveBeenCalled();
  });
});

describe('W1517 in-process integration (REAL bus, mocked send)', () => {
  const orig = process.env[disp.ENV_FLAG];
  afterAll(() => {
    if (orig === undefined) delete process.env[disp.ENV_FLAG];
    else process.env[disp.ENV_FLAG] = orig;
  });
  test('publish invoices.invoice.paid → bound message sent via the bus', async () => {
    process.env[disp.ENV_FLAG] = 'true';
    const { integrationBus } = require('../integration/systemIntegrationBus');
    integrationBus.initialize({ eventStore: null, messageQueue: null, socketEmitter: null });

    const sendNotification = jest.fn(async () => ({ success: true, stub: true }));
    const unsubs = disp.wireEventBindingDispatcher(integrationBus, {
      Binding: mockBinding([{ _id: 'x', title: 'دفعة', body: 'تم استلام دفعتك' }]),
      getGuardianPhone: async () => ({ phone: '966522222222', beneficiaryName: 'سعد' }),
      Consent: { canMessage: async () => ({ allowed: true, reason: 'opted_in' }) },
      whatsappService: { sendNotification },
    });
    try {
      await integrationBus.publish('invoices', 'invoice.paid', { beneficiaryId: 'b1', branchId: 'br1' });
      await new Promise(r => setImmediate(r));
      await new Promise(r => setImmediate(r));
      expect(sendNotification).toHaveBeenCalledTimes(1);
      expect(sendNotification.mock.calls[0][0]).toBe('966522222222');
    } finally {
      unsubs.forEach(u => u && u());
    }
  });
});

describe('W1517 static — model + route mount + env-gate + wiring', () => {
  test('model declares the bindable-event enum + dispatch/scoped filters', () => {
    expect(MODEL_SRC).toMatch(/BINDABLE_EVENTS\s*=\s*\[/);
    expect(MODEL_SRC).toMatch(/'sessions\.session\.completed'/);
    expect(MODEL_SRC).toMatch(/function dispatchFilter/);
    expect(MODEL_SRC).toMatch(/function scopedFilter/);
  });
  test('routes are branch-scoped + writes are role-gated + mounted', () => {
    expect(ROUTE_SRC).toMatch(/effectiveBranchScope\(req\)/);
    expect(ROUTE_SRC).toMatch(/authorize\(WRITE_ROLES\)/);
    expect(REG_SRC).toMatch(/dualMount\(app, 'whatsapp-automation'/);
  });
  test('dispatcher env-gated + consent-gated + startup wires it', () => {
    expect(DISP_SRC).toMatch(/ENABLE_WHATSAPP_EVENT_BINDINGS/);
    expect(DISP_SRC).toMatch(/!==\s*'true'/);
    expect(DISP_SRC).toMatch(/canMessage/);
    expect(STARTUP_SRC).toMatch(/wireEventBindingDispatcher/);
  });
});

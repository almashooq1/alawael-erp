/**
 * W1539 — WhatsApp waitlist auto-notify subscriber — 3-artifact guard
 *
 * (1) pure waitlistMessage + handler behavioral tests (mocked deps),
 * (2) IN-PROCESS integration test through the REAL integration bus (publish
 *     appointments.appointment.cancelled → subscriber → send + claim), per the
 *     W387 pattern — no HTTP boot, no DB,
 * (3) static: env-gated default-OFF + consent-gated + idempotent claim + canonical
 *     model + startup wiring present.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const sub = require('../services/whatsapp/whatsappWaitlistNotifySubscriber');

const SVC_SRC = fs.readFileSync(
  path.join(__dirname, '../services/whatsapp/whatsappWaitlistNotifySubscriber.js'),
  'utf8'
);
const STARTUP_SRC = fs.readFileSync(path.join(__dirname, '../startup/integrationBus.js'), 'utf8');

// Mock factory for the Appointment + Waitlist models (findById().lean() and
// findOne().sort() chains) + the send/consent/resolver deps.
function baseDeps(overrides = {}) {
  const entry =
    overrides.entry === undefined ? { _id: 'e1', beneficiary_id: 'b9' } : overrides.entry;
  const appt =
    overrides.appt === undefined
      ? { _id: 'a1', branchId: 'br1', type: 'نطق وتخاطب' }
      : overrides.appt;
  const updateOne = overrides.updateOne || jest.fn(async () => ({ modifiedCount: 1 }));
  return {
    Appointment: { findById: () => ({ lean: async () => appt }) },
    Waitlist: { findOne: () => ({ sort: () => Promise.resolve(entry) }), updateOne },
    getGuardianPhone:
      overrides.getGuardianPhone ||
      (async () => ({ phone: '966500000000', beneficiaryName: 'سعد' })),
    Consent: overrides.Consent || {
      canMessage: async () => ({ allowed: true, reason: 'opted_in' }),
    },
    whatsappService: overrides.whatsappService || {
      sendNotification: jest.fn(async () => ({ success: true, stub: true })),
    },
    _updateOne: updateOne,
  };
}

describe('W1539 waitlistMessage (pure)', () => {
  test('includes beneficiary name + service when present, caps at 1024', () => {
    const m = sub.waitlistMessage({ beneficiaryName: 'سعد', serviceType: 'نطق وتخاطب' });
    expect(m).toContain('سعد');
    expect(m).toContain('نطق وتخاطب');
    expect(m.length).toBeLessThanOrEqual(1024);
  });
  test('works with no context', () => {
    expect(typeof sub.waitlistMessage()).toBe('string');
    expect(sub.waitlistMessage().length).toBeGreaterThan(0);
  });
});

describe('W1539 handleAppointmentCancelled (behavioral, mocked deps)', () => {
  test('notifies top waiting entry + claims it (waiting → notified)', async () => {
    const deps = baseDeps();
    const r = await sub.handleAppointmentCancelled({ appointmentId: 'a1' }, deps);
    expect(r.notified).toBe(true);
    expect(r.entryId).toBe('e1');
    expect(deps.whatsappService.sendNotification).toHaveBeenCalledTimes(1);
    expect(deps.whatsappService.sendNotification.mock.calls[0][0]).toBe('966500000000');
    // idempotent claim: only flips a still-'waiting' row
    expect(deps._updateOne).toHaveBeenCalledTimes(1);
    expect(deps._updateOne.mock.calls[0][0]).toMatchObject({ _id: 'e1', status: 'waiting' });
    expect(deps._updateOne.mock.calls[0][1].$set.status).toBe('notified');
  });

  test('no waiting entry → no send, no claim', async () => {
    const deps = baseDeps({ entry: null });
    const r = await sub.handleAppointmentCancelled({ appointmentId: 'a1' }, deps);
    expect(r).toEqual({ notified: false, reason: 'no_waiting_entry' });
    expect(deps.whatsappService.sendNotification).not.toHaveBeenCalled();
    expect(deps._updateOne).not.toHaveBeenCalled();
  });

  test('appointment without branch → no_branch', async () => {
    const deps = baseDeps({ appt: { _id: 'a1', type: 'نطق وتخاطب' } });
    const r = await sub.handleAppointmentCancelled({ appointmentId: 'a1' }, deps);
    expect(r).toEqual({ notified: false, reason: 'no_branch' });
  });

  test('consent denied → no send, no claim', async () => {
    const deps = baseDeps({
      Consent: { canMessage: async () => ({ allowed: false, reason: 'opted_out' }) },
    });
    const r = await sub.handleAppointmentCancelled({ appointmentId: 'a1' }, deps);
    expect(r.notified).toBe(false);
    expect(r.reason).toMatch(/consent:opted_out/);
    expect(deps.whatsappService.sendNotification).not.toHaveBeenCalled();
    expect(deps._updateOne).not.toHaveBeenCalled();
  });

  test('no guardian phone → no send', async () => {
    const deps = baseDeps({ getGuardianPhone: async () => null });
    const r = await sub.handleAppointmentCancelled({ appointmentId: 'a1' }, deps);
    expect(r).toEqual({ notified: false, reason: 'no_guardian_phone' });
  });

  test('payload without appointmentId → no_appointment', async () => {
    const r = await sub.handleAppointmentCancelled({}, baseDeps());
    expect(r).toEqual({ notified: false, reason: 'no_appointment' });
  });
});

describe('W1539 wire is env-gated (default OFF)', () => {
  const orig = process.env[sub.ENV_FLAG];
  afterEach(() => {
    if (orig === undefined) delete process.env[sub.ENV_FLAG];
    else process.env[sub.ENV_FLAG] = orig;
  });

  test('returns null + never subscribes when flag is not "true"', () => {
    delete process.env[sub.ENV_FLAG];
    const bus = { subscribe: jest.fn() };
    expect(sub.wireWhatsappWaitlistNotify(bus, {})).toBeNull();
    expect(bus.subscribe).not.toHaveBeenCalled();
  });
});

describe('W1539 in-process integration (REAL bus, mocked models/send)', () => {
  const orig = process.env[sub.ENV_FLAG];
  afterAll(() => {
    if (orig === undefined) delete process.env[sub.ENV_FLAG];
    else process.env[sub.ENV_FLAG] = orig;
  });

  test('publish appointments.appointment.cancelled → waitlisted guardian notified via the bus', async () => {
    process.env[sub.ENV_FLAG] = 'true';
    const { integrationBus } = require('../integration/systemIntegrationBus');
    integrationBus.initialize({ eventStore: null, messageQueue: null, socketEmitter: null });

    const sendNotification = jest.fn(async () => ({ success: true, stub: true }));
    const updateOne = jest.fn(async () => ({ modifiedCount: 1 }));
    const unsub = sub.wireWhatsappWaitlistNotify(integrationBus, {
      Appointment: {
        findById: () => ({ lean: async () => ({ branchId: 'br1', type: 'نطق وتخاطب' }) }),
      },
      Waitlist: {
        findOne: () => ({ sort: () => Promise.resolve({ _id: 'e1', beneficiary_id: 'b9' }) }),
        updateOne,
      },
      getGuardianPhone: async () => ({ phone: '966500000000', beneficiaryName: 'سعد' }),
      Consent: { canMessage: async () => ({ allowed: true, reason: 'opted_in' }) },
      whatsappService: { sendNotification },
    });

    try {
      await integrationBus.publish('appointments', 'appointment.cancelled', {
        appointmentId: 'a1',
      });
      // dispatch is async (setImmediate) — flush a couple of ticks
      await new Promise(r => setImmediate(r));
      await new Promise(r => setImmediate(r));

      expect(sendNotification).toHaveBeenCalledTimes(1);
      expect(sendNotification.mock.calls[0][0]).toBe('966500000000');
      expect(updateOne).toHaveBeenCalledTimes(1);
    } finally {
      if (unsub) unsub();
    }
  });
});

describe('W1539 static — env-gate + consent + idempotent + canonical model + wiring', () => {
  test('subscriber is default-OFF + consent-gated + idempotent + listens on appointment.cancelled', () => {
    expect(SVC_SRC).toMatch(/ENABLE_WHATSAPP_WAITLIST_NOTIFY/);
    expect(SVC_SRC).toMatch(/!==\s*'true'/);
    expect(SVC_SRC).toMatch(/canMessage/);
    expect(SVC_SRC).toMatch(/'appointments\.appointment\.cancelled'/);
    // canonical scheduling waitlist + idempotent claim on a still-'waiting' row
    expect(SVC_SRC).toMatch(/SchedulingWaitlistEntry/);
    expect(SVC_SRC).toMatch(/status:\s*'waiting'/);
    expect(SVC_SRC).toMatch(/status:\s*'notified'/);
  });

  test('startup/integrationBus.js wires the subscriber', () => {
    expect(STARTUP_SRC).toMatch(/wireWhatsappWaitlistNotify/);
    expect(STARTUP_SRC).toMatch(
      /require\(['"]\.\.\/services\/whatsapp\/whatsappWaitlistNotifySubscriber['"]\)/
    );
  });
});

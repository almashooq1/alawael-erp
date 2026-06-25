'use strict';

/**
 * whatsapp-reminder-auto-enqueue-wave1527.test.js
 *
 * Guard for the auto-enqueue subscriber that makes W1525 reminders self-driving.
 * (1) pure appointmentDateTime, (2) behavioral handleAppointmentBooked (future /
 * past / missing), (3) in-process integration through the REAL bus, (4) static
 * env-gate + wiring.
 */

jest.unmock('mongoose');

const fs = require('fs');
const path = require('path');

const sub = require('../services/whatsapp/whatsappReminderEnqueueSubscriber');

const SUB_SRC = fs.readFileSync(
  path.join(__dirname, '../services/whatsapp/whatsappReminderEnqueueSubscriber.js'),
  'utf8'
);
const STARTUP_SRC = fs.readFileSync(path.join(__dirname, '../startup/integrationBus.js'), 'utf8');

const NOW = new Date('2026-06-25T12:00:00Z').getTime();

describe('W1527 appointmentDateTime (pure)', () => {
  test('applies HH:MM to the date', () => {
    const dt = sub.appointmentDateTime(new Date('2026-07-01T00:00:00'), '10:30');
    expect(dt.getHours()).toBe(10);
    expect(dt.getMinutes()).toBe(30);
  });
  test('null on missing/invalid date', () => {
    expect(sub.appointmentDateTime(null, '10:00')).toBeNull();
    expect(sub.appointmentDateTime('not-a-date', '10:00')).toBeNull();
  });
});

describe('W1527 handleAppointmentBooked (behavioral, mocked enqueue)', () => {
  test('enqueues for a future appointment', async () => {
    const enqueueReminders = jest.fn(async () => ({ created: 2 }));
    const r = await sub.handleAppointmentBooked(
      {
        appointmentId: 'a1',
        beneficiaryId: 'b1',
        date: new Date(NOW + 48 * 3600_000),
        startTime: '09:00',
      },
      { enqueueReminders, now: NOW }
    );
    expect(r).toEqual({ enqueued: 2, reason: 'ok' });
    expect(enqueueReminders).toHaveBeenCalledWith(
      expect.objectContaining({ appointmentId: 'a1', beneficiaryId: 'b1' })
    );
  });

  test('skips a past appointment', async () => {
    const enqueueReminders = jest.fn();
    const r = await sub.handleAppointmentBooked(
      { appointmentId: 'a1', date: new Date(NOW - 3600_000), startTime: '09:00' },
      { enqueueReminders, now: NOW }
    );
    expect(r.reason).toBe('not_future');
    expect(enqueueReminders).not.toHaveBeenCalled();
  });

  test('skips a payload with no appointmentId', async () => {
    const enqueueReminders = jest.fn();
    expect(await sub.handleAppointmentBooked({}, { enqueueReminders })).toEqual({
      enqueued: 0,
      reason: 'no_appointment',
    });
    expect(enqueueReminders).not.toHaveBeenCalled();
  });
});

describe('W1527 wire is env-gated (default OFF)', () => {
  const orig = process.env[sub.ENV_FLAG];
  afterEach(() => {
    if (orig === undefined) delete process.env[sub.ENV_FLAG];
    else process.env[sub.ENV_FLAG] = orig;
  });
  test('returns null + never subscribes when flag off', () => {
    delete process.env[sub.ENV_FLAG];
    const bus = { subscribe: jest.fn() };
    expect(sub.wireWhatsappReminderAutoEnqueue(bus, {})).toBeNull();
    expect(bus.subscribe).not.toHaveBeenCalled();
  });
});

describe('W1527 in-process integration (REAL bus)', () => {
  const orig = process.env[sub.ENV_FLAG];
  afterAll(() => {
    if (orig === undefined) delete process.env[sub.ENV_FLAG];
    else process.env[sub.ENV_FLAG] = orig;
  });
  test('publishing appointment.booked → enqueueReminders called', async () => {
    process.env[sub.ENV_FLAG] = 'true';
    const { integrationBus } = require('../integration/systemIntegrationBus');
    integrationBus.initialize({ eventStore: null, messageQueue: null, socketEmitter: null });

    const enqueueReminders = jest.fn(async () => ({ created: 2 }));
    const unsub = sub.wireWhatsappReminderAutoEnqueue(integrationBus, { enqueueReminders });
    try {
      await integrationBus.publish('appointments', 'appointment.booked', {
        appointmentId: 'a9',
        beneficiaryId: 'b9',
        date: new Date(Date.now() + 72 * 3600_000),
        startTime: '11:00',
      });
      await new Promise(r => setImmediate(r));
      await new Promise(r => setImmediate(r));
      expect(enqueueReminders).toHaveBeenCalledTimes(1);
      expect(enqueueReminders.mock.calls[0][0].appointmentId).toBe('a9');
    } finally {
      if (unsub) unsub();
    }
  });
});

describe('W1527 static — env-gate + wiring', () => {
  test('subscriber is env-gated on the booked event + wired in startup', () => {
    expect(SUB_SRC).toMatch(/ENABLE_WHATSAPP_REMINDER_AUTO_ENQUEUE/);
    expect(SUB_SRC).toMatch(/!==\s*'true'/);
    expect(SUB_SRC).toMatch(/appointments\.appointment\.booked/);
    expect(STARTUP_SRC).toMatch(/wireWhatsappReminderAutoEnqueue/);
  });
});

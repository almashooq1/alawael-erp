'use strict';

/**
 * whatsapp-reminder-cancel-on-cancel-wave1534.test.js
 *
 * When an appointment is cancelled, its still-pending WhatsApp reminders must be
 * cancelled too — otherwise the W1525 sweeper would send "your appointment is
 * tomorrow" for an appointment that won't happen. Covers the service method
 * (MongoMemoryServer), the subscriber handler (mocked), the bus integration, and
 * the static wire.
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

const sub = require('../services/whatsapp/whatsappReminderEnqueueSubscriber');
const SUB_SRC = fs.readFileSync(
  path.join(__dirname, '../services/whatsapp/whatsappReminderEnqueueSubscriber.js'),
  'utf8'
);

let mongod;
let Reminder;
let svc;
const APPT = () => new mongoose.Types.ObjectId();

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'wa-reminder-cancel-1534' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  ({ AppointmentReminder: Reminder } = require('../models/appointmentScheduling.model'));
  svc = require('../services/whatsapp/whatsappAppointmentReminder.service');
  await Reminder.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Reminder.deleteMany({});
});

describe('W1534 cancelRemindersForAppointment (service, MMS)', () => {
  test('cancels pending reminders for the appointment; leaves others untouched', async () => {
    const appointment = APPT();
    const other = APPT();
    await Reminder.create([
      {
        appointment,
        channel: 'whatsapp',
        type: 'reminder_24h',
        scheduledAt: new Date(),
        status: 'pending',
      },
      {
        appointment,
        channel: 'whatsapp',
        type: 'reminder_2h',
        scheduledAt: new Date(),
        status: 'pending',
      },
      {
        appointment,
        channel: 'whatsapp',
        type: 'reminder_24h',
        scheduledAt: new Date(),
        status: 'sent',
      }, // already sent — keep
      {
        appointment: other,
        channel: 'whatsapp',
        type: 'reminder_24h',
        scheduledAt: new Date(),
        status: 'pending',
      }, // other appt — keep
    ]);

    const res = await svc.cancelRemindersForAppointment(String(appointment));
    expect(res.cancelled).toBe(2);

    expect(await Reminder.countDocuments({ appointment, status: 'cancelled' })).toBe(2);
    expect(await Reminder.countDocuments({ appointment, status: 'sent' })).toBe(1); // untouched
    expect(await Reminder.countDocuments({ appointment: other, status: 'pending' })).toBe(1); // untouched
  });

  test('invalid / unknown appointment id → 0, no throw', async () => {
    expect(await svc.cancelRemindersForAppointment('not-an-id')).toEqual({ cancelled: 0 });
    expect(await svc.cancelRemindersForAppointment(String(APPT()))).toEqual({ cancelled: 0 });
  });
});

describe('W1534 handleAppointmentCancelled (subscriber, mocked)', () => {
  test('delegates to cancelRemindersForAppointment', async () => {
    const cancelRemindersForAppointment = jest.fn(async () => ({ cancelled: 3 }));
    const r = await sub.handleAppointmentCancelled(
      { appointmentId: 'a1' },
      { cancelRemindersForAppointment }
    );
    expect(cancelRemindersForAppointment).toHaveBeenCalledWith('a1');
    expect(r).toEqual({ cancelled: 3, reason: 'ok' });
  });

  test('no appointmentId → no-op', async () => {
    const cancelRemindersForAppointment = jest.fn();
    expect(await sub.handleAppointmentCancelled({}, { cancelRemindersForAppointment })).toEqual({
      cancelled: 0,
      reason: 'no_appointment',
    });
    expect(cancelRemindersForAppointment).not.toHaveBeenCalled();
  });
});

describe('W1534 in-process integration (REAL bus)', () => {
  const orig = process.env[sub.ENV_FLAG];
  afterAll(() => {
    if (orig === undefined) delete process.env[sub.ENV_FLAG];
    else process.env[sub.ENV_FLAG] = orig;
  });
  test('publishing appointment.cancelled → cancelRemindersForAppointment called', async () => {
    process.env[sub.ENV_FLAG] = 'true';
    const { integrationBus } = require('../integration/systemIntegrationBus');
    integrationBus.initialize({ eventStore: null, messageQueue: null, socketEmitter: null });

    const cancelRemindersForAppointment = jest.fn(async () => ({ cancelled: 1 }));
    const unsub = sub.wireWhatsappReminderAutoEnqueue(integrationBus, {
      enqueueReminders: jest.fn(),
      cancelRemindersForAppointment,
    });
    try {
      await integrationBus.publish('appointments', 'appointment.cancelled', {
        appointmentId: 'a7',
      });
      await new Promise(r => setImmediate(r));
      await new Promise(r => setImmediate(r));
      expect(cancelRemindersForAppointment).toHaveBeenCalledWith('a7');
    } finally {
      if (unsub) unsub();
    }
  });
});

describe('W1534 static — wire subscribes to the cancelled event', () => {
  test('subscriber wires both booked + cancelled', () => {
    expect(sub.CANCEL_EVENT).toBe('appointments.appointment.cancelled');
    expect(SUB_SRC).toMatch(/bus\.subscribe\(CANCEL_EVENT/);
    expect(SUB_SRC).toMatch(/handleAppointmentCancelled/);
  });
});

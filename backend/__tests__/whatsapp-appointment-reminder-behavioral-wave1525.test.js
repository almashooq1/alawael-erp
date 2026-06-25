'use strict';

/**
 * whatsapp-appointment-reminder-behavioral-wave1525.test.js
 *
 * Behavioral coverage for the WhatsApp appointment-reminder dispatcher (W1525) —
 * the delivery that completes the dormant AppointmentReminder queue. Exercises
 * the real service against an in-memory MongoDB with only the transport
 * (whatsappService) + guardian resolver mocked.
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/whatsapp-appointment-reminder-behavioral-wave1525.test.js --runInBand
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Reminder;
let Consent;
let svc;

const APPT = () => new mongoose.Types.ObjectId();
const BENE = () => new mongoose.Types.ObjectId();

function whatsappOk() {
  return { sendNotification: jest.fn(async () => ({ success: true, stub: true })) };
}

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'wa-reminder-1525' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  ({ AppointmentReminder: Reminder } = require('../models/appointmentScheduling.model'));
  Consent = require('../models/WhatsAppConsent');
  svc = require('../services/whatsapp/whatsappAppointmentReminder.service');
  await Promise.all([Reminder.init(), Consent.init()]);
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Promise.all([Reminder.deleteMany({}), Consent.deleteMany({})]);
});

describe('W1525 enqueueReminders — idempotent producer', () => {
  test('creates a row per requested type; re-enqueue skips existing', async () => {
    const appointmentId = APPT();
    const when = new Date(Date.now() + 24 * 3600_000);
    const first = await svc.enqueueReminders({
      appointmentId,
      recipientPhone: '966500000001',
      when,
    });
    expect(first.created).toBe(2); // reminder_24h + reminder_2h
    const again = await svc.enqueueReminders({
      appointmentId,
      recipientPhone: '966500000001',
      when,
    });
    expect(again.created).toBe(0);
    expect(await Reminder.countDocuments({ appointment: appointmentId, channel: 'whatsapp' })).toBe(
      2
    );
  });

  test('scheduledAt = appointment time − lead', async () => {
    const appointmentId = APPT();
    const when = new Date('2026-07-01T10:00:00Z');
    await svc.enqueueReminders({
      appointmentId,
      recipientPhone: '966500000001',
      when,
      types: ['reminder_2h'],
    });
    const row = await Reminder.findOne({ appointment: appointmentId }).lean();
    expect(new Date(row.scheduledAt).toISOString()).toBe('2026-07-01T08:00:00.000Z'); // 2h before
  });

  test('rejects bad appointmentId / when', async () => {
    await expect(
      svc.enqueueReminders({ appointmentId: 'nope', when: new Date() })
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(
      svc.enqueueReminders({ appointmentId: APPT(), when: 'not-a-date' })
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('W1525 dispatchDueReminders — delivery, gating, idempotency', () => {
  async function pendingRow(over = {}) {
    return Reminder.create({
      appointment: APPT(),
      channel: 'whatsapp',
      type: 'reminder_24h',
      scheduledAt: new Date(Date.now() - 1000), // due
      status: 'pending',
      recipientPhone: '966500000001',
      ...over,
    });
  }

  test('sends a due reminder with consent → status sent', async () => {
    await Consent.setConsent('966500000001', true);
    await pendingRow();
    const wa = whatsappOk();
    const r = await svc.dispatchDueReminders({ deps: { whatsappService: wa } });
    expect(r).toMatchObject({ due: 1, sent: 1, failed: 0 });
    expect(wa.sendNotification).toHaveBeenCalledTimes(1);
    const row = await Reminder.findOne({}).lean();
    expect(row.status).toBe('sent');
    expect(row.sentAt).toBeTruthy();
  });

  test('future reminder is NOT picked up', async () => {
    await Consent.setConsent('966500000001', true);
    await pendingRow({ scheduledAt: new Date(Date.now() + 3600_000) });
    const wa = whatsappOk();
    const r = await svc.dispatchDueReminders({ deps: { whatsappService: wa } });
    expect(r.due).toBe(0);
    expect(wa.sendNotification).not.toHaveBeenCalled();
  });

  test('consent denied → cancelled, never sent', async () => {
    await pendingRow(); // no consent record → canMessage denies
    const wa = whatsappOk();
    const r = await svc.dispatchDueReminders({ deps: { whatsappService: wa } });
    expect(r.sent).toBe(0);
    expect(wa.sendNotification).not.toHaveBeenCalled();
    expect((await Reminder.findOne({}).lean()).status).toBe('cancelled');
  });

  test('no phone + no beneficiary → cancelled', async () => {
    await pendingRow({ recipientPhone: undefined });
    const r = await svc.dispatchDueReminders({ deps: { whatsappService: whatsappOk() } });
    expect(r.sent).toBe(0);
    expect((await Reminder.findOne({}).lean()).status).toBe('cancelled');
  });

  test('resolves phone via guardian when recipientPhone absent', async () => {
    await Consent.setConsent('966599999999', true);
    const beneficiary = BENE();
    await pendingRow({ recipientPhone: undefined, beneficiary });
    const wa = whatsappOk();
    const getGuardianPhone = jest.fn(async () => ({
      phone: '966599999999',
      beneficiaryName: 'سعد',
    }));
    const r = await svc.dispatchDueReminders({ deps: { whatsappService: wa, getGuardianPhone } });
    expect(getGuardianPhone).toHaveBeenCalledWith(beneficiary);
    expect(r.sent).toBe(1);
    expect(wa.sendNotification.mock.calls[0][0]).toBe('966599999999');
  });

  test('send failure → failed + attempts incremented; a sent row is not re-sent', async () => {
    await Consent.setConsent('966500000001', true);
    await pendingRow();
    const failing = { sendNotification: jest.fn(async () => ({ success: false })) };
    const r1 = await svc.dispatchDueReminders({ deps: { whatsappService: failing } });
    expect(r1.failed).toBe(1);
    const after = await Reminder.findOne({}).lean();
    expect(after.status).toBe('failed');
    expect(after.attempts).toBe(1);

    // second sweep retries the failed one; this time it succeeds
    const wa = whatsappOk();
    const r2 = await svc.dispatchDueReminders({ deps: { whatsappService: wa } });
    expect(r2.sent).toBe(1);
    expect((await Reminder.findOne({}).lean()).status).toBe('sent');

    // third sweep: nothing due (it's sent) → no further send
    wa.sendNotification.mockClear();
    const r3 = await svc.dispatchDueReminders({ deps: { whatsappService: wa } });
    expect(r3.due).toBe(0);
    expect(wa.sendNotification).not.toHaveBeenCalled();
  });

  test('stops retrying after maxAttempts', async () => {
    await Consent.setConsent('966500000001', true);
    await pendingRow({ status: 'failed', attempts: svc.MAX_ATTEMPTS });
    const wa = whatsappOk();
    const r = await svc.dispatchDueReminders({ deps: { whatsappService: wa } });
    expect(r.due).toBe(0);
    expect(wa.sendNotification).not.toHaveBeenCalled();
  });
});

describe('W1525 getReminderStats', () => {
  test('counts whatsapp reminders by status', async () => {
    await Reminder.create([
      {
        appointment: APPT(),
        channel: 'whatsapp',
        type: 'reminder_24h',
        scheduledAt: new Date(),
        status: 'sent',
      },
      {
        appointment: APPT(),
        channel: 'whatsapp',
        type: 'reminder_24h',
        scheduledAt: new Date(),
        status: 'pending',
      },
      {
        appointment: APPT(),
        channel: 'sms',
        type: 'reminder_24h',
        scheduledAt: new Date(),
        status: 'sent',
      }, // other channel — ignored
    ]);
    const stats = await svc.getReminderStats({});
    expect(stats.sent).toBe(1);
    expect(stats.pending).toBe(1);
  });
});

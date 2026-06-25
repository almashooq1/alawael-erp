'use strict';

/**
 * whatsapp-risk-aware-reminders-wave1537.test.js — intelligent reminder intensity.
 * Pure band→types + the predictor-backed resolver (mocked) + the subscriber wire.
 */

const policy = require('../services/whatsapp/whatsappReminderRiskPolicy');
const sub = require('../services/whatsapp/whatsappReminderEnqueueSubscriber');

describe('W1537 reminderTypesForBand (pure)', () => {
  test('low risk → single gentle reminder; else two-touch', () => {
    expect(policy.reminderTypesForBand('low')).toEqual(['reminder_24h']);
    expect(policy.reminderTypesForBand('medium')).toEqual(['reminder_24h', 'reminder_2h']);
    expect(policy.reminderTypesForBand('high')).toEqual(['reminder_24h', 'reminder_2h']);
    expect(policy.reminderTypesForBand(undefined)).toEqual(['reminder_24h', 'reminder_2h']);
  });
});

describe('W1537 riskAwareReminderTypes (predictor-backed, defensive)', () => {
  const orig = process.env[policy.ENV_FLAG];
  afterEach(() => {
    if (orig === undefined) delete process.env[policy.ENV_FLAG];
    else process.env[policy.ENV_FLAG] = orig;
  });

  test('flag OFF → null (caller uses default)', async () => {
    delete process.env[policy.ENV_FLAG];
    const predictForAppointment = jest.fn();
    expect(await policy.riskAwareReminderTypes('a1', { predictForAppointment })).toBeNull();
    expect(predictForAppointment).not.toHaveBeenCalled();
  });

  test('flag ON + low band → single reminder (dryRun used)', async () => {
    process.env[policy.ENV_FLAG] = 'true';
    const predictForAppointment = jest.fn(async () => ({ ok: true, band: 'low' }));
    expect(await policy.riskAwareReminderTypes('a1', { predictForAppointment })).toEqual(['reminder_24h']);
    expect(predictForAppointment).toHaveBeenCalledWith('a1', { dryRun: true });
  });

  test('flag ON + high band → two-touch', async () => {
    process.env[policy.ENV_FLAG] = 'true';
    const predictForAppointment = jest.fn(async () => ({ ok: true, band: 'high' }));
    expect(await policy.riskAwareReminderTypes('a1', { predictForAppointment })).toEqual([
      'reminder_24h',
      'reminder_2h',
    ]);
  });

  test('predictor error / not-ok → null (defensive)', async () => {
    process.env[policy.ENV_FLAG] = 'true';
    expect(
      await policy.riskAwareReminderTypes('a1', {
        predictForAppointment: async () => {
          throw new Error('boom');
        },
      })
    ).toBeNull();
    expect(
      await policy.riskAwareReminderTypes('a1', { predictForAppointment: async () => ({ ok: false }) })
    ).toBeNull();
  });
});

describe('W1537 subscriber passes risk-aware types to enqueue', () => {
  test('handleAppointmentBooked forwards the resolved types', async () => {
    const enqueueReminders = jest.fn(async () => ({ created: 1 }));
    const riskAwareReminderTypes = jest.fn(async () => ['reminder_24h']);
    await sub.handleAppointmentBooked(
      { appointmentId: 'a1', beneficiaryId: 'b1', date: new Date(Date.now() + 48 * 3600_000), startTime: '09:00' },
      { enqueueReminders, riskAwareReminderTypes }
    );
    expect(riskAwareReminderTypes).toHaveBeenCalledWith('a1', expect.any(Object));
    expect(enqueueReminders).toHaveBeenCalledWith(expect.objectContaining({ types: ['reminder_24h'] }));
  });

  test('null risk types → enqueue without an explicit types (default set)', async () => {
    const enqueueReminders = jest.fn(async () => ({ created: 2 }));
    const riskAwareReminderTypes = jest.fn(async () => null);
    await sub.handleAppointmentBooked(
      { appointmentId: 'a1', date: new Date(Date.now() + 48 * 3600_000), startTime: '09:00' },
      { enqueueReminders, riskAwareReminderTypes }
    );
    expect(enqueueReminders.mock.calls[0][0].types).toBeUndefined();
  });
});

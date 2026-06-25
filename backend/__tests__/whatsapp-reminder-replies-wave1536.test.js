'use strict';

/**
 * whatsapp-reminder-replies-wave1536.test.js — the two-way reminder loop.
 * Pure classifier + behavioral handler (mocked models) + static webhook wire.
 */

const fs = require('fs');
const path = require('path');

const h = require('../services/whatsapp/whatsappReminderReplyHandler');

const WEBHOOK_SRC = fs.readFileSync(
  path.join(__dirname, '../services/whatsapp/whatsappWebhook.service.js'),
  'utf8'
);

describe('W1536 classifyReply (pure, conservative)', () => {
  test('confirm words', () => {
    expect(h.classifyReply('نعم')).toBe('confirm');
    expect(h.classifyReply('تمام')).toBe('confirm');
    expect(h.classifyReply('yes')).toBe('confirm');
    expect(h.classifyReply('  أكيد  ')).toBe('confirm');
    expect(h.classifyReply('نعم اكيد ابني بيحضر')).toBe('confirm'); // first token
  });
  test('cancel words', () => {
    expect(h.classifyReply('إلغاء')).toBe('cancel');
    expect(h.classifyReply('لا')).toBe('cancel');
    expect(h.classifyReply('cancel')).toBe('cancel');
  });
  test('no false-positive on long unrelated messages / empty', () => {
    expect(h.classifyReply('شكراً جزيلاً للفريق على الجهد المبذول')).toBeNull();
    expect(h.classifyReply('متى يطلع تقرير ابني؟')).toBeNull();
    expect(h.classifyReply('')).toBeNull();
    expect(h.classifyReply(null)).toBeNull();
  });
});

// ── behavioral handler with mocked models ──
function reminderModel(row) {
  return {
    find: () => ({ sort: () => ({ limit: () => ({ lean: async () => (row ? [row] : []) }) }) }),
  };
}
function apptModel(doc) {
  return { findById: async () => doc };
}

describe('W1536 handleReminderReply (behavioral)', () => {
  const baseDeps = (over = {}) => ({
    Reminder: reminderModel({ appointment: 'ap1', recipientPhone: '966500000001' }),
    Appointment: apptModel({ _id: 'ap1', status: 'PENDING', save: jest.fn(async () => {}) }),
    whatsappService: { sendNotification: jest.fn(async () => ({ success: true })) },
    ...over,
  });

  test('confirm → appointment CONFIRMED + ack', async () => {
    const appt = { _id: 'ap1', status: 'PENDING', save: jest.fn(async () => {}) };
    const deps = baseDeps({ Appointment: apptModel(appt) });
    const r = await h.handleReminderReply({ phone: '966500000001', text: 'نعم' }, deps);
    expect(r).toMatchObject({ action: 'confirm', applied: true, appointmentId: 'ap1' });
    expect(appt.status).toBe('CONFIRMED');
    expect(appt.save).toHaveBeenCalledTimes(1);
    expect(deps.whatsappService.sendNotification).toHaveBeenCalledTimes(1);
  });

  test('cancel → appointment CANCELLED (+ reason) + ack', async () => {
    const appt = { _id: 'ap1', status: 'CONFIRMED', save: jest.fn(async () => {}) };
    const deps = baseDeps({ Appointment: apptModel(appt) });
    const r = await h.handleReminderReply({ phone: '966500000001', text: 'إلغاء' }, deps);
    expect(r).toMatchObject({ action: 'cancel', applied: true });
    expect(appt.status).toBe('CANCELLED');
    expect(appt.cancellationReason).toBe('cancelled_by_family_whatsapp');
  });

  test('non confirm/cancel text → none, no model touched', async () => {
    const deps = baseDeps();
    deps.Reminder.find = jest.fn();
    expect(await h.handleReminderReply({ phone: 'x', text: 'شكرا' }, deps)).toEqual({ action: 'none' });
    expect(deps.Reminder.find).not.toHaveBeenCalled();
  });

  test('no matching reminder → matched:false, no appointment write', async () => {
    const appt = { _id: 'ap1', status: 'PENDING', save: jest.fn() };
    const deps = baseDeps({ Reminder: reminderModel(null), Appointment: apptModel(appt) });
    const r = await h.handleReminderReply({ phone: 'x', text: 'نعم' }, deps);
    expect(r).toMatchObject({ action: 'confirm', matched: false });
    expect(appt.save).not.toHaveBeenCalled();
  });

  test('already-terminal appointment → applied:false (no override)', async () => {
    const appt = { _id: 'ap1', status: 'CANCELLED', save: jest.fn() };
    const deps = baseDeps({ Appointment: apptModel(appt) });
    const r = await h.handleReminderReply({ phone: '966500000001', text: 'نعم' }, deps);
    expect(r).toMatchObject({ action: 'confirm', matched: true, applied: false });
    expect(appt.save).not.toHaveBeenCalled();
  });
});

describe('W1536 static — webhook wires it env-gated + defensively', () => {
  test('webhook calls handleReminderReply behind the env flag, inside try/catch', () => {
    expect(WEBHOOK_SRC).toMatch(/ENABLE_WHATSAPP_REMINDER_REPLIES/);
    expect(WEBHOOK_SRC).toMatch(/handleReminderReply/);
    expect(WEBHOOK_SRC).toMatch(/whatsapp-reminder-reply'\]\s*\.warn|\[whatsapp-reminder-reply\] skipped/);
    expect(h.ENV_FLAG).toBe('ENABLE_WHATSAPP_REMINDER_REPLIES');
  });
});

'use strict';

/**
 * whatsapp-appointment-reminder-wave1525.test.js — static drift guard for the
 * WhatsApp appointment-reminder delivery (W1525). Pairs with the behavioral
 * suite whatsapp-appointment-reminder-behavioral-wave1525 (the runtime logic).
 *
 * Asserts the wiring the behavioral test can't: env-gate default-OFF, the
 * consent/guardian reuse (no duplicated send/consent logic), the atomic claim,
 * the route mount, and the app.js bootstrap wire.
 */

const fs = require('fs');
const path = require('path');

const svc = require('../services/whatsapp/whatsappAppointmentReminder.service');

const svcDir = path.join(__dirname, '../services/whatsapp');
const SVC_SRC = fs.readFileSync(path.join(svcDir, 'whatsappAppointmentReminder.service.js'), 'utf8');
const BOOT_SRC = fs.readFileSync(path.join(__dirname, '../startup/whatsappReminderBootstrap.js'), 'utf8');
const ROUTE_SRC = fs.readFileSync(path.join(__dirname, '../routes/whatsapp-reminders.routes.js'), 'utf8');
const REG_SRC = fs.readFileSync(path.join(__dirname, '../routes/registries/communication.registry.js'), 'utf8');
const APP_SRC = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');

describe('W1525 pure helpers', () => {
  test('reminderMessage builds an Arabic body per type + substitutes name', () => {
    expect(svc.reminderMessage('reminder_24h', { beneficiaryName: 'سعد' })).toMatch(/سعد/);
    expect(svc.reminderMessage('reminder_2h', {})).toMatch(/ساعتين/);
    expect(svc.reminderMessage('unknown-type', {})).toBe(svc.reminderMessage('reminder_24h', {}));
    expect(svc.reminderMessage('reminder_24h', {}).length).toBeLessThanOrEqual(1024);
  });

  test('missingTypes returns only the not-yet-queued types (idempotency core)', () => {
    expect(svc.missingTypes(['reminder_24h', 'reminder_2h'], ['reminder_24h'])).toEqual(['reminder_2h']);
    expect(svc.missingTypes(['reminder_24h', 'reminder_24h'], [])).toEqual(['reminder_24h']); // de-duped
    expect(svc.missingTypes(['reminder_2h'], ['reminder_2h'])).toEqual([]);
  });

  test('reminderTitle distinguishes confirmation', () => {
    expect(svc.reminderTitle('confirmation')).toMatch(/تأكيد/);
    expect(svc.reminderTitle('reminder_24h')).toMatch(/تذكير/);
  });

  test('constants: whatsapp channel + bounded attempts', () => {
    expect(svc.CHANNEL).toBe('whatsapp');
    expect(svc.MAX_ATTEMPTS).toBeGreaterThanOrEqual(1);
    expect(svc.ENV_FLAG).toBe('ENABLE_WHATSAPP_APPOINTMENT_REMINDERS');
  });
});

describe('W1525 static — no duplicated send/consent + safe claim', () => {
  test('reuses the shared guardian resolver (no inline copy)', () => {
    expect(SVC_SRC).toMatch(/require\(['"]\.\/whatsappGuardianResolver['"]\)/);
    expect(SVC_SRC).not.toMatch(/function pickGuardian/);
  });
  test('consent-gated send + atomic attempt-claim', () => {
    expect(SVC_SRC).toMatch(/canMessage/);
    expect(SVC_SRC).toMatch(/findOneAndUpdate/);
    expect(SVC_SRC).toMatch(/\$inc:\s*\{\s*attempts/);
    expect(SVC_SRC).toMatch(/attempts:\s*\{\s*\$lt:\s*MAX_ATTEMPTS/);
  });
});

describe('W1525 static — env-gated default OFF + route + wiring', () => {
  test('bootstrap is default-OFF (env flag must equal "true")', () => {
    expect(BOOT_SRC).toMatch(/ENABLE_WHATSAPP_APPOINTMENT_REMINDERS/);
    expect(BOOT_SRC).toMatch(/!==\s*'true'/);
    expect(BOOT_SRC).toMatch(/\.unref\(\)/);
  });
  test('routes authenticate + role-gate writes', () => {
    expect(ROUTE_SRC).toMatch(/router\.use\(authenticate\)/);
    expect(ROUTE_SRC).toMatch(/authorize\(WRITE_ROLES\)/);
  });
  test('mounted in the communication registry + wired in app.js', () => {
    expect(REG_SRC).toMatch(/dualMount\(app, 'whatsapp-reminders'/);
    expect(APP_SRC).toMatch(/bootstrapWhatsappReminder/);
  });
});

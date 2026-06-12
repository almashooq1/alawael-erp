'use strict';

/**
 * W1270 — EmailManager → registry bridge + notify-channel migration.
 *
 *  1. BRIDGE — every mapped legacy key renders through the registry from a
 *     realistic legacy data shape; an UNSATISFIABLE shape returns null
 *     (legacy fallback) instead of throwing; unmapped keys return null.
 *  2. EmailManager.sendTemplate consults the bridge BEFORE the legacy engine
 *     (static) and tags metadata.registryBridge.
 *  3. notify-channel-email: zero inline HTML left; renders via the new
 *     MEASURE_ALERT_REASSIGNED template with direction semantics preserved
 *     (from/to) — behavioral through the exported _renderEmail.
 */

const fs = require('fs');
const path = require('path');

const BACKEND = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(BACKEND, rel), 'utf8');

const { BRIDGE, tryRegistryRender } = require('../services/email/registryBridge');

describe('W1270 bridge — legacy keys render through the registry', () => {
  const HAPPY = {
    WELCOME: { email: 'u@x.sa', name: 'سارة' },
    OTP_CODE: { email: 'u@x.sa', otp: '123456', expiry: 10 },
    APPOINTMENT_REMINDER: {
      beneficiaryName: 'محمد',
      serviceType: 'نطق',
      therapistName: 'أ. ريم',
      date: '2026-06-15',
      time: '10:30',
    },
    APPOINTMENT_CANCELLATION: {
      beneficiaryName: 'محمد',
      serviceType: 'نطق',
      date: '2026-06-15',
      time: '10:30',
    },
    SESSION_SUMMARY: {
      beneficiaryName: 'محمد',
      serviceType: 'نطق',
      therapistName: 'أ. ريم',
      summary: 'عمل ممتاز اليوم على المفردات',
    },
    INVOICE: { customerName: 'أ. سعود', invoiceNumber: 'INV-1', amount: '2400', dueDate: '2026-06-25' },
    PAYMENT_CONFIRMATION: { customerName: 'أ. سعود', amount: '2400', receiptNumber: 'RC-1' },
    NEW_COMMUNICATION: { title: 'تعميم', referenceNumber: 'C-1', senderName: 'HR', subject: 'نص' },
    APPROVAL_REQUEST: {
      title: 'اعتماد',
      referenceNumber: 'C-2',
      stageName: 'مدير',
      subject: 'نص',
      approveUrl: 'https://x/a',
      rejectUrl: 'https://x/r',
    },
    STATUS_CHANGE: { title: 'طلب', referenceNumber: 'C-3', oldStatus: 'قيد', newStatus: 'مكتمل' },
  };

  test('every mapped key has a happy-path fixture in this guard (closed list)', () => {
    expect(Object.keys(HAPPY).sort()).toEqual(Object.keys(BRIDGE).sort());
  });

  for (const [legacyKey, data] of Object.entries(HAPPY)) {
    test(`${legacyKey} → ${BRIDGE[legacyKey].key} renders (rtl + text alt)`, () => {
      const out = tryRegistryRender(legacyKey, data);
      expect(out).not.toBeNull();
      expect(out.key).toBe(BRIDGE[legacyKey].key);
      expect(out.html).toContain('dir="rtl"');
      expect(out.text.length).toBeGreaterThan(10);
      expect(out.html).not.toMatch(/\{\{\s*[A-Za-z_]/);
    });
  }

  test('unsatisfiable data → null (legacy fallback), never a throw', () => {
    expect(tryRegistryRender('APPOINTMENT_REMINDER', { foo: 'bar' })).toBeNull();
    expect(tryRegistryRender('INVOICE', {})).toBeNull();
  });

  test('unmapped legacy keys → null untouched', () => {
    expect(tryRegistryRender('EMAIL_VERIFICATION', { email: 'a@b.c' })).toBeNull();
    expect(tryRegistryRender('TOTALLY_UNKNOWN', {})).toBeNull();
  });

  test('OTP bridge maps expiry → expiryMinutes into the reset copy', () => {
    const out = tryRegistryRender('OTP_CODE', { email: 'u@x.sa', otp: '99', expiry: 7 });
    expect(out.subject).toContain('7');
    expect(out.html).toContain('99');
  });
});

describe('W1270 static wiring', () => {
  test('EmailManager.sendTemplate consults the bridge BEFORE the legacy engine', () => {
    const src = read('services/email/EmailManager.js');
    const fnStart = src.indexOf('async sendTemplate(');
    const block = src.slice(fnStart, fnStart + 1600);
    const bridgeIdx = block.indexOf('tryRegistryRender');
    const legacyIdx = block.indexOf('this.templateEngine.render');
    expect(bridgeIdx).toBeGreaterThan(-1);
    expect(legacyIdx).toBeGreaterThan(-1);
    expect(bridgeIdx).toBeLessThan(legacyIdx);
    expect(block).toContain('registryBridge: true');
    expect(block).toContain('text: bridged.text');
  });

  test('notify-channel-email: zero inline HTML; renders via the new template', () => {
    const src = read('services/notify-channel-email.service.js');
    expect(src).not.toMatch(/dir="rtl"/);
    expect(src).toContain("renderTemplate('MEASURE_ALERT_REASSIGNED'");
  });
});

describe('W1270 behavioral — notify-channel direction semantics preserved', () => {
  const { _renderEmail } = require('../services/notify-channel-email.service');
  const payload = {
    alertType: 'PLATEAU_DETECTED',
    severity: 'high',
    fromTherapistId: 'aaaaaaaaaaaaaaaaaaaa1111',
    toTherapistId: 'bbbbbbbbbbbbbbbbbbbb2222',
    reason: 'إعادة توزيع',
  };
  const recipient = { firstName_ar: 'نورة', lastName_ar: 'الشمري' };

  test('isTo → «استلمت حالة جديدة» + other = FROM therapist tail', () => {
    const out = _renderEmail({ payload, recipient, isFrom: false, isTo: true });
    expect(out.subject).toContain('استلمت حالة جديدة');
    expect(out.html).toContain('نورة الشمري');
    expect(out.html).toContain('aaaa1111'.slice(-8));
    expect(out.html).toContain('PLATEAU_DETECTED');
    expect(out.text).toContain('PLATEAU_DETECTED');
  });

  test('isFrom → «تم نقل حالة من قائمتك» + other = TO therapist tail', () => {
    const out = _renderEmail({ payload, recipient, isFrom: true, isTo: false });
    expect(out.subject).toContain('تم نقل حالة من قائمتك');
    expect(out.html).toContain('bbbb2222'.slice(-8));
  });
});

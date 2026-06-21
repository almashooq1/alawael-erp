/**
 * W1418 — WhatsApp bot staff handoff summary.
 *
 * On escalation the staff notification body was a raw JSON dump of the collected
 * fields. W1418 renders a clean, human-readable Arabic card with labeled fields
 * (labels auto-derived from each unit's step prompts), so staff can act without
 * re-reading the conversation. Pure + testable.
 */
'use strict';

const reg = require('../intelligence/whatsapp-bot-flow.registry');
const { shortLabel, COLLECTED_LABELS, formatEscalationSummary } = reg;

describe('W1418 — shortLabel', () => {
  test('takes the question stem before colon / paren / question mark', () => {
    expect(shortLabel('اسم المستفيد:')).toBe('اسم المستفيد');
    expect(shortLabel('اليوم أو التاريخ المفضل (مثال: الأحد):')).toBe('اليوم أو التاريخ المفضل');
    expect(shortLabel('ماذا ترغب أن تفعل؟ (حجز / تعديل)')).toBe('ماذا ترغب أن تفعل');
    expect(shortLabel('')).toBe('');
    expect(shortLabel(null)).toBe('');
  });
});

describe('W1418 — COLLECTED_LABELS (auto-built from unit steps)', () => {
  test('maps the common collected keys to short Arabic labels', () => {
    expect(COLLECTED_LABELS.beneficiaryName).toBe('اسم المستفيد');
    expect(COLLECTED_LABELS.preferredDay).toBe('اليوم أو التاريخ المفضل');
    expect(COLLECTED_LABELS.guardianName).toBe('اسم ولي الأمر');
    expect(COLLECTED_LABELS.age).toBe('عمر المستفيد');
  });
});

describe('W1418 — formatEscalationSummary', () => {
  const sideEffect = {
    kind: 'create_appointment_request',
    collected: {
      action: 'حجز',
      beneficiaryName: 'محمد علي',
      preferredDay: 'الأحد',
      preferredPeriod: '', // empty → skipped
      department: 'نطق',
      notes: null, // null → skipped
    },
  };

  test('renders a header with reason + sender + phone', () => {
    const out = formatEscalationSummary(sideEffect, {
      senderName: 'أم محمد',
      phone: '966500000001',
      reason: 'طلب موعد عبر بوت الواتساب',
    });
    const lines = out.split('\n');
    expect(lines[0]).toBe('📋 طلب موعد عبر بوت الواتساب');
    expect(lines[1]).toBe('👤 أم محمد — 966500000001');
  });

  test('renders labeled fields and SKIPS empty/null ones', () => {
    const out = formatEscalationSummary(sideEffect, { reason: 'ر' });
    expect(out).toContain('• اسم المستفيد: محمد علي');
    expect(out).toContain('• اليوم أو التاريخ المفضل: الأحد');
    expect(out).toContain('• القسم: نطق');
    expect(out).not.toContain('preferredPeriod');
    expect(out).not.toContain('notes');
  });

  test('unknown keys fall back to the raw key', () => {
    const out = formatEscalationSummary({ kind: 'x', collected: { weirdKey: 'قيمة' } }, {});
    expect(out).toContain('• weirdKey: قيمة');
  });

  test('no collected fields → an explicit "no details" line (never empty)', () => {
    const out = formatEscalationSummary(
      { kind: 'callback', collected: {} },
      { reason: 'طلب تواصل' }
    );
    expect(out).toContain('📋 طلب تواصل');
    expect(out).toContain('لا توجد تفاصيل');
  });

  test('is robust to a missing/empty sideEffect', () => {
    expect(() => formatEscalationSummary(null, {})).not.toThrow();
    expect(() => formatEscalationSummary({}, {})).not.toThrow();
  });
});

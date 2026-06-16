'use strict';

/**
 * W1372 Wave 2 — guardian-verified live-data lookups.
 *
 * PURE unit tests for the privacy-critical logic: the authorization gate
 * (`isAuthorizedMember` + `selectBeneficiary`), the period/day parsers, and the
 * Arabic formatters. The DB-touching resolvers are thin wrappers over these and
 * are intentionally NOT exercised here (no Mongo) — the security guarantee
 * lives entirely in the pure functions tested below.
 */

const svc = require('../services/whatsapp/whatsappBotData.service');

describe('W1372 Wave 2 — authorization gate', () => {
  test('isAuthorizedMember: portal/legal-guardian/primary-contact qualify; bare contact does not', () => {
    expect(svc.isAuthorizedMember({ portalAccess: { enabled: true } })).toBe(true);
    expect(svc.isAuthorizedMember({ isLegalGuardian: true })).toBe(true);
    expect(svc.isAuthorizedMember({ isPrimaryContact: true })).toBe(true);
    expect(svc.isAuthorizedMember({ relationship: 'uncle_aunt' })).toBe(false);
    expect(svc.isAuthorizedMember({ portalAccess: { enabled: false } })).toBe(false);
    expect(svc.isAuthorizedMember(null)).toBe(false);
  });

  test('beneficiaryDisplayName: Arabic-first, top-level fields (NOT personalInfo.*)', () => {
    expect(svc.beneficiaryDisplayName({ fullNameArabic: 'سارة أحمد' })).toBe('سارة أحمد');
    expect(svc.beneficiaryDisplayName({ firstName_ar: 'سارة', lastName_ar: 'أحمد' })).toBe(
      'سارة أحمد'
    );
    expect(svc.beneficiaryDisplayName({ firstName: 'Sara', lastName: 'Ahmed' })).toBe('Sara Ahmed');
    expect(svc.beneficiaryDisplayName({ name: 'سارة' })).toBe('سارة');
    // personalInfo is NOT a real schema path — must NOT be read
    expect(svc.beneficiaryDisplayName({ personalInfo: { firstName: 'سارة' } })).toBe('');
    expect(svc.beneficiaryDisplayName(null)).toBe('');
  });

  test('selectBeneficiary: zero candidates → not_authorized (never guesses)', () => {
    expect(svc.selectBeneficiary([], 'سارة')).toEqual({ ok: false, reason: 'not_authorized' });
  });

  test('selectBeneficiary: single child → returned regardless of typed name', () => {
    const r = svc.selectBeneficiary([{ beneficiaryId: 'b1', name: 'سارة أحمد' }], 'اسم مختلف');
    expect(r).toEqual({ ok: true, beneficiaryId: 'b1' });
  });

  test('selectBeneficiary: multiple children → typed name disambiguates to one', () => {
    const cands = [
      { beneficiaryId: 'b1', name: 'سارة أحمد' },
      { beneficiaryId: 'b2', name: 'خالد أحمد' },
    ];
    expect(svc.selectBeneficiary(cands, 'خالد')).toEqual({ ok: true, beneficiaryId: 'b2' });
  });

  test('selectBeneficiary: multiple children + no name → ambiguous (declines)', () => {
    const cands = [
      { beneficiaryId: 'b1', name: 'سارة' },
      { beneficiaryId: 'b2', name: 'خالد' },
    ];
    const r = svc.selectBeneficiary(cands, '');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('ambiguous_no_name');
    expect(r.count).toBe(2);
  });

  test('selectBeneficiary: multiple children + non-matching name → declines (no leak)', () => {
    const cands = [
      { beneficiaryId: 'b1', name: 'سارة' },
      { beneficiaryId: 'b2', name: 'خالد' },
    ];
    const r = svc.selectBeneficiary(cands, 'محمد');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('ambiguous_no_match');
  });

  test('selectBeneficiary: name matching two siblings → declines rather than pick', () => {
    const cands = [
      { beneficiaryId: 'b1', name: 'سارة أحمد' },
      { beneficiaryId: 'b2', name: 'سارة محمد' },
    ];
    const r = svc.selectBeneficiary(cands, 'سارة');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('ambiguous_multiple_match');
  });
});

describe('W1372 Wave 2 — formatters', () => {
  test('formatAttendance present record shows status + times', () => {
    const rec = {
      status: 'present',
      checkInTime: new Date('2026-06-16T08:05:00'),
      checkOutTime: new Date('2026-06-16T13:30:00'),
    };
    const out = svc.formatAttendance(rec, 'سارة', '2026-06-16');
    expect(out).toMatch(/سارة/);
    expect(out).toMatch(/حاضر/);
    expect(out).toMatch(/08:05/);
    expect(out).toMatch(/13:30/);
  });

  test('formatAttendance with no record states absence of a log', () => {
    const out = svc.formatAttendance(null, 'سارة', 'اليوم');
    expect(out).toMatch(/لا يوجد سجل حضور/);
  });

  test('formatSessionReports renders specialty, therapist, goal counts + privacy footer', () => {
    const sessions = [
      {
        scheduledDate: new Date('2026-06-15T10:00:00'),
        specialty: 'speech_therapy',
        therapistId: { firstName: 'منى', lastName: 'سعد' },
        plan: 'العمل على نطق حرف الراء',
        goalProgress: [{ rating: 'achieved' }, { rating: 'emerging' }],
      },
    ];
    const out = svc.formatSessionReports(sessions, 'سارة');
    expect(out).toMatch(/نطق وتخاطب/);
    expect(out).toMatch(/منى سعد/);
    expect(out).toMatch(/نطق حرف الراء/);
    expect(out).toMatch(/1\/2/);
    expect(out).toMatch(/خاص بولي الأمر/);
  });

  test('formatSessionReports empty → no-report message', () => {
    expect(svc.formatSessionReports([], 'سارة')).toMatch(/لا يوجد تقرير جلسة/);
  });

  test('formatBilling sums outstanding balance + shows latest status + card warning', () => {
    const invoices = [
      {
        balance_due: 300,
        status: 'partially_paid',
        invoice_number: 'INV-2',
        due_date: new Date('2026-06-20'),
      },
      { balance_due: 150, status: 'issued', invoice_number: 'INV-1' },
    ];
    const out = svc.formatBilling(invoices, 'سارة');
    expect(out).toMatch(/450/); // 300 + 150
    expect(out).toMatch(/مدفوعة جزئياً/);
    expect(out).toMatch(/لا تشاركوا بيانات البطاقات/);
  });

  test('formatBilling empty → no-invoices message', () => {
    expect(svc.formatBilling([], 'سارة')).toMatch(/لا توجد فواتير/);
  });
});

describe('W1372 Wave 2 — period / day parsing (deterministic via injected now)', () => {
  const now = new Date('2026-06-16T10:00:00');

  test('parsePeriod resolves the 4 spec windows', () => {
    expect(svc.parsePeriod('آخر تقرير', now).latestOnly).toBe(true);
    expect(svc.parsePeriod('هذا الأسبوع', now).gte.getTime()).toBe(now.getTime() - 7 * 86400000);
    expect(svc.parsePeriod('هذا الشهر', now).gte.getTime()).toBe(now.getTime() - 30 * 86400000);
    expect(svc.parsePeriod('اليوم', now).label).toBe('اليوم');
  });

  test('parsePeriod default falls back to last 30 days', () => {
    const p = svc.parsePeriod('شيء غامض', now);
    expect(p.latestOnly).toBe(false);
    expect(p.gte.getTime()).toBe(now.getTime() - 30 * 86400000);
  });

  test('parseDay: blank / "اليوم" → today; explicit date → that day window', () => {
    expect(svc.parseDay('اليوم', now).label).toBe('اليوم');
    expect(svc.parseDay('', now).label).toBe('اليوم');
    const d = svc.parseDay('2026-06-10', now);
    expect(d.label).toMatch(/2026-06-10/);
    expect(d.start.getTime()).toBeLessThanOrEqual(d.end.getTime());
  });
});

describe('W1372 Wave 2 — dispatch guards', () => {
  test('isLookupKind only matches the 3 read-only lookups', () => {
    expect(svc.isLookupKind('lookup_attendance')).toBe(true);
    expect(svc.isLookupKind('lookup_session_report')).toBe(true);
    expect(svc.isLookupKind('lookup_billing')).toBe(true);
    expect(svc.isLookupKind('create_complaint')).toBe(false);
    expect(svc.isLookupKind('none')).toBe(false);
  });

  test('answerLookup rejects a non-lookup kind before touching any model', async () => {
    const r = await svc.answerLookup('create_complaint', '966500000000', {});
    expect(r).toEqual({ ok: false, reason: 'unsupported_kind' });
  });

  test('DEPT_KEY_TO_SPECIALTY maps the 4 department keys', () => {
    expect(svc.DEPT_KEY_TO_SPECIALTY).toEqual({
      occupational: 'occupational_therapy',
      speech: 'speech_therapy',
      special_education: 'educational',
      behavior: 'behavioral_therapy',
    });
  });
});

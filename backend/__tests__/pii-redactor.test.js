/**
 * pii-redactor.test.js — covers redaction rules that protect PDPL-regulated
 * fields before they are persisted to logs, DLQ payloads, or audit rows.
 *
 * Scenarios:
 *   • sensitive field names redacted to [REDACTED]
 *   • partial-mask field names (nationalId, phone, email) keep last 4 chars
 *   • free-text strings: scrub JWTs, Bearer tokens, IBANs, card numbers,
 *     emails, national IDs, Saudi phones
 *   • nested objects + arrays traversed
 *   • circular references handled without crashing
 *   • primitives returned as-is
 */

'use strict';

const { redact, redactString, mask, REDACTED } = require('../utils/piiRedactor');

describe('piiRedactor.redact — object traversal', () => {
  it('redacts sensitive key names wholesale', () => {
    const out = redact({
      username: 'rami',
      password: 'hunter2',
      accessToken: 'abc.def.ghi',
      apiKey: 'sk_live_xxx',
      safeField: 'ok',
    });
    expect(out.username).toBe('rami');
    expect(out.password).toBe(REDACTED);
    expect(out.accessToken).toBe(REDACTED);
    expect(out.apiKey).toBe(REDACTED);
    expect(out.safeField).toBe('ok');
  });

  it('partial-masks nationalId and phone, keeps last 4', () => {
    const out = redact({
      nationalId: '1087654321',
      phone: '+966501234567',
      email: 'rami@example.com',
    });
    expect(out.nationalId.endsWith('4321')).toBe(true);
    expect(out.nationalId.startsWith('*')).toBe(true);
    expect(out.phone.endsWith('4567')).toBe(true);
    expect(out.email.endsWith('e.com')).toBe(false); // email falls under partial-mask keys too
    expect(out.email.slice(-4)).toBe('.com');
  });

  it('recurses into nested objects and arrays', () => {
    const out = redact({
      user: { password: 'x', name: 'A' },
      keys: [{ apiKey: 'x' }, { accessToken: 'y' }],
    });
    expect(out.user.password).toBe(REDACTED);
    expect(out.keys[0].apiKey).toBe(REDACTED);
    expect(out.keys[1].accessToken).toBe(REDACTED);
  });

  it('handles circular refs without throwing', () => {
    const a = { name: 'a' };
    a.self = a;
    const out = redact(a);
    expect(out.name).toBe('a');
    expect(out.self).toBe('[CIRCULAR]');
  });

  it('returns primitives untouched', () => {
    expect(redact(null)).toBeNull();
    expect(redact(undefined)).toBeUndefined();
    expect(redact(42)).toBe(42);
    expect(redact(true)).toBe(true);
  });
});

describe('piiRedactor.redactString — pattern scrubbing', () => {
  it('scrubs JWTs', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkw.abcDEFghiJKLmno';
    expect(redactString(`token=${jwt}`)).toContain(REDACTED);
  });

  it('scrubs Bearer tokens', () => {
    const out = redactString('Authorization: Bearer abcd.efgh.ijkl');
    expect(out).toContain('Bearer ' + REDACTED);
  });

  it('scrubs Saudi IBAN', () => {
    expect(redactString('IBAN: SA03800000608010167519011')).toContain(REDACTED);
  });

  it('scrubs card-like 13-19 digit runs', () => {
    expect(redactString('card 4111 1111 1111 1111 paid')).toContain(REDACTED);
  });

  it('scrubs email addresses', () => {
    expect(redactString('email: rami@example.com done')).toContain(REDACTED);
  });

  it('scrubs Saudi national IDs', () => {
    expect(redactString('guardian 1087654321 approved')).toContain(REDACTED);
    expect(redactString('guardian 2087654321 approved')).toContain(REDACTED);
  });

  it('scrubs phone numbers with 7+ digits', () => {
    expect(redactString('call +966 50 123 4567 please')).toContain(REDACTED);
  });

  it('leaves short numeric codes alone', () => {
    expect(redactString('code 1234')).toBe('code 1234');
  });
});

describe('piiRedactor.mask', () => {
  it('keeps the last N chars and stars the rest', () => {
    expect(mask('1087654321', 4)).toBe('******4321');
    expect(mask('abc', 4)).toBe('***');
  });
});

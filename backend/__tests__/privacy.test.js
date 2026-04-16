/**
 * Privacy (PDPL) scaffold tests — no DB, pure schema/helper behavior.
 */

describe('privacy module — public API', () => {
  const privacy = require('../privacy');

  test('exports expected members', () => {
    expect(privacy.Consent).toBeDefined();
    expect(privacy.Consent.LEGAL_BASES).toContain('consent');
    expect(privacy.Consent.PURPOSES).toContain('clinical_care');
    expect(privacy.DataSubjectRequest).toBeDefined();
    expect(privacy.DataSubjectRequest.REQUEST_TYPES).toContain('access');
    expect(privacy.DataSubjectRequest.SLA_DAYS).toBe(30);
    expect(typeof privacy.makeConsentCheck).toBe('function');
    expect(privacy.retention.POLICIES.clinical.years).toBe(15);
    expect(privacy.retention.POLICIES.financial.years).toBe(10);
  });

  test('retainUntil computes a retention window consistent with years configured', () => {
    const { retainUntil, POLICIES } = privacy.retention;
    const created = new Date('2026-01-01T00:00:00Z');
    const until = retainUntil('clinical', created);
    const diffYears = (until.getTime() - created.getTime()) / (365 * 24 * 3600 * 1000);
    expect(diffYears).toBeCloseTo(POLICIES.clinical.years, 2);
  });

  test('retainUntil throws on unknown category', () => {
    const { retainUntil } = privacy.retention;
    expect(() => retainUntil('nope', new Date())).toThrow('Unknown retention category');
  });
});

describe('makeConsentCheck', () => {
  const { makeConsentCheck } = require('../privacy');

  function mockModel(latestResult) {
    return {
      latestFor: async () => latestResult,
    };
  }

  test('throws if ConsentModel missing', () => {
    expect(() => makeConsentCheck({})).toThrow('ConsentModel');
  });

  test('denies when purpose invalid', async () => {
    const check = makeConsentCheck({ ConsentModel: mockModel(null) });
    const r = await check('Beneficiary', 'b-1', 'nope');
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('invalid_purpose');
  });

  test('denies when no record found', async () => {
    const check = makeConsentCheck({ ConsentModel: mockModel(null) });
    const r = await check('Beneficiary', 'b-1', 'marketing');
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('no_consent_record');
  });

  test('denies when withdrawn', async () => {
    const check = makeConsentCheck({
      ConsentModel: mockModel({ _id: 'c1', state: 'withdrawn', expiresAt: null }),
    });
    const r = await check('Beneficiary', 'b-1', 'marketing');
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('consent_withdrawn');
  });

  test('denies when expired', async () => {
    const past = new Date(Date.now() - 24 * 3600 * 1000);
    const check = makeConsentCheck({
      ConsentModel: mockModel({ _id: 'c1', state: 'granted', expiresAt: past }),
    });
    const r = await check('Beneficiary', 'b-1', 'marketing');
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('consent_expired');
  });

  test('allows when granted and not expired', async () => {
    const future = new Date(Date.now() + 24 * 3600 * 1000);
    const check = makeConsentCheck({
      ConsentModel: mockModel({ _id: 'c1', state: 'granted', expiresAt: future }),
    });
    const r = await check('Beneficiary', 'b-1', 'marketing');
    expect(r.allowed).toBe(true);
    expect(r.consentId).toBe('c1');
  });
});

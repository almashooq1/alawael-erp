'use strict';
/**
 * W1340 — Sponsorship → FHIR R4 Coverage mapper tests.
 *
 * Pure unit tests (no DB). Validates the projection of a canonical Sponsorship
 * onto a base FHIR R4 Coverage plus a canonical round-trip.
 */

const {
  sponsorshipToFhir,
  toFhirDateTime,
  toFhirStatus,
  buildType,
  buildPeriod,
  buildPaymentExtension,
  buildExtensions,
  isPresent,
  STATUS_MAP,
  DEFAULT_CURRENCY,
  ORG_FHIR_BASE,
  SP_TYPE_SYSTEM,
  SP_STATUS_EXTENSION_URL,
  SP_MONTHLY_AMOUNT_EXTENSION_URL,
  SP_COVERAGE_ITEMS_EXTENSION_URL,
  SP_IS_ZAKAT_EXTENSION_URL,
  SP_PAUSE_REASON_EXTENSION_URL,
  SP_CANCEL_REASON_EXTENSION_URL,
  SP_PAYMENT_EXTENSION_URL,
  SP_BRANCH_EXTENSION_URL,
} = require('../intelligence/fhir/sponsorship-to-fhir.lib');
const { canonical } = require('../intelligence/canonical');

const ACTIVE = Object.freeze({
  _id: '64c0000000000000000000ff',
  donorId: '64a6666666666666666666ff',
  beneficiaryId: '64a1111111111111111111aa',
  branchId: '64a2222222222222222222bb',
  sponsorshipType: 'full',
  monthlyAmount: 800,
  currency: 'SAR',
  coverageItems: ['tuition', 'transport', 'meals'],
  isZakat: true,
  startDate: '2026-01-01T00:00:00.000Z',
  endDate: '2026-12-31T00:00:00.000Z',
  status: 'active',
  payments: [
    { date: '2026-01-05T00:00:00.000Z', amount: 800, method: 'bank', reference: 'PAY-1' },
    { date: '2026-02-05T00:00:00.000Z', amount: 800, method: 'bank', reference: 'PAY-2' },
  ],
});

const MINIMAL = Object.freeze({
  donorId: '64a6666666666666666666ff',
  beneficiaryId: '64a1111111111111111111aa',
  sponsorshipType: 'one_time',
  startDate: '2026-03-01T00:00:00.000Z',
  status: 'pending',
});

const CANCELLED = Object.freeze({
  _id: '64c0000000000000000000ee',
  donorId: '64a6666666666666666666ff',
  beneficiaryId: '64a1111111111111111111aa',
  sponsorshipType: 'partial',
  monthlyAmount: 300,
  startDate: '2025-06-01T00:00:00.000Z',
  status: 'cancelled',
  cancelReason: 'Donor relocated',
});

describe('W1340 sponsorshipToFhir — canonical round-trip', () => {
  it('ACTIVE fixture satisfies the canonical schema', () => {
    expect(canonical.Sponsorship.safeParse(ACTIVE).success).toBe(true);
  });

  it('MINIMAL fixture satisfies the canonical schema', () => {
    expect(canonical.Sponsorship.safeParse(MINIMAL).success).toBe(true);
  });

  it('CANCELLED fixture satisfies the canonical schema', () => {
    expect(canonical.Sponsorship.safeParse(CANCELLED).success).toBe(true);
  });
});

describe('W1340 sponsorshipToFhir — resource shape', () => {
  it('emits a FHIR R4 Coverage', () => {
    expect(sponsorshipToFhir(ACTIVE).resourceType).toBe('Coverage');
  });

  it('sets id from _id when includeId (default)', () => {
    expect(sponsorshipToFhir(ACTIVE).id).toBe('64c0000000000000000000ff');
  });

  it('omits id when includeId is false', () => {
    expect(sponsorshipToFhir(ACTIVE, { includeId: false }).id).toBeUndefined();
  });

  it('omits id when _id is absent', () => {
    expect(sponsorshipToFhir(MINIMAL).id).toBeUndefined();
  });

  it('beneficiary references the Patient', () => {
    expect(sponsorshipToFhir(ACTIVE).beneficiary).toEqual({
      reference: 'Patient/64a1111111111111111111aa',
    });
  });

  it('payor references the donor as RelatedPerson', () => {
    expect(sponsorshipToFhir(ACTIVE).payor).toEqual([
      { reference: 'RelatedPerson/64a6666666666666666666ff' },
    ]);
  });

  it('type carries the sponsorship type', () => {
    expect(sponsorshipToFhir(ACTIVE).type).toEqual({
      coding: [{ system: SP_TYPE_SYSTEM, code: 'full' }],
      text: 'full',
    });
  });

  it('period maps from start + end dates', () => {
    expect(sponsorshipToFhir(ACTIVE).period).toEqual({
      start: '2026-01-01T00:00:00.000Z',
      end: '2026-12-31T00:00:00.000Z',
    });
  });

  it('period carries only start when no end', () => {
    expect(sponsorshipToFhir(MINIMAL).period).toEqual({ start: '2026-03-01T00:00:00.000Z' });
  });

  it('output is a plain object', () => {
    expect(Object.getPrototypeOf(sponsorshipToFhir(ACTIVE))).toBe(Object.prototype);
  });

  it('does not mutate the input', () => {
    const input = JSON.parse(JSON.stringify(ACTIVE));
    sponsorshipToFhir(input);
    expect(input).toEqual(ACTIVE);
  });
});

describe('W1340 status mapping', () => {
  it('STATUS_MAP is frozen', () => {
    expect(Object.isFrozen(STATUS_MAP)).toBe(true);
  });

  it('maps lifecycle states onto the Coverage.status value-set', () => {
    expect(toFhirStatus('pending')).toBe('draft');
    expect(toFhirStatus('active')).toBe('active');
    expect(toFhirStatus('paused')).toBe('active');
    expect(toFhirStatus('completed')).toBe('cancelled');
    expect(toFhirStatus('cancelled')).toBe('cancelled');
  });

  it('absent → draft; unmapped → draft', () => {
    expect(toFhirStatus(undefined)).toBe('draft');
    expect(toFhirStatus('weird')).toBe('draft');
  });
});

describe('W1340 extensions', () => {
  it('always carries the original status', () => {
    const ext = buildExtensions(ACTIVE);
    expect(ext.find(e => e.url === SP_STATUS_EXTENSION_URL).valueCode).toBe('active');
  });

  it('carries monthly amount as Money + zakat flag + branch', () => {
    const ext = buildExtensions(ACTIVE);
    expect(ext.find(e => e.url === SP_MONTHLY_AMOUNT_EXTENSION_URL).valueMoney).toEqual({
      value: 800,
      currency: 'SAR',
    });
    expect(ext.find(e => e.url === SP_IS_ZAKAT_EXTENSION_URL).valueBoolean).toBe(true);
    expect(ext.find(e => e.url === SP_BRANCH_EXTENSION_URL).valueReference).toEqual({
      reference: 'Organization/64a2222222222222222222bb',
    });
  });

  it('defaults the currency to SAR when monthlyAmount present without currency', () => {
    const ext = buildExtensions({ ...MINIMAL, monthlyAmount: 500 });
    expect(ext.find(e => e.url === SP_MONTHLY_AMOUNT_EXTENSION_URL).valueMoney.currency).toBe(
      'SAR'
    );
  });

  it('carries coverage items as nested string extensions', () => {
    const items = buildExtensions(ACTIVE).find(e => e.url === SP_COVERAGE_ITEMS_EXTENSION_URL);
    expect(items.extension).toEqual([
      { url: 'item', valueString: 'tuition' },
      { url: 'item', valueString: 'transport' },
      { url: 'item', valueString: 'meals' },
    ]);
  });

  it('carries one extension per payment', () => {
    const payments = buildExtensions(ACTIVE).filter(e => e.url === SP_PAYMENT_EXTENSION_URL);
    expect(payments).toHaveLength(2);
    expect(payments[0].extension).toContainEqual({ url: 'amount', valueDecimal: 800 });
    expect(payments[0].extension).toContainEqual({ url: 'reference', valueString: 'PAY-1' });
  });

  it('carries cancelReason on the CANCELLED fixture', () => {
    const ext = buildExtensions(CANCELLED);
    expect(ext.find(e => e.url === SP_CANCEL_REASON_EXTENSION_URL).valueString).toBe(
      'Donor relocated'
    );
    expect(ext.find(e => e.url === SP_PAUSE_REASON_EXTENSION_URL)).toBeUndefined();
  });

  it('MINIMAL carries only the status extension', () => {
    expect(sponsorshipToFhir(MINIMAL).extension.map(e => e.url)).toEqual([SP_STATUS_EXTENSION_URL]);
  });
});

describe('W1340 helpers + guards', () => {
  it('ORG_FHIR_BASE + DEFAULT_CURRENCY constants', () => {
    expect(ORG_FHIR_BASE).toBe('https://alawael.sa/fhir');
    expect(DEFAULT_CURRENCY).toBe('SAR');
  });

  it('isPresent treats empty string as absent', () => {
    expect(isPresent('')).toBe(false);
    expect(isPresent(undefined)).toBe(false);
    expect(isPresent('x')).toBe(true);
  });

  it('buildType uses the sponsorship type', () => {
    expect(buildType({ sponsorshipType: 'in_kind' }).coding[0].code).toBe('in_kind');
  });

  it('buildPeriod returns undefined when no dates', () => {
    expect(buildPeriod({})).toBeUndefined();
  });

  it('buildPaymentExtension returns null for an empty payment', () => {
    expect(buildPaymentExtension({})).toBeNull();
  });

  it('toFhirDateTime returns full ISO; rejects bad input', () => {
    expect(toFhirDateTime('2026-01-01T00:00:00.000Z')).toBe('2026-01-01T00:00:00.000Z');
    expect(toFhirDateTime(undefined)).toBeUndefined();
    expect(toFhirDateTime('not-a-date')).toBeUndefined();
  });

  it('throws when record is missing', () => {
    expect(() => sponsorshipToFhir()).toThrow(TypeError);
    expect(() => sponsorshipToFhir(null)).toThrow(/record object is required/);
  });

  it('throws when beneficiaryId is missing', () => {
    expect(() => sponsorshipToFhir({ donorId: 'x', sponsorshipType: 'full' })).toThrow(
      /beneficiaryId is required/
    );
  });

  it('throws when donorId is missing', () => {
    expect(() => sponsorshipToFhir({ beneficiaryId: 'x', sponsorshipType: 'full' })).toThrow(
      /donorId is required/
    );
  });
});

'use strict';
/**
 * W1342 — SeatAllocation → FHIR R4 Appointment mapper tests.
 *
 * Covers: canonical round-trip on 3 fixtures, resource shape, status mapping,
 * serviceType/participant, days-of-week + nested extensions, throw guards,
 * purity (no mutation, plain object), and helper units.
 */

const { canonical } = require('../intelligence/canonical');
const {
  seatAllocationToFhir,
  toFhirStatus,
  toFhirDateTime,
  buildServiceType,
  buildParticipants,
  isPresent,
  STATUS_MAP,
  SEAT_SERVICE_TYPE_SYSTEM,
  SEAT_SERVICE_TYPE_CODE,
  SEAT_STATUS_EXTENSION_URL,
  SEAT_LABEL_EXTENSION_URL,
  SEAT_SECTION_EXTENSION_URL,
  SEAT_DAYS_OF_WEEK_EXTENSION_URL,
  SEAT_PERIOD_EXTENSION_URL,
  SEAT_HOLD_REASON_EXTENSION_URL,
  SEAT_RELEASED_AT_EXTENSION_URL,
  SEAT_RELEASE_REASON_EXTENSION_URL,
  SEAT_WAITLIST_EXTENSION_URL,
  SEAT_BRANCH_EXTENSION_URL,
} = require('../intelligence/fhir/seat-allocation-to-fhir.lib');

const FULL = {
  _id: '64ab00000000000000000001',
  beneficiaryId: '64a1111111111111111111aa',
  branchId: '64a2222222222222222222bb',
  sectionId: '64a3333333333333333333cc',
  seatLabel: 'A-12',
  daysOfWeek: [0, 1, 3],
  period: 'morning',
  effectiveFrom: '2026-01-01T00:00:00.000Z',
  effectiveTo: '2026-06-30T00:00:00.000Z',
  status: 'active',
  waitlistEntryId: '64a4444444444444444444dd',
};

const MINIMAL = {
  beneficiaryId: '64a1111111111111111111aa',
  branchId: '64a2222222222222222222bb',
  effectiveFrom: '2026-02-01T00:00:00.000Z',
  status: 'on_hold',
  holdReason: 'Family travel',
};

const RELEASED = {
  _id: '64ab00000000000000000002',
  beneficiaryId: '64a1111111111111111111aa',
  branchId: '64a2222222222222222222bb',
  effectiveFrom: '2026-01-01T00:00:00.000Z',
  status: 'released',
  releasedAt: '2026-03-15T00:00:00.000Z',
  releaseReason: 'Discharged',
};

describe('W1342 seatAllocationToFhir — canonical round-trip', () => {
  for (const [label, fixture] of [
    ['FULL', FULL],
    ['MINIMAL', MINIMAL],
    ['RELEASED', RELEASED],
  ]) {
    test(`${label} fixture satisfies canonical SeatAllocation`, () => {
      const parsed = canonical.SeatAllocation.safeParse(fixture);
      expect(parsed.success).toBe(true);
    });
  }
});

describe('W1342 seatAllocationToFhir — resource shape', () => {
  test('FULL maps to Appointment with core fields', () => {
    const r = seatAllocationToFhir(FULL);
    expect(r.resourceType).toBe('Appointment');
    expect(r.id).toBe('64ab00000000000000000001');
    expect(r.status).toBe('booked');
    expect(r.start).toBe('2026-01-01T00:00:00.000Z');
    expect(r.end).toBe('2026-06-30T00:00:00.000Z');
  });

  test('serviceType is the fixed seat-allocation discriminator', () => {
    const r = seatAllocationToFhir(FULL);
    expect(r.serviceType).toEqual([
      {
        coding: [{ system: SEAT_SERVICE_TYPE_SYSTEM, code: SEAT_SERVICE_TYPE_CODE }],
        text: 'Day-Rehabilitation Seat Allocation',
      },
    ]);
  });

  test('participant includes Patient + branch Location + section Location', () => {
    const r = seatAllocationToFhir(FULL);
    expect(r.participant).toEqual([
      { actor: { reference: 'Patient/64a1111111111111111111aa' }, status: 'accepted' },
      { actor: { reference: 'Location/64a2222222222222222222bb' }, status: 'accepted' },
      { actor: { reference: 'Location/64a3333333333333333333cc' }, status: 'accepted' },
    ]);
  });

  test('MINIMAL participant omits section (only Patient + branch)', () => {
    const r = seatAllocationToFhir(MINIMAL);
    expect(r.participant).toHaveLength(2);
    expect(r.status).toBe('pending');
    expect(r.id).toBeUndefined();
    expect(r.end).toBeUndefined();
  });

  test('RELEASED maps status to cancelled', () => {
    const r = seatAllocationToFhir(RELEASED);
    expect(r.status).toBe('cancelled');
  });

  test('includeId=false drops id', () => {
    const r = seatAllocationToFhir(FULL, { includeId: false });
    expect(r.id).toBeUndefined();
  });
});

describe('W1342 seatAllocationToFhir — extensions', () => {
  test('status extension always preserves the original status', () => {
    const r = seatAllocationToFhir(FULL);
    expect(r.extension.find(e => e.url === SEAT_STATUS_EXTENSION_URL)).toEqual({
      url: SEAT_STATUS_EXTENSION_URL,
      valueCode: 'active',
    });
  });

  test('label + section + period extensions present', () => {
    const r = seatAllocationToFhir(FULL);
    expect(r.extension.find(e => e.url === SEAT_LABEL_EXTENSION_URL)).toEqual({
      url: SEAT_LABEL_EXTENSION_URL,
      valueString: 'A-12',
    });
    expect(r.extension.find(e => e.url === SEAT_SECTION_EXTENSION_URL)).toEqual({
      url: SEAT_SECTION_EXTENSION_URL,
      valueReference: { reference: 'Location/64a3333333333333333333cc' },
    });
    expect(r.extension.find(e => e.url === SEAT_PERIOD_EXTENSION_URL)).toEqual({
      url: SEAT_PERIOD_EXTENSION_URL,
      valueCode: 'morning',
    });
  });

  test('days-of-week extension nests one valueInteger per day', () => {
    const r = seatAllocationToFhir(FULL);
    const ext = r.extension.find(e => e.url === SEAT_DAYS_OF_WEEK_EXTENSION_URL);
    expect(ext.extension).toEqual([
      { url: 'day', valueInteger: 0 },
      { url: 'day', valueInteger: 1 },
      { url: 'day', valueInteger: 3 },
    ]);
  });

  test('waitlist + branch extensions present', () => {
    const r = seatAllocationToFhir(FULL);
    expect(r.extension.find(e => e.url === SEAT_WAITLIST_EXTENSION_URL)).toEqual({
      url: SEAT_WAITLIST_EXTENSION_URL,
      valueString: '64a4444444444444444444dd',
    });
    expect(r.extension.find(e => e.url === SEAT_BRANCH_EXTENSION_URL)).toEqual({
      url: SEAT_BRANCH_EXTENSION_URL,
      valueReference: { reference: 'Organization/64a2222222222222222222bb' },
    });
  });

  test('hold reason extension present for on_hold', () => {
    const r = seatAllocationToFhir(MINIMAL);
    expect(r.extension.find(e => e.url === SEAT_HOLD_REASON_EXTENSION_URL)).toEqual({
      url: SEAT_HOLD_REASON_EXTENSION_URL,
      valueString: 'Family travel',
    });
  });

  test('release fields extensions present for released', () => {
    const r = seatAllocationToFhir(RELEASED);
    expect(r.extension.find(e => e.url === SEAT_RELEASED_AT_EXTENSION_URL)).toEqual({
      url: SEAT_RELEASED_AT_EXTENSION_URL,
      valueDateTime: '2026-03-15T00:00:00.000Z',
    });
    expect(r.extension.find(e => e.url === SEAT_RELEASE_REASON_EXTENSION_URL)).toEqual({
      url: SEAT_RELEASE_REASON_EXTENSION_URL,
      valueString: 'Discharged',
    });
  });

  test('MINIMAL has no label/days/section extensions', () => {
    const r = seatAllocationToFhir(MINIMAL);
    expect(r.extension.find(e => e.url === SEAT_LABEL_EXTENSION_URL)).toBeUndefined();
    expect(r.extension.find(e => e.url === SEAT_DAYS_OF_WEEK_EXTENSION_URL)).toBeUndefined();
    expect(r.extension.find(e => e.url === SEAT_SECTION_EXTENSION_URL)).toBeUndefined();
  });
});

describe('W1342 seatAllocationToFhir — throw guards + purity', () => {
  test('throws when record is missing', () => {
    expect(() => seatAllocationToFhir(null)).toThrow(TypeError);
  });

  test('throws when beneficiaryId is missing', () => {
    expect(() => seatAllocationToFhir({ branchId: 'b1', status: 'active' })).toThrow(
      /beneficiaryId/
    );
  });

  test('throws when branchId is missing', () => {
    expect(() => seatAllocationToFhir({ beneficiaryId: 'p1', status: 'active' })).toThrow(
      /branchId/
    );
  });

  test('does not mutate input', () => {
    const input = JSON.parse(JSON.stringify(FULL));
    seatAllocationToFhir(input);
    expect(input).toEqual(FULL);
  });

  test('returns a plain object', () => {
    const r = seatAllocationToFhir(FULL);
    expect(Object.getPrototypeOf(r)).toBe(Object.prototype);
  });
});

describe('W1342 helpers', () => {
  test('STATUS_MAP projects onto Appointment value-set', () => {
    expect(STATUS_MAP.active).toBe('booked');
    expect(STATUS_MAP.on_hold).toBe('pending');
    expect(STATUS_MAP.released).toBe('cancelled');
  });

  test('toFhirStatus defaults to proposed', () => {
    expect(toFhirStatus(undefined)).toBe('proposed');
    expect(toFhirStatus('weird')).toBe('proposed');
    expect(toFhirStatus('active')).toBe('booked');
  });

  test('toFhirDateTime handles bad/absent input', () => {
    expect(toFhirDateTime('')).toBeUndefined();
    expect(toFhirDateTime('not-a-date')).toBeUndefined();
    expect(toFhirDateTime('2026-01-01T00:00:00.000Z')).toBe('2026-01-01T00:00:00.000Z');
  });

  test('isPresent treats empty string as absent', () => {
    expect(isPresent('')).toBe(false);
    expect(isPresent(0)).toBe(true);
    expect(isPresent(null)).toBe(false);
  });

  test('buildServiceType is the fixed discriminator', () => {
    expect(buildServiceType()[0].coding[0].code).toBe(SEAT_SERVICE_TYPE_CODE);
  });

  test('buildParticipants returns two actors without a section', () => {
    const p = buildParticipants({ beneficiaryId: 'p1', branchId: 'b1' });
    expect(p).toHaveLength(2);
    expect(p[0].actor.reference).toBe('Patient/p1');
    expect(p[1].actor.reference).toBe('Location/b1');
  });
});

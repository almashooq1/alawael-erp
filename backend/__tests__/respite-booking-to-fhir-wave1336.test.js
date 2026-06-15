'use strict';
/**
 * W1336 — RespiteBooking → FHIR R4 Appointment mapper tests.
 *
 * Pure unit tests (no DB). Validates the projection of a canonical
 * RespiteBooking onto a base FHIR R4 Appointment plus a round-trip.
 */

const {
  respiteBookingToFhir,
  toFhirDateTime,
  toFhirStatus,
  buildServiceType,
  buildAppointmentType,
  buildParticipant,
  buildEmergencyContactExtension,
  buildExtensions,
  STATUS_MAP,
  ORG_FHIR_BASE,
  RB_SERVICE_TYPE_SYSTEM,
  RB_SERVICE_TYPE_CODE,
  RB_BOOKING_TYPE_SYSTEM,
  RB_STATUS_EXTENSION_URL,
  RB_BOOKING_TYPE_EXTENSION_URL,
  RB_NIGHT_COUNT_EXTENSION_URL,
  RB_REQUESTED_BY_EXTENSION_URL,
  RB_APPROVAL_EXTENSION_URL,
  RB_REJECTION_REASON_EXTENSION_URL,
  RB_EMERGENCY_CONTACT_EXTENSION_URL,
  RB_CHECKED_IN_AT_EXTENSION_URL,
  RB_CHECKED_OUT_AT_EXTENSION_URL,
  RB_ESTIMATED_COST_EXTENSION_URL,
  RB_ACTUAL_COST_EXTENSION_URL,
  RB_FUNDING_SOURCE_EXTENSION_URL,
  RB_SUBSIDY_REF_EXTENSION_URL,
  RB_CANCELLATION_EXTENSION_URL,
  RB_CARE_PLAN_EXTENSION_URL,
  RB_BRANCH_EXTENSION_URL,
} = require('../intelligence/fhir/respite-booking-to-fhir.lib');
const { canonical } = require('../intelligence/canonical');

const FULL = Object.freeze({
  _id: '64a0000000000000000000ff',
  beneficiaryId: '64a1111111111111111111aa',
  branchId: '64a2222222222222222222bb',
  bookingType: 'overnight',
  status: 'completed',
  startAt: '2026-02-10T18:00:00.000Z',
  endAt: '2026-02-12T08:00:00.000Z',
  nightCount: 2,
  requestedBy: '64a3333333333333333333cc',
  requestedByRelationship: 'father',
  requestedAt: '2026-02-01T10:00:00.000Z',
  approvedBy: '64a4444444444444444444dd',
  approvedAt: '2026-02-02T10:00:00.000Z',
  emergencyContactName: 'Abu Khalid',
  emergencyContactPhone: '+966500000000',
  checkedInAt: '2026-02-10T18:05:00.000Z',
  checkedOutAt: '2026-02-12T08:10:00.000Z',
  estimatedCost: 1200,
  actualCost: 1150,
  fundingSource: 'disability_authority_subsidy',
  subsidyApprovalRef: 'DA-2026-0099',
  linkedCarePlanVersionId: '64a5555555555555555555ee',
});

const MINIMAL = Object.freeze({
  beneficiaryId: '64a1111111111111111111aa',
  bookingType: 'day',
  status: 'requested',
  startAt: '2026-03-01T08:00:00.000Z',
  endAt: '2026-03-01T16:00:00.000Z',
  nightCount: 0,
  emergencyContactName: 'Umm Sara',
  emergencyContactPhone: '+966511111111',
});

const CANCELLED = Object.freeze({
  _id: '64a0000000000000000000cc',
  beneficiaryId: '64a1111111111111111111aa',
  bookingType: 'extended',
  status: 'cancelled',
  startAt: '2026-04-01T08:00:00.000Z',
  endAt: '2026-04-10T08:00:00.000Z',
  nightCount: 9,
  emergencyContactName: 'Abu Sara',
  emergencyContactPhone: '+966522222222',
  cancellationReason: 'Family illness',
  cancelledAt: '2026-03-25T00:00:00.000Z',
  cancelledBy: '64a6666666666666666666ff',
});

describe('W1336 respiteBookingToFhir — canonical round-trip', () => {
  it('FULL fixture satisfies the canonical schema', () => {
    expect(canonical.RespiteBooking.safeParse(FULL).success).toBe(true);
  });

  it('MINIMAL fixture satisfies the canonical schema', () => {
    expect(canonical.RespiteBooking.safeParse(MINIMAL).success).toBe(true);
  });

  it('CANCELLED fixture satisfies the canonical schema', () => {
    expect(canonical.RespiteBooking.safeParse(CANCELLED).success).toBe(true);
  });
});

describe('W1336 respiteBookingToFhir — resource shape', () => {
  it('emits a FHIR R4 Appointment', () => {
    expect(respiteBookingToFhir(FULL).resourceType).toBe('Appointment');
  });

  it('sets id from _id when includeId (default)', () => {
    expect(respiteBookingToFhir(FULL).id).toBe('64a0000000000000000000ff');
  });

  it('omits id when includeId is false', () => {
    expect(respiteBookingToFhir(FULL, { includeId: false }).id).toBeUndefined();
  });

  it('omits id when _id is absent', () => {
    expect(respiteBookingToFhir(MINIMAL).id).toBeUndefined();
  });

  it('serviceType is the fixed respite-care discriminator', () => {
    expect(respiteBookingToFhir(FULL).serviceType).toEqual([
      {
        coding: [{ system: RB_SERVICE_TYPE_SYSTEM, code: RB_SERVICE_TYPE_CODE }],
        text: 'Respite Care',
      },
    ]);
  });

  it('appointmentType carries the booking type', () => {
    expect(respiteBookingToFhir(FULL).appointmentType).toEqual({
      coding: [{ system: RB_BOOKING_TYPE_SYSTEM, code: 'overnight' }],
      text: 'Respite — overnight',
    });
  });

  it('participant carries the beneficiary as a required Patient actor', () => {
    expect(respiteBookingToFhir(FULL).participant).toEqual([
      {
        actor: { reference: 'Patient/64a1111111111111111111aa' },
        required: 'required',
        status: 'accepted',
      },
    ]);
  });

  it('start/end/created map from startAt/endAt/requestedAt', () => {
    const resource = respiteBookingToFhir(FULL);
    expect(resource.start).toBe('2026-02-10T18:00:00.000Z');
    expect(resource.end).toBe('2026-02-12T08:00:00.000Z');
    expect(resource.created).toBe('2026-02-01T10:00:00.000Z');
  });

  it('output is a plain object', () => {
    expect(Object.getPrototypeOf(respiteBookingToFhir(FULL))).toBe(Object.prototype);
  });

  it('does not mutate the input', () => {
    const input = JSON.parse(JSON.stringify(FULL));
    respiteBookingToFhir(input);
    expect(input).toEqual(FULL);
  });
});

describe('W1336 status mapping', () => {
  it('STATUS_MAP is frozen', () => {
    expect(Object.isFrozen(STATUS_MAP)).toBe(true);
  });

  it('maps the 8 lifecycle states', () => {
    expect(toFhirStatus('requested')).toBe('pending');
    expect(toFhirStatus('approved')).toBe('booked');
    expect(toFhirStatus('rejected')).toBe('cancelled');
    expect(toFhirStatus('confirmed')).toBe('booked');
    expect(toFhirStatus('checked_in')).toBe('checked-in');
    expect(toFhirStatus('completed')).toBe('fulfilled');
    expect(toFhirStatus('cancelled')).toBe('cancelled');
    expect(toFhirStatus('no_show')).toBe('noshow');
  });

  it('absent → proposed; unmapped → proposed', () => {
    expect(toFhirStatus(undefined)).toBe('proposed');
    expect(toFhirStatus('weird')).toBe('proposed');
  });
});

describe('W1336 extensions', () => {
  it('carries status + booking type + night count', () => {
    const ext = buildExtensions(FULL);
    expect(ext.find(e => e.url === RB_STATUS_EXTENSION_URL).valueCode).toBe('completed');
    expect(ext.find(e => e.url === RB_BOOKING_TYPE_EXTENSION_URL).valueCode).toBe('overnight');
    expect(ext.find(e => e.url === RB_NIGHT_COUNT_EXTENSION_URL).valueInteger).toBe(2);
  });

  it('carries the nested requested-by extension', () => {
    const ext = buildExtensions(FULL);
    const req = ext.find(e => e.url === RB_REQUESTED_BY_EXTENSION_URL);
    expect(req.extension).toContainEqual({
      url: 'requestedBy',
      valueReference: { reference: 'RelatedPerson/64a3333333333333333333cc' },
    });
    expect(req.extension).toContainEqual({ url: 'relationship', valueString: 'father' });
  });

  it('carries the nested approval extension', () => {
    const ext = buildExtensions(FULL);
    const ap = ext.find(e => e.url === RB_APPROVAL_EXTENSION_URL);
    expect(ap.extension).toContainEqual({
      url: 'approvedBy',
      valueReference: { reference: 'Practitioner/64a4444444444444444444dd' },
    });
    expect(ap.extension).toContainEqual({
      url: 'approvedAt',
      valueDateTime: '2026-02-02T10:00:00.000Z',
    });
  });

  it('carries the mandatory emergency-contact extension', () => {
    const ext = buildExtensions(FULL);
    const ec = ext.find(e => e.url === RB_EMERGENCY_CONTACT_EXTENSION_URL);
    expect(ec.extension).toEqual([
      { url: 'name', valueString: 'Abu Khalid' },
      { url: 'phone', valueString: '+966500000000' },
    ]);
  });

  it('carries check-in/out + costs + funding + subsidy ref', () => {
    const ext = buildExtensions(FULL);
    expect(ext.find(e => e.url === RB_CHECKED_IN_AT_EXTENSION_URL).valueDateTime).toBe(
      '2026-02-10T18:05:00.000Z'
    );
    expect(ext.find(e => e.url === RB_CHECKED_OUT_AT_EXTENSION_URL).valueDateTime).toBe(
      '2026-02-12T08:10:00.000Z'
    );
    expect(ext.find(e => e.url === RB_ESTIMATED_COST_EXTENSION_URL).valueDecimal).toBe(1200);
    expect(ext.find(e => e.url === RB_ACTUAL_COST_EXTENSION_URL).valueDecimal).toBe(1150);
    expect(ext.find(e => e.url === RB_FUNDING_SOURCE_EXTENSION_URL).valueCode).toBe(
      'disability_authority_subsidy'
    );
    expect(ext.find(e => e.url === RB_SUBSIDY_REF_EXTENSION_URL).valueString).toBe('DA-2026-0099');
  });

  it('carries linked care-plan + branch references', () => {
    const ext = buildExtensions(FULL);
    expect(ext.find(e => e.url === RB_CARE_PLAN_EXTENSION_URL)).toEqual({
      url: RB_CARE_PLAN_EXTENSION_URL,
      valueReference: { reference: 'CarePlan/64a5555555555555555555ee' },
    });
    expect(ext.find(e => e.url === RB_BRANCH_EXTENSION_URL)).toEqual({
      url: RB_BRANCH_EXTENSION_URL,
      valueReference: { reference: 'Organization/64a2222222222222222222bb' },
    });
  });

  it('carries the nested cancellation extension on the CANCELLED fixture', () => {
    const ext = buildExtensions(CANCELLED);
    const cx = ext.find(e => e.url === RB_CANCELLATION_EXTENSION_URL);
    expect(cx.extension).toContainEqual({ url: 'reason', valueString: 'Family illness' });
    expect(cx.extension).toContainEqual({
      url: 'cancelledAt',
      valueDateTime: '2026-03-25T00:00:00.000Z',
    });
    expect(cx.extension).toContainEqual({
      url: 'cancelledBy',
      valueReference: { reference: 'Practitioner/64a6666666666666666666ff' },
    });
  });

  it('MINIMAL carries status + booking-type + night-count + emergency contact only', () => {
    const resource = respiteBookingToFhir(MINIMAL);
    expect(resource.extension.map(e => e.url).sort()).toEqual(
      [
        RB_STATUS_EXTENSION_URL,
        RB_BOOKING_TYPE_EXTENSION_URL,
        RB_NIGHT_COUNT_EXTENSION_URL,
        RB_EMERGENCY_CONTACT_EXTENSION_URL,
      ].sort()
    );
  });
});

describe('W1336 helpers + guards', () => {
  it('ORG_FHIR_BASE is the org base URL', () => {
    expect(ORG_FHIR_BASE).toBe('https://alawael.sa/fhir');
  });

  it('buildServiceType returns the fixed discriminator', () => {
    expect(buildServiceType()[0].coding[0].code).toBe(RB_SERVICE_TYPE_CODE);
  });

  it('buildAppointmentType returns undefined without a booking type', () => {
    expect(buildAppointmentType({})).toBeUndefined();
  });

  it('buildParticipant references the beneficiary', () => {
    expect(buildParticipant({ beneficiaryId: 'x' })[0].actor.reference).toBe('Patient/x');
  });

  it('buildEmergencyContactExtension returns undefined when empty', () => {
    expect(buildEmergencyContactExtension({})).toBeUndefined();
  });

  it('toFhirDateTime returns full ISO; rejects bad input', () => {
    expect(toFhirDateTime('2026-02-10T18:00:00.000Z')).toBe('2026-02-10T18:00:00.000Z');
    expect(toFhirDateTime(undefined)).toBeUndefined();
    expect(toFhirDateTime('not-a-date')).toBeUndefined();
  });

  it('throws when booking is missing', () => {
    expect(() => respiteBookingToFhir()).toThrow(TypeError);
    expect(() => respiteBookingToFhir(null)).toThrow(/booking object is required/);
  });

  it('throws when beneficiaryId is missing', () => {
    expect(() => respiteBookingToFhir({ bookingType: 'day' })).toThrow(/beneficiaryId is required/);
  });
});

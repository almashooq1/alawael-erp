/**
 * backfill-branch-national-address.test.js
 *
 * Unit-level coverage for the pure transform in
 * `scripts/backfill-branch-national-address.js`. The script's DB
 * wiring is exercised manually in production; this file pins the
 * shape of the projection so a refactor of the legacy
 * `wasel_verification` subdoc can't silently change the migration
 * output.
 */

'use strict';

const {
  projectLegacyToNationalAddress,
  isAddressMeaningful,
} = require('../scripts/backfill-branch-national-address');

describe('projectLegacyToNationalAddress', () => {
  it('returns null when the doc has no wasel_short_code', () => {
    expect(projectLegacyToNationalAddress({})).toBeNull();
    expect(projectLegacyToNationalAddress({ wasel_short_code: '' })).toBeNull();
    expect(projectLegacyToNationalAddress(null)).toBeNull();
  });

  it('builds an unverified projection from a bare short code', () => {
    const out = projectLegacyToNationalAddress({ wasel_short_code: 'rfya1234' });
    expect(out).toBeTruthy();
    expect(out.shortCode).toBe('RFYA1234');
    expect(out.country).toBe('SA');
    expect(out.verification.verified).toBe(false);
    expect(out.verification.status).toBe('unverified');
  });

  it('maps a fully-populated legacy block into the new subdoc shape', () => {
    const doc = {
      wasel_short_code: 'RFYA1234',
      wasel_verification: {
        verified: true,
        status: 'match',
        mode: 'live',
        lastVerifiedAt: new Date('2026-04-30T12:00:00.000Z'),
        address: 'حي النخيل, الرياض',
        city: 'الرياض',
        district: 'النخيل',
        postalCode: '12345',
        buildingNumber: '7890',
        additionalNumber: '1234',
        geo: { lat: 24.71, lng: 46.67 },
        isDeliverable: true,
        message: 'OK',
      },
    };
    const out = projectLegacyToNationalAddress(doc);
    expect(out.shortCode).toBe('RFYA1234');
    expect(out.city).toBe('الرياض');
    expect(out.district).toBe('النخيل');
    expect(out.postalCode).toBe('12345');
    expect(out.buildingNumber).toBe('7890');
    expect(out.additionalNumber).toBe('1234');
    expect(out.fullAddress).toBe('حي النخيل, الرياض');
    expect(out.geo).toEqual({ lat: 24.71, lng: 46.67 });
    expect(out.isDeliverable).toBe(true);
    expect(out.verification.verified).toBe(true);
    expect(out.verification.status).toBe('match');
    expect(out.verification.mode).toBe('live');
    expect(out.verification.verifiedAt).toEqual(new Date('2026-04-30T12:00:00.000Z'));
    expect(out.verification.message).toBe('OK');
  });

  it('defaults status to "match" when verified=true but status missing', () => {
    const out = projectLegacyToNationalAddress({
      wasel_short_code: 'RFYA1234',
      wasel_verification: { verified: true },
    });
    expect(out.verification.status).toBe('match');
  });

  it('preserves verified=false when only the code was entered', () => {
    const out = projectLegacyToNationalAddress({
      wasel_short_code: 'RFYA1234',
      wasel_verification: { verified: false },
    });
    expect(out.verification.verified).toBe(false);
  });
});

describe('isAddressMeaningful', () => {
  it('returns false for empty / defaults-only addresses', () => {
    expect(isAddressMeaningful(null)).toBe(false);
    expect(isAddressMeaningful(undefined)).toBe(false);
    expect(isAddressMeaningful({})).toBe(false);
    expect(isAddressMeaningful({ country: 'SA' })).toBe(false);
  });

  it('returns true when any meaningful key is set', () => {
    expect(isAddressMeaningful({ shortCode: 'RFYA1234' })).toBe(true);
    expect(isAddressMeaningful({ city: 'الرياض' })).toBe(true);
    expect(isAddressMeaningful({ district: 'النخيل' })).toBe(true);
    expect(isAddressMeaningful({ fullAddress: 'addr' })).toBe(true);
  });
});

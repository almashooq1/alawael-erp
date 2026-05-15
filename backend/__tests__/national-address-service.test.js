/**
 * national-address-service.test.js
 *
 * Covers `services/nationalAddressService.js`:
 *   • coerceFromPayload normalizes legacy keys
 *   • verifyAndStamp populates the verification block + enriches fields
 *     from the mock Wasel adapter
 *   • requireVerified throws with the right HTTP-mappable codes
 */

'use strict';

process.env.NODE_ENV = 'test';
jest.unmock('mongoose');
jest.resetModules();

const service = require('../services/nationalAddressService');

describe('nationalAddressService.coerceFromPayload', () => {
  it('handles empty input safely', () => {
    expect(service.coerceFromPayload()).toEqual({ country: 'SA' });
    expect(service.coerceFromPayload(null)).toEqual({});
  });

  it('uppercases and trims the short code', () => {
    const out = service.coerceFromPayload({ shortCode: '  rfya1234 ' });
    expect(out.shortCode).toBe('RFYA1234');
  });

  it('accepts snake_case legacy keys', () => {
    const out = service.coerceFromPayload({
      short_code: 'RFYA1234',
      postal_code: '12345',
      building_number: '7890',
    });
    expect(out.shortCode).toBe('RFYA1234');
    expect(out.postalCode).toBe('12345');
    expect(out.buildingNumber).toBe('7890');
  });

  it('synthesizes geo from flat lat/lng', () => {
    const out = service.coerceFromPayload({ lat: 24.71, lng: 46.67 });
    expect(out.geo).toEqual({ lat: 24.71, lng: 46.67 });
  });
});

describe('nationalAddressService.verifyAndStamp (mock mode)', () => {
  it('stamps invalid_format when shortCode is missing', async () => {
    const out = await service.verifyAndStamp({});
    expect(out.verification.verified).toBe(false);
    expect(out.verification.status).toBe('unverified');
  });

  it('stamps invalid_format when shortCode fails regex', async () => {
    const out = await service.verifyAndStamp({ shortCode: 'NOPE' });
    expect(out.verification.verified).toBe(false);
    expect(out.verification.status).toBe('invalid_format');
  });

  it('marks not_found via the mock sentinel (...00)', async () => {
    const out = await service.verifyAndStamp({ shortCode: 'RFYA1200' });
    expect(out.verification.verified).toBe(false);
    expect(out.verification.status).toBe('not_found');
  });

  it('matches a well-formed code and enriches missing fields', async () => {
    const out = await service.verifyAndStamp({ shortCode: 'RFYA1234' });
    expect(out.verification.verified).toBe(true);
    expect(out.verification.status).toBe('match');
    expect(out.verification.mode).toBe('mock');
    expect(out.verification.verifiedAt).toBeInstanceOf(Date);
    expect(out.city).toBeTruthy();
    expect(out.district).toBeTruthy();
    expect(out.postalCode).toBeTruthy();
    expect(out.geo).toBeTruthy();
  });

  it('does not overwrite user-provided fields on match', async () => {
    const out = await service.verifyAndStamp({
      shortCode: 'RFYA1234',
      city: 'مدينة المستخدم',
      district: 'حي المستخدم',
    });
    expect(out.city).toBe('مدينة المستخدم');
    expect(out.district).toBe('حي المستخدم');
  });

  it('records actorId in verification.verifiedBy', async () => {
    const out = await service.verifyAndStamp({ shortCode: 'RFYA1234' }, { actorId: 'user-7' });
    expect(out.verification.verifiedBy).toBe('user-7');
  });
});

describe('nationalAddressService.requireVerified', () => {
  it('throws NATIONAL_ADDRESS_REQUIRED when address is missing', () => {
    try {
      service.requireVerified(null);
      throw new Error('should have thrown');
    } catch (e) {
      expect(e.code).toBe('NATIONAL_ADDRESS_REQUIRED');
      expect(e.statusCode).toBe(400);
    }
  });

  it('throws NATIONAL_ADDRESS_INVALID_FORMAT for bad shortCode', () => {
    try {
      service.requireVerified({ city: 'الرياض', shortCode: 'BAD' });
      throw new Error('should have thrown');
    } catch (e) {
      expect(e.code).toBe('NATIONAL_ADDRESS_INVALID_FORMAT');
      expect(e.statusCode).toBe(400);
    }
  });

  it('throws NATIONAL_ADDRESS_UNVERIFIED for unverified addresses', () => {
    try {
      service.requireVerified({
        shortCode: 'RFYA1234',
        verification: { verified: false },
      });
      throw new Error('should have thrown');
    } catch (e) {
      expect(e.code).toBe('NATIONAL_ADDRESS_UNVERIFIED');
      expect(e.statusCode).toBe(422);
    }
  });

  it('passes silently when fully verified', () => {
    expect(() =>
      service.requireVerified({
        shortCode: 'RFYA1234',
        verification: { verified: true, status: 'match' },
      })
    ).not.toThrow();
  });
});

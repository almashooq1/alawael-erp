/**
 * national-address-subschema.test.js
 *
 * Locks the public contract of `models/_shared/nationalAddress.subschema.js`:
 *  • SHORT_CODE_REGEX accepts 4-letter + 4-digit codes only
 *  • isAddressProvided correctly distinguishes empty/defaults from real input
 *  • attachNationalAddressGuard rejects unverified / malformed / required-missing
 *    cases AND lets through verified addresses
 *
 * Unit-level: builds a throwaway mongoose model so we don't need a DB.
 */

'use strict';

process.env.NODE_ENV = 'test';
jest.unmock('mongoose');
jest.resetModules();

const mongoose = require('mongoose');
const {
  SHORT_CODE_REGEX,
  nationalAddressSubschema,
  isAddressProvided,
  attachNationalAddressGuard,
} = require('../models/_shared/nationalAddress.subschema');

function makeModel({ guardOpts = {} } = {}) {
  const name = `NAT_TEST_${Math.random().toString(36).slice(2, 9)}`;
  const schema = new mongoose.Schema({
    label: String,
    nationalAddress: nationalAddressSubschema,
  });
  attachNationalAddressGuard(schema, guardOpts);
  return mongoose.model(name, schema);
}

describe('SHORT_CODE_REGEX', () => {
  it('accepts well-formed Saudi short codes', () => {
    expect(SHORT_CODE_REGEX.test('RFYA1234')).toBe(true);
    expect(SHORT_CODE_REGEX.test('KRMZ0001')).toBe(true);
  });

  it('rejects malformed short codes', () => {
    expect(SHORT_CODE_REGEX.test('rfya1234')).toBe(false); // lowercase
    expect(SHORT_CODE_REGEX.test('RFY12345')).toBe(false); // only 3 letters
    expect(SHORT_CODE_REGEX.test('RFYAB1234')).toBe(false); // 5 letters
    expect(SHORT_CODE_REGEX.test('RFYA123')).toBe(false); // 3 digits
    expect(SHORT_CODE_REGEX.test('')).toBe(false);
  });
});

describe('isAddressProvided', () => {
  it('returns false for null/undefined/empty', () => {
    expect(isAddressProvided(null)).toBe(false);
    expect(isAddressProvided(undefined)).toBe(false);
    expect(isAddressProvided({})).toBe(false);
  });

  it('returns false when only default country is set', () => {
    expect(isAddressProvided({ country: 'SA' })).toBe(false);
  });

  it('returns true when any meaningful field is provided', () => {
    expect(isAddressProvided({ shortCode: 'RFYA1234' })).toBe(true);
    expect(isAddressProvided({ city: 'الرياض' })).toBe(true);
    expect(isAddressProvided({ street: 'حي النخيل' })).toBe(true);
    expect(isAddressProvided({ buildingNumber: '1234' })).toBe(true);
  });
});

describe('attachNationalAddressGuard (strict)', () => {
  it('saves successfully when no address is provided', async () => {
    const Model = makeModel();
    const doc = new Model({ label: 'no-address' });
    await expect(doc.validate()).resolves.toBeUndefined();
  });

  it('rejects when address provided but shortCode missing', async () => {
    const Model = makeModel();
    const doc = new Model({
      label: 'no-shortcode',
      nationalAddress: { city: 'الرياض', district: 'النخيل' },
    });
    const err = await doc.validate().catch(e => e);
    expect(err).toBeTruthy();
    expect(err.errors['nationalAddress.shortCode']).toBeTruthy();
  });

  it('rejects when shortCode has the wrong format', async () => {
    const Model = makeModel();
    const doc = new Model({
      label: 'bad-shortcode',
      nationalAddress: {
        shortCode: 'BAD',
        verification: { verified: true },
      },
    });
    await expect(doc.validate()).rejects.toThrow();
  });

  it('rejects when shortCode is valid but verification.verified !== true', async () => {
    const Model = makeModel();
    const doc = new Model({
      label: 'unverified',
      nationalAddress: {
        shortCode: 'RFYA1234',
        city: 'الرياض',
        verification: { verified: false, status: 'unverified' },
      },
    });
    const err = await doc.validate().catch(e => e);
    expect(err).toBeTruthy();
    expect(err.errors['nationalAddress.verification.verified']).toBeTruthy();
    expect(err.errors['nationalAddress.verification.verified'].kind).toBe('unverified');
  });

  it('accepts a verified address with the correct shortCode format', async () => {
    const Model = makeModel();
    const doc = new Model({
      label: 'verified',
      nationalAddress: {
        shortCode: 'RFYA1234',
        city: 'الرياض',
        district: 'النخيل',
        verification: { verified: true, status: 'match', mode: 'mock' },
      },
    });
    await expect(doc.validate()).resolves.toBeUndefined();
  });
});

describe('attachNationalAddressGuard (required: true)', () => {
  it('rejects when no address is provided at all', async () => {
    const Model = makeModel({ guardOpts: { required: true } });
    const doc = new Model({ label: 'must-have-addr' });
    const err = await doc.validate().catch(e => e);
    expect(err).toBeTruthy();
    expect(err.errors.nationalAddress).toBeTruthy();
    expect(err.errors.nationalAddress.kind).toBe('required');
  });
});

describe('attachNationalAddressGuard (strict: false)', () => {
  it('accepts an unverified address when strict mode is off', async () => {
    const Model = makeModel({ guardOpts: { strict: false } });
    const doc = new Model({
      label: 'lenient-unverified',
      nationalAddress: {
        shortCode: 'RFYA1234',
        verification: { verified: false, status: 'unverified' },
      },
    });
    await expect(doc.validate()).resolves.toBeUndefined();
  });
});

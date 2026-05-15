/**
 * beneficiary-national-address-guard.test.js
 *
 * End-to-end test that the Beneficiary model rejects unverified
 * national addresses but accepts the verified shape produced by
 * `nationalAddressService.verifyAndStamp`.
 *
 * Stays in unit-mode (no live mongo): mongoose.Document.validate() is
 * enough to exercise the pre-validate guard.
 */

'use strict';

process.env.NODE_ENV = 'test';
jest.unmock('mongoose');
jest.resetModules();

const Beneficiary = require('../models/Beneficiary');
const nas = require('../services/nationalAddressService');

describe('Beneficiary — Saudi National Address strict guard', () => {
  it('saves a record with NO nationalAddress (backward compat)', async () => {
    const b = new Beneficiary({ firstName: 'سارة', lastName: 'محمد' });
    await expect(b.validate()).resolves.toBeUndefined();
  });

  it('rejects a record whose nationalAddress lacks verification', async () => {
    const b = new Beneficiary({
      firstName: 'سارة',
      lastName: 'محمد',
      nationalAddress: {
        shortCode: 'RFYA1234',
        city: 'الرياض',
      },
    });
    await expect(b.validate()).rejects.toThrow();
  });

  it('rejects a record whose shortCode fails the regex', async () => {
    const b = new Beneficiary({
      firstName: 'سارة',
      lastName: 'محمد',
      nationalAddress: {
        shortCode: 'BAD',
        verification: { verified: true },
      },
    });
    await expect(b.validate()).rejects.toThrow();
  });

  it('saves a record once verifyAndStamp has marked it verified', async () => {
    const stamped = await nas.verifyAndStamp({ shortCode: 'RFYA1234' });
    expect(stamped.verification.verified).toBe(true);

    const b = new Beneficiary({
      firstName: 'سارة',
      lastName: 'محمد',
      nationalAddress: stamped,
    });
    await expect(b.validate()).resolves.toBeUndefined();
    expect(b.nationalAddress.city).toBeTruthy();
    expect(b.nationalAddress.verification.status).toBe('match');
  });

  it('rejects when Wasel returned not_found (mock ...00)', async () => {
    const stamped = await nas.verifyAndStamp({ shortCode: 'RFYA1200' });
    expect(stamped.verification.verified).toBe(false);

    const b = new Beneficiary({
      firstName: 'سارة',
      lastName: 'محمد',
      nationalAddress: stamped,
    });
    await expect(b.validate()).rejects.toThrow();
  });
});

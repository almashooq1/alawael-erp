/**
 * national-address-models-sweep.test.js
 *
 * Smoke test that EVERY domain model wired into the Saudi National
 * Address rollout has:
 *   1. A `nationalAddress` path on its schema
 *   2. The strict pre-validate guard attached (rejects unverified)
 *   3. Accepts a verified address shape end-to-end
 *
 * If a new model joins the rollout (Slice 2+), add it to MODELS and
 * the suite will guard against silent regressions.
 */

'use strict';

process.env.NODE_ENV = 'test';
jest.unmock('mongoose');
jest.resetModules();

const nas = require('../services/nationalAddressService');

const MODELS = [
  { name: 'Beneficiary', loader: () => require('../models/Beneficiary') },
  { name: 'Customer', loader: () => require('../models/Customer') },
  { name: 'Vendor', loader: () => require('../models/Vendor') },
  { name: 'Driver', loader: () => require('../models/Driver') },
  { name: 'Guardian', loader: () => require('../models/Guardian') },
  { name: 'ContractParty', loader: () => require('../models/ContractParty') },
  { name: 'Employee', loader: () => require('../models/HR/Employee') },
  { name: 'Branch', loader: () => require('../models/Branch') },
];

describe('Slice 2 — every model has nationalAddress + guard', () => {
  it.each(MODELS)('$name model exposes a nationalAddress schema path', ({ loader }) => {
    const Model = loader();
    expect(Model.schema.path('nationalAddress')).toBeTruthy();
  });

  it.each(MODELS)('$name rejects an unverified nationalAddress', async ({ loader }) => {
    const Model = loader();
    const doc = new Model({
      // The bare minimum required fields are added with sentinel values
      // — we don't care if other validators trigger, we only assert that
      // the national-address guard kicks in.
      nationalAddress: {
        shortCode: 'RFYA1234',
        verification: { verified: false, status: 'unverified' },
      },
    });
    const err = await doc.validate().catch(e => e);
    expect(err).toBeTruthy();
    expect(err.errors['nationalAddress.verification.verified']).toBeTruthy();
  });

  it.each(MODELS)('$name accepts an address stamped by verifyAndStamp', async ({ loader }) => {
    const Model = loader();
    const stamped = await nas.verifyAndStamp({ shortCode: 'RFYA1234' });
    expect(stamped.verification.verified).toBe(true);

    const doc = new Model({ nationalAddress: stamped });
    // We don't run full validate (other required fields may fail) —
    // we drill into the address validator specifically.
    const err = await doc.validate().catch(e => e);
    if (err) {
      // ensure the failure is NOT about our address guard
      expect(err.errors['nationalAddress.verification.verified']).toBeFalsy();
      expect(err.errors['nationalAddress.shortCode']).toBeFalsy();
    }
  });
});

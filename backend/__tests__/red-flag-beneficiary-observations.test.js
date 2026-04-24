/**
 * red-flag-beneficiary-observations.test.js — Commit 12.
 *
 * Unit coverage of the age-calculation helper + integration against
 * mongodb-memory-server for the ageTransitionTo method. Plus the
 * end-to-end hook that proves clinical.puberty.consent_review.due
 * fires exactly at age 13.
 */

'use strict';

process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const {
  createBeneficiaryObservations,
  _computeAge,
} = require('../services/redFlagObservations/beneficiaryObservations');
const { createLocator } = require('../services/redFlagServiceLocator');
const { createEngine } = require('../services/redFlagEngine');

// ─── Pure age math (no DB) ──────────────────────────────────────

describe('_computeAge', () => {
  it('returns null for missing or invalid DOB', () => {
    expect(_computeAge(null, new Date())).toBeNull();
    expect(_computeAge(undefined, new Date())).toBeNull();
    expect(_computeAge(new Date('not-a-date'), new Date())).toBeNull();
  });

  it('computes age exactly on the birthday', () => {
    const dob = new Date('2013-04-22T00:00:00.000Z');
    const now = new Date('2026-04-22T12:00:00.000Z');
    expect(_computeAge(dob, now)).toBe(13);
  });

  it('computes age the day before the birthday as one less', () => {
    const dob = new Date('2013-04-22T00:00:00.000Z');
    const now = new Date('2026-04-21T12:00:00.000Z');
    expect(_computeAge(dob, now)).toBe(12);
  });

  it('handles month boundary correctly', () => {
    const dob = new Date('2013-05-15T00:00:00.000Z');
    const now = new Date('2026-04-22T12:00:00.000Z'); // not yet May
    expect(_computeAge(dob, now)).toBe(12);
  });

  it('handles year rollover', () => {
    const dob = new Date('2013-04-22T00:00:00.000Z');
    const now = new Date('2027-01-01T12:00:00.000Z');
    expect(_computeAge(dob, now)).toBe(13);
  });
});

// ─── Integration: real Beneficiary model ───────────────────────

describe('createBeneficiaryObservations — against live Beneficiary model', () => {
  let mongoServer;
  let Beneficiary;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    if (mongoose.connection.readyState !== 0) {
      try {
        await mongoose.disconnect();
      } catch {
        /* ignore */
      }
    }
    await mongoose.connect(mongoServer.getUri(), { dbName: 'beneficiary-obs-test' });
    Beneficiary = require('../models/Beneficiary');
  }, 60_000);

  afterAll(async () => {
    try {
      await mongoose.disconnect();
    } catch {
      /* ignore */
    }
    if (mongoServer) await mongoServer.stop();
  }, 60_000);

  beforeEach(async () => {
    await Beneficiary.deleteMany({});
  });

  // Minimal required fields. Beneficiary.js has a large schema;
  // we only need enough to pass its top-level validators for these
  // tests. Extra fields are strictly-mode-safe with `strict: true`
  // default, and this model does not declare strict: false.
  async function seedBeneficiary(dob, extra = {}) {
    const doc = await Beneficiary.create({
      firstName: 'Test',
      lastName: 'Case',
      dateOfBirth: dob,
      gender: 'male',
      ...extra,
    });
    return doc;
  }

  it('returns the current age for a beneficiary with a DOB', async () => {
    const doc = await seedBeneficiary(new Date('2013-04-22T00:00:00.000Z'));
    const obs = createBeneficiaryObservations({ model: Beneficiary });
    const result = await obs.ageTransitionTo(doc._id, {
      now: new Date('2026-04-22T12:00:00.000Z'),
    });
    expect(result.age).toBe(13);
  });

  it('returns null when the beneficiary does not exist', async () => {
    const obs = createBeneficiaryObservations({ model: Beneficiary });
    const result = await obs.ageTransitionTo(new mongoose.Types.ObjectId());
    expect(result.age).toBeNull();
  });

  it('accepts beneficiary id as a string', async () => {
    const doc = await seedBeneficiary(new Date('2013-04-22T00:00:00.000Z'));
    const obs = createBeneficiaryObservations({ model: Beneficiary });
    const result = await obs.ageTransitionTo(String(doc._id), {
      now: new Date('2026-04-22T12:00:00.000Z'),
    });
    expect(result.age).toBe(13);
  });

  it('returns null when DOB is absent on the record', async () => {
    // Some legacy records may not have DOB — schema does NOT require it.
    const doc = await Beneficiary.create({
      firstName: 'NoDob',
      lastName: 'Case',
      gender: 'female',
    });
    const obs = createBeneficiaryObservations({ model: Beneficiary });
    const result = await obs.ageTransitionTo(doc._id);
    expect(result.age).toBeNull();
  });

  // ─── End-to-end: flag fires at age 13 ──────────────────────

  it('clinical.puberty.consent_review.due raises when age is exactly 13', async () => {
    const doc = await seedBeneficiary(new Date('2013-04-22T00:00:00.000Z'));
    const locator = createLocator();
    locator.register('beneficiaryService', createBeneficiaryObservations({ model: Beneficiary }));
    const engine = createEngine({ locator });
    const result = await engine.evaluateBeneficiary(String(doc._id), {
      flagIds: ['clinical.puberty.consent_review.due'],
      now: new Date('2026-04-22T12:00:00.000Z'),
    });
    expect(result.raisedCount).toBe(1);
    expect(result.verdicts[0].observedValue).toBe(13);
  });

  // ─── disabilityCardStatus ──────────────────────────────────

  it('disabilityCardStatus returns null when no card is on file', async () => {
    const doc = await seedBeneficiary(new Date('2010-01-01T00:00:00.000Z'));
    const obs = createBeneficiaryObservations({ model: Beneficiary });
    const result = await obs.disabilityCardStatus(doc._id);
    expect(result.daysToExpiry).toBeNull();
  });

  it('disabilityCardStatus returns positive days while the card is valid', async () => {
    const doc = await seedBeneficiary(new Date('2010-01-01T00:00:00.000Z'), {
      disability: {
        type: 'physical',
        cardExpiryDate: new Date('2026-05-22T00:00:00.000Z'),
      },
    });
    const obs = createBeneficiaryObservations({ model: Beneficiary });
    const result = await obs.disabilityCardStatus(doc._id, {
      now: new Date('2026-04-22T12:00:00.000Z'),
    });
    expect(result.daysToExpiry).toBe(29); // 2026-05-22 - 2026-04-22 ≈ 29 days floor
  });

  it('disabilityCardStatus returns 0 on the exact expiry day', async () => {
    const doc = await seedBeneficiary(new Date('2010-01-01T00:00:00.000Z'), {
      disability: {
        type: 'physical',
        cardExpiryDate: new Date('2026-04-22T12:00:00.000Z'),
      },
    });
    const obs = createBeneficiaryObservations({ model: Beneficiary });
    const result = await obs.disabilityCardStatus(doc._id, {
      now: new Date('2026-04-22T12:00:00.000Z'),
    });
    expect(result.daysToExpiry).toBe(0);
  });

  it('disabilityCardStatus returns negative days when the card is expired', async () => {
    const doc = await seedBeneficiary(new Date('2010-01-01T00:00:00.000Z'), {
      disability: {
        type: 'physical',
        cardExpiryDate: new Date('2026-03-22T12:00:00.000Z'),
      },
    });
    const obs = createBeneficiaryObservations({ model: Beneficiary });
    const result = await obs.disabilityCardStatus(doc._id, {
      now: new Date('2026-04-22T12:00:00.000Z'),
    });
    expect(result.daysToExpiry).toBe(-31);
  });

  // ─── End-to-end: disability card flag ──────────────────────

  it('compliance.disability_card.expired raises when the card is expired', async () => {
    const doc = await seedBeneficiary(new Date('2010-01-01T00:00:00.000Z'), {
      disability: {
        type: 'physical',
        cardExpiryDate: new Date('2026-03-01T00:00:00.000Z'),
      },
    });
    const locator = createLocator();
    locator.register('beneficiaryService', createBeneficiaryObservations({ model: Beneficiary }));
    const engine = createEngine({ locator });
    const result = await engine.evaluateBeneficiary(String(doc._id), {
      flagIds: ['compliance.disability_card.expired'],
      now: new Date('2026-04-22T12:00:00.000Z'),
    });
    expect(result.raisedCount).toBe(1);
    expect(result.verdicts[0].observedValue).toBeLessThan(0);
  });

  it('compliance.disability_card.expired stays clear when no card is recorded', async () => {
    const doc = await seedBeneficiary(new Date('2010-01-01T00:00:00.000Z'));
    const locator = createLocator();
    locator.register('beneficiaryService', createBeneficiaryObservations({ model: Beneficiary }));
    const engine = createEngine({ locator });
    const result = await engine.evaluateBeneficiary(String(doc._id), {
      flagIds: ['compliance.disability_card.expired'],
      now: new Date('2026-04-22T12:00:00.000Z'),
    });
    expect(result.raisedCount).toBe(0);
  });

  it('compliance.disability_card.expired stays clear when card is still valid', async () => {
    const doc = await seedBeneficiary(new Date('2010-01-01T00:00:00.000Z'), {
      disability: {
        type: 'physical',
        cardExpiryDate: new Date('2027-04-22T00:00:00.000Z'),
      },
    });
    const locator = createLocator();
    locator.register('beneficiaryService', createBeneficiaryObservations({ model: Beneficiary }));
    const engine = createEngine({ locator });
    const result = await engine.evaluateBeneficiary(String(doc._id), {
      flagIds: ['compliance.disability_card.expired'],
      now: new Date('2026-04-22T12:00:00.000Z'),
    });
    expect(result.raisedCount).toBe(0);
  });

  it('clinical.puberty.consent_review.due does NOT raise at age 12 or 14', async () => {
    const docA = await seedBeneficiary(new Date('2014-04-22T00:00:00.000Z')); // 12
    const docB = await seedBeneficiary(new Date('2012-04-22T00:00:00.000Z')); // 14
    const locator = createLocator();
    locator.register('beneficiaryService', createBeneficiaryObservations({ model: Beneficiary }));
    const engine = createEngine({ locator });
    const now = new Date('2026-04-22T12:00:00.000Z');

    const rA = await engine.evaluateBeneficiary(String(docA._id), {
      flagIds: ['clinical.puberty.consent_review.due'],
      now,
    });
    const rB = await engine.evaluateBeneficiary(String(docB._id), {
      flagIds: ['clinical.puberty.consent_review.due'],
      now,
    });
    expect(rA.raisedCount).toBe(0);
    expect(rB.raisedCount).toBe(0);
  });
});
